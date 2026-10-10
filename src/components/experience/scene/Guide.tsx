"use client";

import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { MeshBasicMaterial, PerspectiveCamera, Quaternion, SphereGeometry, TorusGeometry, Vector3, type Group, type Mesh } from "three";
import { ambient } from "../audio";
import { anchorForElement, clearGuideTopic, guide, setGuideTopic } from "../guide";
import { blendAt, clamp01, live } from "../store";
import { createGlossMaterial } from "./glossMaterial";
import { glyphState } from "./Keeper";
import { buildGuide, I_PARTS } from "./keeperGeometry";

/** Distance in front of the camera the guide floats at while touring. */
const DEPTH = 4.2;
/** Where the guide waits in each chapter (fractions of the viewport), clear of that chapter's panel. */
const REST: [number, number][] = [
  [0.8, 0.8],
  [0.26, 0.62],
  [0.62, 0.84],
  [0.6, 0.82],
  [0.5, 0.78],
  [0.86, 0.64],
];
const REST_PORTRAIT: [number, number] = [0.82, 0.2];

type Spring = { x: number; v: number };

/** Critically damped spring: eases in and out with no overshoot. */
function step(s: Spring, target: number, stiffness: number, dt: number) {
  s.v += (stiffness * (target - s.x) - 2 * Math.sqrt(stiffness) * s.v) * dt;
  s.x += s.v * dt;
}

function smooth(x: number) {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
}

/**
 * The i from the iw mark, as a tour guide. It rests in the mark on the opening screen,
 * leaves the w once the journey starts, and floats beside whatever the visitor hovers,
 * leaning in and nodding while the HUD bubble explains it.
 */
export function Guide({ lite }: { lite: boolean }) {
  const gl = useThree((s) => s.gl);
  const clock = useThree((s) => s.clock);
  const root = useRef<Group>(null);
  const sway = useRef<Group>(null);
  const head = useRef<Group>(null);
  const meshes = useRef<(Mesh | null)[]>([]);
  const eyes = useRef<(Mesh | null)[]>([]);
  const smiles = useRef<(Mesh | null)[]>([]);

  const assets = useMemo(
    () => ({
      parts: buildGuide(lite),
      gloss: createGlossMaterial(),
      eye: new MeshBasicMaterial({ color: "#0b1030" }),
      eyeShape: new SphereGeometry(1, 16, 12),
      smile: new TorusGeometry(1, 0.3, 6, 16, Math.PI),
    }),
    [lite],
  );

  useEffect(
    () => () => {
      assets.parts.stem.dispose();
      assets.parts.head.dispose();
      assets.gloss.dispose();
      assets.eye.dispose();
      assets.eyeShape.dispose();
      assets.smile.dispose();
    },
    [assets],
  );

  const state = useMemo(
    () => ({
      detach: { x: 0, v: 0 },
      sx: { x: 0, v: 0 },
      sy: { x: 0, v: 0 },
      talk: 0,
      look: 0,
      out: false,
      hover: false,
      snapped: false,
    }),
    [],
  );
  const v = useMemo(
    () => ({
      target: { x: 0, y: 0, r: 0 },
      homePos: new Vector3(),
      homeQuat: new Quaternion(),
      homeScale: new Vector3(),
      dir: new Vector3(),
      up: new Vector3(),
      pos: new Vector3(),
      quat: new Quaternion(),
      p: new Vector3(),
      foot: new Vector3(),
    }),
    [],
  );

  useFrame(({ camera, size }, delta) => {
    const st = state;
    const dt = Math.min(delta, 0.05);
    const t = clock.elapsedTime;
    const ease = (rate: number) => 1 - Math.exp(-dt * rate);
    const w = size.width;
    const h = size.height;
    const awake = glyphState.awake;
    const idle = live.realm.phase === "idle";
    const portrait = live.aspect < 0.8;
    const r = root.current;
    if (!r) return;
    r.visible = idle;

    // What to explain: a hovered HUD element first, then a hovered 3D object, else wait beside the chapter's panel.
    let el = guide.element;
    if (el && (!el.isConnected || el.closest("[inert]"))) el = guide.element = null;
    let explaining = false;
    let lookX = 0;
    if (el) {
      anchorForElement(el, v.target);
      const rect = el.getBoundingClientRect();
      lookX = Math.sign(rect.left + rect.width / 2 - v.target.x);
      explaining = true;
    } else if (guide.scene) {
      const s = guide.scene;
      const side = s.x > w / 2 ? -1 : 1;
      v.target.x = s.x + side * (s.r + 80);
      v.target.y = s.y + 30;
      lookX = -side;
      explaining = true;
    } else {
      const b = blendAt(live.chapter);
      const chapter = b.from === b.to ? b.from : b.raw > 0.5 ? b.to : b.from;
      const [fx, fy] = portrait ? REST_PORTRAIT : REST[chapter] ?? REST[0]!;
      v.target.x = fx * w;
      v.target.y = fy * h;
    }
    v.target.x = Math.min(w - 60, Math.max(60, v.target.x));
    v.target.y = Math.min(h - 70, Math.max(120, v.target.y));

    const leave = idle && awake > 0.85 && (glyphState.journey || explaining);
    step(st.detach, leave ? 1 : 0, 5, dt);
    const d = clamp01(st.detach.x);
    const de = smooth(d);
    glyphState.detach = d;
    if (d > 0.02 && !st.out) {
      st.out = true;
      glyphState.helloAt = t;
    } else if (d < 0.01) {
      st.out = false;
    }

    // While docked the target is tracked exactly, so the flight starts from wherever it should be.
    if (d < 0.01 || !st.snapped) {
      st.sx.x = v.target.x;
      st.sy.x = v.target.y;
      st.sx.v = st.sy.v = 0;
      st.snapped = true;
    } else {
      step(st.sx, v.target.x, 9, dt);
      step(st.sy, v.target.y, 9, dt);
    }

    // Screen point to a spot DEPTH in front of the camera, sized to a fixed on-screen height.
    camera.updateMatrixWorld();
    const fov = camera instanceof PerspectiveCamera ? camera.fov : 45;
    const worldPerPx = (2 * DEPTH * Math.tan((fov * Math.PI) / 360)) / h;
    const scale = ((portrait ? 92 : 116) * worldPerPx) / I_PARTS.height;
    v.dir.set((st.sx.x / w) * 2 - 1, -((st.sy.x / h) * 2 - 1), 0.5).unproject(camera).sub(camera.position).normalize();
    v.up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    v.pos.copy(camera.position).addScaledVector(v.dir, DEPTH).addScaledVector(v.up, (-I_PARTS.height * scale) / 2);

    glyphState.home.decompose(v.homePos, v.homeQuat, v.homeScale);
    r.position.copy(v.homePos).lerp(v.pos, de);
    r.position.y += Math.sin(Math.PI * de) * 0.5;
    r.quaternion.copy(v.homeQuat).slerp(camera.quaternion, de);
    r.scale.setScalar(v.homeScale.x + (scale - v.homeScale.x) * de);

    const touring = de > 0.5;
    for (const m of meshes.current) if (m) m.renderOrder = touring ? 10 : 0;
    assets.gloss.depthTest = !touring;
    assets.eye.depthTest = !touring;
    assets.gloss.uniforms.uGlow.value = 0.05 + 0.6 * awake;

    // Hello: a short, decaying shake around the foot. Talking: a gentle lean toward the subject and a nod.
    const age = t - glyphState.helloAt;
    const hello = age >= 0 && age < 2.4 ? 0.16 * Math.exp(-age * 2.6) * Math.sin(age * 13) : 0;
    st.talk += ((explaining && touring ? 1 : 0) - st.talk) * ease(4);
    st.look += (lookX - st.look) * ease(3);
    const lean = Math.max(-0.3, Math.min(0.3, -st.sx.v * 0.0005)) * de;
    if (sway.current) {
      sway.current.rotation.z = hello + lean - st.look * 0.1 * st.talk + Math.sin(t * 2.1) * 0.04 * st.talk;
      sway.current.position.y = Math.sin(t * 1.4) * 0.035 * awake;
    }
    if (head.current) {
      const follow = awake * (1 - st.talk);
      head.current.rotation.set(
        Math.sin(t * 6.5) * 0.07 * st.talk - live.pointerY * 0.25 * follow,
        st.look * 0.45 * st.talk + live.pointerX * 0.4 * follow,
        hello * 1.4,
      );
    }
    const blink = t % 4.2 < 0.13 ? 0.15 : 1;
    const open = Math.max(0.1, awake) * blink;
    const happy = age >= 0 && age < 1.8 && awake > 0.5;
    for (const eye of eyes.current) {
      if (!eye) continue;
      eye.visible = !happy;
      eye.scale.set(0.032, 0.042 * open, 0.016);
    }
    for (const smile of smiles.current) if (smile) smile.visible = happy;

    // Where the bubble should sit: just above the head.
    r.updateMatrixWorld();
    v.p.copy(I_PARTS.head).applyMatrix4(r.matrixWorld).project(camera);
    v.foot.setFromMatrixPosition(r.matrixWorld).project(camera);
    guide.screen.x = ((v.p.x + 1) / 2) * w;
    guide.screen.y = ((1 - v.p.y) / 2) * h;
    guide.screen.h = Math.abs(v.foot.y - v.p.y) * 0.5 * h;
    guide.screen.visible = idle && awake > 0.8 && v.p.z < 1;
  });

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (live.realm.phase !== "idle" || glyphState.awake < 0.5) return;
    state.hover = true;
    live.hoverKeeper = true;
    gl.domElement.style.cursor = "pointer";
    glyphState.helloAt = clock.elapsedTime;
    setGuideTopic({ key: "i", title: "Your guide", body: "I'm the i from the imranwebstudio mark. Hover anything and I'll explain it." });
    ambient.blip(760);
  };
  const onOut = () => {
    if (!state.hover) return;
    state.hover = false;
    live.hoverKeeper = false;
    gl.domElement.style.cursor = "";
    clearGuideTopic("i");
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.target !== gl.domElement) onOut();
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  });

  const eyeX = [-I_PARTS.eyeSpacing, I_PARTS.eyeSpacing];
  const eyeZ = Math.sqrt(I_PARTS.headRadius ** 2 - I_PARTS.eyeSpacing ** 2) * 0.97;
  const setMesh = (i: number) => (el: Mesh | null) => {
    meshes.current[i] = el;
  };

  return (
    <group ref={root}>
      <group ref={sway}>
        <mesh ref={setMesh(0)} geometry={assets.parts.stem} material={assets.gloss} position={I_PARTS.stemCenter} />
        <group ref={head} position={I_PARTS.head}>
          <mesh ref={setMesh(1)} geometry={assets.parts.head} material={assets.gloss} />
          {eyeX.map((x, i) => (
            <mesh
              key={`eye${i}`}
              ref={(el) => {
                eyes.current[i] = el;
                meshes.current[2 + i] = el;
              }}
              geometry={assets.eyeShape}
              material={assets.eye}
              position={[x, 0.01, eyeZ]}
            />
          ))}
          {eyeX.map((x, i) => (
            <mesh
              key={`smile${i}`}
              ref={(el) => {
                smiles.current[i] = el;
                meshes.current[4 + i] = el;
              }}
              geometry={assets.smile}
              material={assets.eye}
              position={[x, 0, eyeZ]}
              scale={0.034}
              visible={false}
            />
          ))}
        </group>
        <mesh
          position={[0, I_PARTS.height / 2, 0]}
          onPointerOver={onOver}
          onPointerOut={onOut}
        >
          <capsuleGeometry args={[I_PARTS.headRadius * 1.4, I_PARTS.height * 0.6, 4, 8]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      </group>
    </group>
  );
}

"use client";

import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, DoubleSide, Matrix4, SpriteMaterial, Vector3, type Group, type Mesh, type PointLight, type Sprite } from "three";
import { ambient } from "../audio";
import { clearGuideTopic, guide, setGuideTopic } from "../guide";
import { blendAt, CHAPTER_COUNT, clamp01, easeInOut, live, presence } from "../store";
import { CORE_Y, RING_Y } from "./config";
import { createGlossMaterial } from "./glossMaterial";
import { createIceMaterial } from "./iceMaterial";
import { buildGlyph, buildShellFragments, I_FOOT, RIBBON_DEPTH } from "./keeperGeometry";
import { makeHaloTexture } from "./Logos";
import { createAtmosphereSample, sampleAtmosphere } from "./sampleAtmosphere";

const TAU = Math.PI * 2;
/** Thaw progress at which the cracked shell bursts apart. */
const CRACK = 0.22;
/** Radius the shell fragments orbit at once the glyph is awake. */
const ORBIT = 1.6;

function wrapAngle(a: number) {
  return a - TAU * Math.round(a / TAU);
}

function smooth(x: number) {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
}

/** Shared between the w (this file) and the i, which leaves the mark to guide the visitor. */
export const glyphState = {
  /** 0 = asleep in the ice, 1 = fully awake. */
  awake: 0,
  /** World transform of the i's resting place in the mark (its foot). */
  home: new Matrix4(),
  /** How far the i has left the mark (0..1), written by the guide. */
  detach: 0,
  /** Scene-clock time of the last hello, written by whoever triggers it. */
  helloAt: -100,
  /** The visitor has started the journey (scrolled past the opening), so the i may leave. */
  journey: false,
};

/**
 * The iw mark at the heart of the clearing. It sleeps sealed in ice at the start of the
 * journey and cracks out as you set off; the i then leaves to guide you (see Guide.tsx)
 * while the w stays behind. At the loop the i returns and the ice re-forms.
 */
export function Keeper({ lite }: { lite: boolean }) {
  const gl = useThree((s) => s.gl);
  const clock = useThree((s) => s.clock);
  const root = useRef<Group>(null);
  const body = useRef<Group>(null);
  const shell = useRef<Group>(null);
  const fragments = useRef<(Mesh | null)[]>([]);
  const burstGlow = useRef<Sprite>(null);
  const light = useRef<PointLight>(null);
  const sample = useMemo(createAtmosphereSample, []);

  const assets = useMemo(() => {
    const halo = makeHaloTexture();
    const shellIce = createIceMaterial("#a5b4fc");
    shellIce.side = DoubleSide;
    return {
      halo,
      glyph: buildGlyph(lite),
      fragments: buildShellFragments(11, [1.38, 1.28, 0.85]),
      gloss: createGlossMaterial(),
      shellIce,
      burstGlow: new SpriteMaterial({ map: halo, color: "#c7d2fe", transparent: true, blending: AdditiveBlending, depthWrite: false, opacity: 0 }),
    };
  }, [lite]);

  useEffect(
    () => () => {
      assets.halo.dispose();
      assets.glyph.ribbon.dispose();
      assets.glyph.caps.forEach((c) => c.geometry.dispose());
      assets.fragments.forEach((f) => f.geometry.dispose());
      assets.gloss.dispose();
      assets.shellIce.dispose();
      assets.burstGlow.dispose();
    },
    [assets],
  );

  useEffect(
    () => () => {
      live.hoverKeeper = false;
      guide.scene = null;
    },
    [],
  );

  const state = useMemo(() => ({ thaw: 0, yaw: 0, spin: 0, holdUntil: -1, hover: false }), []);
  const v = useMemo(
    () => ({ orbit: new Vector3(), foot: new Matrix4(), screen: new Vector3(), target: { x: 0, y: 0, r: 0 } }),
    [],
  );

  useFrame(({ camera, size }, delta) => {
    const st = state;
    const dt = Math.min(delta, 0.05);
    const t = clock.elapsedTime;
    const ease = (rate: number) => 1 - Math.exp(-dt * rate);
    const b = blendAt(live.chapter);
    const atm = sampleAtmosphere(b, sample);
    const inRing = presence(b, 0);

    // Sealed at the very start of Nightfall, and again as the loop eases Contact back into it.
    const opening = b.from === 0 && b.to === 0 && b.u < 0.05;
    const sealed = opening || (b.from === CHAPTER_COUNT - 1 && b.to === 0 && b.t > 0.45);
    glyphState.journey = !(b.from === 0 && b.to === 0 && b.u < 0.1) && !sealed;
    if (st.hover) st.holdUntil = Math.max(st.holdUntil, t + 6);
    const wake = !sealed || t < st.holdUntil || !!guide.element || !!guide.scene;
    const before = st.thaw;
    // The ice only re-forms once the i is back in the mark.
    const thawRate = wake ? dt * 0.42 : glyphState.detach < 0.05 ? -dt * 0.6 : 0;
    st.thaw = clamp01(st.thaw + thawRate);
    if (before < CRACK && st.thaw >= CRACK) ambient.shatter();

    const crack = clamp01(st.thaw / CRACK);
    const burst = easeInOut(clamp01((st.thaw - CRACK) / (1 - CRACK)));
    const awake = smooth((st.thaw - 0.35) / 0.55);
    glyphState.awake = awake;

    const s = 0.86 + 0.14 * awake;
    const sink = -0.1 * (1 - awake);
    body.current?.position.set(0, sink, 0);
    body.current?.scale.set(s, s, s * RIBBON_DEPTH);

    const r = root.current;
    if (r) {
      r.position.y = CORE_Y + (RING_Y - CORE_Y) * inRing + Math.sin(t * 0.6) * 0.05;
      // Portrait screens use a tighter logo ring; keep the orbiting shards inside it.
      const ringScale = live.aspect < 0.8 ? 0.95 : 1.3;
      r.scale.setScalar(0.75 + (ringScale - 0.75) * inRing);
      const yaw = Math.atan2(camera.position.x - r.position.x, camera.position.z - r.position.z) + live.pointerX * 0.18 * awake;
      st.yaw += wrapAngle(yaw - st.yaw) * ease(2.5);
      r.rotation.y = st.yaw;
      r.updateMatrixWorld();
      v.foot.makeScale(s, s, s).setPosition(I_FOOT.x * s, I_FOOT.y * s + sink, 0);
      glyphState.home.copy(r.matrixWorld).multiply(v.foot);

      if (st.hover && glyphState.detach > 0.5) {
        v.screen.setFromMatrixPosition(r.matrixWorld).project(camera);
        v.target.x = ((v.screen.x + 1) / 2) * size.width;
        v.target.y = ((1 - v.screen.y) / 2) * size.height;
        v.target.r = 90 * r.scale.x;
        guide.scene = v.target;
      }
    }

    const lum = atm.core / 1.4;
    assets.gloss.uniforms.uGlow.value = (0.05 + 0.55 * awake) * lum;
    assets.shellIce.uniforms.uTime.value = t;
    assets.shellIce.uniforms.uGlow.value = 0.2 + crack * (1 - burst) * 0.9 + burst * 0.2;
    assets.shellIce.uniforms.uOpacity.value = 0.5 + 0.5 * Math.max(crack * (1 - burst), burst);
    assets.burstGlow.opacity = crack * (1 - burst) * 0.55 + Math.sin(Math.PI * burst) * 0.6;
    burstGlow.current?.scale.setScalar(2.2 + burst * 2.4);
    if (light.current) light.current.intensity = atm.core * (1.6 + 3 * awake);

    // The shell sways (a full turn would show its thin side and expose the glyph); once cracked, its
    // fragments burst outward and settle into an orbit.
    if (shell.current) shell.current.rotation.y = Math.sin(t * 0.25) * 0.4;
    st.spin += dt * burst;
    const out = Math.sin(Math.PI * burst) * 0.7;
    const shake = crack * (1 - burst) * 0.02;
    const n = assets.fragments.length;
    for (let i = 0; i < n; i++) {
      const m = fragments.current[i];
      if (!m) continue;
      const f = assets.fragments[i]!;
      const a = (i / n) * TAU + t * 0.35;
      const radius = ORBIT * (1 + (i % 2) * 0.14);
      v.orbit.set(Math.cos(a) * radius, Math.sin(t * 0.6 + i * 1.3) * 0.22 + ((i % 3) - 1) * 0.3, Math.sin(a) * radius);
      m.position.copy(f.center).multiplyScalar(1 + crack * 0.04 + out).lerp(v.orbit, burst);
      m.position.x += Math.sin(t * 61 + i * 7) * shake;
      m.position.y += Math.cos(t * 53 + i * 3) * shake;
      m.rotation.set(wrapAngle(st.spin * 0.8 + i * 1.3) * burst, wrapAngle(st.spin * 0.5 + i * 2.1) * burst, 0);
      m.scale.setScalar(1 - burst * 0.7);
    }
  });

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (live.realm.phase !== "idle") return;
    state.hover = true;
    live.hoverKeeper = true;
    gl.domElement.style.cursor = "pointer";
    const docked = glyphState.detach < 0.5;
    if (docked) glyphState.helloAt = clock.elapsedTime;
    setGuideTopic(
      docked
        ? { key: "w", title: "Hello there", body: "I'm the i from imranwebstudio. Scroll, and I'll guide you through Imran's work." }
        : { key: "w", title: "The w", body: "It keeps the light here while I show you around. I'll be back when the night begins again." },
    );
    ambient.blip(660);
  };
  const onOut = () => {
    state.hover = false;
    live.hoverKeeper = false;
    if (guide.scene === v.target) guide.scene = null;
    gl.domElement.style.cursor = "";
    clearGuideTopic("w");
  };

  // The canvas never sees a pointer-out when the pointer moves onto the HUD above it.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.target === gl.domElement || !state.hover) return;
      onOut();
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  });

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (live.realm.phase !== "idle") return;
    const t = clock.elapsedTime;
    state.holdUntil = t + 12;
    live.ringPulse = t;
    glyphState.helloAt = t;
    ambient.blip(990);
  };

  return (
    <group ref={root} position={[0, CORE_Y, 0]}>
      <group ref={body}>
        <mesh geometry={assets.glyph.ribbon} material={assets.gloss} />
        {assets.glyph.caps.map((c, i) => (
          <mesh key={i} geometry={c.geometry} material={assets.gloss} position={c.position} />
        ))}
      </group>
      <group ref={shell}>
        {assets.fragments.map((f, i) => (
          <mesh
            key={i}
            ref={(el) => {
              fragments.current[i] = el;
            }}
            geometry={f.geometry}
            material={assets.shellIce}
            position={f.center}
            renderOrder={2}
          />
        ))}
      </group>
      <sprite ref={burstGlow} material={assets.burstGlow} scale={2.2} />
      <pointLight ref={light} color="#818cf8" distance={16} decay={1.5} />
      <mesh onPointerOver={onOver} onPointerOut={onOut} onClick={onClick} scale={1.25}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </group>
  );
}

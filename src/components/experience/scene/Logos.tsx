"use client";

import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  Euler,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Quaternion,
  SpriteMaterial,
  Vector3,
  type Group,
} from "three";
import { site } from "~/lib/site";
import { TECH, TECH_BY_ID, type TechId } from "~/lib/tech";
import { ambient } from "../audio";
import { clearGuideTopic, guide, setGuideTopic, type ScreenTarget } from "../guide";
import { blendAt, clamp01, easeInOut, getSelectedTech, live, presence, selectTech } from "../store";
import { RING_Y } from "./config";
import { LAYOUTS, LOGO_COUNT, SLOTS } from "./layouts";
import { buildLogoGeometry } from "./logoGeometry";

const TAU = Math.PI * 2;
const STAGGER = 0.28;
const FROST = new Color("#e8f4ef");
const FROST_GLOW = new Color("#9ff5c4");
const AURORA = new Color("#4ade80");

const CHAPTER = { skills: 2, experience: 3, projects: 4, contact: 5 } as const;

const STACK_INFO = new Map<TechId, { note: string; years: string }>(
  site.stack.flatMap((g) => g.items.map((item) => [item.id, item] as const)),
);

export function makeHaloTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.35)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(canvas);
}

type LogoState = {
  hover: number;
  active: number;
  spin: number;
  spinVel: number;
  trail: number;
  tilt: number;
  px: number;
  py: number;
  pz: number;
  sc: number;
  placed: boolean;
};

export function Logos({ lite, projectTech }: { lite: boolean; projectTech: TechId[][] }) {
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);
  const groups = useRef<(Group | null)[]>([]);

  const assets = useMemo(() => {
    const halo = makeHaloTexture();
    return {
      halo,
      geometries: TECH.map((t) => buildLogoGeometry(t.path, lite)),
      materials: TECH.map(() =>
        lite
          ? new MeshStandardMaterial({ color: FROST, roughness: 0.35, metalness: 0.05, emissive: FROST_GLOW })
          : new MeshPhysicalMaterial({
              color: FROST,
              roughness: 0.3,
              metalness: 0,
              clearcoat: 1,
              clearcoatRoughness: 0.2,
              sheen: 1,
              sheenRoughness: 0.45,
              sheenColor: new Color("#86efac"),
              emissive: FROST_GLOW,
            }),
      ),
      halos: TECH.map(
        () =>
          new SpriteMaterial({
            map: halo,
            color: AURORA,
            transparent: true,
            depthWrite: false,
            blending: AdditiveBlending,
            opacity: 0.2,
          }),
      ),
      brand: TECH.map((t) => new Color(t.color)),
    };
  }, [lite]);

  useEffect(
    () => () => {
      assets.halo.dispose();
      assets.geometries.forEach((g) => g.dispose());
      assets.materials.forEach((m) => m.dispose());
      assets.halos.forEach((m) => m.dispose());
    },
    [assets],
  );

  const state = useMemo<LogoState[]>(
    () =>
      SLOTS.map(() => ({
        hover: 0,
        active: 0,
        spin: 0,
        spinVel: 0,
        trail: 0,
        tilt: 0,
        px: 0,
        py: 0,
        pz: 0,
        sc: 1,
        placed: false,
      })),
    [],
  );

  const hoverTarget = useMemo<ScreenTarget>(() => ({ x: 0, y: 0, r: 0 }), []);
  const scratch = useMemo(
    () => ({ a: new Vector3(), b: new Vector3(), toCam: new Vector3(), euler: new Euler(), q: new Quaternion(), screen: new Vector3() }),
    [],
  );

  useEffect(
    () => () => {
      live.hoverTech = null;
      gl.domElement.style.cursor = "";
    },
    [gl],
  );

  useFrame(({ clock, camera }, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = clock.elapsedTime;
    const blend = blendAt(live.chapter);
    const from = LAYOUTS[blend.from]!;
    const to = LAYOUTS[blend.to]!;
    const chapter = blend.from === blend.to ? blend.from : blend.raw > 0.5 ? blend.to : blend.from;
    const settled = blend.from === blend.to;
    const expStack = site.experience[Math.min(site.experience.length - 1, Math.floor(blend.u * site.experience.length))]
      ?.stack as readonly TechId[] | undefined;
    const projCount = Math.max(1, projectTech.length);
    const projStack = projectTech[Math.min(projCount - 1, Math.floor(blend.u * projCount))];
    const spotlight = Math.floor(t / 1.4) % LOGO_COUNT;
    const selected = getSelectedTech();
    const ringPresence = presence(blend, 0);
    const velocity = Math.max(-80, Math.min(80, live.velocity));
    const ease = (rate: number) => 1 - Math.exp(-dt * rate);
    const { a, b, toCam, euler, q, screen } = scratch;
    let selectedVisible = false;

    for (let i = 0; i < SLOTS.length; i++) {
      const g = groups.current[i];
      if (!g) continue;
      const slot = SLOTS[i]!;
      const st = state[i]!;
      const [r0, r1, r2, r3] = slot.rand;

      let scale = from(slot, t, a);
      if (blend.from !== blend.to) {
        const scaleB = to(slot, t, b);
        const w = easeInOut(clamp01((blend.raw - slot.rand[4] * STAGGER) / (1 - STAGGER)));
        a.lerp(b, w);
        a.y += Math.sin(Math.PI * w) * (0.5 + r1 * 1.2);
        scale += (scaleB - scale) * w;
      }

      // Clicking the Keeper rings the intro ring like a bell, the ripple running down both sides from the top.
      const age = t - live.ringPulse - (Math.min(i, LOGO_COUNT - i) / LOGO_COUNT) * 0.5;
      const bell = age > 0 && age < 2.5 ? Math.exp(-age * 2.4) * Math.sin(age * 13) * ringPresence : 0;
      if (bell !== 0) {
        a.x += a.x * bell * 0.09;
        a.y += (a.y - RING_Y) * bell * 0.09;
        scale *= 1 + bell * 0.3;
      }

      // Scroll pushes each logo into a spin that springs back to face the camera.
      const err = st.spin - TAU * Math.round(st.spin / TAU);
      st.spinVel += (velocity * 0.16 * (0.6 + r1) - err * 5 - st.spinVel * 2.6) * dt;
      st.spin += st.spinVel * dt;
      st.trail += (Math.max(-0.7, Math.min(0.7, -velocity * 0.014)) * (0.5 + r0) - st.trail) * ease(2.5 + r2 * 2);
      st.tilt += (Math.max(-0.6, Math.min(0.6, velocity * 0.02)) - st.tilt) * ease(4);

      const id = slot.id;
      const isSelected = selected === id;
      const hovered = live.hoverTech === id || live.highlightTech === id;
      let featured = false;
      if (settled && chapter === CHAPTER.skills) featured = i === spotlight || i === (spotlight + 13) % LOGO_COUNT;
      else if (settled && chapter === CHAPTER.experience) featured = !!expStack?.includes(id);
      else if (settled && chapter === CHAPTER.projects) featured = !!projStack?.includes(id);
      else if (settled && chapter === CHAPTER.contact) featured = Math.sin((i / LOGO_COUNT) * TAU - t * 0.8) > 0.82;

      st.hover += ((hovered || isSelected ? 1 : 0) - st.hover) * ease(8);
      st.active += ((hovered || isSelected || featured ? 1 : 0) - st.active) * ease(4);

      a.y += st.trail;
      toCam.copy(camera.position).sub(a).normalize();
      a.addScaledVector(toCam, st.hover * 0.45);
      // Glide toward the layout instead of locking to the scroll sample, matching the camera's ease.
      const follow = ease(2.4);
      if (!st.placed) {
        st.px = a.x;
        st.py = a.y;
        st.pz = a.z;
        st.sc = scale;
        st.placed = true;
      } else {
        st.px += (a.x - st.px) * follow;
        st.py += (a.y - st.py) * follow;
        st.pz += (a.z - st.pz) * follow;
        st.sc += (scale - st.sc) * follow;
      }
      g.position.set(st.px, st.py, st.pz);
      g.lookAt(camera.position);
      euler.set(
        Math.sin(t * 0.5 + r2 * 6) * 0.1 + st.tilt - live.pointerY * 0.4 * st.hover,
        Math.sin(t * 0.4 + r3 * 6) * 0.35 + st.spin + live.pointerX * 0.6 * st.hover,
        Math.sin(t * 0.3 + r0 * 6) * 0.06,
      );
      g.quaternion.multiply(q.setFromEuler(euler));
      g.scale.setScalar(st.sc * (1 + st.hover * 0.22));

      const mat = assets.materials[i]!;
      const brand = assets.brand[i]!;
      mat.color.copy(FROST).lerp(brand, st.active);
      mat.emissive.copy(FROST_GLOW).lerp(brand, st.active);
      mat.emissiveIntensity = 0.1 + st.active * 0.7;
      const halo = assets.halos[i]!;
      halo.color.copy(AURORA).lerp(brand, st.active);
      halo.opacity = 0.1 + st.active * 0.45 + st.hover * 0.2;

      if (live.hoverTech === id) {
        screen.copy(g.position).project(camera);
        hoverTarget.x = ((screen.x + 1) / 2) * size.width;
        hoverTarget.y = ((1 - screen.y) / 2) * size.height;
        hoverTarget.r = 44;
        guide.scene = hoverTarget;
      }

      if (isSelected) {
        screen.copy(g.position).project(camera);
        live.selectedScreen.x = ((screen.x + 1) / 2) * size.width;
        live.selectedScreen.y = ((1 - screen.y) / 2) * size.height;
        selectedVisible = screen.z < 1 && Math.abs(screen.x) < 1.1 && Math.abs(screen.y) < 1.1;
      }
    }
    live.selectedScreen.visible = selectedVisible;
  });

  const onOver = (id: TechId) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (live.realm.phase !== "idle") return;
    live.hoverTech = id;
    gl.domElement.style.cursor = "pointer";
    const info = STACK_INFO.get(id);
    setGuideTopic({
      key: `tech:${id}`,
      title: TECH_BY_ID[id].title,
      body: info ? `${info.note} ${info.years} years. Click for the full card.` : "A tool he works with. Click for the full card.",
    });
  };
  const onOut = (id: TechId) => () => {
    if (live.hoverTech !== id) return;
    live.hoverTech = null;
    gl.domElement.style.cursor = "";
    clearGuideTopic(`tech:${id}`);
    if (guide.scene === hoverTarget) guide.scene = null;
  };

  // The canvas gets no pointer-out when the pointer moves straight onto the HUD.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.target !== gl.domElement && live.hoverTech) onOut(live.hoverTech)();
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  });
  const onClick = (id: TechId) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (live.realm.phase !== "idle") return;
    selectTech(getSelectedTech() === id ? null : id);
    ambient.blip(1320);
  };

  return (
    <group>
      {TECH.map((tech, i) => (
        <group
          key={tech.id}
          ref={(el) => {
            groups.current[i] = el;
          }}
        >
          <mesh geometry={assets.geometries[i]} material={assets.materials[i]} castShadow={!lite} />
          <sprite material={assets.halos[i]} scale={1.9} position={[0, 0, -0.1]} />
          <mesh onPointerOver={onOver(tech.id)} onPointerOut={onOut(tech.id)} onClick={onClick(tech.id)}>
            <boxGeometry args={[1.15, 1.15, 0.5]} />
            <meshBasicMaterial visible={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

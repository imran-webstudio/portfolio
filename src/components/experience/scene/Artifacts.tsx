"use client";

import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  Color,
  LineBasicMaterial,
  MeshStandardMaterial,
  TetrahedronGeometry,
  Vector3,
  type Group,
  type LineSegments,
  type Mesh,
} from "three";
import { TECH_BY_ID } from "~/lib/tech";
import { ambient } from "../audio";
import { clearGuideTopic, guide, setGuideTopic, type ScreenTarget } from "../guide";
import { ARTIFACTS } from "../realms/artifacts";
import { enterRealm } from "../realms/enter";
import { blendAt, clamp01, live, presence, REALM_TIMING, stopProgress } from "../store";
import { buildConstellation, buildCrystalGeometry } from "./crystal";
import { createIceMaterial } from "./iceMaterial";
import { buildLogoGeometry } from "./logoGeometry";

const CONTACT = 5;
const SHARDS = 7;
const RADIUS = 1.2;

type ArtifactState = { hover: number; focus: number; dive: number };

/** Ice crystals in the Contact chapter, each holding a logo; clicking one dives into its realm. */
export function Artifacts({ lite }: { lite: boolean }) {
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);
  const groups = useRef<(Group | null)[]>([]);
  const crystals = useRef<(Mesh | null)[]>([]);
  const logos = useRef<(Group | null)[]>([]);
  const wires = useRef<(LineSegments | null)[]>([]);
  const shards = useRef<(Mesh | null)[][]>(ARTIFACTS.map(() => []));
  const visibleRef = useRef(0);

  const assets = useMemo(() => {
    const shard = new TetrahedronGeometry(0.11, 0);
    return {
      shard,
      items: ARTIFACTS.map((a, i) => {
        const brand = new Color(TECH_BY_ID[a.logo].color);
        return {
          crystal: buildCrystalGeometry(i * 7 + 3),
          ice: createIceMaterial(a.accent),
          shardIce: createIceMaterial(a.accent),
          logo: buildLogoGeometry(TECH_BY_ID[a.logo].path, lite),
          logoMat: new MeshStandardMaterial({
            color: brand,
            emissive: brand,
            emissiveIntensity: 1,
            roughness: 0.4,
            toneMapped: false,
          }),
          wire: buildConstellation(i * 13 + 5, RADIUS * 1.25),
          wireMat: new LineBasicMaterial({ color: "#e2f3ff", transparent: true, opacity: 0.3, depthWrite: false }),
        };
      }),
    };
  }, [lite]);

  useEffect(
    () => () => {
      assets.shard.dispose();
      for (const it of assets.items) {
        it.crystal.dispose();
        it.ice.dispose();
        it.shardIce.dispose();
        it.logo.dispose();
        it.logoMat.dispose();
        it.wire.dispose();
        it.wireMat.dispose();
      }
    },
    [assets],
  );

  const state = useMemo<ArtifactState[]>(() => ARTIFACTS.map(() => ({ hover: 0, focus: 0, dive: 0 })), []);
  const scratch = useMemo(() => ({ p: new Vector3(), edge: new Vector3(), right: new Vector3() }), []);
  const hoverTarget = useMemo<ScreenTarget>(() => ({ x: 0, y: 0, r: 0 }), []);

  useEffect(
    () => () => {
      live.hoverArtifact = -1;
      live.artifactScreens.length = 0;
    },
    [],
  );

  useFrame(({ clock, camera }, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = clock.elapsedTime;
    const b = blendAt(live.chapter);
    const show = presence(b, CONTACT);
    visibleRef.current = show;
    const settled = b.from === CONTACT && b.to === CONTACT;
    const { k, glide } = stopProgress(b.u, ARTIFACTS.length + 1);
    const realm = live.realm;
    const ease = (rate: number) => 1 - Math.exp(-dt * rate);
    const { p, edge, right } = scratch;
    right.set(1, 0, 0).applyQuaternion(camera.quaternion);

    for (let i = 0; i < ARTIFACTS.length; i++) {
      const g = groups.current[i];
      const it = assets.items[i]!;
      const st = state[i]!;
      if (!g) continue;
      g.visible = show > 0.001;
      if (!g.visible) {
        live.artifactScreens[i] = { x: 0, y: 0, r: 0, visible: false };
        continue;
      }

      const mine = realm.index === i && realm.phase !== "idle";
      const diveTarget = mine
        ? realm.phase === "enter"
          ? clamp01((performance.now() - realm.since) / REALM_TIMING.dive)
          : 1
        : 0;
      st.dive += (diveTarget - st.dive) * (mine ? 1 : ease(3));
      st.hover += ((live.hoverArtifact === i ? 1 : 0) - st.hover) * ease(8);
      const focused = settled && (k === i ? glide < 0.5 : k === i - 1 && glide >= 0.5);
      st.focus += ((focused ? 1 : 0) - st.focus) * ease(3);

      const [x, y, z] = ARTIFACTS[i]!.position;
      g.position.set(x, y + Math.sin(t * 0.6 + i * 2) * 0.12 - (1 - show) * 2.2, z);
      const scale = show * (0.9 + st.focus * 0.1 + st.hover * 0.07) * (1 + st.dive * st.dive * 0.6);
      g.scale.setScalar(Math.max(0.0001, scale));

      const crystal = crystals.current[i];
      if (crystal) crystal.rotation.set(Math.sin(t * 0.2 + i) * 0.12, t * 0.13 + i * 1.7, Math.sin(t * 0.17 + i) * 0.08);
      it.ice.uniforms.uTime.value = t;
      it.ice.uniforms.uGlow.value = 0.35 + st.hover * 0.55 + st.focus * 0.25 + st.dive * 2.4;
      it.ice.uniforms.uOpacity.value = Math.min(1, show * 1.3);
      it.shardIce.uniforms.uTime.value = t;
      it.shardIce.uniforms.uOpacity.value = Math.min(1, show * 1.3) * (1 - st.dive);

      const logo = logos.current[i];
      if (logo) {
        logo.lookAt(camera.position);
        logo.rotateY(Math.sin(t * 0.5 + i) * 0.45 + st.hover * live.pointerX * 0.5);
        logo.rotateX(Math.sin(t * 0.4 + i) * 0.12 - st.hover * live.pointerY * 0.3);
      }
      it.logoMat.emissiveIntensity = 0.75 + st.hover * 0.9 + st.focus * 0.35 + st.dive * 3;

      const wire = wires.current[i];
      if (wire) wire.rotation.y = -t * 0.06 + i;
      it.wireMat.opacity = (0.14 + st.focus * 0.26 + st.hover * 0.2) * show * (1 - st.dive);

      const ring = shards.current[i]!;
      for (let j = 0; j < ring.length; j++) {
        const m = ring[j];
        if (!m) continue;
        const a = (j / SHARDS) * Math.PI * 2 + t * (0.18 + (j % 3) * 0.05) + i;
        const r = RADIUS * (1.25 + (j % 2) * 0.25) + st.dive * 3;
        m.position.set(Math.cos(a) * r, Math.sin(t * 0.7 + j * 1.3) * 0.6 + ((j % 3) - 1) * 0.35, Math.sin(a) * r);
        m.rotation.set(t * 0.6 + j, t * 0.4 + j * 2, 0);
      }

      g.getWorldPosition(p);
      edge.copy(p).addScaledVector(right, RADIUS * g.scale.x);
      p.project(camera);
      edge.project(camera);
      const sx = ((p.x + 1) / 2) * size.width;
      const sy = ((1 - p.y) / 2) * size.height;
      const ex = ((edge.x + 1) / 2) * size.width;
      live.artifactScreens[i] = {
        x: sx,
        y: sy,
        r: Math.abs(ex - sx),
        visible: p.z < 1 && Math.abs(p.x) < 1.2 && Math.abs(p.y) < 1.2,
      };
      if (live.hoverArtifact === i) {
        hoverTarget.x = sx;
        hoverTarget.y = sy;
        hoverTarget.r = Math.abs(ex - sx);
        guide.scene = hoverTarget;
      }
    }
  });

  const onOver = (i: number) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (live.realm.phase !== "idle" || visibleRef.current < 0.5) return;
    live.hoverArtifact = i;
    gl.domElement.style.cursor = "pointer";
    ambient.blip(520 + i * 120);
    const a = ARTIFACTS[i]!;
    setGuideTopic({ key: `artifact:${a.id}`, title: a.name, body: `${a.blurb} Click to step inside.` });
  };
  const onOut = (i: number) => () => {
    if (live.hoverArtifact !== i) return;
    live.hoverArtifact = -1;
    gl.domElement.style.cursor = "";
    clearGuideTopic(`artifact:${ARTIFACTS[i]!.id}`);
    if (guide.scene === hoverTarget) guide.scene = null;
  };

  // The canvas gets no pointer-out when the pointer moves straight onto the HUD.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.target !== gl.domElement && live.hoverArtifact >= 0) onOut(live.hoverArtifact)();
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  });
  const onClick = (i: number) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (visibleRef.current < 0.5) return;
    gl.domElement.style.cursor = "";
    enterRealm(i);
  };

  return (
    <group>
      {ARTIFACTS.map((a, i) => {
        const it = assets.items[i]!;
        return (
          <group
            key={a.id}
            ref={(el) => {
              groups.current[i] = el;
            }}
            visible={false}
          >
            <group
              ref={(el) => {
                logos.current[i] = el;
              }}
            >
              <mesh geometry={it.logo} material={it.logoMat} scale={1.05} />
            </group>
            <mesh
              ref={(el) => {
                crystals.current[i] = el;
              }}
              geometry={it.crystal}
              material={it.ice}
              scale={RADIUS}
              renderOrder={2}
            />
            <lineSegments
              ref={(el) => {
                wires.current[i] = el;
              }}
              geometry={it.wire}
              material={it.wireMat}
            />
            {Array.from({ length: SHARDS }, (_, j) => (
              <mesh
                key={j}
                ref={(el) => {
                  shards.current[i]![j] = el;
                }}
                geometry={assets.shard}
                material={it.shardIce}
                scale={1 + (j % 3) * 0.5}
              />
            ))}
            <mesh onPointerOver={onOver(i)} onPointerOut={onOut(i)} onClick={onClick(i)}>
              <sphereGeometry args={[RADIUS * 1.2, 16, 12]} />
              <meshBasicMaterial visible={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

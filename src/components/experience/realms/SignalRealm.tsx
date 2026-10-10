"use client";

import { Html } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  LineBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type Group,
  type LineSegments,
  type Points,
} from "three";
import { TECH_BY_ID } from "~/lib/tech";
import { ambient } from "../audio";
import { buildCrystalGeometry } from "../scene/crystal";
import { createIceMaterial } from "../scene/iceMaterial";
import { buildLogoGeometry } from "../scene/logoGeometry";
import { live } from "../store";
import { makeDotTexture } from "./textures";
import { SIGNAL_LIMITS, signalStore, useRealmStore } from "./realmData";

const MAX = SIGNAL_LIMITS.max;
const MAX_LINKS = (MAX * (MAX - 1)) / 2;
const MAX_PARTICLES = 1400;
const RING = 4.4;
const HUB_Y = 1.7;
const UP = new Color("#4ade80");
const DOWN = new Color("#22d3ee");

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function SignalRealm({ lite, accent }: { lite: boolean; accent: string }) {
  const gl = useThree((s) => s.gl);
  const peers = useRef<(Group | null)[]>([]);
  const hub = useRef<Group>(null);
  const hubLogo = useRef<Group>(null);
  const lines = useRef<LineSegments>(null);
  const points = useRef<Points>(null);
  const hovered = useRef(-1);
  const { peers: count } = useRealmStore(signalStore);

  const assets = useMemo(() => {
    const lineGeo = new BufferGeometry();
    lineGeo.setAttribute("position", new BufferAttribute(new Float32Array(MAX_LINKS * 6), 3));
    const pointGeo = new BufferGeometry();
    pointGeo.setAttribute("position", new BufferAttribute(new Float32Array(MAX_PARTICLES * 3), 3));
    pointGeo.setAttribute("color", new BufferAttribute(new Float32Array(MAX_PARTICLES * 3), 3));
    const livekit = TECH_BY_ID.livekit;
    return {
      lineGeo,
      lineMat: new LineBasicMaterial({ color: accent, transparent: true, opacity: 0.22, depthWrite: false }),
      pointGeo,
      dot: makeDotTexture(),
      crystal: buildCrystalGeometry(41, [1, 1, 1]),
      ice: createIceMaterial(accent),
      logo: buildLogoGeometry(livekit.path, lite),
      logoMat: new MeshStandardMaterial({
        color: livekit.color,
        emissive: livekit.color,
        emissiveIntensity: 1.1,
        toneMapped: false,
      }),
      torus: new TorusGeometry(1.75, 0.012, 6, 96),
      torusMat: new MeshStandardMaterial({
        color: accent,
        emissive: accent,
        emissiveIntensity: 1.5,
        transparent: true,
        toneMapped: false,
      }),
      peer: new SphereGeometry(0.24, 24, 16),
      peerMats: Array.from(
        { length: MAX },
        () => new MeshStandardMaterial({ color: "#e0fbff", emissive: accent, emissiveIntensity: 0.9, toneMapped: false }),
      ),
    };
  }, [lite, accent]);

  useEffect(
    () => () => {
      assets.lineGeo.dispose();
      assets.lineMat.dispose();
      assets.pointGeo.dispose();
      assets.dot.dispose();
      assets.crystal.dispose();
      assets.ice.dispose();
      assets.logo.dispose();
      assets.logoMat.dispose();
      assets.torus.dispose();
      assets.torusMat.dispose();
      assets.peer.dispose();
      assets.peerMats.forEach((m) => m.dispose());
    },
    [assets],
  );

  const sim = useMemo(
    () => ({
      presence: Array.from({ length: MAX }, () => 0),
      hover: Array.from({ length: MAX }, () => 0),
      pos: Array.from({ length: MAX }, () => new Vector3()),
      hubPos: new Vector3(0, HUB_Y, 0),
      a: new Vector3(),
      b: new Vector3(),
      side: new Vector3(),
      mode: 0,
    }),
    [],
  );

  useFrame(({ clock, camera }, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = clock.elapsedTime;
    const { peers: n, mode } = signalStore.get();
    const ease = (r: number) => 1 - Math.exp(-dt * r);
    sim.mode += ((mode === "mesh" ? 1 : 0) - sim.mode) * ease(3);

    for (let i = 0; i < MAX; i++) {
      sim.presence[i]! += ((i < n ? 1 : 0) - sim.presence[i]!) * ease(4);
      sim.hover[i]! += ((hovered.current === i ? 1 : 0) - sim.hover[i]!) * ease(8);
      const angle = (i / Math.max(n, 1)) * Math.PI * 2 + t * 0.06;
      const r = RING * (0.6 + 0.4 * sim.presence[i]!);
      sim.pos[i]!.set(Math.cos(angle) * r, HUB_Y + Math.sin(t * 0.8 + i * 1.7) * 0.3, Math.sin(angle) * r);
      const g = peers.current[i];
      if (g) {
        g.position.copy(sim.pos[i]!);
        g.scale.setScalar(Math.max(0.0001, sim.presence[i]! * (1 + sim.hover[i]! * 0.35)));
        g.visible = sim.presence[i]! > 0.01;
      }
      assets.peerMats[i]!.emissiveIntensity = 0.8 + sim.hover[i]! * 1.6 + Math.sin(t * 3 + i) * 0.15;
    }

    if (hub.current) {
      hub.current.rotation.y = t * 0.15;
      hub.current.position.y = Math.sin(t * 0.6) * 0.08;
    }
    if (hubLogo.current) {
      hubLogo.current.lookAt(camera.position);
      hubLogo.current.rotateY(Math.sin(t * 0.5) * 0.3);
    }
    assets.ice.uniforms.uTime.value = t;
    assets.ice.uniforms.uGlow.value = 0.6 + (1 - sim.mode) * 0.5 + Math.sin(t * 2) * 0.1;
    assets.torusMat.opacity = 1 - sim.mode;

    // Links: spokes to the SFU fade out as the full mesh fades in.
    const lp = assets.lineGeo.getAttribute("position") as BufferAttribute;
    let li = 0;
    const pushLine = (a: Vector3, b: Vector3) => {
      lp.setXYZ(li++, a.x, a.y, a.z);
      lp.setXYZ(li++, b.x, b.y, b.z);
    };
    if (sim.mode < 0.5) for (let i = 0; i < n; i++) pushLine(sim.pos[i]!, sim.hubPos);
    else for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pushLine(sim.pos[i]!, sim.pos[j]!);
    lp.needsUpdate = true;
    assets.lineGeo.setDrawRange(0, li);
    assets.lineMat.opacity = 0.1 + Math.abs(sim.mode - 0.5) * 0.3;
    if (lines.current) lines.current.visible = li > 0;

    // Particles: each stream is a train of dots moving along its link.
    const pp = assets.pointGeo.getAttribute("position") as BufferAttribute;
    const pc = assets.pointGeo.getAttribute("color") as BufferAttribute;
    let pi = 0;
    const { a, b, side } = sim;
    const stream = (from: Vector3, to: Vector3, count: number, speed: number, seed: number, color: Color, offset: number) => {
      side.subVectors(to, from).cross(camera.up).normalize().multiplyScalar(offset);
      for (let j = 0; j < count && pi < MAX_PARTICLES; j++) {
        const f = (t * speed + j / count + seed) % 1;
        a.lerpVectors(from, to, f).add(side);
        pp.setXYZ(pi, a.x, a.y, a.z);
        const fade = Math.sin(Math.PI * f);
        pc.setXYZ(pi, color.r * fade, color.g * fade, color.b * fade);
        pi++;
      }
    };
    const density = lite ? 0.6 : 1;
    if (sim.mode < 0.5) {
      for (let i = 0; i < n; i++) {
        b.copy(sim.hubPos);
        stream(sim.pos[i]!, b, Math.round(7 * density), 0.35, i * 0.13, UP, 0.07);
        stream(b, sim.pos[i]!, Math.round(Math.min(30, (n - 1) * 4) * density), 0.32, i * 0.29, DOWN, -0.07);
      }
    } else {
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          stream(sim.pos[i]!, sim.pos[j]!, Math.round(5 * density), 0.3, (i + j) * 0.17, UP, 0.06);
          stream(sim.pos[j]!, sim.pos[i]!, Math.round(5 * density), 0.3, (i * j) * 0.11, DOWN, 0.06);
        }
      }
    }
    pp.needsUpdate = true;
    pc.needsUpdate = true;
    assets.pointGeo.setDrawRange(0, pi);
    if (points.current) points.current.visible = pi > 0;
  });

  const onOver = (i: number) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    hovered.current = i;
    live.hoverRealm = true;
    gl.domElement.style.cursor = "pointer";
  };
  const onOut = (i: number) => () => {
    if (hovered.current === i) hovered.current = -1;
    live.hoverRealm = false;
    gl.domElement.style.cursor = "";
  };
  const onPeerClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6) return;
    signalStore.set((s) => ({ peers: Math.max(SIGNAL_LIMITS.min, s.peers - 1) }));
    ambient.blip(520);
  };
  const onHubClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6) return;
    signalStore.set((s) => ({ peers: Math.min(SIGNAL_LIMITS.max, s.peers + 1) }));
    ambient.blip(990);
  };

  return (
    <group>
      <group ref={hub} position={[0, 0, 0]}>
        <group position={[0, HUB_Y, 0]}>
          <group ref={hubLogo}>
            <mesh geometry={assets.logo} material={assets.logoMat} scale={0.9} />
          </group>
          <mesh
            geometry={assets.crystal}
            material={assets.ice}
            scale={1.1}
            onPointerOver={onOver(-2)}
            onPointerOut={onOut(-2)}
            onClick={onHubClick}
          />
          <mesh geometry={assets.torus} material={assets.torusMat} rotation={[Math.PI / 2, 0, 0]} />
          <Html position={[0, -1.75, 0]} center zIndexRange={[5, 0]} className="pointer-events-none select-none">
            <div className="realm-tag">
              <span className="realm-tag-index">SFU</span>
              <span className="realm-tag-title">LiveKit</span>
              <span className="realm-tag-detail">click to add a peer</span>
            </div>
          </Html>
        </group>
      </group>

      {Array.from({ length: MAX }, (_, i) => (
        <group
          key={i}
          ref={(el) => {
            peers.current[i] = el;
          }}
          visible={false}
        >
          <mesh
            geometry={assets.peer}
            material={assets.peerMats[i]}
            onPointerOver={onOver(i)}
            onPointerOut={onOut(i)}
            onClick={onPeerClick}
          />
          {i < count ? (
            <Html position={[0, -0.55, 0]} center zIndexRange={[5, 0]} className="pointer-events-none select-none">
              <div className="realm-tag realm-tag-small">
                <span className="realm-tag-title">peer_{pad(i + 1)}</span>
                <span className="realm-tag-detail">720p · {18 + ((i * 7) % 30)}ms</span>
              </div>
            </Html>
          ) : null}
        </group>
      ))}

      <lineSegments ref={lines} geometry={assets.lineGeo} material={assets.lineMat} frustumCulled={false} />
      <points ref={points} geometry={assets.pointGeo} frustumCulled={false}>
        <pointsMaterial
          map={assets.dot}
          size={0.16}
          vertexColors
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </points>
    </group>
  );
}

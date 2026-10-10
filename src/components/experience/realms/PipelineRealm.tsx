"use client";

import { Html, RoundedBox } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  CatmullRomCurve3,
  Color,
  IcosahedronGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  TubeGeometry,
  Vector3,
  type Group,
  type InstancedMesh,
} from "three";
import { TECH_BY_ID } from "~/lib/tech";
import { ambient } from "../audio";
import { createIceMaterial } from "../scene/iceMaterial";
import { buildLogoGeometry } from "../scene/logoGeometry";
import { live } from "../store";
import { appendPipelineLog, PIPELINE_STAGES, pipelineLogLine, pipelineStore, pushCommit } from "./realmData";

const N = PIPELINE_STAGES.length;
const GAP = 3.4;
const Y = 1.5;
const MAX_PACKETS = 48;
const AUTO_EVERY = 2.4;
const LEAD = new Color("#4ade80");
const AUTO = new Color("#c7dcff");
/** Curve parameter at which each stage sits (the curve has one lead-in point before the first stage). */
const STAGE_T = PIPELINE_STAGES.map((_, i) => (i + 1) / (N + 1));

function stagePosition(i: number) {
  return new Vector3(-((N - 1) / 2) * GAP + i * GAP, Y, Math.sin(i * 1.25) * 1.8);
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

type Packet = { t: number; speed: number; lead: boolean; build: number; passed: number };

export function PipelineRealm({ lite, accent }: { lite: boolean; accent: string }) {
  const gl = useThree((s) => s.gl);
  const instanced = useRef<InstancedMesh>(null);
  const nodes = useRef<(Group | null)[]>([]);
  const logos = useRef<(Group | null)[]>([]);
  const hovered = useRef(-1);

  const assets = useMemo(() => {
    const positions = PIPELINE_STAGES.map((_, i) => stagePosition(i));
    const first = positions[0]!;
    const last = positions[N - 1]!;
    const curve = new CatmullRomCurve3(
      [new Vector3(first.x - 3.6, Y, first.z + 1.2), ...positions, new Vector3(last.x + 3.6, Y, last.z - 1.2)],
      false,
      "centripetal",
    );
    return {
      positions,
      curve,
      tube: new TubeGeometry(curve, 280, 0.045, 8, false),
      glow: new TubeGeometry(curve, 280, 0.17, 10, false),
      tubeMat: new MeshBasicMaterial({ color: accent, toneMapped: false }),
      glowMat: new MeshBasicMaterial({
        color: accent,
        transparent: true,
        opacity: 0.13,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
      logos: PIPELINE_STAGES.map((s) => buildLogoGeometry(TECH_BY_ID[s.tech].path, lite)),
      logoMats: PIPELINE_STAGES.map((s) => {
        const c = new Color(TECH_BY_ID[s.tech].color);
        return new MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.7, toneMapped: false });
      }),
      ice: PIPELINE_STAGES.map((s) => createIceMaterial(TECH_BY_ID[s.tech].color)),
      packet: new IcosahedronGeometry(0.12, 1),
      packetMat: new MeshBasicMaterial({ color: "#ffffff", toneMapped: false }),
    };
  }, [lite, accent]);

  useEffect(
    () => () => {
      assets.tube.dispose();
      assets.glow.dispose();
      assets.tubeMat.dispose();
      assets.glowMat.dispose();
      assets.logos.forEach((g) => g.dispose());
      assets.logoMats.forEach((m) => m.dispose());
      assets.ice.forEach((m) => m.dispose());
      assets.packet.dispose();
      assets.packetMat.dispose();
    },
    [assets],
  );

  const sim = useRef({
    packets: [] as Packet[],
    nextAuto: 0.4,
    seenPushes: pipelineStore.get().pushes,
    pulse: PIPELINE_STAGES.map(() => 0),
    hover: PIPELINE_STAGES.map(() => 0),
  });
  const scratch = useMemo(() => ({ dummy: new Object3D(), p: new Vector3() }), []);

  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    // Start with one commit already on its way so the realm is alive on arrival.
    pushCommit();
  }, []);

  useFrame(({ clock, camera }, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = clock.elapsedTime;
    const s = sim.current;
    const spawn = (lead: boolean, build: number) => {
      if (s.packets.length >= MAX_PACKETS) return;
      s.packets.push({ t: 0, speed: lead ? 0.075 : 0.05 + Math.random() * 0.03, lead, build, passed: 0 });
    };

    s.nextAuto -= dt;
    if (s.nextAuto <= 0) {
      s.nextAuto = AUTO_EVERY * (0.7 + Math.random() * 0.6);
      spawn(false, 0);
    }
    const store = pipelineStore.get();
    while (s.seenPushes < store.pushes) {
      s.seenPushes++;
      spawn(true, store.build - (store.pushes - s.seenPushes));
    }

    let deployed = 0;
    for (let i = s.packets.length - 1; i >= 0; i--) {
      const p = s.packets[i]!;
      p.t += p.speed * dt;
      while (p.passed < N && p.t >= STAGE_T[p.passed]!) {
        s.pulse[p.passed] = 1;
        if (p.lead) {
          appendPipelineLog(pipelineLogLine(p.passed, p.build));
          ambient.blip(440 + p.passed * 90);
        }
        p.passed++;
      }
      if (p.t >= 1) {
        s.packets.splice(i, 1);
        deployed++;
      }
    }
    if (deployed) pipelineStore.set((st) => ({ deploys: st.deploys + deployed }));

    const mesh = instanced.current;
    if (mesh) {
      const { dummy, p } = scratch;
      s.packets.forEach((packet, i) => {
        assets.curve.getPoint(packet.t, p);
        dummy.position.copy(p);
        dummy.scale.setScalar(packet.lead ? 1.7 : 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, packet.lead ? LEAD : AUTO);
      });
      mesh.count = s.packets.length;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }

    const ease = 1 - Math.exp(-dt * 8);
    for (let i = 0; i < N; i++) {
      s.pulse[i] = Math.max(0, s.pulse[i]! - dt * 1.4);
      s.hover[i]! += ((hovered.current === i ? 1 : 0) - s.hover[i]!) * ease;
      const pulse = s.pulse[i]!;
      const node = nodes.current[i];
      if (node) {
        node.scale.setScalar(1 + pulse * 0.14 + s.hover[i]! * 0.1);
        node.position.y = Y + Math.sin(t * 0.8 + i) * 0.08;
      }
      const ice = assets.ice[i]!;
      ice.uniforms.uTime.value = t;
      ice.uniforms.uGlow.value = 0.3 + pulse * 1.6 + s.hover[i]! * 0.6;
      assets.logoMats[i]!.emissiveIntensity = 0.6 + pulse * 2.4 + s.hover[i]! * 0.6;
      const logo = logos.current[i];
      if (logo) {
        logo.lookAt(camera.position);
        logo.rotateY(Math.sin(t * 0.6 + i) * 0.35);
      }
    }
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
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6) return;
    pushCommit();
    ambient.blip(1320);
  };

  return (
    <group>
      <mesh geometry={assets.tube} material={assets.tubeMat} />
      <mesh geometry={assets.glow} material={assets.glowMat} />
      <instancedMesh ref={instanced} args={[assets.packet, assets.packetMat, MAX_PACKETS]} frustumCulled={false} />
      {PIPELINE_STAGES.map((stage, i) => {
        const p = assets.positions[i]!;
        return (
          <group key={stage.title} position={[p.x, 0, p.z]}>
            <group
              ref={(el) => {
                nodes.current[i] = el;
              }}
              position={[0, Y, 0]}
            >
              <group
                ref={(el) => {
                  logos.current[i] = el;
                }}
              >
                <mesh geometry={assets.logos[i]} material={assets.logoMats[i]} scale={0.8} />
              </group>
              <RoundedBox
                args={[1.5, 1.5, 1.5]}
                radius={0.22}
                smoothness={3}
                material={assets.ice[i]}
                onPointerOver={onOver(i)}
                onPointerOut={onOut(i)}
                onClick={onClick}
              />
            </group>
            <Html position={[0, Y - 1.45, 0]} center zIndexRange={[5, 0]} className="pointer-events-none select-none">
              <div className="realm-tag">
                <span className="realm-tag-index">{pad(i + 1)}</span>
                <span className="realm-tag-title">{stage.title}</span>
                <span className="realm-tag-detail">{stage.detail}</span>
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

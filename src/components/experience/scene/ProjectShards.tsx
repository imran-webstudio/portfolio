"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group, Mesh, MeshStandardMaterial } from "three";
import { blendAt, live, presence } from "../store";
import { shardPosition } from "./config";

const PROJECTS_CHAPTER = 4;

function Shard({ index, count }: { index: number; count: number }) {
  const group = useRef<Group>(null);
  const crystal = useRef<Mesh>(null);
  const focus = useRef(0);

  useFrame(({ clock }, delta) => {
    const g = group.current;
    if (!g) return;
    const b = blendAt(live.chapter);
    const show = presence(b, PROJECTS_CHAPTER);
    g.visible = show > 0.001;
    if (!g.visible) return;

    const inChapter = b.from === PROJECTS_CHAPTER && b.to === PROJECTS_CHAPTER;
    const active = inChapter && Math.min(count - 1, Math.floor(b.u * count)) === index;
    focus.current += ((active ? 1 : 0) - focus.current) * (1 - Math.exp(-delta * 4));

    const t = clock.elapsedTime;
    g.scale.setScalar(show * (0.85 + focus.current * 0.3));
    g.rotation.y = t * (0.25 + focus.current * 0.35) + index;
    g.position.y = Math.sin(t * 0.8 + index) * 0.08;

    if (crystal.current) {
      const mat = crystal.current.material as MeshStandardMaterial;
      mat.emissiveIntensity = 0.5 + focus.current * 2.2;
    }
  });

  return (
    <group position={shardPosition(index, count)}>
      <group ref={group}>
        <mesh ref={crystal} scale={[0.45, 1.05, 0.45]}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color="#e6fff1"
            emissive="#4ade80"
            emissiveIntensity={0.5}
            roughness={0.12}
            metalness={0.3}
            flatShading
            toneMapped={false}
          />
        </mesh>
        <mesh scale={[0.62, 1.32, 0.62]}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color="#86efac" wireframe transparent opacity={0.3} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

export function ProjectShards({ count }: { count: number }) {
  return (
    <group>
      {Array.from({ length: count }, (_, i) => (
        <Shard key={i} index={i} count={count} />
      ))}
    </group>
  );
}

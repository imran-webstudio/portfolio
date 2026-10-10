"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { ConeGeometry, CylinderGeometry, Object3D, type InstancedMesh } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CAMERA } from "./config";
import { mulberry32, terrainHeight } from "./noise";

function pineGeometry() {
  const parts = [
    new CylinderGeometry(0.12, 0.18, 1, 5).translate(0, 0.5, 0),
    new ConeGeometry(1.25, 2.2, 7).translate(0, 1.7, 0),
    new ConeGeometry(0.95, 1.9, 7).translate(0, 2.8, 0),
    new ConeGeometry(0.62, 1.6, 7).translate(0, 3.8, 0),
  ];
  const merged = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  return merged;
}

/** Horizontal distance from (x, z) to the segment a→b. */
function distToSegment(x: number, z: number, ax: number, az: number, bx: number, bz: number) {
  const dx = bx - ax;
  const dz = bz - az;
  const len = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / len));
  return Math.hypot(x - (ax + dx * t), z - (az + dz * t));
}

const SIGHTLINES = CAMERA.flatMap((k) => [k.a, k.b]);

function blocked(x: number, z: number) {
  if (Math.hypot(x, z) < 14) return true;
  if (z > -50 && z < 3 && Math.abs(x) < 5.5) return true;
  if (z > -3 && z < 34 && Math.abs(x) < 11) return true;
  return SIGHTLINES.some((s) => distToSegment(x, z, s.pos[0], s.pos[2], s.look[0], s.look[2]) < 3.2);
}

export function Trees({ lite }: { lite: boolean }) {
  const mesh = useRef<InstancedMesh>(null);
  const geometry = useMemo(pineGeometry, []);

  const transforms = useMemo(() => {
    const rnd = mulberry32(5);
    const target = lite ? 220 : 520;
    const out: { x: number; y: number; z: number; s: number; r: number }[] = [];
    for (let tries = 0; out.length < target && tries < target * 30; tries++) {
      const angle = rnd() * Math.PI * 2;
      const radius = 12 + Math.pow(rnd(), 0.8) * 60;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius - 6;
      if (blocked(x, z)) continue;
      const y = terrainHeight(x, z);
      if (y > 13) continue;
      out.push({ x, y: y - 0.1, z, s: 0.8 + rnd() * 1.5, r: rnd() * Math.PI * 2 });
    }
    return out;
  }, [lite]);

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const dummy = new Object3D();
    transforms.forEach((t, i) => {
      dummy.position.set(t.x, t.y, t.z);
      dummy.rotation.set(0, t.r, 0);
      dummy.scale.set(t.s, t.s * (0.9 + (i % 5) * 0.08), t.s);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [transforms]);

  useLayoutEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, transforms.length]} receiveShadow={!lite}>
      <meshStandardMaterial color="#123026" roughness={0.95} metalness={0} flatShading />
    </instancedMesh>
  );
}

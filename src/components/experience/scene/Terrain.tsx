"use client";

import { useMemo } from "react";
import { PlaneGeometry } from "three";
import { terrainHeight } from "./noise";

const OFFSET_Z = -10;

export function Terrain({ lite }: { lite: boolean }) {
  const geometry = useMemo(() => {
    const segments = lite ? 140 : 280;
    const geo = new PlaneGeometry(260, 260, segments, segments);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0, OFFSET_Z);
    const pos = geo.attributes.position!;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
    }
    geo.computeVertexNormals();
    return geo;
  }, [lite]);

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial color="#b9c8d8" roughness={0.96} metalness={0} />
    </mesh>
  );
}

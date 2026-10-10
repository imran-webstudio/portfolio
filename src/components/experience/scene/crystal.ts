import { BufferGeometry, Float32BufferAttribute, IcosahedronGeometry, Vector3 } from "three";
import { mulberry32 } from "./noise";

function hash3(x: number, y: number, z: number, seed: number) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed * 19.3) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * A rough, faceted chunk of ice. Displacement is keyed on each vertex's original
 * position so the duplicated vertices of the non-indexed icosahedron stay welded.
 */
export function buildCrystalGeometry(seed: number, stretch: [number, number, number] = [0.92, 1.3, 0.85]) {
  const geometry = new IcosahedronGeometry(1, 1);
  const pos = geometry.getAttribute("position");
  const p = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    const key = [Math.round(p.x * 1000), Math.round(p.y * 1000), Math.round(p.z * 1000)] as const;
    const k = 0.78 + hash3(key[0], key[1], key[2], seed) * 0.42;
    p.multiplyScalar(k);
    // Chip a flat face into one side, like a broken-off chunk.
    if (p.x + p.z * 0.4 > 0.62) p.x -= (p.x + p.z * 0.4 - 0.62) * 0.7;
    pos.setXYZ(i, p.x * stretch[0], p.y * stretch[1], p.z * stretch[2]);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** Sparse lines between nearby points on a shell, like the survey wires around igloo's crystals. */
export function buildConstellation(seed: number, radius: number, points = 14) {
  const rnd = mulberry32(seed);
  const nodes: Vector3[] = [];
  for (let i = 0; i < points; i++) {
    const u = rnd() * 2 - 1;
    const a = rnd() * Math.PI * 2;
    const r = radius * (0.85 + rnd() * 0.5);
    const s = Math.sqrt(1 - u * u);
    nodes.push(new Vector3(Math.cos(a) * s * r, u * r * 1.2, Math.sin(a) * s * r));
  }
  const verts: number[] = [];
  nodes.forEach((n, i) => {
    const nearest = nodes
      .map((m, j) => ({ j, d: n.distanceToSquared(m) }))
      .filter(({ j }) => j !== i)
      .sort((x, y) => x.d - y.d)
      .slice(0, 1 + Math.floor(rnd() * 2));
    for (const { j } of nearest) {
      if (j < i) continue;
      const m = nodes[j]!;
      verts.push(n.x, n.y, n.z, m.x, m.y, m.z);
    }
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(verts, 3));
  return geometry;
}

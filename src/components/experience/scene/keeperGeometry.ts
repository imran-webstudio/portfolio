import {
  BufferGeometry,
  CapsuleGeometry,
  Color,
  CubicBezierCurve3,
  CurvePath,
  Float32BufferAttribute,
  SphereGeometry,
  TubeGeometry,
  Vector3,
} from "three";
import { buildCrystalGeometry } from "./crystal";

/**
 * The iw mark, traced from the brand artwork (1024px board): a round dot, a pill-shaped
 * i stem, and a smooth wave ribbon that flows out of the stem's foot into the w.
 */
const UNIT = 230;
/** Board point at the glyph's origin: the middle of the whole mark. */
const ORIGIN = { x: 535, y: 428 };

function point(x: number, y: number) {
  return new Vector3((x - ORIGIN.x) / UNIT, -(y - ORIGIN.y) / UNIT, 0);
}

export const STROKE = 46 / UNIT;
/** Ribbon depth relative to its width: a flattened, glossy band rather than a round tube. */
export const RIBBON_DEPTH = 0.6;

/** The i: its foot (the pivot it sways around) and, relative to that, its stem and dot. */
export const I_FOOT = point(362, 592);
export const I_PARTS = {
  stemCenter: point(362, 468).sub(I_FOOT),
  stemLength: (548 - 388) / UNIT,
  head: point(362, 272).sub(I_FOOT),
  headRadius: 47 / UNIT,
  eyeSpacing: 15 / UNIT,
  /** Foot to the top of the dot. */
  height: (592 - 225) / UNIT,
};

function ribbonCurve() {
  const p = point;
  const path = new CurvePath<Vector3>();
  path.add(new CubicBezierCurve3(p(362, 548), p(362, 618), p(432, 452), p(494, 452)));
  path.add(new CubicBezierCurve3(p(494, 452), p(548, 452), p(572, 588), p(626, 588)));
  path.add(new CubicBezierCurve3(p(626, 588), p(676, 588), p(698, 470), p(720, 410)));
  return path;
}

const RIBBON_STOPS: [number, Color][] = [
  [362, new Color("#2f6bff")],
  [470, new Color("#3db4ff")],
  [560, new Color("#4a8dff")],
  [630, new Color("#6d5cf5")],
  [735, new Color("#c79bff")],
];
const DEEP = new Color("#3b2fc9");
const scratch = new Color();

/** Brand gradient at a board position: blue on the left through cyan to lilac on the right, deeper at the bottom. */
function brandColor(x: number, y: number, out: Color) {
  let i = 0;
  while (i < RIBBON_STOPS.length - 2 && x > RIBBON_STOPS[i + 1]![0]) i++;
  const [x0, c0] = RIBBON_STOPS[i]!;
  const [x1, c1] = RIBBON_STOPS[i + 1]!;
  out.copy(c0).lerp(c1, Math.min(1, Math.max(0, (x - x0) / (x1 - x0))));
  return out.lerp(DEEP, Math.min(0.35, Math.max(0, (y - 470) / 420)));
}

/** Writes a vertex colour per position, reading each vertex back as a board point after `offset`. */
function paint(geometry: BufferGeometry, offset: Vector3) {
  const pos = geometry.getAttribute("position");
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const bx = (pos.getX(i) + offset.x) * UNIT + ORIGIN.x;
    const by = -(pos.getY(i) + offset.y) * UNIT + ORIGIN.y;
    brandColor(bx, by, scratch).toArray(colors, i * 3);
  }
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  return geometry;
}

/** The w: the wave ribbon with round caps at both ends. */
export function buildGlyph(lite: boolean) {
  const path = ribbonCurve();
  const ribbon = paint(new TubeGeometry(path, lite ? 90 : 160, STROKE, lite ? 12 : 20, false), new Vector3());
  const ends = [path.getPoint(0), path.getPoint(1)];
  return {
    ribbon,
    caps: ends.map((end) => ({
      geometry: paint(new SphereGeometry(STROKE, lite ? 12 : 20, lite ? 10 : 16), end),
      position: end,
    })),
  };
}

/** The i, in its own frame with the origin at its foot. */
export function buildGuide(lite: boolean) {
  const stem = new CapsuleGeometry(STROKE, I_PARTS.stemLength, lite ? 6 : 10, lite ? 12 : 20);
  const head = new SphereGeometry(I_PARTS.headRadius, lite ? 20 : 32, lite ? 14 : 24);
  return {
    stem: paint(stem, I_PARTS.stemCenter.clone().add(I_FOOT)),
    head: paint(head, I_PARTS.head.clone().add(I_FOOT)),
  };
}

const PHI = (1 + Math.sqrt(5)) / 2;
/** Icosahedron vertex directions: one fragment forms around each. */
const SEEDS = [
  [0, 1, PHI],
  [0, 1, -PHI],
  [0, -1, PHI],
  [0, -1, -PHI],
  [1, PHI, 0],
  [1, -PHI, 0],
  [-1, PHI, 0],
  [-1, -PHI, 0],
  [PHI, 0, 1],
  [PHI, 0, -1],
  [-PHI, 0, 1],
  [-PHI, 0, -1],
].map(([x, y, z]) => new Vector3(x, y, z).normalize());

export type ShellFragment = { geometry: BufferGeometry; center: Vector3 };

/**
 * The ice shell the glyph sleeps in, pre-cut into fragments so it can crack and
 * burst apart. Each fragment's vertices are relative to its own centre.
 */
export function buildShellFragments(seed: number, stretch: [number, number, number]): ShellFragment[] {
  const shell = buildCrystalGeometry(seed, stretch);
  const pos = shell.getAttribute("position");
  const buckets = SEEDS.map(() => [] as number[]);
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  const mid = new Vector3();
  const unstretch = new Vector3(1 / stretch[0], 1 / stretch[1], 1 / stretch[2]);

  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    mid.copy(a).add(b).add(c).multiply(unstretch).normalize();
    let best = 0;
    let bestDot = -Infinity;
    SEEDS.forEach((s, k) => {
      const d = s.dot(mid);
      if (d > bestDot) {
        bestDot = d;
        best = k;
      }
    });
    buckets[best]!.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  }
  shell.dispose();

  return buckets
    .filter((v) => v.length > 0)
    .map((verts) => {
      const center = new Vector3();
      for (let i = 0; i < verts.length; i += 3) center.add(a.fromArray(verts, i));
      center.divideScalar(verts.length / 3);
      const local = verts.map((v, i) => v - (i % 3 === 0 ? center.x : i % 3 === 1 ? center.y : center.z));
      const geometry = new BufferGeometry();
      geometry.setAttribute("position", new Float32BufferAttribute(local, 3));
      return { geometry, center };
    });
}

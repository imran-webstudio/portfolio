import { ARTIFACT_VIEW_DISTANCE, ARTIFACTS } from "../realms/artifacts";

type Vec = [number, number, number];
type Shot = { pos: Vec; look: Vec };

export type CameraKey = {
  /** Where the chapter's transition lands. */
  a: Shot;
  /** Where the camera drifts to by the end of the chapter. */
  b: Shot;
  /** Holds visited between `a` and `b`, one per sub-item; the camera rests on each and glides to the next. */
  stops?: Shot[];
  /** Extra height added mid-transition so the camera swoops instead of cutting through geometry. */
  arc?: number;
};

/** Height of the forest path the camera flies along during Projects. */
export const PATH_Y = 3.5;
export const PROJECT_CAMERA = { startZ: -1, endZ: -22 };
export const CORE_Y = 0.9;
/** Centre of the intro logo ring; the core rises into it. */
export const RING_Y = 3.1;

function artifactShot(i: number): Shot {
  const [x, y, z] = ARTIFACTS[i]!.position;
  return { pos: [x, y + 0.25, z + ARTIFACT_VIEW_DISTANCE], look: [x, y, z] };
}

export const CAMERA: CameraKey[] = [
  {
    a: { pos: [0, RING_Y, 10.6], look: [0, RING_Y, 0] },
    b: { pos: [0.7, RING_Y + 0.35, 9.3], look: [0, RING_Y + 0.1, 0] },
    // Only used by the loop segment, swooping from Contact back to the ring.
    arc: 3,
  },
  {
    a: { pos: [-7.2, 3.4, 8.4], look: [1.8, 2.2, 0] },
    b: { pos: [-8.6, 4.4, 5.4], look: [2, 2.4, 0] },
    arc: 1.5,
  },
  {
    a: { pos: [-0.8, 3.5, 10.8], look: [-1.9, 3.0, 0] },
    b: { pos: [-1.8, 3.2, 9.8], look: [-2.1, 3.0, 0] },
    arc: 1.2,
  },
  {
    a: { pos: [7.5, 3.4, 6], look: [0, 3.6, 0] },
    b: { pos: [6, 13.2, 6.5], look: [0, 11.8, 0] },
    arc: 1,
  },
  {
    a: { pos: [0, PATH_Y, PROJECT_CAMERA.startZ], look: [0, PATH_Y, -10] },
    b: { pos: [0, PATH_Y, PROJECT_CAMERA.endZ], look: [0, PATH_Y, -34] },
    arc: 4,
  },
  {
    a: artifactShot(0),
    stops: ARTIFACTS.slice(1).map((_, i) => artifactShot(i + 1)),
    b: { pos: [0, 5.6, 17.5], look: [0, 0.6, -4] },
    arc: 6,
  },
];

export type Atmosphere = {
  sky: string;
  fog: number;
  hemi: number;
  moon: number;
  core: number;
  aurora: number;
};

export const ATMOSPHERE: Atmosphere[] = [
  { sky: "#04070b", fog: 0.022, hemi: 0.55, moon: 0.9, core: 1.4, aurora: 1.25 },
  { sky: "#050a0e", fog: 0.024, hemi: 0.5, moon: 0.8, core: 1.5, aurora: 1.1 },
  { sky: "#04080b", fog: 0.022, hemi: 0.55, moon: 0.85, core: 1.1, aurora: 1.05 },
  { sky: "#060b12", fog: 0.02, hemi: 0.5, moon: 0.8, core: 1.2, aurora: 1.35 },
  { sky: "#03060a", fog: 0.04, hemi: 0.4, moon: 0.55, core: 0.8, aurora: 0.8 },
  { sky: "#0a141b", fog: 0.03, hemi: 0.7, moon: 0.75, core: 1.2, aurora: 1.6 },
];

/** Shards sit a little ahead of where the camera is when each project becomes active. */
export function shardPosition(index: number, count: number): Vec {
  const u = (index + 0.5) / count;
  const camZ = PROJECT_CAMERA.startZ + (PROJECT_CAMERA.endZ - PROJECT_CAMERA.startZ) * u;
  return [shardSide(index) * 1.45, PATH_Y + (index % 3 === 1 ? 0.25 : -0.1), camZ - 4.6];
}

/** +1 = shard on the right (copy on the left), -1 = shard on the left. */
export function shardSide(index: number) {
  return index % 2 === 0 ? 1 : -1;
}

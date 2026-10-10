import type { Vector3 } from "three";
import { site } from "~/lib/site";
import { TECH, type TechId } from "~/lib/tech";
import { live } from "../store";
import { mulberry32 } from "./noise";
import { CAMERA, PATH_Y, RING_Y } from "./config";

export type LogoSlot = {
  id: TechId;
  index: number;
  rand: [number, number, number, number, number];
  /** Experience entry this logo is shelved under on the staircase. */
  band: number;
  bandIndex: number;
  bandCount: number;
};

function buildSlots(): LogoSlot[] {
  const rnd = mulberry32(19);
  const bands = site.experience.map(() => [] as TechId[]);
  for (const t of TECH) {
    let band = site.experience.findIndex((e) => (e.stack as readonly TechId[]).includes(t.id));
    if (band < 0) band = bands.reduce((best, b, i) => (b.length < bands[best]!.length ? i : best), 0);
    bands[band]!.push(t.id);
  }
  return TECH.map((t, index) => {
    const band = bands.findIndex((b) => b.includes(t.id));
    return {
      id: t.id,
      index,
      rand: [rnd(), rnd(), rnd(), rnd(), rnd()],
      band,
      bandIndex: bands[band]!.indexOf(t.id),
      bandCount: bands[band]!.length,
    };
  });
}

export const SLOTS = buildSlots();
export const LOGO_COUNT = SLOTS.length;

/** Writes the slot's position for time `t` and returns its scale. */
type Layout = (s: LogoSlot, t: number, out: Vector3) => number;

const TAU = Math.PI * 2;

/** Ring tilt (radians) away from the camera: enough depth to read as 3D while staying a clean circle. */
const RING_TILT = 0.3;

const intro: Layout = (s, t, out) => {
  const portrait = live.aspect < 0.8;
  const radius = portrait ? 2.25 : 2.95;
  const angle = Math.PI / 2 - (s.index / LOGO_COUNT) * TAU - t * 0.06;
  const ry = Math.sin(angle) * radius;
  out.set(
    Math.cos(angle) * radius,
    RING_Y + ry * Math.cos(RING_TILT),
    -ry * Math.sin(RING_TILT) + Math.sin(t * 0.9 + s.rand[0] * 6) * 0.05,
  );
  return portrait ? 0.4 : 0.52;
};

const about: Layout = (s, t, out) => {
  const [r1, r2, r3, r4] = s.rand;
  const theta = r1 * TAU + t * 0.03;
  const phi = Math.acos(0.15 + r2 * 0.8);
  const dist = 3.6 + r3 * 2.6;
  out.set(
    Math.sin(phi) * Math.cos(theta) * dist,
    0.9 + Math.cos(phi) * dist * 0.6 + Math.sin(t * 0.6 + r4 * 6) * 0.2,
    Math.sin(phi) * Math.sin(theta) * dist,
  );
  return 0.58;
};

/** Wide screens: grid to the right of the left-hand panel. */
const GRID = { cols: 7, x: 1.1, top: 4.7, z: 2.4, dx: 0.98, dy: 0.92, scale: 0.6 };
/** Portrait screens: narrower grid above the bottom-sheet panel. */
const GRID_PORTRAIT = { cols: 7, x: -2.05, top: 4.7, z: 2.4, dx: 0.6, dy: 0.6, scale: 0.36 };

const skills: Layout = (s, t, out) => {
  const g = live.aspect < 0.8 ? GRID_PORTRAIT : GRID;
  const row = Math.floor(s.index / g.cols);
  const col = s.index % g.cols;
  const rowLen = Math.min(g.cols, LOGO_COUNT - row * g.cols);
  const dx = (col - (rowLen - 1) / 2) * g.dx;
  out.set(
    g.x + dx,
    g.top - row * g.dy + Math.sin(t * 0.8 + s.rand[0] * 6) * 0.05,
    g.z - dx * dx * 0.05,
  );
  return g.scale;
};

const expCam = CAMERA[3]!;
const STAIR_BOTTOM = expCam.a.look[1];
const STAIR_TOP = expCam.b.look[1];
/** Angle (around the centre) the experience camera looks in from. */
const STAIR_FACING = Math.atan2(expCam.a.pos[2], expCam.a.pos[0]);

const experience: Layout = (s, t, out) => {
  const bands = site.experience.length;
  const center = STAIR_BOTTOM + ((s.band + 0.5) / bands) * (STAIR_TOP - STAIR_BOTTOM);
  const cols = Math.ceil(s.bandCount / 2);
  const col = Math.floor(s.bandIndex / 2);
  const upper = s.bandIndex % 2;
  const portrait = live.aspect < 0.8;
  // Negative offset swings the arc to screen-right, clear of the left-hand panel (portrait panels sit below instead).
  const swing = portrait ? -0.12 : -0.55;
  const step = portrait ? 0.34 : 0.42;
  const angle = STAIR_FACING + swing + (col - (cols - 1) / 2) * step + (upper ? step / 2 : 0) + Math.sin(t * 0.2) * 0.04;
  const radius = 2.7;
  out.set(
    Math.cos(angle) * radius,
    center + (upper ? 0.45 : -0.45) + Math.sin(t * 0.7 + s.rand[2] * 6) * 0.08,
    Math.sin(angle) * radius,
  );
  return portrait ? 0.46 : 0.55;
};

const projects: Layout = (s, t, out) => {
  const side = s.index % 2 ? 1 : -1;
  const j = Math.floor(s.index / 2);
  out.set(
    side * (2.9 + s.rand[1] * 0.7),
    PATH_Y - 0.6 + s.rand[2] * 1.5 + Math.sin(t * 0.7 + s.rand[3] * 6) * 0.15,
    -3.5 - j * 2.9,
  );
  return 0.55;
};

/** A wide, far halo behind the artifact crystals, like a constellation over the ridge. */
const HALO = { y: 5.6, z: -9, radius: 7.2 };

const contact: Layout = (s, t, out) => {
  const angle = (s.index / LOGO_COUNT) * TAU + t * 0.03;
  out.set(
    Math.cos(angle) * HALO.radius,
    HALO.y + Math.sin(angle) * HALO.radius * 0.62,
    HALO.z + Math.sin(angle * 2 + t * 0.5) * 0.4,
  );
  return 0.72;
};

export const LAYOUTS: Layout[] = [intro, about, skills, experience, projects, contact];

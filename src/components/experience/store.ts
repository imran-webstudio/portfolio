import { useSyncExternalStore } from "react";
import type { TechId } from "~/lib/tech";

export const CHAPTERS = [
  { id: "intro", label: "Intro", title: "Nightfall", line: "Every product begins as a small light in the cold." },
  { id: "about", label: "About", title: "The Keeper", line: "Four years of keeping that light alive in production." },
  { id: "skills", label: "Skills", title: "The Toolkit", line: "Many tools. One craft." },
  { id: "experience", label: "Experience", title: "The Ascent", line: "Every role, one step higher." },
  { id: "projects", label: "Projects", title: "The Path", line: "Lanterns left along the way." },
  { id: "contact", label: "Contact", title: "Beyond the Aurora", line: "Some things can only be explored." },
] as const;

export type ChapterId = (typeof CHAPTERS)[number]["id"];

export const CHAPTER_COUNT = CHAPTERS.length;

/** Scroll segments: every chapter plus a trailing one that eases Contact back into Intro, so the journey loops. */
export const SEGMENT_COUNT = CHAPTER_COUNT + 1;

/** Fraction of each chapter's scroll span spent transitioning in from the previous chapter. */
export const TRANSITION = 0.5;

export type RealmPhase = "idle" | "enter" | "inside" | "exit";

/** Realm transition timings (ms): camera dive into the crystal, the flash covering the swap, and the way back. */
export const REALM_TIMING = { dive: 1500, coverAt: 850, reveal: 1100, exitCover: 520 };

/**
 * Per-frame values written by the scroll/pointer listeners and read inside
 * `useFrame`. Mutated in place so the 3D scene never re-renders React on scroll.
 */
export const live = {
  /** Continuous segment position: integer part = segment index, fraction = progress through it. */
  chapter: 0,
  velocity: 0,
  pointerX: 0,
  pointerY: 0,
  /** Viewport width / height, so layouts can reframe for portrait screens. */
  aspect: 1.6,
  /** Sub-item counts for chapters that step through a list. */
  counts: { experience: 1, projects: 1, contact: 1 } as Record<"experience" | "projects" | "contact", number>,
  /** Logo under the pointer in the 3D scene. */
  hoverTech: null as TechId | null,
  /** Logo highlighted from the HUD (e.g. hovering a skill chip). */
  highlightTech: null as TechId | null,
  /** Screen position (px) of the selected logo, written by the scene each frame. */
  selectedScreen: { x: 0, y: 0, visible: false },
  /** Artifact crystal under the pointer, or -1. */
  hoverArtifact: -1,
  /** Something interactive inside a realm is under the pointer. */
  hoverRealm: false,
  /** The Keeper (the iw glyph at the heart of the clearing) is under the pointer. */
  hoverKeeper: false,
  /** Scene clock time of the last click on the Keeper; the intro logo ring rings like a bell from it. */
  ringPulse: -100,
  /** Screen position and projected radius (px) of each artifact, written by the scene each frame. */
  artifactScreens: [] as { x: number; y: number; r: number; visible: boolean }[],
  /** True while the idle auto-drift is scrolling the page. */
  autoplay: false,
  realm: { index: -1, phase: "idle" as RealmPhase, since: 0 },
};

let selected: TechId | null = null;
const selectionListeners = new Set<() => void>();

export function selectTech(id: TechId | null) {
  if (id === selected) return;
  selected = id;
  if (!id) live.selectedScreen.visible = false;
  selectionListeners.forEach((l) => l());
}

export function getSelectedTech() {
  return selected;
}

export function useSelectedTech() {
  return useSyncExternalStore(
    (l) => {
      selectionListeners.add(l);
      return () => selectionListeners.delete(l);
    },
    () => selected,
    () => null,
  );
}

type RealmState = { index: number; phase: RealmPhase };
let realm: RealmState = { index: -1, phase: "idle" };
const realmListeners = new Set<() => void>();
const idleRealm: RealmState = { index: -1, phase: "idle" };

export function setRealm(index: number, phase: RealmPhase) {
  if (realm.index === index && realm.phase === phase) return;
  realm = { index, phase };
  live.realm.index = index;
  live.realm.phase = phase;
  live.realm.since = performance.now();
  realmListeners.forEach((l) => l());
}

export function getRealm() {
  return realm;
}

export function useRealm() {
  return useSyncExternalStore(
    (l) => {
      realmListeners.add(l);
      return () => realmListeners.delete(l);
    },
    () => realm,
    () => idleRealm,
  );
}

export type Blend = {
  /** Chapter blended from. */
  from: number;
  /** Chapter blended to. */
  to: number;
  /** Eased transition weight between `from` and `to`. */
  t: number;
  /** Raw (linear) transition weight, used for per-item staggering. */
  raw: number;
  /** Progress through the current chapter once its transition has finished. */
  u: number;
};

export function easeInOut(x: number) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export function clamp01(x: number) {
  return Math.min(1, Math.max(0, x));
}

export function blendAt(chapter: number): Blend {
  const c = Math.min(Math.max(chapter, 0), SEGMENT_COUNT - 1e-4);
  const i = Math.floor(c);
  const f = c - i;
  // The trailing segment is one long transition from the last chapter back to the first.
  if (i === CHAPTER_COUNT) return { from: CHAPTER_COUNT - 1, to: 0, t: easeInOut(f), raw: f, u: 0 };
  if (i === 0) return { from: 0, to: 0, t: 0, raw: 0, u: f };
  if (f < TRANSITION) {
    const raw = f / TRANSITION;
    return { from: i - 1, to: i, t: easeInOut(raw), raw, u: 0 };
  }
  return { from: i, to: i, t: 0, raw: 1, u: (f - TRANSITION) / (1 - TRANSITION) };
}

/** How much chapter `k` contributes to the current blend (0..1). */
export function presence(b: Blend, k: number) {
  if (b.from === b.to) return b.from === k ? 1 : 0;
  if (b.from === k) return 1 - b.t;
  if (b.to === k) return b.t;
  return 0;
}

/** Fraction of each stop's slice spent gliding to the next stop. */
const STOP_GLIDE = 0.35;

/**
 * For chapters that hold on a series of stops (one per sub-item): which stop is
 * current and how far the glide to the next one has progressed.
 */
export function stopProgress(u: number, stops: number) {
  const s = Math.min(stops - 1e-4, Math.max(0, u * stops));
  const k = Math.floor(s);
  const local = s - k;
  const glide = k < stops - 1 ? easeInOut(clamp01((local - (1 - STOP_GLIDE)) / STOP_GLIDE)) : 0;
  return { k, glide };
}

type Discrete = {
  index: number;
  /** True once the active chapter's transition is mostly done and its copy should show. */
  settled: boolean;
  /** Active sub-item (experience entry / project / artifact) within the chapter. */
  sub: number;
};

let discrete: Discrete = { index: 0, settled: true, sub: 0 };
const listeners = new Set<() => void>();

export function updateChapter(chapter: number) {
  live.chapter = chapter;
  const b = blendAt(chapter);
  const index = b.from === b.to ? b.from : b.raw > 0.5 ? b.to : b.from;
  const settled = b.from === b.to || b.raw > 0.85;
  const id = CHAPTERS[index]?.id;
  const count = id === "experience" || id === "projects" || id === "contact" ? live.counts[id] : 1;
  const sub = Math.min(count - 1, Math.floor(b.u * count));
  if (index !== discrete.index || settled !== discrete.settled || sub !== discrete.sub) {
    discrete = { index, settled, sub };
    listeners.forEach((l) => l());
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const serverSnapshot: Discrete = { index: 0, settled: true, sub: 0 };

export function useChapter() {
  return useSyncExternalStore(
    subscribe,
    () => discrete,
    () => serverSnapshot,
  );
}

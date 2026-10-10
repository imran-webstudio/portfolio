import { useSyncExternalStore } from "react";

/** What the guide (the i from the iw mark) is currently explaining. */
export type GuideTopic = { key: string; title: string; body: string };

export type ScreenTarget = { x: number; y: number; r: number };

/**
 * Per-frame guide state. The scene writes where the guide is on screen; hover
 * sources write what it should fly to.
 */
export const guide = {
  /** Hovered HUD element carrying `data-guide`; its rect is re-read every frame. */
  element: null as HTMLElement | null,
  /** Hovered 3D object (logo, crystal, the w) on screen, or null. */
  scene: null as ScreenTarget | null,
  /** Screen position (px) of the guide's head and its on-screen height, written by the scene. */
  screen: { x: 0, y: 0, h: 0, visible: false },
};

let topic: GuideTopic | null = null;
const listeners = new Set<() => void>();

export function setGuideTopic(next: GuideTopic | null) {
  if (next?.key === topic?.key) return;
  topic = next;
  listeners.forEach((l) => l());
}

/** Clears the topic only if it is still the one `key` set, so a newer hover is not wiped by a late pointer-out. */
export function clearGuideTopic(key: string) {
  if (topic?.key === key) setGuideTopic(null);
}

export function useGuideTopic() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => topic,
    () => null,
  );
}

/** Marks a HUD element so the guide flies over and explains it on hover or focus. */
export function explain(title: string, text: string) {
  return { "data-guide": title, "data-guide-text": text };
}

const PANEL_GAP = 70;

/**
 * Where the guide should hover to explain a HUD element: just outside its glass panel,
 * on the side facing the middle of the screen, so the panel never hides it.
 */
export function anchorForElement(el: HTMLElement, out: ScreenTarget) {
  const rect = el.getBoundingClientRect();
  const w = window.innerWidth;
  const h = window.innerHeight;
  const cy = rect.top + rect.height / 2;
  const panel = el.closest<HTMLElement>(".glass-panel");
  if (panel && w >= 768) {
    const p = panel.getBoundingClientRect();
    const right = p.left + p.width / 2 < w / 2;
    out.x = right ? p.right + PANEL_GAP : p.left - PANEL_GAP;
    out.y = Math.min(h - 90, Math.max(110, cy));
  } else if (panel) {
    // Phone panels are bottom sheets: hover above the sheet.
    const p = panel.getBoundingClientRect();
    out.x = Math.min(w - 60, Math.max(60, rect.left + rect.width / 2));
    out.y = Math.max(110, p.top - 70);
  } else if (el.closest("nav")) {
    // Line up beside the whole menu rather than over its neighbouring items.
    const n = el.closest("nav")!.getBoundingClientRect();
    out.x = n.left - 60;
    out.y = Math.min(h - 90, Math.max(130, cy + 40));
  } else {
    const right = rect.left + rect.width / 2 < w / 2;
    out.x = right ? rect.right + 50 : rect.left - 50;
    out.y = Math.min(h - 90, Math.max(110, cy));
  }
  out.r = 0;
  return out;
}

export const CHAPTER_TIPS = [
  "Hi, I'm the i from imranwebstudio. Scroll and I'll show you around.",
  "This is Imran. Hover anything and I'll tell you about it.",
  "Every logo here is a tool he works with. Hover one, or click it for details.",
  "His roles, one step at a time. Keep scrolling to climb.",
  "Projects he has shipped. Hover the links and tags as we go.",
  "Each crystal opens a different realm. Click one to step inside.",
] as const;

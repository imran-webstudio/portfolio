import { useSyncExternalStore } from "react";
import type { TechId } from "~/lib/tech";

function createStore<T extends object>(initial: T) {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set: (patch: Partial<T> | ((s: T) => Partial<T>)) => {
      state = { ...state, ...(typeof patch === "function" ? patch(state) : patch) };
      listeners.forEach((l) => l());
    },
    reset: () => {
      state = initial;
      listeners.forEach((l) => l());
    },
    subscribe: (l: () => void) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
  };
}

type Store<T extends object> = ReturnType<typeof createStore<T>>;

export function useRealmStore<T extends object>(store: Store<T>) {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

/* ------------------------------ The Pipeline ------------------------------ */

export const PIPELINE_STAGES: { tech: TechId; title: string; detail: string }[] = [
  { tech: "git", title: "Commit", detail: "git push origin main" },
  { tech: "githubactions", title: "Build", detail: "GitHub Actions" },
  { tech: "gitlab", title: "Test", detail: "GitLab CI runners" },
  { tech: "docker", title: "Package", detail: "Docker image" },
  { tech: "linux", title: "Deploy", detail: "Linux VPS" },
  { tech: "nginx", title: "Serve", detail: "Nginx · TLS" },
];

const COMMITS = [
  "feat: realtime presence",
  "fix: race in checkout",
  "perf: cache project list",
  "chore: bump node to 22",
  "feat: admin uploads",
  "fix: focus ring on dialog",
];

function hex(n: number) {
  return Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

/** Log line printed when a pushed commit clears each stage. */
export function pipelineLogLine(stage: number, build: number) {
  switch (stage) {
    case 0:
      return `[git] ${hex(7)} ${COMMITS[build % COMMITS.length]}`;
    case 1:
      return `[actions] build #${build} · npm ci && npm run build · ok`;
    case 2:
      return `[gitlab-ci] ${180 + ((build * 37) % 90)} tests passed`;
    case 3:
      return `[docker] image pushed · sha256:${hex(10)}`;
    case 4:
      return `[vps-01] rolling update · healthy`;
    default:
      return `[nginx] reloaded · 200 OK · v1.${build}.0 live`;
  }
}

export const pipelineStore = createStore({ pushes: 0, deploys: 0, build: 140, log: [] as string[] });

export function pushCommit() {
  pipelineStore.set((s) => ({ pushes: s.pushes + 1, build: s.build + 1 }));
}

export function appendPipelineLog(line: string) {
  pipelineStore.set((s) => ({ log: [...s.log, line].slice(-7) }));
}

/* ------------------------------- The Signal ------------------------------- */

export const SIGNAL_LIMITS = { min: 2, max: 10 };

export const signalStore = createStore<{ peers: number; mode: "sfu" | "mesh" }>({ peers: 6, mode: "sfu" });

/** Streams each peer uploads, total links, and per-peer upload at ~1.5 Mbps per 720p stream. */
export function signalStats(peers: number, mode: "sfu" | "mesh") {
  const uplinks = mode === "sfu" ? 1 : peers - 1;
  const links = mode === "sfu" ? peers : (peers * (peers - 1)) / 2;
  return { uplinks, links, upload: (uplinks * 1.5).toFixed(1) };
}

/* ------------------------------ The Interface ----------------------------- */

export const INTERFACE_LAYERS: { tech: TechId; title: string; note: string; color: string }[] = [
  {
    tech: "html5",
    title: "Document",
    note: "Semantic, accessible HTML. Everything else stands on it.",
    color: "#e2e8f0",
  },
  {
    tech: "tailwindcss",
    title: "Style",
    note: "A design system in Tailwind and CSS: spacing, type and colour that stay consistent.",
    color: "#38bdf8",
  },
  {
    tech: "react",
    title: "Components",
    note: "React components with clear boundaries, so features compose instead of colliding.",
    color: "#61dafb",
  },
  {
    tech: "nextdotjs",
    title: "Data",
    note: "Server rendering and typed data with Next.js and TypeScript, from the API to the pixel.",
    color: "#a78bfa",
  },
  {
    tech: "javascript",
    title: "Interaction",
    note: "Motion, focus and feedback: the layer people actually feel.",
    color: "#4ade80",
  },
];

export const interfaceStore = createStore({ exploded: true, active: -1 });

export function resetRealmStores() {
  pipelineStore.reset();
  signalStore.reset();
  interfaceStore.reset();
}

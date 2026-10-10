"use client";

import { TECH_BY_ID } from "~/lib/tech";
import { ARTIFACTS, type Artifact } from "../realms/artifacts";
import { exitRealm } from "../realms/enter";
import {
  INTERFACE_LAYERS,
  interfaceStore,
  pipelineStore,
  pushCommit,
  SIGNAL_LIMITS,
  signalStats,
  signalStore,
  useRealmStore,
} from "../realms/realmData";
import { Scramble } from "./Scramble";

const STORY: Record<Artifact["id"], { story: string; hint: string }> = {
  pipeline: {
    story:
      "Every commit I ship takes the same road: built by GitHub Actions or GitLab CI, tested, packed into a Docker image, rolled onto a Linux VPS and served through Nginx. Teams deploy daily without holding their breath.",
    hint: "Click any station or push a commit",
  },
  signal: {
    story:
      "Live rooms don't scale peer to peer. With a selective forwarding unit, each person sends one stream and LiveKit fans it out to everyone else. I self-host it on VPS infrastructure for live audio and video.",
    hint: "Click the hub to add a peer, a peer to remove it",
  },
  interface: {
    story:
      "Good interfaces are built in layers: semantic HTML, a Tailwind design system, React components, typed data from Next.js, and the interaction people actually feel on top.",
    hint: "Hover a layer to read it, click to assemble",
  },
};

const label = "font-mono text-[10px] uppercase tracking-[0.25em] text-white/55";
const button =
  "border border-aurora/70 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-white transition hover:bg-aurora hover:text-night";

function PipelineControls() {
  const { deploys, build, log } = useRealmStore(pipelineStore);
  return (
    <>
      <div className="flex items-end justify-between">
        <div>
          <p className={label}>Deploys shipped</p>
          <p className="font-[family-name:var(--font-display)] text-4xl text-white">{deploys}</p>
        </div>
        <p className={label}>Build #{build}</p>
      </div>
      <button type="button" onClick={pushCommit} className={`${button} mt-4 w-full`}>
        Push a commit →
      </button>
      <div
        className="mt-4 flex h-24 flex-col justify-end overflow-hidden border border-white/10 bg-black/40 p-3 font-mono text-[10px] leading-relaxed text-aurora-soft md:h-40 md:text-[11px]"
        aria-live="polite"
      >
        {log.length === 0 ? <p className="text-white/40">$ waiting for a push…</p> : null}
        {log.map((line, i) => (
          <p key={`${i}-${line}`} className="truncate">
            {line}
          </p>
        ))}
      </div>
    </>
  );
}

function SignalControls() {
  const { peers, mode } = useRealmStore(signalStore);
  const stats = signalStats(peers, mode);
  const setPeers = (n: number) =>
    signalStore.set({ peers: Math.min(SIGNAL_LIMITS.max, Math.max(SIGNAL_LIMITS.min, n)) });
  return (
    <>
      <p className={label}>Topology</p>
      <div className="mt-2 grid grid-cols-2 border border-white/15">
        {(["sfu", "mesh"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => signalStore.set({ mode: m })}
            className={`py-2 font-mono text-[11px] uppercase tracking-[0.22em] transition ${
              mode === m ? "bg-aurora text-night" : "text-white/70 hover:text-white"
            }`}
          >
            {m === "sfu" ? "SFU" : "Mesh"}
          </button>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <p className={label}>Peers in the room</p>
        <div className="flex items-center gap-3 font-mono text-sm">
          <button
            type="button"
            aria-label="Remove a peer"
            onClick={() => setPeers(peers - 1)}
            disabled={peers <= SIGNAL_LIMITS.min}
            className="size-7 border border-white/25 transition hover:border-aurora disabled:opacity-30"
          >
            −
          </button>
          <span className="w-5 text-center">{peers}</span>
          <button
            type="button"
            aria-label="Add a peer"
            onClick={() => setPeers(peers + 1)}
            disabled={peers >= SIGNAL_LIMITS.max}
            className="size-7 border border-white/25 transition hover:border-aurora disabled:opacity-30"
          >
            +
          </button>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
        <div>
          <dt className={label}>Sent / peer</dt>
          <dd className="mt-1 font-mono text-lg text-white">{stats.uplinks}</dd>
        </div>
        <div>
          <dt className={label}>Links</dt>
          <dd className="mt-1 font-mono text-lg text-white">{stats.links}</dd>
        </div>
        <div>
          <dt className={label}>Upload</dt>
          <dd className={`mt-1 font-mono text-lg ${mode === "mesh" && peers > 5 ? "text-borealis" : "text-white"}`}>
            {stats.upload}
            <span className="text-[10px] text-white/50"> Mbps</span>
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-xs leading-relaxed text-white/65">
        {mode === "sfu"
          ? "Each peer uploads once; the SFU forwards only what every subscriber needs."
          : "Every peer uploads to every other peer. Past a handful of people, upload links collapse."}
      </p>
    </>
  );
}

function InterfaceControls() {
  const { exploded, active } = useRealmStore(interfaceStore);
  const layer = INTERFACE_LAYERS[active];
  return (
    <>
      <button
        type="button"
        onClick={() => interfaceStore.set({ exploded: !exploded })}
        className={`${button} w-full`}
      >
        {exploded ? "Assemble the stack" : "Explode the stack"}
      </button>
      <ul className="mt-4 flex flex-col-reverse gap-1">
        {INTERFACE_LAYERS.map((l, i) => (
          <li key={l.tech}>
            <button
              type="button"
              onMouseEnter={() => interfaceStore.set({ active: i })}
              onMouseLeave={() => interfaceStore.set({ active: -1 })}
              onFocus={() => interfaceStore.set({ active: i })}
              onBlur={() => interfaceStore.set({ active: -1 })}
              className={`flex w-full items-center gap-3 border px-3 py-2 text-left transition ${
                active === i ? "border-white/40 bg-white/10" : "border-transparent hover:border-white/15"
              }`}
            >
              <span className="size-2 rounded-full" style={{ background: l.color }} />
              <span className="font-mono text-[10px] text-white/45">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-sm text-white">{l.title}</span>
              <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.15em] text-white/50">
                {TECH_BY_ID[l.tech].title}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 min-h-10 text-xs leading-relaxed text-white/70">
        {layer ? layer.note : "Five layers, one page. Hover one to read it."}
      </p>
    </>
  );
}

/** Story, controls and the way home for the realm currently open. */
export function RealmHud({ index }: { index: number }) {
  const artifact = ARTIFACTS[index];
  if (!artifact) return null;
  const { story, hint } = STORY[artifact.id];
  const pad = String(index + 1).padStart(2, "0");

  return (
    <div className="hud-text pointer-events-none fixed inset-0 z-[40] text-white">
      <header className="animate-hud-in absolute left-5 right-5 top-5 [animation-delay:0.5s] md:left-10 md:right-auto md:top-10 md:max-w-md">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-aurora">
          {`${artifact.code} // ${artifact.tag}`}
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-4xl leading-none tracking-tight md:text-6xl">
          <Scramble text={artifact.name} active duration={1200} />
        </h2>
        <p className="mt-4 hidden text-sm leading-relaxed text-white/75 md:block">{story}</p>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.25em] text-white/45">
          Realm {pad} / {String(ARTIFACTS.length).padStart(2, "0")} · {hint}
        </p>
      </header>

      <aside className="animate-hud-in pointer-events-auto absolute bottom-20 left-4 right-4 [animation-delay:0.8s] md:bottom-auto md:left-auto md:right-10 md:top-10 md:w-[22rem]">
        <div className="glass-panel p-5">
          {artifact.id === "pipeline" ? <PipelineControls /> : null}
          {artifact.id === "signal" ? <SignalControls /> : null}
          {artifact.id === "interface" ? <InterfaceControls /> : null}
        </div>
      </aside>

      <footer className="animate-hud-in pointer-events-auto absolute bottom-5 left-4 flex items-center gap-5 [animation-delay:1s] md:bottom-10 md:left-10">
        <button type="button" onClick={exitRealm} className={button}>
          ↩ Return to the north
        </button>
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.25em] text-white/45 md:inline">
          Esc · drag to orbit · scroll to zoom
        </span>
      </footer>
    </div>
  );
}

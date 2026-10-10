"use client";

import { useEffect, useRef, useState } from "react";
import { site } from "~/lib/site";

const CELLS = 24;
const FILL = "=+=#+==+";
const MIN_DURATION = 1800;

export function Loader({
  ready,
  onEnter,
}: {
  ready: boolean;
  onEnter: (withSound: boolean) => void;
}) {
  const [progress, setProgress] = useState(0);
  const [tick, setTick] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  const readyRef = useRef(ready);
  readyRef.current = ready;

  useEffect(() => {
    const start = performance.now();
    let frame = 0;
    let value = 0;
    const loop = (now: number) => {
      const elapsed = now - start;
      const cap =
        readyRef.current && elapsed > MIN_DURATION ? 100 : Math.min(92, (elapsed / MIN_DURATION) * 85);
      value += (cap - value) * 0.08;
      if (cap === 100 && value > 99.5) value = 100;
      setProgress(value);
      setTick(Math.floor(now / 90));
      if (value < 100) frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  const done = progress >= 100;
  const filled = Math.round((progress / 100) * CELLS);
  const bar = Array.from({ length: CELLS }, (_, i) =>
    i < filled ? FILL[(i + (done ? 0 : tick)) % FILL.length] : "-",
  ).join("");

  const enter = (withSound: boolean) => {
    setLeaving(true);
    onEnter(withSound);
    window.setTimeout(() => setGone(true), 1400);
  };

  if (gone) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-night font-mono text-white transition-opacity duration-[1300ms] ease-out hud-text ${
        leaving ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="absolute left-6 top-6 text-xs leading-relaxed md:left-10 md:top-10">
        <p className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight md:text-4xl">
          {site.shortName.toUpperCase()}
        </p>
        <p className="mt-2 text-aurora">{"// Lighting the lanterns"}</p>
      </div>

      <p className="text-sm tracking-[0.2em] text-aurora md:text-base">{bar}</p>
      <p className="mt-3 text-xs opacity-80">{String(Math.floor(progress)).padStart(3, "0")}%</p>

      <div
        className={`mt-10 flex flex-col items-center gap-3 text-xs transition-all duration-700 sm:flex-row sm:gap-6 ${
          done ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
        }`}
      >
        <button
          type="button"
          onClick={() => enter(true)}
          className="border border-aurora/70 px-5 py-2.5 uppercase tracking-[0.25em] transition hover:bg-aurora hover:text-night"
        >
          [ Enter with sound ]
        </button>
        <button
          type="button"
          onClick={() => enter(false)}
          className="px-3 py-2.5 uppercase tracking-[0.25em] opacity-75 transition hover:opacity-100"
        >
          Enter in silence
        </button>
      </div>

      <p className="absolute bottom-6 text-[11px] opacity-70 md:bottom-10">
        Best experienced with sound on, on a desktop.
      </p>
    </div>
  );
}

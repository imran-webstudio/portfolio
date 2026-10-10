"use client";

import { useEffect, useRef } from "react";
import { TECH_BY_ID } from "~/lib/tech";
import { live, selectTech, useChapter, useSelectedTech } from "../store";
import { TechGlyph } from "./TechGlyph";

const CARD_WIDTH = 256;
const GAP = 56;

export function TechCard() {
  const id = useSelectedTech();
  const { index } = useChapter();
  const card = useRef<HTMLDivElement>(null);
  const openedAt = useRef(index);

  useEffect(() => {
    if (id) openedAt.current = index;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (id && index !== openedAt.current) selectTech(null);
  }, [id, index]);

  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") selectTech(null);
    };
    window.addEventListener("keydown", onKey);
    let frame = 0;
    const tick = () => {
      const el = card.current;
      if (el && window.innerWidth >= 768) {
        const { x, y, visible } = live.selectedScreen;
        const right = x + GAP + CARD_WIDTH < window.innerWidth - 24;
        const left = right ? x + GAP : x - GAP - CARD_WIDTH;
        const top = Math.min(window.innerHeight - el.offsetHeight - 24, Math.max(24, y - el.offsetHeight / 2));
        el.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`;
        el.style.opacity = visible ? "1" : "0";
      } else if (el) {
        el.style.transform = "";
        el.style.opacity = "1";
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey);
    };
  }, [id]);

  const tech = id ? TECH_BY_ID[id] : null;
  if (!tech) return null;

  return (
    <div
      ref={card}
      role="dialog"
      aria-label={`${tech.title} details`}
      className="hud-text pointer-events-auto fixed inset-x-4 bottom-24 z-30 text-white transition-opacity duration-300 md:inset-x-auto md:bottom-auto md:left-0 md:top-0 md:w-64"
    >
      <div key={tech.id} className="glass-panel animate-hud-in p-5">
        <div className="flex items-start justify-between gap-4">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center border border-white/15 bg-white/5"
            style={{ boxShadow: `inset 0 0 18px ${tech.color}33` }}
          >
            <TechGlyph id={tech.id} className="h-7 w-7" color={tech.color} />
          </span>
          <button
            type="button"
            onClick={() => selectTech(null)}
            className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/60 transition hover:text-white"
            aria-label="Close"
          >
            Close ×
          </button>
        </div>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.25em] text-aurora">{tech.group}</p>
        <h3 className="mt-1 font-[family-name:var(--font-display)] text-2xl leading-tight">{tech.title}</h3>
        <p className="mt-3 flex items-baseline gap-2 font-mono">
          <span className="text-3xl text-white">{tech.years}</span>
          <span className="text-[11px] uppercase tracking-[0.2em] text-white/60">years</span>
        </p>
        <p className="mt-3 text-sm leading-relaxed text-white/80">{tech.note}</p>
      </div>
    </div>
  );
}

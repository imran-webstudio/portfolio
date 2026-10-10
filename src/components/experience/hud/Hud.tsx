"use client";

import { useEffect, useRef, useState } from "react";
import { site } from "~/lib/site";
import { explain } from "../guide";
import { CHAPTER_COUNT, CHAPTERS, live, SEGMENT_COUNT, useChapter } from "../store";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function Hud({
  soundOn,
  onToggleSound,
  autoDrift,
  onToggleDrift,
  onNavigate,
}: {
  soundOn: boolean;
  onToggleSound: () => void;
  autoDrift: boolean;
  onToggleDrift: () => void;
  onNavigate: (index: number) => void;
}) {
  const { index } = useChapter();
  const bar = useRef<HTMLDivElement>(null);
  const drifting = useRef<HTMLParagraphElement>(null);
  const hint = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let frame = 0;
    let shown = false;
    const tick = () => {
      if (bar.current) {
        const p = Math.min(1, live.chapter / SEGMENT_COUNT);
        bar.current.style.transform = `scaleX(${p})`;
      }
      if (live.autoplay !== shown && drifting.current && hint.current) {
        shown = live.autoplay;
        drifting.current.style.opacity = shown ? "0.9" : "0";
        hint.current.style.opacity = shown ? "0" : "1";
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const go = (i: number) => {
    setMenuOpen(false);
    onNavigate(i);
  };

  return (
    <div className="hud-text pointer-events-none fixed inset-0 z-20 font-mono text-[11px] leading-relaxed text-white md:text-xs">
      <div className="pointer-events-auto absolute left-5 top-5 md:left-10 md:top-9">
        <button
          type="button"
          onClick={() => go(0)}
          className="text-left"
          {...explain(site.name, `${site.role}, ${site.years} years in. Click to fly back to the start.`)}
        >
          <span className="block font-[family-name:var(--font-display)] text-3xl font-bold leading-none tracking-tight md:text-[2.6rem]">
            {site.shortName.toUpperCase()}
          </span>
        </button>
        <p className="mt-3 text-aurora">{`// ${site.role}`}</p>
        <p className="hidden opacity-85 sm:block">
          {site.location} — {site.years} yrs
        </p>
      </div>

      <nav className="pointer-events-auto absolute right-5 top-5 text-right md:right-10 md:top-9" aria-label="Chapters">
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="mb-2 tracking-wide md:pointer-events-none"
          aria-expanded={menuOpen}
        >
          {"////// Index"} <span className="md:hidden">[{menuOpen ? "–" : "+"}]</span>
        </button>
        <ul className={`${menuOpen ? "block" : "hidden"} space-y-0.5 md:block`}>
          {CHAPTERS.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => go(i)}
                className={`transition-opacity hover:opacity-100 ${i === index ? "opacity-100" : "opacity-55"}`}
                {...explain(`${pad(i)} · ${c.title}`, i === index ? `You are here. ${c.line}` : `${c.line} Click and I'll take you there.`)}
              >
                {i === index ? <span className="text-aurora">▸ </span> : ""}
                {c.label} <span className="opacity-70">{pad(i)}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="pointer-events-auto absolute bottom-5 left-5 md:bottom-9 md:left-10">
        <div className="relative mb-3 h-5 whitespace-nowrap">
          <div ref={hint} className="transition-opacity duration-700">
            <p className={`transition-opacity duration-700 ${index === 0 ? "opacity-90" : "opacity-0"}`}>
              Scroll to discover. It never ends.
            </p>
          </div>
          <p
            ref={drifting}
            className="absolute inset-0 text-aurora opacity-0 transition-opacity duration-700"
            aria-hidden
          >
            ◉ Drifting · move to take over
          </p>
        </div>
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={onToggleSound}
            className="flex items-center gap-2"
            aria-pressed={soundOn}
            {...explain("Sound", soundOn ? "Wind, a low drone and soft clicks. Click to mute." : "Turn on the wind and drone of the northern night.")}
          >
            <span className="flex h-3 items-end gap-[2px]" aria-hidden>
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`w-[2px] bg-aurora ${soundOn ? "sound-bar" : "h-[2px]"}`}
                  style={soundOn ? { animationDelay: `${i * 0.15}s` } : undefined}
                />
              ))}
            </span>
            Sound: {soundOn ? "On" : "Off"}
          </button>
          <button
            type="button"
            onClick={onToggleDrift}
            className="flex items-center gap-2"
            aria-pressed={autoDrift}
            {...explain("Drift", "Rest for a few seconds and the journey scrolls on its own. Move to take over.")}
          >
            <span
              className={`size-[7px] rounded-full border border-aurora ${autoDrift ? "bg-aurora" : ""}`}
              aria-hidden
            />
            Drift: {autoDrift ? "On" : "Off"}
          </button>
        </div>
      </div>

      <div className="absolute bottom-5 right-5 w-28 text-right md:bottom-9 md:right-10 md:w-40">
        <p>
          <span className="opacity-70">{CHAPTERS[index]?.label}</span>{" "}
          {pad(index)} / {pad(CHAPTER_COUNT - 1)}
        </p>
        <div className="mt-2 h-px w-full bg-white/25">
          <div ref={bar} className="h-px origin-left bg-aurora" style={{ transform: "scaleX(0)" }} />
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { blendAt, CHAPTERS, live } from "../store";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Film-style title card that rises through each chapter transition, carrying the story between sections. */
export function StoryCaption() {
  const root = useRef<HTMLDivElement>(null);
  const [caption, setCaption] = useState({ index: -1, loop: false });

  useEffect(() => {
    let frame = 0;
    let shown = -1;
    let shownLoop = false;
    const tick = () => {
      const b = blendAt(live.chapter);
      const moving = b.from !== b.to && live.realm.phase === "idle";
      const loop = b.to < b.from;
      if (moving && (b.to !== shown || loop !== shownLoop)) {
        shown = b.to;
        shownLoop = loop;
        setCaption({ index: b.to, loop });
      }
      const o = moving ? Math.min(1, Math.max(0, Math.sin(Math.PI * b.raw) * 1.6 - 0.3)) : 0;
      const el = root.current;
      if (el) {
        el.style.opacity = o.toFixed(3);
        el.style.transform = `translate3d(0, ${((0.5 - b.raw) * 36).toFixed(1)}px, 0)`;
        el.style.filter = o > 0.98 ? "none" : `blur(${((1 - o) * 10).toFixed(1)}px)`;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const chapter = CHAPTERS[caption.index];

  return (
    <div className="pointer-events-none fixed inset-0 z-[12] flex items-center justify-center px-6" aria-hidden>
      <div ref={root} className="hud-text max-w-4xl text-center opacity-0">
        {chapter ? (
          <>
            <p className="font-mono text-[11px] uppercase tracking-[0.4em] text-aurora">
              {caption.loop ? "↻ The night begins again" : `Chapter ${pad(caption.index)}`} — {chapter.title}
            </p>
            <p className="mt-5 font-[family-name:var(--font-display)] text-3xl leading-[1.05] tracking-tight text-white md:text-6xl">
              {chapter.line}
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}

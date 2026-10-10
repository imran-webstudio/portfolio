"use client";

import { useEffect, useState } from "react";

const GLYPHS = "!<>-_\\/[]{}=+*^?#░▒▓01";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Decodes `text` from random glyphs whenever `active` turns true. */
export function useScramble(text: string, active: boolean, duration = 900) {
  const [display, setDisplay] = useState(text);

  useEffect(() => {
    if (!active || prefersReducedMotion()) {
      setDisplay(text);
      return;
    }
    const start = performance.now();
    const thresholds = Array.from(text, (_, i) => (i / Math.max(1, text.length)) * 0.65 + Math.random() * 0.35);
    let frame = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      let out = "";
      for (let i = 0; i < text.length; i++) {
        const ch = text[i]!;
        if (ch === " " || p >= (thresholds[i] ?? 1)) out += ch;
        else out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      setDisplay(out);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [text, active, duration]);

  return display;
}

export function Scramble({
  text,
  active,
  duration,
  className,
}: {
  text: string;
  active: boolean;
  duration?: number;
  className?: string;
}) {
  const display = useScramble(text, active, duration);
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>{display}</span>
    </span>
  );
}

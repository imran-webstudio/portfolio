"use client";

import { useEffect, useRef, useState } from "react";
import { CHAPTER_TIPS, clearGuideTopic, guide, setGuideTopic, useGuideTopic, type GuideTopic } from "../guide";
import { CHAPTERS, useChapter } from "../store";

const TIP_MS = 6000;

function topicFor(el: HTMLElement): GuideTopic {
  const title = el.dataset.guide ?? "";
  const body = el.dataset.guideText ?? "";
  return { key: `dom:${title}|${body}`, title, body };
}

/**
 * The guide's speech bubble. Follows the i's head on screen, says what the hovered thing is,
 * and offers a short tip on arriving in each chapter.
 */
export function GuideBubble() {
  const topic = useGuideTopic();
  const { index, settled } = useChapter();
  const [tip, setTip] = useState<GuideTopic | null>(null);
  // Keeps the last words on screen while the bubble fades out.
  const [shown, setShown] = useState<GuideTopic | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const tail = useRef<HTMLSpanElement>(null);
  const tipFor = useRef(-1);
  const tipTimer = useRef(0);

  const active = topic ?? tip;
  if (active && active !== shown) setShown(active);

  useEffect(() => {
    if (!settled || tipFor.current === index) return;
    tipFor.current = index;
    const body = CHAPTER_TIPS[index];
    window.clearTimeout(tipTimer.current);
    setTip(body ? { key: `tip:${index}`, title: CHAPTERS[index]?.title ?? "", body } : null);
    tipTimer.current = window.setTimeout(() => setTip(null), TIP_MS);
  }, [index, settled]);

  useEffect(() => () => window.clearTimeout(tipTimer.current), []);

  // Anything marked with `data-guide` sends the guide over to explain it.
  useEffect(() => {
    let current: HTMLElement | null = null;
    const point = (el: HTMLElement | null) => {
      if (el === current) return;
      if (current) clearGuideTopic(topicFor(current).key);
      current = el;
      guide.element = el;
      if (el) setGuideTopic(topicFor(el));
    };
    const find = (target: EventTarget | null) =>
      target instanceof Element ? target.closest<HTMLElement>("[data-guide]") : null;
    const onOver = (e: PointerEvent) => point(find(e.target));
    const onOut = (e: PointerEvent) => {
      if (!e.relatedTarget) point(null);
    };
    const onFocusIn = (e: FocusEvent) => point(find(e.target));
    const onFocusOut = (e: FocusEvent) => {
      if (!e.relatedTarget) point(null);
    };
    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointerout", onOut);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);

    let frame = 0;
    const tick = () => {
      // Panels go inert as chapters change under a still pointer; stop explaining what has gone.
      if (current && (!current.isConnected || current.closest("[inert]"))) point(null);
      const el = box.current;
      if (el) {
        const { x, y, h, visible } = guide.screen;
        const w = window.innerWidth;
        const bw = el.offsetWidth;
        const bh = el.offsetHeight;
        const gap = h * 0.15 + 16;
        const below = y - gap - bh < 64;
        let left = Math.min(w - bw - 12, Math.max(12, x - bw / 2));
        let top = below ? y + gap : y - gap - bh;
        // Never cover the thing being explained: step aside, away from it.
        const r = (current?.closest("nav, .glass-panel") ?? current)?.getBoundingClientRect();
        const covers = r && left < r.right && left + bw > r.left && top < r.bottom && top + bh > r.top;
        if (r && covers) {
          left = r.left + r.width / 2 > x ? x - bw - 28 : x + 28;
          left = Math.min(w - bw - 12, Math.max(12, left));
          top = Math.min(window.innerHeight - bh - 12, Math.max(12, y - bh / 2));
        }
        el.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`;
        el.dataset.visible = visible ? "1" : "0";
        if (tail.current) {
          tail.current.style.left = `${Math.min(bw - 18, Math.max(10, x - left - 4))}px`;
          tail.current.dataset.below = below ? "1" : "0";
          tail.current.style.visibility = covers ? "hidden" : "";
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      guide.element = null;
    };
  }, []);

  return (
    <div
      ref={box}
      aria-live="polite"
      className="guide-bubble pointer-events-none fixed left-0 top-0 z-30 w-max max-w-[16rem]"
      data-open={active ? "1" : "0"}
    >
      <div className="glass-panel relative px-3.5 py-2.5">
        <span ref={tail} className="guide-tail" aria-hidden />
        {shown ? (
          <div key={shown.key} className="animate-hud-in">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-aurora">{shown.title}</p>
            <p className="mt-1 text-[13px] leading-snug text-white/90">{shown.body}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

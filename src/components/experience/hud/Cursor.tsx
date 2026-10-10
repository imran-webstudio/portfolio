"use client";

import { useEffect, useRef } from "react";
import { live } from "../store";

export function Cursor() {
  const ring = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("custom-cursor");
    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const current = { ...target };
    let hovering = false;
    let visible = false;
    let frame = 0;

    const onMove = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      if (!visible) {
        visible = true;
        current.x = target.x;
        current.y = target.y;
        ring.current?.classList.remove("opacity-0");
        dot.current?.classList.remove("opacity-0");
      }
      const el = e.target instanceof Element ? e.target.closest("a, button, [data-cursor]") : null;
      if (!!el !== hovering) {
        hovering = !!el;
        ring.current?.classList.toggle("is-hover", hovering);
      }
    };
    const onLeave = () => {
      visible = false;
      ring.current?.classList.add("opacity-0");
      dot.current?.classList.add("opacity-0");
    };
    const onDown = () => ring.current?.classList.add("is-down");
    const onUp = () => ring.current?.classList.remove("is-down");

    let overLogo = false;
    const tick = () => {
      const over = !!live.hoverTech || live.hoverArtifact >= 0 || live.hoverRealm || live.hoverKeeper;
      if (over !== overLogo) {
        overLogo = over;
        ring.current?.classList.toggle("is-logo", overLogo);
      }
      current.x += (target.x - current.x) * 0.18;
      current.y += (target.y - current.y) * 0.18;
      if (ring.current) ring.current.style.transform = `translate3d(${current.x}px, ${current.y}px, 0)`;
      if (dot.current) dot.current.style.transform = `translate3d(${target.x}px, ${target.y}px, 0)`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    window.addEventListener("pointermove", onMove);
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    return () => {
      cancelAnimationFrame(frame);
      root.classList.remove("custom-cursor");
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[100]" aria-hidden>
      <div ref={ring} className="cursor-ring opacity-0">
        <span />
      </div>
      <div ref={dot} className="cursor-dot opacity-0" />
    </div>
  );
}

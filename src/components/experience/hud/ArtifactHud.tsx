"use client";

import { useEffect, useRef } from "react";
import { explain } from "../guide";
import { ARTIFACTS } from "../realms/artifacts";
import { enterRealm } from "../realms/enter";
import { blendAt, clamp01, live, stopProgress, useChapter, useRealm } from "../store";
import { Scramble } from "./Scramble";

const CONTACT = 5;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function place(el: HTMLElement | null, x: number, y: number, opacity: number) {
  if (!el) return;
  el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
  el.style.opacity = opacity.toFixed(3);
}

function line(el: SVGLineElement | null, x1: number, y1: number, x2: number, y2: number) {
  if (!el) return;
  el.setAttribute("x1", x1.toFixed(1));
  el.setAttribute("y1", y1.toFixed(1));
  el.setAttribute("x2", x2.toFixed(1));
  el.setAttribute("y2", y2.toFixed(1));
}

/**
 * Survey-style annotations around the focused artifact crystal (name, readouts,
 * "click to explore"), plus small tags under every crystal in the overview.
 */
export function ArtifactHud() {
  const { index, settled, sub } = useChapter();
  const realm = useRealm();
  const idle = realm.phase === "idle";
  const inContact = index === CONTACT && settled && idle;
  const focus = inContact && sub < ARTIFACTS.length ? sub : -1;
  const overview = inContact && sub === ARTIFACTS.length;
  const artifact = ARTIFACTS[focus];

  const label = useRef<HTMLDivElement>(null);
  const temp = useRef<HTMLDivElement>(null);
  const tempA = useRef<HTMLSpanElement>(null);
  const tempB = useRef<HTMLSpanElement>(null);
  const date = useRef<HTMLButtonElement>(null);
  const lineA = useRef<SVGLineElement>(null);
  const lineB = useRef<SVGLineElement>(null);
  const lineC = useRef<SVGLineElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const tags = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    let frame = 0;
    let lastJitter = 0;
    const tick = (now: number) => {
      const b = blendAt(live.chapter);
      const { k, glide } = stopProgress(b.u, ARTIFACTS.length + 1);
      const w = window.innerWidth;
      const h = window.innerHeight;
      const mobile = w < 768;
      const s = focus >= 0 ? live.artifactScreens[focus] : undefined;
      const vis = s?.visible && k === focus ? clamp01(1 - glide * 3) : 0;

      if (s && vis > 0) {
        const r = Math.max(40, s.r);
        const lw = label.current?.offsetWidth ?? 160;
        const lx = Math.min(w - lw - 12, Math.max(12, s.x - r * 1.35 - lw * 0.6));
        const ly = Math.max(mobile ? 96 : 24, s.y - r * 1.75);
        place(label.current, lx, ly, vis);
        const tx = Math.min(w - 120, s.x + r * 0.85);
        const ty = s.y - r * 1.1;
        place(temp.current, tx, ty, mobile ? 0 : vis);
        const dw = date.current?.offsetWidth ?? 150;
        const dx = Math.min(w - dw - 12, s.x + r * 0.6);
        const dy = Math.min(h - 80, s.y + r * 1.15);
        place(date.current, dx, dy, vis);
        line(lineA.current, lx + lw * 0.2, ly + 40, s.x - r * 0.35, s.y - r * 0.8);
        line(lineB.current, dx + dw, dy + 40, dx, dy + 40);
        line(lineC.current, dx, dy + 40, s.x + r * 0.25, s.y + r * 0.7);
        if (svg.current) svg.current.style.opacity = vis.toFixed(3);

        if (now - lastJitter > 140 && artifact) {
          lastJitter = now;
          const [a, c] = artifact.temp;
          if (tempA.current) tempA.current.textContent = (a + (Math.random() - 0.5) * 0.4).toFixed(2);
          if (tempB.current) tempB.current.textContent = `${c >= 0 ? "+" : ""}${(c + (Math.random() - 0.5) * 0.4).toFixed(2)}`;
        }
      } else {
        place(label.current, -999, -999, 0);
        place(temp.current, -999, -999, 0);
        place(date.current, -999, -999, 0);
        if (svg.current) svg.current.style.opacity = "0";
      }

      for (let i = 0; i < ARTIFACTS.length; i++) {
        const t = tags.current[i];
        const si = live.artifactScreens[i];
        if (!t) continue;
        if (overview && si?.visible) {
          const tw = t.offsetWidth;
          place(t, si.x - tw / 2, si.y + Math.max(30, si.r) * 1.55, 1);
          t.style.pointerEvents = "auto";
        } else {
          place(t, -999, -999, 0);
          t.style.pointerEvents = "none";
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [focus, overview, artifact]);

  return (
    <div className="hud-text pointer-events-none fixed inset-0 z-[11] font-mono text-[11px] uppercase text-white md:text-xs">
      {ARTIFACTS.map((a, i) => (
        <p
          key={a.id}
          aria-hidden
          className={`artifact-echo absolute left-[4vw] top-[18vh] transition-opacity duration-1000 ${
            focus === i ? "opacity-100" : "opacity-0"
          }`}
        >
          {a.echo}
        </p>
      ))}
      {ARTIFACTS.map((a, i) => (
        <p
          key={`${a.id}-low`}
          aria-hidden
          className={`artifact-echo absolute bottom-[14vh] right-[3vw] transition-opacity duration-1000 ${
            focus === i ? "opacity-60" : "opacity-0"
          }`}
        >
          {a.tag}
        </p>
      ))}

      <svg ref={svg} className="absolute inset-0 h-full w-full opacity-0" aria-hidden>
        <line ref={lineA} stroke="rgba(255,255,255,0.75)" strokeWidth="1" />
        <line ref={lineB} stroke="rgba(255,255,255,0.75)" strokeWidth="1" />
        <line ref={lineC} stroke="rgba(255,255,255,0.75)" strokeWidth="1" />
      </svg>

      <div ref={label} className="absolute left-0 top-0 opacity-0">
        {artifact ? (
          <div className="border-b border-white/70 pb-2 leading-snug tracking-[0.12em]">
            <Scramble text={`PORTFOLIO_${artifact.code}`} active={focus >= 0} duration={700} />
            <br />
            <Scramble text={artifact.name.toUpperCase()} active={focus >= 0} duration={900} className="text-aurora" />
          </div>
        ) : null}
      </div>

      <div ref={temp} className="absolute left-0 top-0 text-right text-[10px] leading-snug tracking-[0.12em] opacity-0">
        TEMP <span ref={tempA} />
        <br />
        <span ref={tempB} />
      </div>

      <button
        ref={date}
        type="button"
        onClick={() => focus >= 0 && enterRealm(focus)}
        className="pointer-events-auto absolute left-0 top-0 border-b border-white/70 pb-2 text-right leading-snug tracking-[0.12em] opacity-0 transition-colors hover:text-aurora"
        {...(artifact ? explain(artifact.name, artifact.blurb) : {})}
      >
        {artifact ? artifact.date : ""}
        <br />
        Click to explore
      </button>

      {ARTIFACTS.map((a, i) => (
        <button
          key={a.id}
          ref={(el) => {
            tags.current[i] = el;
          }}
          type="button"
          onClick={() => enterRealm(i)}
          {...explain(a.name, `${a.tag}. ${a.blurb}`)}
          className="absolute left-0 top-0 whitespace-nowrap border border-white/25 bg-night/40 px-2.5 py-1 tracking-[0.18em] opacity-0 backdrop-blur-sm transition-colors hover:border-aurora hover:text-aurora"
        >
          {pad(i + 1)} · {a.name} ↗
        </button>
      ))}

      <div
        className={`absolute inset-x-4 bottom-24 transition-all duration-700 md:bottom-24 md:left-10 md:right-auto md:w-[24rem] ${
          artifact ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
        }`}
        inert={!artifact}
      >
        {artifact ? (
          <div key={artifact.id} className="glass-panel animate-hud-in p-5 normal-case">
            <p className="text-[11px] uppercase tracking-[0.25em] text-aurora">
              05 // Beyond the Aurora — {pad(focus + 1)} / {pad(ARTIFACTS.length)}
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-2xl text-white">{artifact.name}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-white/60">{artifact.tag}</p>
            <p className="mt-3 font-sans text-sm leading-relaxed text-white/80">{artifact.blurb}</p>
            <button
              type="button"
              onClick={() => enterRealm(focus)}
              {...explain("Enter the realm", `Step inside ${artifact.name}. Esc or the back button brings you home.`)}
              className="mt-4 border border-aurora/70 px-4 py-2 text-[11px] uppercase tracking-[0.25em] transition hover:bg-aurora hover:text-night"
            >
              Enter the realm ↗
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

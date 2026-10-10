"use client";

import { useEffect, useRef } from "react";
import { ARTIFACTS } from "../realms/artifacts";
import { exitRealm } from "../realms/enter";
import { resetRealmStores } from "../realms/realmData";
import { clamp01, live, REALM_TIMING, setRealm, useRealm, type RealmPhase } from "../store";
import { RealmHud } from "./RealmHud";
import { Scramble } from "./Scramble";

const RETURN_FADE = 900;

function easeIn(x: number) {
  return x * x * x;
}

function easeOut(x: number) {
  return 1 - Math.pow(1 - x, 3);
}

/** Drives the realm phase timeline and draws the flash that hides the swap between worlds. */
export function RealmOverlay() {
  const realm = useRealm();
  const vignette = useRef<HTMLDivElement>(null);
  const cover = useRef<HTMLDivElement>(null);
  const caption = useRef<HTMLDivElement>(null);
  const lastIndex = useRef(0);
  if (realm.index >= 0) lastIndex.current = realm.index;
  const artifact = ARTIFACTS[lastIndex.current] ?? ARTIFACTS[0]!;

  useEffect(() => {
    if (realm.phase === "enter") {
      const t = window.setTimeout(() => setRealm(realm.index, "inside"), REALM_TIMING.dive);
      return () => window.clearTimeout(t);
    }
    if (realm.phase === "exit") {
      const t = window.setTimeout(() => {
        resetRealmStores();
        setRealm(-1, "idle");
      }, REALM_TIMING.exitCover);
      return () => window.clearTimeout(t);
    }
    if (realm.phase === "inside") {
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") exitRealm();
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [realm]);

  useEffect(() => {
    let frame = 0;
    let phase: RealmPhase = live.realm.phase;
    let previous: RealmPhase = "idle";
    let origin = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const tick = (now: number) => {
      const r = live.realm;
      if (r.phase !== phase) {
        previous = phase;
        phase = r.phase;
        if (phase === "enter") {
          const s = live.artifactScreens[r.index];
          origin = s?.visible ? { x: s.x, y: s.y } : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        }
      }
      const e = now - r.since;
      let iris = 0;
      let opacity = 0;
      let dark = 0;
      let text = 0;
      if (phase === "enter") {
        dark = clamp01(e / REALM_TIMING.coverAt) * 0.75;
        const p = clamp01((e - REALM_TIMING.coverAt) / (REALM_TIMING.dive - REALM_TIMING.coverAt));
        iris = easeIn(p);
        opacity = p > 0 ? 1 : 0;
        text = clamp01((e - 200) / 400);
      } else if (phase === "inside") {
        iris = 1;
        opacity = 1 - easeOut(clamp01(e / REALM_TIMING.reveal));
        text = opacity;
      } else if (phase === "exit") {
        iris = 1;
        opacity = easeOut(clamp01(e / REALM_TIMING.exitCover));
        text = opacity;
      } else if (previous === "exit") {
        iris = 1;
        opacity = 1 - easeOut(clamp01(e / RETURN_FADE));
        text = 0;
      }

      const v = vignette.current;
      if (v) v.style.opacity = dark.toFixed(3);
      const c = cover.current;
      if (c) {
        c.style.opacity = opacity.toFixed(3);
        c.style.visibility = opacity > 0.001 ? "visible" : "hidden";
        c.style.setProperty("--rx", `${origin.x.toFixed(0)}px`);
        c.style.setProperty("--ry", `${origin.y.toFixed(0)}px`);
        c.style.clipPath = iris >= 1 ? "none" : `circle(${(iris * 150).toFixed(2)}% at ${origin.x.toFixed(0)}px ${origin.y.toFixed(0)}px)`;
      }
      const t = caption.current;
      if (t) {
        t.style.opacity = text.toFixed(3);
        t.style.letterSpacing = `${(0.6 - text * 0.25).toFixed(3)}em`;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const inside = realm.phase === "inside" || realm.phase === "exit";
  const leaving = realm.phase === "exit";

  return (
    <>
      {inside ? <RealmHud index={realm.index} /> : null}
      <div ref={vignette} aria-hidden className="realm-vignette pointer-events-none fixed inset-0 z-[60] opacity-0" />
      <div
        ref={cover}
        aria-hidden
        className="realm-cover pointer-events-none invisible fixed inset-0 z-[70] opacity-0"
        style={{ ["--accent" as string]: artifact.accent }}
      >
        <div
          ref={caption}
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center font-mono text-xs uppercase text-white mix-blend-difference md:text-sm"
        >
          <Scramble
            text={leaving ? "Returning // The north" : `Entering // ${artifact.name}`}
            active={realm.phase === "enter" || leaving}
            duration={700}
          />
        </div>
      </div>
    </>
  );
}

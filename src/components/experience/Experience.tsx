"use client";

import Lenis from "lenis";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { site } from "~/lib/site";
import { matchTech, type TechId } from "~/lib/tech";
import { api } from "~/trpc/react";
import { ambient } from "./audio";
import { ArtifactHud } from "./hud/ArtifactHud";
import { Cursor } from "./hud/Cursor";
import { GuideBubble } from "./hud/GuideBubble";
import { Hud } from "./hud/Hud";
import { Loader } from "./hud/Loader";
import { Panels } from "./hud/Panels";
import { RealmOverlay } from "./hud/RealmOverlay";
import { StoryCaption } from "./hud/StoryCaption";
import { TechCard } from "./hud/TechCard";
import { ARTIFACTS } from "./realms/artifacts";
import {
  CHAPTERS,
  getSelectedTech,
  live,
  SEGMENT_COUNT,
  TRANSITION,
  updateChapter,
  useChapter,
  useRealm,
} from "./store";

const Scene = dynamic(() => import("./scene/Scene"), { ssr: false });

/** Idle time before the page starts drifting on its own, and the drift speed in viewport heights per second. */
const DRIFT_IDLE_MS = 5000;
const DRIFT_SPEED = 0.085;

const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

type Mode = { lite: boolean; fineCursor: boolean; reducedMotion: boolean; coarse: boolean };

function detectMode(): Mode {
  const params = new URLSearchParams(window.location.search);
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = window.innerWidth < 768;
  const weak = (navigator.hardwareConcurrency ?? 8) <= 4;
  const lite = params.has("full") ? false : params.has("lite") || coarse || small || weak;
  return {
    lite,
    coarse,
    fineCursor: window.matchMedia("(pointer: fine)").matches && !lite,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  };
}

function sectionHeights(projectCount: number) {
  return [
    160,
    220,
    220,
    120 + site.experience.length * 80,
    120 + Math.max(1, projectCount) * 85,
    120 + (ARTIFACTS.length + 1) * 85,
    // The loop: Contact dissolves back into Nightfall, and the page wraps to the top.
    220,
  ];
}

export function Experience() {
  const projectsQuery = api.project.list.useQuery();
  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);
  const projectTech = useMemo(
    () => projects.map((p) => p.tech.map(matchTech).filter((id): id is TechId => id !== null)),
    [projects],
  );
  const [mode, setMode] = useState<Mode | null>(null);
  const [ready, setReady] = useState(false);
  const [entered, setEntered] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [autoDrift, setAutoDrift] = useState(true);
  const sections = useRef<(HTMLElement | null)[]>([]);
  const lenis = useRef<Lenis | null>(null);
  const { index, sub } = useChapter();
  const realm = useRealm();
  const realmIdle = realm.phase === "idle";
  const enteredRef = useRef(entered);
  enteredRef.current = entered;
  const driftRef = useRef(autoDrift);
  driftRef.current = autoDrift;

  live.counts.experience = site.experience.length;
  live.counts.projects = Math.max(1, projects.length);
  live.counts.contact = ARTIFACTS.length + 1;

  useEffect(() => {
    setMode(detectMode());
    const fallback = window.setTimeout(() => setReady(true), 8000);
    return () => window.clearTimeout(fallback);
  }, []);

  const measure = useCallback(() => {
    const y = window.scrollY;
    const els = sections.current;
    let i = 0;
    for (let k = 0; k < els.length; k++) {
      const el = els[k];
      if (el && el.offsetTop <= y + 1) i = k;
    }
    const el = els[i];
    if (!el) return;
    const last = i === SEGMENT_COUNT - 1;
    const span = last ? Math.max(1, el.offsetHeight - window.innerHeight) : el.offsetHeight;
    const local = Math.min(1, Math.max(0, (y - el.offsetTop) / span));
    updateChapter(i + local);
  }, []);

  useEffect(() => {
    if (!mode) return;
    let lastActivity = performance.now();
    const onActivity = () => {
      lastActivity = performance.now();
    };
    const onPointer = (e: PointerEvent) => {
      live.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      live.pointerY = -((e.clientY / window.innerHeight) * 2 - 1);
      onActivity();
    };
    const activity = ["pointerdown", "wheel", "keydown", "touchstart"] as const;
    window.addEventListener("pointermove", onPointer);
    activity.forEach((type) => window.addEventListener(type, onActivity, { passive: true }));
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);

    let frame = 0;
    if (!mode.reducedMotion) {
      const instance = new Lenis({
        lerp: 0.085,
        wheelMultiplier: 0.85,
        touchMultiplier: 1.4,
        infinite: true,
        syncTouch: mode.coarse,
      });
      instance.on("scroll", (l: Lenis) => {
        measure();
        live.velocity = l.velocity;
        ambient.setIntensity(l.velocity);
      });
      if (!enteredRef.current) instance.stop();
      lenis.current = instance;

      let last = 0;
      let speed = 0;
      let position = 0;
      const raf = (time: number) => {
        const dt = last ? Math.min(0.05, (time - last) / 1000) : 0;
        last = time;
        const want =
          driftRef.current &&
          enteredRef.current &&
          !instance.isStopped &&
          live.realm.phase === "idle" &&
          !getSelectedTech() &&
          !document.hidden &&
          time - lastActivity > DRIFT_IDLE_MS;
        if (want && (!live.autoplay || Math.abs(instance.scroll - position) > 2)) position = instance.scroll;
        live.autoplay = want;
        instance.raf(time);
        if (want) {
          speed += (DRIFT_SPEED * window.innerHeight - speed) * Math.min(1, dt * 0.6);
          // Tracked here rather than read back from Lenis, which snaps to whole pixels on every immediate jump.
          position += speed * dt;
          if (instance.limit > 0) position %= instance.limit;
          instance.scrollTo(position, { immediate: true });
          live.velocity = speed * dt;
          ambient.setIntensity(live.velocity);
        } else {
          speed = 0;
        }
        frame = requestAnimationFrame(raf);
      };
      frame = requestAnimationFrame(raf);
    }
    measure();

    return () => {
      cancelAnimationFrame(frame);
      live.autoplay = false;
      lenis.current?.destroy();
      lenis.current = null;
      window.removeEventListener("pointermove", onPointer);
      activity.forEach((type) => window.removeEventListener(type, onActivity));
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [mode, measure]);

  useEffect(() => {
    measure();
  }, [projects.length, measure]);

  useEffect(() => {
    const root = document.documentElement;
    if (entered) {
      root.classList.remove("scroll-locked");
      lenis.current?.start();
    } else {
      window.scrollTo(0, 0);
      root.classList.add("scroll-locked");
    }
    return () => root.classList.remove("scroll-locked");
  }, [entered]);

  useEffect(() => {
    if (!entered) return;
    if (realmIdle) lenis.current?.start();
    else lenis.current?.stop();
  }, [realmIdle, entered]);

  const lastIndex = useRef(index);
  useEffect(() => {
    if (lastIndex.current !== index) ambient.whoosh();
    lastIndex.current = index;
  }, [index]);

  const lastSub = useRef(sub);
  useEffect(() => {
    if (lastSub.current !== sub) ambient.blip(660 + sub * 110);
    lastSub.current = sub;
  }, [sub]);

  const enter = (withSound: boolean) => {
    setEntered(true);
    if (withSound) {
      void ambient.enable();
      setSoundOn(true);
    }
  };

  const toggleSound = () => {
    if (soundOn) {
      ambient.disable();
      setSoundOn(false);
    } else {
      void ambient.enable();
      setSoundOn(true);
    }
  };

  const navigate = (i: number) => {
    const el = sections.current[i];
    if (!el) return;
    const target = i === 0 ? 0 : el.offsetTop + el.offsetHeight * TRANSITION * 1.05;
    ambient.blip(990);
    const l = lenis.current;
    if (!l) {
      window.scrollTo({ top: target });
      return;
    }
    // Lenis takes the short way round the loop, so measure the same distance it will travel.
    let distance = Math.abs(target - l.scroll);
    if (l.limit > 0) distance = Math.min(distance, l.limit - distance);
    // Long enough that the logo glide — the second half of the flight — lasts about two seconds.
    const screens = distance / Math.max(1, window.innerHeight);
    const duration = Math.min(12, Math.max(4.8, screens * 2.05));
    l.scrollTo(target, { duration, easing: easeInOutSine });
  };

  const heights = sectionHeights(projects.length);

  return (
    <main className="relative">
      {mode ? (
        <Scene lite={mode.lite} projectTech={projectTech} onReady={() => setReady(true)} />
      ) : null}

      <div aria-hidden>
        {heights.map((h, i) => (
          <section
            key={CHAPTERS[i]?.id ?? "loop"}
            id={CHAPTERS[i]?.id ?? "loop"}
            ref={(el) => {
              sections.current[i] = el;
            }}
            style={{ height: `${h}vh` }}
          />
        ))}
      </div>

      <div
        inert={!realmIdle}
        className={`transition-opacity duration-500 ${realmIdle ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <Panels
          projects={projects}
          projectsLoading={projectsQuery.isLoading}
          projectsError={projectsQuery.isError}
        />
        <StoryCaption />
        <ArtifactHud />
        <TechCard />
        <Hud
          soundOn={soundOn}
          onToggleSound={toggleSound}
          autoDrift={autoDrift}
          onToggleDrift={() => setAutoDrift((d) => !d)}
          onNavigate={navigate}
        />
        <GuideBubble />
      </div>
      <RealmOverlay />
      {mode?.fineCursor ? <Cursor /> : null}
      <Loader ready={ready} onEnter={enter} />
    </main>
  );
}

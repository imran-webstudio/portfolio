"use client";

import type { ReactNode } from "react";
import { site } from "~/lib/site";
import { matchTech, TECH_BY_ID, type TechId } from "~/lib/tech";
import type { RouterOutputs } from "~/trpc/react";
import { explain } from "../guide";
import { ARTIFACTS } from "../realms/artifacts";
import { shardSide } from "../scene/config";
import { live, selectTech, useChapter } from "../store";
import { Scramble } from "./Scramble";
import { TechGlyph } from "./TechGlyph";

type Project = RouterOutputs["project"]["list"][number];

const SAFE_AREA = "md:top-36 md:bottom-20 md:flex md:items-center";

const POSITIONS = {
  left: `${SAFE_AREA} md:left-10 md:right-auto md:w-[27rem]`,
  right: `${SAFE_AREA} md:right-10 md:left-auto md:w-[27rem]`,
  center: `${SAFE_AREA} md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-[44rem]`,
  bottom: "md:bottom-6 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-[46rem]",
} as const;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

const NOTES = new Map<TechId, string>(site.stack.flatMap((g) => g.items.map((item) => [item.id, item.note] as const)));

function noteFor(id: TechId) {
  return NOTES.get(id) ?? TECH_BY_ID[id].title + ".";
}

function Panel({
  visible,
  position,
  glass = true,
  children,
}: {
  visible: boolean;
  position: keyof typeof POSITIONS;
  glass?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`absolute inset-x-4 bottom-24 ${POSITIONS[position]}`}>
      <div
        inert={!visible}
        className={`w-full transition-all duration-700 ease-out md:max-h-full ${
          visible
            ? "pointer-events-auto translate-y-0 opacity-100 blur-0"
            : "pointer-events-none translate-y-5 opacity-0 blur-[6px]"
        } ${glass ? "glass-panel hud-scroll max-h-[55vh] overflow-x-hidden overflow-y-auto p-5 md:p-6" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}

function Label({ index, text, active }: { index: number; text: string; active: boolean }) {
  return (
    <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.25em] text-aurora">
      <Scramble text={`${pad(index)} // ${text}`} active={active} duration={600} />
    </p>
  );
}

function Heading({ text, active, className = "" }: { text: string; active: boolean; className?: string }) {
  return (
    <h2
      className={`font-[family-name:var(--font-display)] text-2xl leading-tight tracking-tight text-white md:text-[1.8rem] ${className}`}
    >
      <Scramble text={text} active={active} duration={1100} />
    </h2>
  );
}

export function Panels({
  projects,
  projectsLoading,
  projectsError,
}: {
  projects: Project[];
  projectsLoading: boolean;
  projectsError: boolean;
}) {
  const { index, settled, sub } = useChapter();
  const on = (i: number) => index === i && settled;

  const experience = site.experience[Math.min(sub, site.experience.length - 1)];
  const contact = on(5) && sub === ARTIFACTS.length;

  return (
    <div className="hud-text pointer-events-none fixed inset-0 z-10 text-white">
      <Panel visible={on(0)} position="right" glass={false}>
        <div className="font-mono text-[11px] leading-relaxed md:text-right md:text-xs">
          <h1 className="sr-only">
            {site.name} — {site.role}
          </h1>
          <p className="mb-2 tracking-wide text-aurora">{"////// 00 — Nightfall"}</p>
          <p className="max-w-[19rem] opacity-90 md:ml-auto">
            In the long northern night, every product starts as a small light. I build the systems that
            keep it burning: React, Nest.js and TypeScript, from first commit to production.
          </p>
        </div>
      </Panel>

      <Panel visible={on(1)} position="right">
        <Label index={1} text="About — The Keeper" active={on(1)} />
        <Heading text="Building reliable products from concept to production." active={on(1)} />
        <p className="mt-4 text-sm leading-relaxed text-white/80">{site.summary}</p>
        <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-white/15 pt-5 font-mono text-[11px]">
          <div {...explain("Experience", `${site.years} years building with ${site.tagline}.`)}>
            <dt className="text-white/55">Experience</dt>
            <dd className="mt-1 text-base text-white">{site.years} yrs</dd>
          </div>
          <div {...explain("Based in", `${site.location}. Open to full-stack roles and collaborative builds.`)}>
            <dt className="text-white/55">Based in</dt>
            <dd className="mt-1 text-white">{site.location}</dd>
          </div>
          <div {...explain("Also known as", `${site.resumeName} is the name on his résumé.`)}>
            <dt className="text-white/55">Also known as</dt>
            <dd className="mt-1 text-white">{site.resumeName}</dd>
          </div>
        </dl>
      </Panel>

      <Panel visible={on(2)} position="left">
        <Label index={2} text="Skills — The Toolkit" active={on(2)} />
        <Heading text="A stack tuned for full-stack delivery." active={on(2)} />
        <p className="mt-2 font-mono text-[11px] text-white/55">Click any logo for details.</p>
        <div className="mt-4 space-y-3 font-mono text-[11px]">
          {site.stack.map(({ group, items }) => (
            <div key={group}>
              <p className="mb-1.5 uppercase tracking-[0.2em] text-aurora/80">{group}</p>
              <ul className="flex flex-wrap gap-1.5">
                {items.map(({ id, years, note }) => (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => selectTech(id)}
                      {...explain(TECH_BY_ID[id].title, `${note} ${years} years. Click for the full card.`)}
                      onMouseEnter={() => (live.highlightTech = id)}
                      onMouseLeave={() => (live.highlightTech = null)}
                      onFocus={() => (live.highlightTech = id)}
                      onBlur={() => (live.highlightTech = null)}
                      className="flex items-center gap-1.5 border border-white/20 px-2 py-1 text-white/90 transition hover:border-aurora/70 hover:text-white focus-visible:border-aurora"
                    >
                      <TechGlyph id={id} className="h-3.5 w-3.5" color={TECH_BY_ID[id].color} />
                      <Scramble text={TECH_BY_ID[id].title} active={on(2)} duration={700} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Panel>

      <Panel visible={on(3)} position="left">
        <Label index={3} text="Experience — The Ascent" active={on(3)} />
        <ol className="mb-6 flex gap-1.5 font-mono text-[11px]">
          {site.experience.map((e, i) => (
            <li
              key={e.period}
              className={`flex-1 border-t pt-2 transition-colors duration-500 ${
                i === sub ? "border-aurora text-white" : "border-white/25 text-white/45"
              }`}
              {...explain(`Step ${pad(i + 1)}`, `${e.title} at ${e.company}, ${e.period}.`)}
            >
              {pad(i + 1)}
            </li>
          ))}
        </ol>
        {experience ? (
          <div key={sub} className="animate-hud-in">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/60">{experience.period}</p>
            <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl text-white md:text-3xl">
              <Scramble text={experience.title} active={on(3)} />
            </h3>
            <p className="mt-1 font-mono text-xs text-white/70">@ {experience.company}</p>
            <ul className="mt-4 space-y-2 text-sm leading-relaxed text-white/80">
              {experience.bullets.map((b) => (
                <li key={b} className="flex gap-2">
                  <span className="mt-[0.55em] h-px w-3 shrink-0 bg-aurora/60" />
                  {b}
                </li>
              ))}
            </ul>
            <ul className="mt-5 flex flex-wrap gap-2 border-t border-white/15 pt-4" aria-label="Stack">
              {experience.stack.map((id) => (
                <li key={id} {...explain(TECH_BY_ID[id].title, `${noteFor(id)} Used in this role.`)}>
                  <TechGlyph id={id} className="h-4 w-4" color={TECH_BY_ID[id].color} />
                  <span className="sr-only">{TECH_BY_ID[id].title}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Panel>

      {projects.length === 0 ? (
        <Panel visible={on(4)} position="left">
          <Label index={4} text="Projects — The Path" active={on(4)} />
          <Heading
            text={projectsLoading ? "Loading showcase…" : projectsError ? "Showcase offline." : "No projects yet."}
            active={on(4)}
          />
          <p className="mt-4 text-sm text-white/70">
            {projectsError
              ? "The projects could not be loaded right now."
              : "Showcase work is managed from the admin dashboard."}
          </p>
        </Panel>
      ) : (
        projects.map((p, i) => {
          const visible = on(4) && sub === i;
          return (
            <Panel key={p.id} visible={visible} position={shardSide(i) > 0 ? "left" : "right"}>
              <Label index={4} text={`Projects — ${pad(i + 1)} / ${pad(projects.length)}`} active={visible} />
              {p.featured ? (
                <span className="mb-3 inline-block border border-white/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.25em]">
                  Featured
                </span>
              ) : null}
              <Heading text={p.title} active={visible} />
              {p.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.coverUrl} alt="" className="mt-4 aspect-video w-full object-cover opacity-90" />
              ) : null}
              <p className="mt-4 text-sm leading-relaxed text-white/80">{p.summary}</p>
              <ul className="mt-5 flex flex-wrap gap-1.5 font-mono text-[11px]">
                {p.tech.map((t) => {
                  const id = matchTech(t);
                  return (
                    <li
                      key={t}
                      className="flex items-center gap-1.5 border border-white/20 px-2 py-1 text-white/85"
                      {...explain(t, id ? `${noteFor(id)} Part of ${p.title}.` : `Part of the ${p.title} stack.`)}
                    >
                      {id ? <TechGlyph id={id} className="h-3.5 w-3.5" color={TECH_BY_ID[id].color} /> : null}
                      {t}
                    </li>
                  );
                })}
              </ul>
              {p.liveUrl || p.repoUrl ? (
                <div className="mt-6 flex gap-5 font-mono text-xs uppercase tracking-[0.2em]">
                  {p.liveUrl ? (
                    <a
                      href={p.liveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="hud-link"
                      {...explain("Live", `Opens ${p.title} running in production, in a new tab.`)}
                    >
                      Live ↗
                    </a>
                  ) : null}
                  {p.repoUrl ? (
                    <a
                      href={p.repoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="hud-link"
                      {...explain("Code", `The source of ${p.title}, in a new tab.`)}
                    >
                      Code ↗
                    </a>
                  ) : null}
                </div>
              ) : null}
            </Panel>
          );
        })
      )}

      <Panel visible={contact} position="bottom" glass={false}>
        <div className="text-center">
          <Label index={5} text="Contact — Beyond the Aurora" active={contact} />
          <Heading
            text="Let's build the next release together."
            active={contact}
            className="mx-auto max-w-2xl md:text-4xl"
          />
          <p className="mt-3 text-sm text-white/75">
            Open to full-stack roles, product delivery, and collaborative builds. Or step into a crystal first.
          </p>
          <a
            href={`mailto:${site.email}`}
            className="mt-6 inline-block border border-aurora/70 px-6 py-3 font-mono text-xs uppercase tracking-[0.25em] transition hover:bg-aurora hover:text-night"
            {...explain("Email", "The quickest way to reach Imran. Opens your mail app.")}
          >
            {site.email}
          </a>
          <ul className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 font-mono text-xs">
            <li>
              <a href={site.phoneHref} className="hud-link" {...explain("Phone", "Call or message him directly.")}>
                Phone {site.phone}
              </a>
            </li>
            <li>
              <a
                href={site.github}
                target="_blank"
                rel="noreferrer"
                className="hud-link"
                {...explain("GitHub", "His code and open repositories.")}
              >
                GitHub ↗
              </a>
            </li>
            <li>
              <a
                href={site.linkedin}
                target="_blank"
                rel="noreferrer"
                className="hud-link"
                {...explain("LinkedIn", "His career history and professional profile.")}
              >
                LinkedIn ↗
              </a>
            </li>
            <li>
              <a
                href={site.website}
                target="_blank"
                rel="noreferrer"
                className="hud-link"
                {...explain("Web", "imranwebstudio.me, his studio site.")}
              >
                Web ↗
              </a>
            </li>
          </ul>
          <p className="mt-6 font-mono text-[10px] text-white/45">
            © {new Date().getFullYear()} {site.name}. All rights reserved.
          </p>
        </div>
      </Panel>
    </div>
  );
}

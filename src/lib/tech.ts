import { site } from "./site";
import { TECH_ICONS, type TechIcon, type TechId } from "./tech-icons";

export type { TechId };

export type Tech = TechIcon & {
  id: TechId;
  group: string;
  groupIndex: number;
  years: string;
  note: string;
  /** Brand colour, lifted to near-white when the mark is too dark to read on the night sky. */
  color: string;
};

function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}

export const TECH: Tech[] = site.stack.flatMap((g, groupIndex) =>
  g.items.map((item) => {
    const icon = TECH_ICONS[item.id];
    return {
      ...icon,
      ...item,
      group: g.group,
      groupIndex,
      color: luminance(icon.hex) < 0.3 ? "#f1f5f9" : icon.hex,
    };
  }),
);

export const TECH_BY_ID = Object.fromEntries(TECH.map((t) => [t.id, t])) as Record<TechId, Tech>;

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const ALIASES: Record<string, TechId> = {
  html: "html5",
  css3: "css",
  js: "javascript",
  ts: "typescript",
  reactjs: "react",
  next: "nextdotjs",
  tailwind: "tailwindcss",
  node: "nodedotjs",
  nest: "nestjs",
  expressjs: "express",
  postgres: "postgresql",
  mongo: "mongodb",
  ghactions: "githubactions",
  gitlabci: "gitlab",
  livekitsfu: "livekit",
  caddyserver: "caddy",
  jenkinsci: "jenkins",
};

const LOOKUP = new Map<string, TechId>();
for (const t of TECH) {
  LOOKUP.set(normalize(t.id), t.id);
  LOOKUP.set(normalize(t.title), t.id);
}
for (const [alias, id] of Object.entries(ALIASES)) LOOKUP.set(alias, id);

/** Maps free-form tech labels (e.g. project tags like "Next.js" or "Postgres") to a logo. */
export function matchTech(label: string): TechId | null {
  return LOOKUP.get(normalize(label)) ?? null;
}

import { TECH_ICONS, type TechId } from "~/lib/tech-icons";

export function TechGlyph({ id, className, color = "currentColor" }: { id: TechId; className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path d={TECH_ICONS[id].path} fill={color} fillRule={id === "vps" ? "evenodd" : undefined} />
    </svg>
  );
}

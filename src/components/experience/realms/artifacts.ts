import type { TechId } from "~/lib/tech";

export type Vec3 = [number, number, number];

export type Artifact = {
  id: "pipeline" | "signal" | "interface";
  code: string;
  name: string;
  /** Logo frozen inside the crystal. */
  logo: TechId;
  tag: string;
  date: string;
  temp: [number, number];
  /** Oversized, blurred background word shown behind the crystal. */
  echo: string;
  blurb: string;
  accent: string;
  position: Vec3;
};

export const ARTIFACTS: Artifact[] = [
  {
    id: "pipeline",
    code: "ARTIFACT_01",
    name: "The Pipeline",
    logo: "githubactions",
    tag: "CI/CD · DevOps",
    date: "D 06.2025",
    temp: [21.48, -3.07],
    echo: "CONTINUOUS DELIVERY",
    blurb: "Every commit takes the same road from a push to production. Step inside and send one through.",
    accent: "#3b9cff",
    position: [-5.2, 4.6, 3],
  },
  {
    id: "signal",
    code: "ARTIFACT_02",
    name: "The Signal",
    logo: "livekit",
    tag: "Real-time · LiveKit SFU",
    date: "D 01.2025",
    temp: [35.54, 81.95],
    echo: "SELECTIVE FORWARDING",
    blurb: "Live audio and video, routed through a self-hosted LiveKit SFU. Step inside and watch the streams.",
    accent: "#22d3ee",
    position: [0, 4.6, 3],
  },
  {
    id: "interface",
    code: "ARTIFACT_03",
    name: "The Interface",
    logo: "react",
    tag: "Frontend craft",
    date: "D 03.2024",
    temp: [27.12, 14.6],
    echo: "COMPONENT ARCHITECTURE",
    blurb: "A web page is a stack of layers. Step inside and take one apart.",
    accent: "#61dafb",
    position: [5.2, 4.6, 3],
  },
];

/** Distance the contact camera holds in front of each crystal. */
export const ARTIFACT_VIEW_DISTANCE = 5.9;

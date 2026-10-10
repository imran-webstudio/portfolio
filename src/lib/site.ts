import type { TechId } from "./tech-icons";

export const site = {
  name: "Imran Hossain",
  shortName: "Imran",
  resumeName: "MD Imran",
  role: "Full Stack Developer",
  tagline: "React · Nest.js · TypeScript",
  location: "Dhaka, Bangladesh",
  years: "4.3+",
  email: "imranwebstudio@gmail.com",
  phone: "01799577623",
  phoneHref: "tel:+8801799577623",
  github: "https://github.com/imranwebstudio",
  linkedin: "https://www.linkedin.com/in/myself-imran",
  website: "https://imranwebstudio.me",
  summary:
    "Full-stack developer with 4.3 years of experience building and maintaining web applications using React, Nest.js, and TypeScript. I turn product concepts into production-ready interfaces with a sharp focus on usability, performance, and code quality.",
  /** Shown on the 3D logos' click cards. Years are per-technology estimates; adjust freely. */
  stack: [
    {
      group: "Languages",
      items: [
        { id: "html5", years: "4+", note: "Semantic, accessible markup for every build." },
        { id: "css", years: "4+", note: "Responsive layouts, animation and design systems." },
        { id: "javascript", years: "4+", note: "The language under everything I ship." },
        { id: "typescript", years: "3+", note: "Default for frontend and backend code." },
      ],
    },
    {
      group: "Frontend",
      items: [
        { id: "react", years: "4+", note: "Component architecture and product UIs." },
        { id: "nextdotjs", years: "2+", note: "App Router, server rendering and API routes." },
        { id: "tailwindcss", years: "3+", note: "Utility-first styling at product speed." },
      ],
    },
    {
      group: "Backend",
      items: [
        { id: "nodedotjs", years: "3+", note: "Runtime for APIs, workers and tooling." },
        { id: "nestjs", years: "2+", note: "Modular, typed backend services." },
        { id: "express", years: "3+", note: "Lightweight REST APIs." },
      ],
    },
    {
      group: "Data",
      items: [
        { id: "postgresql", years: "2+", note: "Relational modelling and query tuning." },
        { id: "mongodb", years: "3+", note: "Document stores for fast-moving products." },
        { id: "prisma", years: "2+", note: "Type-safe ORM and migrations." },
      ],
    },
    {
      group: "DevOps",
      items: [
        { id: "docker", years: "2+", note: "Containerised builds and deployments." },
        { id: "linux", years: "3+", note: "Daily driver for servers and tooling." },
        { id: "vps", years: "2+", note: "Provisioning, hardening and hosting on VPS." },
        { id: "nginx", years: "2+", note: "Reverse proxy, TLS and static delivery." },
        { id: "caddy", years: "1+", note: "Reverse proxy with automatic HTTPS." },
      ],
    },
    {
      group: "CI/CD",
      items: [
        { id: "git", years: "4+", note: "Branching strategies and clean history." },
        { id: "github", years: "4+", note: "Code review and collaboration." },
        { id: "githubactions", years: "2+", note: "Build, test and deploy pipelines." },
        { id: "gitlab", years: "1+", note: "GitLab CI pipelines and runners." },
        { id: "jenkins", years: "1+", note: "Jenkins jobs for build and deploy pipelines." },
      ],
    },
    {
      group: "Real-time",
      items: [
        { id: "livekit", years: "1+", note: "Self-hosted LiveKit SFU for audio and video." },
        { id: "webrtc", years: "1+", note: "Peer connections and media streaming." },
      ],
    },
    {
      group: "Site builders",
      items: [
        { id: "shopify", years: "1+", note: "Storefront builds and theme customisation." },
        { id: "wix", years: "1+", note: "Client sites and maintenance." },
        { id: "squarespace", years: "1+", note: "Client sites and maintenance." },
      ],
    },
  ],
  practice: ["Full-stack delivery", "ERP implementation", "CI/CD", "Team leadership", "Problem solving"],
  experience: [
    {
      title: "Manager",
      company: "Softvence IT LTD",
      period: "Jun 2025 – Present",
      bullets: [
        "Manage projects and teams; monitor delivery, test releases, and deploy with CI/CD pipelines.",
        "Plan team execution and unblock backend and frontend logic across the stack.",
        "Run usability testing and resolve production bugs to keep products stable.",
      ],
      stack: ["githubactions", "gitlab", "docker", "linux", "vps", "nginx", "livekit", "webrtc", "nestjs", "nextdotjs"],
    },
    {
      title: "Frontend Developer",
      company: "Softvence IT LTD",
      period: "Sep 2024 – May 2025",
      bullets: [
        "Built and maintained website and application UIs with Wix, Shopify, and Squarespace.",
        "Prioritized user experience across frontend delivery.",
        "Tested for usability and resolved bugs in production sites.",
      ],
      stack: ["shopify", "wix", "squarespace", "html5", "css", "javascript", "tailwindcss"],
    },
    {
      title: "Full Stack Developer",
      company: "Recoz Privet LTD.",
      period: "March 2024 – May 2024",
      bullets: [
        "Developed web interfaces with ReactJS, ExpressJS, and MongoDB.",
        "Supported production and maintenance of live applications.",
        "Tested for usability and fixed bugs under active delivery pressure.",
      ],
      stack: ["react", "express", "mongodb", "nodedotjs", "javascript", "typescript"],
    },
    {
      title: "Backend Developer Intern",
      company: "Recoz Privet LTD.",
      period: "December 2023 – Feb 2024",
      bullets: [
        "Shipped e-commerce features and on-demand bug fixes as a full-stack contributor.",
        "Ran R&D for new features and collaborated on solution choices.",
        "Handled client communication and production support.",
      ],
      stack: ["nodedotjs", "express", "mongodb", "postgresql", "prisma", "git", "github"],
    },
  ],
} as const satisfies {
  [key: string]: unknown;
  stack: readonly { group: string; items: readonly { id: TechId; years: string; note: string }[] }[];
  experience: readonly { [key: string]: unknown; stack: readonly TechId[] }[];
};

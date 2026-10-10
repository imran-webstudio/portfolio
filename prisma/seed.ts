import { PrismaClient } from "../generated/prisma";

const db = new PrismaClient();

const projects = [
  {
    title: "Softvence Delivery Platform",
    summary:
      "Led project delivery, CI/CD, and production maintenance for multi-team web products at Softvence IT — monitoring releases, resolving full-stack issues, and keeping client work shipping on schedule.",
    tech: ["React", "Nest.js", "TypeScript", "Docker", "AWS", "CI/CD"],
    liveUrl: "https://imranwebstudio.me",
    repoUrl: "https://github.com/imranwebstudio",
    coverUrl: "",
    featured: true,
    order: 1,
  },
  {
    title: "Commerce Storefronts",
    summary:
      "Built and maintained client storefronts and marketing sites across Shopify, Wix, and Squarespace — prioritizing usability, performance, and clean handoff for Softvence clients.",
    tech: ["Shopify", "Wix", "Squarespace", "HTML", "CSS", "JavaScript"],
    liveUrl: "",
    repoUrl: "",
    coverUrl: "",
    featured: true,
    order: 2,
  },
  {
    title: "Recoz E-commerce Stack",
    summary:
      "Full-stack e-commerce features and production support with React, Express, and MongoDB — from R&D and client communication as an intern through shipping live interface work as a full-stack developer.",
    tech: ["React", "Express.js", "MongoDB", "JavaScript", "Node.js"],
    liveUrl: "",
    repoUrl: "https://github.com/imranwebstudio",
    coverUrl: "",
    featured: false,
    order: 3,
  },
];

async function main() {
  const count = await db.project.count();
  if (count > 0) {
    console.log(`Seed skipped — ${count} project(s) already exist.`);
    return;
  }

  for (const project of projects) {
    await db.project.create({ data: project });
  }
  console.log(`Seeded ${projects.length} showcase projects.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

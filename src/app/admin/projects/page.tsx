import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";
import { ProjectsTable } from "~/components/admin/ProjectsTable";

export default async function AdminProjectsPage() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const projects = await api.project.list();

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-white">
            Projects
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Create, edit, and delete showcase entries stored in PostgreSQL.
          </p>
        </div>
        <Link
          href="/admin/projects/new"
          className="inline-flex rounded-lg bg-cyan-300 px-3.5 py-2 text-sm font-semibold text-[#041018]"
        >
          New project
        </Link>
      </div>
      <ProjectsTable projects={projects} />
    </div>
  );
}

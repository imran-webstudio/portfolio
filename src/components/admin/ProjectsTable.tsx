"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

type ProjectRow = {
  id: string;
  title: string;
  summary: string;
  tech: string[];
  featured: boolean;
  order: number;
};

export function ProjectsTable({ projects }: { projects: ProjectRow[] }) {
  const router = useRouter();
  const utils = api.useUtils();
  const del = api.project.delete.useMutation({
    onSuccess: async () => {
      await utils.project.list.invalidate();
      router.refresh();
    },
  });

  if (projects.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center">
        <p className="text-white/70">No projects yet.</p>
        <Link
          href="/admin/projects/new"
          className="mt-4 inline-flex rounded-lg bg-cyan-300 px-3 py-2 text-sm font-semibold text-[#041018]"
        >
          Create your first project
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {del.error ? (
        <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {del.error.message}
        </p>
      ) : null}
      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-[0.15em] text-white/40">
            <tr>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Project</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">Tech</th>
              <th className="px-4 py-3 font-medium">Flags</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id} className="border-b border-white/5 last:border-0">
                <td className="px-4 py-4 text-white/50">{project.order}</td>
                <td className="px-4 py-4">
                  <p className="font-medium text-white">{project.title}</p>
                  <p className="mt-1 line-clamp-2 max-w-md text-white/45">{project.summary}</p>
                </td>
                <td className="hidden px-4 py-4 text-white/50 md:table-cell">
                  {project.tech.slice(0, 4).join(", ")}
                  {project.tech.length > 4 ? ` +${project.tech.length - 4}` : ""}
                </td>
                <td className="px-4 py-4">
                  {project.featured ? (
                    <span className="rounded-full bg-cyan-400/15 px-2 py-0.5 text-xs text-cyan-100">
                      Featured
                    </span>
                  ) : (
                    <span className="text-white/30">—</span>
                  )}
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/admin/projects/${project.id}`}
                      className="rounded-lg border border-white/15 px-2.5 py-1 text-xs hover:bg-white/5"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      disabled={del.isPending}
                      className="rounded-lg border border-red-400/30 px-2.5 py-1 text-xs text-red-200 hover:bg-red-500/10 disabled:opacity-50"
                      onClick={() => {
                        if (!confirm(`Delete “${project.title}”?`)) return;
                        del.mutate({ id: project.id });
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

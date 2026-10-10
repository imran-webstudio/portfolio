import { notFound, redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";
import { ProjectForm } from "~/components/admin/ProjectForm";

type Props = { params: Promise<{ id: string }> };

export default async function EditProjectPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const { id } = await params;
  let project;
  try {
    project = await api.project.byId({ id });
  } catch {
    notFound();
  }

  return (
    <div>
      <h1 className="mb-8 font-[family-name:var(--font-display)] text-3xl text-white">
        Edit project
      </h1>
      <ProjectForm mode="edit" initial={project} />
    </div>
  );
}

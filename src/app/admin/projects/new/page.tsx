import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { ProjectForm } from "~/components/admin/ProjectForm";

export default async function NewProjectPage() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  return (
    <div>
      <h1 className="mb-8 font-[family-name:var(--font-display)] text-3xl text-white">
        New project
      </h1>
      <ProjectForm mode="create" />
    </div>
  );
}

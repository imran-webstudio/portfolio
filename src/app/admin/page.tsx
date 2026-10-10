import { redirect } from "next/navigation";
import { auth } from "~/server/auth";

export default async function AdminIndexPage() {
  const session = await auth();
  redirect(session?.user ? "/admin/projects" : "/admin/login");
}

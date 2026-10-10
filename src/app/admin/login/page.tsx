import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { isDevFallbackAuth } from "~/server/auth/config";
import { LoginForm } from "~/components/admin/LoginForm";

export default async function AdminLoginPage() {
  const session = await auth();
  if (session?.user) redirect("/admin/projects");

  return (
    <div className="mx-auto max-w-md pt-10">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-white">
        Sign in
      </h1>
      <p className="mt-2 text-sm text-white/50">
        NextAuth credentials gate for showcase project admin.
      </p>
      <div className="mt-8">
        <LoginForm usingDevFallback={isDevFallbackAuth()} />
      </div>
    </div>
  );
}

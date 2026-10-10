import Link from "next/link";
import { auth } from "~/server/auth";
import { AdminLogout } from "~/components/admin/AdminLogout";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-[#05080d] text-[#e8f4f8]">
      <header className="border-b border-white/10 bg-[#080c12]/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
          <div className="flex items-center gap-6">
            <Link
              href="/admin/projects"
              className="font-[family-name:var(--font-display)] text-white"
            >
              Admin
            </Link>
            {session?.user ? (
              <nav className="flex gap-4 text-sm text-white/55">
                <Link href="/admin/projects" className="hover:text-cyan-200">
                  Projects
                </Link>
                <Link href="/" className="hover:text-cyan-200">
                  View site
                </Link>
              </nav>
            ) : null}
          </div>
          {session?.user ? <AdminLogout /> : null}
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-5 py-10">{children}</div>
    </div>
  );
}

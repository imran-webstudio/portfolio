"use client";

import { signOut } from "next-auth/react";

export function AdminLogout() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/admin/login" })}
      className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/70 hover:border-cyan-300/40 hover:text-cyan-100"
    >
      Log out
    </button>
  );
}

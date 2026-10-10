"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function LoginForm({ usingDevFallback }: { usingDevFallback: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await signIn("credentials", {
      password,
      redirect: false,
    });
    if (result?.error) {
      setError("Invalid password");
      setLoading(false);
      return;
    }
    router.push("/admin/projects");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-sm space-y-5">
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm text-white/70">
          Admin password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="Enter admin password"
          className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-300/50"
        />
      </div>
      {usingDevFallback ? (
        <p className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 px-3 py-2 text-xs text-cyan-100/80">
          Dev fallback active — password is{" "}
          <code className="text-cyan-50">imran-admin</code>. Set{" "}
          <code className="text-cyan-50">ADMIN_PASSWORD</code> in{" "}
          <code className="text-cyan-50">.env</code> to override.
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-cyan-300 px-3 py-2 text-sm font-semibold text-[#041018] disabled:opacity-60"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

type ProjectValues = {
  id?: string;
  title: string;
  summary: string;
  tech: string[];
  liveUrl: string;
  repoUrl: string;
  coverUrl: string;
  featured: boolean;
  order: number;
};

type Props = {
  initial?: ProjectValues;
  mode: "create" | "edit";
};

export function ProjectForm({ initial, mode }: Props) {
  const router = useRouter();
  const utils = api.useUtils();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [tech, setTech] = useState(initial?.tech.join(", ") ?? "");
  const [liveUrl, setLiveUrl] = useState(initial?.liveUrl ?? "");
  const [repoUrl, setRepoUrl] = useState(initial?.repoUrl ?? "");
  const [coverUrl, setCoverUrl] = useState(initial?.coverUrl ?? "");
  const [featured, setFeatured] = useState(initial?.featured ?? false);
  const [order, setOrder] = useState(String(initial?.order ?? 1));
  const [error, setError] = useState<string | null>(null);

  const create = api.project.create.useMutation({
    onSuccess: async () => {
      await utils.project.list.invalidate();
      router.push("/admin/projects");
      router.refresh();
    },
    onError: (err) => setError(err.message),
  });

  const update = api.project.update.useMutation({
    onSuccess: async () => {
      await utils.project.list.invalidate();
      router.push("/admin/projects");
      router.refresh();
    },
    onError: (err) => setError(err.message),
  });

  const saving = create.isPending || update.isPending;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      title,
      summary,
      tech: tech
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      liveUrl,
      repoUrl,
      coverUrl,
      featured,
      order: Number(order) || 1,
    };
    if (mode === "create") {
      create.mutate(payload);
    } else {
      update.mutate({ id: initial!.id!, ...payload });
    }
  }

  const field =
    "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-300/50";

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <label className="text-sm text-white/70" htmlFor="title">
          Title
        </label>
        <input id="title" className={field} value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <label className="text-sm text-white/70" htmlFor="summary">
          Summary
        </label>
        <textarea
          id="summary"
          className={field}
          rows={5}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm text-white/70" htmlFor="tech">
          Tech (comma-separated)
        </label>
        <input id="tech" className={field} value={tech} onChange={(e) => setTech(e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm text-white/70" htmlFor="liveUrl">
            Live URL
          </label>
          <input id="liveUrl" className={field} value={liveUrl} onChange={(e) => setLiveUrl(e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-white/70" htmlFor="repoUrl">
            Repo URL
          </label>
          <input id="repoUrl" className={field} value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm text-white/70" htmlFor="coverUrl">
          Cover image URL
        </label>
        <input id="coverUrl" className={field} value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm text-white/70" htmlFor="order">
            Order
          </label>
          <input
            id="order"
            type="number"
            className={field}
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            min={1}
          />
        </div>
        <label className="flex items-end gap-3 pb-2 text-sm text-white/70">
          <input
            type="checkbox"
            checked={featured}
            onChange={(e) => setFeatured(e.target.checked)}
            className="size-4 accent-cyan-300"
          />
          Featured
        </label>
      </div>
      {error ? (
        <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-[#041018] disabled:opacity-60"
        >
          {saving ? "Saving…" : mode === "create" ? "Create project" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/projects")}
          className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/70"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

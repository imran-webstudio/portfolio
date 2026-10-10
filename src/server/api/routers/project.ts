import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";

const projectInput = z.object({
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(4000),
  tech: z.array(z.string().min(1)).default([]),
  liveUrl: z.string().default(""),
  repoUrl: z.string().default(""),
  coverUrl: z.string().default(""),
  featured: z.boolean().default(false),
  order: z.number().int().default(0),
});

export const projectRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.project.findMany({
      orderBy: [{ order: "asc" }, { title: "asc" }],
    });
  }),

  byId: publicProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.project.findUnique({ where: { id: input.id } });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }
      return project;
    }),

  create: protectedProcedure.input(projectInput).mutation(async ({ ctx, input }) => {
    const max = await ctx.db.project.aggregate({ _max: { order: true } });
    const order = input.order || (max._max.order ?? 0) + 1;
    return ctx.db.project.create({
      data: {
        ...input,
        order,
        tech: input.tech.map((t) => t.trim()).filter(Boolean),
      },
    });
  }),

  update: protectedProcedure
    .input(projectInput.partial().extend({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const existing = await ctx.db.project.findUnique({ where: { id } });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }
      return ctx.db.project.update({
        where: { id },
        data: {
          ...data,
          ...(data.tech
            ? { tech: data.tech.map((t) => t.trim()).filter(Boolean) }
            : {}),
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.db.project.delete({ where: { id: input.id } });
        return { ok: true as const };
      } catch {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }
    }),
});

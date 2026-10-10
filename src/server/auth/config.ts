import { type DefaultSession, type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { env } from "~/env";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

const DEFAULT_ADMIN_PASSWORD = "imran-admin";

export function getAdminPassword(): string {
  return env.ADMIN_PASSWORD?.trim() ?? DEFAULT_ADMIN_PASSWORD;
}

export function isDevFallbackAuth(): boolean {
  return !env.ADMIN_PASSWORD;
}

/**
 * Password-gated admin via Credentials + JWT sessions.
 * Local fallback password is `imran-admin` when ADMIN_PASSWORD is unset.
 */
export const authConfig = {
  trustHost: true,
  providers: [
    Credentials({
      name: "Admin Password",
      credentials: {
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = z
          .object({ password: z.string().min(1) })
          .safeParse(credentials);
        if (!parsed.success) return null;

        if (parsed.data.password !== getAdminPassword()) return null;

        return {
          id: "admin",
          name: "Imran Admin",
          email: "admin@imranwebstudio.local",
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7,
  },
  pages: {
    signIn: "/admin/login",
  },
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        id: (token.id as string | undefined) ?? token.sub ?? "admin",
      },
    }),
  },
} satisfies NextAuthConfig;

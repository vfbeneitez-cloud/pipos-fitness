import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/src/server/db/prisma";
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { z } from "zod";

const GoogleEnvSchema = z.object({
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
});

export function getGoogleOAuthConfig(): { clientId: string; clientSecret: string } | null {
  const parsed = GoogleEnvSchema.safeParse({
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  });
  if (!parsed.success) return null;
  return {
    clientId: parsed.data.GOOGLE_CLIENT_ID,
    clientSecret: parsed.data.GOOGLE_CLIENT_SECRET,
  };
}

function requireAuthEnv() {
  const missing: string[] = [];
  if (!process.env.AUTH_SECRET) missing.push("AUTH_SECRET");
  if (!process.env.AUTH_URL) missing.push("AUTH_URL");
  // GOOGLE_* not required at import time so build passes without them; validated at runtime via getGoogleOAuthConfig()
  if (missing.length) {
    throw new Error(
      `[Auth] Missing env in production: ${missing.join(", ")}. Set them in Vercel → Settings → Environment Variables.`,
    );
  }
  const url = process.env.AUTH_URL as string;
  if (url.endsWith("/")) {
    throw new Error(
      "[Auth] AUTH_URL must not end with a trailing slash (e.g. https://pipos-fitness.vercel.app).",
    );
  }
}
if (process.env.NODE_ENV === "production") requireAuthEnv();

function getProviders(): NextAuthConfig["providers"] {
  const google = getGoogleOAuthConfig();
  return [
    ...(google
      ? [
          Google({
            clientId: google.clientId,
            clientSecret: google.clientSecret,
          }),
        ]
      : []),
  ];
}

export const authConfig = {
  adapter: PrismaAdapter(prisma),
  providers: getProviders(),
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/src/server/db/prisma";
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

function requireAuthEnv() {
  const missing: string[] = [];
  if (!process.env.AUTH_SECRET) missing.push("AUTH_SECRET");
  if (!process.env.AUTH_URL) missing.push("AUTH_URL");
  if (!process.env.GOOGLE_CLIENT_ID) missing.push("GOOGLE_CLIENT_ID");
  if (!process.env.GOOGLE_CLIENT_SECRET) missing.push("GOOGLE_CLIENT_SECRET");
  if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
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

export const authConfig = {
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
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

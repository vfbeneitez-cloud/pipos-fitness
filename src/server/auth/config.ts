import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/src/server/db/prisma";
import type { NextAuthConfig } from "next-auth";
import Email from "next-auth/providers/email";

export const authConfig = {
  adapter: PrismaAdapter(prisma),
  providers: [
    Email({
      from: process.env.EMAIL_FROM ?? "noreply@pipos.local",
      server: {
        host: process.env.EMAIL_SERVER_HOST ?? process.env.SMTP_HOST ?? "localhost",
        port: Number(process.env.EMAIL_SERVER_PORT ?? process.env.SMTP_PORT ?? 587),
        auth: {
          user: process.env.EMAIL_SERVER_USER ?? process.env.SMTP_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD ?? process.env.SMTP_PASSWORD,
        },
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify",
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

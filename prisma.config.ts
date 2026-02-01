import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Fallback dummy URL so prisma generate runs when DATABASE_URL is unset (e.g. Vercel build)
    url: process.env.DATABASE_URL ?? "postgresql://localhost:5432/dummy?schema=public",
  },
});

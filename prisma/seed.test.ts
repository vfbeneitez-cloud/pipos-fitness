import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/src/server/db/prisma";
import { main as seedMain } from "./seed";

const hasDb = Boolean(process.env.DATABASE_URL);
const runDbTests = process.env.RUN_DB_TESTS === "true";

const seedFilePath = path.join(process.cwd(), "data", "exercises.seed.json");
const hasSeedFile = fs.existsSync(seedFilePath);

const shouldRun = runDbTests && hasDb && hasSeedFile;

(shouldRun ? describe.sequential : describe.sequential.skip)("prisma seed (DB)", () => {
  beforeAll(async () => {
    await seedMain();
  }, 120_000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should seed at least 100 exercises", async () => {
    const count = await prisma.exercise.count();
    expect(count).toBeGreaterThanOrEqual(100);
  });

  it("should have coverage per environment", async () => {
    const byEnv = await prisma.exercise.groupBy({
      by: ["environment"],
      _count: { _all: true },
    });

    const map = new Map(byEnv.map((r) => [r.environment, r._count._all]));

    expect(map.get("GYM") ?? 0).toBeGreaterThanOrEqual(15);
    expect(map.get("HOME") ?? 0).toBeGreaterThanOrEqual(15);
    expect(map.get("CALISTHENICS") ?? 0).toBeGreaterThanOrEqual(15);
    expect(map.get("POOL") ?? 0).toBeGreaterThanOrEqual(15);
  });
});

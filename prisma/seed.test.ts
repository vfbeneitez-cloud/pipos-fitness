import { describe, it, expect, beforeAll } from "vitest";
import * as path from "path";
import * as fs from "fs";
import { main } from "./seed";
import { prisma } from "../src/server/db/prisma";

const seedPath = path.join(process.cwd(), "data", "exercises.seed.json");

describe("seed", () => {
  beforeAll(async () => {
    if (!fs.existsSync(seedPath)) {
      throw new Error(
        "data/exercises.seed.json not found; run scripts/generate-exercises-seed.ts first",
      );
    }
    await main();
  }, 60_000);

  it("seeds at least 100 exercises", async () => {
    const count = await prisma.exercise.count();
    expect(count).toBeGreaterThanOrEqual(100);
  });

  it("has at least 15 exercises per environment (GYM, HOME, CALISTHENICS, POOL)", async () => {
    const envs = ["GYM", "HOME", "CALISTHENICS", "POOL"] as const;
    for (const env of envs) {
      const count = await prisma.exercise.count({ where: { environment: env } });
      expect(count).toBeGreaterThanOrEqual(15);
    }
  });
});

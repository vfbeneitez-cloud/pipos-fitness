/* scripts/audit-weekly-plans-trainingjson.ts
 *
 * READ-ONLY audit of WeeklyPlan.trainingJson (JSONB).
 *
 * Outputs:
 * - scanned / invalid counts
 * - counts by reason
 * - a few example rows per reason (without dumping full JSON)
 *
 * Usage:
 *   npx ts-node scripts/audit-weekly-plans-trainingjson.ts
 *
 * Optional env:
 *   TAKE=5000 npx ts-node scripts/audit-weekly-plans-trainingjson.ts
 *   PAGE_SIZE=500 npx ts-node scripts/audit-weekly-plans-trainingjson.ts
 */

import { PrismaClient } from "@prisma/client";
import { validateTrainingBeforePersist } from "../src/server/plan/validateWeeklyPlan";

const prisma = new PrismaClient();

type Reason = string;

function safeSchemaVersion(training: unknown): number | null {
  if (typeof training !== "object" || training === null) return null;
  const sv = (training as Record<string, unknown>).schemaVersion;
  return typeof sv === "number" && Number.isInteger(sv) ? sv : null;
}

function safeSessionsLength(training: unknown): number | null {
  if (typeof training !== "object" || training === null) return null;
  const sessions = (training as Record<string, unknown>).sessions;
  return Array.isArray(sessions) ? sessions.length : null;
}

function asIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function main() {
  const TAKE = (() => {
    const v = process.env.TAKE;
    if (!v) return undefined;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  })();

  const PAGE_SIZE = (() => {
    const v = process.env.PAGE_SIZE;
    const n = Number(v ?? "500");
    return Number.isFinite(n) && n > 0 ? Math.min(n, 5000) : 500;
  })();

  const countsByReason = new Map<Reason, number>();
  const examplesByReason = new Map<Reason, Array<Record<string, unknown>>>();

  let scanned = 0;
  let invalid = 0;

  // Cursor pagination by id (stable and scalable)
  let cursor: { id: string } | undefined;

  while (true) {
    const remaining = TAKE ? TAKE - scanned : undefined;
    const takeNow = remaining !== undefined ? Math.min(PAGE_SIZE, remaining) : PAGE_SIZE;
    if (takeNow <= 0) break;

    const batch = await prisma.weeklyPlan.findMany({
      take: takeNow,
      ...(cursor ? { cursor, skip: 1 } : {}),
      orderBy: { id: "asc" },
      select: {
        id: true,
        userId: true,
        weekStart: true,
        status: true,
        trainingJson: true,
        lastGeneratedAt: true,
      },
    });

    if (batch.length === 0) break;

    for (const row of batch) {
      scanned++;

      const training = row.trainingJson as unknown;
      const vt = validateTrainingBeforePersist(training);

      if (!vt.ok) {
        invalid++;
        const reason = vt.reason || "unknown_reason";

        countsByReason.set(reason, (countsByReason.get(reason) ?? 0) + 1);

        const arr = examplesByReason.get(reason) ?? [];
        if (arr.length < 5) {
          arr.push({
            id: row.id,
            userId: row.userId,
            weekStart: asIsoDate(row.weekStart),
            status: row.status,
            schemaVersion: safeSchemaVersion(training),
            sessionsLength: safeSessionsLength(training),
            lastGeneratedAt: row.lastGeneratedAt ? row.lastGeneratedAt.toISOString() : null,
            quarantineCandidate: true,
          });
          examplesByReason.set(reason, arr);
        }
      }

      if (TAKE && scanned >= TAKE) break;
    }

    cursor = { id: batch[batch.length - 1].id };
    if (TAKE && scanned >= TAKE) break;
  }

  // Output
  const sortedReasons = Array.from(countsByReason.entries()).sort((a, b) => b[1] - a[1]);

  console.log("=== WeeklyPlan.trainingJson audit (READ-ONLY) ===");
  console.log(`Scanned: ${scanned}`);
  console.log(`Invalid: ${invalid}`);
  console.log(`Invalid rate: ${scanned ? ((invalid / scanned) * 100).toFixed(2) : "0.00"}%`);

  console.log("\nCounts by reason:");
  for (const [reason, count] of sortedReasons) {
    console.log(`- ${reason}: ${count}`);
  }

  console.log("\nExamples (up to 5 per reason):");
  for (const [reason] of sortedReasons) {
    console.log(`\n# ${reason}`);
    const ex = examplesByReason.get(reason) ?? [];
    for (const e of ex) console.log(e);
  }

  console.log("\nQuarantine suggestion (READ-ONLY):");
  console.log(
    "- Any row with vt.ok === false is a quarantine candidate.\n" +
      "- Later we can refine policy: e.g. quarantine only invalid_sessions/invalid_shape, but auto-fix sessions_length_exceeds_daysPerWeek, etc.",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

/*
 * Optional SQL (read-only) to pre-filter obvious issues in JSONB.
 * Does NOT replace Zod validation (incomplete); use for quick discovery.
 * Table/column: "WeeklyPlan", trainingJson (JSONB).
 *
 * 2.1 Plans without sessions or sessions not array:
 *   SELECT id, "userId", "weekStart"
 *   FROM "WeeklyPlan"
 *   WHERE (trainingJson ? 'sessions') IS FALSE
 *      OR jsonb_typeof(trainingJson->'sessions') <> 'array';
 *
 * 2.2 schemaVersion different from 1 (if present):
 *   SELECT id, "userId", "weekStart", trainingJson->>'schemaVersion' AS schemaVersion
 *   FROM "WeeklyPlan"
 *   WHERE trainingJson ? 'schemaVersion'
 *     AND (trainingJson->>'schemaVersion') <> '1';
 *
 * 2.3 daysPerWeek less than sessions length (approx):
 *   SELECT id, "userId", "weekStart",
 *          (trainingJson->>'daysPerWeek')::int AS daysPerWeek,
 *          jsonb_array_length(trainingJson->'sessions') AS sessionsLength
 *   FROM "WeeklyPlan"
 *   WHERE (trainingJson ? 'daysPerWeek')
 *     AND (trainingJson ? 'sessions')
 *     AND jsonb_typeof(trainingJson->'sessions') = 'array'
 *     AND (trainingJson->>'daysPerWeek') ~ '^[0-9]+$'
 *     AND jsonb_array_length(trainingJson->'sessions') > (trainingJson->>'daysPerWeek')::int;
 */

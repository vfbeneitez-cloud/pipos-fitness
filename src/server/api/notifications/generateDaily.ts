import { prisma } from "@/src/server/db/prisma";
import { getWeekStart } from "@/src/app/lib/week";
import { getNotificationContext } from "./context";
import { buildDailyNotificationCandidates } from "@/src/core/notifications/rules";

function dayIndexFromDate(d: Date): number {
  const day = d.getUTCDay();
  return day === 0 ? 6 : day - 1;
}

export async function generateDailyNotificationsForUser(
  userId: string,
  runDateUtc: Date,
): Promise<{ created: number }> {
  const dayStr = runDateUtc.toISOString().slice(0, 10);
  const dayStart = new Date(`${dayStr}T00:00:00.000Z`);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
  const todayDayIndex = dayIndexFromDate(runDateUtc);

  const ctx = await getNotificationContext(userId, runDateUtc);

  const plan = await prisma.weeklyPlan.findUnique({
    where: {
      userId_weekStart: {
        userId,
        weekStart: new Date(`${ctx.weekStart}T00:00:00.000Z`),
      },
    },
    select: { trainingJson: true },
  });

  const sessions = (plan?.trainingJson as { sessions?: { dayIndex: number }[] })?.sessions ?? [];
  const todayPlannedSessionExists = sessions.some((s) => s.dayIndex === todayDayIndex);

  const trainingLog = await prisma.trainingLog.findFirst({
    where: {
      userId,
      occurredAt: { gte: dayStart, lt: dayEnd },
      completed: true,
    },
  });
  const todayTrainingCompleted = !!trainingLog;

  const candidates = buildDailyNotificationCandidates({
    today: runDateUtc,
    weekStart: ctx.weekStart,
    goalPercent: ctx.goalPercent,
    nudge: ctx.nudge,
    currentWeekPercent: ctx.currentWeekPercent,
    todayPlannedSessionExists,
    todayTrainingCompleted,
  });

  let created = 0;
  for (const c of candidates) {
    try {
      await prisma.notification.create({
        data: {
          userId,
          type: c.type,
          scopeKey: c.scopeKey,
          title: c.title,
          message: c.message,
          dataJson: c.data ?? undefined,
        },
      });
      created++;
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "P2002") {
        // skip duplicate
      } else {
        throw err;
      }
    }
  }
  return { created };
}

export async function generateDailyNotificationsForAllUsers(
  runDateUtc: Date,
): Promise<{ created: number; scanned: number }> {
  const users = await prisma.user.findMany({
    select: { id: true },
  });

  let created = 0;
  for (const user of users) {
    try {
      const result = await generateDailyNotificationsForUser(user.id, runDateUtc);
      created += result.created;
    } catch {
      continue;
    }
  }
  return { created, scanned: users.length };
}

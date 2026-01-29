import { TrainingEnvironment } from "@prisma/client";

export type TrainingSession = {
  dayIndex: number; // 0..6
  name: string;
  exercises: Array<{
    slug: string;
    name: string;
    sets: number;
    reps: string;
    restSec: number;
  }>;
};

export type WeeklyTrainingPlan = {
  environment: TrainingEnvironment;
  daysPerWeek: number;
  sessionMinutes: number;
  sessions: TrainingSession[];
};

export function generateWeeklyTrainingPlan(args: {
  environment: TrainingEnvironment;
  daysPerWeek: number;
  sessionMinutes: number;
  exercisePool: Array<{ slug: string; name: string }>;
}): WeeklyTrainingPlan {
  const { environment, daysPerWeek, sessionMinutes, exercisePool } = args;

  const days = pickDays(daysPerWeek); // spaced through week
  const sessions: TrainingSession[] = days.map((dayIndex, i) => {
    const picks = pickExercises(exercisePool, 3);
    return {
      dayIndex,
      name: `Session ${i + 1}`,
      exercises: picks.map((e) => ({
        slug: e.slug,
        name: e.name,
        sets: 3,
        reps: "8-12",
        restSec: 90,
      })),
    };
  });

  return { environment, daysPerWeek, sessionMinutes, sessions };
}

function pickDays(daysPerWeek: number): number[] {
  // simple spacing: for 3 days -> [0,2,4], 4 -> [0,2,4,6], etc.
  const clamped = Math.min(Math.max(daysPerWeek, 1), 7);
  if (clamped === 7) return [0,1,2,3,4,5,6];
  const step = Math.floor(7 / clamped);
  const out: number[] = [];
  let d = 0;
  for (let i = 0; i < clamped; i++) {
    out.push(Math.min(d, 6));
    d += step;
  }
  return Array.from(new Set(out)).slice(0, clamped);
}

function pickExercises<T>(pool: T[], n: number): T[] {
  if (pool.length <= n) return pool;
  const copy = [...pool];
  // naive shuffle
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

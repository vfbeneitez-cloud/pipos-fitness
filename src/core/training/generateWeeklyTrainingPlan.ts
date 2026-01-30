export type TrainingEnvironment = "GYM" | "HOME" | "CALISTHENICS" | "POOL" | "MIXED";

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

type ExerciseEntry = { slug: string; name: string };

export function generateWeeklyTrainingPlan(args: {
  environment: TrainingEnvironment;
  daysPerWeek: number;
  sessionMinutes: number;
  exercisePool: ExerciseEntry[];
}): WeeklyTrainingPlan {
  const { environment, daysPerWeek, sessionMinutes, exercisePool } = args;
  const filteredPool = filterPoolByEnvironment(exercisePool, environment);
  const days = pickDays(daysPerWeek);
  const useAlternating = daysPerWeek >= 3 && filteredPool.length >= 6;
  const [poolA, poolB] = useAlternating ? splitPool(filteredPool) : [filteredPool, filteredPool];
  const usedSlugs = new Set<string>();
  const sessions: TrainingSession[] = days.map((dayIndex, i) => {
    const pool = useAlternating ? (i % 2 === 0 ? poolA : poolB) : filteredPool;
    const available = pool.filter((e) => !usedSlugs.has(e.slug));
    const source = available.length >= 3 ? available : pool;
    const picks = pickExercisesNoRepeat(source, 3, usedSlugs);
    return {
      dayIndex,
      name: useAlternating ? (i % 2 === 0 ? "Session A" : "Session B") : `Session ${i + 1}`,
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

function filterPoolByEnvironment(
  pool: ExerciseEntry[],
  environment: TrainingEnvironment,
): ExerciseEntry[] {
  if (environment === "MIXED") return pool;
  return pool;
}

function splitPool<T>(pool: T[]): [T[], T[]] {
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  const mid = Math.ceil(copy.length / 2);
  return [copy.slice(0, mid), copy.slice(mid)];
}

function pickExercisesNoRepeat<T extends ExerciseEntry>(
  pool: T[],
  n: number,
  usedSlugs: Set<string>,
): T[] {
  const available = pool.filter((e) => !usedSlugs.has(e.slug));
  const source = available.length >= n ? available : pool;
  const copy = [...source];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  const picks = copy.slice(0, n);
  picks.forEach((e) => usedSlugs.add(e.slug));
  return picks;
}

function pickDays(daysPerWeek: number): number[] {
  // simple spacing: for 3 days -> [0,2,4], 4 -> [0,2,4,6], etc.
  const clamped = Math.min(Math.max(daysPerWeek, 1), 7);
  if (clamped === 7) return [0, 1, 2, 3, 4, 5, 6];
  const step = Math.floor(7 / clamped);
  const out: number[] = [];
  let d = 0;
  for (let i = 0; i < clamped; i++) {
    out.push(Math.min(d, 6));
    d += step;
  }
  return Array.from(new Set(out)).slice(0, clamped);
}

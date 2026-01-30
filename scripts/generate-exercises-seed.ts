/**
 * One-off: run with npx tsx scripts/generate-exercises-seed.ts to regenerate data/exercises.seed.json
 */
import * as fs from "fs";
import * as path from "path";

const ENVS = ["GYM", "HOME", "CALISTHENICS", "POOL", "MIXED"] as const;
const PER_ENV = 20;

const GYM_NAMES = [
  "Leg Press",
  "Bench Press",
  "Deadlift",
  "Dumbbell Row",
  "Squat",
  "Overhead Press",
  "Lat Pulldown",
  "Cable Fly",
  "Leg Curl",
  "Calf Raise",
  "Barbell Row",
  "Incline Press",
  "Tricep Pushdown",
  "Bicep Curl",
  "Leg Extension",
  "Chest Press",
  "Seated Row",
  "Lateral Raise",
  "Romanian Deadlift",
  "Hack Squat",
];
const HOME_NAMES = [
  "Push-up",
  "Bodyweight Squat",
  "Plank",
  "Lunges",
  "Glute Bridge",
  "Mountain Climber",
  "Burpee",
  "Jumping Jack",
  "Squat Jump",
  "Wall Sit",
  "Crunches",
  "Bicycle Crunch",
  "Superman",
  "Bird Dog",
  "Dead Bug",
  "Hip Thrust",
  "Step-up",
  "Inchworm",
  "Bear Crawl",
  "High Knees",
];
const CALISTHENICS_NAMES = [
  "Pull-up",
  "Push-up",
  "Dip",
  "L-Sit",
  "Handstand",
  "Muscle-up",
  "Pistol Squat",
  "Front Lever",
  "Planche",
  "Back Lever",
  "Hanging Leg Raise",
  "Diamond Push-up",
  "Archer Push-up",
  "Chin-up",
  "Pike Push-up",
  "Hollow Hold",
  "Skin the Cat",
  "Human Flag",
  "Front Roll",
  "Back Roll",
];
const POOL_NAMES = [
  "Freestyle",
  "Backstroke",
  "Breaststroke",
  "Butterfly",
  "Kickboard",
  "Water Tread",
  "Pool Run",
  "Aqua Jog",
  "Sculling",
  "Streamline",
  "Flip Turn",
  "Open Turn",
  "Side Stroke",
  "Elementary Back",
  "Water Polo Drill",
  "Lap Swim",
  "Sprint",
  "Drill Set",
  "Cool Down",
  "Warm Up Swim",
];
const MIXED_NAMES = [
  "Circuit A",
  "Circuit B",
  "HIIT Block",
  "Tabata",
  "AMRAP",
  "EMOM",
  "Chipper",
  "Metcon",
  "WOD",
  "Finisher",
  "Warm-up Set",
  "Cool-down Set",
  "Mobility Block",
  "Stretch Sequence",
  "Recovery Run",
  "Cross Train",
  "Combo Session",
  "Hybrid",
  "Fusion Workout",
  "Mixed Block",
];

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function gen(env: string, names: string[], startIndex: number) {
  return names.map((name, i) => {
    const s = `${env.toLowerCase()}-${slug(name)}-${startIndex + i}`;
    return {
      slug: s,
      name,
      environment: env,
      primaryMuscle: "Full body",
      description: null,
      cues: "Form first.",
      commonMistakes: "Rushing.",
      regressions: null,
      progressions: null,
      media: [{ type: "image", url: `https://example.com/${s}.png` }],
    };
  });
}

const all: ReturnType<typeof gen>[number][] = [];
let idx = 0;
all.push(...gen("GYM", GYM_NAMES, idx));
idx += GYM_NAMES.length;
all.push(...gen("HOME", HOME_NAMES, idx));
idx += HOME_NAMES.length;
all.push(...gen("CALISTHENICS", CALISTHENICS_NAMES, idx));
idx += CALISTHENICS_NAMES.length;
all.push(...gen("POOL", POOL_NAMES, idx));
idx += POOL_NAMES.length;
all.push(...gen("MIXED", MIXED_NAMES, idx));

const outPath = path.join(process.cwd(), "data", "exercises.seed.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(all, null, 2), "utf8");
console.log("Wrote", outPath, "exercises:", all.length);

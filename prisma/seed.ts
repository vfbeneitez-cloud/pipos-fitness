import * as fs from "fs";
import * as path from "path";
import { prisma } from "../src/server/db/prisma";

type SeedMedia = { type: string; url: string; thumbnailUrl?: string };
type SeedExercise = {
  slug: string;
  name: string;
  environment: string;
  primaryMuscle?: string | null;
  description?: string | null;
  cues?: string | null;
  commonMistakes?: string | null;
  regressions?: string | null;
  progressions?: string | null;
  media: SeedMedia[];
};

export async function main() {
  const seedPath = path.join(process.cwd(), "data", "exercises.seed.json");
  let items: SeedExercise[] = [];
  if (fs.existsSync(seedPath)) {
    const raw = fs.readFileSync(seedPath, "utf8");
    items = JSON.parse(raw) as SeedExercise[];
  }

  if (items.length === 0) {
    const defaults: SeedExercise[] = [
      {
        slug: "leg-press-machine",
        name: "Leg Press (Machine)",
        environment: "GYM",
        primaryMuscle: "Quadriceps/Glutes",
        cues: "Feet shoulder-width.",
        commonMistakes: "Locking knees.",
        media: [
          {
            type: "video",
            url: "https://example.com/leg-press.mp4",
            thumbnailUrl: "https://example.com/leg-press.jpg",
          },
        ],
      },
      {
        slug: "push-up",
        name: "Push-up",
        environment: "CALISTHENICS",
        primaryMuscle: "Chest/Triceps",
        cues: "Body straight.",
        commonMistakes: "Hips sagging.",
        media: [{ type: "image", url: "https://example.com/push-up.png" }],
      },
      {
        slug: "bodyweight-squat",
        name: "Bodyweight Squat",
        environment: "HOME",
        primaryMuscle: "Legs/Glutes",
        cues: "Knees track toes.",
        commonMistakes: "Heels lifting.",
        media: [{ type: "image", url: "https://example.com/squat.png" }],
      },
      {
        slug: "freestyle-swim",
        name: "Freestyle Swim",
        environment: "POOL",
        primaryMuscle: "Full body",
        cues: "Long body line.",
        commonMistakes: "Head too high.",
        media: [
          {
            type: "video",
            url: "https://example.com/freestyle.mp4",
            thumbnailUrl: "https://example.com/freestyle.jpg",
          },
        ],
      },
    ];
    items = defaults;
  }

  let exerciseCount = 0;
  let mediaCount = 0;

  for (const ex of items) {
    const { media, ...data } = ex;
    const exercise = await prisma.exercise.upsert({
      where: { slug: ex.slug },
      update: {
        name: data.name,
        environment: data.environment as
          | "GYM"
          | "HOME"
          | "CALISTHENICS"
          | "POOL"
          | "MIXED"
          | "ESTIRAMIENTOS",
        primaryMuscle: data.primaryMuscle ?? null,
        description: data.description ?? null,
        cues: data.cues ?? null,
        commonMistakes: data.commonMistakes ?? null,
        regressions: data.regressions ?? null,
        progressions: data.progressions ?? null,
      },
      create: {
        slug: data.slug,
        name: data.name,
        environment: data.environment as
          | "GYM"
          | "HOME"
          | "CALISTHENICS"
          | "POOL"
          | "MIXED"
          | "ESTIRAMIENTOS",
        primaryMuscle: data.primaryMuscle ?? null,
        description: data.description ?? null,
        cues: data.cues ?? null,
        commonMistakes: data.commonMistakes ?? null,
        regressions: data.regressions ?? null,
        progressions: data.progressions ?? null,
      },
    });
    exerciseCount += 1;

    await prisma.mediaAsset.deleteMany({ where: { exerciseId: exercise.id } });
    for (const m of media) {
      await prisma.mediaAsset.create({
        data: {
          exerciseId: exercise.id,
          type: m.type,
          url: m.url,
          thumbnailUrl: m.thumbnailUrl ?? null,
          source: "seed",
        },
      });
      mediaCount += 1;
    }
  }

  console.log("Seed completed.", "Exercises:", exerciseCount, "Media:", mediaCount);

  const PRUNE = process.env.PRUNE_EXERCISES === "true";
  if (PRUNE && process.env.NODE_ENV !== "production") {
    const seedSlugs = new Set(items.map((e) => e.slug));
    const toDelete = await prisma.exercise.findMany({
      where: { slug: { notIn: Array.from(seedSlugs) } },
      select: { id: true, slug: true },
    });

    const sample = toDelete.slice(0, 50).map((x) => x.slug);
    if (sample.length) console.log("Prune sample slugs:", sample);

    if (toDelete.length > 0) {
      const ids = toDelete.map((x) => x.id);
      await prisma.mediaAsset.deleteMany({ where: { exerciseId: { in: ids } } });
      await prisma.exercise.deleteMany({ where: { id: { in: ids } } });
      console.log("Prune completed. Removed exercises:", toDelete.length);
    }
  } else if (PRUNE && process.env.NODE_ENV === "production") {
    console.log("PRUNE_EXERCISES ignored in production.");
  }
}

main()
  .then(async () => await prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

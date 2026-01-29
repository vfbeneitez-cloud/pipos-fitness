import { prisma } from "../src/server/db/prisma";

async function main() {
  const exercises = [
    {
      slug: "leg-press-machine",
      name: "Leg Press (Machine)",
      environment: "GYM",
      primaryMuscle: "Quadriceps/Glutes",
      cues: "Feet shoulder-width, control the descent, don't lock knees.",
      commonMistakes: "Too deep rounding lower back; locking knees; bouncing.",
      media: {
        create: [
          {
            type: "video",
            url: "https://example.com/leg-press.mp4",
            thumbnailUrl: "https://example.com/leg-press.jpg",
            source: "placeholder",
          },
        ],
      },
    },
    {
      slug: "push-up",
      name: "Push-up",
      environment: "CALISTHENICS",
      primaryMuscle: "Chest/Triceps",
      cues: "Body straight line, elbows ~45°, full range.",
      commonMistakes: "Hips sagging; partial reps; flared elbows.",
      media: {
        create: [{ type: "image", url: "https://example.com/push-up.png", source: "placeholder" }],
      },
    },
    {
      slug: "bodyweight-squat",
      name: "Bodyweight Squat",
      environment: "HOME",
      primaryMuscle: "Legs/Glutes",
      cues: "Knees track toes, sit back and down, keep chest up.",
      commonMistakes: "Heels lifting; knees collapsing inward.",
      media: {
        create: [{ type: "image", url: "https://example.com/squat.png", source: "placeholder" }],
      },
    },
    {
      slug: "freestyle-swim",
      name: "Freestyle Swim",
      environment: "POOL",
      primaryMuscle: "Full body",
      cues: "Long body line, rotate hips, breathe rhythmically.",
      commonMistakes: "Head too high; short strokes; poor breathing timing.",
      media: {
        create: [
          {
            type: "video",
            url: "https://example.com/freestyle.mp4",
            thumbnailUrl: "https://example.com/freestyle.jpg",
            source: "placeholder",
          },
        ],
      },
    },
    {
      slug: "bench-press",
      name: "Bench Press",
      environment: "GYM",
      primaryMuscle: "Chest/Shoulders/Triceps",
      cues: "Feet flat, arch back slightly, control descent, press up.",
      commonMistakes: "Bouncing bar; flaring elbows too wide; feet lifting.",
      media: {
        create: [
          {
            type: "video",
            url: "https://example.com/bench-press.mp4",
            thumbnailUrl: "https://example.com/bench-press.jpg",
            source: "placeholder",
          },
        ],
      },
    },
    {
      slug: "deadlift",
      name: "Deadlift",
      environment: "GYM",
      primaryMuscle: "Back/Glutes/Hamstrings",
      cues: "Hinge at hips, keep back straight, drive through heels.",
      commonMistakes: "Rounding back; lifting with arms; bar drifting forward.",
      media: {
        create: [
          {
            type: "video",
            url: "https://example.com/deadlift.mp4",
            thumbnailUrl: "https://example.com/deadlift.jpg",
            source: "placeholder",
          },
        ],
      },
    },
    {
      slug: "pull-up",
      name: "Pull-up",
      environment: "CALISTHENICS",
      primaryMuscle: "Back/Biceps",
      cues: "Hang fully, pull chest to bar, control descent.",
      commonMistakes: "Kipping/swinging; partial range; shrugging shoulders.",
      media: {
        create: [
          {
            type: "image",
            url: "https://example.com/pull-up.png",
            source: "placeholder",
          },
        ],
      },
    },
    {
      slug: "plank",
      name: "Plank",
      environment: "HOME",
      primaryMuscle: "Core",
      cues: "Straight line head to heels, engage core, breathe normally.",
      commonMistakes: "Sagging hips; lifting hips too high; holding breath.",
      media: {
        create: [
          {
            type: "image",
            url: "https://example.com/plank.png",
            source: "placeholder",
          },
        ],
      },
    },
    {
      slug: "lunges",
      name: "Lunges",
      environment: "HOME",
      primaryMuscle: "Legs/Glutes",
      cues: "Step forward, lower back knee, drive through front heel.",
      commonMistakes: "Knee going past toes; leaning forward; short steps.",
      media: {
        create: [
          {
            type: "image",
            url: "https://example.com/lunges.png",
            source: "placeholder",
          },
        ],
      },
    },
    {
      slug: "backstroke-swim",
      name: "Backstroke Swim",
      environment: "POOL",
      primaryMuscle: "Back/Shoulders",
      cues: "Body horizontal, rotate shoulders, continuous arm movement.",
      commonMistakes: "Head too high; crossing arms; poor body rotation.",
      media: {
        create: [
          {
            type: "video",
            url: "https://example.com/backstroke.mp4",
            thumbnailUrl: "https://example.com/backstroke.jpg",
            source: "placeholder",
          },
        ],
      },
    },
    {
      slug: "dumbbell-row",
      name: "Dumbbell Row",
      environment: "GYM",
      primaryMuscle: "Back/Biceps",
      cues: "Hinge forward, pull to hip, squeeze shoulder blades.",
      commonMistakes: "Using momentum; rounding back; pulling too high.",
      media: {
        create: [
          {
            type: "image",
            url: "https://example.com/dumbbell-row.png",
            source: "placeholder",
          },
        ],
      },
    },
    {
      slug: "burpee",
      name: "Burpee",
      environment: "CALISTHENICS",
      primaryMuscle: "Full body",
      cues: "Squat down, jump back to plank, jump forward, jump up.",
      commonMistakes: "Skipping steps; landing hard; poor form in push-up.",
      media: {
        create: [
          {
            type: "video",
            url: "https://example.com/burpee.mp4",
            thumbnailUrl: "https://example.com/burpee.jpg",
            source: "placeholder",
          },
        ],
      },
    },
  ] as const;

  for (const ex of exercises) {
    await prisma.exercise.upsert({
      where: { slug: ex.slug },
      update: {},
      create: ex as unknown as Parameters<typeof prisma.exercise.upsert>[0]["create"],
    });
  }

  console.log("Seed completed.");
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

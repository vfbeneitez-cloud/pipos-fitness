import "dotenv/config";
import { prisma } from "../src/server/db/prisma";

async function main() {
  const plan = await prisma.weeklyPlan.findFirst({
    orderBy: { weekStart: "desc" },
    select: { nutritionJson: true },
  });
  if (!plan) {
    console.log("No WeeklyPlan in DB.");
    return;
  }
  const nj = plan.nutritionJson as {
    mealsPerDay?: number;
    cookingTime?: string;
    days?: Array<{ dayIndex: number; meals?: Array<{ slot: string; title: string }> }>;
  };
  const out = {
    mealsPerDay: nj.mealsPerDay,
    cookingTime: nj.cookingTime,
    "days[0].meals": nj.days?.[0]?.meals?.map((m) => ({ slot: m.slot, title: m.title })),
  };
  console.log(JSON.stringify(out, null, 2));
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

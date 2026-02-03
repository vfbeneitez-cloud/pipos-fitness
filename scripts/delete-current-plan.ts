import "dotenv/config";
import { prisma } from "../src/server/db/prisma";
import { getWeekStart } from "../src/app/lib/week";

async function main() {
  const weekStart = getWeekStart(new Date());
  console.log(`Borrando plan para semana: ${weekStart}`);

  const deleted = await prisma.weeklyPlan.deleteMany({
    where: { weekStart: new Date(`${weekStart}T00:00:00.000Z`) },
  });

  console.log(`✅ Borrados ${deleted.count} plan(es)`);
  console.log("\nAhora ve a /week en la app y genera un nuevo plan.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

import "dotenv/config";
import { prisma } from "../src/server/db/prisma";

async function main() {
  const deleted = await prisma.weeklyPlan.deleteMany({});
  console.log(`✅ Borrados ${deleted.count} plan(es)`);
  console.log("\nAhora genera un plan nuevo desde /week o /profile");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

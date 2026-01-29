import "dotenv/config";
import { prisma } from "../src/server/db/prisma";

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@local.test" },
    update: {},
    create: { email: "demo@local.test" },
  });

  console.log("DEMO_USER_ID:", user.id);
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

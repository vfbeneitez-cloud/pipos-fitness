import { prisma } from "@/src/server/db/prisma";

const DEMO_EMAIL = "demo@pipos.local";

export async function getDemoSession() {
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: { email: DEMO_EMAIL },
  });
  return { status: 200, body: { userId: user.id } };
}

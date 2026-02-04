import { prisma } from "@/src/server/db/prisma";

export async function getUnreadCount(userId: string) {
  const count = await prisma.notification.count({
    where: { userId, readAt: null },
  });

  return {
    status: 200,
    body: { unreadCount: count },
  };
}

import { prisma } from "@/src/server/db/prisma";

export async function listNotifications(
  userId: string,
  options: { limit?: number; unreadOnly?: boolean } = {},
) {
  const limit = Math.min(Math.max(1, options.limit ?? 30), 100);
  const where = { userId };
  if (options.unreadOnly) {
    Object.assign(where, { readAt: null });
  }

  const items = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      scopeKey: true,
      title: true,
      message: true,
      dataJson: true,
      readAt: true,
      createdAt: true,
    },
  });

  return {
    status: 200,
    body: items,
  };
}

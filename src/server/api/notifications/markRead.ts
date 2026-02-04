import { prisma } from "@/src/server/db/prisma";

export async function markNotificationRead(userId: string, notificationId: string) {
  const updated = await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { readAt: new Date() },
  });

  if (updated.count === 0) {
    return {
      status: 404,
      body: {
        error: "NOTIFICATION_NOT_FOUND",
        error_code: "NOTIFICATION_NOT_FOUND",
        message: "Notificación no encontrada.",
      },
    };
  }

  return { status: 200, body: { ok: true } };
}

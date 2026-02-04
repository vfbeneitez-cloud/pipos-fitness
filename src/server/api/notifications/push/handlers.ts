import { z } from "zod";
import { prisma } from "@/src/server/db/prisma";

const SubscribeBody = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});
const UnsubscribeBody = z.object({ endpoint: z.string().url() });
const PushPrefsBody = z.object({
  pushNotificationsEnabled: z.boolean(),
  pushQuietHoursStartUtc: z.number().int().min(0).max(23),
  pushQuietHoursEndUtc: z.number().int().min(0).max(23),
});

export async function upsertSubscription(userId: string, body: unknown, userAgent?: string | null) {
  const parsed = SubscribeBody.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: {
        error_code: "INVALID_BODY",
        message: "endpoint (url) y keys (p256dh, auth) requeridos.",
      },
    };
  }
  const { endpoint, keys } = parsed.data;

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId, p256dh: keys.p256dh, auth: keys.auth, userAgent: userAgent ?? undefined },
    create: {
      userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: userAgent ?? undefined,
    },
  });
  return { status: 200, body: { ok: true } };
}

export async function deleteSubscription(userId: string, body: unknown) {
  const parsed = UnsubscribeBody.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: { error_code: "INVALID_BODY", message: "endpoint (url) requerido." },
    };
  }

  await prisma.pushSubscription.deleteMany({
    where: { userId, endpoint: parsed.data.endpoint },
  });
  return { status: 200, body: { ok: true } };
}

export async function getPushPreferences(userId: string) {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: {
      pushNotificationsEnabled: true,
      pushQuietHoursStartUtc: true,
      pushQuietHoursEndUtc: true,
    },
  });
  return {
    status: 200,
    body: {
      pushNotificationsEnabled: profile?.pushNotificationsEnabled ?? false,
      pushQuietHoursStartUtc: profile?.pushQuietHoursStartUtc ?? 22,
      pushQuietHoursEndUtc: profile?.pushQuietHoursEndUtc ?? 7,
    },
  };
}

export async function setPushPreferences(userId: string, body: unknown) {
  const parsed = PushPrefsBody.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: {
        error_code: "INVALID_BODY",
        message:
          "pushNotificationsEnabled, pushQuietHoursStartUtc (0-23), pushQuietHoursEndUtc (0-23) requeridos.",
      },
    };
  }

  await prisma.userProfile.upsert({
    where: { userId },
    update: parsed.data,
    create: { userId, ...parsed.data },
  });
  return { status: 200, body: parsed.data };
}

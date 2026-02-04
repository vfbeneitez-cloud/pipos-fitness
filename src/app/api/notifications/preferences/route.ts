import { NextResponse } from "next/server";
import { z } from "zod";
import { withSensitiveRoute } from "@/src/server/lib/withSensitiveRoute";
import { requireAuth } from "@/src/server/lib/requireAuth";
import { prisma } from "@/src/server/db/prisma";

const PostBody = z.object({
  emailNotificationsEnabled: z.boolean(),
  emailNotificationHourUtc: z.number().int().min(0).max(23),
});

export async function GET(req: Request) {
  if (process.env.NOTIFICATIONS_ENABLED !== "true") {
    return NextResponse.json(null, { status: 404 });
  }

  return withSensitiveRoute(req, async () => {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: {
        emailNotificationsEnabled: true,
        emailNotificationHourUtc: true,
      },
    });

    return NextResponse.json({
      emailNotificationsEnabled: profile?.emailNotificationsEnabled ?? false,
      emailNotificationHourUtc: profile?.emailNotificationHourUtc ?? 9,
    });
  });
}

export async function POST(req: Request) {
  if (process.env.NOTIFICATIONS_ENABLED !== "true") {
    return NextResponse.json(null, { status: 404 });
  }

  return withSensitiveRoute(req, async () => {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error_code: "INVALID_BODY", message: "Body JSON inválido." },
        { status: 400 },
      );
    }

    const parsed = PostBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error_code: "INVALID_BODY",
          message:
            "emailNotificationsEnabled (boolean) y emailNotificationHourUtc (0-23) requeridos.",
        },
        { status: 400 },
      );
    }

    const { emailNotificationsEnabled, emailNotificationHourUtc } = parsed.data;

    await prisma.userProfile.upsert({
      where: { userId },
      update: { emailNotificationsEnabled, emailNotificationHourUtc },
      create: {
        userId,
        emailNotificationsEnabled,
        emailNotificationHourUtc,
      },
    });

    return NextResponse.json({
      emailNotificationsEnabled,
      emailNotificationHourUtc,
    });
  });
}

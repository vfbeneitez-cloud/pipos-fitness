import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/server/db/prisma";

const QuerySchema = z.object({
  environment: z.enum(["GYM", "HOME", "CALISTHENICS", "POOL", "MIXED"]).optional(),
  q: z.string().trim().min(1).max(50).optional(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = {
    environment: url.searchParams.get("environment") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
  };

  const parsed = QuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_QUERY", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { environment, q } = parsed.data;

  const exercises = await prisma.exercise.findMany({
    where: {
      ...(environment ? { environment } : {}),
      ...(q
        ? {
            name: {
              contains: q,
              mode: "insensitive",
            },
          }
        : {}),
    },
    include: {
      media: {
        select: { id: true, type: true, url: true, thumbnailUrl: true },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(exercises);
}

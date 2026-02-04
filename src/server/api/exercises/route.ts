import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/server/db/prisma";
import {
  normalizeExercisesQueryString,
  exercisesCacheKey,
  getExercisesCached,
  setExercisesCached,
} from "@/src/server/lib/exercisesCache";
import { trackEvent } from "@/src/server/lib/events";

const EXERCISES_CACHE_CONTROL = "public, s-maxage=600, stale-while-revalidate=86400";
/** Defensive limit when catalog grows; pagination in Phase 2 if needed. */
const MAX_EXERCISES = 1000;

const QuerySchema = z.object({
  environment: z.enum(["GYM", "HOME", "CALISTHENICS", "POOL", "MIXED", "ESTIRAMIENTOS"]).optional(),
  q: z.string().trim().min(1).max(50).optional(),
});

export type GetExercisesOptions = { requestId?: string };

export async function getExercises(
  req: Request,
  options: GetExercisesOptions = {},
): Promise<NextResponse> {
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
  const normalizedQuery = normalizeExercisesQueryString(url.searchParams);
  const cacheKey = exercisesCacheKey(normalizedQuery);

  const cached = await getExercisesCached(cacheKey, options.requestId);
  if (cached !== null) {
    try {
      JSON.parse(cached); // validate; if corrupt, fall through to DB
      trackEvent("api_exercises_outcome", {
        endpoint: "/api/exercises",
        outcome: "cache_hit",
        ...(options.requestId && { requestId: options.requestId }),
      });
      const res = new NextResponse(cached, {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
      res.headers.set("Cache-Control", EXERCISES_CACHE_CONTROL);
      return res;
    } catch {
      trackEvent("api_exercises_outcome", {
        endpoint: "/api/exercises",
        outcome: "cache_miss_corrupt",
        ...(options.requestId && { requestId: options.requestId }),
      });
      // fall through to DB
    }
  }

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
    take: MAX_EXERCISES,
    include: {
      media: {
        select: { id: true, type: true, url: true, thumbnailUrl: true },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  trackEvent("api_exercises_outcome", {
    endpoint: "/api/exercises",
    outcome: "cache_miss",
    ...(options.requestId && { requestId: options.requestId }),
  });
  void setExercisesCached(cacheKey, JSON.stringify(exercises), options.requestId);

  const res = NextResponse.json(exercises);
  res.headers.set("Cache-Control", EXERCISES_CACHE_CONTROL);
  return res;
}

/** Alias for tests that import GET from server route. */
export const GET = getExercises;

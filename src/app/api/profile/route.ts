import { NextResponse } from "next/server";
import { requireAuth } from "@/src/server/lib/requireAuth";
import { withSensitiveRoute } from "@/src/server/lib/withSensitiveRoute";
import { badRequest } from "@/src/server/api/errorResponse";
import { ProfileInputSchema } from "@/src/server/api/profile/schema";
import { getProfile, upsertProfile } from "@/src/server/api/profile/handlers";

export async function GET() {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;
  const profile = await getProfile(userId);
  return NextResponse.json({ profile: profile ?? null });
}

export async function PUT(req: Request) {
  return withSensitiveRoute(req, async () => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest("INVALID_JSON");
    }
    const parsed = ProfileInputSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return badRequest("INVALID_INPUT");
    }
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;
    const profile = await upsertProfile(userId, parsed.data);
    return NextResponse.json({ profile });
  });
}

export async function POST(req: Request) {
  return withSensitiveRoute(req, async () => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest("INVALID_JSON");
    }
    const parsed = ProfileInputSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return badRequest("INVALID_INPUT");
    }
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;
    const profile = await upsertProfile(userId, parsed.data);
    return NextResponse.json({ profile });
  });
}

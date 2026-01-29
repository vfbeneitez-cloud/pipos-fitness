import { NextResponse } from "next/server";
import { prisma } from "@/src/server/db/prisma";
import { withSensitiveRoute } from "@/src/server/lib/withSensitiveRoute";

export async function GET(req: Request) {
  return withSensitiveRoute(req, async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return NextResponse.json({ ok: true });
    } catch {
      return NextResponse.json({ ok: false, error: "DB_CONNECTION_FAILED" }, { status: 503 });
    }
  });
}

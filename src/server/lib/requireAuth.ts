import { NextResponse } from "next/server";
import { getUserIdFromSession } from "@/src/server/auth/getSession";

/**
 * Helper para endpoints protegidos. Devuelve userId o error 401.
 */
export async function requireAuth(): Promise<{ userId: string } | NextResponse> {
  const userId = await getUserIdFromSession();
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  return { userId };
}

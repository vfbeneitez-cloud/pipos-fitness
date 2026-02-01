import { NextResponse } from "next/server";
import { getUserIdFromSession } from "@/src/server/auth/getSession";
import { unauthorized } from "@/src/server/api/errorResponse";

/**
 * Helper para endpoints protegidos. Devuelve userId o error 401.
 */
export async function requireAuth(): Promise<{ userId: string } | NextResponse> {
  const userId = await getUserIdFromSession();
  if (!userId) {
    return unauthorized();
  }
  return { userId };
}

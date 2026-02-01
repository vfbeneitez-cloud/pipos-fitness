import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proxy runs only on paths matched below. Excluded (never run):
 * - /auth/* (signin, verify)
 * - /api/auth/* (NextAuth)
 * - /_next/* (static, image, etc.)
 * Add any global logic here; auth routes stay untouched.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- req required by Next.js matcher API
export function proxy(req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Exclude /auth, /api/auth, _next, static assets
    "/((?!auth|api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

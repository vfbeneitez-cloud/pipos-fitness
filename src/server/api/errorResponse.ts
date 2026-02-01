import { NextResponse } from "next/server";

const BAD_REQUEST_MESSAGE = "Revisa los datos e inténtalo de nuevo.";

export function unauthorized(): NextResponse {
  return NextResponse.json(
    {
      error_code: "UNAUTHORIZED",
      message: "Tu sesión ha expirado. Vuelve a iniciar sesión.",
    },
    { status: 401 },
  );
}

export function rateLimitExceeded(retryAfter: number): NextResponse {
  return NextResponse.json(
    {
      error_code: "RATE_LIMIT_EXCEEDED",
      message: `Demasiadas solicitudes. Espera ${retryAfter}s y reintenta.`,
    },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

export function badRequest(errorCode: string): NextResponse {
  return NextResponse.json(badRequestBody(errorCode), { status: 400 });
}

export function badRequestBody(errorCode: string): { error_code: string; message: string } {
  return { error_code: errorCode, message: BAD_REQUEST_MESSAGE };
}

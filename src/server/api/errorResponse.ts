import { NextResponse } from "next/server";

const BAD_REQUEST_MESSAGE = "Revisa los datos e inténtalo de nuevo.";
const FORBIDDEN_MESSAGE = "No tienes permiso para acceder a este recurso.";

export type ApiError = {
  status: number;
  code: string;
  message?: string;
  details?: unknown;
};

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export function unauthorized(): NextResponse {
  return NextResponse.json(
    {
      error_code: "UNAUTHORIZED",
      message: "Tu sesión ha expirado. Vuelve a iniciar sesión.",
      error: "UNAUTHORIZED",
    },
    { status: 401 },
  );
}

export function rateLimitExceeded(retryAfter: number): NextResponse {
  return NextResponse.json(
    {
      error_code: "RATE_LIMIT_EXCEEDED",
      message: `Demasiadas solicitudes. Espera ${retryAfter}s y reintenta.`,
      error: "RATE_LIMIT_EXCEEDED",
    },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

export function badRequest(errorCode: string): NextResponse {
  return NextResponse.json(badRequestBody(errorCode), { status: 400 });
}

export function forbidden(code: string): NextResponse {
  return NextResponse.json(forbiddenBody(code), { status: 403 });
}

export function badRequestBody(errorCode: string): {
  error_code: string;
  message: string;
  error: string;
} {
  return { error_code: errorCode, message: BAD_REQUEST_MESSAGE, error: errorCode };
}

export function forbiddenBody(code: string): {
  error_code: string;
  message: string;
  error: string;
} {
  return { error_code: code, message: FORBIDDEN_MESSAGE, error: code };
}

/**
 * Mapper único: convierte resultado { status, body } del server/api a NextResponse.
 * COMPAT: include error (alias) until 2026-03-31 or v0.6.0, then remove and keep error_code/message only.
 */
export function toNextResponse(result: { status: number; body: unknown }): NextResponse {
  if (result.status >= 200 && result.status < 300) {
    return NextResponse.json(result.body, { status: result.status });
  }
  const body = result.body as {
    error?: string;
    error_code?: string;
    message?: string;
    details?: unknown;
  };
  const errorCode = body?.error_code ?? body?.error ?? "UNKNOWN_ERROR";
  const message = body?.message ?? BAD_REQUEST_MESSAGE;
  const json = {
    error_code: errorCode,
    message,
    error: errorCode, // COMPAT: remove after 2026-03-31 / v0.6.0
    ...(body?.details !== undefined && { details: body.details }),
  };
  return NextResponse.json(json, { status: result.status });
}

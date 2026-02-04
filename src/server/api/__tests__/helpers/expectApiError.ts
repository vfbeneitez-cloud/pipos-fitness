import { expect } from "vitest";

type ErrorShape = {
  error_code?: unknown;
  message?: unknown;
  error?: unknown;
  details?: unknown;
};

type Options = {
  /** Si true, exige `error` (alias) además de error_code/message. Default true hasta v0.6.0; luego false al retirar alias. */
  requireCompatErrorAlias?: boolean;
  /** Si se espera details, valida que exista (y opcionalmente que coincida) */
  details?: "present" | "absent" | unknown;
};

const DEFAULT_OPTIONS: Options = { requireCompatErrorAlias: true };

export function expectApiError(
  result: { status: number; body: unknown },
  expected: { status: number; code: string },
  options: Options = DEFAULT_OPTIONS,
) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  expect(result.status).toBe(expected.status);

  const body = result.body as ErrorShape;

  // error_code must exist, be non-empty string, and match
  expect(body).toHaveProperty("error_code");
  expect(typeof body.error_code).toBe("string");
  expect((body.error_code as string).length).toBeGreaterThan(0);
  expect(body.error_code).toBe(expected.code);

  // message must be a non-empty string
  expect(body).toHaveProperty("message");
  expect(typeof body.message).toBe("string");
  expect((body.message as string).length).toBeGreaterThan(0);

  // COMPAT alias `error` (default true; flip DEFAULT_OPTIONS.requireCompatErrorAlias to false in v0.6.0)
  if (opts.requireCompatErrorAlias) {
    expect(body).toHaveProperty("error");
    expect(body.error).toBe(expected.code);
  }

  // details handling: use "in" so we catch accidental details: undefined
  if (opts.details === "present") {
    expect("details" in body).toBe(true);
    expect(body.details).not.toBeUndefined();
  } else if (opts.details === "absent") {
    expect("details" in body).toBe(false);
  } else if (opts.details !== undefined) {
    expect(body.details).toEqual(opts.details);
  }

  return body;
}

export function expectApiOk<T>(
  result: { status: number; body: unknown },
  expectedStatus: number = 200,
): T {
  const msg =
    result.status !== expectedStatus
      ? `expected ${expectedStatus}, got ${result.status}. Body: ${JSON.stringify(result.body)}`
      : undefined;
  expect(result.status, msg).toBe(expectedStatus);
  return result.body as T;
}

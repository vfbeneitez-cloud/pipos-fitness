type ErrorData = { message?: string; error_code?: string; error?: string } | null;

export function getErrorMessage(data: ErrorData, fallback: string): string {
  if (typeof data?.message === "string" && data.message.trim()) return data.message.trim();
  const code = data?.error_code ?? data?.error;
  if (code === "UNAUTHORIZED") return "Tu sesión ha expirado. Vuelve a iniciar sesión.";
  if (code === "RATE_LIMIT_EXCEEDED")
    return "Demasiadas solicitudes. Espera un momento y reintenta.";
  if (code === "NO_EXERCISES_AVAILABLE")
    return "Aún no tenemos ejercicios suficientes para crear tu plan. Inténtalo de nuevo más tarde.";
  if (code) return "Ha habido un problema. Reintenta.";
  return fallback;
}

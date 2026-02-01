# Auditoría MVP - E1: Errores y Empty States

## Resumen por ruta/pantalla

| Ruta                  | Errores visibles                                                                                                                    | Empty states                                                                                                                           | CTA en error/empty                                                                                   | `notFound()`                | Manejo error |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------- | ------------ |
| `/`                   | —                                                                                                                                   | —                                                                                                                                      | redirect a /week o /auth/signin                                                                      | No                          | —            |
| `/auth/signin`        | Ninguno                                                                                                                             | Ninguno                                                                                                                                | "Continuar con Google"                                                                               | No                          | global-error |
| `/auth/verify`        | Ninguno                                                                                                                             | —                                                                                                                                      | redirect a /auth/signin                                                                              | No                          | global-error |
| `/week`               | ErrorBanner: "Error al cargar el plan.", "Error de red. Reintenta."; SwapMeal: "No se pudo cambiar. Reintenta." (inline rojo)       | plan null: "Aún no tienes plan para esta semana"; día descanso: "El descanso es parte del plan..."; sin menú hoy: "Sin menú para hoy." | Reintentar, Generar plan (→/onboarding), Registrar entrenamiento igualmente, Registrar entrenamiento | No                          | global-error |
| `/session/[dayIndex]` | ErrorBanner: "Error al cargar el plan.", "Error de red. Reintenta."                                                                 | plan null: "Aún no tienes plan..."; día libre: "Día libre o recuperación activa."; dayIndex inválido: "Día no válido."                 | Reintentar, Ir a la semana, Generar plan, Volver a la semana, Registrar entrenamiento igualmente     | No                          | global-error |
| `/profile`            | ErrorBanner: "No se pudo cargar el perfil.", "Error de red. Reintenta.", "Error al guardar. Reintenta.", "Error al regenerar plan." | profile null (sin error): "Aún no tienes perfil..."                                                                                    | Reintentar, Configurar preferencias (→/onboarding)                                                   | No                          | global-error |
| `/onboarding`         | ErrorBanner: "Error al guardar. Reintenta.", "Error al crear plan.", "Error de red. Reintenta."                                     | Ninguno                                                                                                                                | Reintentar                                                                                           | No                          | global-error |
| `/exercise/[slug]`    | video fallback: "No se pudo reproducir el vídeo."; media null: "Sin vídeo o imagen disponible."                                     | ejercicio no existe → notFound                                                                                                         | ← Volver a la semana                                                                                 | **Sí** (ejercicio no en DB) | global-error |
| `/log/training`       | ErrorBanner: "Sesión no encontrada.", "Error al guardar.", "Error de red. Reintenta."                                               | Ninguno                                                                                                                                | Reintentar                                                                                           | No                          | global-error |
| `/log/nutrition`      | ErrorBanner: "Sesión no encontrada.", "Error al guardar.", "Error de red. Reintenta."                                               | Ninguno                                                                                                                                | Reintentar                                                                                           | No                          | global-error |

## 401 / 403 / 429 en UI

- **401**: APIs devuelven `{ error: "UNAUTHORIZED" }`. Las páginas muestran `data.error ?? fallback`, luego el usuario ve **"UNAUTHORIZED"** (código técnico, no amigable).
- **403**: No se usa explícitamente en las rutas auditadas.
- **429**: APIs con `withSensitiveRoute` devuelven `{ error: "RATE_LIMIT_EXCEEDED" }` y `Retry-After`. Las páginas no distinguen 429; muestran **"RATE_LIMIT_EXCEEDED"** como mensaje genérico. **Gap**: No hay UI específica para rate limit.

## `global-error.tsx`

- **Copy**: Usa `<NextError statusCode={0} />` — no hay texto propio; Next.js renderiza mensaje genérico.
- **CTA**: Ninguno visible (solo el contenido por defecto de NextError).
- **Sentry**: Sí — `Sentry.captureException(error)` en `useEffect`.

## `rateLimit.ts` / 429

- **rateLimit.ts**: Devuelve `{ ok: false, retryAfter?: number }`; no escribe HTTP.
- **withSensitiveRoute.ts** (usa rateLimit): En 429 devuelve
  `NextResponse.json({ error: "RATE_LIMIT_EXCEEDED" }, { status: 429, headers: { "Retry-After": String(retryAfter ?? 60) } })`
- **UI ante 429**: Las páginas no tratan 429. El usuario ve `data.error` = "RATE_LIMIT_EXCEEDED" sin explicación ni sugerencia de espera. **Gap**: Falta UI específica para rate limit.

## Rutas que usan `withSensitiveRoute` (pueden devolver 429)

- `/api/profile` (PUT, POST)
- `/api/weekly-plan` (GET, POST)
- `/api/agent/weekly-plan` (POST)
- `/api/nutrition/swap` (POST)
- `/api/nutrition/log` (POST)
- `/api/training/log` (POST)
- `/api/cron/weekly-regenerate`
- `/api/health/db`

## `notFound()` en rutas públicas

- `/exercise/[slug]`: Sí — cuando el ejercicio no existe. Ruta protegida (dentro de `(app)`), no pública.

## Gaps prioritarios

1. **429 sin UI amigable** — El usuario ve "RATE_LIMIT_EXCEEDED" sin mensaje legible ni indicación de cuánto esperar.
2. **401 sin copy amigable** — El usuario ve "UNAUTHORIZED" en lugar de un mensaje como "Sesión expirada" y CTA para volver a entrar.
3. **global-error sin CTA** — No hay botón "Reintentar" ni "Volver" en la pantalla de error global.
4. **global-error copy genérica** — `NextError statusCode={0}` ofrece poca orientación al usuario.
5. **log/training y log/nutrition: "Sesión no encontrada"** — Mensaje poco claro (demo userId ausente vs auth); CTA Reintentar no suele ayudar.
6. **Sin menú hoy** — "Sin menú para hoy." sin CTA; el usuario no sabe qué hacer.
7. **onboarding error** — "Reintentar" solo limpia el error; no reintenta el submit automáticamente.
8. **Profile/Onboarding 400** — Errores como INVALID_JSON o INVALID_INPUT se muestran tal cual; no son amigables.
9. **DemoGuard "Cargando…"** — Componente no usado actualmente; si se usa, el estado de carga es muy básico.
10. **Exercise notFound** — Pantalla 404 por defecto de Next.js; sin copy específica ni CTA para volver a la semana.

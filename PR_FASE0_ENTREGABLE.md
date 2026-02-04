# PR Fase 0 — Entregable

## PASO 1 — Lo encontrado (evidencia)

- **Ownership**: Único `findUnique({ where: { id: ... } })` sin userId: `src/server/api/training/log.ts` línea 25 (`planId`). NutritionLog no acepta planId; WeeklyPlan GET/POST filtran por userId.
- **DEMO_MODE**: `src/server/auth/getSession.ts` — usa DEMO_EMAIL, crea/usa demo user si DEMO_MODE=true; sin check prod.
- **Error contract**: `src/server/api/errorResponse.ts` — unauthorized, badRequestBody (error_code, message); ADR-0003 hablaba de `{ error, details? }`; no había forbidden.
- **x-request-id**: `src/server/lib/withSensitiveRoute.ts` — lee header, no lo devolvía en respuesta.
- **zod**: 9 archivos importan `"zod"`; `package.json` sin zod en dependencies (solo transitiva).
- **RELEASE_CHECKLIST.md**: Existía; no tenía Security Regression Checklist ni ítem fail-fast DEMO_MODE.

---

## Archivos cambiados y por qué

| Archivo                                | Motivo                                                                                                                             |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `src/server/api/errorResponse.ts`      | P0-1/P1-1: `forbiddenBody`, `forbidden`, tipos `ApiError`/`ApiResult`, `toNextResponse`, compat transitoria `error` en respuestas. |
| `src/server/api/training/log.ts`       | P0-1: ownership con `findFirst({ where: { id: planId, userId } })`; 403 si plan existe pero no pertenece; 404 si plan no existe.   |
| `src/app/api/training/log/route.ts`    | P0-1/P1-1: uso de `toNextResponse(result)`, trackEvent 403.                                                                        |
| `src/server/api/training/log.test.ts`  | P0-1: test regresión 403 cuando planId es de otro usuario; aserciones de shape error (error_code, message, error).                 |
| `src/server/auth/getSession.ts`        | P0-2: fail-fast si prod + DEMO_MODE=true (throw); no crear usuario demo en prod.                                                   |
| `src/app/api/weekly-plan/route.ts`     | P1-1: GET/POST usan `toNextResponse(result)` para respuestas normalizadas.                                                         |
| `src/server/lib/withSensitiveRoute.ts` | x-request-id: añadir header `x-request-id` en respuesta (rate limit y handler).                                                    |
| `package.json`                         | zod como dependencia directa `"zod": "^3.25.0"`.                                                                                   |
| `adrs/ADR-0003-api-style.md`           | P1-1: formato error actual (error_code, message, error), 403, mapper único `toNextResponse`.                                       |
| `RELEASE_CHECKLIST.md`                 | P0-2: ítem fail-fast DEMO_MODE; Security Regression Checklist; Fase 1 backlog.                                                     |

---

## Diff-resumen por objetivo

- **P0-1 (ownership TrainingLog)**: `training/log.ts` usa `findFirst({ id: planId, userId })`; si no hay plan → 404 si no existe, 403 si existe pero no es del usuario. `errorResponse.ts` añade `forbiddenBody`/`forbidden`. Route usa `toNextResponse(result)` y trackEvent 403. Test nuevo: user B intenta crear log con planId de user A → 403 y shape error.
- **P0-2 (DEMO_MODE fail-fast)**: `getSession.ts` al inicio: si `NODE_ENV === "production" && DEMO_MODE === "true"` → throw. No crear usuario demo en prod (guard antes de `prisma.user.create`). RELEASE_CHECKLIST: ítem fail-fast y checklist de seguridad.
- **P1-1 (contrato errores)**: Tipos `ApiError`/`ApiResult` y `toNextResponse(result)` en `errorResponse.ts`. Respuestas de error incluyen `error_code`, `message`, `error` (compat). Rutas training/log y weekly-plan usan `toNextResponse`. ADR-0003 actualizado con formato actual y mapper único.
- **x-request-id**: `withSensitiveRoute.ts`: tras rate limit y tras handler, `res.headers.set("x-request-id", requestId)`.
- **zod**: `package.json` dependencies: `"zod": "^3.25.0"`.
- **Security regression checklist**: Nueva sección en RELEASE*CHECKLIST.md: DEMO_MODE, CRON_SECRET, AUTH*\*, ownership checks, rate limit /api/exercises; más Fase 1 backlog (rate limit exercises, schemaVersion, refactor agent).

---

## Cómo ejecutar tests y resultado esperado

```bash
cd pipos_fitness
npm ci
npm run typecheck   # 0
npm test            # 92 passed, 3 skipped; 1 failed (pre-existente: _debug/sentry/route.test.ts — mock Sentry sin logger)
```

- **Esperado**: typecheck ok. Tests de training/log (incl. 403 ownership) y resto de suites ok. Un fallo conocido en `src/app/api/_debug/sentry/route.test.ts` (no causado por este PR).

---

## Riesgos / rollout

- **DEMO_MODE fail-fast**: En prod con `DEMO_MODE=true` la app lanza al primer uso de `getSession` (p. ej. layout o API protegida). Comprobar en staging que DEMO_MODE=false.
- **Contrato error**: Se añade campo `error` en respuestas 4xx (duplicado de error_code). Clientes que solo lean `error_code` o `message` no se rompen. Deprecar `error` en 1–2 releases si se desea.
- **Ownership**: Comportamiento nuevo: planId ajeno → 403 en vez de crear log. Front que envíe planId debe asegurar que es del usuario.

---

## Fase 1 backlog (TODO)

- Rate limit GET `/api/exercises`: 60/min + caché 5–30 min.
- `schemaVersion` en WeeklyPlan JSON; validar en `validateWeeklyPlan.ts`.
- Refactor `agentWeeklyPlan` en capas: prompts, providers, planAdjuster, persistence, audit.

---

## Follow-up: cerrar flecos Fase 0

**Archivos tocados:** `src/server/api/training/log.ts`, `src/app/api/training/log/route.ts`, `src/server/api/training/log.test.ts`, `src/server/api/errorResponse.ts`, `adrs/ADR-0003-api-style.md`, `src/app/api/_debug/sentry/route.test.ts`, `src/server/api/weeklyPlan/route.test.ts`, `src/server/api/nutrition/swap.test.ts`.

- **Ownership 404 unificada**: `training/log.ts` devuelve siempre 404 cuando `!plan` (findFirst por id+userId); eliminada bifurcación 403. Body 404 incluye `message: "Plan no encontrado."`. Route: trackEvent `training_log_plan_not_found` (semántico, sin atarte al status). Test renombrado a "returns 404 when planId does not belong to user (ownership)", expected 404, shape error_code/message/error.
- **DEMO_MODE**: throw ya está dentro de `getUserIdFromSession()` → no cambio.
- **Error compat cutoff**: En `errorResponse.ts` (toNextResponse) comentario: COMPAT remove `error` after 2026-03-31 / v0.6.0. ADR-0003: sección "Deprecation plan" con mismo cutoff.
- **Test _debug/sentry**: mock de `@sentry/nextjs` ampliado con `captureMessage` y `logger: { info: vi.fn() }` → test verde.
- **Test pollution**: ownership test usa week 2026-02-09; weekly plan y nutrition "non-existent plan" usan 2030-01-06 para evitar colisiones.

**Commit / PR:**
Título: `Harden Phase 0: unify ownership to 404, add error compat cutoff, fix debug sentry test`
Descripción: Ownership 404 para recursos no owned (evitar enumeración). Error compat: define retirada. Debug sentry test: mock logger / stabilize.

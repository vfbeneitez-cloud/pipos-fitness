# PR Fase 1b — Public /api/exercises Hardening

Rate limit + cache (CDN + optional server) + observabilidad. Contrato público intacto (sin auth).

---

## PASO 1 — Implementación actual (verificada)

- **Handler:** `src/app/api/exercises/route.ts` (Next.js GET) → `checkRateLimit(req, { maxRequests: 60 })` → `getExercises(req, { requestId })` en `src/server/api/exercises/route.ts`. Lógica de negocio y respuesta en server.
- **Rate limit:** Aplicado en la app route antes de llamar a `getExercises`; solo GET (es el único método expuesto). Usa `checkRateLimit` (in-memory o Upstash Redis si `UPSTASH_REDIS_REST_*` está definido).
- **Query params:** `environment` (opcional, enum GYM|HOME|CALISTHENICS|POOL|MIXED|ESTIRAMIENTOS), `q` (opcional, string 1–50, búsqueda por nombre). Validación con Zod en server.

---

## Archivos tocados

| Archivo | Cambio |
|--------|--------|
| `src/app/api/exercises/route.ts` | Observabilidad 429: `trackEvent("api_exercises_outcome", { outcome: "rate_limited", endpoint, requestId, retryAfter })`. Pasa `requestId` a `getExercises`. |
| `src/server/api/exercises/route.ts` | Cache opcional (Redis): try cache get → hit: JSON + Cache-Control; miss: DB, set cache, `trackEvent` cache_miss. Headers `Cache-Control: public, s-maxage=600, stale-while-revalidate=86400`. Opciones `GetExercisesOptions.requestId`. |
| `src/server/lib/exercisesCache.ts` | **Nuevo.** Clave estable `exercises:v1:${normalizedQueryString}` (params ordenados). `getExercisesCached` / `setExercisesCached` con Upstash; fallback: null / no-op (stale OK). |
| `src/server/api/exercises/route.test.ts` | Mock cache + events. Test: respuesta 200 incluye header `Cache-Control` con `public`, `s-maxage=600`, `stale-while-revalidate=86400`. |
| `PR_FASE1B_ENTREGABLE.md` | Este documento. |

---

## Cómo validar cache (manual)

1. Con Redis: `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` en `.env`. Primera petición `GET /api/exercises` → cache_miss y 200 con Cache-Control. Segunda petición misma URL (y misma query normalizada) → cache_hit, 200 con Cache-Control (sin tocar DB si se observa en logs/DB).
2. Sin Redis: siempre cache_miss, respuesta desde DB; Cache-Control sigue presente en 200.
3. CDN/cliente: respuesta 200 incluye `Cache-Control: public, s-maxage=600, stale-while-revalidate=86400`; el cliente/CDN puede cachear 10 min y servir stale hasta 24 h mientras revalida.

---

## Cómo validar rate limit (manual o test)

- **Manual:** 61+ peticiones GET a `/api/exercises` en 1 minuto desde la misma IP (misma máquina o mismo `x-forwarded-for`) → la que exceda debe devolver 429 con `Retry-After` y evento `api_exercises_outcome` con `outcome: "rate_limited"`.
- **Test:** No hay test de integración 61→429 en este PR (depende de rate limiter real por IP). Validación manual documentada aquí; si se añade test unitario mockeando `checkRateLimit` en app route, se puede assert 429 y body.

---

## Riesgos / rollout (5 bullets)

- **Cache key estable:** Query params se normalizan por orden alfabético (`environment`, `q`); `?q=x&environment=GYM` y `?environment=GYM&q=x` comparten la misma clave. No se cachea por headers (no Vary).
- **Redis opcional:** Si Redis no está o falla, no hay cache de servidor; se sirve siempre desde DB (stale OK). Comportamiento idéntico al anterior sin cache.
- **Observabilidad sin PII:** Eventos `api_exercises_outcome` con `endpoint`, `outcome` (rate_limited | cache_hit | cache_miss), `requestId` opcional. No se guarda IP en estos eventos (el rate limiter sigue usando IP internamente).
- **Contrato público:** Ninguna ruta de exercises llama a auth/session; el endpoint sigue siendo público según specs/ADR.
- **Headers en 200:** Cache-Control se envía en todas las respuestas 200; 400/429 no llevan cache público.

---

## Checklist de calidad (pre-merge)

- [x] Contrato público intacto: ninguna ruta de exercises llama `requireAuth` ni session.
- [x] Rate limit aplicado a GET en `src/app/api/exercises/route.ts` antes de `getExercises`.
- [x] Cache key estable: params ordenados en `normalizeExercisesQueryString`; misma query → misma clave.
- [x] Cache headers correctos y presentes en 200: `Cache-Control: public, s-maxage=600, stale-while-revalidate=86400`.
- [x] Observabilidad: 429 y cache hit/miss vía `api_exercises_outcome` sin PII.
- [x] Test: respuesta 200 incluye Cache-Control esperado; tests existentes pasan.

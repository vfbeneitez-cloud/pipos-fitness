# PR Fase 1c — Harden cache /api/exercises

Sin parse doble en cache hit, manejo de cache corrupto y observabilidad en get/set. Contrato público intacto.

---

## Archivos tocados y por qué

| Archivo | Cambio |
|--------|--------|
| `src/server/api/exercises/route.ts` | `getExercisesCached(cacheKey, options.requestId)`. Cache hit: validar con `JSON.parse(cached)`; si OK → `new NextResponse(cached, { headers: { "Content-Type": "application/json" } })` + Cache-Control (sin doble parse/stringify). Si corrupt → `trackEvent(..., outcome: "cache_miss_corrupt")` y seguir con DB. `void setExercisesCached(cacheKey, JSON.stringify(exercises), options.requestId)` (errores manejados dentro del cache). Eliminado `logWarn` del route. |
| `src/server/lib/exercisesCache.ts` | Firmas con `requestId?`: `getExercisesCached(key, requestId?)`, `setExercisesCached(key, value, requestId?)`. En `catch` de ambos: `trackEvent("api_exercises_outcome", { endpoint: "/api/exercises", outcome: "cache_get_failed" \| "cache_set_failed", requestId? }, { sentry: true })` y `logWarn(requestId ?? "no-request-id", "...", { error: String(err) })`. Sin PII. |
| `src/server/api/exercises/route.test.ts` | Test "on cache corrupt": mock `getExercisesCached` devuelve `'{"'`, se espera 200, Cache-Control presente y `trackEvent` con `outcome: "cache_miss_corrupt"`. |
| `PR_FASE1C_ENTREGABLE.md` | Este documento. |

---

## Cómo probar manualmente

1. **Cache hit**  
   - Definir `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`.  
   - Llamar 2 veces a `GET /api/exercises` (misma URL).  
   - Segunda respuesta debe ser cache hit (observabilidad: `cache_hit`).  
   - Respuesta 200 con `Cache-Control` y `Content-Type: application/json`; body igual al string cacheado (sin re-serializar).

2. **Cache corrupto**  
   - Si tenéis tooling para inyectar en Redis: escribir en la clave `exercises:v1:_` un valor no-JSON (ej. `{`).  
   - Una petición a `GET /api/exercises` debe devolver 200 (fallback a DB), y en eventos debe aparecer `cache_miss_corrupt`.  
   - Alternativa: test unitario "on cache corrupt" (mock `getExercisesCached` con `'{"'`) ya cubre el flujo.

3. **Cache get/set fallido**  
   - Con Redis caído o vars vacías: peticiones siguen devolviendo 200 desde DB; en logs/eventos deben verse `cache_get_failed` o `cache_set_failed` según corresponda (con `requestId` si se envió).

---

## Riesgos / rollout (3 bullets)

- **Observabilidad en cache:** Errores de Redis (get/set) se registran con `trackEvent` + `logWarn`; no se tragan. Si Sentry recibe muchos `cache_get_failed`/`cache_set_failed`, revisar Redis y límites.
- **Cache corrupto:** Si el valor en Redis no es JSON válido, se emite `cache_miss_corrupt` y se sirve desde DB; el usuario sigue recibiendo 200. No se sirve body corrupto.
- **TTL y key:** Se mantienen (`exercises:v1:${normalizedQuery}`, TTL 600 s). Cambiar payload/versión implica actualizar `CACHE_VERSION` en `exercisesCache.ts` para invalidar claves antiguas.

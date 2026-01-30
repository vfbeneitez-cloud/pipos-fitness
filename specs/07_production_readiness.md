# 07 — Production Readiness (Checklist)

## 1) Environment & config

- [ ] `.env.example` completo (DATABASE_URL, DEMO_MODE, NEXT_PUBLIC_DEMO_MODE).
- [ ] En producción: `DEMO_MODE=false`, `NEXT_PUBLIC_DEMO_MODE=false`.
- [ ] `DATABASE_URL` desde secretos del proveedor (Vercel, Neon).
- [ ] No commitear `.env` ni credenciales.

## 2) Observabilidad

- [ ] Logger server-side estructurado (JSON) con `requestId`.
- [ ] No loggear PII ni payloads completos.
- [ ] Medición básica: duración de handlers, status por endpoint (vía `withSensitiveRoute` en rutas sensibles).
- [ ] Header `x-request-id` en respuestas API para trazabilidad.
- [ ] Producción: considerar error tracking (Sentry, etc.) y métricas (Vercel Analytics, etc.).

## 3) Rate limiting

- [ ] Rate limit por IP en endpoints sensibles: POST `/api/weekly-plan`, POST `/api/nutrition/swap`, POST `/api/training/log`, POST `/api/nutrition/log`.
- [ ] Implementación MVP: in-memory (30 req/min por IP). Límite y ventana configurables en código.
- [ ] Respuesta 429 `RATE_LIMIT_EXCEEDED` con header `Retry-After`.
- [ ] **Producción**: Upstash Redis opcional. Si `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` están configurados → rate limit distribuido (compartido entre instancias). Si no → fallback in-memory por instancia (30 req/min por IP y ruta). Ver `.env.example`.

## 4) Seguridad Next

- [ ] Headers: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
- [ ] CSP básica en `next.config.ts` (default-src 'self', script-src 'self', etc.).
- [ ] APIs que aceptan JSON: devolver 400 `INVALID_JSON` cuando el body no es JSON válido (ya implementado en weekly-plan, nutrition/swap, training/log, nutrition/log).

## 5) CI

- [ ] GitHub Actions: `lint`, `typecheck`, `test` en cada PR/push a main.
- [ ] Tests requieren `DATABASE_URL` (usar secret en CI o service container Postgres).
- [ ] Documentar comandos en README.

## 6) Deploy (Vercel + Neon)

- [ ] Conectar repo a Vercel.
- [ ] Crear proyecto en Neon, copiar `DATABASE_URL`.
- [ ] En Vercel: Variables de entorno: `DATABASE_URL`, `DEMO_MODE=false`, `NEXT_PUBLIC_DEMO_MODE=false`.
- [ ] Build command: `npm run build` (incluye `prisma generate`).
- [ ] Deploy: Vercel ejecuta migraciones si se configuran en build (o manual `prisma migrate deploy`).
- [ ] Seed: ejecutar manualmente una vez en DB de producción si aplica (`npx prisma db seed`).

## 7) Post-deploy

- [ ] Smoke: GET `/api/exercises` y GET `/api/weekly-plan?userId=...&weekStart=YYYY-MM-DD` (con usuario existente).
- [ ] Manual QA checklist (`specs/06_manual_qa_checklist.md`) en entorno de staging/producción con DEMO_MODE=false (flujo “Auth required”).

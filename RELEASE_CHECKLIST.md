# Release Checklist

## Security Regression Checklist

Antes de cada release, verificar:

- [ ] **DEMO_MODE**: `false` en producción; fail-fast activo (si `DEMO_MODE=true` en prod, la app lanza al arranque).
- [ ] **CRON_SECRET**: Rotación documentada; no loguear ni incluir en respuestas; no commitear en repos.
- [ ] **AUTH_SECRET / AUTH_URL**: Definidos en producción (ver § Environment Variables).
- [ ] **Ownership checks**: Recursos por id (p. ej. `planId` en TrainingLog) validan que el recurso pertenece al `userId` de la sesión; 403 si no.
- [ ] **Rate limit /api/exercises**: Pendiente Fase 1 si no se aplica en este release; documentar decisión (público vs auth vs 60/min).

**Fase 1 backlog (TODO):** Rate limit GET `/api/exercises` (60/min + cache); `schemaVersion` en WeeklyPlan JSON; refactor `agentWeeklyPlan` en capas (prompts, providers, planAdjuster, persistence, audit).

---

## Pre-Release (Local)

### 1. Code Quality

- [ ] `npm run lint` — sin errores
- [ ] `npm run typecheck` — sin errores
- [ ] `npm test` — todos los tests pasando

### 2. Database

- [ ] `npx prisma migrate status` — verificar que no hay migraciones pendientes
- [ ] `npx prisma db seed` (opcional) — si hay cambios en seed, probar localmente

### 3. Environment Variables Review

- [ ] `.env.example` está actualizado con todas las variables necesarias
- [ ] Verificar que no hay secretos hardcodeados en código

### 4. Demo Mode

- [ ] `DEMO_MODE=false` en producción; `NEXT_PUBLIC_DEMO_MODE=false`
- [ ] **Fail-fast**: Si `DEMO_MODE=true` en producción, la app lanza al arranque (`getSession`). Nunca crear usuario demo en prod.
- No hay endpoints `/api/demo` en este repo. `DEMO_MODE` solo afecta comportamiento interno/UI (p. ej. `requireAuth` devuelve userId demo cuando `DEMO_MODE=true`).

---

## Vercel Configuration

### Environment Variables (Settings → Environment Variables)

**Production:**

- [ ] `DATABASE_URL` — Connection string de Neon (Production)
- [ ] `AUTH_SECRET` — Secret generado (`openssl rand -base64 32`)
- [ ] `AUTH_URL` — URL de producción (ej: `https://tu-app.vercel.app`)
- [ ] `DEMO_MODE` — `false`
- [ ] `NEXT_PUBLIC_DEMO_MODE` — `false`
- `EMAIL_SERVER` / `EMAIL_FROM` — no aplican (solo Google OAuth)
- [ ] `OPENAI_API_KEY` — (opcional) Solo si se usa provider real de IA
- [ ] `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` — (opcional) DSN de Sentry para errores en producción

**Preview/Development:**

- [ ] Mismas variables con valores de desarrollo/preview

### Build Settings

- [ ] Framework Preset: Next.js
- [ ] Build Command: `npm run build` (default)
- [ ] Output Directory: `.next` (default)
- [ ] Install Command: `npm install` (default)

---

## Post-Deploy

### 1. Database Migrations

- [ ] Ejecutar migraciones en producción:
  ```bash
  DATABASE_URL="<prod-url>" npx prisma migrate deploy
  ```
- [ ] Verificar que las migraciones se aplicaron correctamente

### 2. Seed (Opcional, solo primera vez)

- [ ] Si es necesario seed inicial:
  ```bash
  DATABASE_URL="<prod-url>" npx prisma db seed
  ```

### 3. Health Checks

**Basic Health:**

- [ ] `GET https://tu-app.vercel.app/api/health`
  - Debe devolver `{ ok: true, version: "...", env: "production" }`
  - `env` debe ser `"production"` (no `"demo"`)

**Database Health:**

- [ ] `GET https://tu-app.vercel.app/api/health/db`
  - Debe devolver `{ ok: true }`
  - Si falla → revisar `DATABASE_URL`

**Public Endpoint:**

- [ ] `GET https://tu-app.vercel.app/api/exercises`
  - Debe devolver 200 con lista de ejercicios

**Auth Endpoint:**

- [ ] `GET https://tu-app.vercel.app/auth/signin`
  - Debe mostrar página de sign in (no error 500)

**Protected Endpoint (debe requerir auth):**

- [ ] `GET https://tu-app.vercel.app/api/weekly-plan?weekStart=2026-01-26`
  - Sin sesión → debe devolver 401 `UNAUTHORIZED`
  - Con sesión válida → debe devolver 200 o null

### 4. UI Checks

- [ ] Landing page (`/`) redirige a `/auth/signin` (no a `/week`)
- [ ] Sin sesión: `/onboarding` redirige a `/auth/signin`
- [ ] Con sesión: `/onboarding` muestra wizard y permite crear semana
- [ ] `/auth/signin` carga correctamente

---

## Rollback Plan

### Si hay problemas críticos:

1. **Revert en Vercel:**
   - Vercel Dashboard → Deployments → seleccionar deploy anterior → "Promote to Production"

2. **Revert Database Migrations (si aplica):**

   ```bash
   # Ver migraciones aplicadas
   DATABASE_URL="<prod-url>" npx prisma migrate status

   # Si necesitas revertir manualmente, crear migración nueva que revierta cambios
   # O restaurar backup de DB si está disponible
   ```

3. **Verificar Health:**
   - `GET /api/health` debe seguir funcionando
   - `GET /api/health/db` debe seguir funcionando

---

## Post-Rollback

- [ ] Documentar qué falló y por qué
- [ ] Crear issue/ticket para investigar
- [ ] Actualizar checklist si se identificaron gaps

---

## Notes

- **DEMO_MODE**: Nunca debe estar en `true` en producción. Si ves `env: "demo"` en `/api/health`, hay un problema de configuración.
- **AUTH_SECRET**: Debe ser único y secreto. Rotar si se compromete (ver README sección "How to rotate secrets").
- **Rotate secrets if leaked**: Si AUTH_SECRET, DATABASE_URL o API keys se filtran, rotar de inmediato en Vercel/Neon y regenerar (ver README "How to rotate secrets").
- **No hay /api/demo**: Este repo no incluye endpoints `/api/demo/*`; `DEMO_MODE` solo afecta lógica interna/UI.
- **Protección de rutas**: No hay `middleware.ts`. La protección se hace vía layouts (App Router) y redirect server-side (p. ej. `(app)/layout.tsx` redirige a signin sin sesión).
- **DATABASE_URL**: Verificar que apunta a la base de datos correcta (no a desarrollo).
- **Health endpoints**: Usar `/api/health` y `/api/health/db` para monitoreo continuo (ej: UptimeRobot, Pingdom).

---

## Production Monitoring (Sentry + Uptime + Vercel)

### Sentry (errores frontend/backend)

- [ ] Cuenta en [Sentry.io](https://sentry.io) y proyecto creado
- [ ] En Vercel: `SENTRY_DSN` y `NEXT_PUBLIC_SENTRY_DSN` con el DSN del proyecto
- [ ] Errores no manejados se envían a Sentry; en API routes usar `Sentry.captureException(error)` en catch de 500
- [ ] Probar server-side: en staging/dev pon `SENTRY_DEBUG=true` y llama `GET /api/_debug/sentry` → debe aparecer un evento en Sentry Issues (en prod sin `SENTRY_DEBUG` ese endpoint devuelve 404)
- [ ] (Opcional) `SENTRY_ORG` y `SENTRY_PROJECT` + `SENTRY_AUTH_TOKEN` en CI para subir source maps

### Uptime Monitoring (UptimeRobot u otro)

- [ ] Cuenta en [UptimeRobot](https://uptimerobot.com) (o similar)
- [ ] Monitor HTTP para `GET https://tu-app.vercel.app/api/health` — intervalo 5 min, alerta si no 200
- [ ] Monitor HTTP para `GET https://tu-app.vercel.app/api/health/db` — intervalo 5 min, alerta si no 200
- [ ] Alertas por correo o Slack cuando un endpoint no responde o devuelve error

### Vercel logs y alertas

- [ ] En Vercel Dashboard: habilitar logs para Deployments
- [ ] No imprimir en logs variables sensibles (`AUTH_SECRET`, `DATABASE_URL`, API keys); el logger actual no las incluye
- [ ] (Opcional) Configurar alertas por correo en Vercel para fallos de deploy o errores

---

## Scripts útiles

```bash
# Verificar migraciones pendientes
npx prisma migrate status

# Aplicar migraciones en producción
DATABASE_URL="<prod-url>" npx prisma migrate deploy

# Seed en producción (solo primera vez)
DATABASE_URL="<prod-url>" npx prisma db seed

# Verificar health localmente
curl http://localhost:3000/api/health
curl http://localhost:3000/api/health/db
```

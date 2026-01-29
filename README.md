## Pipos Fitness — Entrenamiento + Nutrición

App Next.js para planes semanales de entrenamiento y nutrición, con backend en Prisma/PostgreSQL (Neon).

### 1) Requisitos

- **Node**: versión LTS recomendada.
- **Base de datos**: PostgreSQL (p.ej. Neon).
- **Variables de entorno**: copiar desde `.env.example` y ajustar.
  - `DATABASE_URL` — cadena de conexión a Postgres (no se commitea; usar `.env` local).
  - `DEMO_MODE` — `true` en desarrollo para habilitar `/api/demo/*` y onboarding sin auth; en producción usar `false`.
  - `NEXT_PUBLIC_DEMO_MODE` — mismo valor que `DEMO_MODE` para que la UI muestre onboarding o "Auth required" según corresponda.

Si `DEMO_MODE=false`, los endpoints `/api/demo/*` devuelven 403 y `/onboarding` muestra "Auth required" (placeholder hasta tener auth real).

### 2) Instalar dependencias

```bash
npm install
```

### 3) Migraciones y seed de base de datos

> Las migraciones están definidas en `prisma/` y configuradas vía `prisma.config.ts`.

- **Ejecutar migraciones en desarrollo**:

```bash
npx prisma migrate dev
```

- **Aplicar migraciones en otros entornos**:

```bash
npx prisma migrate deploy
```

- **Seed de datos (ejercicios + media)**:

```bash
npx prisma db seed
```

### 4) Servidor de desarrollo

```bash
npm run dev
```

La app se sirve en `http://localhost:3000`.

### 5) Lint y typecheck

- **Lint**:

```bash
npm run lint
```

- **Lint (autofix)**:

```bash
npm run lint:fix
```

- **Typecheck (TypeScript)**:

```bash
npm run typecheck
```

### 6) Tests

Los tests usan Vitest (`vitest.config.ts`).

- **Ejecutar suite completa una vez**:

```bash
npm test
```

- **Modo watch**:

```bash
npm run test:watch
```

### 7) CI (GitHub Actions)

En cada PR y push a `main` se ejecuta:

- `npm run lint`
- `npm run typecheck`
- `npm run test` (requiere `DATABASE_URL` en Secrets del repo)

Configurar en el repositorio: **Settings → Secrets and variables → Actions → DATABASE_URL** (cadena de conexión Postgres, p.ej. Neon).

### 8) Deploy to Vercel + Neon

1. **Neon**
   - Crear proyecto en [Neon](https://neon.tech).
   - Copiar la cadena de conexión (Connection string) de la base de datos.

2. **Vercel**
   - Conectar el repo en [Vercel](https://vercel.com).
   - En el proyecto: **Settings → Environment Variables**:
     - `DATABASE_URL`: cadena de Neon (Production, Preview, Development).
     - `DEMO_MODE`: `false` en Production (y en Preview si no quieres demo).
     - `NEXT_PUBLIC_DEMO_MODE`: `false` en Production (mismo valor que `DEMO_MODE`).
   - Deploy: Vercel ejecuta `npm run build` (incluye `prisma generate`).

3. **Migraciones**
   - Tras el primer deploy, ejecutar migraciones contra la DB de producción:
     - Localmente con `DATABASE_URL` de prod: `npx prisma migrate deploy`.
     - O en un script de post-deploy si lo configuras.
   - Seed (opcional, una vez): `npx prisma db seed` con `DATABASE_URL` de prod.

4. **Comprobación**
   - GET `https://tu-app.vercel.app/api/exercises` debe devolver 200.
   - Con `DEMO_MODE=false`, `/onboarding` muestra "Auth required".

**Checklist completo de release:** Ver `RELEASE_CHECKLIST.md` para checklist ejecutable paso a paso.

Documentación adicional en `specs/07_production_readiness.md`.

### 9) Production environment variables

Para producción (Vercel), configurar en **Settings → Environment Variables**:

**Requeridas:**

- `DATABASE_URL` — Connection string de Neon (Production)
- `AUTH_SECRET` — Secret para NextAuth.js (generar con `openssl rand -base64 32`)
- `AUTH_URL` — URL canónica de producción (ej: `https://tu-app.vercel.app`)
- `DEMO_MODE` — `false` (nunca `true` en producción)
- `NEXT_PUBLIC_DEMO_MODE` — `false` (mismo valor que `DEMO_MODE`)

**Email (requerido para magic links):**

- `EMAIL_SERVER` — SMTP server (ej: `smtp://user:pass@smtp.example.com:587`)
- `EMAIL_FROM` — Email remitente (ej: `noreply@yourdomain.com`)
- O usar variables individuales: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`

**Opcionales:**

- `OPENAI_API_KEY` — Solo si se usa provider real de IA (si no, usa mock)

Ver `.env.example` para referencia completa.

### 10) Health endpoints

La aplicación expone endpoints de health para monitoreo:

- **`GET /api/health`** — Health básico (sin DB)
  - Respuesta: `{ ok: true, version: "...", env: "production" | "demo" }`
  - Útil para verificar que la app está corriendo y el modo (demo vs producción)

- **`GET /api/health/db`** — Health de base de datos
  - Respuesta: `{ ok: true }` o `{ ok: false, error: "DB_CONNECTION_FAILED" }` (503)
  - Protegido por rate limiting
  - Útil para verificar conectividad a la base de datos

### 11) How to rotate secrets

**AUTH_SECRET:**

1. Generar nuevo secret: `openssl rand -base64 32`
2. Actualizar en Vercel: Settings → Environment Variables → `AUTH_SECRET`
3. Redeploy (los usuarios existentes necesitarán re-autenticarse)

**DATABASE_URL:**

1. Crear nueva base de datos en Neon
2. Ejecutar migraciones: `DATABASE_URL="<new-url>" npx prisma migrate deploy`
3. Migrar datos si es necesario
4. Actualizar en Vercel: Settings → Environment Variables → `DATABASE_URL`
5. Redeploy
6. Verificar health endpoints

**EMAIL credentials:**

1. Actualizar en Vercel: Settings → Environment Variables → `EMAIL_SERVER` o `SMTP_*`
2. Redeploy
3. Probar magic link en producción

### 12) Architecture decisions

Las decisiones de arquitectura se documentan como ADRs en `adrs/`:

- `ADR-0001-monorepo-architecture.md` — estructura Next.js + separación `src/core`, `src/server`, `src/app`.
- `ADR-0002-db-neon-prisma.md` — Postgres en Neon + Prisma v7 y configuración actual.
- `ADR-0003-api-style.md` — estilo de APIs HTTP, validación con Zod y convención de errores.
- `ADR-0004-testing-strategy.md` — estrategia de testing con Vitest.
- `ADR-0005-safety-constraints.md` — restricciones de seguridad para entrenamiento/nutrición.
- `ADR-0006-auth.md` — autenticación con NextAuth.js y email magic link.

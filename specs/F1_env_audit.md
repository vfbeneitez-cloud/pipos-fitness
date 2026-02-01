# MVP Readiness - F1 Env Audit

## Fuentes revisadas

- `.env.example`
- `DEPLOY_VERCEL.md`
- `vercel.json`
- `next.config.ts`
- `specs/07_production_readiness.md`
- `README.md`
- `RELEASE_CHECKLIST.md`
- `BETA_CHECKLIST.md`

---

## 1. Variables requeridas por categoría

### Base de datos

| Variable       | Requerida | Uso |
|----------------|-----------|-----|
| `DATABASE_URL` | Sí        | Prisma/Neon connection string (app + tests). |

### Auth y modo demo

| Variable               | Requerida (prod sin demo) | Uso |
|------------------------|---------------------------|-----|
| `DEMO_MODE`            | Sí (false en prod)        | Habilita `/api/demo/*` y onboarding demo. |
| `NEXT_PUBLIC_DEMO_MODE`| Sí (false en prod)        | UI: onboarding vs "Auth required". |
| `AUTH_SECRET`          | Sí (prod con Google)     | NextAuth secret (`openssl rand -base64 32`). |
| `AUTH_URL`             | Sí (prod)                 | URL base de la app (ej. `https://tu-app.vercel.app`). |
| `GOOGLE_CLIENT_ID`     | Sí (prod sin demo)        | Google OAuth Client ID. |
| `GOOGLE_CLIENT_SECRET` | Sí (prod sin demo)        | Google OAuth Client Secret. |

### Sentry (opcional)

| Variable                 | Requerida | Uso |
|--------------------------|-----------|-----|
| `SENTRY_DSN`             | No        | DSN server (API/SSR). |
| `NEXT_PUBLIC_SENTRY_DSN` | No        | Mismo DSN para cliente. |
| `SENTRY_ORG`             | No        | Source maps (next.config.ts). |
| `SENTRY_PROJECT`         | No        | Source maps (next.config.ts). |
| `SENTRY_DEBUG`           | No        | Solo staging/dev: activa GET `/api/_debug/sentry`. No en prod. |

### Rate limit (opcional)

| Variable                   | Requerida | Uso |
|----------------------------|-----------|-----|
| `UPSTASH_REDIS_REST_URL`   | No        | Si ambas están: rate limit distribuido. |
| `UPSTASH_REDIS_REST_TOKEN` | No        | Si no: in-memory por instancia (30 req/min por IP). |

### Cron (opcional)

| Variable                   | Requerida | Uso |
|----------------------------|-----------|-----|
| `CRON_SECRET`              | Sí si cron| Debe coincidir con header `x-cron-secret` o Authorization. |
| `CRON_WEEKLY_REGEN_ENABLED`| Sí si cron| `true` para que POST `/api/cron/weekly-regenerate` exista; si no `"true"` → 404. |

### IA (opcional)

| Variable         | Requerida | Uso |
|------------------|-----------|-----|
| `OPENAI_API_KEY` | No        | Si no está: mock provider (determinístico, sin llamadas). |

### Otros (automáticos o opcionales)

| Variable   | Requerida | Uso |
|------------|-----------|-----|
| `NODE_ENV` | No (Next/Vercel) | development \| test \| production. |

---

## 2. Faltan o ambiguas en `.env.example`

- **`AUTH_URL`**  
  - En `.env.example` solo dice "AUTH_URL=http://localhost:3000 (or your production URL)".  
  - **Falta:** aclarar que en Vercel debe ser la URL de producción (ej. `https://tu-app.vercel.app`) y que en local puede ser `http://localhost:3000`.

- **Email (magic link)**  
  - **Inconsistencia:** `.env.example` dice "Deprecated — do not use (Google OAuth only): EMAIL_SERVER, EMAIL_FROM".  
  - `DEPLOY_VERCEL.md` y `RELEASE_CHECKLIST.md` listan `EMAIL_SERVER` y `EMAIL_FROM` como variables de producción.  
  - **Ambiguo:** si el producto es solo Google OAuth, conviene quitar email de la doc de deploy o dejar en `.env.example` una línea: "No usadas con Google OAuth: EMAIL_SERVER, EMAIL_FROM (ignorar si solo OAuth)."

- **Cron**  
  - `.env.example` documenta `CRON_SECRET` y `CRON_WEEKLY_REGEN_ENABLED` bien.  
  - **Falta:** indicar que el valor de `CRON_SECRET` debe ser fuerte (ej. `openssl rand -base64 32`) y que Vercel Cron puede inyectar el secret vía header Authorization.

- **Sentry**  
  - `.env.example` tiene DSN y opcionales.  
  - **Falta:** aclarar que `SENTRY_ORG` y `SENTRY_PROJECT` se usan en `next.config.ts` para upload de source maps (pueden quedar vacíos si no se suben maps).

- **Upstash**  
  - Está claro: o se definen ambas `UPSTASH_REDIS_*` o se usa in-memory. Nada que corregir.

---

## 3. Valores de ejemplo seguros (sin secretos reales)

Usar solo para rellenar `.env.example` o documentación; nunca en producción.

```env
# Database
DATABASE_URL="postgresql://user:password@host.neon.tech/dbname?sslmode=require"

# Demo (local/dev)
DEMO_MODE=true
NEXT_PUBLIC_DEMO_MODE=true

# Auth (producción: false para DEMO_*, rellenar AUTH_* y Google)
AUTH_SECRET="replace-with-openssl-rand-base64-32"
AUTH_URL="https://your-app.vercel.app"

# Google OAuth (solo producción sin demo)
GOOGLE_CLIENT_ID="123456789-xxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx"

# Sentry (opcional)
SENTRY_DSN="https://key@xxx.ingest.sentry.io/123"
NEXT_PUBLIC_SENTRY_DSN="https://key@xxx.ingest.sentry.io/123"
SENTRY_ORG="your-org"
SENTRY_PROJECT="your-project"
# SENTRY_DEBUG=true  # solo staging/dev

# Rate limit (opcional)
UPSTASH_REDIS_REST_URL="https://xxxx.upstash.io"
UPSTASH_REDIS_REST_TOKEN="replace-with-token"

# Cron (opcional)
CRON_SECRET="replace-with-openssl-rand-base64-32"
CRON_WEEKLY_REGEN_ENABLED=true

# IA (opcional)
# OPENAI_API_KEY=sk-...
```

---

## 4. Resumen por tema solicitado

- **DATABASE_URL:** Requerida. En `.env.example` está; formato correcto. Valor de ejemplo seguro: connection string genérica con `user`, `password`, `host.neon.tech`, `dbname`, `?sslmode=require`.

- **OAuth (Google):** `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` requeridos en prod sin demo. En `.env.example` están comentados con placeholder; falta aclarar que son obligatorios cuando `DEMO_MODE=false`.

- **Sentry (DSN, env):** Opcional. `SENTRY_DSN` y `NEXT_PUBLIC_SENTRY_DSN` documentados; `SENTRY_ORG` / `SENTRY_PROJECT` usados en `next.config.ts` (source maps). Faltan en la doc: que pueden ir vacíos y que `environment` en Sentry se toma de `NODE_ENV` en los configs de cliente/edge/server.

- **Rate limit (Upstash):** Opcional. Ambas `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` en `.env.example`; sin ellas, fallback in-memory. Valores de ejemplo seguros: URL y token placeholders.

- **Secretos de cron:** `CRON_SECRET` obligatorio si se usa cron; `CRON_WEEKLY_REGEN_ENABLED=true` para exponer el endpoint. En `.env.example` están; falta recomendar generación con `openssl rand -base64 32`. Valor de ejemplo seguro: placeholder, no un secreto real.

---

## 5. `vercel.json` y `next.config.ts`

- **vercel.json:** Solo crons: path `/api/cron/weekly-regenerate`, schedule `0 5 * * 1`. No define env; las variables se configuran en Vercel Dashboard.
- **next.config.ts:** Usa `SENTRY_ORG` y `SENTRY_PROJECT` (vacíos por defecto). No lee otras env; el resto viene de runtime.

# Guía de Despliegue en Vercel

## Paso 1: Preparar Neon (Base de Datos de Producción)

1. Ir a [Neon Console](https://console.neon.tech)
2. Crear un nuevo proyecto (o usar uno existente) para **producción**
3. Copiar la **Connection String** (ej: `postgresql://user:pass@host.neon.tech/dbname?sslmode=require`)
4. **Importante**: Esta debe ser una DB diferente a la de desarrollo

## Paso 2: Crear Proyecto en Vercel

### 2.1. Preparar el repositorio (si aún no está en Git)

Si tu código aún no está en GitHub/GitLab/Bitbucket:

1. **Crear repositorio en GitHub:**
   - Ir a [GitHub](https://github.com)
   - Click en **"+"** → **"New repository"**
   - Nombre: `pipos-fitness` (o el que prefieras)
   - Crear repositorio

2. **Conectar tu código local:**
   ```bash
   # En la raíz del proyecto (e:\app fitness\pipos_fitness)
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/pipos-fitness.git
   git push -u origin main
   ```

### 2.2. Importar en Vercel

1. Ir a [Vercel Dashboard](https://vercel.com/dashboard)
2. Click en **"Add New..."** → **"Project"**
3. Si es la primera vez:
   - Click en **"Import Git Repository"**
   - Conectar tu cuenta de GitHub/GitLab/Bitbucket si aún no está conectada
   - Autorizar acceso a repositorios
4. Buscar tu repositorio (`pipos-fitness` o el nombre que usaste)
5. Click en **"Import"**
6. Vercel detectará automáticamente Next.js y configurará el proyecto

### 2.3. Conectar con Vercel vía CLI

Si prefieres enlazar el proyecto desde la terminal:

> **PowerShell:** Ejecuta **solo** los comandos que están dentro de los bloques de código (copiando línea por línea). No pegues en la terminal las frases de explicación (por ejemplo «Set up and deploy? → Yes»), o PowerShell intentará ejecutarlas y dará error.

1. **Iniciar sesión en Vercel (una vez)** — desde la carpeta del proyecto. Ejecuta primero el `cd`, luego el login:

   ```bash
   cd "e:\app fitness\pipos_fitness"
   ```

   ```bash
   npx vercel login
   ```

   Se abrirá el navegador o te pedirá el código/magic link.

2. **Enlazar el proyecto.** Un solo comando:

   ```bash
   npx vercel link
   ```

   Responde en los prompts (no pegues estas líneas en la terminal; son solo referencia):
   - Set up and deploy? → **Yes**
   - Which scope? → tu cuenta/equipo (ej. benevi's projects)
   - Link to existing project? → **Yes** si ya existe en el dashboard, **No** para crear uno nuevo
   - Si elegiste Yes: nombre del proyecto (ej. `pipos-fitness`)

3. **O enlazar sin prompts** (si ya sabes el nombre del proyecto en Vercel):

   ```bash
   npx vercel link --project pipos-fitness --yes
   ```

   Sustituye `pipos-fitness` por el nombre real del proyecto.

## Paso 3: Configurar Environment Variables

En Vercel: **Settings → Environment Variables**

### Variables para Production:

1. **`DATABASE_URL`**
   - Valor: Connection string de Neon (producción)
   - Environment: ✅ Production

2. **`AUTH_SECRET`**
   - Generar: `openssl rand -base64 32` (en terminal)
   - Valor: El resultado del comando
   - Environment: ✅ Production

3. **`AUTH_URL`**
   - Valor: Tu dominio Vercel (ej: `https://tu-app.vercel.app`)
   - Environment: ✅ Production
   - Nota: Vercel puede detectarlo automáticamente, pero es mejor ponerlo explícito

4. **`DEMO_MODE`**
   - Valor: `false`
   - Environment: ✅ Production

5. **`NEXT_PUBLIC_DEMO_MODE`**
   - Valor: `false`
   - Environment: ✅ Production

6. **Email (magic link)** — una de las dos opciones:

   **Opción A (recomendada):**
   - **`EMAIL_SERVER`**: cadena SMTP completa, ej: `smtp://USER:PASSWORD@smtp.gmail.com:587` o `smtps://USER:PASSWORD@smtp.gmail.com:465`
   - **`EMAIL_FROM`**: ej: `no-reply@tudominio.com` (o tu email verificado)

   **Opción B (variables separadas):**
   - **`SMTP_HOST`** (ej: `smtp.gmail.com`)
   - **`SMTP_PORT`** (ej: `587` o `465`)
   - **`SMTP_USER`**
   - **`SMTP_PASSWORD`**
   - **`EMAIL_FROM`**: ej: `no-reply@tudominio.com`

   Environment: ✅ Production

7. **`OPENAI_API_KEY`** (opcional)
   - Valor: Tu API key de OpenAI (solo si usas provider real)
   - Environment: ✅ Production

8. **Sentry** (opcional, monitoreo de errores)
   - `SENTRY_DSN` y `NEXT_PUBLIC_SENTRY_DSN`: DSN del proyecto en [Sentry.io](https://sentry.io)
   - En API routes, para errores 500: `Sentry.captureException(error);`
   - Ver RELEASE_CHECKLIST.md → Production Monitoring (Sentry + Uptime + Vercel)

### Variables para Preview/Development (opcional):

Repetir las mismas variables con valores de desarrollo/preview si quieres.

---

## Staging (Preview) bien montado

Configura un entorno Preview en Vercel con su propia base de datos para probar sin tocar producción.

### Paso 1 — Neon staging

1. Ir a [Neon Console](https://console.neon.tech)
2. En tu proyecto, crear un **nuevo branch** (ej: `staging`) o un **nuevo proyecto** dedicado a staging
3. Copiar la **Connection string** de ese branch/proyecto (ej: `postgresql://user:pass@host.neon.tech/dbname?sslmode=require`)
4. Guardar ese valor como **`DATABASE_URL`** para el entorno **Preview** en Vercel (Paso 2)

### Paso 2 — Variables en Vercel (Preview)

En **Vercel → Settings → Environment Variables → Preview** añade:

- **`DATABASE_URL`** = `<staging-connection-string>` (del Paso 1)
- **`SENTRY_DSN`** = `<DSN-staging>` (crear proyecto staging en Sentry o usar el mismo)
- **`NEXT_PUBLIC_SENTRY_DSN`** = `<DSN-staging>` (mismo valor)
- **`SENTRY_DEBUG`** = `true` (para activar `/api/_debug/sentry`)

**Importante**: En **Production** NO pongas `SENTRY_DEBUG` (el endpoint devuelve 404 en prod).

### Paso 3 — Deploy preview

1. Crear un PR (Pull Request) en GitHub hacia `main`
2. Vercel generará automáticamente una URL de preview (ej: `https://pipos-fitness-git-feature-abc.vercel.app`)
3. Esperar a que el build termine

### Paso 4 — Cómo probar el Preview sin tocar la app

Elige **una** opción:

- **Opción A (recomendada): Navegador logueado en Vercel**
  Abre la URL preview en Chrome; asegúrate de estar logueado en [Vercel](https://vercel.com) con tu cuenta. Ya podrás navegar y probar UI + auth.

- **Opción B: Hacer el preview público**
  Vercel → **Project → Settings → Deployment Protection**. Desactiva protection (o cambia a “Only Production protected”). Vuelves a probar desde cualquier navegador/curl.

- **Opción C: Probar APIs con `vercel curl`**
  Para endpoints de health/debug va perfecto:
  ```bash
  npx vercel curl /api/health --deployment "https://TU-PREVIEW-URL.vercel.app"
  ```

### Paso 5 — Checks staging (rápidos)

En preview (usando navegador logueado en Vercel o desprotegiendo):

- [ ] **GET /api/health** → 200, `env` debería ser `"preview"` (y `nodeEnv`, `vercelEnv` presentes)
- [ ] **GET /api/health/db** → 200 `{ ok: true }`
- [ ] **GET /api/\_debug/sentry** → 200 solo si en Preview env vars tienes **`SENTRY_DEBUG=true`**; si no, 404
- [ ] En **Sentry** (staging): ver evento en **Issues**

Si todo OK, staging está listo para probar cambios sin afectar producción.

---

## Paso 4: Deploy Inicial

1. Click en **"Deploy"** en Vercel
2. Esperar a que el build termine
3. Anotar la URL de producción (ej: `https://tu-app.vercel.app`)

## Paso 5: Ejecutar Migraciones en Producción

**IMPORTANTE**: Después del primer deploy, ejecutar migraciones:

```bash
# Reemplazar <prod-url> con tu DATABASE_URL de producción
DATABASE_URL="postgresql://user:pass@host.neon.tech/dbname?sslmode=require" npx prisma migrate deploy
```

Verificar que se aplicaron:

```bash
DATABASE_URL="<prod-url>" npx prisma migrate status
```

## Paso 6: Seed (Opcional, solo primera vez)

Si necesitas datos iniciales (ejercicios):

```bash
DATABASE_URL="<prod-url>" npx prisma db seed
```

## Paso 7: Verificación Post-Deploy

### Health Checks:

```bash
# Health básico (debe mostrar env: "production")
curl https://tu-app.vercel.app/api/health

# Health de DB (debe devolver { ok: true })
curl https://tu-app.vercel.app/api/health/db

# Endpoint público
curl https://tu-app.vercel.app/api/exercises

# Auth endpoint (debe cargar página)
curl -I https://tu-app.vercel.app/auth/signin

# Demo endpoint (debe devolver 403)
curl https://tu-app.vercel.app/api/demo/session
```

### Verificaciones Manuales:

1. **`/api/health`**
   - Debe devolver: `{ "ok": true, "version": "0.1.0", "env": "production" }`
   - Si `env` es `"demo"` → `DEMO_MODE` está mal configurado

2. **`/api/health/db`**
   - Debe devolver: `{ "ok": true }`
   - Si falla → revisar `DATABASE_URL`

3. **`/api/exercises`**
   - Debe devolver 200 con lista de ejercicios

4. **`/auth/signin`**
   - Debe mostrar página de sign in (no error 500)

5. **`/api/demo/session`**
   - Debe devolver: `{ "error": "DEMO_DISABLED" }` con status 403

6. **`/api/weekly-plan?weekStart=2026-01-26`**
   - Sin sesión → debe devolver 401 `UNAUTHORIZED`

7. **`/` (landing)**
   - Debe redirigir a `/auth/signin` (no a `/week`)

8. **`/onboarding`**
   - Debe mostrar "Auth required" (no formulario demo)

## Troubleshooting

### Build falla:

- Verificar que todas las variables de entorno están configuradas
- Revisar logs de build en Vercel Dashboard

### Health devuelve `env: "demo"`:

- Verificar que `DEMO_MODE=false` y `NEXT_PUBLIC_DEMO_MODE=false` en Production

### `/api/health/db` falla:

- Verificar `DATABASE_URL` apunta a DB correcta
- Verificar que las migraciones se ejecutaron

### `/api/demo/session` no devuelve 403:

- Verificar `DEMO_MODE=false` en Production
- Hacer redeploy después de cambiar variables

## Paso 6 — Configurar el Cron en Vercel (clicks exactos)

**Nota:** Vercel Cron funciona en Production (y según plan, a veces también en Preview/Pro). Si no te deja en Preview, usa un scheduler externo (GitHub Actions / UptimeRobot / cron-job.org) para staging.

### Opción A — Vercel Cron (ideal)

1. Ve a **Vercel Dashboard** → tu proyecto **pipos-fitness**
2. Entra en **Settings** → **Cron Jobs** (o “Cron Jobs” en el menú lateral si aparece)
3. Click **Add Cron Job**
4. Configura:
   - **Path:** `/api/cron/weekly-regenerate`
   - **Schedule:** cada lunes a las 06:00 (Madrid). En UTC: `0 5 * * 1` (lunes 05:00 UTC = 06:00 Madrid invierno).
   - **Secret:** Vercel añade `CRON_SECRET` a las invocaciones del cron en el header **Authorization**. Nuestro endpoint acepta ese header (Bearer o valor directo) y también **x-cron-secret** para schedulers externos. No hace falta configurar headers a mano si usas la variable `CRON_SECRET` en el proyecto.
5. **Alternativa en repo:** ya existe `vercel.json` con el cron declarado (`path` y `schedule`). Si lo usas, el job se crea al hacer deploy; solo asegura `CRON_SECRET` y `CRON_WEEKLY_REGEN_ENABLED=true` en Production.
6. Guarda.
7. En **Settings → Environment Variables**, en **Production**:
   - **`CRON_WEEKLY_REGEN_ENABLED`** = `true`
   - **`CRON_SECRET`** = `<valor largo aleatorio>` (generar con `openssl rand -base64 32`)
8. Deploy (si no se redeploya solo).

**Verificación:**

- Vercel → **Cron Jobs** → **Runs / Logs**: debe verse status **200** y un body con `{ ok: true, processed, ... }`
- En DB: `lastGeneratedAt` y `lastRationale` actualizados en los planes.

### Opción B — Scheduler externo (staging o si no tienes Cron en plan)

Para **Preview/staging** o si tu plan Vercel no incluye Cron:

- **GitHub Actions:** workflow que hace `curl -X POST -H "x-cron-secret: ${{ secrets.CRON_SECRET }}" https://tu-preview-url.vercel.app/api/cron/weekly-regenerate` (schedule: `0 6 * * 1`)
- **UptimeRobot / cron-job.org:** crear job tipo “HTTP(s)” que llame a la URL con método POST y header `x-cron-secret`. Programar cada lunes 06:00.
- En el proyecto de **Preview** en Vercel: definir **`CRON_WEEKLY_REGEN_ENABLED`** y **`CRON_SECRET`** en Environment Variables para Preview.

## Paso 7 — Verificación operativa del cron (sin suposiciones)

### 7.1 Verifica que el cron existe en Vercel

- **Vercel Dashboard** → tu proyecto
- **Cron Jobs** (o Deployments → el último deploy → “Cron”)
- Debes ver una entrada:
  - **Path:** `/api/cron/weekly-regenerate`
  - **Schedule:** `0 5 * * 1`
- Si no aparece: es que `vercel.json` no está en la raíz del proyecto o no se desplegó ese commit.

### 7.2 Ejecuta una prueba manual inmediata (sin esperar al lunes)

Como el endpoint está protegido por secret, prueba desde local contra producción o staging.

**PowerShell (Authorization Bearer):**

```powershell
$headers = @{ Authorization = "Bearer $env:CRON_SECRET" }
Invoke-RestMethod -Method Post -Uri "https://pipos-fitness.vercel.app/api/cron/weekly-regenerate" -Headers $headers
```

Si no tienes `CRON_SECRET` en tu env local, ponlo directo (solo para test local).

**Esperado:** `{ "ok": true, "processed": N, "succeeded": M, "failed": K }`

Si te devuelve **404:** te falta `CRON_WEEKLY_REGEN_ENABLED=true` en ese entorno.

### 7.3 Verifica que realmente tocó DB (no solo 200)

El 200 no basta. Confirma efecto:

- Abre **Prisma Studio** en local apuntando a la misma DB (o consulta DB):
  - `WeeklyPlan.lastGeneratedAt` debe cambiar a “ahora”
  - `WeeklyPlan.lastRationale` debe existir/actualizarse
- **Alternativa rápida vía app:** entra en `/week` y comprueba el panel “Última actualización del plan” con fecha reciente.

### 7.4 Observabilidad: confirma que no hay fallos silenciosos

- **Vercel** → Deployments → **Functions logs**: filtra por `/api/cron/weekly-regenerate`; busca statusCode=200 y duración.
- **Sentry:** si `failed > 0`, idealmente debería haber eventos capturados (si en catch capturas excepción; si no, se puede añadir en un paso posterior).

## Próximos Pasos

- Configurar dominio personalizado (opcional)
- Configurar monitoreo continuo (UptimeRobot, Pingdom) usando `/api/health`
- Revisar logs en Vercel Dashboard para errores

### Siguiente paso realista de producto

Con infra + auth + observabilidad cerrados, lo que más valor da:

- **Página “Perfil” real** (no solo onboarding): editar preferencias → botón **“Regenerar plan semana”** → llama **`/api/agent/weekly-plan`**.
- **Métrica simple**: adherencia semanal + “siguiente plan” generado.

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

### Paso 4 — Verificación staging

En la URL de preview, verificar:

- [ ] `GET /api/health` → `{ ok: true, env: "production" }` (o "demo" si DEMO_MODE=true)
- [ ] `GET /api/health/db` → `{ ok: true }`
- [ ] `GET /api/_debug/sentry` → `200 { ok: true, message: "Test exception sent to Sentry (check Issues)" }`
- [ ] En **Sentry** (proyecto staging) → **Issues**: debe aparecer el evento de prueba

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

## Próximos Pasos

- Configurar dominio personalizado (opcional)
- Configurar monitoreo continuo (UptimeRobot, Pingdom) usando `/api/health`
- Revisar logs en Vercel Dashboard para errores

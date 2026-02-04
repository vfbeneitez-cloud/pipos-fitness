# Auditoría de la aplicación Pipos Fitness

Auditoría al detalle: fallos, correcciones y mejoras.

---

## 1. Fallos

### 1.1 Training log: planId sin verificación de propiedad

**Archivo:** `src/server/api/training/log.ts` — `createTrainingLog`

Si el cliente envía `planId`, se comprueba que el plan exista (`findUnique({ where: { id: planId } })`) pero **no** que pertenezca al usuario (`plan.userId === userId`). Un usuario podría asociar su log al plan de otro.

**Corrección:** Tras obtener el plan, comprobar `plan.userId === userId`. Si no coincide, devolver 403/404 (ej. `PLAN_NOT_FOUND`).

---

### 1.2 Imágenes: hostname demasiado permisivo

**Archivo:** `next.config.ts` — `images.remotePatterns`

Existe un patrón con `hostname: "**"` que permite cualquier host HTTPS. Aumenta riesgo si las URLs pudieran venir de fuentes no controladas.

**Corrección:** Restringir a dominios conocidos (p. ej. `upload.wikimedia.org`, `img.youtube.com`, `i.ytimg.com`) y quitar el patrón `hostname: "**"` en producción.

---

### 1.3 Cron: comparación del secret no timing-safe

**Archivo:** `src/app/api/cron/weekly-regenerate/route.ts`

El secret se compara con `secret !== expected`. Para secretes largos el riesgo es bajo, pero la comparación por tiempo puede dar pistas si el secret es corto.

**Corrección:** Usar `crypto.timingSafeEqual` con buffers de la misma longitud.

---

### 1.4 GET /api/profile sin rate limit

**Archivo:** `src/app/api/profile/route.ts`

GET `/api/profile` no usa `withSensitiveRoute`; PUT y POST sí. El perfil contiene datos de salud (objetivo, lesiones, alergias). Abuso por scraping podría ser un problema de privacidad.

**Corrección:** Envolver GET en `withSensitiveRoute` o documentar por qué no se limita.

---

## 2. Correcciones recomendadas

### 2.1 Profile: PUT y POST duplicados

**Archivo:** `src/app/api/profile/route.ts`

PUT y POST hacen exactamente lo mismo (validar body, `requireAuth`, `upsertProfile`). Duplicación de código y semántica HTTP confusa.

**Corrección:** Unificar en un solo método (p. ej. solo PUT) o extraer lógica a una función compartida y documentar que ambos son “upsert”.

---

### 2.2 Constantes duplicadas (ENVIRONMENTS, LEVELS, COOKING_TIMES)

**Archivos:** `src/app/(app)/profile/page.tsx`, `src/app/(app)/onboarding/page.tsx`

Las mismas listas están definidas en ambas páginas. Cualquier cambio hay que hacerlo en dos sitios.

**Corrección:** Mover a un módulo compartido (p. ej. `src/app/lib/profileOptions.ts`) e importar en profile y onboarding.

---

### 2.3 Tipos duplicados (Plan, TrainingSession, NutritionDay)

**Archivos:** `src/app/(app)/week/page.tsx`, `src/app/(app)/session/[dayIndex]/page.tsx`, `src/app/(app)/log/training/page.tsx`

Tipos como `Plan`, `TrainingSession` se repiten con variaciones. Cambios en el contrato del plan obligan a tocar varias páginas.

**Corrección:** Extraer tipos compartidos (p. ej. en `src/app/lib/types.ts`) y reutilizarlos.

---

### 2.4 LoadingSkeleton duplicado en Profile

**Archivo:** `src/app/(app)/profile/page.tsx`

La página define un `LoadingSkeleton()` local mientras existe `src/app/components/LoadingSkeleton.tsx` usado en week y session.

**Corrección:** Usar el componente global `LoadingSkeleton` y eliminar el local.

---

### 2.5 global-error sin fuentes ni SessionProvider

**Archivo:** `src/app/global-error.tsx`

No incluye las fuentes (Geist) ni el SessionProvider del layout raíz. La página de error puede verse distinta al resto de la app.

**Corrección:** Incluir las mismas fuentes y, si aplica, un provider mínimo; o documentar que el error global es deliberadamente simple.

---

### 2.6 UI ante 429: no se muestra Retry-After

Las APIs con `withSensitiveRoute` devuelven 429 con `Retry-After`. `getErrorMessage` mapea el código a mensaje amigable pero no se muestra el tiempo de espera.

**Corrección:** En las páginas que consumen esas APIs, en caso de 429 leer `Retry-After` (o campo en body) y mostrar “Espera X segundos y reintenta.”

---

## 3. Mejoras

### 3.1 Rate limit más estricto para /api/agent/weekly-plan

El agente comparte el límite global (30 req/min por IP y ruta). Las llamadas de IA son costosas.

**Mejora:** Límite específico para esta ruta (p. ej. 5–10 req/min por usuario o IP).

---

### 3.2 Límite de tamaño de body en rutas sensibles

Un body muy grande podría consumir memoria antes de que Zod rechace.

**Mejora:** Rechazar requests con `Content-Length` por encima de un umbral (p. ej. 1–2 KB para agent weekly-plan) antes de `req.json()`.

---

### 3.3 Tests para páginas sin cobertura

**Archivos:** `src/app/(app)/session/[dayIndex]/page.tsx`, `src/app/(app)/log/training/page.tsx`, `src/app/(app)/log/nutrition/page.tsx`, `src/app/exercise/[slug]/page.tsx`

Week, profile, onboarding y layout tienen tests; session, log y exercise page no (o solo parcial).

**Mejora:** Añadir tests (render, estados de carga/error/empty) para esas páginas.

---

### 3.4 Tests E2E o de integración

Hay tests unitarios pero no flujos completos (onboarding → semana → sesión → log).

**Mejora:** Añadir tests de integración o E2E (p. ej. Playwright) para flujos críticos.

---

### 3.5 Limpieza de archivos en data/

**Directorio:** `data/`

Existen varios `exercises.seed.audit.*.json` y `exercises.seed.bak.*.json` que pueden ensuciar el repo.

**Mejora:** Mover a carpeta ignorada (p. ej. `data/audit/`, `data/backups/`) y añadir a `.gitignore`, o eliminar si no se usan; documentar cuál es el seed oficial.

---

### 3.6 Prisma: relación opcional NutritionLog ↔ WeeklyPlan

En `WeeklyPlan` hay comentario “(optional, but recommended symmetry) // nutritionLogs NutritionLog[]”. No existe la relación; `NutritionLog` no tiene `planId`.

**Mejora:** Si se quiere historial de nutrición ligado al plan, añadir `planId` opcional en `NutritionLog` y relación en `WeeklyPlan`.

---

### 3.7 ESLint: reglas de accesibilidad

**Archivo:** `eslint.config.mjs`

Se usa `eslint-config-next`. Revisar si incluye jsx-a11y; si no, añadir plugin y reglas básicas (alt, labels, roles en modales).

**Mejora:** Mejorar a11y con reglas explícitas.

---

### 3.8 Documentación de .env.example

**Archivo:** `.env.example`

Según F1_env_audit: `AUTH_URL` y el bloque “Email (magic link)” pueden confundir.

**Mejora:** Aclarar AUTH_URL en producción vs desarrollo y que solo se usa Google OAuth (sin magic link).

---

### 3.9 API de ejercicios: política pública

GET `/api/exercises` es público (sin `requireAuth`). Coherente si el catálogo es abierto.

**Mejora:** Documentar la política; si cambia, añadir auth o rate limit específico.

---

### 3.10 Validación de weekStart en cliente

Todos los clientes (onboarding, week, profile, agent) usan `getWeekStart(new Date())`. Dejar explícito en tipos o docs si `weekStart` es “lunes de la semana actual” en UTC para evitar inconsistencias.

**Mejora:** Documentar o tipar el contrato de `weekStart` y asegurar que todos usan la misma función.

---

## 4. Resumen de prioridades

| Prioridad | Item                                                                   | Sección       |
| --------- | ---------------------------------------------------------------------- | ------------- |
| Alta      | Verificar `plan.userId === userId` en training log cuando hay `planId` | 1.1           |
| Alta      | Restringir `images.remotePatterns` a dominios conocidos                | 1.2           |
| Media     | Rate limit en GET `/api/profile`                                       | 1.4           |
| Media     | Comparación timing-safe del CRON_SECRET                                | 1.3           |
| Media     | Unificar PUT/POST profile; extraer constantes y tipos compartidos      | 2.1, 2.2, 2.3 |
| Baja      | LoadingSkeleton y global-error; UI 429 con Retry-After                 | 2.4, 2.5, 2.6 |
| Baja      | Límites agente, tests, limpieza data/, Prisma, ESLint, docs env        | 3.x           |

---

## 5. Referencias

- **specs/F1_env_audit.md** — Variables de entorno.
- **specs/AUDIT_G4_sensitive_routes.md** — Rutas sensibles, cron, agent.
- **specs/AUDIT_E1_errors_empty_states.md** — Errores y empty states por ruta.

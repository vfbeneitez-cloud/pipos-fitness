## 00 — Estado actual del repo

### 1) Estructura

- **Raíz**
  - `next.config.ts`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `docker-compose.yml`
  - `package.json`, `package-lock.json`, `.gitignore`, `.prettierrc`, `.prettierignore`
  - `README.md`
- **Dominio (`src/core`)**
  - `training/generateWeeklyTrainingPlan.ts` — generador de plan semanal de entrenamiento.
  - `nutrition/generateWeeklyNutritionPlan.ts` — generador de plan semanal de nutrición.
  - `smoke.test.ts` — smoke test básico.
- **Infra / server (`src/server`)**
  - `db/prisma.ts` — cliente Prisma con adapter Neon (`PrismaNeon`, `DATABASE_URL` vía env).
  - `api/exercises/route.ts` — handler puro de GET ejercicios (usa Prisma + Zod).
  - `api/exercises/route.test.ts` — tests de integración sobre handler de ejercicios.
  - `api/weeklyPlan/route.ts` — lógica de creación/lectura de plan semanal (usa core + Prisma + Zod).
  - `api/weeklyPlan/route.test.ts` — tests integración para creación/lectura de plan semanal.
- **App / UI (`src/app`)**
  - `layout.tsx`, `page.tsx`, `globals.css`, `favicon.ico`.
  - `api/exercises/route.ts` — reexporta `GET` desde `src/server/api/exercises/route`.
  - `api/weekly-plan/route.ts` — adapta `getWeeklyPlan`/`createWeeklyPlan` a `NextResponse` para GET/POST.
- **Prisma / DB**
  - `prisma/schema.prisma` — modelos: `User`, `UserProfile`, `Exercise`, `MediaAsset`, `WeeklyPlan`, `TrainingLog`, `NutritionLog` + enums (`TrainingEnvironment`, `Sex`, `ActivityLevel`, `CookingTime`, `PlanStatus`).
  - `prisma/migrations/20260128200151_init` — migración inicial con todas las tablas/enums/índices.
  - `prisma/seed.ts` — seed de ejercicios base + media asociada.
  - `prisma.config.ts` — configuración Prisma v7 (schema, migrations, `DATABASE_URL` vía env, seed).
- **Specs (`specs`)**
  - `00_product_vision.md` — visión de producto.
  - `01_mvp_scope.md` — épicas y criterios de aceptación de alto nivel.
  - `02_api_exercises.md` — especificación API ejercicios.
  - `03_weekly_plan_v0.md` — especificación API plan semanal v0.
- **Scripts auxiliares**
  - `scripts/createDemoUser.ts` — script (aún no referenciado en `package.json`) para crear usuario demo (no usado por specs actuales).

### 2) Scripts `package.json`

- **dev**: `next dev`
- **build**: `next build`
- **start**: `next start`
- **lint**: `eslint .`
- **lint:fix**: `eslint . --fix`
- **typecheck**: `tsc --noEmit`
- **test**: `vitest run`
- **test:watch**: `vitest`
- **format**: `prettier -w .`
- **format:check**: `prettier -c .`
- **Prisma (config sección `prisma`)**: `seed: tsx prisma/seed.ts` (usado por `prisma db seed`).

### 3) Versiones clave

- **Next.js**: `16.1.6`
- **React / ReactDOM**: `19.2.3`
- **Prisma**: `^7.3.0` (`@prisma/client` y CLI)
- **Adapter Neon**: `@prisma/adapter-neon@^7.3.0`, `@neondatabase/serverless@^1.0.2`
- **Vitest**: `^4.0.18`
- **TypeScript**: `^5.9.3`
- **ESLint**: `^9`
- **Prettier**: `^3.8.1`

### 4) Endpoints existentes

- **GET `/api/exercises`**
  - Implementación: `src/server/api/exercises/route.ts` + adapter `src/app/api/exercises/route.ts`.
  - Query params (Zod):
    - `environment?`: `"GYM" | "HOME" | "CALISTHENICS" | "POOL" | "MIXED"`.
    - `q?`: `string` (1–50 chars, búsq. por nombre).
  - Respuesta 200: lista de ejercicios con media asociada (según `specs/02_api_exercises.md`).
  - Errores:
    - `400` si query inválida (respuesta `{ error: "INVALID_QUERY", details }`).
    - `5xx` no manejados explícitamente (errores inesperados dejan stack a Next/Node).

- **GET `/api/weekly-plan`**
  - Implementación:
    - Dominio/infra: `src/server/api/weeklyPlan/route.ts` (`getWeeklyPlan`).
    - Adapter Next: `src/app/api/weekly-plan/route.ts` (`GET`).
  - Query params (Zod, en capa server):
    - `userId`: `string` no vacía.
    - `weekStart`: `YYYY-MM-DD` (normalizado a `Date` UTC midnight).
  - Respuesta 200: `WeeklyPlan | null` (incluye `trainingJson`, `nutritionJson`).
  - Errores:
    - `400` si query inválida (`{ error: "INVALID_QUERY" }`).
    - `5xx` no controlados explícitamente (errores inesperados).

- **POST `/api/weekly-plan`**
  - Implementación:
    - Dominio/infra: `src/server/api/weeklyPlan/route.ts` (`createWeeklyPlan`).
    - Adapter Next: `src/app/api/weekly-plan/route.ts` (`POST`).
  - Body (Zod):
    - `userId: string` no vacía.
    - `weekStart: string` `YYYY-MM-DD`.
    - `environment: TrainingEnvironment` (`"GYM" | "HOME" | "CALISTHENICS" | "POOL" | "MIXED"`).
    - `daysPerWeek: number` entero `1–7`.
    - `sessionMinutes: number` entero `15–180`.
  - Flujo:
    - Lee `exercisePool` filtrado por entorno (o todos si `MIXED`).
    - Usa `generateWeeklyTrainingPlan` y `generateWeeklyNutritionPlan`.
    - Comprueba existencia de `User` (`userId`); si no existe → `404 { error: "USER_NOT_FOUND" }`.
    - `upsert` de `WeeklyPlan` por `(userId, weekStart)` -> siempre `status: "DRAFT"`.
  - Errores:
    - `400` body inválido → `{ error: "INVALID_BODY", details }`.
    - `404` si usuario no existe.
    - `400` adicional en adapter si `body` no es JSON parseable → `{ error: "INVALID_JSON" }`.
    - `5xx` no controlados explícitamente en fallos inesperados.

### 5) Estado de DB / migraciones

- **Datasource**
  - `schema.prisma` usa `provider = "postgresql"` y delega la URL a `prisma.config.ts` (env `DATABASE_URL`).
  - Cliente en `src/server/db/prisma.ts` usa `PrismaNeon` + `neonConfig.webSocketConstructor = ws` (WebSocket).
- **Migraciones**
  - Migración inicial `20260128200151_init` ya generada (tablas/enums/índices coherentes con el schema actual).
  - Incluye:
    - Enums: `TrainingEnvironment`, `Sex`, `ActivityLevel`, `CookingTime`, `PlanStatus`.
    - Tablas: `User`, `UserProfile`, `Exercise`, `MediaAsset`, `WeeklyPlan`, `TrainingLog`, `NutritionLog`.
    - Índices únicos: `User.email`, `UserProfile.userId`, `Exercise.slug`, `WeeklyPlan(userId, weekStart)`.
    - FKs: relaciones entre tablas según `schema.prisma`.
- **Seed**
  - `prisma/seed.ts`:
    - Usa `prisma.exercise.upsert` para crear 4 ejercicios (`leg-press-machine`, `push-up`, `bodyweight-squat`, `freestyle-swim`) con media asociada.
    - No crea usuarios, perfiles, ni planes de ejemplo.

### 6) Tests actuales

- **Core**
  - `src/core/smoke.test.ts` — smoke test trivial.
- **API ejercicios**
  - `src/server/api/exercises/route.test.ts`:
    - Verifica que `GET /api/exercises` devuelve 200 + array con al menos un elemento + campo `media`.
    - Verifica filtro `environment`.
    - Verifica `400` para `environment` inválido.
- **Weekly plan v0**
  - `src/server/api/weeklyPlan/route.test.ts`:
    - Usa Prisma real para:
      - crear/upsert de `User` y `UserProfile`.
      - llamar `createWeeklyPlan` y verificar estructura de `nutritionJson` (7 días, `mealsPerDay`).
      - llamar `getWeeklyPlan` y verificar que devuelve plan con `trainingJson`.
- **Config test runner**
  - `vitest.config.ts`:
    - `environment: "node"`.
    - Alias `@` → raíz del repo.
    - `setupFiles: ["./vitest.setup.ts"]` (no inspeccionado en detalle aquí).

### 7) Gaps hacia “listo para producción”

- **Arquitectura / specs**
  - No hay ADRs aún (no existe carpeta `adr/` ni docs de decisiones arquitectónicas).
  - Specs cubren visión, MVP, API ejercicios y weekly plan v0, pero:
    - No hay specs formales aún para auth, perfiles de usuario, agente IA, observabilidad, ni despliegue.

- **Auth y seguridad**
  - No hay sistema de autenticación implementado (ni endpoints ni integración con providers).
  - Endpoints actuales asumen `userId` confiable (inyectado directamente) → no hay authz por usuario.
  - No hay rate limiting, ni protección anti-abuso/DoS.

- **Errores y contratos**
  - Manejo de errores parcial:
    - Buen uso de Zod para validar inputs en server y devolver `400`.
    - Sin capa unificada de error handling para 5xx ni esquema de error estándar versionado.
  - Algunas rutas delegan directamente errores inesperados a Next/Node (posible exposición de detalles en logs).

- **Infra / operativa**
  - No hay configuración explícita de logging estructurado ni correlation IDs.
  - No hay integración con error tracking (Sentry, etc.).
  - No hay métricas ni health checks formales documentados.

- **DB / datos**
  - Solo hay migración inicial; no hay migraciones adicionales ni estrategia documentada de cambios.
  - Seed solo cubre ejercicios; no hay usuarios/perfiles demo listos para probar end to end.

- **Entorno / configuración**
  - No existe `.env.example` en el repo (aunque el código depende de `DATABASE_URL`).
  - `DATABASE_URL` se espera para Prisma/Neon pero no está documentada en `README`.

- **Scripts / DX**
  - `package.json` no expone scripts cómodos para:
    - `prisma migrate dev` / `migrate deploy` / `db seed` (se dependen de CLI directa).
  - Script `scripts/createDemoUser.ts` no está integrado ni documentado.

- **Frontend / producto**
  - UI actual es la página por defecto de Next.js; no hay interfaz alineada con la visión (onboarding, planes, guía visual).
  - Sin internacionalización ni diseño específico para mobile-first.

- **Calidad / pipeline**
  - Existe workflow CI (`.github/workflows/ci.yml`), pero:
    - No está aún alineado/documentado en specs como parte de la checklist de producción.
  - No hay lint rules específicas para dominio ni convenciones documentadas más allá de ESLint/Prettier por defecto.

- **Agente IA**
  - No hay implementación de agente IA (ni integración con LLMs, ni specs de prompts/tooling más allá de la visión).

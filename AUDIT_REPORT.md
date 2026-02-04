# Auditoría exhaustiva + plan de pivot — Pipos Fitness

## Resumen ejecutivo (10 bullets)

- **Stack**: Next.js 16 (App Router), React 19, Prisma 7 + Neon (PostgreSQL), NextAuth v5 beta (Google OAuth), Zod (transitiva), Sentry, Upstash Redis (opcional), Vercel deploy.
- **Dominios**: Usuarios/auth, perfil (entrenamiento + nutrición), ejercicios + media, planes semanales (trainingJson + nutritionJson), logs (TrainingLog, NutritionLog), agente IA (ajuste de plan).
- **Flujos E2E**: Onboarding → perfil → plan semanal (GET/POST) → semana → sesión/día → log entrenamiento/nutrición; cron regeneración semanal; agente POST `/api/agent/weekly-plan`.
- **Arquitectura**: `src/core` (dominio puro), `src/server` (DB, auth, api/\*, ai, plan, lib), `src/app` (páginas + route handlers que delegan en server). ADR-0001/0003 documentados.
- **Riesgos críticos**: (1) Broken access control en TrainingLog al aceptar `planId` sin verificar ownership (único caso con findUnique por id sin userId). NutritionLog no acepta planId; WeeklyPlan GET/POST siempre filtran por userId; Exercise [slug] es público. (2) DEMO_MODE en prod: recomendación fail-fast (throw) o no crear demo user. (3) GET `/api/exercises` sin rate limit; decisión producto: caché+CDN vs auth; observabilidad antes de decidir. (4) Formato de error API: ADR vs error_code/message; si hay clientes externos, soporte transitorio.
- **Deuda**: `filterPoolByEnvironment` en core/training no filtra por environment (solo MIXED devuelve pool; resto devuelve pool igual — pool ya viene filtrado del caller; función efectivamente no hace filtrado por env). Seed acepta `type: "youtube"` en media pero schema comenta "video"|"image". Zod no está en dependencies directas (solo transitiva).
- **Tests**: Vitest, ~19 archivos _test_, unit + integración; CI exige DATABASE_URL; tests de auth/requireAuth con DEMO_MODE; no hay e2e automatizado.
- **Seguridad**: Headers CSP/X-Frame/Referrer ok; cron protegido por CRON_SECRET; demo user en DEMO_MODE; AUTH_SECRET/AUTH_URL requeridos en prod; no hay CSRF explícito en API (stateless JSON).
- **Pivot**: Core reutilizable: Prisma/schema, auth, core/training y core/nutrition, server/lib (rateLimit, requireAuth, errorResponse, logger). Acoplado al flujo actual: route handlers que mezclan withSensitiveRoute + requireAuth + lógica de negocio; agentWeeklyPlan muy grande (~470 líneas) con IA + persistencia + reglas.
- **Plan recomendado**: Fase 0 corregir ownership planId en training log + unificar formato error + rate limit en GET exercises (opcional). Fase 1 tests de ownership, cobertura críticos, documentar contrato error. Fase 2 pivot por feature flags o strangler. Fase 3 hardening y escalado.

---

## Mapa de arquitectura actual

```
pipos_fitness/
├── prisma/
│   ├── schema.prisma          # User, Account, Session, UserProfile, Exercise, MediaAsset,
│   │                          # WeeklyPlan, TrainingLog, NutritionLog
│   ├── migrations/            # 1 migración: regenLockId, regenLockedAt
│   └── seed.ts                # Lee data/exercises.seed.json, upsert Exercise + MediaAsset
├── data/
│   └── exercises.seed.json    # ~3500+ líneas, ejercicios + media (image/youtube)
├── src/
│   ├── core/                  # Dominio puro (sin next/prisma)
│   │   ├── training/
│   │   │   └── generateWeeklyTrainingPlan.ts
│   │   └── nutrition/
│   │       └── generateWeeklyNutritionPlan.ts
│   ├── server/
│   │   ├── db/prisma.ts       # PrismaClient + Neon adapter
│   │   ├── auth/              # config (NextAuth + PrismaAdapter), getSession (DEMO_MODE)
│   │   ├── lib/               # requireAuth, withSensitiveRoute, rateLimit, logger, events
│   │   ├── api/               # Lógica de aplicación por recurso
│   │   │   ├── exercises/route.ts
│   │   │   ├── weeklyPlan/route.ts
│   │   │   ├── profile/       # handlers, schema, upsertProfile
│   │   │   ├── training/log.ts
│   │   │   ├── nutrition/log.ts, swap.ts
│   │   │   └── errorResponse.ts
│   │   ├── plan/validateWeeklyPlan.ts
│   │   └── ai/                # agentWeeklyPlan, getProvider, provider, aiAudit
│   └── app/
│       ├── api/               # Route handlers Next.js (delegan en server/api o server/ai)
│       │   ├── exercises/route.ts  -> server/api/exercises
│       │   ├── weekly-plan/route.ts -> server/api/weeklyPlan
│       │   ├── agent/weekly-plan/route.ts -> server/ai/agentWeeklyPlan
│       │   ├── profile/route.ts
│       │   ├── training/log/route.ts, nutrition/log/route.ts, nutrition/swap/route.ts
│       │   ├── health/route.ts, health/db/route.ts
│       │   ├── cron/weekly-regenerate/route.ts
│       │   └── auth/[...nextauth]/route.ts
│       ├── (app)/             # Layout con getUserIdFromSession, redirect si !userId
│       │   ├── onboarding/, profile/, week/, session/[dayIndex]/, log/training|nutrition/
│       │   └── layout.tsx
│       ├── auth/signin/, auth/verify/
│       ├── exercise/[slug]/
│       └── components/        # Nav, AuthGuard, DemoGuard, ErrorBanner, LoadingSkeleton
├── scripts/                   # audit-exercises-seed, check-youtube-urls, normalize-exercises-seed
└── .github/workflows/ci.yml   # lint, typecheck, test (DATABASE_URL secret)
```

**Dependencias clave**

- `src/app/api/*` → `src/server/lib` (requireAuth, withSensitiveRoute), `src/server/api/*`, `src/server/ai/*`.
- `src/server/api/weeklyPlan/route.ts` → prisma, core/training, core/nutrition, server/plan/validateWeeklyPlan, server/ai/aiAudit.
- `src/server/ai/agentWeeklyPlan.ts` → prisma, core/training, core/nutrition, server/plan/validateWeeklyPlan, getProvider, Sentry, events.

---

## Hallazgos por severidad

### P0 (crítico)

| ID   | Categoría              | Hallazgo                                                                                                                                                                               | Evidencia                                                                                                                 | Impacto                                                                           | Recomendación                                                                                                                                                                                                                                                                                                                                                                                   | Esfuerzo |
| ---- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| P0-1 | Backend / Autorización | Broken access control: al crear TrainingLog con `planId` no se verifica que el plan pertenezca al usuario. Cualquier usuario autenticado puede asociar un log al plan de otro usuario. | `src/server/api/training/log.ts`: se hace `findUnique({ where: { id: planId } })` sin comprobar `plan.userId === userId`. | Permite asociar logs a planes ajenos; corrupción de datos y métricas por usuario. | Tras `findUnique` del plan, añadir `if (plan.userId !== userId) return { status: 403, body: { error: "FORBIDDEN" } }`.                                                                                                                                                                                                                                                                          | S        |
| P0-2 | Seguridad / Config     | DEMO_MODE=true en producción habilita usuario demo y bypass de auth en getSession. README exige DEMO_MODE=false en prod pero no hay enforcement en código.                             | `src/server/auth/getSession.ts`: si `DEMO_MODE === "true"` devuelve/crea demo user sin sesión. README §9.                 | Acceso sin autenticación real en prod si alguien deja DEMO_MODE=true.             | **Fail-fast en prod**: si `NODE_ENV === "production" && DEMO_MODE === "true"` → `throw new Error("Misconfig: DEMO_MODE must be false in production.")` al inicio de getSession (o al boot). **Mínimo**: no crear usuario demo en producción aunque DEMO_MODE esté true. Alternativa si no se quiere tirar el runtime: bloquear rutas sensibles con withSensitiveRoute devolviendo 503 + Sentry. | S        |

**Verificación exhaustiva (otros recursos)**

- **NutritionLog**: No acepta `planId`; solo `userId` del requireAuth. Sin ownership check necesario. (`src/server/api/nutrition/log.ts`.)
- **WeeklyPlan GET/POST**: Siempre filtran por `userId` (getWeeklyPlan usa `userId_weekStart: { userId, weekStart }`; createWeeklyPlan recibe userId del requireAuth). OK.
- **Exercise [slug]**: Página usa `prisma.exercise.findUnique({ where: { slug } })`; devuelve URLs públicas (YouTube, wikimedia). No hay URLs privadas en el modelo. Catálogo público; sin datos sensibles.
- **Patrón de búsqueda** para auditoría exhaustiva: buscar `findUnique({ where: { id: ... } })` (o `findFirst` solo por id) seguido de `create`/`update` sin comprobar que el recurso pertenezca al `userId` del request. Único caso vulnerable encontrado: TrainingLog con `planId`.

### P1 (alto)

| ID   | Categoría        | Hallazgo                                                                                                                                                          | Evidencia                                                                                                                                   | Impacto                                                                       | Recomendación                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Esfuerzo |
| ---- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| P1-1 | API / Contratos  | Formato de error inconsistente con ADR-0003: ADR dice `{ error, details? }`, implementación usa `{ error_code, message }`.                                        | ADR-0003-api-style.md vs `src/server/api/errorResponse.ts` (error_code, message).                                                           | Frontend/clients que esperen `error` pueden fallar; documentación incorrecta. | **Decidir una cosa y cerrarla**: ¿Hay clientes externos o solo frontend del mismo repo? Si solo mismo repo → migrar con menos coste. Si hay externos → versionado o backwards compatibility. **Soporte transitorio**: responder ambos campos 1–2 releases (`{ error_code, message, error }` o `{ error, details, error_code }`), luego deprecar uno. Estandarizar en un único adapter: server/api devuelve `Result<T, ApiError>`; el route handler traduce a NextResponse con un único mapper. | S / M    |
| P1-2 | Backend / API    | GET `/api/exercises` no usa withSensitiveRoute: sin rate limit. Catálogo puede ser abusado (scraping, DoS).                                                       | `src/app/api/exercises/route.ts` solo reexporta GET del server; server no aplica rate limit. specs/07 lista rate limit en POSTs, no en GET. | Abuso por volumen de requests; sin límite por IP.                             | Si el pivot es “catálogo público” → considerar **caché + CDN** en vez de auth. Si es interno → auth obligatorio. **Decisión técnica mínima** sin cambiar producto: rate limit suave por IP (ej. 60/min) y caché (5–30 min si Redis). **Antes de decidir**: observabilidad (requests/min, IPs top, cache hit ratio).                                                                                                                                                                            | S        |
| P1-3 | Seguridad / Cron | Riesgo real: **gestión del secret** (CRON_SECRET), no “el endpoint existe”. El secret puede filtrarse en logs, repos, dashboards, variables de entorno expuestas. | `src/app/api/cron/weekly-regenerate/route.ts` usa header `x-cron-secret` o Bearer.                                                          | Filtrado del secret → ejecución no autorizada del cron.                       | Enfocar recomendación en **secret handling**: no loguear ni incluir el secret en respuestas; no commitear en repos; rotación documentada; acceso a dashboards (Vercel/env) restringido; opcionalmente usar secret manager. Documentar en RELEASE_CHECKLIST.                                                                                                                                                                                                                                    | S        |

### P2 (medio)

| ID   | Categoría     | Hallazgo                                                                                                                                                                                                                                                            | Evidencia                                                                                                       | Impacto                                                                          | Recomendación                                                                                                                                                                                                                                 | Esfuerzo |
| ---- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| P2-1 | Arquitectura  | `filterPoolByEnvironment` en core no filtra por environment (solo MIXED devuelve pool; resto también devuelve pool). La responsabilidad de filtrar está en el caller (weeklyPlan/route, agentWeeklyPlan).                                                           | `src/core/training/generateWeeklyTrainingPlan.ts` líneas 63–69.                                                 | Confusión y posible bug futuro si alguien asume que core filtra por env.         | Filtrar en core: `if (environment !== "MIXED") return pool.filter(e => e.environment === environment); return pool;` y alinear tipo ExerciseEntry con environment, o documentar que “pool ya viene filtrado” y renombrar/eliminar la función. | S        |
| P2-2 | DB / Seeds    | Seed usa media `type: "youtube"` en JSON; schema Prisma MediaAsset.type comentado como "video" \| "image". Seed persiste "youtube" sin fallo.                                                                                                                       | `data/exercises.seed.json` (type: "youtube"), `prisma/schema.prisma` MediaAsset type String.                    | Inconsistencia semántica; cliente podría asumir solo video/image.                | Decidir convención: o normalizar en seed a "video" para URLs YouTube o documentar "youtube" como valor permitido y alinear comentario del schema.                                                                                             | S        |
| P2-3 | Dependencias  | Zod se usa en 9 módulos pero no está en package.json dependencies (solo como dependencia transitiva).                                                                                                                                                               | Grep imports "zod"; package.json sin "zod".                                                                     | Rotura futura si dependencia padre deja de exponer zod; versionado no explícito. | Añadir `"zod": "^3.x"` (o la versión que use next-auth) a dependencies.                                                                                                                                                                       | S        |
| P2-4 | API / Errores | Algunos handlers devuelven body con `error` (ej. weekly-plan 400 body `{ error: "INVALID_QUERY" }`) y luego el route wrapper lo mapea a badRequestBody(errBody.error) → error_code + message. Otros devuelven directamente error_code. Mezcla en el cuerpo interno. | `src/server/api/weeklyPlan/route.ts` getWeeklyPlan retorna body con `error`; route.ts traduce a badRequestBody. | Mantenimiento y tests más frágiles.                                              | Estandarizar en server/api: que los handlers devuelvan siempre un tipo estándar (ej. { errorCode, message? }) y el route solo lo pase a errorResponse.                                                                                        | M        |
| P2-5 | Tests         | Tests que dependen de DB (requireAuth demo user, etc.) usan RUN_DB_TESTS o skips; CI corre todos los tests con DATABASE_URL. No hay tag/claridad de qué tests son integración vs unit.                                                                              | vitest.setup.ts solo carga dotenv; requireAuth.test.ts usa runDbTests.                                          | Riesgo de flakiness o de no correr integración en CI de forma explícita.         | Marcar tests de integración (ej. describe.db o config) y documentar en README; opcionalmente job CI separado para integración.                                                                                                                | M        |

### P3 (bajo)

| ID   | Categoría      | Hallazgo                                                                                                                                         | Evidencia                                                                           | Impacto                                                     | Recomendación                                                                                                                                           | Esfuerzo |
| ---- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| P3-1 | Código         | agentWeeklyPlan.ts muy grande (~470 líneas), mezcla prompts, validación, persistencia y reglas de negocio.                                       | `src/server/ai/agentWeeklyPlan.ts`.                                                 | Difícil de testear y evolucionar.                           | Extraer: módulo de prompts, uno de “adjustment rules”, uno de persistencia; mantener route del agente fino.                                             | L        |
| P3-2 | Observabilidad | withSensitiveRoute no inyecta x-request-id en la respuesta. README/specs mencionan trazabilidad.                                                 | withSensitiveRoute.ts lee x-request-id del request pero no lo añade a NextResponse. | Trazabilidad cliente-servidor incompleta.                   | Añadir header en la respuesta: `res.headers.set("x-request-id", requestId)` (o clonar res y añadir).                                                    | S        |
| P3-3 | Prisma         | DATABASE_URL en prisma.ts con assert `!`: si no está definido en build (ej. Vercel) puede fallar; prisma.config.ts tiene fallback para generate. | `src/server/db/prisma.ts`: `const connectionString = process.env.DATABASE_URL!;`    | En entornos sin DATABASE_URL en runtime, crash al importar. | Ya hay fallback en prisma.config para generate; en runtime, usar variable con fallback dummy solo para prisma generate o validar al inicio del handler. | S        |
| P3-4 | i18n           | Mensajes de error y UI en español fijos (errorResponse, etc.). Sin i18n.                                                                         | errorResponse.ts, textos en español.                                                | Pivot a otro idioma requeriría cambio amplio.               | Aceptable para MVP; si se planea i18n, extraer strings a keys y capa de traducción.                                                                     | L        |

---

## Deuda técnica: top 10 (impacto vs esfuerzo)

| #   | Item                                                                | Impacto | Esfuerzo | Acción                                                                                 |
| --- | ------------------------------------------------------------------- | ------- | -------- | -------------------------------------------------------------------------------------- |
| 1   | Verificar ownership de planId en TrainingLog (P0-1)                 | Alto    | S        | Implementar comprobación plan.userId === userId.                                       |
| 2   | Unificar contrato de errores API (ADR vs error_code/message) (P1-1) | Alto    | S        | Decidir estándar y aplicar en errorResponse + todos los handlers.                      |
| 3   | Rate limit + observabilidad GET /api/exercises (P1-2)               | Medio   | S        | Rate limit 60/min; caché 5–30 min si Redis; métricas antes de decidir auth vs público. |
| 4   | Añadir Zod a dependencies (P2-3)                                    | Medio   | S        | package.json: "zod": "^3.x".                                                           |
| 5   | filterPoolByEnvironment real o documentar (P2-1)                    | Medio   | S        | Filtrar en core por environment o documentar que pool viene filtrado.                  |
| 6   | Normalizar media type youtube vs video (P2-2)                       | Bajo    | S        | Decidir convención y actualizar seed o schema comment.                                 |
| 7   | DEMO_MODE en producción (P0-2)                                      | Alto    | S        | Assert o check en startup/handler en prod.                                             |
| 8   | Estandarizar body de error interno en server/api (P2-4)             | Medio   | M        | Tipo común { errorCode, message? } y usar en todos los módulos server/api.             |
| 9   | Refactorizar agentWeeklyPlan en módulos (P3-1)                      | Medio   | L        | Extraer prompts, reglas de ajuste, persistencia.                                       |
| 10  | x-request-id en respuesta (P3-2)                                    | Bajo    | S        | Añadir header en withSensitiveRoute.                                                   |

---

## Recomendaciones de pivot (3 estrategias)

### 1) Evolutiva (Strangler / feature flags)

- **Reutilizar**: Prisma, schema, auth, core (training + nutrition), server/lib (rateLimit, requireAuth, errorResponse, logger), rutas actuales de API y páginas.
- **Eliminar**: Nada de golpe; se sustituye por partes.
- **Enfoque**: Nuevos flujos o variantes detrás de feature flags; rutas legacy siguen activas hasta migrar tráfico.
- **Riesgos**: Doble mantenimiento temporal; flags deben estar bien documentados.
- **Mitigación**: Flags por dominio (ej. “nuevo onboarding”, “nuevo plan semanal”); rollout por % y rollback claro.
- **Coste**: 2–4 semanas para primer flujo piloto + 1–2 semanas por flujo adicional.
- **Puntos de control**: Flag en config; métricas de uso por ruta; criterio de “apagado” del legacy por flujo.
- **Go/no-go**: ¿Nuevo flujo estable en staging? ¿Sin regresión de errores 5xx?

### 2) Reescritura parcial

- **Reutilizar**: Prisma/schema, auth, server/db, server/lib (rateLimit, requireAuth, withSensitiveRoute, logger), core/training y core/nutrition, datos y seed.
- **Reescribir**: Módulos que más acoplan al producto actual: agentWeeklyPlan (dividir en servicios), capa de route handlers (mantener convención pero simplificar), onboarding y flujo “plan semanal” (si el pivot cambia UX).
- **Eliminar**: Código muerto tras extraer servicios (ej. comentarios/código no usado en agentWeeklyPlan).
- **Riesgos**: Regresiones en flujos no reescritos; duplicación temporal.
- **Mitigación**: Tests de integración por endpoint; cobertura mínima en módulos tocados.
- **Coste**: 3–6 semanas según alcance (solo agente vs agente + flujo plan).
- **Puntos de control**: Tests pasan; smoke manual de plan + log + cron.
- **Go/no-go**: ¿Tests verdes? ¿Smoke en staging ok?

### 3) Rebuild dirigido

- **Reutilizar**: Esquema Prisma y migraciones, datos (seed), decisiones de infra (Neon, Vercel), posiblemente auth (NextAuth) y server/lib si se mantiene Next.
- **Reescribir**: Casi toda la app: estructura de carpetas, rutas, lógica de plan y agente, UI.
- **Eliminar**: Todo lo que no se lleve al nuevo diseño (páginas, handlers, core que cambie de forma).
- **Riesgos**: Alto coste; ventana larga sin valor intermedio; migración de datos y configuración.
- **Mitigación**: Nuevo repo o rama larga; migraciones de datos scripteadas; ventana de corte clara.
- **Coste**: 8–14 semanas (supuesto equipo pequeño).
- **Puntos de control**: Paridad funcional por milestone; migración de DB/usuarios probada.
- **Go/no-go**: ¿Paridad mínima alcanzada? ¿Migración reversible?

---

## Plan de implementación por fases

### Fase 0 (1 PR, 1–2 días): Cerrar P0 y dejar bases

- **Objetivo**: Cerrar P0 y reducir riesgo inmediato sin cambiar flujos.
- **Tareas**:
  - [ ] **Ownership check**: TrainingLog (NutritionLog no acepta planId → no aplica). En `createTrainingLog`, usar `findFirst({ where: { id: planId, userId } })`; si `!plan` → 403 FORBIDDEN. Añadir `forbiddenBody("FORBIDDEN")` en errorResponse si no existe.
  - [ ] **DEMO_MODE fail-fast en prod**: En `getSession.ts` al inicio: `if (process.env.NODE_ENV === "production" && process.env.DEMO_MODE === "true") throw new Error("Misconfig: DEMO_MODE must be false in production.");` Mínimo: no crear usuario demo en prod aunque DEMO_MODE esté true.
  - [ ] **Contrato de error**: Elegir estándar y asegurar que todas las rutas pasan por un único adapter (server/api devuelve tipo estándar; route handler traduce a NextResponse con un solo mapper). Ver “Parches concretos” más abajo.
  - [ ] Añadir `zod` a dependencies (ok).
  - [ ] Request id en respuesta (x-request-id en withSensitiveRoute) (ok).
- **Entregables**: Un PR con lo anterior; RELEASE_CHECKLIST (o README) con ítem DEMO_MODE; **security regression checklist** breve en README o RELEASE_CHECKLIST.
- **Riesgos**: Bajo; cambios acotados.
- **Criterios de salida**: Tests verdes; **test nuevo que reproduce el ataque de ownership** (crear TrainingLog con planId de otro usuario → 403); P0-1 y P0-2 cubiertos; contrato de error documentado; checklist de seguridad en docs.

### Fase 1 (1–2 semanas): Estabilización arquitectura + base de tests

- **Objetivo**: Base de tests sólida y consistencia de API/dominio.
- **Tareas**:
  - [ ] Tests de integración para crear TrainingLog con planId ajeno → 403.
  - [ ] Estandarizar body de error en server/api (P2-4): tipo común y uso en weeklyPlan, training/log, nutrition/log, profile.
  - [ ] P1-2: Aplicar rate limit a GET /api/exercises (withSensitiveRoute o límite específico).
  - [ ] P2-1: Arreglar o documentar filterPoolByEnvironment.
  - [ ] P2-2: Definir convención media type (youtube vs video) y aplicar en seed/schema.
  - [ ] Marcar/clasificar tests unit vs integración y documentar en README.
- **Entregables**: Suite de tests estable; documento corto de contrato de API (errores y códigos).
- **Riesgos**: Algunos tests pueden ser frágiles si dependen de DB; mitigar con datos acotados.
- **Criterios de salida**: Cobertura mínima en server/api y server/ai (por ejemplo >60% en módulos críticos); ningún P0/P1 abierto.

### Fase 2: Pivot implementado (migración de dominio)

- **Objetivo**: Aplicar la estrategia de pivot elegida (evolutiva, parcial o rebuild).
- **Tareas**: Dependen de la estrategia (ver sección anterior). Mínimo: feature flags para un flujo nuevo (si evolutiva) o refactor de agentWeeklyPlan + flujo plan (si parcial).
- **Entregables**: Nuevo flujo o módulos reestructurados en producción/staging; documentación de decisiones.
- **Riesgos**: Regresiones; dependencia de producto para priorizar flujos.
- **Criterios de salida**: Criterios go/no-go de la estrategia elegida cumplidos; métricas de error estables.

### Fase 3: Hardening + escalado

- **Objetivo**: Observabilidad, límites operativos y preparación para más carga.
- **Tareas**: Revisar límites de rate limit y Redis; métricas y alertas (Sentry, Vercel); revisión de queries N+1 (ej. listados con relaciones); opcional: caché para GET exercises.
- **Entregables**: Dashboard o alertas básicas; documentación de límites y escalado.
- **Criterios de salida**: Sin P0/P1 abiertos; health/db y health básico usados en monitorización.

---

## Parches concretos (accionables)

### A) Ownership check — patrón recomendado

En lugar de `findUnique({ where: { id: planId } })` + `if (plan.userId !== userId)`, usar **findFirst con userId** para reducir el riesgo de olvidar el if:

```ts
const plan = await prisma.weeklyPlan.findFirst({
  where: { id: planId, userId },
  select: { id: true },
});
if (!plan) {
  return { status: 403, body: forbiddenBody("FORBIDDEN") };
}
```

Añadir en `errorResponse.ts`: `export function forbiddenBody(code: string): { error_code: string; message: string }` (o el contrato elegido) y usarlo en training/log.

### B) DEMO_MODE en prod — recomendación fuerte

En `getSession.ts` (o punto de entrada), al inicio:

```ts
if (process.env.NODE_ENV === "production" && process.env.DEMO_MODE === "true") {
  throw new Error("Misconfig: DEMO_MODE must be false in production.");
}
```

Si no se quiere tirar el runtime: bloquear rutas con withSensitiveRoute cuando DEMO_MODE true en prod, devolviendo 503 + Sentry.

### C) Contrato de error — adapter único

- **server/api** devuelve siempre un tipo estándar, p. ej. `Result<T, ApiError>`.
- El **route handler** traduce a NextResponse con un **único mapper**.

Tipos sugeridos:

```ts
type ApiError = { code: string; message?: string; details?: unknown; status: number };
type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };
```

Mapper único: de `ApiError` → `NextResponse.json({ error_code: error.code, message: error.message }, { status: error.status })` (o el contrato elegido).

### D) Rate limit GET /exercises — decisión técnica mínima

Sin cambiar producto: **rate limit suave por IP 60/min** y **caché 5–30 min** si ya hay Redis/Upstash. Reduce coste y deja la puerta abierta a “público”.

---

## Auditoría de pivot: ingeniería

Para cambiar el enfoque sin romper, hace falta definir límites y riesgos técnicos.

### A) Core vs product

Hoy se dice “core reutilizable: Prisma, auth, core/training/nutrition…”. Para un pivot real, el punto clave es **qué es “core”**:

- ¿El core es **generación de plan** (training + nutrition)?
- ¿O **tracking/logging** (logs, adherencia)?
- ¿O **catálogo de ejercicios**?
- ¿O **agente IA** (prompts, ajustes)?

Eso define la **arquitectura objetivo**: si el pivot prioriza “solo nutrición”, el plan de entrenamiento pasa a secundario; si prioriza “solo catálogo”, el plan semanal puede ser opcional.

### B) Mayor riesgo técnico del pivot: WeeklyPlan como “God Aggregate”

`WeeklyPlan` con `trainingJson` + `nutritionJson` se vuelve difícil de:

- versionar (cambios de schema),
- migrar (diffs, historial),
- auditar (qué generó qué).

**Recomendación mínima viable**:

- Introducir **versionado de schema** dentro del JSON (`schemaVersion`).
- Validar en `validateWeeklyPlan.ts` según `schemaVersion`.
- Guardar **trazabilidad si hay IA**: `generatedBy`, `promptVersion`, `model` (en plan o en metadata).

Si el pivot cambia qué es un “plan”, lo más seguro es tener `schemaVersion` y, si hace falta, mover parte a tablas normalizadas para queries.

### C) AgentWeeklyPlan: separar por capas ANTES del pivot

No refactorizar por “limpieza”; refactorizar **para pivot**: que un cambio de prompts o reglas no rompa persistencia.

Estructura sugerida:

- **ai/prompts/** — textos de sistema/usuario.
- **ai/providers/** — ya existe getProvider, mock, etc.
- **ai/planAdjuster/** — reglas de ajuste (red flags, adherencia, decisiones).
- **ai/persistence/** — guardar/actualizar plan (upsert WeeklyPlan).
- **ai/audit/** — safety, validaciones, trazabilidad.

Con eso, si el pivot cambia prompts o reglas, se tocan solo esas capas.

---

## Archivos críticos a revisar manualmente

- `src/server/api/training/log.ts` — ownership de planId (P0-1).
- `src/server/auth/getSession.ts` — lógica DEMO_MODE y creación de demo user.
- `src/server/api/errorResponse.ts` + usos en `src/app/api/*` — contrato de errores (P1-1).
- `src/app/api/exercises/route.ts` + `src/server/api/exercises/route.ts` — rate limit (P1-2).
- `src/app/api/cron/weekly-regenerate/route.ts` — gestión de CRON_SECRET (no loguear, no exponer en respuestas).
- `src/core/training/generateWeeklyTrainingPlan.ts` — filterPoolByEnvironment (P2-1).
- `prisma/seed.ts` + `data/exercises.seed.json` — tipo media "youtube" vs "video" (P2-2).
- `src/server/ai/agentWeeklyPlan.ts` — tamaño y separación de responsabilidades (P3-1).
- `src/server/db/prisma.ts` — uso de DATABASE_URL en runtime.
- `.env.example` y RELEASE_CHECKLIST.md — DEMO_MODE y variables de producción.

---

## Preguntas abiertas (solo si son bloqueantes)

- **Ninguna bloqueante** para ejecutar Fase 0 y Fase 1. Las siguientes son de producto/prioridad:
  - ¿GET /api/exercises debe ser público sin auth indefinidamente? Si pivot a “catálogo público” → caché + CDN; si interno → auth. **Antes de decidir**: observabilidad (requests/min, IPs top, cache hit ratio).
  - ¿Hay clientes externos de la API o solo frontend del mismo repo? (afecta contrato de errores: migración directa vs soporte transitorio + versionado).
  - ¿El pivot implica cambio de dominio (ej. de “fitness semanal” a “nutrición solo” o “coaching”)? (afecta core vs product y qué módulos reescribir en Fase 2).
  - ¿Zod debe fijarse a 3.x o al rango que trae next-auth? (recomendación: fijar 3.x en dependencies).

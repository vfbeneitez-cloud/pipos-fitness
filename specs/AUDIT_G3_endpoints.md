# Auditoría MVP — G3: Mapa de endpoints y duplicación

## 1. Endpoints en `src/app/api/**/route.ts`

| Ruta Next.js                  | Métodos        | Archivo                                       |
| ----------------------------- | -------------- | --------------------------------------------- |
| `/api/exercises`              | GET            | `src/app/api/exercises/route.ts`              |
| `/api/profile`                | GET, PUT, POST | `src/app/api/profile/route.ts`                |
| `/api/weekly-plan`            | GET, POST      | `src/app/api/weekly-plan/route.ts`            |
| `/api/training/log`           | POST           | `src/app/api/training/log/route.ts`           |
| `/api/nutrition/log`          | POST           | `src/app/api/nutrition/log/route.ts`          |
| `/api/nutrition/swap`         | POST           | `src/app/api/nutrition/swap/route.ts`         |
| `/api/agent/weekly-plan`      | POST           | `src/app/api/agent/weekly-plan/route.ts`      |
| `/api/health`                 | GET            | `src/app/api/health/route.ts`                 |
| `/api/health/db`              | GET            | `src/app/api/health/db/route.ts`              |
| `/api/cron/weekly-regenerate` | POST           | `src/app/api/cron/weekly-regenerate/route.ts` |
| `/api/_debug/sentry`          | GET            | `src/app/api/_debug/sentry/route.ts`          |
| `/api/auth/[...nextauth]`     | GET, POST      | `src/app/api/auth/[...nextauth]/route.ts`     |

## 2. Implementaciones en `src/server/api/**` y `src/server/ai/**`

| Carpeta/archivo                  | Exporta                         | Descripción                    |
| -------------------------------- | ------------------------------- | ------------------------------ |
| `server/api/exercises/route.ts`  | GET                             | Lista ejercicios (con filtros) |
| `server/api/weeklyPlan/route.ts` | getWeeklyPlan, createWeeklyPlan | CRUD plan semanal              |
| `server/api/profile/handlers.ts` | getProfile, upsertProfile       | Lectura/escritura perfil       |
| `server/api/profile/schema.ts`   | ProfileInputSchema              | Validación                     |
| `server/api/training/log.ts`     | createTrainingLog               | Crear log entrenamiento        |
| `server/api/nutrition/log.ts`    | createNutritionLog              | Crear log nutrición            |
| `server/api/nutrition/swap.ts`   | swapMeal                        | Cambiar comida en plan         |
| `server/ai/agentWeeklyPlan.ts`   | adjustWeeklyPlan                | Ajuste IA del plan             |

No existe `server/api` para: health, cron, auth, \_debug.

## 3. Tabla: endpoint → implementación → usa server/api? → riesgo

| Endpoint                         | Implementación                                                                | Usa server/api?       | Riesgo |
| -------------------------------- | ----------------------------------------------------------------------------- | --------------------- | ------ |
| GET /api/exercises               | Re-export puro de `server/api/exercises/route`                                | Sí (re-export total)  | Bajo   |
| GET/PUT/POST /api/profile        | App: auth, parse; server: getProfile, upsertProfile                           | Sí (handlers)         | Bajo   |
| GET/POST /api/weekly-plan        | App: withSensitiveRoute, requireAuth; server: getWeeklyPlan, createWeeklyPlan | Sí (weeklyPlan/route) | Bajo   |
| POST /api/training/log           | App: auth, parse; server: createTrainingLog                                   | Sí (training/log)     | Bajo   |
| POST /api/nutrition/log          | App: auth, parse; server: createNutritionLog                                  | Sí (nutrition/log)    | Bajo   |
| POST /api/nutrition/swap         | App: auth, parse; server: swapMeal                                            | Sí (nutrition/swap)   | Bajo   |
| POST /api/agent/weekly-plan      | App: auth, parse; server/ai: adjustWeeklyPlan                                 | No (server/ai)        | Medio  |
| GET /api/health                  | Inline en app (env, version)                                                  | No                    | Bajo   |
| GET /api/health/db               | Inline en app; prisma.$queryRaw                                               | No                    | Bajo   |
| POST /api/cron/weekly-regenerate | Inline en app; usa adjustWeeklyPlan, prisma                                   | Parcial (ai + prisma) | Medio  |
| GET /api/\_debug/sentry          | Inline en app; Sentry.captureException                                        | No                    | Bajo   |
| GET/POST /api/auth/[...nextauth] | Re-export de server/auth (handlers)                                           | Sí (server/auth)      | Bajo   |

## 4. Duplicaciones detectadas

**No hay duplicación funcional.** Cada endpoint tiene una sola implementación de negocio.

**Diferencias de estructura:**

- **exercises**: La ruta de Next.js es un re-export directo. Toda la lógica vive en `server/api/exercises/route.ts`. La ruta de Next.js no añade auth (el endpoint es público o se asume acceso controlado por otro medio).
- **profile, weekly-plan, training/log, nutrition/log, nutrition/swap**: App hace auth + withSensitiveRoute + parse; server hace la lógica de negocio. División clara.
- **agent/weekly-plan**: Usa `server/ai`, no `server/api`. Organización por dominio (IA vs CRUD).
- **cron/weekly-regenerate**: Lógica de cron en app; reutiliza `adjustWeeklyPlan` y prisma. No hay `server/api/cron`.

**Fuente de verdad actual:**

- Lógica de negocio: `src/server/api/**` y `src/server/ai/**`
- Capa HTTP (auth, rate limit, parse): `src/app/api/**/route.ts`

## 5. Recomendaciones (sin refactor en este paso)

- Mantener el patrón actual: app = HTTP + auth, server = negocio.
- `agent/weekly-plan` en `server/ai` es coherente; no mover a `server/api` sin motivo.
- Health y debug pueden seguir inline por su simplicidad.

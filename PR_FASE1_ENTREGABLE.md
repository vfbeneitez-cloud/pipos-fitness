# PR Fase 1 — Hardening + Scalability + Pivot-readiness

## A) /api/exercises: rate limit + observabilidad

- Rate limit: 60/min por IP (configurable en `rateLimit.ts`).
- `x-request-id` en respuesta (via `withSensitiveRoute`).
- Log/event 429: endpoint, requestId (no PII).
- Caché/Upstash: opcional; si no hay Redis, no se aplica caché.

## B) WeeklyPlan JSON versioning

- **Una sola capa para schemaVersion**: La validación decide. `validateTrainingBeforePersist` y `validateNutritionBeforePersist` devuelven `{ ok: true, normalized }` con `schemaVersion` ya fijado (legacy sin versión → normalizado a 1 solo si el shape pasa validación). En persistencia **no** se aplica default; se persiste solo el objeto normalizado cuando la validación pasa.
- **Constantes de versión**: Server importa `TRAINING_SCHEMA_VERSION` y `NUTRITION_SCHEMA_VERSION` desde core; re-exporta como `SUPPORTED_*` para simetría. Una única fuente de verdad (core).
- Metadata opcional en agent: `generatedBy`, `promptVersion` (corto, p. ej. `adjustPlan@2026-02-04`), `model`, `generatedAt` (ISO string). Tests no comparan `generatedAt` por valor exacto.

## C) Refactor agentWeeklyPlan por capas

- **prompts/**
  - `createPlan.ts`: `getCreatePlanSystemPrompt()`.
  - `adjustPlan.ts`: `getAdjustSystemPrompt()`, `getAdjustUserPrompt()`.
- **planAdjuster/**
  - `redFlags.ts`: `detectRedFlags()`.
  - `adherence.ts`: `calculateAdherence()`.
  - `parseAdjustments.ts`: `parseAdjustmentResponse()`, `applyAdjustmentsToFinalParams()`.
- **persistence/**
  - `upsertWeeklyPlan.ts`: `upsertWeeklyPlan()`.
- **audit:** ya existía `aiAudit.ts` (trackAiPlanAudit).
- `agentWeeklyPlan.ts` orquesta: body/params, provider, prompts, parseAdjustments, finalParams, generate plans, validate nutrition, build JSON con schemaVersion + metadata, upsertWeeklyPlan.

---

## Archivos tocados y por qué

| Archivo                                             | Motivo                                                                                                                            |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `src/server/lib/rateLimit.ts`                       | A) Rate limit configurable (límite por minuto).                                                                                   |
| `src/server/api/exercises/route.ts`                 | A) Uso de rate limit y requestId.                                                                                                 |
| `src/app/api/exercises/route.ts`                    | A) Envolver con withSensitiveRoute / rate limit.                                                                                  |
| `src/core/nutrition/generateWeeklyNutritionPlan.ts` | B) `NUTRITION_SCHEMA_VERSION` exportado; tipo `WeeklyNutritionPlan` con `schemaVersion?`.                                         |
| `src/server/plan/validateWeeklyPlan.ts`             | B) `SUPPORTED_TRAINING_SCHEMA_VERSION`, `validateTrainingBeforePersist`.                                                          |
| `src/server/plan/validateWeeklyPlan.test.ts`        | B) Tests `validateTrainingBeforePersist` con/sin schemaVersion y compat.                                                          |
| `src/server/api/weeklyPlan/route.ts`                | B) Asegurar `schemaVersion` en training/nutrition al persistir.                                                                   |
| `src/server/ai/agentWeeklyPlan.ts`                  | B+C) Metadata en JSON; schemaVersion en retorno IA; imports de prompts, planAdjuster, persistence; orquestación adjustWeeklyPlan. |
| `src/server/ai/prompts/createPlan.ts`               | C) Extracción system prompt create plan.                                                                                          |
| `src/server/ai/prompts/adjustPlan.ts`               | C) Extracción system + user prompt adjust plan.                                                                                   |
| `src/server/ai/planAdjuster/redFlags.ts`            | C) Extracción `detectRedFlags`.                                                                                                   |
| `src/server/ai/planAdjuster/redFlags.test.ts`       | C) Test unitario planAdjuster.                                                                                                    |
| `src/server/ai/planAdjuster/adherence.ts`           | C) Extracción `calculateAdherence`.                                                                                               |
| `src/server/ai/planAdjuster/parseAdjustments.ts`    | C) Extracción parse + apply adjustments.                                                                                          |
| `src/server/ai/persistence/upsertWeeklyPlan.ts`     | C) Extracción upsert weekly plan.                                                                                                 |
| `.github/workflows/ci.yml`                          | Job `build` si se añadió en Fase 1.                                                                                               |

---

## Cómo ejecutar tests

```bash
cd pipos_fitness
npm ci
npm run typecheck   # debe pasar
npm test            # todos los tests deben pasar
```

- Tests relevantes: `validateWeeklyPlan.test.ts` (nutrition + training schemaVersion/compat), `planAdjuster/redFlags.test.ts`, `agentWeeklyPlan.test.ts` (generatePlanFromApi), `weeklyPlan/route.test.ts` (createWeeklyPlan / adjustWeeklyPlan si aplica).

---

## Riesgos y rollout (5 bullets)

- **Rate limit /api/exercises**: 60/min por IP; clientes legítimos con muchos refrescos pueden ver 429. Mitigar con caché (opcional) o subir límite si se mide uso real.
- **schemaVersion en JSON**: Planes antiguos sin `schemaVersion` siguen siendo válidos (compat). Nuevos planes llevan `schemaVersion: 1`. Si en el futuro se exige versión, habría que migrar o rechazar planes sin versión con mensaje claro.
- **Metadata en agent**: Campos `generatedBy`, `promptVersion`, `model`, `generatedAt` en training/nutrition JSON; consumidores que serialicen todo el objeto los verán. No rompe contrato si se ignoran.
- **Refactor por capas**: Solo movimiento de código; misma lógica. Riesgo bajo; regresión cubierta por tests existentes de agent y planAdjuster.
- **NUTRITION_SCHEMA_VERSION en core**: Definido en `generateWeeklyNutritionPlan.ts`; validación en `validateWeeklyPlan` usa `SUPPORTED_*`. Coherencia entre ambos valores (1) debe mantenerse al subir versión.

---

## Validación manual (si algo no se pudo testear)

- **Rate limit 429**: Hacer >60 GET a `/api/exercises` en 1 min desde la misma IP; comprobar respuesta 429 y que en logs/eventos aparezca endpoint y requestId (no PII).
- **x-request-id**: Llamar a GET `/api/exercises` y comprobar que la respuesta incluye header `x-request-id`.
- **Planes con/sin schemaVersion**: Crear plan desde UI (route o agent); leer `trainingJson`/`nutritionJson` en DB y comprobar que tienen `schemaVersion: 1` y, en ajustes por agent, `metadata` con `generatedBy`, `generatedAt`, etc. Planes antiguos sin `schemaVersion` deben seguir validando (validateNutritionBeforePersist/validateTrainingBeforePersist compat).
- **adjustWeeklyPlan E2E**: Llamar POST al endpoint del agente con `weekStart`; comprobar 200, plan actualizado y rationale; revisar en DB que training/nutrition tienen schemaVersion y metadata.

---

## Out of scope (Fase 1) / Backlog P1

- **GET /api/exercises: rate limit + caché**: Si no se incluyó en este PR, queda como **Backlog P1** (con fecha objetivo si se define). El repo ya tiene `withSensitiveRoute`; el cambio suele ser barato (rate limit 60/min + opcional caché 5–30 min). Documentar en RELEASE_CHECKLIST o backlog para no perderlo.

---

## Definition of Done — Fase 1

- [x] `validateTrainingBeforePersist` / `validateNutritionBeforePersist` devuelven objeto normalizado con `schemaVersion`; **no** hay defaults duplicados en persistencia.
- [x] Constantes de versionado: `TRAINING_SCHEMA_VERSION` y `NUTRITION_SCHEMA_VERSION` en core; server las importa y re-exporta como `SUPPORTED_*`.
- [x] 2+ tests de redFlags: caso sin red flags (p. ej. logs vacíos, sin dolor, dolor sin keywords) y caso con red flag crítico.
- [x] Documentado si /api/exercises se hizo en este PR o se difiere (sección "Out of scope" arriba).
- [x] Metadata: `promptVersion` corto y estable; `generatedAt` solo validado como Date/ISO string en tests (no por valor exacto).
- [x] Capas: sin imports circulares; `parseAdjustmentResponse` con fallback seguro ante IA basura; `applyAdjustmentsToFinalParams` pura.

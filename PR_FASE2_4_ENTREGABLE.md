# PR Fase 2.4 — Snapshots + Trend

Materialización de adherencia semanal (snapshots) + tendencia. Sin IA. Arquitectura en src/server/api/adherence/\*.

---

## Migración

- **20260204140000_add_weekly_adherence_snapshot**: Tabla WeeklyAdherenceSnapshot (userId, weekStart unique, trainingPercent, nutritionPercent, totalPercent, breakdownJson, computedAt).
- Para aplicar: `npx prisma migrate deploy` (o `npx prisma migrate dev`).
- Para tests de integración: migración debe estar aplicada.

---

## Endpoints

| Método | Ruta                                                   | Descripción                                                               |
| ------ | ------------------------------------------------------ | ------------------------------------------------------------------------- |
| GET    | /api/adherence/snapshot?weekStart=YYYY-MM-DD           | Snapshot por semana. 404 SNAPSHOT_NOT_FOUND si no existe.                 |
| POST   | /api/adherence/snapshot/recompute?weekStart=YYYY-MM-DD | Recompute snapshot. 404 PLAN_NOT_FOUND si no hay plan. Rate limit 10/min. |
| GET    | /api/adherence/trend?weeks=8                           | Últimas N semanas (1-52, default 8). items + missing.                     |

---

## Cómo probar manualmente

1. **Crear plan y logs:**
   - Iniciar sesión, generar plan semanal.
   - Registrar entrenamientos y comidas (log/training, log/nutrition).

2. **Recompute:**
   - POST /api/adherence/snapshot/recompute?weekStart=YYYY-MM-DD (o botón "Actualizar adherencia" en /week).

3. **Snapshot:**
   - GET /api/adherence/snapshot?weekStart=YYYY-MM-DD → 200 con snapshot.

4. **Trend:**
   - GET /api/adherence/trend?weeks=8 → items (snapshots existentes) + missing (semanas sin snapshot).

5. **UI /week:**
   - Si snapshot existe → muestra adherencia + "Actualizado: {computedAt}".
   - Si 404 → fallback a /api/adherence/weekly (on-the-fly).
   - Botón "Actualizar adherencia" → POST recompute → refetch.

---

## Riesgos / rollout (5 bullets)

- **UTC weekStart:** Siempre YYYY-MM-DDT00:00:00.000Z. Índices ya existen en TrainingLog/NutritionLog.
- **Snapshot idempotente:** unique(userId, weekStart). Upsert en recompute.
- **Recompute rate-limited:** 10/min por IP.
- **Trend no backfill:** v1 devuelve missing[] sin recompute automático (coste).
- **Fallback on-the-fly:** Si no hay snapshot, weekly sigue funcionando.

---

## Notas

- **UTC weekStart:** parseWeekStartParam y getRecentWeekStartsUtc usan new Date("YYYY-MM-DDT00:00:00.000Z").
- **v1 no backfill:** missing[] en trend es informativo; no recompute automático.

## Backlog / seguimiento

- Índices `@@index([userId, occurredAt])` en TrainingLog y NutritionLog: ya existen.
- Snapshots: índice `@@index([userId, weekStart])` presente.

## Errores endpoint recompute

| Condición              | Status | error_code      |
| ---------------------- | ------ | --------------- |
| weekStart inválido     | 400    | INVALID_QUERY   |
| Plan no existe         | 404    | PLAN_NOT_FOUND  |
| Plan/logs JSON inválidos | 400  | INVALID_PLAN_DATA |

---

## Archivos tocados

| Archivo                                                           | Cambio                                                            |
| ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| `prisma/schema.prisma`                                            | Modelo WeeklyAdherenceSnapshot.                                   |
| `prisma/migrations/20260204140000_add_weekly_adherence_snapshot/` | Migración.                                                        |
| `src/server/api/adherence/weekRange.ts`                           | parseWeekStartParam, getRecentWeekStartsUtc.                      |
| `src/server/api/adherence/weekRange.test.ts`                      | Tests unitarios.                                                  |
| `src/server/api/adherence/snapshotGet.ts`                         | GET snapshot por userId + weekStart.                              |
| `src/server/api/adherence/snapshotRecompute.ts`                   | POST recompute (upsert).                                          |
| `src/server/api/adherence/snapshotRecompute.test.ts`              | Tests integración (requiere migración).                           |
| `src/server/api/adherence/trend.ts`                               | GET trend (items + missing).                                      |
| `src/app/api/adherence/snapshot/route.ts`                         | GET snapshot.                                                     |
| `src/app/api/adherence/snapshot/recompute/route.ts`               | POST recompute (rate limit 10/min).                               |
| `src/app/api/adherence/trend/route.ts`                            | GET trend.                                                        |
| `src/app/(app)/week/page.tsx`                                     | Snapshot primero, fallback weekly. Botón "Actualizar adherencia". |
| `src/app/(app)/week/page.test.tsx`                                | Mock snapshot 404.                                                |

---

## Checklist final

- [x] weekStart UTC estable (YYYY-MM-DDT00:00:00.000Z)
- [x] Snapshot idempotente (unique userId+weekStart)
- [x] Recompute rate-limited (10/min)
- [x] Trend no recomputa por defecto
- [x] UI fallback correcto
- [x] Tests verdes / validación manual documentada

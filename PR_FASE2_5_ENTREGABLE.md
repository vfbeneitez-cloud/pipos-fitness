# PR Fase 2.5 — Dashboard de tendencia + Alertas

Dashboard de adherencia (8 semanas), alertas deterministas, recompute por semana/faltantes. Sin IA.

---

## Inspección (Paso 1)

- **Rutas:** `/api/adherence/trend`, `/api/adherence/snapshot/recompute`, `/api/adherence/snapshot` en `src/app/api/adherence/`.
- **Trend response:** `{ weeks, items, missing }`. items: `{ weekStart, computedAt, trainingPercent, nutritionPercent, totalPercent, breakdown }`.
- **computeWeeklyAdherence:** `src/core/adherence/computeWeeklyAdherence.ts`.
- **Heurísticas PLAN_TOO_AMBITIOUS:** `src/core/adherence/insights.ts` (plannedTraining>=5, plannedNutrition>=28, percent<60).
- **Alertas temporales:** `src/core/adherence/alerts.ts` (LOW_ADHERENCE_STREAK, NUTRITION_DROP, PLAN_TOO_AMBITIOUS_TREND, IMPROVING_TREND).

---

## Nuevos archivos y endpoints

| Archivo                                 | Cambio                                                          |
| --------------------------------------- | --------------------------------------------------------------- |
| `src/core/adherence/alerts.ts`          | getAdherenceAlerts(items) — alertas deterministas sobre series. |
| `src/core/adherence/alerts.test.ts`     | Tests unitarios.                                                |
| `src/server/api/adherence/alerts.ts`    | getAdherenceAlertsHandler — llama trend + getAdherenceAlerts.   |
| `src/app/api/adherence/alerts/route.ts` | GET /api/adherence/alerts?weeks=8.                              |
| `src/app/(app)/insights/page.tsx`       | Página /insights: resumen, gráfico, alertas, tabla, recompute.  |
| `src/app/components/Nav.tsx`            | Link "Tendencia" a /insights.                                   |
| `src/app/(app)/insights/page.test.tsx`  | Smoke test UI.                                                  |

---

## Endpoints

| Método | Ruta                          | Descripción                          |
| ------ | ----------------------------- | ------------------------------------ |
| GET    | /api/adherence/alerts?weeks=8 | items + missing + alerts. Protegido. |

---

## Cómo probar

1. **Sin snapshots → missing + recompute:**
   - Ir a /insights. Ver banner "Faltan 8 semana(s)" y botón "Recalcular faltantes".
   - Crear plan + logs en /week. Hacer recompute por semana o "Actualizar adherencia".
   - Volver a /insights. Snapshots aparecen.

2. **Con 8 snapshots → gráfico + alertas:**
   - Después de recompute de varias semanas, ver gráfico de barras y tabla.
   - Alertas según heurísticas: LOW_ADHERENCE_STREAK, NUTRITION_DROP, PLAN_TOO_AMBITIOUS_TREND, IMPROVING_TREND.

3. **Recompute:**
   - Botón "Recalcular" por fila → POST recompute?weekStart=...
   - "Recalcular faltantes" → iteración secuencial por missing; si 429, parar y mostrar mensaje.

---

## Riesgos / rollout (5 bullets)

- Recompute rate-limited (10/min por IP). Secuencial en "Recalcular faltantes" para evitar spam.
- Página /insights requiere sesión (dentro (app)).
- Alertas deterministas, sin IA.
- No bloquea página por recompute; spinner por fila.
- No rompe /week.

---

## Límites

- Recompute rate-limited (10/min).
- No backfill automático (missing[] es informativo).
- Máximo 3 alertas, orden high → medium → low.

---

## Checklist final

- [x] Página requiere sesión (dentro (app))
- [x] Alertas deterministas y testeadas
- [x] No IA
- [x] Recompute no spamea (secuencial + manejo 429)
- [x] No rompe /week
- [x] Tests verdes

# PR Fase 2.1 — Weekly adherence endpoint + Week UI card

Adherencia semanal v1 (on-the-fly) sin cambiar contrato de /api/weekly-plan ni pantallas de logs.

---

## Archivos tocados

| Archivo | Cambio |
|--------|--------|
| `src/core/adherence/computeWeeklyAdherence.ts` | **Nuevo.** Función pura: inputs (trainingPlan, nutritionPlan, trainingLogs, nutritionLogs, weekStart), outputs (training/nutrition/totalPercent). Rango UTC [weekStart, weekStart+7d). Dedupe training por dayIndex (derivado de occurredAt). |
| `src/core/adherence/computeWeeklyAdherence.test.ts` | **Nuevo.** Tests: sin logs 0%, 3 sesiones 2 logs 67%, dedupe mismo dayIndex, nutrition planned/completed, logs fuera de rango, completed=false no cuenta. |
| `src/server/api/adherence/weekly.ts` | **Nuevo.** getWeeklyAdherence: valida weekStart, carga plan (404 si no existe), logs en rango, llama core. Respuesta: weekStart, computedAt, method v1_daily_cap, training/nutrition/totalPercent. |
| `prisma/schema.prisma` | `@@index([userId, occurredAt])` en TrainingLog y NutritionLog para queries indexables. |
| `src/app/api/adherence/weekly/route.ts` | **Nuevo.** GET con withSensitiveRoute + requireAuth, delega en getWeeklyAdherence, toNextResponse. |
| `src/app/(app)/week/page.tsx` | fetchAdherence tras cargar plan; AdherenceCard con totalPercent, training/nutrition percent; fallback "Adherencia: —" si error. |
| `src/app/(app)/week/page.test.tsx` | Mock fetch para /api/adherence/weekly en test existente. |
| `PR_FASE2_1_PASO1_EVIDENCIAS.md` | Evidencias inspección (schema, nutritionJson, getWeekStart). |
| `PR_FASE2_1_ENTREGABLE.md` | Este documento. |

---

## Cómo ejecutar tests

```bash
npm test -- --run src/core/adherence/computeWeeklyAdherence.test.ts
```

---

## Riesgos / notas (tz/UTC, dedupe)

- **TZ/UTC:** Rango semanal usa UTC (weekStart 00:00:00 UTC a weekStart+7d 00:00:00 exclusivo). Alineado con getWeekStart y createTrainingLog. Si el usuario está en timezone distinto, el “día” puede desplazarse en frontera (p. ej. usuario España: medianoche UTC = 1h/2h local).
- **Dedupe training:** Múltiples logs el mismo día (mismo dayIndex derivado de occurredAt) cuentan como 1 sesión completada. Coherente con “1 sesión por día”.
- **Nutrition v1 (method v1_daily_cap):** Agrupa por día UTC; cap mealsPerDay/día; solo followedPlan=true. Limitación: sin slot, aproxima por cantidad diaria.

## Scaling

- **Índices:** `@@index([userId, occurredAt])` en TrainingLog y NutritionLog. Ejecutar `npx prisma migrate dev` para crear migración.

## Roadmap v2 (nutrición)

- Añadir `slot` en NutritionLog (breakfast/lunch/dinner) para adherencia por slot, evitar cap heurístico e insights ("fallas la cena").

---

## Validación manual en /week

1. Iniciar sesión, ir a /week.
2. Si hay plan: tras cargar, debe aparecer card “Adherencia semanal” con totalPercent, entrenamiento y nutrición.
3. Registrar 1 sesión entrenamiento y 1 comida: refrescar /week; adherencia debe actualizarse.
4. Sin plan: no se llama /api/adherence/weekly (404 esperado si se llamara); no se muestra card de adherencia (solo “Generar plan”).

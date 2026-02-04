# Paso 1 — Evidencias inspección

1. **TrainingLog** (prisma/schema.prisma L189-205): `occurredAt` (DateTime), `completed` (Boolean default true), `planId`, `sessionName`. Útiles para adherencia: `completed`, `occurredAt`.

2. **NutritionLog** (prisma/schema.prisma L207-221): `occurredAt`, `mealName`, `followedPlan` (Boolean default true). No tiene `dayIndex` ni `mealIndex`; criterio completado: existencia de log en rango (cada log = 1 comida registrada).

3. **nutritionJson** (src/core/nutrition/generateWeeklyNutritionPlan.ts): `days: NutritionDay[]`, cada `NutritionDay` tiene `dayIndex: 0..6` y `meals: Meal[]`. Planned nutrition = suma de `days[].meals.length` (7 días × mealsPerDay).

4. **getWeekStart** (src/app/lib/week.ts): Devuelve `YYYY-MM-DD` en UTC. Lunes = día 0 (`day === 0 ? -6 : 1`). Rango semanal: `weekStart 00:00:00 UTC` a `weekStart + 7d 00:00:00 UTC` (exclusivo).

5. **createTrainingLog** (src/server/api/training/log.ts L46-52): Si `dayIndex` viene, `occurredAt` = weekStart (UTC) + dayIndex. Mismo criterio UTC que getWeekStart.

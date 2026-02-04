# Paso 1 — Evidencias inspección

1. **trainingJson** (src/core/training/generateWeeklyTrainingPlan.ts, validateWeeklyPlan): `sessions: { dayIndex: number; name: string; exercises: { slug, name, sets, reps, restSec }[] }[]`. Planificado = sessions.length; cada session tiene dayIndex 0..6.

2. **nutritionJson** (src/core/nutrition/generateWeeklyNutritionPlan.ts): `days: { dayIndex: number; meals: { slot, title, minutes, ingredients, instructions, substitutions }[] }[]`, `mealsPerDay`. Planificado = sum(days[].meals.length).

3. **computeWeeklyAdherence** (src/core/adherence/computeWeeklyAdherence.ts): devuelve `AdherenceResult` con `training: { planned, completed, percent }`, `nutrition: { planned, completed, percent }`, `totalPercent`. Usa rango UTC [weekStart, weekStart+7d), dayIndexFromDate (Monday=0).

4. **Rango semanal / day key**: weekStart UTC 00:00, end = weekStart+7d. dayIndexFromDate(d) = (d.getUTCDay() === 0 ? 6 : d.getUTCDay() - 1). Day key para nutrición: `YYYY-MM-DD` UTC.

5. **DAY_NAMES** (src/app/lib/week.ts): ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] para mapear dayIndex → nombre.

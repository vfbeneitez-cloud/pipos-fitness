# PR Fase 2.2 — Deterministic Adherence Insights

Insights deterministas y explicables (1–3 bullets + siguiente acción). Sin IA.

---

## Archivos tocados

| Archivo | Cambio |
|--------|--------|
| `src/core/adherence/insights.ts` | **Nuevo.** Tipos InsightType, Insight, NextActionType, NextAction. getWeeklyAdherenceInsights(input): heurísticas TRAINING_LOW_ADHERENCE, NUTRITION_LOW_ADHERENCE, MISSED_TRAINING_DAYS, MISSED_MEALS_DAYS, PLAN_TOO_AMBITIOUS. nextAction: REDUCE_DAYS_PER_WEEK, REDUCE_MEALS_PER_DAY, SCHEDULE_REMINDER, SIMPLIFY_COOKING_TIME, KEEP_GOING. Máx 3 insights, orden por severidad. |
| `src/core/adherence/insights.test.ts` | **Nuevo.** Tests: total>=85→KEEP_GOING, training<50 planned>=4→REDUCE_DAYS, nutrition<50 meals>=4→REDUCE_MEALS, PLAN_TOO_AMBITIOUS, max 3 insights. |
| `src/server/api/adherence/insights.ts` | **Nuevo.** getWeeklyAdherenceInsightsHandler: valida weekStart, carga plan (404 PLAN_NOT_FOUND), logs, llama computeWeeklyAdherence y getWeeklyAdherenceInsights. Respuesta: weekStart, breakdown, insights, nextAction, computedAt. |
| `src/app/api/adherence/insights/route.ts` | **Nuevo.** GET con withSensitiveRoute + requireAuth, delega en getWeeklyAdherenceInsightsHandler. |
| `src/app/(app)/week/page.tsx` | fetchInsights tras plan; InsightsCard con bullets de insights + card "Siguiente acción". Fallback silencioso (null) si falla. |
| `src/app/(app)/week/page.test.tsx` | Mock fetch para /api/adherence/insights. |
| `PR_FASE2_2_PASO1_EVIDENCIAS.md` | Evidencias inspección. |
| `PR_FASE2_2_ENTREGABLE.md` | Este documento. |

---

## Cómo probar en /week

1. Iniciar sesión, ir a /week con plan y logs.
2. Tras cargar adherencia, debe aparecer bloque "Insights de adherencia" con:
   - Bullets de insights (title + detail)
   - Card "Siguiente acción" (title + detail)
3. Si falla el fetch de insights, no rompe la semana (fallback silencioso).

---

## Riesgos / rollout (5 bullets)

- **Determinismo:** Mismo input → mismo output. Sin IA. Heurísticas documentadas en insights.ts.
- **Orden de nextAction:** Prioridad: KEEP_GOING (total>=85) > training<50 > nutrition<50.
- **Limitación v1 nutrición:** Sin slot en NutritionLog; heurística diaria (cap mealsPerDay). Puede sobrecontar snacks followedPlan=true como comidas planificadas.
- **Performance:** Endpoint reutiliza misma carga de plan+logs que /api/adherence/weekly; dos llamadas separadas desde UI (plan→adherence, plan→insights). Podría consolidarse en Fase 2.3 si hace falta.
- **i18n:** Strings en español; no hay i18n aún.

---

## Limitaciones v1

- Nutrición sin slot → heurística por cantidad diaria (v1_daily_cap). Roadmap v2: añadir slot en NutritionLog para adherencia por slot y evitar cap heurístico.

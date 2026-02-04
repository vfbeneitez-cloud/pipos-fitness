# PR Fase 2.6 — Objetivos + Streaks + Nudges

Objetivo semanal de adherencia, streak de semanas cumpliendo, nudges deterministas. Sin IA. Persistencia mínima en UserProfile.

---

## Migración

- **20260205120000_add_adherence_goal**: UserProfile.adherenceGoalPercent Int @default(70).
- `npx prisma migrate deploy`

---

## Endpoints

| Método | Ruta                                                | Descripción                                                               |
| ------ | --------------------------------------------------- | ------------------------------------------------------------------------- |
| GET    | /api/adherence/goal                                 | { goalPercent }. Protegido.                                               |
| POST   | /api/adherence/goal                                 | Body: { goalPercent: 0..100 }. Actualiza UserProfile. Protegido.          |
| GET    | /api/adherence/summary?weeks=8&weekStart=YYYY-MM-DD | goal, streak, currentWeek, previousWeek, nudge, trend, alerts. Protegido. |

---

## Reglas de streak y nudge

**Streak:** Consecutivas >= goalPercent desde la más reciente hacia atrás (items desc).

**Nudge v1:**

- `ON_TRACK` (low): currentWeekPercent >= goalPercent, sin NEW_STREAK.
- `NEW_STREAK` (low): currentWeekPercent >= goalPercent, currentStreak >= 2 y aumentó vs prev.
- `STREAK_BROKEN` (medium): currentWeekPercent < goalPercent, previousStreak >= 2 y ahora 0.
- `BEHIND_GOAL` (medium/high): currentWeekPercent < goalPercent; high si gap >= 20.

---

## Archivos tocados

| Archivo                                              | Cambio                                                                 |
| ---------------------------------------------------- | ---------------------------------------------------------------------- |
| prisma/schema.prisma                                 | adherenceGoalPercent en UserProfile.                                   |
| prisma/migrations/20260205120000_add_adherence_goal/ | Migración.                                                             |
| src/core/adherence/goals.ts                          | computeStreak, getWeeklyNudge.                                         |
| src/core/adherence/goals.test.ts                     | Tests unitarios.                                                       |
| src/server/api/adherence/goal.ts                     | getGoal, setGoal.                                                      |
| src/app/api/adherence/goal/route.ts                  | GET/POST goal.                                                         |
| src/server/api/adherence/summary.ts                  | getAdherenceSummary (goal, trend, currentWeek, streak, nudge, alerts). |
| src/app/api/adherence/summary/route.ts               | GET summary.                                                           |
| src/app/(app)/insights/page.tsx                      | Goal control, streak, nudge, summary fetch.                            |
| src/app/(app)/week/page.tsx                          | Mini nudge arriba del plan.                                            |

---

## Cómo probar manualmente

1. **Goal:** Ir a /insights, cambiar select de objetivo (50–100%). Verificar POST /api/adherence/goal y refetch.
2. **Streak:** Crear snapshots de varias semanas >= 70%. Ver "Racha: N semana(s)" en /insights.
3. **Nudge:** Semana actual < 70% → BEHIND_GOAL. Semana >= 70% con streak aumentando → NEW_STREAK.
4. **/week:** Ver mini nudge arriba del plan ("Vas al X% vs objetivo 70%" o "Objetivo cumplido").

---

## Compatibilidad

- Si UserProfile no existe: upsert con adherenceGoalPercent (create).
- Default goal: 70.

---

## Telemetría

- `adherence_goal_updated` en POST goal (200).
- `adherence_nudge_shown` en summary (200).

---

## UI goal select

- API acepta goalPercent 0–100 (int).
- UI en /insights limita opciones a 50, 60, 70, 80, 90, 100% por decisión de producto.
- El usuario no puede ponerse 30% desde la UI; puede hacerlo vía API si se desea.

---

## Checklist final

- [x] goal validado 0–100 int, default 70
- [x] streak correcto con items desc
- [x] nudges deterministas y testeados
- [x] UI permite cambiar goal sin romper
- [x] seguridad: endpoints protegidos
- [x] compat: UserProfile se crea con default 70

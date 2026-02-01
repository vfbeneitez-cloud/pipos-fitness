# AI Beta – Auditoría rápida del cambio (AI-0)

## 1) Rutas que llaman a OpenAI

| Ruta / función | Condición | Llamada LLM |
|----------------|-----------|-------------|
| **createWeeklyPlan** (`src/server/api/weeklyPlan/route.ts`) | `process.env.OPENAI_API_KEY` definido | `generatePlanFromApi(provider, ...)` → `provider.chat()` (1 llamada) |
| **adjustWeeklyPlan** (`src/server/ai/agentWeeklyPlan.ts`) | Siempre usa `getProvider()` (OpenAI si hay key, si no Mock) | 1) `provider.chat()` para ajustes (rationale + adjustments). 2) Si `OPENAI_API_KEY`: `generatePlanFromApi(provider, ...)` para plan completo (2 llamadas con API real) |

- **HTTP:** POST `/api/weekly-plan` → `createWeeklyPlan`.  
- **HTTP:** POST `/api/agent/weekly-plan` y POST `/api/cron/weekly-regenerate` → `adjustWeeklyPlan`.

---

## 2) Datos que entran al prompt

### createWeeklyPlan → generatePlanFromApi (plan semanal)

- **Perfil (UserProfile):** `level`, `goal`, `injuryNotes`, `equipmentNotes`, `dietaryStyle`, `allergies`, `dislikes`.
- **Parámetros de request/plan:** `finalEnvironment`, `finalDaysPerWeek`, `finalSessionMinutes`, `finalMealsPerDay`, `finalCookingTime`.
- **Prompt de usuario:** texto con "Perfil: nivel X, objetivo Y, entorno Z, N días/semana, M min/sesión" + "Nutrición: K comidas/día, tiempo cocina, dieta, alergias, dislikes" + opcional "Notas lesiones" + opcional "Equipamiento".

### adjustWeeklyPlan (ajustes)

- **Perfil:** `level`, `daysPerWeek`, `sessionMinutes`, `environment`, `mealsPerDay`, `cookingTime`.
- **Logs 7 días:** conteos de sesiones completadas y comidas según plan; si hay red flags, mensaje de dolor/riesgo.
- **Estado:** "Plan actual: existe / no existe".
- **Salida esperada en prompt:** `{ rationale, adjustments: { daysPerWeek, sessionMinutes, environment, mealsPerDay, cookingTime } }` (todos opcionales/null).

---

## 3) Datos que salen (shape exacto)

### generatePlanFromApi (PlanFromApiSchema)

```ts
{
  training: {
    environment: "GYM"|"HOME"|"CALISTHENICS"|"POOL"|"MIXED",
    daysPerWeek: number,
    sessionMinutes: number,
    sessions: Array<{
      dayIndex: number,
      name: string,
      exercises: Array<{
        slug: string,
        name: string,
        sets: number,
        reps: string,
        restSec: number
      }>
    }>
  },
  nutrition: {
    mealsPerDay: number,
    cookingTime: "MIN_10"|"MIN_20"|"MIN_40"|"FLEXIBLE",
    dietaryStyle?: string | null,
    allergies?: string | null,
    dislikes?: string | null,
    days: Array<{
      dayIndex: number,
      meals: Array<{
        slot: "breakfast"|"lunch"|"dinner"|"snack",
        title: string,
        minutes: number,
        tags: string[],
        ingredients: string[],
        instructions: string,
        substitutions: Array<{ title: string, minutes: number }>
      }>
    }>
  }
}
```

- **Derivado en código:** `exercisesToUpsert: Array<{ slug, name, environment }>` (slug únicos por sesión).

### adjustWeeklyPlan (respuesta de ajustes)

- No hay Zod: se hace `JSON.parse(response.content)` y se leen `rationale` y `adjustments` (daysPerWeek, sessionMinutes, environment, mealsPerDay, cookingTime). Si falla parse o no hay ajustes válidos, se usan fallbacks (red_flag / parse_error / provider_error).

---

## 4) Dónde se escribe en DB

| Acción | Tabla | Ubicación |
|--------|--------|-----------|
| Plan semanal | **WeeklyPlan** (upsert por `userId` + `weekStart`) | `createWeeklyPlan`: `prisma.weeklyPlan.upsert` (trainingJson, nutritionJson, status). `adjustWeeklyPlan`: mismo upsert + `lastRationale`, `lastGeneratedAt`. |
| Ejercicios nuevos/actualizados | **Exercise** | `createWeeklyPlan`: tras `generatePlanFromApi`, `prisma.exercise.upsert` por cada `planResult.exercisesToUpsert` (where: slug; update/create: slug, name, environment). `adjustWeeklyPlan`: mismo bloque de `exercisesToUpsert` y `prisma.exercise.upsert` cuando `useApiForPlan` y `planResult` no null. |

- **Exercise:** solo se tocan `slug`, `name`, `environment`. No se escriben `primaryMuscle`, `description`, `cues`, etc., desde el agente.

---

## 5) Invariantes que deben cumplirse siempre

- **weekStart:** Mismo valor normalizado en toda la petición (formato `YYYY-MM-DD`, normalizado a UTC medianoche). Clave única de plan: `(userId, weekStart)`.
- **Sesiones de entrenamiento:** `training.sessions.length === daysPerWeek` (una sesión por día de entreno; dayIndex en 0..6).
- **Días de nutrición:** `nutrition.days.length === 7` y cada día tiene `dayIndex` 0..6 sin repetir; cada día tiene exactamente `mealsPerDay` comidas (según perfil/plan).
- **Slugs de ejercicio:** Todo `slug` en `training.sessions[].exercises[]` debe ser válido (alfanumérico-kebab). Antes de guardar en `WeeklyPlan`, los ejercicios devueltos por la API se crean/actualizan en `Exercise` vía upsert; no se debe referenciar un slug que no exista o no se haya creado en ese flujo (o que no esté en el pool cuando no hay API).
- **Sin texto técnico/medicalizado:** Prompts piden "NO diagnóstico médico"; rationale y mensajes al usuario sin jerga médica ni promesas de resultados; red flags llevan a mensaje genérico y ajustes conservadores.

---

*Solo reporte; sin cambios de código.*

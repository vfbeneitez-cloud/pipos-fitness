# 08 — AI Agent MVP (Weekly Plan Adjustment)

## Objetivo

Endpoint que permite al agente IA ajustar un plan semanal existente basándose en perfil, logs recientes y reglas de seguridad.

## Endpoint

POST `/api/agent/weekly-plan`

## Input

```json
{
  "userId": "string",
  "weekStart": "YYYY-MM-DD"
}
```

## Comportamiento

1. Valida input con Zod (`userId` no vacío, `weekStart` formato `YYYY-MM-DD`).
2. Lee perfil del usuario (`UserProfile`).
3. Lee logs recientes (`TrainingLog` y `NutritionLog` de los últimos 7 días).
4. Lee plan actual de la semana (si existe).
5. Detecta red flags en logs (dolor agudo, mareos, síntomas serios).
6. Si hay red flags:
   - Genera mensaje recomendando profesional sanitario.
   - Propone ajustes conservadores (reducir días/sesión, simplificar nutrición).
7. Si no hay red flags:
   - Analiza adherencia (sesiones hechas, comidas cumplidas).
   - Propone ajustes graduales según adherencia y feedback.
8. Usa herramientas internas para generar nuevo plan:
   - `generateWeeklyTrainingPlan` con parámetros ajustados.
   - `generateWeeklyNutritionPlan` con parámetros ajustados.
9. Guarda plan actualizado en `WeeklyPlan` (status `DRAFT` o `ACTIVE` según decisión).
10. Devuelve plan + rationale breve (texto sin PII, sin claims médicos).

## Output

```json
{
  "plan": {
    "id": "string",
    "userId": "string",
    "weekStart": "string",
    "status": "DRAFT" | "ACTIVE",
    "trainingJson": {...},
    "nutritionJson": {...}
  },
  "rationale": "string" // explicación breve de cambios, sin PII ni diagnóstico médico
}
```

## Errores

- 400 `INVALID_BODY` si Zod falla.
- 404 `USER_NOT_FOUND` si `userId` no existe.
- 400 `INVALID_JSON` si el body no es JSON válido.

## Reglas de seguridad (ADR-0005)

- Sin diagnóstico médico en rationale.
- Red flags → mensaje de recomendación profesional + ajustes conservadores.
- No dietas extremas ni recomendaciones peligrosas.
- Si faltan datos: asumir conservador y devolver plan usable.

## Provider

- Mock provider por defecto (determinista, sin clave).
- Si existe `OPENAI_API_KEY`, usar OpenAI provider (opcional).
- Interface abstracta para cambiar provider fácilmente.

## Tests

- Happy path: ajuste basado en adherencia.
- Red flags: detección y mensaje conservador.
- Invalid input: 400.
- User not found: 404.

## Signals used by the agent (MVP)

The agent bases its adjustments on 7-day trends, never on a single log.

### Training signals

- completion rate (sessions completed / planned)
- perceived difficulty (easy / ok / hard)
- pain presence (boolean)
- recurring pain notes (text, pattern-based only)

### Nutrition signals

- adherence frequency (followedPlan true/false)
- hunger trend (low / ok / high)
- logging consistency

### Ignored signals (MVP)

- single-day failures
- isolated missed sessions
- isolated hunger spikes
- free-text notes unless recurring

## Decision mapping (signals -> adjustments)

The agent applies deterministic rules based on 7-day trends.

### Training decisions

| Signal                                     | Interpretation      | Adjustment                       |
| ------------------------------------------ | ------------------- | -------------------------------- |
| >=80% sessions completed + difficulty = ok | Adequate load       | Maintain plan                    |
| >=80% completed + difficulty = easy        | Understimulation    | +1 exercise in 1-2 sessions      |
| <50% completed (no pain)                   | Logistical overload | -1 session or simplify           |
| pain = true in >=2 logs                    | Risk                | Reduce volume / simpler variants |
| Recurring painNotes pattern                | Localized risk      | Avoid related exercises          |

### Nutrition decisions

| Signal                              | Interpretation        | Adjustment                   |
| ----------------------------------- | --------------------- | ---------------------------- |
| followedPlan frequent + hunger = ok | Adequate plan         | Maintain                     |
| hunger = high recurring             | Insufficient satiety  | Increase portions indirectly |
| followedPlan low (no high hunger)   | Friction / complexity | Simplify meals               |
| Inconsistent logs                   | Insufficient data     | Maintain plan                |

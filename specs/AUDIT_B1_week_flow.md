# Auditoría MVP — B1: Flujo Week

## 1. Datos cargados y origen

| Dato         | Origen                                         | Cuándo                                                        |
| ------------ | ---------------------------------------------- | ------------------------------------------------------------- |
| Plan semanal | `GET /api/weekly-plan?weekStart={YYYY-MM-DD}`  | `useEffect` en mount, y al pulsar "Reintentar" en ErrorBanner |
| `weekStart`  | `getWeekStart(new Date())` (semana actual)     | Cálculo local                                                 |
| `todayIndex` | `(new Date().getDay() + 6) % 7` (0=Lun, 6=Dom) | Cálculo local                                                 |

El plan incluye: `trainingJson.sessions`, `nutritionJson.days`, `lastRationale`, `lastGeneratedAt`, `userId`, `weekStart`.

---

## 2. Estados

| Estado      | Condición                             | Render                                                                  |
| ----------- | ------------------------------------- | ----------------------------------------------------------------------- |
| **loading** | `plan === undefined && loading`       | Skeleton + título "Semana actual"                                       |
| **error**   | `error !== null`                      | ErrorBanner + resto del layout (puede coexistir con empty o success)    |
| **empty**   | `plan === null && !error`             | Mensaje + CTA "Generar plan"                                            |
| **success** | `plan !== null && plan !== undefined` | Bloque HOY + lista entrenamiento + menú (hoy) + RationalePanel (si hay) |

**Nota:** Tras el loading inicial, el return principal no hace early-exit por loading. Los estados `error` y `plan === null` pueden mostrarse juntos (error tiene prioridad visual; `plan === null && !error` es el empty puro). Si hay error, `plan` puede ser `null`; el bloque empty no se muestra porque `!error` es false.

---

## 3. CTAs por estado

### Loading

- Ninguno (solo skeleton).

### Error

- **Primario:** "Reintentar" (en ErrorBanner) → `fetchPlan()`.

### Empty (sin plan)

- **Primario:** "Generar plan" → `/onboarding`.

### Success — Bloque HOY con sesión

- **Primario:** "Empezar entrenamiento" → `/session/[dayIndex]`.

### Success — Bloque HOY sin sesión (descanso)

- **Primario:** "Ver semana" → `/week` (estamos ya en week; redundante).
- **Secundario:** "Registrar entrenamiento igualmente" → `/log/training`.

### Success — Sección Entrenamiento

- Lista: cada ítem es link a `/session/[dayIndex]`.
- **Secundario:** "Registrar entrenamiento" → `/log/training`.

### Success — Sección Menú (hoy)

- Por comida: "Cambiar" (SwapMealButton) → modal con alternativa.
- **Secundario:** "Registrar comida" → `/log/nutrition`.

### Success — RationalePanel

- **Secundario:** "Ver motivo" / "Ocultar motivo" (toggle).

---

## 4. Copy por estado

| Estado                   | Copy                                                                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Loading                  | "Semana actual" (título)                                                                                                                         |
| Error                    | "Error al cargar el plan." / "Error de red. Reintenta." + "Reintentar"                                                                           |
| Empty                    | "Aún no tienes plan para esta semana." + "Generar plan"                                                                                          |
| Success — HOY con sesión | "HOY · {día}", nombre sesión, "Empezar entrenamiento"                                                                                            |
| Success — HOY descanso   | "HOY · Día de descanso", "El descanso es parte del plan. No hay sesión programada para hoy.", "Ver semana", "Registrar entrenamiento igualmente" |
| Success — Entrenamiento  | "Entrenamiento", "Lun — Session A", etc., "Registrar entrenamiento"                                                                              |
| Success — Menú           | "Menú (hoy)", "Sin menú para hoy." (si no hay), "Registrar comida"                                                                               |
| RationalePanel           | "Última actualización del plan — {fecha}", "Ver motivo", "Ocultar motivo"                                                                        |
| SwapMealButton           | "Cambiar", "Alternativa", "Cargando…", "Cerrar"                                                                                                  |

---

## 5. Riesgos UX

| Riesgo                                   | Severidad | Descripción                                                                                                                                                                         |
| ---------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CTA redundante en descanso**           | Bajo      | "Ver semana" en HOY descanso lleva a `/week`; el usuario ya está en esa página. El click no cambia nada.                                                                            |
| **Error + empty simultáneos**            | Bajo      | Si hay error, `plan` es null pero el bloque empty no se muestra (`!error`). Solo se ve ErrorBanner. Correcto.                                                                       |
| **Sin refresco automático**              | Bajo      | Tras generar plan en onboarding (redirect a /week), se hace fetch. Si el usuario vuelve por Nav sin recargar, los datos están en memoria. OK.                                       |
| **SwapMealButton sin feedback de error** | Medio     | Si `!res.ok`, no se muestra mensaje al usuario; el modal queda en "Cargando…" o con estado anterior. No hay ErrorBanner en el swap.                                                 |
| **Múltiples CTAs de "Registrar"**        | Bajo      | "Registrar entrenamiento" aparece en descanso (secundario) y en sección Entrenamiento. "Registrar comida" una vez. Coherente con specs B3.a.1.                                      |
| **Lista de días siempre clickeable**     | Bajo      | Cada día en la lista enlaza a `/session/[dayIndex]`; en descanso el ítem muestra "Descanso" pero sigue siendo link. Puede llevar a sesión vacía. Comportamiento actual según specs. |

---

## 6. Resumen

- **Datos:** Un único fetch a `/api/weekly-plan`; `weekStart` y `todayIndex` se calculan en cliente.
- **Estados:** loading, error, empty, success bien diferenciados; error tiene prioridad sobre empty.
- **CTAs:** Claros; el único redundante es "Ver semana" en descanso.
- **Copy:** Consistente, en español, orientado a acción.
- **Riesgo principal:** SwapMealButton sin manejo de error visible para el usuario.

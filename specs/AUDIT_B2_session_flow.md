# Auditoría MVP — B2: Flujo Session/[dayIndex]

## 1. Datos cargados y origen

| Dato           | Origen                                                             | Cuándo                                                        |
| -------------- | ------------------------------------------------------------------ | ------------------------------------------------------------- |
| Plan semanal   | `GET /api/weekly-plan?weekStart={YYYY-MM-DD}`                      | `useEffect` en mount, y al pulsar "Reintentar" en ErrorBanner |
| `dayIndex`     | `useParams().dayIndex` (ruta dinámica)                             | Parámetro de URL                                              |
| `weekStart`    | `getWeekStart(new Date())`                                         | Cálculo local                                                 |
| Sesión del día | `plan?.trainingJson?.sessions?.find(s => s.dayIndex === dayIndex)` | Derivado del plan                                             |

---

## 2. Estados

| Estado                     | Condición                                     | Render                                                                           |
| -------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------- |
| **invalid dayIndex**       | `dayIndex` NaN, &lt; 0 o &gt; 6               | Mensaje + "Volver a la semana"                                                   |
| **loading**                | `plan === undefined && loading`               | Skeleton + título "Sesión"                                                       |
| **día libre**              | `plan` existe y no hay sesión para `dayIndex` | Mensaje "Día libre o recuperación activa" + "Ver semana"                         |
| **error**                  | `error !== null`                              | ErrorBanner + resto del layout (cuando hay sesión)                               |
| **success**                | `session` existe                              | Lista de ejercicios + CTA "Registrar entrenamiento"                              |
| **plan null (sin sesión)** | `plan === null` y no error                    | Cae en el return principal; `session` undefined; título "Lunes — " sin contenido |

**Nota:** Si `plan === null` (API devuelve 200 con body null) y no hay error, se renderiza el layout principal pero `session` es undefined. El bloque `{session && (...)}` no se muestra; queda solo breadcrumb + título incompleto ("Lunes — ") sin CTAs.

---

## 3. CTAs por estado

### Invalid dayIndex

- **Primario:** "Volver a la semana" → `/week`.

### Loading

- Ninguno.

### Día libre (plan existe, sin sesión para ese día)

- **Primario:** "Ver semana" → `/week`.

### Error (con sesión cargada)

- **Primario:** "Reintentar" (ErrorBanner) → `fetchPlan()`.

### Success (sesión con ejercicios)

- **Breadcrumb:** "← Semana" → `/week`.
- **Por ejercicio:** Link a `/exercise/[slug]` ("Ver guía →").
- **Primario:** "Registrar entrenamiento" → `/log/training`.

---

## 4. Copy por estado

| Estado           | Copy                                                                                                                    |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Invalid dayIndex | "Día no válido." + "Volver a la semana"                                                                                 |
| Loading          | "Sesión" (título)                                                                                                       |
| Día libre        | "{Día}", "Día libre o recuperación activa.", "Ver semana"                                                               |
| Error            | "Error al cargar el plan." / "Error de red. Reintenta." + "Reintentar"                                                  |
| Success          | "← Semana", "{Día} — {nombre sesión}", "{sets} × {reps} — {restSec}s descanso", "Ver guía →", "Registrar entrenamiento" |

---

## 5. Riesgos UX

| Riesgo                              | Severidad | Descripción                                                                                                                                                           |
| ----------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Plan null sin contenido**         | Medio     | Si `plan === null` (sin plan en la semana) y no hay error, se muestra título "{Día} — " sin ejercicios ni CTA. No hay mensaje tipo "Sin plan" ni enlace a onboarding. |
| **Error + sesión parcial**          | Bajo      | Si hay error pero ya teníamos `plan` en memoria de un fetch anterior, se muestra ErrorBanner y la sesión. Coherente: permitimos retry sin perder contexto.            |
| **Navegación directa a /session/X** | Bajo      | Usuario puede ir a /session/5 sin tener plan. El fetch devuelve null → estado "plan null" descrito arriba.                                                            |
| **Sin CTA de descanso en sesión**   | Bajo      | En "día libre" solo hay "Ver semana". No hay "Registrar entrenamiento igualmente" como en /week. Comportamiento distinto al bloque HOY descanso en week.              |
| **Un solo CTA principal**           | —         | Correcto: "Registrar entrenamiento" es el CTA único al final; no compite con "Empezar" (ya estamos en la sesión).                                                     |

---

## 6. Resumen

- **Datos:** Mismo fetch que week (`/api/weekly-plan`); `dayIndex` desde params; sesión derivada del plan.
- **Estados:** invalid, loading, día libre, error, success. Hueco en plan null sin error.
- **CTAs:** Volver a la semana, Ver semana, Reintentar, Ver guía (por ejercicio), Registrar entrenamiento.
- **Copy:** Consistente, en español.
- **Riesgo principal:** Estado cuando `plan === null` sin error: título incompleto y sin CTAs.

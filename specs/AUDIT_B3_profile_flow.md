# Auditoría MVP — B3: Flujo Profile

## 1. Datos cargados y origen

| Dato                      | Origen                               | Cuándo                                                     |
| ------------------------- | ------------------------------------ | ---------------------------------------------------------- |
| Perfil de usuario         | `GET /api/profile`                   | `useEffect` en mount, y al pulsar "Reintentar" (loadKey++) |
| Formulario (estado local) | 13 campos controlados por `useState` | Inicializados desde `data.profile` al cargar               |

Campos del perfil: goal, level, daysPerWeek, sessionMinutes, environment, equipmentNotes, injuryNotes, dietaryStyle, allergies, dislikes, cookingTime, mealsPerDay.

---

## 2. Estados

| Estado                 | Condición                    | Render                                     |
| ---------------------- | ---------------------------- | ------------------------------------------ |
| **loading**            | `profile === "loading"`      | Skeleton + título "Perfil"                 |
| **error (sin perfil)** | `profile === null && error`  | ErrorBanner + "Reintentar" (retry recarga) |
| **empty (onboarding)** | `profile === null && !error` | Mensaje + CTA "Ir a onboarding"            |
| **success**            | `profile` es `UserProfile`   | Formulario completo + CTAs                 |

En success pueden coexistir `error` (de Save o Regenerar) y `successMessage` (tras guardar OK). El ErrorBanner y el mensaje de éxito se muestran arriba del formulario.

---

## 3. CTAs por estado

### Loading

- Ninguno.

### Error (carga fallida)

- **Primario:** "Reintentar" → `setError(null)`, `setProfile("loading")`, `loadKey++` (refetch).

### Empty (sin perfil)

- **Primario:** "Ir a onboarding" → `/onboarding`.

### Success — Formulario

- **Primario:** "Guardar cambios" → `handleSave` (PUT /api/profile).
- **Secundario:** "Regenerar plan de esta semana" → abre modal.

### Success — Modal regenerar

- **Primario:** "Confirmar" → `handleRegenConfirm` (POST /api/agent/weekly-plan) → redirect a /week.
- **Secundario:** "Cancelar" → cierra modal.

---

## 4. Copy por estado

| Estado / Sección           | Copy                                                                                                                                                        |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading                    | "Perfil" (título)                                                                                                                                           |
| Error carga                | "No se pudo cargar el perfil." / "Error de red. Reintenta." + "Reintentar"                                                                                  |
| Empty                      | "Aún no tienes perfil. Configura tus preferencias para generar tu plan." + "Ir a onboarding"                                                                |
| Error Save/Regen           | "Error al guardar." / "Error al regenerar plan." / "Error de red. Reintenta." + "Reintentar"                                                                |
| Success Save               | "Perfil actualizado." (mensaje verde)                                                                                                                       |
| Formulario — Entrenamiento | "Entrenamiento", "Objetivo (opcional)", "Nivel", "Días por semana", "Minutos por sesión", "Entorno", "Notas equipo (opcional)", "Notas lesiones (opcional)" |
| Formulario — Nutrición     | "Nutrición", "Comidas al día", "Tiempo para cocinar", "Estilo (opcional)", "Alergias (opcional)", "Disgustos (opcional)"                                    |
| CTAs                       | "Guardar cambios", "Regenerar plan de esta semana"                                                                                                          |
| Modal                      | "Regenerar plan", "Se regenerará el plan DRAFT de la semana actual. Los logs no se borran.", "Cancelar", "Confirmar"                                        |

---

## 5. Riesgos UX

| Riesgo                               | Severidad | Descripción                                                                                                                                                                           |
| ------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Reintentar en error Save/Regen**   | Bajo      | ErrorBanner en success usa `onRetry={() => setError(null)}`. No vuelve a cargar; solo oculta el error. Correcto para errores de submit: el usuario puede corregir y guardar de nuevo. |
| **Dos CTAs principales**             | Bajo      | "Guardar cambios" y "Regenerar plan" son acciones distintas. El primero es principal (formulario); el segundo es secundario (borde). Sin conflicto.                                   |
| **Error en regenerar sin feedback**  | Medio     | Si `handleRegenConfirm` falla, se cierra el modal (`setRegenModalOpen(false)`) y se muestra ErrorBanner. El usuario ve el error pero el modal ya no está. OK; el error queda visible. |
| **successMessage persistente**       | Bajo      | Tras "Perfil actualizado.", el mensaje verde permanece hasta el siguiente guardado o error. No se autocierra. Aceptable para MVP.                                                     |
| **Sin loading en retry**             | Bajo      | Al retry de carga, `setProfile("loading")` muestra skeleton. No hay estado "loading" separado; se reutiliza el branch de loading. Correcto.                                           |
| **Formulario sin validación visual** | Bajo      | Los inputs tienen min/max (días 1–7, minutos 15–180, comidas 2–5). No hay mensajes de validación en cliente; el API devuelve error si algo falla. Aceptable.                          |

---

## 6. Resumen

- **Datos:** Un fetch a `GET /api/profile`; formulario controlado localmente; retry con `loadKey` para forzar refetch.
- **Estados:** loading, error (carga), empty (onboarding), success (formulario). En success: error y successMessage opcionales.
- **CTAs:** Reintentar, Ir a onboarding, Guardar cambios, Regenerar plan (→ modal → Confirmar/Cancelar).
- **Copy:** Consistente, en español, con secciones Entrenamiento y Nutrición.
- **Riesgos:** Menores; flujo coherente. Error de regenerar se muestra en banner tras cerrar el modal.

# Auditoría MVP - C1: Inventario de copy

Texto visible al usuario agrupado por ruta. Tono: humano (H) / técnico (T). Consistencia con MVP.

---

## 1. Week (`/week`)

| Texto                                                             | Tipo       | Tono | Notas |
| ----------------------------------------------------------------- | ---------- | ---- | ----- |
| Semana actual                                                     | h1         | H    | OK    |
| Error al cargar el plan.                                          | error      | H    | OK    |
| Error de red. Reintenta.                                          | error      | H    | OK    |
| Aún no tienes plan para esta semana.                              | empty      | H    | OK    |
| Generar plan                                                      | CTA        | H    | OK    |
| HOY · {día} / Día de descanso                                     | h2         | H    | OK    |
| El descanso es parte del plan. No hay sesión programada para hoy. | body       | H    | OK    |
| Registrar entrenamiento igualmente                                | CTA        | H    | OK    |
| Empezar entrenamiento                                             | CTA        | H    | OK    |
| Entrenamiento                                                     | h2         | H    | OK    |
| Registrar entrenamiento                                           | CTA        | H    | OK    |
| Menú (hoy)                                                        | h2         | H    | OK    |
| Registrar comida                                                  | CTA        | H    | OK    |
| Última actualización del plan — {fecha}                           | h2         | H    | OK    |
| Ver motivo / Ocultar motivo                                       | CTA        | H    | OK    |
| Sin menú para hoy.                                                | empty      | H    | OK    |
| Cambiar                                                           | CTA        | H    | OK    |
| Alternativa                                                       | h3 (modal) | H    | OK    |
| Cargando…                                                         | loading    | H    | OK    |
| No se pudo cambiar. Reintenta.                                    | error      | H    | OK    |
| Reintentar                                                        | CTA        | H    | OK    |
| Cerrar                                                            | CTA        | H    | OK    |

---

## 2. Session (`/session/[dayIndex]`)

| Texto                                  | Tipo       | Tono | Notas               |
| -------------------------------------- | ---------- | ---- | ------------------- |
| Día no válido.                         | error      | H    | OK                  |
| Volver a la semana                     | CTA        | H    | OK                  |
| Sesión                                 | h1         | H    | OK                  |
| ← Semana                               | breadcrumb | H    | OK                  |
| Aún no tienes plan para esta semana.   | empty      | H    | Duplicado con /week |
| Ir a la semana                         | CTA        | H    | OK                  |
| Generar plan                           | CTA        | H    | OK                  |
| Día libre o recuperación activa.       | body       | H    | OK                  |
| Ver semana                             | CTA        | H    | OK                  |
| Registrar entrenamiento igualmente     | CTA        | H    | OK                  |
| {DAY_NAMES[dayIndex]} — {session.name} | h1         | H    | OK                  |
| Ver guía →                             | CTA        | H    | OK                  |
| Registrar entrenamiento                | CTA        | H    | OK                  |

---

## 3. Profile (`/profile`)

| Texto                                                                   | Tipo       | Tono | Notas                           |
| ----------------------------------------------------------------------- | ---------- | ---- | ------------------------------- |
| Perfil                                                                  | h1         | H    | OK                              |
| No se pudo cargar el perfil.                                            | error      | H    | OK                              |
| Error de red. Reintenta.                                                | error      | H    | OK                              |
| Aún no tienes perfil. Configura tus preferencias para generar tu plan.  | empty      | H    | OK                              |
| Ir a onboarding                                                         | CTA        | T    | "onboarding" es término técnico |
| Error al guardar.                                                       | error      | H    | OK                              |
| Perfil actualizado.                                                     | success    | H    | OK                              |
| Entrenamiento                                                           | h2         | H    | OK                              |
| Objetivo (opcional)                                                     | label      | H    | OK                              |
| Nivel                                                                   | label      | H    | OK                              |
| Días por semana                                                         | label      | H    | OK                              |
| Minutos por sesión                                                      | label      | H    | OK                              |
| Entorno                                                                 | label      | H    | OK                              |
| Notas equipo (opcional)                                                 | label      | H    | OK                              |
| Notas lesiones (opcional)                                               | label      | H    | OK                              |
| Nutrición                                                               | h2         | H    | OK                              |
| Comidas al día                                                          | label      | H    | OK                              |
| Tiempo para cocinar                                                     | label      | H    | OK                              |
| Estilo (opcional)                                                       | label      | H    | OK                              |
| Alergias (opcional)                                                     | label      | H    | OK                              |
| Disgustos (opcional)                                                    | label      | H    | OK                              |
| Guardar cambios                                                         | CTA        | H    | OK                              |
| Guardando…                                                              | loading    | H    | OK                              |
| Regenerar plan de esta semana                                           | CTA        | H    | OK                              |
| Regenerar plan                                                          | h2 (modal) | H    | OK                              |
| Se regenerará el plan DRAFT de la semana actual. Los logs no se borran. | body       | T    | "DRAFT", "logs" son técnicos    |
| Cancelar                                                                | CTA        | H    | OK                              |
| Confirmar                                                               | CTA        | H    | OK                              |
| Regenerando…                                                            | loading    | H    | OK                              |

---

## 4. Log Training (`/log/training`)

| Texto                             | Tipo       | Tono | Notas |
| --------------------------------- | ---------- | ---- | ----- |
| ← Semana                          | breadcrumb | H    | OK    |
| Registrar entrenamiento           | h1         | H    | OK    |
| Sesión no encontrada.             | error      | H    | OK    |
| Error al guardar.                 | error      | H    | OK    |
| Error de red. Reintenta.          | error      | H    | OK    |
| ¿Has entrenado hoy?               | legend     | H    | OK    |
| ¿Cómo se sintió el entrenamiento? | legend     | H    | OK    |
| Fácil / Normal / Duro             | labels     | H    | OK    |
| ¿Sentiste dolor o molestias?      | legend     | H    | OK    |
| Añadir nota (opcional)            | CTA        | H    | OK    |
| Guardar entrenamiento             | CTA        | H    | OK    |
| Guardando…                        | loading    | H    | OK    |

---

## 5. Log Nutrition (`/log/nutrition`)

| Texto                        | Tipo       | Tono | Notas |
| ---------------------------- | ---------- | ---- | ----- |
| ← Semana                     | breadcrumb | H    | OK    |
| Registrar comida             | h1         | H    | OK    |
| Sesión no encontrada.        | error      | H    | OK    |
| Error al guardar.            | error      | H    | OK    |
| Error de red. Reintenta.     | error      | H    | OK    |
| ¿Has seguido el menú de hoy? | legend     | H    | OK    |
| Sensación de hambre          | legend     | H    | OK    |
| Poca / Normal / Mucha        | labels     | H    | OK    |
| Añadir nota (opcional)       | CTA        | H    | OK    |
| Guardar comida               | CTA        | H    | OK    |
| Guardando…                   | loading    | H    | OK    |

---

## 6. Onboarding (`/onboarding`)

| Texto                                                                         | Tipo    | Tono | Notas                                                  |
| ----------------------------------------------------------------------------- | ------- | ---- | ------------------------------------------------------ |
| Pipos Fitness                                                                 | h1      | H    | OK                                                     |
| Error al guardar perfil.                                                      | error   | H    | Inconsistente: profile usa "Error al guardar."         |
| Error al crear plan.                                                          | error   | H    | OK                                                     |
| Error de red. Reintenta.                                                      | error   | H    | OK                                                     |
| Bienvenido                                                                    | h2      | H    | OK                                                     |
| Planes semanales de entrenamiento y nutrición, con guía visual de ejercicios. | body    | H    | OK                                                     |
| Empezar                                                                       | CTA     | H    | OK                                                     |
| Entrenamiento                                                                 | h2      | H    | OK                                                     |
| Objetivo (opcional)                                                           | label   | H    | OK                                                     |
| Nivel                                                                         | label   | H    | OK                                                     |
| Días por semana                                                               | label   | H    | OK                                                     |
| Minutos por sesión                                                            | label   | H    | OK                                                     |
| Entorno                                                                       | label   | H    | OK                                                     |
| Nutrición                                                                     | h2      | H    | OK                                                     |
| Comidas al día                                                                | label   | H    | OK                                                     |
| Tiempo para cocinar                                                           | label   | H    | OK                                                     |
| Estilo (opcional)                                                             | label   | H    | OK                                                     |
| Alergias (opcional)                                                           | label   | H    | OK                                                     |
| No me gusta (opcional)                                                        | label   | H    | **Inconsistencia:** profile usa "Disgustos (opcional)" |
| Atrás                                                                         | CTA     | H    | OK                                                     |
| Siguiente                                                                     | CTA     | H    | OK                                                     |
| Resumen                                                                       | h2      | H    | OK                                                     |
| Crear mi primera semana                                                       | CTA     | H    | OK                                                     |
| Creando plan…                                                                 | loading | H    | OK                                                     |

---

## 7. Auth

### Signin (`/auth/signin`)

| Texto                   | Tipo | Tono  | Notas                                     |
| ----------------------- | ---- | ----- | ----------------------------------------- |
| Sign in to your account | h1   | **T** | Inglés y técnico. MVP debería ser español |
| Continuar con Google    | CTA  | H     | OK                                        |

### Verify (`/auth/verify`)

Sin copy visible (redirect).

---

## 8. Exercise (`/exercise/[slug]`)

| Texto                          | Tipo       | Tono | Notas                             |
| ------------------------------ | ---------- | ---- | --------------------------------- |
| ← Semana                       | breadcrumb | H    | OK                                |
| Tu navegador no soporta vídeo. | fallback   | T    | Técnico; poco probable que se vea |
| Sin media (placeholder)        | empty      | T    | "placeholder" es término dev      |
| Descripción                    | h2         | H    | OK                                |
| Puntos clave                   | h2         | H    | OK                                |
| Errores comunes y seguridad    | h2         | H    | OK                                |
| Versión más fácil              | h2         | H    | OK                                |
| Versión más difícil            | h2         | H    | OK                                |
| ← Volver a la semana           | CTA        | H    | OK                                |

---

## 9. Componentes compartidos

### ErrorBanner

| Texto      | Tipo | Tono | Notas |
| ---------- | ---- | ---- | ----- |
| Reintentar | CTA  | H    | OK    |

### Nav

| Texto  | Tipo | Tono | Notas |
| ------ | ---- | ---- | ----- |
| Semana | link | H    | OK    |
| Perfil | link | H    | OK    |

---

## Resumen: Duplicados e inconsistencias

### Duplicados (mismo concepto, distintos textos)

| Concepto                | Variantes                                                        | Recomendación                                                                |
| ----------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Ir a semana             | "Ir a la semana", "Ver semana", "Volver a la semana", "← Semana" | Contexto distinto (session plan null vs día libre vs breadcrumb). Aceptable. |
| Registrar entrenamiento | "Registrar entrenamiento", "Registrar entrenamiento igualmente"  | Coherente: "igualmente" solo en descanso. OK                                 |
| Guardar                 | "Guardar cambios", "Guardar entrenamiento", "Guardar comida"     | Coherente por contexto. OK                                                   |
| Error guardar           | "Error al guardar.", "Error al guardar perfil."                  | **Inconsistencia menor:** unificar en formularios                            |
| Empty plan              | "Aún no tienes plan para esta semana."                           | Duplicado en week y session; mismo mensaje, OK                               |

### Inconsistencias

| Ubicación             | Problema                                       | Tono                 |
| --------------------- | ---------------------------------------------- | -------------------- |
| auth/signin           | "Sign in to your account" en inglés            | T                    |
| profile               | "Ir a onboarding" — término técnico            | T                    |
| profile modal         | "plan DRAFT", "logs" — jerga técnica           | T                    |
| onboarding vs profile | "No me gusta" vs "Disgustos" para mismo campo  | H pero inconsistente |
| exercise              | "Sin media (placeholder)" — placeholder es dev | T                    |
| exercise              | "Tu navegador no soporta vídeo" — técnico      | T                    |

### Consistencia "Reintentar"

- ErrorBanner, SwapMealButton, week/session/profile/log: todos usan "Reintentar". OK.

### Placeholders

| Ubicación                | Placeholder                        | Tono |
| ------------------------ | ---------------------------------- | ---- |
| goal                     | "ej. mejorar salud, ganar músculo" | H    |
| dietaryStyle             | "omnivoro, vegetariano..."         | H    |
| allergies                | "separadas por coma"               | H    |
| dislikes                 | "separados por coma"               | H    |
| painNotes                | "¿Dónde o qué tipo de molestia?"   | H    |
| optionalNotes (training) | "Energía, tiempo, sensaciones…"    | H    |
| notes (nutrition)        | "Energía, saciedad, antojos…"      | H    |

# Sprint 3 — Perfil editable + Regeneración de plan

## Objetivo

Permitir que el usuario, ya autenticado, pueda:

1. ver y editar su perfil (entrenamiento + nutrición),
2. regenerar el plan semanal con el agente IA de forma controlada,
3. ver estado y feedback (loading, errores, éxito) sin romper el flujo semanal.

## Alcance (IN)

- Pantalla /profile (nueva) accesible desde bottom nav.
- Carga de perfil actual (GET /api/profile).
- Guardado de cambios (PUT /api/profile).
- Botón "Regenerar plan de esta semana" que llama POST /api/agent/weekly-plan.
- UI de confirmación: modal/confirm ("esto sobrescribe el plan DRAFT actual de la semana").
- Estados: loading, error banner, success toast/message.
- Seguridad: rate limit + logs (withSensitiveRoute) en PUT /api/profile y POST /api/agent/weekly-plan (ya existe).
- No PII en logs; no diagnóstico médico; respetar ADR-0005.

## Fuera de alcance (OUT)

- Push notifications, emails de recordatorio, cron semanal.
- Historial de planes anteriores (versionado).
- Pagos, suscripciones, roles.
- Recomendaciones médicas o diagnóstico.

## UX / Flujos

- Bottom nav: añadir "Perfil" → /profile.
- /profile muestra secciones:
  - Entrenamiento: goal, level, daysPerWeek, sessionMinutes, environment
  - Nutrición: mealsPerDay, cookingTime, dietaryStyle, allergies, dislikes
- Guardar:
  - Botón "Guardar cambios"
  - En éxito: mensaje "Perfil actualizado"
- Regenerar:
  - Botón "Regenerar plan semana actual"
  - Confirm modal: "Se regenerará el plan DRAFT de la semana (no borra logs)."
  - En éxito: redirect a /week y recarga del plan.

## API

- GET /api/profile → 200 { profile } | 404 si no hay profile (se permite crear desde /onboarding)
- PUT /api/profile → 200 { profile } | 400 INVALID_INPUT | 401 UNAUTHORIZED
- POST /api/agent/weekly-plan → 200 { plan, rationale } | 401 | 429 | 5xx

## Reglas

- PUT /api/profile no crea usuario: usa sesión (requireAuth) y upsert UserProfile.
- GET /api/profile usa sesión y devuelve profile o null.
- Regeneración:
  - Siempre trabaja sobre weekStart = inicio de semana ISO (lunes).
  - Plan queda status DRAFT.
  - Logs se preservan.

## Criterios de aceptación

1. Usuario con sesión puede abrir /profile y ver valores actuales.
2. Usuario edita y guarda → persiste y al recargar se mantiene.
3. Regenerar plan → vuelve a /week con sesiones/menú actualizados y rationale disponible (mínimo en consola o modal).
4. Lint/typecheck/tests en verde.
5. CSP no bloquea Sentry ni vercel.live en preview; prod sigue sin vercel.live.

# Auditoría IA (MVP)

## Qué significa "la IA hace su trabajo"

1. Genera JSON válido y conforme a schema + invariantes.
2. Respeta constraints: environment/daysPerWeek/sessionMinutes/mealsPerDay/cookingTime.
3. No inventa ejercicios fuera del pool (o cae a fallback).
4. Ante red flags / baja adherencia: el sistema se vuelve conservador.
5. Hay observabilidad: ratio éxito/fallback + razones.

## Señales (eventos)

Evento: ai_plan_result

- result: success | fallback
- fallback_type (si fallback): string corto
- reason (opcional): string corto
- poolSize, allowlistSize, sessionsCount, totalExercises, unmatchedCount, durationMs

Eventos complementarios:

- ai_allowed_exercises_trimmed
- ai_slug_outside_prompt_allowlist
- ai_exercise_unmatched
- no_exercises_available
- exercise_pool_empty_for_environment

## Qué revisar en beta (semanal)

- % fallback (ai_plan_result result=fallback)
- top fallback_type y reason
- tendencia de ai_exercise_unmatched
- duración media (durationMs) y p95
- frecuencia de ai_slug_outside_prompt_allowlist (si alta, subir allowlist o mejorar selector)

## Umbrales sugeridos (MVP)

- fallback <= 5% (si >10%: investigar)
- unmatchedCount medio ~0 (si >0.2 por plan: ajustar allowlist/prompt)
- durationMs p95 < 3s (si >: revisar tokens, allowlist, provider)

Checklist de verificación (auditoría real)

npm test && npm run lint && npm run typecheck && npm run build

Manual (3 escenarios):

Catálogo normal: crea plan → ai_plan_result success

Forzar IA inválida (mock provider o respuesta rota) → ai_plan_result fallback

Catálogo vacío: 409 + mensaje humano + ai_plan_result fallback (no_exercises_available)

Observabilidad:

En Sentry / logs ves ai_plan_result con result y fallback_type.

Confirmas muestreo de éxitos (con AI_SUCCESS_SENTRY_SAMPLE_RATE).

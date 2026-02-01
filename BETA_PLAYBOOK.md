# Beta Playbook

## Objetivo

Validar el flujo end-to-end con usuarios reales durante **2–4 semanas**. Confirmar que planes, logs y perfiles funcionan en producción sin errores bloqueantes.

---

## Métricas de éxito (5, binarias)

| Métrica               | Criterio de cumplimiento                                                                                  |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| Uso                   | ≥10 días de uso en 14 días (sumado entre usuarios)                                                        |
| Dead-ends             | 0 pantallas sin CTA (siempre hay salida)                                                                  |
| Fallback IA           | <20% de eventos Sentry con tag `fallback_type` (red_flag, parse_error, provider_error, ai_invalid_output) |
| Rate limit            | <5% de 429 en endpoints sensibles (weekly-plan, profile, logs)                                            |
| ai_exercise_unmatched | Ideal 0; investigar si >0 sostenido (count por evento)                                                    |
| Issues QA             | ≥80% de issues con pasos reproducibles + entorno                                                          |

---

## Cómo medir

- En Sentry, filtrar por tag `fallback_type` para ver red_flag, parse_error, provider_error, ai_invalid_output.
- Contar eventos `rate_limit` para monitorizar 429 en endpoints sensibles.
- Contar eventos `ai_exercise_unmatched`; revisar si hay volumen sostenido o picos.

---

## Red flags (5, accionables)

1. **Crash repetido**: mismo 500 en la misma ruta 3+ veces → investigar y fix P0.
2. **Onboarding falla**: usuarios no crean plan tras completar wizard → revisar flujo y errores.
3. **Cron partial failure**: `failed > 0` en respuesta de `/api/cron/weekly-regenerate` → revisar logs/Sentry.
4. **429 visible**: usuarios ven "Demasiadas peticiones" en uso normal → ajustar límites o escalar.
5. **Confusión repetida**: mismo tipo de duda/issues sin pasos → mejorar copy o UX.

---

## Rutina QA diaria (~7 min)

Ejecutar en orden, con sesión iniciada:

| #   | Ruta                  | Acción                                                                                                                            | ✓   |
| --- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --- |
| 1   | `/week`               | Cargar semana, ver plan, panel "Última actualización"                                                                             |     |
| 2   | `/session/[dayIndex]` | Abrir día, ver ejercicios, clic en ejercicio → detalle                                                                            |     |
| 3   | `/log/training`       | Registrar sesión completada (o marcar desde sesión)                                                                               |     |
| 4   | `/log/nutrition`      | Registrar comida según plan                                                                                                       |     |
| 5   | `/profile`            | Ver/editar preferencias, Guardar, Regenerar plan (si aplica)                                                                      |     |
| 6   | `/exercise/[slug]`    | **Sin sesión** (ventana incógnito): debe cargar la página                                                                         |     |
| 7   | (opcional)            | Provocar error: body inválido en POST, URL inexistente. **Si falla:** abrir issue con etiqueta `p0-blocker` y adjuntar screenshot |     |

---

## Triage

**Definiciones:**

- **P0-blocker**: crash, pérdida de datos, flujo principal roto. Fix en <24h.
- **P1**: UX rota, auth falla, IA no genera plan. Fix en 1–3 días.
- **P2**: copy, perf menor, mejoras. Backlog.

**Etiquetas recomendadas:** `p0-blocker`, `p1-ux`, `p1-ai`, `p1-auth`, `p2-copy`, `p2-perf`, `cron`, `data`

**Proceso de triage:**

- **Etiquetar:** prioridad (p0/p1/p2) + área (ux, ai, auth, cron, data, copy, perf).
- **SLA orientativo:** P0 <24h, P1 1–3 días, P2 backlog.
- **Info mínima para ser accionable:** pasos para reproducir (numerados), esperado vs actual, entorno (prod/preview/local), screenshot o status de respuesta si aplica.
- **Si falta info:** pedir reproducción en comentario. Si tras 1 semana no hay respuesta o no se puede reproducir → cerrar con etiqueta `wontfix` o `needs-info`.

---

## Qué reportar en cada issue

Incluir siempre:

- **Pasos para reproducir** (1, 2, 3…)
- **Esperado** vs **actual**
- **Screenshots** si aplica (error en pantalla, consola)
- **Hora** aproximada
- **Entorno**: producción / preview / local

Ejemplo:

> **Pasos:** 1) Ir a /log/training 2) Dejar campos vacíos 3) Enviar
> **Esperado:** mensaje de validación
> **Actual:** 500
> **Entorno:** producción, ~14:30 UTC
> **Screenshot:** [adjunto]

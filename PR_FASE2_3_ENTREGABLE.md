# PR Fase 2.3 — AI Coach for Insights

Capa IA que transforma el output determinista (Fase 2.2) en texto motivacional y micro-acciones. Sin cambiar scoring ni insights deterministas.

---

## Archivos tocados

| Archivo | Cambio |
|--------|--------|
| `src/server/ai/promptHash.ts` | **Nuevo.** sha256Hex(input). |
| `src/server/ai/prompts/adherenceCoach.ts` | **Nuevo.** ADHERENCE_COACH_PROMPT_VERSION, ADHERENCE_COACH_SYSTEM_TEMPLATE (solo template), ADHERENCE_COACH_TEMPLATE_HASH. |
| `src/server/ai/adherenceCoach.ts` | AiCoachSchema, generateAdherenceCoach. Usa ADHERENCE_COACH_SYSTEM_TEMPLATE para system; user = JSON con input determinista. Retorna coach + meta (promptVersion, promptTemplateHash, model, generatedAt). trackEvent incluye promptTemplateHash. |
| `src/server/ai/adherenceCoach.test.ts` | AiCoachSchema valida; caso inválido -> fallback; caso válido -> coach + meta presente; provider lanza -> fallback. |
| `src/server/ai/promptHash.test.ts` | **Nuevo.** sha256Hex estable; ADHERENCE_COACH_TEMPLATE_HASH = sha256Hex(ADHERENCE_COACH_SYSTEM_TEMPLATE). |
| `src/server/api/adherence/insightsAi.ts` | **Nuevo.** getWeeklyAdherenceInsightsAiHandler: flag ADHERENCE_AI_COACH_ENABLED; si enabled llama generateAdherenceCoach; retorna deterministic + coach (o null). |
| `src/app/api/adherence/insights-ai/route.ts` | **Nuevo.** GET protegido, x-request-id, Cache-Control: private, no-store. |
| `src/app/(app)/week/page.tsx` | fetchInsights usa /api/adherence/insights-ai. InsightsCard: si coach existe muestra summary, bullets, nextActionTitle, nextActionSteps; si coach null muestra deterministas. |
| `src/app/(app)/week/page.test.tsx` | Mock /api/adherence/insights-ai con coach: null. |
| `PR_FASE2_3_ENTREGABLE.md` | Este documento. |

---

## Cómo probar en /week

1. `ADHERENCE_AI_COACH_ENABLED=false` (default): ir a /week → se muestra insights deterministas (Fase 2.2).
2. `ADHERENCE_AI_COACH_ENABLED=true`: ir a /week → si IA responde JSON válido, se muestra coach.summary, bullets, plan de acción con steps. Si IA falla, fallback a deterministas.
3. No bloquear pantalla si falla fetch: fallback silencioso (null).

---

## Riesgos / rollout (5 bullets)

- **Flag por defecto false:** v1 seguro; activar solo cuando provider esté listo.
- **Validación Zod:** si IA devuelve JSON no conforme a schema → coach: null, no error.
- **Fuente de verdad:** IA nunca cambia breakdown/insights/nextAction deterministas; solo añade coach como overlay.
- **Observabilidad:** trackEvent outcome (ai_coach_ok, ai_coach_invalid_json, ai_coach_failed) para monitorear.
- **Sin persistencia v1:** coach no se guarda en DB; se regenera en cada request.

---

## Limitaciones

- **IA no decide scoring:** computeWeeklyAdherence y getWeeklyAdherenceInsights son la única fuente.
- **Fallback determinista:** si IA falla o schema inválido → coach: null, se muestran insights deterministas.
- **Prompt constraints:** no inventar datos, no prometer resultados, no recomendar cosas médicas.

---

## Checklist final

- [x] IA nunca cambia porcentajes ni planned/completed
- [x] IA no reemplaza insights deterministas
- [x] Validación Zod + fallback siempre
- [x] Observabilidad de outcomes IA
- [x] No persistencia (v1)
- [x] coachMeta.promptTemplateHash presente y estable
- [x] No se almacena el prompt completo
- [x] Hash calculado solo sobre template (sin input de usuario)

### Mini-checklist Fase 2.3 con hashing

- [x] promptTemplateHash calculado solo del template (no input)
- [x] inputShapeHash excluye title/detail y cualquier texto
- [x] stableStringify ordena keys
- [x] Tests: title/detail no afectan hash; cambiar número/enum sí cambia hash
- [x] Eventos IA incluyen hashes y model (sin PII). trackEvent("api_adherence_coach_outcome", ...)
- [x] Endpoint devuelve coachMeta cuando coach ok; coachMeta: null si IA falla
- [x] UI no depende de coach (fallback determinista). No muestra hashes al usuario

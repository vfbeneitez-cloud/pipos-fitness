# PR Fase 2.3b — Provider configurable + model source of truth

Evitar "IA fantasma": provider configurable por env, model desde provider, mock deshabilitado en prod.

---

## Qué cambió y por qué

- **IA fantasma:** Antes getProvider() siempre devolvía MockProvider y model venía solo de AI_MODEL. En prod podía mostrarse "coach" generado por mock (IA falsa).
- **Provider configurable:** AI_PROVIDER (default "mock"). Si valor no soportado → fallback a mock + logWarn + trackEvent ai_misconfigured.
- **Model source of truth:** model = provider.model ?? process.env.AI_MODEL ?? "unknown". providerId y model en coachMeta y eventos.
- **Política prod:** Si NODE_ENV === "production" y provider.id === "mock" → no se llama a provider.chat, se devuelve ok:false reason:"ai_disabled_mock_in_prod", coach: null, trackEvent outcome ai_disabled_mock_in_prod.

---

## Archivos tocados

| Archivo                                      | Cambio                                                                                                    |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `src/server/ai/provider.ts`                  | AIProvider: id (obligatorio), model? (opcional).                                                          |
| `src/server/ai/providers/mock.ts`            | MockProvider: id="mock", model="mock".                                                                    |
| `src/server/ai/getProvider.ts`               | Lee AI_PROVIDER (default "mock"). Si no soportado → MockProvider + logWarn + trackEvent ai_misconfigured. |
| `src/server/ai/adherenceCoach.ts`            | providerId/model desde provider. CoachMeta incluye providerId. Política prod: mock deshabilitado.         |
| `src/server/ai/getProvider.test.ts`          | **Nuevo.** sin AI_PROVIDER => mock; AI_PROVIDER=mock => mock; no soportado => fallback.                   |
| `src/server/ai/adherenceCoach.test.ts`       | providerId en meta; provider.model prioridad; NODE_ENV=production + mock => ok:false.                     |
| `src/server/lib/events.ts`                   | Outcome taxonomy (api_adherence_coach_outcome, ai_provider_outcome).                                      |
| `src/server/lib/withSensitiveRoute.ts`       | Acepta options.maxRequests para rate limit custom.                                                        |
| `src/app/api/adherence/insights-ai/route.ts` | Rate limit 15/min por IP.                                                                                 |
| `.env.example`                               | AI_PROVIDER, ADHERENCE_AI_COACH_ENABLED, AI_MODEL.                                                        |
| `PR_FASE2_3B_ENTREGABLE.md`                  | Este documento.                                                                                           |

---

## Envs

- **AI_PROVIDER** (default "mock"): "mock" → MockProvider. Otro valor → fallback a mock + eventos.
- **AI_MODEL** (opcional): Solo si provider no tiene model.

---

## Política prod: mock deshabilitado

En NODE_ENV=production con provider mock → no se devuelve coach. Se trackea ai_disabled_mock_in_prod.

---

## Outcome taxonomy

| Event                       | outcome                                                                       |
| --------------------------- | ----------------------------------------------------------------------------- |
| api_adherence_coach_outcome | ai_coach_ok, ai_coach_invalid_json, ai_coach_failed, ai_disabled_mock_in_prod |
| ai_provider_outcome         | ai_misconfigured                                                              |

Ver events.ts para tabla completa.

## Preparación para provider real

Cuando añadáis provider real:

- Provider debe exponer model real (p. ej. gpt-4.1-mini) en provider.model
- AI_MODEL solo como override opcional

## API response / UI

- coach: null no es error (fallback determinista)
- No banners rojos por coach null (solo fallback determinista)
- UI ya cumple: InsightsCard muestra deterministas cuando coach === null

## Cómo probar local/staging

1. **Local (dev):** NODE_ENV≠production → mock funciona, coach se muestra si IA responde bien.
2. **Staging prod-like:** NODE_ENV=production, AI_PROVIDER=mock → coach: null, fallback determinista.
3. **Sin envs:** Todo sigue funcionando (fallback determinista, sin crash).
4. **Rate limit:** 15/min por IP en insights-ai. Probar >15 requests/min → 429.

---

## Checklist final

- [x] Sin envs → todo sigue funcionando (fallback determinista, sin crash)
- [x] Eventos incluyen providerId/model + hashes
- [x] En prod con mock → no se devuelve coach
- [x] Tests verdes
- [x] Prod: AI_PROVIDER no debe ser mock si ADHERENCE_AI_COACH_ENABLED=true (fail-safe ya lo impide)
- [x] Rate limit: 15/min por IP en /api/adherence/insights-ai

# Auditoría MVP — G4: Rutas sensibles

## 1. `/api/cron/weekly-regenerate`

### Protección actual

| Capa                  | Implementación                                                 |
| --------------------- | -------------------------------------------------------------- |
| **Feature flag**      | `CRON_WEEKLY_REGEN_ENABLED !== "true"` → 404 (endpoint oculto) |
| **Auth**              | `CRON_SECRET` en env; comparación contra header                |
| **Headers aceptados** | `x-cron-secret` o `Authorization: Bearer <secret>`             |
| **Rate limit**        | Sí, vía `withSensitiveRoute` (30 req/min por IP+ruta)          |

### Huecos

- Si `CRON_SECRET` está vacío → 401 antes de intentar el handler (correcto).
- El secret se compara por igualdad directa; no hay timing-safe compare (riesgo bajo para secret largo).
- Sin IP allowlist: cualquiera con el secret puede invocar (esperado para Vercel Cron u otro scheduler externo).

### Recomendación mínima MVP

- Mantener feature flag + secret.
- Documentar en DEPLOY que `CRON_SECRET` debe ser largo y aleatorio.
- Opcional: considerar `crypto.timingSafeEqual` si el secret es corto (no crítico para MVP).

---

## 2. `/api/agent/weekly-plan`

### Protección actual

| Capa           | Implementación                                                                                |
| -------------- | --------------------------------------------------------------------------------------------- |
| **Rate limit** | Sí, vía `withSensitiveRoute` (30 req/min por IP+ruta)                                         |
| **Auth**       | `requireAuth()` → sesión; 401 si no hay userId                                                |
| **Validación** | Body parse con try/catch; `adjustWeeklyPlan` valida con Zod: `weekStart` formato `YYYY-MM-DD` |

### Huecos

- Rate limit compartido con otras rutas sensibles: 30 req/min global por ruta. El agente puede ser costoso (IA); podría beneficiarse de un límite más estricto (ej. 5–10/min).
- Sin validación de tamaño de body: body muy grande podría consumir memoria antes de rechazarse.
- Errores del handler se propagan (throw) → `withSensitiveRoute` solo loguea; no hay manejo explícito de 5xx.

### Recomendación mínima MVP

- Mantener auth + rate limit + validación Zod.
- Opcional: límite de body size en middleware o en `withSensitiveRoute` (ej. 1KB para este endpoint).
- No bloquear MVP: el rate limit actual es razonable para uso normal.

---

## 3. `/api/weekly-plan`

### Protección actual

| Capa                  | Implementación                                                                                                                            |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Rate limit**        | Sí, vía `withSensitiveRoute`                                                                                                              |
| **Auth**              | `requireAuth()` en GET y POST                                                                                                             |
| **Validación**        | En server: `getWeeklyPlan` valida query `weekStart`; `createWeeklyPlan` valida body (weekStart, environment, daysPerWeek, sessionMinutes) |
| **Manejo de errores** | JSON parse fallido → 400 `INVALID_JSON`; server devuelve `{ error, details? }` con status 400/200                                         |

### Huecos

- GET no valida `weekStart` en la capa app; se delega al server. Si falta `weekStart` en query, el server devuelve 400 (correcto).
- Errores no capturados (excepciones) se propagan; `withSensitiveRoute` solo loguea y re-lanza. No hay try/catch explícito alrededor del handler.
- El server puede devolver 200 con `body: null` (plan no existe); la app lo reenvía tal cual. El cliente debe manejar `null`.

### Recomendación mínima MVP

- Mantener auth + rate limit + validación en server.
- No añadir lógica extra en app; el flujo actual es correcto.
- Asegurar que el cliente (week page) maneje `plan === null` según specs.

---

## 4. Resumen comparativo

| Ruta                   | Auth            | Rate limit | Validación     | Errores                                  |
| ---------------------- | --------------- | ---------- | -------------- | ---------------------------------------- |
| cron/weekly-regenerate | Secret (header) | Sí         | N/A (sin body) | Propagados; Sentry en fallos parciales   |
| agent/weekly-plan      | requireAuth     | Sí         | Zod en server  | Propagados                               |
| weekly-plan            | requireAuth     | Sí         | Zod en server  | 400 desde server; excepciones propagadas |

---

## 5. Recomendación mínima MVP (consolidada)

1. **cron**: Mantener como está; documentar `CRON_SECRET` en .env.example y DEPLOY.
2. **agent**: Mantener; opcional limitar body size en futuras iteraciones.
3. **weekly-plan**: Sin cambios; patrón coherente con el resto de rutas sensibles.

Todos los endpoints sensibles usan `withSensitiveRoute` (rate limit) y auth adecuada. No hay huecos críticos para MVP.

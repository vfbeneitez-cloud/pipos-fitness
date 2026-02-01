# MVP Readiness - F2 — Cron Weekly Regenerate Audit

## Fuentes revisadas

- `src/app/api/cron/weekly-regenerate/route.ts`
- `prisma/schema.prisma` (WeeklyPlan: `regenLockId`, `regenLockedAt`)
- `prisma/migrations/20260130120000_add_weekly_regen_lock/migration.sql`
- `src/server/ai/agentWeeklyPlan.ts` (adjustWeeklyPlan + Sentry)
- `src/app/lib/week.ts` (getWeekStart)

---

## 1. Qué evita doble ejecución

- **Lock en DB por (userId, weekStart):** En `WeeklyPlan` existen `regenLockId` y `regenLockedAt`. No hay helper aparte; la lógica está en la ruta del cron.
- **Adquisición:** Se hace un `updateMany` con:
  - `where`: `userId`, `weekStart`, y `OR: [regenLockedAt === null, regenLockedAt < lockStaleBefore]`
  - `data`: `regenLockId = lockId` (UUID), `regenLockedAt = now`
- **Stale:** `LOCK_STALE_MS = 15 * 60 * 1000` (15 min). Si el lock es más viejo que 15 min, otro run puede volver a adquirir.
- **Efecto:** Solo una ejecución “gana” el `updateMany` por (userId, weekStart). La que gana actualiza 1 fila; las demás ven 0 filas actualizadas y cuentan como `skippedLocked`. No se llama dos veces a `adjustWeeklyPlan` para el mismo usuario/semana en paralelo.
- **Liberación:** En un `finally` se hace `updateMany` con `where: userId, weekStart, regenLockId === lockId` y se pone `regenLockId = null`, `regenLockedAt = null`. Solo quien tiene ese `lockId` libera; evita que un run antiguo borre el lock de otro.

---

## 2. Qué pasa si corre dos veces

- **Segunda ejecución mientras la primera sigue en curso:** Para cada usuario, el `updateMany` de adquisición no actualiza nada (el plan ya tiene lock reciente). `acquired.count === 0` → `skippedLocked += 1`. No se ejecuta `adjustWeeklyPlan` de nuevo para ese usuario.
- **Segunda ejecución después de que la primera terminó:** Lock ya liberado en el `finally`. La segunda adquiere con normalidad y regenera. Comportamiento esperado (p. ej. dos lunes seguidos o un re-run manual).

---

## 3. Qué pasa si falla a mitad

- **`adjustWeeklyPlan` lanza excepción:** El `catch` del route suma `failed += 1`. El `finally` se ejecuta igual y libera el lock (regenLockId/regenLockedAt = null para ese `lockId`). Ese usuario queda sin plan actualizado; el siguiente cron puede intentarlo de nuevo.
- **Proceso muere antes del `finally` (timeout, kill, crash):** El lock no se libera; `regenLockedAt` queda con valor. Tras 15 min, `regenLockedAt < lockStaleBefore` y el siguiente run puede re-adquirir (stale recovery). No hay limpieza explícita; se depende del tiempo.
- **`adjustWeeklyPlan` devuelve 200 pero falla después (p. ej. error de red/DB en el cliente):** El route ya ha contado `succeeded += 1`. Si el fallo ocurre dentro de `adjustWeeklyPlan` después del upsert, la excepción llega al route → `failed += 1` y `finally` libera. Si el fallo es después de que el route devuelve, el lock ya se habría liberado en el `finally`. No hay doble escritura; a lo sumo un usuario puede quedar con plan no actualizado y se reintentará en el siguiente cron.

---

## 4. Qué queda logueado en Sentry

- **Desde la ruta del cron (`route.ts`):**
  - Solo si `failed > 0`: `Sentry.captureMessage("cron.weekly-regenerate partial failure", { level: failed === processed && processed > 0 ? "error" : "warning", extra: { processed, succeeded, failed, skippedLocked } })`. No se envía la excepción concreta al Sentry desde el route (solo `failed += 1` en el catch).

- **Desde `adjustWeeklyPlan` (agentWeeklyPlan.ts):**
  - `Sentry.captureMessage("weekly_plan_fallback_red_flag", { tags: { fallback_type: "red_flag" }, extra: { trainingScore, nutritionScore } })` cuando hay red flag.
  - `Sentry.captureMessage("weekly_plan_fallback_parse_error", { tags: { fallback_type: "parse_error" }, extra: { trainingScore, nutritionScore } })` cuando falla el parse del JSON del provider.
  - `Sentry.captureException(error, { tags: { fallback_type: "provider_error" } })` en el catch del provider (chat/API).

No se envía a Sentry: el stack de la excepción que provoca `failed += 1` en el route (si `adjustWeeklyPlan` lanza por otro motivo), ni un evento cuando `skippedLocked > 0`.

---

## 5. Recomendaciones mínimas MVP (sin refactor grande)

- **Documentar:** En DEPLOY_VERCEL o en un comentario en el route: el lock expira a los 15 min; si el cron no libera (crash/timeout), el siguiente run puede re-adquirir tras ese margen.
- **Sentry en el route:** En el `catch` del route, además de `failed += 1`, hacer `Sentry.captureException(error)` (o incluir el error en el `captureMessage` existente cuando `failed > 0`) para ver en Sentry las excepciones que no vienen del provider (p. ej. errores de DB o de red).
- **Opcional:** Si `skippedLocked > 0`, enviar un mensaje a Sentry con nivel info/debug y `extra: { skippedLocked, processed }` para detectar solapamientos o recuperación de locks stale.
- **Operativo:** Confirmar en producción `CRON_SECRET` y `CRON_WEEKLY_REGEN_ENABLED=true`, y que el schedule en `vercel.json` (`0 5 * * 1`) es el deseado.

No se ha modificado código (solo informe).

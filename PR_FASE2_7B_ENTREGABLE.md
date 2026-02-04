# PR Fase 2.7b — Cron testeable + des-skip integration tests

Cron diario de notificaciones testeable por usuario; tests de integración activos sin iterar toda la DB.

---

## Qué refactor se hizo

- **Extracción por usuario:** Se añadió y exporta `generateDailyNotificationsForUser(userId, runDateUtc): Promise<{ created: number }>` en `src/server/api/notifications/generateDaily.ts`.
  - Llama `getNotificationContext(userId, runDateUtc)`.
  - Obtiene plan y TrainingLog del día, construye `buildDailyNotificationCandidates(...)`.
  - Por cada candidato: `prisma.notification.create(...)`; si error P2002 → skip (no cuenta); otro error → throw.
  - Devuelve `{ created }`.
- **Entrypoint cron:** `generateDailyNotificationsForAllUsers(runDateUtc)` se refactorizó para:
  - Paginar users como antes (`findMany`).
  - Por cada userId: `await generateDailyNotificationsForUser(userId, runDateUtc)` y acumular `created += result.created`.
  - Salida idéntica: `{ created, scanned }`.

---

## Qué tests se activaron

- **Test A — crea TODAY_TRAINING_REMINDER:** User + UserProfile (goal default) + WeeklyAdherenceSnapshot (nudge ON_TRACK) + WeeklyPlan de la semana de `runDateUtc` con una sesión cuyo `dayIndex` coincide con el día UTC; sin TrainingLog completed ese día. Se ejecuta `generateDailyNotificationsForUser(userId, runDateUtc)`. Assert: `created === 1` y existe Notification con `userId`, `type === "TODAY_TRAINING_REMINDER"`, `scopeKey === "day:YYYY-MM-DD"` (UTC vía `formatUtcDayKey`).
- **Test B — idempotencia:** Mismo setup; se ejecuta dos veces. Assert: primera `created === 1`, segunda `created === 0`; `count` de notificaciones para `(userId, type TODAY_TRAINING_REMINDER, scopeKey day:...)` es 1.
- **Perf/manual:** El test “iterar todos los usuarios” está en `describe.skip("generateDailyNotificationsForAllUsers (perf test/manual)")` con comentario; el CI ejecuta solo los 2 tests rápidos por usuario.

---

## Confirmación de no cambio funcional

- Contrato público de endpoints sin cambios (cron sigue llamando `generateDailyNotificationsForAllUsers`).
- Comportamiento de `generateDailyNotificationsForAllUsers`: misma salida `{ scanned, created }` y misma lógica (por usuario, P2002 → skip).
- `scopeKey` día: `day:YYYY-MM-DD` (UTC); semana: `week:YYYY-MM-DD` (weekStart). Helper `formatUtcDayKey(date)` en `src/app/lib/week.ts` para tests (todayKey igual a producción).

---

## Archivos tocados

| Archivo                                              | Cambio                                                                                                                                                                                                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/server/api/notifications/generateDaily.ts`      | Ya contenía `generateDailyNotificationsForUser` y refactor de `generateDailyNotificationsForAllUsers` (sin cambios adicionales en esta PR).                                                                                                       |
| `src/server/api/notifications/generateDaily.test.ts` | Tests por usuario sin .skip; assert segunda ejecución `created === 0` y count por (userId, type, scopeKey); uso de `formatUtcDayKey` y `getWeekStart` desde `@/src/app/lib/week`; slow test en `describe.skip` con comentario "perf test/manual". |
| `src/app/lib/week.ts`                                | Añadido `formatUtcDayKey(date): string` (YYYY-MM-DD UTC).                                                                                                                                                                                         |
| `PR_FASE2_7B_ENTREGABLE.md`                          | Este documento.                                                                                                                                                                                                                                   |

---

## Checklist final

- [x] `generateDailyNotificationsForAllUsers` mantiene misma salida `{ scanned, created }`
- [x] Tests ya no están .skip (2 tests rápidos activos; 1 perf en describe.skip)
- [x] Idempotencia verificada (P2002 no duplica; segunda ejecución `created === 0`, count === 1)
- [x] No se itera toda la DB en tests (solo 1 usuario por test)

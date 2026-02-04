# PR Fase 2.7d — Push web (browser) + preferencias + delivery

Web Push en navegador con VAPID. Sin móvil nativo.

---

## Migraciones

- `20260208120000_add_push_subscription`:
  - `Notification`: pushStatus, pushSentAt, pushError, pushAttemptCount
  - `UserProfile`: pushNotificationsEnabled, pushQuietHoursStartUtc, pushQuietHoursEndUtc
  - Tabla `PushSubscription` (userId, endpoint unique, p256dh, auth, userAgent)

---

## Flags / Env

| Env                          | Default                           | Descripción                                         |
| ---------------------------- | --------------------------------- | --------------------------------------------------- |
| NOTIFICATIONS_PUSH_ENABLED   | false                             | "true" habilita push                                |
| NOTIFICATIONS_PUSH_DRY_RUN   | true                              | true = mock sender                                  |
| VAPID_PUBLIC_KEY             | —                                 | Requerido si enabled y no dry-run                   |
| VAPID_PRIVATE_KEY            | —                                 | Requerido si enabled y no dry-run                   |
| VAPID_SUBJECT                | mailto:support@piposfitness.local | Subject VAPID                                       |
| NEXT_PUBLIC_VAPID_PUBLIC_KEY | —                                 | Mismo que VAPID_PUBLIC_KEY para cliente (subscribe) |

**Política:** Si enabled pero faltan VAPID keys → fail-safe (MisconfiguredPushSender, no marca SENT) + track push_misconfigured.

---

## Endpoints

| Ruta                                | Método | Descripción                                                            |
| ----------------------------------- | ------ | ---------------------------------------------------------------------- |
| /api/notifications/push/subscribe   | POST   | body: { endpoint, keys: { p256dh, auth } }                             |
| /api/notifications/push/unsubscribe | POST   | body: { endpoint }                                                     |
| /api/notifications/push/preferences | GET    | pushNotificationsEnabled, pushQuietHoursStartUtc, pushQuietHoursEndUtc |
| /api/notifications/push/preferences | POST   | body: mismo schema                                                     |

Todos: requireAuth. Si NOTIFICATIONS_PUSH_ENABLED !== "true" → 404 FEATURE_DISABLED.

---

## Service Worker y flujo de permiso

- `public/sw.js`: listener push → showNotification(title, { body, tag, data }); notificationclick → abrir /notifications
- UI /notifications sección Push:
  - Botón "Activar push": Notification.requestPermission(), registrar SW /sw.js, pushManager.subscribe(userVisibleOnly, applicationServerKey), POST subscribe
  - Botón "Desactivar push": getSubscription().unsubscribe(), POST unsubscribe
  - Quiet hours (start/end UTC) vía preferences

---

## Cron

`POST /api/cron/daily-notifications` ahora incluye:

- generate (scanned, created)
- email (scanned, sent, failed)
- push (scanned, sent, failed)

---

## Riesgos / rollout

| Riesgo          | Mitigación                                        |
| --------------- | ------------------------------------------------- |
| Permisos        | UI tolera permission denied (mensaje claro)       |
| VAPID misconfig | Fail-safe: no enviar, track push_misconfigured    |
| Spam            | Opt-in push default false; quiet hours            |
| Cleanup subs    | 404/410 en sendNotification → borrar subscription |

---

## Checklist final

- [x] Opt-in push default false
- [x] Quiet hours cruza medianoche (22→7)
- [x] VAPID keys requeridas en prod; fail-safe si faltan
- [x] Idempotencia por pushStatus + pushAttemptCount
- [x] Cleanup subscriptions 404/410
- [x] UI tolera permission denied
- [x] Tests delivery + idempotencia pasan

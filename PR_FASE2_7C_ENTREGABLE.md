# PR Fase 2.7c — Delivery real por Email (SendGrid) + preferencias + idempotencia

Canal email para notificaciones generadas por el cron diario. En local/dev: mock sender (no enviar).

---

## Migraciones

- `20260207120000_add_notification_email_delivery`: añade a `Notification` (`emailStatus`, `emailSentAt`, `emailError`, `emailAttemptCount`) y a `UserProfile` (`emailNotificationsEnabled`, `emailNotificationHourUtc`).
- Ejecutar `npx prisma migrate deploy` (o `prisma migrate dev`) antes de tests/run.

---

## Flags / Env

| Env                         | Default         | Descripción                                     |
| --------------------------- | --------------- | ----------------------------------------------- |
| NOTIFICATIONS_EMAIL_ENABLED | false           | "true" habilita envío email; si no, solo in-app |
| SENDGRID_API_KEY            | —               | Requerido si enabled y no dry-run               |
| SENDGRID_FROM_EMAIL         | —               | Dirección remitente                             |
| SENDGRID_FROM_NAME          | "Pipos Fitness" | Nombre remitente (opcional)                     |
| NOTIFICATIONS_EMAIL_DRY_RUN | true            | true = mock sender, no envía                    |

**Política:**

- Si `NOTIFICATIONS_EMAIL_ENABLED !== "true"` → nunca enviar (solo in-app).
- Si enabled pero faltan creds en prod → fail-safe: mock + track `email_misconfigured`.

---

## Cron behavior (generate + deliver)

`POST /api/cron/daily-notifications`:

1. Genera notificaciones (`generateDailyNotificationsForAllUsers`).
2. Llama `deliverPendingEmailsForDate(nowUtc)`.

Respuesta:

```json
{
  "ok": true,
  "generate": { "scanned": N, "created": M },
  "email": { "scanned": P, "sent": Q, "failed": R }
}
```

---

## Dry run

- `NOTIFICATIONS_EMAIL_DRY_RUN=true` (default) → `MockEmailSender`: logWarn + trackEvent `email_dry_run`, sin envío real.
- Para enviar real: `NOTIFICATIONS_EMAIL_DRY_RUN=false`, `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL` configurados.

---

## Riesgos

| Riesgo             | Mitigación                                                 |
| ------------------ | ---------------------------------------------------------- |
| SPAM               | Opt-in real: `emailNotificationsEnabled=false` por defecto |
| Rate               | SendGrid límites; v1 sin rate interno adicional            |
| Misconfig          | Si faltan creds → mock + `email_misconfigured`, no throw   |
| PII en logs/events | No se loguean emails completos ni `to` en texto plano      |

---

## Archivos tocados

| Archivo                                          | Cambio                                                                                                                                  |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `.env.example`                                   | Envs email/SendGrid                                                                                                                     |
| `prisma/schema.prisma`                           | Notification: emailStatus, emailSentAt, emailError, emailAttemptCount; UserProfile: emailNotificationsEnabled, emailNotificationHourUtc |
| `prisma/migrations/20260207120000_*`             | Migración                                                                                                                               |
| `src/core/notifications/emailPolicy.ts`          | shouldSendEmailNow, buildEmailSubject, buildEmailBodyText                                                                               |
| `src/server/notifications/emailSender.ts`        | EmailSender, MockEmailSender, SendGridEmailSender, getEmailSender                                                                       |
| `src/server/api/notifications/deliverEmail.ts`   | deliverPendingEmailsForDate                                                                                                             |
| `src/app/api/cron/daily-notifications/route.ts`  | Llama deliver después de generate                                                                                                       |
| `src/app/api/notifications/preferences/route.ts` | GET/POST preferencias                                                                                                                   |
| `src/app/(app)/notifications/page.tsx`           | Sección Email (toggle + hora UTC)                                                                                                       |
| Tests                                            | emailPolicy, emailSender, deliverEmail                                                                                                  |

---

## Checklist final

- [x] Opt-in real (`emailNotificationsEnabled=false` default)
- [x] Dry run por defecto en dev
- [x] Idempotencia por `emailStatus=SENT` (no reenviar si ya SENT)
- [x] No PII en logs/events
- [x] Cron protegido + flags
- [x] Tests de delivery (requieren migración aplicada)

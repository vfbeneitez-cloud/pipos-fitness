# PR Fase 2.7 — Notificaciones/Recordatorios (in-app + cron)

Sistema de notificaciones in-app y cron diario para recordatorios deterministas. Sin email/push. Feature flags. Idempotente.

---

## Feature flags

| Env                              | Default | Efecto                                                         |
| -------------------------------- | ------- | -------------------------------------------------------------- |
| NOTIFICATIONS_ENABLED            | false   | Si !== "true", endpoints /api/notifications/\* retornan 404.   |
| CRON_DAILY_NOTIFICATIONS_ENABLED | false   | Si !== "true", POST /api/cron/daily-notifications retorna 404. |

---

## Migración

- **20260206120000_add_notification**: Tabla Notification (userId, type, scopeKey, title, message, dataJson, readAt, createdAt).
- unique(userId, type, scopeKey) para idempotencia.

---

## Endpoints

| Método | Ruta                                     | Descripción                                |
| ------ | ---------------------------------------- | ------------------------------------------ |
| GET    | /api/notifications?unreadOnly=1&limit=30 | Lista notificaciones. Protegido.           |
| GET    | /api/notifications/unread-count          | { unreadCount }. Protegido.                |
| POST   | /api/notifications/read                  | Body: { id }. Marca como leída. Protegido. |
| POST   | /api/cron/daily-notifications            | Genera recordatorios. CRON_SECRET + flag.  |

---

## Reglas y prioridades

**Tipos:** WEEK_BEHIND_GOAL, STREAK_BROKEN, TODAY_TRAINING_REMINDER.

**Prioridad (máx 2/día):** STREAK_BROKEN > TODAY_TRAINING_REMINDER > WEEK_BEHIND_GOAL.

**Reglas v1:**

- WEEK_BEHIND_GOAL: nudge BEHIND_GOAL y currentWeekPercent < goal.
- STREAK_BROKEN: nudge STREAK_BROKEN.
- TODAY_TRAINING_REMINDER: sesión planificada hoy (dayIndex) y no hay TrainingLog completed hoy.

---

## Cómo probar

1. Habilitar flags: NOTIFICATIONS_ENABLED=true, CRON_DAILY_NOTIFICATIONS_ENABLED=true.
2. Llamar cron: `curl -X POST -H "x-cron-secret: $CRON_SECRET" /api/cron/daily-notifications`
3. Ver campana en Nav (si hay unread) y lista en /notifications.
4. Marcar como leída y comprobar badge.

---

## Riesgos / rollout

- Volumen: cron escanea todos los usuarios. Paginar si crece.
- Rate/DB load: create por usuario; unique evita duplicados.
- Idempotencia: unique(userId, type, scopeKey). P2002 = skip.

---

## Archivos tocados

- prisma/schema.prisma, migrations
- src/core/notifications/rules.ts, rules.test.ts
- src/server/api/notifications/\* (list, unreadCount, markRead, context, generateDaily)
- src/app/api/notifications/_, src/app/api/cron/daily-notifications/_
- src/app/components/NotificationBadge.tsx, Nav.tsx
- src/app/(app)/notifications/page.tsx

---

## Checklist final

- [x] unique(userId, type, scopeKey) evita duplicados
- [x] Cron protegido + flag
- [x] No PII en logs/events
- [x] UI no aparece si feature off (404 → no campana)
- [x] Tests de reglas
- [ ] Test integración cron: documentar validación manual (función lenta con todos los usuarios)

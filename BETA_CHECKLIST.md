# Beta Readiness Checklist

## 1) Environment & config

- [ ] All required env vars set (see `.env.example`): `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `EMAIL_*`, `DEMO_MODE=false` in production.
- [ ] Optional: `CRON_SECRET`, `CRON_WEEKLY_REGEN_ENABLED=true` for weekly auto-regeneration.
- [ ] Optional: `UPSTASH_REDIS_REST_*` for distributed rate limiting.
- [ ] Optional: Sentry DSNs for error tracking.
- [ ] No secrets committed; `.env` in `.gitignore`.

## 2) Manual QA

- [ ] Run through `specs/06_manual_qa_checklist.md` in staging/production with real auth (DEMO_MODE=false).
- [ ] Onboarding → profile → weekly plan → log training/nutrition; no critical errors.
- [ ] Cron (if enabled): manual POST to `/api/cron/weekly-regenerate` returns 200 and DB/UI show updated plan.

## 3) Minimal metrics & observability

- [ ] Health: GET `/api/health` and `/api/health/db` return 200.
- [ ] Uptime/monitoring (e.g. UptimeRobot) on health endpoints.
- [ ] Vercel Function logs (or Sentry) checked for 4xx/5xx on sensitive routes.
- [ ] Rate limit: 429 with `Retry-After` when over threshold (optional smoke).

## 4) Feedback loop

- [ ] Clear way for beta users to report issues (e.g. email, form, or Sentry user feedback).
- [ ] Document known limitations and “beta” disclaimer in app or landing.

**Feedback (beta):** reporta incidencias abriendo un issue en el repositorio. Incluye pasos para reproducir y captura si aplica.

## 5) Safety disclaimer

- [ ] Disclaimer visible where relevant: e.g. “This app does not replace professional medical or nutrition advice; consult a professional before starting a new program.”
- [ ] No diagnostic or medical claims; fitness/nutrition for general wellness only.

---

**When all items are checked**, the app is ready for a controlled beta (invite-only or limited rollout). Revisit after feedback and before general release.

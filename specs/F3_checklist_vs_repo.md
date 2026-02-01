# MVP Readiness - F3 Checklist vs Repo

Revisión de `RELEASE_CHECKLIST.md` y `BETA_CHECKLIST.md` contra el repo. Solo acciones de cierre; sin añadir features.

---

## RELEASE_CHECKLIST.md

### 1. Code Quality

| Item | Estado | Evidencia |
|------|--------|-----------|
| `npm run lint` — sin errores | **Cumple** | Exit 0. 1 warning en `src/app/api/profile/route.test.ts:1` (NextResponse no usado). |
| `npm run typecheck` — sin errores | **NO cumple** | `src/server/ai/agentWeeklyPlan.ts`: Sentry no importado; errores en líneas 159, 199, 219 (TS2304 Cannot find name 'Sentry'). |
| `npm test` — todos pasando | **NO cumple** | 6 tests fallan: agentWeeklyPlan (Sentry), signin (texto "Sign in to your account"), profile (regex onboarding), weeklyPlan (Sentry). Ver F0_quality_gates_report.md. |

### 2. Database

| Item | Estado | Evidencia |
|------|--------|-----------|
| `npx prisma migrate status` — sin pendientes | **Cumple** | Ejecutado: "Database schema is up to date!", 4 migraciones aplicadas. |
| `npx prisma db seed` (opcional) | — | No verificado (opcional). |

### 3. Environment Variables Review

| Item | Estado | Evidencia |
|------|--------|-----------|
| `.env.example` actualizado | **Cumple** | Variables documentadas (F1 audit: algunas ambigüedades, no faltantes críticos). |
| No secretos hardcodeados | **Cumple** | Búsqueda en `src`: solo valores de test en `*.test.ts` (CRON_SECRET, etc.); ningún secreto real. |

### 4. Demo Mode Security

| Item | Estado | Evidencia |
|------|--------|-----------|
| `/api/demo/*` bloqueado cuando `DEMO_MODE=false` | **NO cumple** | No existe ruta `/api/demo/session` ni `/api/demo/setup`. `src/app/api/` no contiene carpeta `demo/`. El checklist asume endpoints que devuelvan 403; actualmente no existen → petición a `/api/demo/session` daría 404. |
| Test DEMO_MODE=false → 403 | **N/A** | Sin ruta demo, no aplica. |
| En producción comprobar `/api/demo/*` | **N/A** | Idem. |

### 5. Vercel Configuration (Environment Variables / Build)

| Item | Estado | Evidencia |
|------|--------|-----------|
| Production vars (DATABASE_URL, AUTH_*, DEMO_MODE, etc.) | **Doc** | Checklist de configuración; no comprobable desde repo. |
| EMAIL_SERVER / EMAIL_FROM | **Doc** | `.env.example` los marca deprecated (Google OAuth only). Coherente con repo (solo Google). |
| Build Settings (Next.js, build command, etc.) | **Cumple** | Defaults Next.js; `package.json` tiene `"build": "npx prisma generate && next build"`. |

### 6. Post-Deploy (Database Migrations, Seed, Health, UI)

| Item | Estado | Evidencia |
|------|--------|-----------|
| Migraciones en prod / Seed | **Doc** | Pasos documentados; ejecución manual. |
| GET /api/health con env correcto | **Cumple** | `src/app/api/health/route.ts`: devuelve `ok`, `version`, `env` (demo vs vercelEnv/nodeEnv). |
| GET /api/health/db | **Cumple** | Ruta existe `src/app/api/health/db/route.ts`. |
| GET /api/exercises 200 | **Cumple** | `src/app/api/exercises/` existe (redirect a server API). |
| /auth/signin carga | **Cumple** | Página existe en `src/app/auth/signin/`. |
| GET /api/weekly-plan sin sesión → 401 | **Cumple** | `withSensitiveRoute` + `requireAuth` en `src/app/api/weekly-plan/route.ts`. |
| GET /api/demo/session → 403 | **NO cumple** | Ruta no existe; ver Demo Mode Security. |
| Landing `/` redirige a `/auth/signin` | **Cumple** | `src/app/page.tsx`: cuando `!isDemoMode` hace `redirect("/auth/signin")`. |
| Sin sesión: `/onboarding` redirige a signin | **Cumple** | `src/app/(app)/layout.tsx`: si `!userId` → `redirect("/auth/signin")`; onboarding está bajo (app). |
| Con sesión: onboarding muestra wizard | **Cumple** | `src/app/(app)/onboarding/page.tsx` existe con pasos. |
| `/auth/signin` carga | **Cumple** | Página existe. |

### 7. Rollback Plan / Post-Rollback

| Item | Estado | Evidencia |
|------|--------|-----------|
| Pasos de revert / documentar fallo | **Doc** | Solo documentación; no verificable en código. |

### 8. Notes (Middleware, etc.)

| Item | Estado | Evidencia |
|------|--------|-----------|
| Middleware matcher `src/middleware.ts` | **NO cumple** | No existe `src/middleware.ts` ni archivo `middleware.ts` en el repo. Nota del checklist referencia un archivo inexistente. |

### 9. Production Monitoring (Sentry / Uptime / Vercel)

| Item | Estado | Evidencia |
|------|--------|-----------|
| Sentry DSN en Vercel / errores a Sentry | **Parcial** | Código usa Sentry en cron y agentWeeklyPlan, pero `agentWeeklyPlan.ts` no importa Sentry → build/typecheck fallan. |
| GET /api/_debug/sentry con SENTRY_DEBUG | **Cumple** | `src/app/api/_debug/sentry/route.ts`: devuelve 404 en prod, 200 en dev si SENTRY_DEBUG=true. |
| Uptime / Vercel logs | **Doc** | Configuración manual. |
| Logger no imprime secretos | **Cumple** | `src/server/lib/logger.ts`: solo requestId, msg, meta; no hay uso de env/secretos en logger. |

---

## BETA_CHECKLIST.md

| Item | Estado | Evidencia |
|------|--------|-----------|
| Env vars: DATABASE_URL, AUTH_*, DEMO_MODE=false; EMAIL_* | **Doc/Ambiguo** | `.env.example` tiene todo; EMAIL_* está deprecated (solo Google OAuth). Cumple si no se usa email. |
| CRON_* / UPSTASH_* / Sentry opcionales | **Cumple** | Documentado en .env.example. |
| No secrets committed; .env en .gitignore | **Cumple** | `.gitignore` incluye `.env`, `.env.local`, etc. |
| Manual QA specs/06_manual_qa_checklist.md | **Doc** | Archivo existe; ejecución manual. |
| Onboarding → profile → week → log; cron manual 200 | **Cumple** | Flujos y cron implementados (cron con CRON_SECRET). |
| Health 200, uptime, logs Sentry, rate limit 429 | **Cumple** | Health y rate limit implementados; Sentry usado (falta import en agentWeeklyPlan). |
| Feedback loop: forma de reportar issues | **NO cumple** | No hay enlace a email/form/Sentry feedback en app ni texto tipo "Reportar problema" en `src`. |
| Documentar limitaciones y disclaimer "beta" | **NO cumple** | No hay texto "beta" ni limitaciones visibles en landing/onboarding. |
| Disclaimer médico/asesoramiento profesional | **NO cumple** | Búsqueda "disclaimer|medical|professional|advice" en `src`: sin resultados. No hay aviso tipo "no sustituye consejo médico". |
| No claims diagnósticos/médicos | **Cumple** | Copy de la app no hace claims médicos (no verificado exhaustivamente). |

---

## Resumen de NO cumplidos (con archivo/razón)

1. **typecheck/test/build:** `src/server/ai/agentWeeklyPlan.ts` usa `Sentry` sin import → TS2304 y fallos en tests/build.
2. **Tests (signin/profile/weeklyPlan):**
   - `src/app/auth/signin/page.test.tsx`: espera "Sign in to your account"; la página muestra "Inicia sesión".
   - `src/app/(app)/profile/page.test.tsx`: espera texto que coincida con `/onboarding|Ir a onboarding/i`; la UI muestra "Configurar preferencias".
   - Tests que llaman a `adjustWeeklyPlan` fallan por Sentry no definido.
3. **/api/demo/*:** No existe `src/app/api/demo/`; el checklist pide 403 DEMO_DISABLED.
4. **Middleware:** No existe `src/middleware.ts`; la nota del checklist lo referencia.
5. **Beta: feedback loop:** No hay UI ni doc en app para reportar incidencias.
6. **Beta: disclaimer beta y limitaciones:** No hay texto "beta" ni limitaciones en app.
7. **Beta: disclaimer médico:** No hay aviso "no sustituye consejo profesional" en la app.

---

## Mínimo conjunto de acciones para cerrar (solo cierre, sin features)

### Obligatorias para que pasen quality gates y checklist

1. **Sentry en agentWeeklyPlan**
   - **Acción:** Añadir en `src/server/ai/agentWeeklyPlan.ts` (línea 1): `import * as Sentry from "@sentry/nextjs";`
   - **Cierra:** typecheck, test (agentWeeklyPlan + weeklyPlan route test), build.

2. **Tests de signin**
   - **Acción:** En `src/app/auth/signin/page.test.tsx`, ajustar expectativa al copy real: comprobar "Inicia sesión" y "Continuar con Google" (o el texto que muestre la página); quitar exigencia de "Sign in to your account" si ya no está en la UI.
   - **Cierra:** test signin.

3. **Test de profile (CTA onboarding)**
   - **Acción:** En `src/app/(app)/profile/page.test.tsx`, alinear el expect con la UI: por ejemplo matcher que acepte "Configurar preferencias" o el texto del CTA real cuando `profile === null`.
   - **Cierra:** test profile.

### Demo (elegir una opción de cierre mínimo)

4. **Ruta /api/demo/session que devuelva 403 cuando DEMO_MODE !== "true"**
   - **Acción:** Crear `src/app/api/demo/session/route.ts` (GET) que lea `process.env.DEMO_MODE` y, si no es `"true"`, responda con 403 y body `{ error: "DEMO_DISABLED" }`; si es `"true"`, puede devolver 200 con un payload mínimo o placeholder.
   - **Cierra:** ítem "api/demo bloqueado cuando DEMO_MODE=false" y post-deploy "GET /api/demo/session → 403".
   - **Alternativa:** Si se decide no tener demo API: actualizar RELEASE_CHECKLIST y Notes para quitar la mención a `/api/demo/session` y `/api/demo/setup`, y dejar claro que no existen (solo getSession con demo user cuando DEMO_MODE=true).

### Documentación / notas (sin tocar comportamiento)

5. **Nota sobre middleware**
   - **Acción:** En RELEASE_CHECKLIST.md, sección Notes, quitar o reescribir la frase que dice "El matcher de src/middleware.ts..."; indicar que no hay middleware personalizado o que la exclusión de rutas se hace por otro medio (p. ej. layout/auth).
   - **Cierra:** coherencia checklist–repo.

6. **Beta: disclaimer y feedback (mínimo)**
   - **Acción (disclaimer):** Añadir en una sola pantalla visible (p. ej. footer de `(app)/layout.tsx` o en onboarding paso 1) una línea de texto: "Esta app no sustituye el consejo médico o nutricional; consulta a un profesional antes de empezar." Sin nueva página ni feature.
   - **Acción (feedback):** Añadir en README o en BETA_CHECKLIST una frase: "Para reportar incidencias en beta: [email/issue tracker]." Opcional: un enlace "Reportar problema" en el footer que abra mailto o issue (una línea de UI).
   - **Acción (beta):** Una línea en landing o en layout: "Versión beta – limitaciones posibles."
   - **Cierra:** ítems de BETA sobre disclaimer, feedback y limitaciones.

### Resumen de prioridad

| Prioridad | Acción |
|-----------|--------|
| 1 | Import Sentry en `agentWeeklyPlan.ts` |
| 2 | Ajustar tests signin y profile al copy/UI actual |
| 3 | Crear GET `/api/demo/session` con 403 cuando DEMO_MODE !== "true" **o** actualizar checklist quitando requisito de rutas demo |
| 4 | Actualizar nota de middleware en RELEASE_CHECKLIST.md |
| 5 | Añadir disclaimer médico (una línea) + opcional feedback/beta en UI o doc |

Restricción respetada: no se añaden features; solo acciones para que los ítems del checklist pasen o queden documentados de forma coherente.

# Auditoría MVP — Paso A1: "use client" y fetch en cliente

## Resumen

| Categoría                                | Cantidad |
| ---------------------------------------- | -------- |
| Páginas con `"use client"`               | 8        |
| Componentes con `"use client"`           | 6        |
| Páginas que hacen fetch solo para render | 3        |

---

## 1. Páginas con fetch en cliente solo para render

Estas páginas usan `useEffect` + `fetch` a endpoints internos únicamente para obtener datos y pintar la UI.

| Archivo                                     | Endpoint               | Motivo actual              | Recomendación                                                                                                              | Riesgo |
| ------------------------------------------- | ---------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------ |
| `src/app/(app)/week/page.tsx`               | `GET /api/weekly-plan` | useEffect + fetch en mount | **Migrar** a Server Component; extraer `RationalePanel` y `SwapMealButton` + `NutritionToday` como Client Components hijos | Medio  |
| `src/app/(app)/profile/page.tsx`            | `GET /api/profile`     | useEffect + fetch en mount | **Migrar**; extraer formulario completo como Client Component                                                              | Medio  |
| `src/app/(app)/session/[dayIndex]/page.tsx` | `GET /api/weekly-plan` | useEffect + fetch en mount | **Migrar**; extraer bloque con ErrorBanner + retry como Client Component o usar Server Action para retry                   | Medio  |

---

## 2. Páginas con "use client" — detalle

### Páginas que SÍ podrían migrarse (parcial o total)

| Archivo                                     | Motivo actual de "use client"                                                                                     | Recomendación                                                                                                               | Riesgo |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------ |
| `src/app/(app)/week/page.tsx`               | fetch en cliente, `RationalePanel` (useState toggle), `SwapMealButton` (useState, fetch, modal), `NutritionToday` | **Migrar** página a Server; datos iniciales por props. Mantener como Client: RationalePanel, SwapMealButton, NutritionToday | Medio  |
| `src/app/(app)/profile/page.tsx`            | fetch en cliente, formulario con muchos inputs, handleSave, handleRegenConfirm, modales                           | **Migrar** fetch inicial a Server; extraer `ProfileForm` (Client) con todo el estado del formulario                         | Medio  |
| `src/app/(app)/session/[dayIndex]/page.tsx` | fetch en cliente, useParams, ErrorBanner con onRetry                                                              | **Migrar** fetch a Server; page como Server. Retry: Server Action o pequeño Client wrapper con retry                        | Medio  |

### Páginas que deben mantener "use client"

| Archivo                                | Motivo actual de "use client"                                                | Recomendación                                      | Riesgo |
| -------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------- | ------ |
| `src/app/(app)/log/training/page.tsx`  | Formulario controlado (useState), handleSubmit, useRouter.push               | **Mantener** — formulario 100% interactivo         | Bajo   |
| `src/app/(app)/log/nutrition/page.tsx` | Formulario controlado, handleSubmit, useRouter.push                          | **Mantener** — formulario 100% interactivo         | Bajo   |
| `src/app/(app)/onboarding/page.tsx`    | Multi-step (useState step), formulario, handleSetupAndPlan (POST), useRouter | **Mantener** — flujo multi-paso y submit           | Bajo   |
| `src/app/auth/signin/page.tsx`         | `signIn()` de next-auth/react, onClick                                       | **Mantener** — requiere cliente para OAuth         | Bajo   |
| `src/app/auth/verify/page.tsx`         | useRouter.replace en useEffect (redirect)                                    | **Mantener** — redirect en cliente (NextAuth flow) | Bajo   |

---

## 3. Componentes (no páginas)

| Archivo                                 | Motivo actual de "use client"                   | Recomendación                                  | Riesgo |
| --------------------------------------- | ----------------------------------------------- | ---------------------------------------------- | ------ |
| `src/app/components/Nav.tsx`            | usePathname para resaltar ruta activa           | **Mantener** — hook de navegación              | Bajo   |
| `src/app/providers/SessionProvider.tsx` | NextAuth SessionProvider (React Context)        | **Mantener** — requisito de next-auth          | Bajo   |
| `src/app/components/AuthGuard.tsx`      | useSession, useRouter, redirect condicional     | **Mantener** — guard de auth                   | Bajo   |
| `src/app/components/DemoGuard.tsx`      | usePathname, useRouter, getDemoUserId, redirect | **Mantener** — guard de demo mode              | Bajo   |
| `src/app/components/ErrorBanner.tsx`    | onRetry callback, onClick                       | **Mantener** — componente interactivo          | Bajo   |
| `src/app/global-error.tsx`              | Error boundary, useEffect (Sentry), NextError   | **Mantener** — error boundary requiere cliente | Bajo   |

---

## 4. Layouts

| Archivo                    | "use client" | Notas                                                    |
| -------------------------- | ------------ | -------------------------------------------------------- |
| `src/app/layout.tsx`       | No           | Server Component; usa SessionProvider (Client) como hijo |
| `src/app/(app)/layout.tsx` | No           | Server Component; getUserIdFromSession, redirect         |

---

## 5. Acciones recomendadas (prioridad)

1. **Alto impacto / medio esfuerzo**: Migrar `week/page.tsx` a Server Component + Client islands (RationalePanel, SwapMealButton, NutritionToday).
2. **Alto impacto / medio esfuerzo**: Migrar `session/[dayIndex]/page.tsx` a Server Component; retry vía Server Action o pequeño Client con key.
3. **Medio impacto / medio esfuerzo**: Migrar `profile/page.tsx` a Server Component + ProfileForm (Client).

---

## 6. No recomendado migrar (MVP)

- `log/training`, `log/nutrition`, `onboarding`: formularios con estado denso; beneficio de migración bajo.
- `auth/signin`, `auth/verify`: flujos de NextAuth, deben ser Client.
- Componentes (Nav, Guards, ErrorBanner, SessionProvider, global-error): infraestructura, correctos como Client.

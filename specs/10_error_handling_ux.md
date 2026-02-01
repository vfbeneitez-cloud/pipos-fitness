# 10 — Estándar de manejo de errores (UX)

## 1. Tipos de error

| Tipo            | Origen                             | Código típico                   | Ejemplo                                          |
| --------------- | ---------------------------------- | ------------------------------- | ------------------------------------------------ |
| Red             | fetch falla, timeout, sin conexión | —                               | "Error de red. Reintenta."                       |
| 429             | Rate limit                         | `RATE_LIMIT_EXCEEDED`           | "Demasiadas solicitudes. Espera un momento."     |
| 4xx validación  | Body/query inválido                | `INVALID_BODY`, `INVALID_QUERY` | "Datos incorrectos. Revisa y vuelve a intentar." |
| 4xx recurso     | No existe                          | 404                             | `notFound()`                                     |
| 5xx transitorio | Servidor/DB caída                  | 500, 503                        | "Algo ha fallado. Inténtalo más tarde."          |
| Inesperado      | Excepción no capturada             | —                               | global-error + Sentry                            |

## 2. Dónde se manejan

| Capa             | Uso                                                                    | Componente                           |
| ---------------- | ---------------------------------------------------------------------- | ------------------------------------ |
| **UI local**     | Error recuperable en página/componente (fetch fallido, submit fallido) | `ErrorBanner` con `onRetry` opcional |
| **notFound()**   | Recurso no existe (ej. ejercicio por slug)                             | Layout/error.tsx de Next.js          |
| **global-error** | Error no capturado en toda la app; crash del árbol React               | `global-error.tsx`                   |

## 3. Copy estándar (español)

| Situación              | Copy                                             |
| ---------------------- | ------------------------------------------------ |
| Red / timeout          | "Error de red. Reintenta."                       |
| 429                    | "Demasiadas solicitudes. Espera un momento."     |
| 4xx validación         | "Datos incorrectos. Revisa y vuelve a intentar." |
| 4xx recurso (genérico) | "No encontrado."                                 |
| 5xx                    | "Algo ha fallado. Inténtalo más tarde."          |
| Sesión/auth            | "Sesión no encontrada."                          |
| Cargar plan            | "Error al cargar el plan."                       |
| Cargar perfil          | "No se pudo cargar el perfil."                   |
| Guardar (genérico)     | "Error al guardar."                              |
| Regenerar plan         | "Error al regenerar plan."                       |

Regla: frases cortas, sin códigos técnicos ni stack traces.

## 4. CTAs estándar

| CTA                                 | Uso                                                     | Ubicación                                                      |
| ----------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------- |
| **Reintentar** (primario)           | Re-ejecutar la acción que falló                         | `ErrorBanner` cuando tiene sentido (fetch, retry)              |
| **Cerrar / Continuar** (secundario) | Solo ocultar el mensaje; el usuario corrige manualmente | Formularios cuando onRetry no aplica (ej. error de validación) |

El `ErrorBanner` actual: `message` + `onRetry?`. Si `onRetry` existe → botón "Reintentar". Si no → solo mensaje.

## 5. Política Sentry

| Capturar                                 | No capturar                                    |
| ---------------------------------------- | ---------------------------------------------- |
| Excepciones no capturadas (global-error) | Errores 4xx esperados (INVALID_BODY, notFound) |
| Errores 5xx en API routes                | Rate limit 429 (comportamiento esperado)       |
| Fallos en cron/jobs (captureMessage)     | Errores de validación de formulario (usuario)  |

Config actual: `global-error` envía a Sentry; `onRequestError` en instrumentation; cron usa `captureMessage` para fallos parciales.

## 6. Ejemplos aplicados

### 6.1 Página que hace fetch de datos (week, session)

- **Acción**: GET `/api/weekly-plan`
- **Error red / 5xx**: Mostrar `ErrorBanner` con "Error al cargar el plan." o "Error de red. Reintenta."
- **CTA**: "Reintentar" → volver a llamar `fetchPlan()`
- **429**: Mostrar "Demasiadas solicitudes. Espera un momento." + opcional "Reintentar" (con delay)
- **Implementación**: `setError(message)`, `ErrorBanner message={error} onRetry={fetchPlan}`

### 6.2 Formulario (profile, log/training, log/nutrition)

- **Acción**: POST a `/api/profile`, `/api/training/log`, `/api/nutrition/log`
- **Error red**: "Error de red. Reintenta."
- **Error validación (400)**: Usar `data.error` del API si existe y es legible; si no, "Datos incorrectos. Revisa y vuelve a intentar."
- **Error genérico (4xx/5xx)**: "Error al guardar." / "No se pudo cargar el perfil." según contexto
- **CTA**: "Reintentar" → `setError(null)` para permitir reenvío; o en forms, el usuario corrige y vuelve a enviar
- **Implementación**: `ErrorBanner message={error} onRetry={() => setError(null)}` — el "retry" aquí es limpiar el mensaje para reintentar el submit

### 6.3 Recurso no encontrado (exercise/[slug])

- **Acción**: Buscar ejercicio por slug en DB
- **No existe**: `notFound()` de Next.js
- **Resultado**: Página 404 estándar de Next.js
- **No usar** `ErrorBanner` — el recurso no existe, no es un error recuperable con retry

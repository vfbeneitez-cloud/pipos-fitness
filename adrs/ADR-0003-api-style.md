## ADR-0003 — API style

### Contexto

- La app expone endpoints HTTP para UI y, potencialmente, otros clientes.
- Ya estamos usando Next.js App Router con route handlers y Zod para validar input.
- Queremos una convención consistente de estructura de handlers, validación y errores.

### Decisión

- **Route Handlers de Next.js** (`src/app/api/**/route.ts`) serán la capa HTTP:
  - reciben `Request`,
  - convierten a objetos de dominio simples (URLs, bodies),
  - delegan en funciones de aplicación en `src/server/api/**`,
  - devuelven `NextResponse`.
- **Validación de input**:
  - todo input externo (query, body, path) se valida con **Zod** en la capa `src/server/api/**` (o en helpers cercanos);
  - los helpers devuelven objetos `{ status, body }` para facilitar testeo sin Next.
- **Errores y códigos**:
  - inputs inválidos → **4xx** (normalmente `400 Bad Request` / `404 Not Found` / `403 Forbidden` / `422 Unprocessable Entity`);
  - errores inesperados (bugs, fallos DB no anticipados) → **5xx**;
  - formato de error JSON (convención actual, compat transitoria):
    - `{ "error_code": "ERROR_CODE", "message": string, "error": "ERROR_CODE", "details"?: any }`
    - `error` duplica `error_code` para compatibilidad 1–2 releases; `details` puede incluir errores de validación, nunca secretos ni PII.
  - mapper único: `toNextResponse(result)` en `src/server/api/errorResponse.ts` convierte `{ status, body }` del server a `NextResponse` con body de error normalizado.

### Alternativas consideradas

- **Usar solo Next handlers sin capa `src/server/api`**:
  - más simple a corto plazo;
  - peor testabilidad y reutilización.
- **Respuestas de error libres (strings o estructuras ad-hoc)**:
  - flexibles pero difíciles de documentar y versionar.

### Consecuencias

- Beneficios:
  - contratos de error claros y predecibles para el frontend y el agente IA;
  - tests de integración pueden ejecutar directamente funciones en `src/server/api/**` sin mockear Next.
- Costes:
  - ligera duplicación de capas (adaptadores + handlers de aplicación);
  - disciplina para mantener el formato `{ error, details? }` en todos los endpoints.

### Cómo validar

- Al añadir/modificar un endpoint:
  - verificar que:
    - la validación de entrada se hace con Zod,
    - los errores devuelven `4xx`/`5xx` con body normalizado vía `toNextResponse` o helpers (`badRequestBody`, `forbiddenBody`) que exponen `error_code`, `message`, `error`,
    - no se devuelven errores crudos (stack traces, mensajes de DB).
- Añadir/actualizar specs en `/specs/**` describiendo respuestas de éxito y error, y tests que cubran al menos un caso de error por endpoint.

### Deprecation plan (error compat)

- El campo `error` en el JSON de error es un alias de `error_code` por compatibilidad.
- **Cutoff**: retirar `error` a partir de **2026-03-31** o **v0.6.0** (lo que ocurra después).
- A partir del cutoff: respuestas de error solo `{ "error_code": string, "message": string, "details"?: unknown }`.
- Clientes deben migrar a `error_code` antes del cutoff.

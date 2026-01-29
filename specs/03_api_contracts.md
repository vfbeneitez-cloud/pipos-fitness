## 03 — API Contracts (MVP)

### Convenciones generales

- Todas las APIs HTTP viven en `/api/**` usando Next Route Handlers.
- **Autenticación**: Endpoints protegidos requieren sesión válida (excepto `/api/exercises` que es público).
  - `DEMO_MODE=true`: usa demo session automáticamente.
  - `DEMO_MODE=false`: requiere autenticación real (NextAuth.js magic link).
  - Sin sesión → 401 `UNAUTHORIZED`.
- Validación de inputs con **Zod** en `src/server/api/**`.
- Errores:
  - 4xx para input inválido o recursos no encontrados.
  - 5xx solo para errores inesperados.
  - Formato: `{ "error": "ERROR_CODE", "details"?: any }`.

---

### 1) GET `/api/exercises`

- **Query params**
  - `environment?`: `GYM | HOME | CALISTHENICS | POOL | MIXED`
  - `q?`: string (1–50 chars) — búsqueda por nombre (case-insensitive).
- **Respuesta 200**
  - Body: lista de ejercicios:
  - `[ { id, slug, name, environment, primaryMuscle?, cues?, commonMistakes?, regressions?, progressions?, media: [{ id, type, url, thumbnailUrl? }] } ]`
- **Errores**
  - 400 `INVALID_QUERY` si:
    - `environment` no es uno de los valores permitidos.
    - `q` es demasiado corto/largo o mal formado.

---

### 2) GET `/api/weekly-plan`

- **Autenticación**: Requerida (sesión válida).
- **Query params**
  - `weekStart: string` — formato `YYYY-MM-DD` (normalizado a fecha UTC).
  - `userId` viene de la sesión (no se pasa en query).
- **Respuesta 200**
  - Body:
  - `null` si no hay plan para esa semana.
  - O bien el `WeeklyPlan`:
    - `{ id, userId, weekStart, status, trainingJson, nutritionJson, createdAt, updatedAt }`
- **Errores**
  - 401 `UNAUTHORIZED` si no hay sesión válida.
  - 400 `INVALID_QUERY` si:
    - falta `weekStart`,
    - `weekStart` no cumple el patrón `YYYY-MM-DD`.

---

### 3) POST `/api/weekly-plan`

- **Autenticación**: Requerida (sesión válida).
- **Body**
  - JSON (sin `userId`, viene de sesión):
  - ```json
    {
      "weekStart": "YYYY-MM-DD",
      "environment": "GYM" | "HOME" | "CALISTHENICS" | "POOL" | "MIXED",
      "daysPerWeek": number (1–7),
      "sessionMinutes": number (15–180)
    }
    ```
- **Comportamiento**
  - Valida input con Zod.
  - `userId` viene de la sesión (no se pasa en body).
  - Busca `Exercise` según `environment` (`MIXED` → todos).
  - Usa generadores de dominio para `trainingJson` y `nutritionJson`.
  - `upsert` de `WeeklyPlan` por `(userId, weekStart)`.
- **Respuesta 200**
  - Body: `WeeklyPlan` completo: `{ id, userId, weekStart, status, trainingJson, nutritionJson, ... }`.
- **Errores**
  - 401 `UNAUTHORIZED` si no hay sesión válida.
  - 400 `INVALID_BODY` si Zod falla (con `details`).
  - 400 `INVALID_JSON` si el body no es JSON parseable.

---

### 4) POST `/api/nutrition/swap`

- **Autenticación**: Requerida (sesión válida).
- **Objetivo**
  - Permitir sustituir una comida sugerida en el plan semanal por otra equivalente (respeta restricciones).
- **Body (MVP)**
  - ```json
    {
      "weekStart": "YYYY-MM-DD",
      "dayIndex": number,          // 0..6
      "mealSlot": "breakfast" | "lunch" | "dinner" | "snack",
      "reason"?: "dislike" | "noTime" | "noIngredients" | "other"
    }
    ```
- **Comportamiento**
  - Valida input con Zod.
  - `userId` viene de la sesión (no se pasa en body).
  - Carga el `WeeklyPlan` actual (o lo genera si no existe, según decisión de negocio simple).
  - Usa reglas de dominio de nutrición para elegir una alternativa:
    - respeta `cookingTime`, `allergies`, `dislikes`, `dietaryStyle`.
  - Devuelve propuesta de comida alternativa sin modificar todavía el plan persistido (MVP) o actualizándolo si se decide.
- **Respuesta 200**
  - Body:
  - ```json
    {
      "meal": {
        "slot": "lunch",
        "title": "string",
        "minutes": number,
        "tags": string[],
        "ingredients": string[],
        "instructions": string,
        "substitutions": [{ "title": "string", "minutes": number }]
      }
    }
    ```
- **Errores**
  - 401 `UNAUTHORIZED` si no hay sesión válida.
  - 400 `INVALID_BODY` si Zod falla.
  - 404 `PLAN_NOT_FOUND` si no hay plan y no se decide regenerar automáticamente.

---

### 5) POST `/api/training/log`

- **Autenticación**: Requerida (sesión válida).
- **Objetivo**
  - Registrar una sesión de entrenamiento con modo rápido.
- **Body (MVP)**
  - ```json
    {
      "planId"?: "string",
      "occurredAt"?: "ISO-8601",      // opcional, por defecto ahora
      "sessionName"?: "string",
      "completed": boolean,
      "difficulty"?: "easy" | "ok" | "hard",
      "pain": boolean,
      "painNotes"?: "string"
    }
    ```
- **Comportamiento**
  - Valida input con Zod (incluyendo enums simples para `difficulty`).
  - `userId` viene de la sesión (no se pasa en body).
  - Verifica existencia de `WeeklyPlan` si `planId` viene.
  - Crea `TrainingLog`.
- **Respuesta 200**
  - Body: `{ id, userId, occurredAt, planId?, sessionName?, completed, difficulty?, pain, painNotes?, createdAt }`
- **Errores**
  - 401 `UNAUTHORIZED` si no hay sesión válida.
  - 400 `INVALID_BODY` si Zod falla.
  - 404 `PLAN_NOT_FOUND` si `planId` no existe.

---

### 6) POST `/api/nutrition/log`

- **Autenticación**: Requerida (sesión válida).
- **Objetivo**
  - Registrar cumplimiento (o no) de una comida.
- **Body (MVP)**
  - ```json
    {
      "occurredAt"?: "ISO-8601",
      "mealName"?: "string",         // ej. "desayuno"
      "followedPlan": boolean,
      "hunger"?: "low" | "ok" | "high",
      "notes"?: "string"
    }
    ```
- **Comportamiento**
  - Valida input con Zod.
  - `userId` viene de la sesión (no se pasa en body).
  - Crea `NutritionLog`.
- **Respuesta 200**
  - Body: `{ id, userId, occurredAt, mealName?, followedPlan, hunger?, notes?, createdAt }`
- **Errores**
  - 401 `UNAUTHORIZED` si no hay sesión válida.
  - 400 `INVALID_BODY` si Zod falla.

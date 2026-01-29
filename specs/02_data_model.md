## 02 — Data Model (MVP)

### 1) User

- **Campos principales**
  - `id: string` — identificador interno.
  - `email: string` (único).
  - `createdAt: DateTime`
  - `updatedAt: DateTime`
- **Relaciones**
  - 1–1 con `UserProfile`.
  - 1–N con `WeeklyPlan`, `TrainingLog`, `NutritionLog`.
- **Constraints**
  - `email` único.

### 2) UserProfile

- **Campos principales**
  - `id: string`
  - `userId: string` (único, FK a `User.id`).
  - `displayName?: string`
  - `sex: Sex` — enum: `UNSPECIFIED | MALE | FEMALE`.
  - `birthYear?: number`
  - **Entrenamiento**
    - `goal?: string`
    - `level: ActivityLevel` — enum: `BEGINNER | INTERMEDIATE | ADVANCED`.
    - `daysPerWeek: number` (por defecto 3).
    - `sessionMinutes: number` (por defecto 45).
    - `environment: TrainingEnvironment` — enum: `GYM | HOME | CALISTHENICS | POOL | MIXED`.
    - `equipmentNotes?: string`
    - `injuryNotes?: string`
  - **Nutrición**
    - `dietaryStyle?: string` (ej. “omnivore”, “vegetarian”).
    - `allergies?: string`
    - `dislikes?: string`
    - `cookingTime: CookingTime` — enum: `MIN_10 | MIN_20 | MIN_40 | FLEXIBLE`.
    - `mealsPerDay: number` (por defecto 3).
  - `createdAt: DateTime`
  - `updatedAt: DateTime`
- **Relaciones**
  - 1–1 con `User`.
- **Constraints**
  - `userId` único.

### 3) Exercise

- **Campos principales**
  - `id: string`
  - `slug: string` (único, estable para referenciar desde planes).
  - `name: string`
  - `environment: TrainingEnvironment`
  - `primaryMuscle?: string`
  - `description?: string`
  - `cues?: string`
  - `commonMistakes?: string`
  - `regressions?: string`
  - `progressions?: string`
  - `createdAt: DateTime`
  - `updatedAt: DateTime`
- **Relaciones**
  - 1–N con `MediaAsset`.
- **Constraints**
  - `slug` único.

### 4) MediaAsset

- **Campos principales**
  - `id: string`
  - `exerciseId: string` (FK a `Exercise.id`).
  - `type: string` — `"video"` | `"image"` (validado en app layer).
  - `url: string`
  - `thumbnailUrl?: string`
  - `source?: string` (origen del media).
  - `createdAt: DateTime`
- **Relaciones**
  - N–1 hacia `Exercise`.

### 5) WeeklyPlan

- **Campos principales**
  - `id: string`
  - `userId: string` (FK a `User.id`).
  - `weekStart: DateTime` — inicio de semana (UTC).
  - `status: PlanStatus` — enum: `DRAFT | ACTIVE | ARCHIVED` (MVP usa `DRAFT`/`ACTIVE`).
  - `trainingJson: Json` — estructura de plan de entrenamiento semanal (ver generadores core).
  - `nutritionJson: Json` — estructura de menú semanal.
  - `createdAt: DateTime`
  - `updatedAt: DateTime`
- **Relaciones**
  - N–1 hacia `User`.
  - 1–N con `TrainingLog` (logs asociados opcionales).
- **Constraints**
  - `unique(userId, weekStart)` — solo un plan por usuario/semana.

### 6) TrainingLog

- **Campos principales**
  - `id: string`
  - `userId: string` (FK a `User.id`).
  - `occurredAt: DateTime` — cuándo se registró (o fecha de sesión).
  - `planId?: string` (FK opcional a `WeeklyPlan.id`).
  - `sessionName?: string`
  - `completed: boolean` — por defecto `true`.
  - `difficulty?: string` — p.ej. “easy/ok/hard” o escala simple.
  - `pain: boolean` — por defecto `false`.
  - `painNotes?: string`
  - `detailsJson?: Json` — datos más detallados (series/reps/peso) opcionales.
  - `createdAt: DateTime`
- **Relaciones**
  - N–1 hacia `User`.
  - N–1 opcional hacia `WeeklyPlan`.

### 7) NutritionLog

- **Campos principales**
  - `id: string`
  - `userId: string` (FK a `User.id`).
  - `occurredAt: DateTime`
  - `mealName?: string` — etiqueta (desayuno/comida/cena/etc.).
  - `followedPlan: boolean` — si se siguió el menú sugerido.
  - `hunger?: string` — sensación de hambre/saciedad simple.
  - `notes?: string`
  - `detailsJson?: Json`
  - `createdAt: DateTime`
- **Relaciones**
  - N–1 hacia `User`.

### 8) Enums (resumen)

- `TrainingEnvironment`: `GYM | HOME | CALISTHENICS | POOL | MIXED`
- `Sex`: `UNSPECIFIED | MALE | FEMALE`
- `ActivityLevel`: `BEGINNER | INTERMEDIATE | ADVANCED`
- `CookingTime`: `MIN_10 | MIN_20 | MIN_40 | FLEXIBLE`
- `PlanStatus`: `DRAFT | ACTIVE | ARCHIVED`

### 9) Evolución futura (no MVP)

- **User/UserProfile**
  - Campos específicos de métricas (peso, perímetros, objetivos cuantitativos).
  - Flags avanzados de salud (siempre bajo ADR-0005).
- **WeeklyPlan**
  - Versionado de esquema de `trainingJson`/`nutritionJson` para nuevos tipos de sesiones/comidas.
  - Enlaces explícitos a logs agregados por semana.
- **Logging**
  - Tablas específicas para eventos del agente IA (audit log de acciones).

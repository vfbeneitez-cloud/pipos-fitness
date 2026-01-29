## 05 — AI Agent Boundary (MVP)

### 1) Qué hace la IA en MVP

- Explicar:
  - cómo ejecutar ejercicios/máquinas (enlazando a la guía visual cuando sea posible),
  - el razonamiento básico detrás del plan semanal (por qué tantos días, por qué ciertas comidas).
- Ayudar con:
  - ajustes sencillos del plan (ej. “esta semana solo puedo entrenar 2 días” → sugerir regenerar plan),
  - swaps de comidas (“no me gusta X”, “no tengo tiempo hoy”) usando las reglas de nutrición,
  - dudas prácticas (“qué hago hoy si no puedo ir al gym” dentro de límites de seguridad).
- Actuar solo a través de herramientas internas:
  - leer perfil y plan semanal actual,
  - proponer cambios (plan o swaps) que luego se materializan vía APIs existentes.

### 2) Qué NO hace la IA en MVP

- No diagnostica enfermedades ni recomienda tratamientos médicos.
- No prescribe dietas clínicas (ej. para patologías concretas) ni protocolos extremos.
- No modifica directamente datos críticos sin pasar por flujos de app/APIs (no “atajos” que salten validaciones).
- No toma decisiones financieras o legales.

### 3) Inputs disponibles

- **Perfil de usuario** (a través de la capa server, no expuesto crudo al cliente IA):
  - nivel, días/semana, entorno, objetivo, preferencias, alergias, dislikes, tiempo de cocina, nº comidas/día.
- **Semana actual**
  - `WeeklyPlan` (trainingJson + nutritionJson) para la semana activa.
- **Logs recientes**
  - `TrainingLog` y `NutritionLog` recientes (resumen de adherencia y feedback).
- **Contexto de sesión**
  - pantalla actual (entreno o nutrición), idioma/UI, plataforma.

### 4) Outputs esperados

- Respuestas textuales:
  - explicaciones claras y simples adaptadas al nivel del usuario.
  - justificaciones breves de cambios propuestos (“bajamos a 2 días por semana porque...”).
- Propuestas de acción:
  - nuevos parámetros para regenerar plan semanal (ej. cambiar entorno, días/semana).
  - sugerencias de swap para comidas.
- Siempre siguiendo formato estructurado cuando llame a herramientas internas (para poder testear y auditar).

### 5) Reglas de seguridad (link ADR-0005)

- Seguir ADR-0005:
  - **sin diagnóstico médico**,
  - red flags (dolor agudo, mareos, síntomas serios, trastornos alimentarios) → recomendar acudir a profesional sanitario,
  - no sugerir extremos (volúmenes/rutinas o dietas peligrosas).
- Tono:
  - prudente, sin prometer “resultados garantizados”.
  - fomenta progresión gradual y escucha de señales del cuerpo.

### 6) Acceptance Criteria

- AC1: El agente puede explicar un ejercicio y referenciar correctamente su guía visual (cuando exista).
- AC2: El agente puede sugerir swaps de comidas coherentes con preferencias, alergias y tiempo de cocina.
- AC3: El agente nunca sugiere acciones que violen ADR-0005 en los casos de prueba definidos (prompt regression).
- AC4: Toda acción que cambie plan o perfil pasa por herramientas/APIs auditables, no por escritura directa sin validación.

### 7) Endpoint MVP implementado

- **POST `/api/agent/weekly-plan`** (ver `specs/08_ai_agent_mvp.md`):
  - Recibe `userId` y `weekStart`.
  - Lee perfil, logs recientes y plan actual.
  - Detecta red flags y aplica ajustes conservadores.
  - Genera nuevo plan usando herramientas internas (`generateWeeklyTrainingPlan`, `generateWeeklyNutritionPlan`).
  - Devuelve plan actualizado + rationale breve (sin PII, sin diagnóstico médico).
  - Rate limited y con logging estructurado (vía `withSensitiveRoute`).

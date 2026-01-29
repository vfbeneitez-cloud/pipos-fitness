## 01 — Roadmap MVP (épicas en orden)

> Orden orientado a llevar el backend/API y la base de datos a estado producción primero, después experiencia de usuario y agente IA, y finalmente observabilidad y despliegue.

### 1) Épica R1 — API & Core Domain

- **Objetivo**: Consolidar el dominio (`src/core`) y las APIs (`src/server` + `src/app/api`) en un diseño estable y testeado.
- **Incluye**:
  - Estabilizar generadores de plan semanal de entrenamiento y nutrición (tipos, invariantes, casos borde).
  - Endpoints REST principales:
    - `/api/exercises` (listado/filtrado).
    - `/api/weekly-plan` (crear/leer/actualizar v0).
  - Validación robusta con Zod para todos los inputs.
  - Contratos de errores coherentes (4xx vs 5xx) documentados en specs.
- **Criterios**:
  - Todos los endpoints expuestos tienen tests (unit + integración) y pasan `lint`, `typecheck`, `test`.
  - No se exponen errores “crudos” al cliente; siempre respuestas JSON tipadas.

### 2) Épica R2 — Auth (Cuenta & Sesión)

- **Objetivo**: Proteger los datos de usuario y vincular todas las operaciones a una identidad autenticada.
- **Incluye**:
  - Elección de estrategia de auth (por ejemplo, email/password o proveedor externo) documentada en ADR.
  - Middleware/server helpers para extraer `userId` de la sesión en APIs (no desde query arbitraria).
  - Flujos mínimos: registro, login, logout.
  - Control de acceso a `/api/weekly-plan` y futuras APIs (scoping por `userId`).
- **Criterios**:
  - Ningún endpoint que toque datos de usuario acepta `userId` “libre” desde el cliente.
  - Tests de integración que demuestran que un usuario no puede acceder a recursos de otro.

### 3) Épica R3 — Perfil de Usuario (Entrenamiento + Nutrición)

- **Objetivo**: Completar y exponer el modelo de `UserProfile` para personalizar planes.
- **Incluye**:
  - API de perfil: leer/actualizar perfil (objetivo, nivel, días/semana, entorno, cooking time, comidas/día, preferencias, alergias, etc.).
  - Onboarding mínimo en UI para rellenar/editar perfil.
  - Uso del perfil en los generadores de planes (inputs consolidados desde DB).
- **Criterios**:
  - Un usuario nuevo puede completar el perfil y obtener un plan semanal coherente con sus datos.
  - Cambios en el perfil se reflejan en el siguiente plan generado.

### 4) Épica R4 — Planes Semanales (Entrenamiento + Nutrición)

- **Objetivo**: Endurecer el motor de planes semanales y la persistencia de `WeeklyPlan`.
- **Incluye**:
  - Refinar estructura de `trainingJson` y `nutritionJson` (contratos claros y versionados).
  - Reglas mínimas de progresión y seguridad (sin saltos bruscos de volumen/tiempo).
  - API para listar histórico de planes por usuario.
  - Primitivas para marcar semana como “cerrada” y generar la siguiente (aunque el motor de ajuste venga en una épica posterior).
- **Criterios**:
  - Los planes generados cumplen con la spec funcional (7 días, `daysPerWeek` coherente, etc.).
  - Hay tests para casos límite (1–7 días/sem, distintos entornos y restricciones).

### 5) Épica R5 — Biblioteca de Ejercicios & Media

- **Objetivo**: Convertir la tabla de `Exercise` + `MediaAsset` en una biblioteca sólida para la guía visual.
- **Incluye**:
  - Ampliar el seed y endpoints para soportar más metadata (cues, errores comunes, regresiones/progresiones).
  - API para obtener detalles de un ejercicio específico (by `slug`/`id`), reutilizable por el agente IA y la UI.
  - Convención de almacenamiento de media (URLs externas seguras o CDN propio) documentada.
- **Criterios**:
  - Cada ejercicio del plan tiene al menos una ficha de detalle consistente con la spec.
  - Tests que verifican integridad entre planes y biblioteca (ejercicios referenciados existen).

### 6) Épica R6 — Agente IA

- **Objetivo**: Añadir un agente IA que actúe sobre el dominio existente sin comprometer seguridad ni consistencia.
- **Incluye**:
  - Definición de herramientas internas (tooling) para el agente: ajustar plan semanal, proponer sustituciones, explicar ejercicios.
  - Especificación de prompts y guardrails (sin diagnóstico médico, sin extremos).
  - API/chat endpoint para la UI.
- **Criterios**:
  - Los flujos clave (`ajustar plan`, `no tengo tiempo para cocinar`, `explicar ejercicio`) están cubiertos por tests de regresión de prompts/tool-calls.
  - Todas las acciones del agente quedan auditadas (qué cambió, cuándo, quién).

### 7) Épica R7 — Observabilidad y Resiliencia

- **Objetivo**: Hacer el sistema operable en producción.
- **Incluye**:
  - Integración de error tracking (Sentry u otro) y logging estructurado.
  - Métricas básicas: latencia por endpoint, tasas de 4xx/5xx, generación de planes por día/semana.
  - Health checks y smoke tests post-deploy automatizados.
- **Criterios**:
  - Ante un fallo en generación de plan o lectura de DB, el error queda trazable sin filtrar PII.
  - Existen dashboards mínimos para monitoreo.

### 8) Épica R8 — Despliegue & Entorno

- **Objetivo**: Definir y automatizar el camino a producción.
- **Incluye**:
  - Pipeline CI/CD que ejecute `lint`, `typecheck`, `test` y migraciones en entornos previos.
  - Estrategia de despliegue (p. ej. Vercel para Next.js + Neon/Postgres) documentada en ADR.
  - Gestión de `DATABASE_URL` y demás secretos vía `.env` (no en repo) + `.env.example` documentado.
- **Criterios**:
  - Cualquier persona del equipo puede desplegar una nueva versión siguiendo un runbook simple.
  - La app arranca correctamente en un entorno limpio con solo `.env`, migraciones y seed ejecutados.

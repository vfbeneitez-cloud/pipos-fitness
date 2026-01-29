## 04 — Tools / MCP

### 1) Stack base (decidido)

- **DB**: Prisma v7 + PostgreSQL (Neon)
  - `prisma.config.ts` ya configurado con `DATABASE_URL` y migraciones.
  - Cliente en `src/server/db/prisma.ts` usando `@prisma/adapter-neon`.

### 2) Auth (a decidir vía ADR)

- Auth se definirá en un ADR dedicado (p.ej. `adr/0x-auth.md`).
- Reglas:
  - debe integrarse bien con Next.js App Router
  - debe permitir mapear usuario autenticado → `User`/`UserProfile` en DB
  - debe soportar, como mínimo, login por email y recuperación de sesión segura

### 3) Logging / observabilidad (a decidir vía ADR)

- Observabilidad se centralizará en una decisión formal (p.ej. `adr/0x-observability.md`).
- Reglas:
  - logs estructurados, sin PII sensible
  - error tracking para backend (y opcionalmente frontend)
  - métricas básicas por endpoint (latencia, 4xx/5xx, generación de planes)

### 4) Proveedor IA (abstracto)

- No se fija proveedor concreto en código ni en este spec.
- Reglas:
  - la integración debe ir detrás de una interfaz propia del dominio (ej. `src/server/ai/**`)
  - las claves de API vivirán siempre en variables de entorno (`.env`, no repo)
  - prompts y herramientas del agente deben estar versionados en `/specs/**` (SDD también para IA)

### 5) MCP wishlist (no implementado todavía)

- **DB / datos**
  - conector Neon/Prisma para inspeccionar schema, estados de migraciones y ejecutar consultas de solo lectura.
- **Observabilidad**
  - conector para leer errores y métricas desde el proveedor de error tracking/monitoring elegido (solo lectura).
- **Infra / Deploy**
  - conector para ver estado de despliegues (builds recientes, versiones activas).
- **IA / Experimentos**
  - conector para gestionar prompts/políticas del agente IA de forma centralizada (lectura/escritura controlada, sin exponer claves).

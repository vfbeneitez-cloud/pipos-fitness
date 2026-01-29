## ADR-0001 — Monorepo Next.js App Router + Domain/Core separation

### Contexto

- El proyecto usa Next.js App Router como frontend y servidor HTTP.
- Se requiere separar claramente:
  - **dominio puro** (sin dependencias de framework),
  - **infraestructura** (DB, servicios externos),
  - **UI/rutas**.

### Decisión

- Mantener una única app Next.js (no microfrontends ni backend separado) con la siguiente estructura:
  - `src/core`: lógica de dominio pura (funciones puras, tipos de dominio, sin imports de `next`, `react`, `@prisma/client` ni adaptadores externos).
  - `src/server`: infraestructura y servicios:
    - `db/` (Prisma client y utilidades DB),
    - `api/**` (módulos de aplicación para cada endpoint, sin detalles de `NextResponse`),
    - futuros servicios (observabilidad, integración IA, etc.).
  - `src/app`: UI + route handlers de Next:
    - componentes React, páginas, layouts,
    - adaptadores HTTP (`app/api/**`) que delegan en `src/server/api/**`.

### Alternativas consideradas

- **Backend separado (Node/Express/Fastify) + Next solo como frontend**:
  - - separa responsabilidades con más fuerza;
  - − más infra, más latencia, más complejidad de despliegue.
- **Todo en `app/api` sin capa `src/server`**:
  - - menos archivos al principio;
  - − lógica de dominio acoplada a Next, peor testabilidad y reuso.

### Consecuencias

- Beneficios:
  - dominio (`src/core`) fácilmente testeable con Vitest sin levantar Next ni DB;
  - handlers de servidor (`src/server/api/**`) reutilizables desde tests y otras interfaces;
  - ruta clara para añadir otros frontends/consumidores si se necesita.
- Costes:
  - disciplina adicional para respetar boundaries de imports;
  - más módulos/archivos que en un monolito “todo en app”.

### Cómo validar

- Revisar que:
  - nuevos módulos de dominio viven en `src/core/**` y no importan framework/infra;
  - cualquier ruta HTTP en `src/app/api/**` actúa solo como adaptador hacia `src/server/api/**`.
- Añadir tests unitarios sobre `src/core/**` y de integración sobre `src/server/api/**` para cada nueva funcionalidad.

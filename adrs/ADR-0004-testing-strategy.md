## ADR-0004 — Testing strategy

### Contexto

- El proyecto mezcla lógica de dominio pura (`src/core`), capa de servidor (`src/server`) y UI/route handlers (`src/app`).
- Ya usamos Vitest con configuración propia (`vitest.config.ts`) y algunos tests existentes (core smoke, APIs).
- Necesitamos una estrategia simple pero consistente para asegurar calidad antes de merge.

### Decisión

- **Framework de tests**: usar **Vitest** para:
  - tests unitarios de funciones puras en `src/core/**`,
  - tests de integración de handlers en `src/server/api/**` (incluyendo acceso a Prisma real o mockeado según sea necesario).
- **Qué se testea**:
  - `src/core/**`:
    - invariantes de dominio (estructura de planes, filtros de nutrición, selección de ejercicios, etc.),
    - comportamiento con inputs válidos y casos borde.
  - `src/server/api/**`:
    - validación de inputs (casos válidos e inválidos),
    - integración con DB (cuando tenga sentido) y shape de respuestas `{ status, body }`.
  - Adaptadores `src/app/api/**`:
    - solo cuando haya lógica extra no cubierta por tests de `src/server/api/**` (en general, mantenerlos finos).
- **DoD de testing**:
  - antes de merge, los cambios deben:
    - tener al menos un test relevante nuevo o actualizado (salvo cambios puramente de docs/config),
    - pasar `npm test` sin fallos,
    - no introducir tests “frágiles” (dependientes de seeds/mocks no controlados).

### Alternativas consideradas

- **Separar framework de tests (Jest para backend, Playwright para e2e, etc.)**:
  - más potencia e2e, pero mayor complejidad inicial.
- **Sin tests de integración (solo unitarios)**:
  - más rápido de mantener, pero menos confianza en integración con DB y APIs.

### Consecuencias

- Beneficios:
  - un solo framework (Vitest) simplifica tooling y DX;
  - capa clara entre tests de dominio puro y tests de integración de servidor.
- Costes:
  - e2e completos se dejan para una fase posterior (podrían añadirse con otra herramienta y otro ADR).

### Cómo validar

- Para cada cambio:
  - verificar que existe al menos un test que fallaría si el cambio se eliminara;
  - ejecutar `npm test` localmente y en CI;
  - revisar que los tests no dependen de orden de ejecución ni de estado global no controlado.

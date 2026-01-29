## 02 — Comandos (Prompt Pack)

### `/spec`

- **Uso**: crear o actualizar un spec antes de tocar código.
- **Formato** (ejemplo corto):
  - `/spec "API weekly-plan v1" -> actualizar specs/03_weekly_plan_v0.md con nuevos campos de adherencia`

### `/plan`

- **Uso**: definir plan técnico concreto a partir de un spec.
- **Formato**:
  - `/plan "backend weekly-plan v1" -> pasos en src/core + src/server/api + tests afectados`

### `/impl`

- **Uso**: aplicar cambios mínimos alineados con el plan (sin scope creep).
- **Formato**:
  - `/impl "añadir campo X al WeeklyPlan" -> tocar solo schema.prisma + prisma migration + handler correspondiente`

### `/test`

- **Uso**: decidir qué tests tocar y cómo ejecutarlos.
- **Formato**:
  - `/test "cambio weekly-plan v1" -> listar unit/integration/e2e a modificar + comandos npm`

### `/review`

- **Uso**: pasar checklist de calidad (DoD, errores, seguridad).
- **Formato**:
  - `/review "PR weekly-plan v1" -> validar DoD, contratos, errores 4xx/5xx, impacto en observabilidad`

### `/adr`

- **Uso**: registrar o actualizar una decisión arquitectónica.
- **Formato**:
  - `/adr "auth provider" -> crear/actualizar ADR con pros/cons y decisión final`

### `/release`

- **Uso**: preparar salida a entorno (staging/prod) para un cambio concreto.
- **Formato**:
  - `/release "weekly-plan v1" -> listar migraciones, comandos de build, pasos de verificación post-deploy`

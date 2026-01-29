## 00 — Operating Mode (Cursor)

### 1) Flujo de trabajo

- **Spec**: definir qué queremos (producto + API + UX) en `/specs/**`.
- **Plan**: acordar enfoque técnico (arquitectura, modelos, contratos).
- **Implement**: cambios mínimos y acotados, alineados con el spec.
- **Test**: unit + integración + e2e (cuando aplique); todo verde.
- **Review**: checklist de calidad, seguridad y dominio.
- **Release**: migraciones aplicadas, entorno estable, comunicación de cambios.

### 2) Definition of Done (DoD)

- **Spec** actualizado en `/specs/**` para cualquier cambio no trivial.
- **Código**:
  - sin TODOs críticos
  - sin console.log “debug” en paths de producción
  - sin secretos ni URLs sensibles hardcodeadas
- **Calidad**:
  - `npm run lint` OK
  - `npm run typecheck` OK
  - `npm test` OK (tests relevantes actualizados/añadidos)
- **Docs**:
  - si hay cambio de contrato/API: spec actualizada
  - si hay cambio de arquitectura: ADR actualizado/añadido
- **Seguridad/privacidad**: checklist de abajo sin violaciones.

### 3) Convenciones de PR / commits

- **Commits** (estilo alto nivel, centrado en intención):
  - `feat: ...` para nuevas capacidades
  - `fix: ...` para correcciones
  - `chore: ...` para tareas internas (build, deps)
  - `docs: ...` para documentación
- **PRs**:
  - título: tipo + área + resumen corto (`feat(core): weekly plan v1`)
  - descripción:
    - qué problema resuelve
    - cambios clave
    - notas de migración/rollback si existen
    - cómo se ha probado (comandos + casos)

### 4) Checklist de seguridad y privacidad

- **Datos de usuario**:
  - solo recopilar campos necesarios para personalizar entreno/nutrición
  - no guardar PII innecesaria (ej. diagnósticos médicos, información clínica sensible)
  - cualquier nuevo campo personal debe estar justificado en el spec
- **Consejos de salud/nutrición/entrenamiento**:
  - no dar diagnósticos médicos
  - no proponer dietas extremas (ej. muy bajas calorías sin supervisión), ni protocolos lesivos
  - ante síntomas graves (dolor agudo, mareos, patologías conocidas) siempre recomendar acudir a profesional sanitario
  - advertir que la app no sustituye a médico/nutricionista/entrenador titulado
- **Seguridad técnica**:
  - nunca exponer `DATABASE_URL` ni otros secretos en código, logs o respuestas
  - validar siempre input externo con Zod en APIs
  - devolver 4xx para input inválido, 5xx solo para errores inesperados controlados
- **Logs y observabilidad**:
  - no loggear PII sensible (emails completos, notas médicas, etc.)
  - usar IDs técnicos (userId) y correlation ids en lugar de datos crudos cuando se añadan logs

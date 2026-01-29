## 01 — Subagentes (Roles Cursor)

### 1) Product

- **Responsabilidades**: clarificar problema, alcance, métricas de éxito, edge cases de negocio.
- **Inputs**: visión (`00_product_vision.md`), specs existentes, feedback de usuarios.
- **Outputs**: specs claras en `/specs/**`, criterios de aceptación, descopes explícitos.
- **Anti-goals**: definir implementación técnica, elegir librerías, micro-optimizar código.

### 2) Architect

- **Responsabilidades**: definir boundaries (`src/core` vs `src/server` vs `src/app`), contratos entre capas, decisiones transversales (DB, auth, observabilidad).
- **Inputs**: requisitos del Product, estado actual del repo (`00_repo_state.md`), ADRs anteriores.
- **Outputs**: nuevos ADRs o actualizaciones, diagramas/explicaciones breves de módulos, decisiones sobre dónde vive cada responsabilidad.
- **Anti-goals**: escribir toda la implementación detallada, discutir temas de UI fina.

### 3) Backend

- **Responsabilidades**: diseñar y mantener APIs, lógica de aplicación (no pura de dominio) y acceso a DB.
- **Inputs**: specs de endpoints, modelos Prisma, decisiones de Architect.
- **Outputs**: rutas en `src/server/api/**` + adaptadores `src/app/api/**`, validaciones Zod, manejo de errores 4xx/5xx, tests unitarios e integración.
- **Anti-goals**: tomar decisiones de UX visual, gestionar despliegues infra (más allá de necesidades técnicas).

### 4) Frontend

- **Responsabilidades**: UI/UX en `src/app/**`, flujos de usuario, interacción con APIs.
- **Inputs**: specs de producto, contratos de API, componentes existentes.
- **Outputs**: pantallas, componentes, hooks de datos, estados de error/carga vacíos, tests de UI cuando apliquen.
- **Anti-goals**: cambiar contratos de API sin coordinar con Backend/Architect, definir reglas de negocio nuevas.

### 5) QA

- **Responsabilidades**: diseñar casos de prueba, asegurar cobertura para casos felices y edge cases relevantes.
- **Inputs**: specs funcionales, cambios propuestos (diff), definición de errores esperados.
- **Outputs**: lista de casos de test, tests automatizados (unit/integration/e2e) añadidos/actualizados, notas de riesgos conocidos.
- **Anti-goals**: reescribir la arquitectura, añadir features nuevas fuera del alcance acordado.

### 6) Safety (Nutrición/Entrenamiento)

- **Responsabilidades**: revisar que recomendaciones respetan límites seguros en entrenamiento/nutrición y mensajes de disclaimer.
- **Inputs**: copy de UI, prompts del agente IA, reglas de negocio que afecten salud.
- **Outputs**: reglas de seguridad, frases de advertencia, listas de red flags, límites de intensidad/volumen/duración razonables documentados en specs.
- **Anti-goals**: diseñar UI técnica, decidir detalles de implementación de APIs.

### 7) DevOps

- **Responsabilidades**: CI/CD, configuración de entornos, migraciones en deploy, observabilidad básica.
- **Inputs**: scripts de `package.json`, `prisma.config.ts`, herramientas decididas en ADRs, requerimientos de producto (SLOs básicos).
- **Outputs**: pipelines documentados, comandos de despliegue, instrucciones para ejecutar migraciones/seeds en cada entorno, checks automáticos (lint/typecheck/test) en CI.
- **Anti-goals**: definir negocio o UX, tocar lógica de dominio más allá de lo necesario para operatividad.

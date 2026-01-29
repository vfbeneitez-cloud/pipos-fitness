## 03 — Hooks / Protocolos de trabajo

### 1) Pre-code hook

- Confirmar:
  - existe spec relevante en `/specs/**` y está actualizado
  - el cambio cabe en un PR pequeño (si no, trocear)
  - riesgos principales identificados (datos, seguridad, migraciones)
- Si falta spec o riesgos, primero usar `/spec` + `/plan`.

### 2) Pre-commit hook (mental / automatizable)

- Antes de commitear:
  - `npm run lint`
  - `npm run typecheck`
  - `npm test` (o subset relevante si es muy grande, documentando qué se ejecutó)
  - formatear (`npm run format` o equivalente en el editor)
- Verificar:
  - sin warnings graves nuevos
  - sin TODO/FIXME que bloqueen funcionalidad

### 3) Pre-PR hook

- Revisar Definition of Done:
  - spec actualizado
  - tests añadidos/ajustados
  - errores bien tipados (4xx vs 5xx)
- Revisar impacto:
  - cambios en contratos públicos de API documentados en el PR
  - si hay cambios de arquitectura, `/adr` actualizado
- Revisar seguridad:
  - sin secretos en código, tests o fixtures
  - sin logs con PII
  - recomendaciones de salud de la UI o del agente IA siguen las reglas de Safety

### 4) Post-merge hook

- **Migraciones / DB**:
  - aplicar migraciones necesarias (según entorno):
    - dev: `npx prisma migrate dev`
    - staging/prod: `npx prisma migrate deploy`
  - ejecutar seed si está previsto para ese entorno (con cuidado en prod)
- **Changelog / comunicación**:
  - actualizar changelog si el cambio es visible para usuario o partner
  - comunicar pasos manuales si existen (flags, scripts de limpieza)
- **Verificación post-deploy**:
  - smoke tests básicos (endpoint health + happy paths clave)
  - monitorizar errores y métricas durante la ventana de verificación pactada

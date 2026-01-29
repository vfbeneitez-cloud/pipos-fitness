# Sprint 1 — Resumen de Implementación

## ✅ Completado

### 1) Endpoints API implementados

- ✅ `GET /api/exercises` — listado con filtros (environment, q) + include media
- ✅ `GET /api/weekly-plan` — lectura de plan semanal (devuelve null si no existe)
- ✅ `POST /api/weekly-plan` — creación/actualización de plan semanal
- ✅ `POST /api/nutrition/swap` — swap de comidas con respeto a restricciones
- ✅ `POST /api/training/log` — registro rápido de sesión de entrenamiento
- ✅ `POST /api/nutrition/log` — registro rápido de cumplimiento nutricional

### 2) Validación y errores

- ✅ Validación con Zod en todos los endpoints
- ✅ Formato de error estándar: `{ error: "CODE", details?: any }`
- ✅ 4xx para input inválido o recursos no encontrados
- ✅ 5xx solo para errores inesperados
- ✅ Manejo de `INVALID_JSON` en adaptadores HTTP

### 3) Tests de integración

- ✅ Tests para `GET /api/exercises` (happy path, filtros, errores)
- ✅ Tests para `GET/POST /api/weekly-plan` (creación, lectura, null, errores)
- ✅ Tests para `POST /api/nutrition/swap` (swap exitoso, errores)
- ✅ Tests para `POST /api/training/log` (creación, con planId, errores)
- ✅ Tests para `POST /api/nutrition/log` (creación, errores)
- ✅ Total: 23 tests pasando

### 4) Seed de base de datos

- ✅ Expandido a 12 ejercicios (mínimo requerido: 10)
- ✅ Variedad de entornos: GYM (5), CALISTHENICS (3), HOME (3), POOL (2)
- ✅ Cada ejercicio incluye media (video o imagen placeholder)

### 5) Calidad de código

- ✅ `npm run lint` — sin errores
- ✅ `npm run typecheck` — sin errores
- ✅ `npm test` — todos los tests pasando

### 6) Arquitectura

- ✅ Separación clara: `src/server/api/**` (handlers puros) + `src/app/api/**` (adaptadores HTTP)
- ✅ Core domain sin dependencias de Next: `src/core/**`
- ✅ Prisma v7 + Neon adapter según ADR-0002

## 📋 Pendiente para Sprint 2 (UI)

### 1) Pantallas MVP

- [ ] Onboarding de perfil (objetivo, nivel, entorno, nutrición)
- [ ] Vista de semana actual (plan entrenamiento + menú)
- [ ] Detalle de sesión de entrenamiento
- [ ] Detalle de ejercicio (guía visual)
- [ ] Vista de menú diario + swap comida
- [ ] Log rápido (entreno/comida)

### 2) Navegación y estados

- [ ] Navegación principal (tabs o bottom nav)
- [ ] Estados vacíos (sin plan, sin ejercicios, etc.)
- [ ] Estados de carga y error en UI

### 3) Integración con APIs

- [ ] Llamadas a endpoints desde componentes React
- [ ] Manejo de errores en UI (mostrar mensajes claros)
- [ ] Optimistic updates donde aplique

### 4) Agente IA (MVP básico)

- [ ] Endpoint/componente de chat
- [ ] Integración con herramientas internas (explicar ejercicios, swaps)
- [ ] Guardrails de seguridad según ADR-0005

### 5) Auth (si se decide en Sprint 2)

- [ ] Decisión de provider (ADR)
- [ ] Implementación de auth
- [ ] Protección de endpoints (middleware)

## 🔧 Comandos útiles

```bash
# Desarrollo
npm run dev

# Calidad
npm run lint
npm run typecheck
npm test

# DB
npx prisma migrate dev
npx prisma db seed
npx prisma studio
```

## 📝 Notas técnicas

- Todos los endpoints siguen el spec `/specs/03_api_contracts.md`
- Errores siguen formato estándar según ADR-0003
- Tests usan Vitest con Prisma real (no mocks)
- Seed puede ejecutarse múltiples veces (upsert por slug)

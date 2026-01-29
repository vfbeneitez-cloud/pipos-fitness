# 06 — Manual QA Checklist (Sprint 2 UI)

## Pre-requisitos

- [ ] `npm run lint` y `npm run typecheck` y `npm test` pasan.
- [ ] Base de datos con seed ejecutado (`npx prisma db seed`).
- [ ] App en marcha (`npm run dev`).

## Demo mode

- [ ] Sin userId en localStorage: al ir a `/` o `/week` se redirige a `/onboarding`.
- [ ] Tras completar onboarding, se guarda userId y se redirige a `/week`.
- [ ] Recargar `/week` mantiene la sesión (no vuelve a onboarding).

## Onboarding (`/onboarding`)

- [ ] Paso 1: Bienvenida → "Empezar" lleva a paso 2.
- [ ] Paso 2: Entrenamiento (objetivo, nivel, días, minutos, entorno) → "Siguiente" / "Atrás".
- [ ] Paso 3: Nutrición (comidas/día, tiempo cocina, estilo, alergias, dislikes) → "Siguiente" / "Atrás".
- [ ] Paso 4: Resumen → "Crear mi primera semana" crea plan y redirige a `/week`.
- [ ] Si hay error de red: se muestra mensaje y opción "Reintentar".

## Semana actual (`/week`)

- [ ] Se carga el plan de la semana actual (GET /api/weekly-plan).
- [ ] Se muestran sesiones de entrenamiento con enlace a `/session/[dayIndex]`.
- [ ] Se muestra menú de hoy con comidas y botón "Cambiar" por comida.
- [ ] CTAs "Ver sesión de hoy", "Log entrenamiento", "Log comida" funcionan.
- [ ] Estado vacío: si no hay plan, se muestra "Generar plan" (link a onboarding).

## Detalle de sesión (`/session/[dayIndex]`)

- [ ] Se muestra día y nombre de la sesión.
- [ ] Lista de ejercicios con enlace a `/exercise/[slug]`.
- [ ] "Marcar sesión como hecha" lleva a `/log/training`.
- [ ] Si no hay sesión ese día: mensaje "Día libre..." + "Ver semana".

## Detalle de ejercicio (`/exercise/[slug]`)

- [ ] Se muestra nombre, entorno, músculos.
- [ ] Media: video con `<video>` o imagen con `<img>` (o placeholder si falta).
- [ ] Secciones: descripción, puntos clave, errores comunes, regresiones/progresiones.
- [ ] "Volver a la sesión" / "Volver a la semana" funcionan.

## Swap comida

- [ ] En `/week`, al pulsar "Cambiar" en una comida se abre modal.
- [ ] Se llama POST /api/nutrition/swap y se muestra alternativa (título, minutos).
- [ ] "Cerrar" cierra el modal.

## Log entrenamiento (`/log/training`)

- [ ] Formulario: nombre sesión (opcional), hecho, dificultad (easy/ok/hard), dolor, notas.
- [ ] "Guardar" llama POST /api/training/log y redirige a `/week`.
- [ ] "Cancelar" vuelve a `/week`.
- [ ] Completar en < 60 s (flujo corto).

## Log comida (`/log/nutrition`)

- [ ] Formulario: comida (opcional), realizado según plan, hambre (low/ok/high), notas.
- [ ] "Guardar" llama POST /api/nutrition/log y redirige a `/week`.
- [ ] "Cancelar" vuelve a `/week`.
- [ ] Completar en < 60 s (flujo corto).

## Navegación

- [ ] Bottom nav: "Semana" (/week), "Perfil" (/onboarding).
- [ ] En todas las pantallas con contenido hay forma de volver (breadcrumb o link).

## Loading y errores

- [ ] Al cargar plan en `/week` se muestra skeleton o indicador de carga.
- [ ] Si falla la carga: banner de error con "Reintentar".
- [ ] Formularios muestran error si la API devuelve 4xx.

## Accesibilidad básica

- [ ] Labels asociados a inputs (for/id).
- [ ] Encabezados jerárquicos (h1, h2).
- [ ] Botones y enlaces con texto claro.
- [ ] Navegación por teclado (tab, enter).

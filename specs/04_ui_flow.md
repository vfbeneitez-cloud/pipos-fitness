## 04 — UI Flow (MVP)

### 1) Onboarding de perfil

- **Objetivo**: recoger datos mínimos para generar primer plan semanal.
- **Pantalla 1 — Bienvenida**
  - Mensaje breve: qué hace la app (entrenamiento + nutrición + guía visual).
  - CTA “Empezar”.
- **Pantalla 2 — Objetivo y nivel**
  - Campos: objetivo (p.ej. “mejorar salud”, “ganar músculo”, “perder grasa”), nivel (principiante/intermedio/avanzado).
  - Validación simple (no vacío).
- **Pantalla 3 — Disponibilidad y entorno**
  - Campos: días/semana, duración sesión, entorno(s) (gym/casa/calis/piscina/mixto), equipo disponible (texto libre opcional).
- **Pantalla 4 — Nutrición**
  - Campos: preferencias (omniv/veg/other texto), alergias, dislikes, tiempo para cocinar (10/20/40 min/flexible), nº comidas/día.
- **Pantalla 5 — Resumen y crear plan**
  - Muestra resumen del perfil.
  - Botón “Crear mi primera semana” → llama a `/api/weekly-plan`.
- **States vacíos / errores**
  - Si error de red o validación, mostrar mensaje simple y opción “Reintentar”.

### 2) Semana actual (home)

- **Objetivo**: vista única desde donde acceder a entrenamiento + menú + acciones rápidas.
- **Layout**
  - Selector simple de semana (por defecto semana actual).
  - Sección “Entrenamiento”:
    - lista de días (L–D) con estado: sin sesión / sesión planificada / hecha.
  - Sección “Nutrición”:
    - para cada día, resumen de comidas (ej. “3 comidas planificadas”).
- **Acciones rápidas**
  - Botón “Ver sesión de hoy”.
  - Botón “Ver menú de hoy”.
  - Botón “Regenerar plan” (si perfil cambia).
- **Estados vacíos**
  - Si no hay plan: CTA “Crear semana ahora” (reutiliza `/api/weekly-plan`).

### 3) Detalle de sesión de entrenamiento

- **Contenido**
  - Día y nombre de la sesión (ej. “Sesión 1 — Fuerza tren inferior”).
  - Lista de ejercicios:
    - nombre, series x reps, descanso, pequeños cues.
    - botón o área “Ver guía” que abre detalle del ejercicio.
- **Acciones**
  - Botón “Marcar sesión como hecha/no hecha” → `POST /api/training/log`.
  - Selector simple de dificultad (easy/ok/hard).
  - Toggle dolor sí/no + nota opcional.
- **Estado vacío**
  - Si no hay sesión ese día, mostrar mensaje “Día libre o recuperación activa” + CTA “Ver semana”.

### 4) Detalle de ejercicio (guía visual)

- **Contenido**
  - Nombre, entorno, músculos principales.
  - Texto de setup y ejecución paso a paso.
  - Cues clave.
  - Errores comunes y cómo evitarlos.
  - Sección de regresiones/progresiones.
  - Media embebida (video o imagen) con placeholder si falta.
- **Acciones**
  - Botón “Volver a la sesión”.

### 5) Vista de menú diario + swap comida

- **Contenido**
  - Día seleccionado.
  - Lista de comidas en orden (desayuno/comida/cena/snacks).
  - Para cada comida:
    - título, tiempo estimado, breve descripción, etiquetas (rápido/vegetariano/etc.).
    - acción “Ver detalles” (opcional en MVP).
    - acción “Cambiar” (swap).
- **Swap**
  - Al pulsar “Cambiar”:
    - abre modal simple con 1–3 alternativas propuestas (resultado de `POST /api/nutrition/swap`).
    - usuario elige una y se aplica en vista (aunque la persistencia detallada puede ser v2).

### 6) Log rápido (entreno/comida)

- **Entreno**
  - Desde detalle de sesión:
    - checkbox “Hecho”,
    - selector de dificultad (3 estados),
    - toggle dolor (sí/no) + campo texto opcional.
  - Al guardar → llama `POST /api/training/log`.
- **Comida**
  - Desde menú diario:
    - toggle “Comida realizada según plan” (sí/no),
    - selector hambre (low/ok/high),
    - campo notas opcional.
  - Al guardar → llama `POST /api/nutrition/log`.

### 7) Navegación

- Modelo simple tipo tabs o bottom nav:
  - `Semana` (home `/week` — semana actual).
  - `Perfil` (`/onboarding` — editar datos y regenerar plan).
  - `Más` (acceso a ajustes, info legal) — pendiente post-MVP.
- El agente IA puede ser accesible desde botón flotante o sección en `Semana` (pendiente).

### 8) Demo mode (Sprint 2)

- Sin auth: `userId` demo se obtiene vía `GET /api/demo/session` y se guarda en `localStorage` (`pipos_demo_user_id`).
- Onboarding llama `POST /api/demo/setup` con datos de perfil y luego `POST /api/weekly-plan`.
- Si no hay userId en localStorage al acceder a rutas protegidas → redirect a `/onboarding`.
- Raíz `/` redirige a `/week`.

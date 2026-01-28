# 01 — MVP Scope (Épicas + Criterios de Aceptación)

## Objetivo del MVP
Entregar una app lista para producción que genere **planes semanales dinámicos** de **entrenamiento + nutrición** y ofrezca **guía visual (video/imagen)** para uso correcto de máquinas/material, con un **agente IA** seguro y útil.

## Principios del MVP
- Fricción mínima: onboarding y registro rápidos.
- Seguridad primero: técnica + red flags.
- Planes semanales dinámicos: se ajustan cada semana.
- “Boring tech” y calidad producción: tests, observabilidad, seguridad.

---

# Épica E1 — Onboarding & Perfil (Entrenamiento + Nutrición)
## Alcance
- Capturar información mínima para personalizar entreno y nutrición.
- Permitir cambios posteriores (preferencias/limitaciones).

## Requisitos
- Perfil entrenamiento: objetivo, nivel, días/semana, duración sesión, entorno(s) (gym/casa/calis/piscina/mixto), equipo disponible, historial de lesiones/limitaciones (opcional).
- Perfil nutrición: objetivo, preferencias (veg/omniv), alergias, gustos/aversión, tiempo para cocinar (p.ej. 10/20/40 min), número de comidas/día, horarios.

## Criterios de aceptación (AC)
- AC1: Un usuario nuevo completa onboarding en < 3 min y obtiene plan semanal.
- AC2: El usuario puede editar preferencias y ver reflejado el cambio en el próximo plan semanal.
- AC3: Validación de inputs (no valores imposibles; errores claros).

## Tests
- Unit: validaciones de esquema.
- E2E: onboarding -> plan generado.

---

# Épica E2 — Plan Semanal de Entrenamiento (multimodal)
## Alcance
- Generar un plan semanal con sesiones por día.
- Soportar gym, casa, calistenia, piscina o mezcla.
- Progresión básica y alternativas.

## Requisitos
- Cada sesión incluye: calentamiento breve, ejercicios principales, series/reps/descanso, RPE o intensidad, notas técnicas.
- Alternativas por entorno: si el usuario marca “mixto”, proponer variantes según material disponible.
- Reglas de seguridad: progresión gradual; evitar saltos bruscos.

## Criterios de aceptación (AC)
- AC1: El plan semanal muestra 1 semana completa con sesiones asignadas a días.
- AC2: Cambiar el entorno (p.ej. gym -> casa) regenera el plan con alternativas coherentes.
- AC3: Para principiantes, el plan prioriza técnica y volumen moderado.
- AC4: Plan incluye “qué hacer si no puedo ir” (fallback por sesión).

## Tests
- Unit: generador de plan (inputs -> estructura válida).
- Integration: persistencia de plan y lectura.
- E2E: ver plan, cambiar entorno, plan actualizado.

---

# Épica E3 — Guía Visual de Ejercicios y Máquinas (video/imagen)
## Alcance
- Biblioteca de ejercicios/máquinas con media (video/imagen).
- Acceso contextual desde el plan.

## Requisitos
- Ficha por ejercicio/máquina:
  - nombre, músculo(s), setup, ejecución paso a paso
  - cues de técnica
  - errores comunes
  - regresiones/progresiones
  - **media** (video o imagen)
- Desde el plan: tocar un ejercicio abre su ficha.
- Contenido curado (no generado sin revisión si no hay dataset fiable).

## Criterios de aceptación (AC)
- AC1: Desde cualquier ejercicio del plan se abre su guía visual en < 2 taps.
- AC2: Cada guía tiene al menos 1 recurso visual (video o imagen).
- AC3: La guía incluye sección “errores comunes” y “seguridad”.
- AC4: Si falta media, se muestra fallback (instrucción + placeholder) y se marca como pendiente.

## Tests
- Unit: mapeo ejercicio->media.
- E2E: navegar plan -> abrir guía -> reproducir/visualizar.

---

# Épica E4 — Registro de Entrenamiento (Tracking)
## Alcance
- Registrar sesiones realizadas y feedback.
- Soportar modo simple y modo detallado.

## Requisitos
- Registro rápido: “hecho/no hecho”, percepción (fácil/ok/difícil), dolor (sí/no + zona opcional).
- Registro detallado (opcional): series/reps/peso/RPE.
- Guardar historial por semana.

## Criterios de aceptación (AC)
- AC1: Registrar una sesión lleva < 60 segundos en modo rápido.
- AC2: El usuario puede ver historial semanal y adherencia.
- AC3: Feedback de dolor/fatiga afecta al ajuste semanal (ver E6).

## Tests
- Integration: escritura/lectura DB.
- E2E: completar sesión -> aparece en historial.

---

# Épica E5 — Plan Semanal de Nutrición (menús dinámicos)
## Alcance
- Menús semanales por día/comida según gustos y tiempo para cocinar.
- Sustituciones y opciones rápidas.

## Requisitos
- Menú por día: desayuno/comida/cena (y snacks opcionales).
- Cada comida incluye: descripción, ingredientes básicos, tiempo estimado, alternativa rápida.
- Soportar restricciones (alergias, vegetariano, etc).
- Objetivo: calorías/macros (aprox) + flexibilidad.

## Criterios de aceptación (AC)
- AC1: Usuario ve un menú semanal completo alineado con preferencias.
- AC2: Usuario puede pedir “más rápido” y se ajusta con recetas < X min.
- AC3: Usuario puede sustituir una comida por otra equivalente.
- AC4: Alergias/restricciones se respetan (nunca sugiere ingrediente prohibido).

## Tests
- Unit: filtros por restricciones.
- E2E: cambiar tiempo de cocina -> menús actualizados.

---

# Épica E6 — Ajuste Semanal Dinámico (motor de adaptación)
## Alcance
- Cada semana se recalcula entrenamiento y nutrición con reglas claras.
- Mantener cambios dentro de límites seguros.

## Requisitos
- Inputs: adherencia, progreso (peso/medidas opcional), rendimiento entreno, feedback (fatiga/hambre), eventos red flag.
- Outputs: plan siguiente semana (entreno + menú) y explicación breve de cambios.
- Controles: “mantener”, “ajuste suave”, “ajuste moderado” (con límites).

## Criterios de aceptación (AC)
- AC1: Al cerrar la semana, el sistema genera propuesta de semana siguiente.
- AC2: Si adherencia baja, el sistema reduce complejidad (menos ejercicios/recetas más simples).
- AC3: Si dolor/lesión reportada, reduce intensidad y recomienda acciones seguras.
- AC4: Cambios nunca exceden límites definidos (p.ej. volumen/calorías).

## Tests
- Unit: reglas de ajuste (casos límite).
- Integration: cierre de semana -> nuevo plan persistido.

---

# Épica E7 — Agente IA (chat + acciones)
## Alcance
- Chat que responde dudas y ejecuta acciones: crear/ajustar plan, explicar ejercicios, proponer sustituciones.
- Guardrails de seguridad.

## Requisitos
- El agente puede:
  - explicar ejercicios/máquinas (con guía visual)
  - ajustar plan semanal
  - sugerir sustituciones de comidas
  - resolver dudas de “qué hago hoy”
- Seguridad:
  - no diagnóstico médico
  - red flags -> recomendar profesional
  - nunca sugerir extremos (dietas peligrosas, etc.)
- Antihallucination:
  - si no sabe, lo dice
  - usa KB curada cuando sea necesario

## Criterios de aceptación (AC)
- AC1: El chat puede “Actualizar mi plan para entrenar en casa esta semana” y lo ejecuta.
- AC2: El chat puede “No tengo tiempo para cocinar” y ajusta menú a comidas rápidas.
- AC3: Ante dolor agudo o síntomas, activa protocolo red flags.
- AC4: Todas las acciones del agente quedan auditadas (quién/cuándo/qué cambió).

## Tests
- Prompt regression: casos predefinidos.
- Integration: tool calling (mock).
- Security: rate limit y abuso.

---

# Épica E8 — Cuenta, Seguridad, Privacidad (mínimo producción)
## Alcance
- Auth y control de acceso.
- Gestión de datos y privacidad.

## Requisitos
- Registro/login (email o proveedor).
- Autorización por usuario (nadie ve datos ajenos).
- Rate limiting endpoints IA.
- Exportar/borrar cuenta (puede ser “v1” simple pero planificado).

## Criterios de aceptación (AC)
- AC1: Un usuario no puede acceder a datos de otro (tests incluidos).
- AC2: Secrets fuera del repo; configuración por env.
- AC3: Logs sin PII sensible.

## Tests
- Integration: authz.
- Security: pruebas básicas OWASP (inyección, auth).

---

# Épica E9 — Observabilidad & Operación (SRE básico)
## Alcance
- Errores, logs, métricas clave y alertas mínimas.

## Requisitos
- Error tracking (Sentry o similar).
- Logs estructurados con correlation id.
- Métricas: latencia API, errores 4xx/5xx, tasa de generación de planes, DAU/WAU básico.
- Runbook mínimo + checklist de despliegue.

## Criterios de aceptación (AC)
- AC1: Si falla generación del plan, queda error trazable con contexto (sin PII).
- AC2: Dashboard básico para salud del sistema.
- AC3: Alertas mínimas por picos de error/latencia.

## Tests
- Smoke test post-deploy.
- Synthetic check (endpoint health).

---

# Backlog inicial (orden sugerido)
1) E1 Onboarding & Perfil
2) E2 Plan Entrenamiento
3) E3 Guía Visual
4) E5 Plan Nutrición
5) E4 Registro (rápido)
6) E6 Ajuste semanal
7) E7 Agente IA (acciones)
8) E8 Seguridad/Privacidad hardening
9) E9 Observabilidad y runbooks

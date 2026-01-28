# 00 — Product Vision (Entrenamiento + Nutrición + Guía de Máquinas con Agente IA)

## 1) Resumen (1 párrafo)
Esta app sustituye (hasta donde es seguro y razonable) la experiencia de un **entrenador personal** y un **nutricionista**, añadiendo una capa clave: **aprendizaje visual** para usar correctamente máquinas y material del gimnasio mediante **videos y/o imágenes**, reduciendo el riesgo de lesión. El usuario recibe **planes semanales dinámicos** de entrenamiento y nutrición que se ajustan automáticamente según progreso, adherencia y feedback.

## 2) Problema que resuelve
- Muchas personas necesitan entrenamiento y nutrición coordinados, pero no pueden pagar o mantener un servicio 1:1.
- Falta guía práctica para usar máquinas/materia del gimnasio: técnica incorrecta → lesiones o malos resultados.
- Los planes estáticos no funcionan: la vida cambia y el progreso requiere ajustes semanales.
- Personalización real requiere considerar gustos, tiempo, equipo disponible, preferencias y limitaciones.

## 3) Para quién (ICP / usuarios objetivo)
### Persona A — “Principiante / vuelto al gym”
- No domina máquinas ni técnica.
- Necesita instrucciones visuales y progresión segura.
- Busca constancia, perder grasa o mejorar salud.

### Persona B — “Intermedio/a con objetivos”
- Quiere un plan estructurado, adaptable, y nutrición alineada.
- Necesita variedad de entornos: gimnasio/casa/calis/piscina o combinaciones.
- Quiere medir progreso y ajustar sin complicación.

## 4) Propuesta de valor (qué nos hace diferentes)
- Un solo agente coordina **entrenamiento + nutrición** (priorización coherente).
- **Guía visual** (videos/imagenes) por ejercicio/máquina para técnica y seguridad.
- Entrenamiento **multimodal**: gimnasio, casa, calistenia, piscina, o mezcla.
- Planes **semanales** que se recalculan según progreso y adherencia (app dinámica).

## 5) Promesa del producto (outcomes medibles)
- Aumentar adherencia semanal a entrenamiento y nutrición.
- Reducir “incertidumbre” (qué hacer hoy / qué comer hoy).
- Mejorar técnica y seguridad (menos molestias/lesiones reportadas; mejor ejecución).
- Entregar progreso tangible (peso/medidas/rendimiento) con ajustes graduales.

## 6) Alcance MVP (primer release)
### Funcionalidades incluidas
**Entrenamiento**
- Onboarding: objetivo, nivel, disponibilidad semanal, equipo/entorno (gimnasio/casa/calis/piscina o mezcla), limitaciones/lesiones, preferencias.
- Plan semanal de entrenamiento (sesiones por día) con alternativas por entorno.
- Biblioteca de ejercicios/máquinas con:
  - instrucciones claras + puntos de técnica
  - **video/imagen** demostrativa
  - errores comunes + cues
  - variantes/regresiones
- Registro de entrenos: series/reps/peso/RPE (o simplificado si principiante).
- Ajuste semanal: volumen/intensidad/selección ejercicios según feedback y progresos.

**Nutrición**
- Onboarding nutricional: objetivo, preferencias, alergias, gustos/aversión, horarios, **tiempo para cocinar**, nivel cocina.
- Plan semanal nutricional con:
  - menús por día/comida
  - opciones rápidas (“15 min”, “meal prep”, “sin cocinar”)
  - sustituciones por gustos y disponibilidad
- Registro nutricional simple: selección de menú cumplido / desviación / hambre/saciedad.
- Ajuste semanal de calorías/macros y menús según progreso/adherencia.

**Agente IA**
- Chat para dudas, ajustes, explicaciones y educación práctica.
- Reglas de seguridad: evita recomendaciones extremas, detecta red flags y sugiere profesional cuando aplica.
- “Pregunta lo mínimo” y confirma datos clave antes de cambios grandes.

### Funcionalidades excluidas (por ahora)
- Diagnóstico/tratamiento médico; dietas clínicas sin supervisión.
- Planes para menores.
- Comunidad/social, gamificación compleja.
- Integraciones avanzadas (wearables) si retrasan el MVP.

## 7) Plan semanal dinámico (cómo funciona)
- Los planes son **semanales** (microciclos).
- Cada semana, el sistema revisa adherencia, feedback y progreso, y propone ajustes graduados.

## 8) Datos, privacidad y cumplimiento (high-level)
- Minimizar PII; recopilar solo lo necesario para personalización.
- Seguridad: cifrado en tránsito, control de acceso, secretos fuera del repo.

## 9) Qué significa “listo para producción”
- Tests, observabilidad, seguridad, migraciones y feature flags.

## 10) Métricas iniciales (MVP)
- Activación, adherencia, retención, uso de guía visual, seguridad.

## 11) Riesgos y supuestos
- Técnica mal interpretada → guía visual + cues + advertencias.
- Menús poco realistas → personalización por tiempo/gustos.

## ADR-0005 — Safety constraints para entrenamiento y nutrición

### Contexto

- La app genera recomendaciones de entrenamiento y nutrición y en el futuro tendrá un agente IA.
- Estos ámbitos tienen impacto directo en salud, por lo que necesitamos límites claros de seguridad y privacidad.

### Decisión

- **Sin diagnóstico médico**:
  - la app y el agente IA no deben presentar diagnósticos médicos ni tratamientos clínicos;
  - cualquier texto o flujo que pueda interpretarse como diagnóstico se evitará o reformulará.
- **Red flags**:
  - ante síntomas como dolor agudo, mareos, dificultad respiratoria, lesiones recientes, trastornos alimentarios conocidos o sospechados:
    - se debe recomendar explícitamente acudir a un profesional sanitario;
    - se evitarán cambios agresivos de entrenamiento o nutrición.
- **Límites de recomendaciones**:
  - no se sugerirán dietas extremas (e.g. muy bajas calorías prolongadas, protocolos de ayuno extremo) ni volúmenes de entrenamiento claramente desproporcionados para el nivel;
  - progresión y ajustes se harán siempre de forma gradual, especialmente para principiantes.
- **Privacidad / datos mínimos**:
  - solo se almacenan datos necesarios para personalizar entrenamiento y nutrición (edad aproximada, nivel, preferencias, alergias, etc.);
  - no se almacenan historiales médicos detallados ni diagnósticos clínicos;
  - cualquier nuevo campo sensible requiere justificación explícita en specs y revisión de privacidad.

### Alternativas consideradas

- **Sin reglas de safety explícitas (solo “sentido común”)**:
  - más rápido, pero demasiado riesgo e inconsistencia entre distintas partes del sistema.
- **Bloquear cualquier referencia a salud**:
  - seguro pero inservible para el objetivo del producto (entrenamiento/nutrición requieren referencias básicas a salud).

### Consecuencias

- Beneficios:
  - reduce riesgo de recomendaciones peligrosas o malinterpretadas;
  - ofrece marco claro para diseñar reglas del agente IA y mensajes de UI.
- Costes:
  - algunos casos de uso “avanzados” (protocolos extremos) no serán soportados;
  - necesidad de revisar copy y prompts para cumplir estas reglas.

### Cómo validar

- Revisar specs de nuevas features y prompts del agente IA confirmando:
  - que no prometen diagnóstico/tratamiento médico;
  - que ante red flags se recomienda contactar con profesional sanitario;
  - que no se proponen dietas/planes extremos sin contexto ni supervisión.
- Incluir tests (cuando aplique) para flujos de agente IA y reglas de negocio que comprueben respuestas seguras en casos límite.

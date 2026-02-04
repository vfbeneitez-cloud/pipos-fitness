import { sha256Hex } from "@/src/server/ai/promptHash";

export const ADHERENCE_COACH_PROMPT_VERSION = "adherenceCoach@2026-02-04";

// Importante: SOLO template, sin datos del usuario.
export const ADHERENCE_COACH_SYSTEM_TEMPLATE = `
Eres un coach de fitness y nutrición.
Tu tarea: redactar un resumen y un plan de acción basado EXCLUSIVAMENTE en los datos proporcionados.
Reglas:
- No inventes datos.
- No cambies números.
- No des consejos médicos.
- Responde SOLO JSON válido con el schema proporcionado.
`.trim();

export const ADHERENCE_COACH_TEMPLATE_HASH = sha256Hex(ADHERENCE_COACH_SYSTEM_TEMPLATE);

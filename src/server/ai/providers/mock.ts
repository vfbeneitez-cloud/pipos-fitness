import type { AIProvider, AgentMessage, AgentResponse } from "../provider";

/**
 * Mock provider determinista para desarrollo y tests. No requiere clave API.
 */
export class MockProvider implements AIProvider {
  async chat(messages: AgentMessage[], options?: { maxTokens?: number }): Promise<AgentResponse> {
    void options; // interface requires param; mock ignores
    const lastUser = messages.filter((m) => m.role === "user").pop();
    const content = lastUser?.content ?? "";

    const redFlag =
      content.includes("red flag") || content.includes("dolor agudo") || content.includes("mareos");

    const payload = redFlag
      ? {
          rationale:
            "Detecté señales que requieren atención profesional. Recomiendo consultar con un profesional sanitario antes de continuar.",
          adjustments: {
            daysPerWeek: 2,
            sessionMinutes: 30,
            environment: null,
            mealsPerDay: null,
            cookingTime: "MIN_10",
          },
        }
      : {
          rationale: "Ajustes aplicados según adherencia y perfil.",
          adjustments: {
            daysPerWeek: null,
            sessionMinutes: null,
            environment: null,
            mealsPerDay: null,
            cookingTime: null,
          },
        };

    return { content: JSON.stringify(payload) };
  }
}

import type { AIProvider, AgentMessage, AgentResponse } from "../provider";

/**
 * Mock provider determinista para desarrollo y tests. No requiere clave API.
 */
export class MockProvider implements AIProvider {
  async chat(messages: AgentMessage[]): Promise<AgentResponse> {
    const lastUser = messages.filter((m) => m.role === "user").pop();
    const content = lastUser?.content ?? "";

    if (
      content.includes("red flag") ||
      content.includes("dolor agudo") ||
      content.includes("mareos")
    ) {
      return {
        content:
          "Detecté señales que requieren atención profesional. Recomiendo consultar con un profesional sanitario antes de continuar. Mientras tanto, propongo ajustes conservadores: reducir días de entrenamiento y simplificar nutrición.",
      };
    }

    if (content.includes("baja adherencia") || content.includes("pocas sesiones")) {
      return {
        content:
          "Veo que la adherencia ha sido baja esta semana. Propongo reducir a 2 días por semana y simplificar las comidas para facilitar el cumplimiento.",
      };
    }

    return {
      content:
        "He revisado tu perfil y logs. Propongo mantener el plan actual con ajustes menores: mantener días por semana y ajustar ligeramente la nutrición según tus preferencias.",
    };
  }
}

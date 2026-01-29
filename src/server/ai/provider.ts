/**
 * Interface para providers de IA. Permite cambiar de proveedor sin cambiar la lógica del agente.
 */

export type AgentMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AgentResponse = {
  content: string;
};

export interface AIProvider {
  chat(messages: AgentMessage[]): Promise<AgentResponse>;
}

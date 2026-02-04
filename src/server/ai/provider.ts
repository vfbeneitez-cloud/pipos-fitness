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

export type ChatOptions = {
  maxTokens?: number;
};

export interface AIProvider {
  id: string;
  model?: string;
  chat(messages: AgentMessage[], options?: ChatOptions): Promise<AgentResponse>;
}

export interface IMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  source?: string;
} 
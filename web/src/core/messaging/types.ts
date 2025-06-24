import { type Workflow } from "../workflow";

export type MessageRole = "user" | "assistant";

interface GenericMessage<
  T extends string,
  C extends Record<string, unknown> | string | ContentItem[],
> {
  id: string;
  role: MessageRole;
  type: T;
  content: C;
}

export interface ContentItem {
  type: "text" | "image";
  text?: string;
  image_url?: string;
}

export interface TextMessage extends GenericMessage<"text", string> {}

export interface MultiModalMessage extends GenericMessage<"multimodal", ContentItem[]> {}

export interface WorkflowMessage
  extends GenericMessage<"workflow", { workflow: Workflow }> {}

export type Message = TextMessage | MultiModalMessage | WorkflowMessage;

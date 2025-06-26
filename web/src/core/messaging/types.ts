import { type Workflow } from "../workflow";

export type MessageRole = "user" | "assistant";

interface GenericMessage<
  T extends string,
  C extends Record<string, unknown> | string,
> {
  id: string;
  role: MessageRole;
  type: T;
  content: C;
}

export interface TextMessage extends GenericMessage<"text", string> {}

export interface WorkflowMessage
  extends GenericMessage<"workflow", { workflow: Workflow }> {}

export type Message = TextMessage | WorkflowMessage;

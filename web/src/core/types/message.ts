export interface BaseMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface UserMessage extends BaseMessage {
  type: 'user';
  role: 'user';
}

export interface AssistantMessage extends BaseMessage {
  type: 'assistant';
  role: 'assistant';
  toolCalls?: ToolCall[];
}

export interface SystemMessage extends BaseMessage {
  type: 'system';
  role: 'system';
}

export interface WorkflowMessage extends BaseMessage {
  type: 'workflow';
  role: 'assistant';
  workflow: Workflow;
}

export type Message = UserMessage | AssistantMessage | SystemMessage | WorkflowMessage;

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  result?: any;
}

export interface Workflow {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  steps: WorkflowStep[];
  createdAt: number;
  updatedAt: number;
}

export interface WorkflowStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  input?: any;
  output?: any;
  error?: string;
}

export type GenericMessage<T extends string, P = {}> = BaseMessage & {
  type: T;
} & P;
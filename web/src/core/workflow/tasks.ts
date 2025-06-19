interface GenericWorkflowTask<T extends string, P extends object> {
  id: string;
  type: T;
  state: "pending" | "success" | "error";
  payload: P;
}

export interface ToolCallTask<
  I extends object = object,
  O extends string = string,
> extends GenericWorkflowTask<
    "tool_call",
    {
      toolName: string;
      error?: string;
      input: I;
      output?: O;
    }
  > {}

export interface ThinkingTask
  extends GenericWorkflowTask<
    "thinking",
    {
      text?: string;
      reason?: string;
    }
  > {}

export type WorkflowTask = ToolCallTask | ThinkingTask;

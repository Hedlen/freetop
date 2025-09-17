import { create } from "zustand";

import { type ChatEvent, chatStream, abortTask } from "../api";
import { chatStream as mockChatStream } from "../api/mock";
import {
  type WorkflowMessage,
  type Message,
  type TextMessage,
  type MultiModalMessage,
} from "../messaging";
import { clone } from "../utils";
import { WorkflowEngine } from "../workflow";

interface Store {
  messages: Message[];
  responding: boolean;
  currentTaskId: string | null;
  state: {
    messages: Message[];
  };
}

export const useStore = create<Store>(() => ({
  messages: [],
  responding: false,
  currentTaskId: null,
  state: {
    messages: [],
  },
}));

export function addMessage(message: Message) {
  useStore.setState((state) => {
    // Check if a message with the same ID already exists
    const existingIndex = state.messages.findIndex((m) => m.id === message.id);
    if (existingIndex !== -1) {
      // If message exists, update it instead of adding a duplicate
      const updatedMessages = [...state.messages];
      updatedMessages[existingIndex] = { ...updatedMessages[existingIndex], ...message };
      return { messages: updatedMessages };
    }
    // If no duplicate, add the new message
    return { messages: [...state.messages, message] };
  });
  return message;
}

export function updateMessage(message: Partial<Message> & { id: string }) {
  useStore.setState((state) => {
    const index = state.messages.findIndex((m) => m.id === message.id);
    if (index === -1) {
      return state;
    }
    const newMessage = clone({
      ...state.messages[index],
      ...message,
    } as Message);
    return {
      messages: [
        ...state.messages.slice(0, index),
        newMessage,
        ...state.messages.slice(index + 1),
      ],
    };
  });
}

export async function sendMessage(
  message: Message,
  params: {
    deepThinkingMode: boolean;
    searchBeforePlanning: boolean;
  },
  options: { abortSignal?: AbortSignal } = {},
) {
  addMessage(message);
  let stream: AsyncIterable<ChatEvent & { taskId?: string }>;
  if (typeof window !== 'undefined' && window.location.search.includes("mock")) {
    stream = mockChatStream(message);
  } else {
    stream = chatStream(message, useStore.getState().state, params, options);
  }
  setResponding(true);

  let textMessage: TextMessage | null = null;
  try {
    for await (const event of stream) {
      // 捕获任务ID
      if (event.taskId) {
        useStore.setState({ currentTaskId: event.taskId });
      }
      
      switch (event.type) {
        case "start_of_agent":
          textMessage = {
            id: event.data.agent_id,
            role: "assistant",
            type: "text",
            content: "",
          };
          addMessage(textMessage);
          break;
        case "message":
          if (textMessage) {
            textMessage.content += event.data.delta.content;
            updateMessage({
              id: textMessage.id,
              content: textMessage.content,
            });
          }
          break;
        case "end_of_agent":
          textMessage = null;
          break;
        case "start_of_workflow":
          console.log("Received start_of_workflow event:", event);
          const workflowEngine = new WorkflowEngine();
          const workflow = workflowEngine.start(event);
          const workflowMessage: WorkflowMessage = {
            id: event.data.workflow_id,
            role: "assistant",
            type: "workflow",
            content: { workflow: workflow },
          };
          console.log("Created workflow message:", workflowMessage);
          addMessage(workflowMessage);
          for await (const updatedWorkflow of workflowEngine.run(stream)) {
            updateMessage({
              id: workflowMessage.id,
              content: { workflow: updatedWorkflow },
            });
          }
          // 不要覆盖整个messages数组，这会导致无限更新循环
          // _setState({
          //   messages: workflow.finalState?.messages ?? [],
          // });
          break;
        default:
          break;
      }
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      return;
    }
    throw e;
  } finally {
    setResponding(false);
    useStore.setState({ currentTaskId: null });
  }
  return message;
}

export function clearMessages() {
  useStore.setState({ messages: [] });
}

export function setResponding(responding: boolean) {
  useStore.setState({ responding });
}

export function _setState(state: {
  messages: Message[];
}) {
  // 修复：应该合并状态而不是嵌套
  useStore.setState({ state });
}

export async function abortCurrentTask(): Promise<boolean> {
  const currentTaskId = useStore.getState().currentTaskId;
  if (!currentTaskId) {
    return false;
  }
  
  try {
    await abortTask(currentTaskId);
    useStore.setState({ currentTaskId: null, responding: false });
    return true;
  } catch (error) {
    console.error('Failed to abort task:', error);
    return false;
  }
}

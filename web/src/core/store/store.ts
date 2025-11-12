import { create } from "zustand";

import { type ChatEvent, chatStream, abortTask } from "../api";
import { chatStream as mockChatStream } from "../api/mock";
import {
  type WorkflowMessage,
  type Message,
  type TextMessage
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

function generateUniqueId(prefix: string = "msg") {
  const used = new Set(useStore.getState().messages.map((m) => m.id));
  let candidate = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  while (used.has(candidate)) {
    candidate = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
  return candidate;
}

export function addMessage(message: Message) {
  useStore.setState((state) => {
    const msg = { ...message } as Message;
    if (!msg.id || String(msg.id).trim().length === 0) {
      msg.id = generateUniqueId(msg.role ?? "msg");
    }
    // Check if a message with the same ID already exists
    const existingIndex = state.messages.findIndex((m) => m.id === msg.id);
    if (existingIndex !== -1) {
      // If message exists, update it instead of adding a duplicate
      const updatedMessages = [...state.messages];
      updatedMessages[existingIndex] = { ...updatedMessages[existingIndex], ...msg };
      return { messages: updatedMessages };
    }
    // If no duplicate, add the new message
    return { messages: [...state.messages, msg] };
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
  let rafPending = false;
  const scheduleTextUpdate = () => {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      if (textMessage) {
        updateMessage({ id: textMessage.id, content: textMessage.content });
      }
      rafPending = false;
    });
  };

  const ensureUniqueId = (baseId: string | undefined) => {
    const used = new Set(useStore.getState().messages.map((m) => m.id));
    let candidate = String(baseId ?? `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
    if (!used.has(candidate)) return candidate;
    candidate = `${candidate}_${Math.random().toString(36).slice(2, 6)}`;
    return candidate;
  };

  const processStream = async (iter: AsyncIterable<ChatEvent & { taskId?: string }>) => {
    for await (const event of iter) {
      if (event.taskId) {
        useStore.setState({ currentTaskId: event.taskId });
      }
      switch (event.type) {
        case "start_of_agent":
          textMessage = {
            id: ensureUniqueId((event as any).data?.agent_id),
            role: "assistant",
            type: "text",
            content: "",
          };
          addMessage(textMessage);
          break;
        case "message": {
          const data = (event as any).data || {};
          const delta = data.delta || {};
          const piece = (delta.content ?? delta.reasoning_content ?? "");
          if (!textMessage) {
            textMessage = {
              id: ensureUniqueId(data.message_id),
              role: "assistant",
              type: "text",
              content: "",
            };
            addMessage(textMessage);
          }
          textMessage.content += piece;
          scheduleTextUpdate();
          break;
        }
          break;
        case "end_of_agent":
          if (textMessage) {
            updateMessage({ id: textMessage.id, content: textMessage.content });
          }
          textMessage = null;
          break;
        case "start_of_workflow": {
          const workflowEngine = new WorkflowEngine();
          const workflow = workflowEngine.start(event as any);
          const workflowMessage: WorkflowMessage = {
            id: (event as any).data.workflow_id,
            role: "assistant",
            type: "workflow",
            content: { workflow },
          };
          addMessage(workflowMessage);
          for await (const updatedWorkflow of workflowEngine.run(iter)) {
            updateMessage({ id: workflowMessage.id, content: { workflow: updatedWorkflow } });
          }
          break;
        }
        default:
          break;
      }
    }
  };

  let usedMockFallback = false;
  try {
    await processStream(stream);
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      return;
    }
    // 网络或服务不可用，回退使用 mock 流
    if (!usedMockFallback) {
      usedMockFallback = true;
      try {
        await processStream(mockChatStream(message));
      } catch (err) {
        throw err;
      }
    } else {
      throw e;
    }
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

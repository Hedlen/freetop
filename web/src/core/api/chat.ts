import { env } from "~/env";

import { type Message } from "../messaging";
import { fetchStream } from "../sse";

import { type ChatEvent } from "./types";

export function chatStream(
  userMessage: Message,
  state: { messages: { role: string; content: string | any[] }[] },
  params: { deepThinkingMode: boolean; searchBeforePlanning: boolean },
  options: { abortSignal?: AbortSignal } = {},
) {
  // 转换消息格式以适配后端API
  const convertedMessage = {
    role: userMessage.role,
    content: userMessage.type === 'multimodal' ? userMessage.content : userMessage.content,
  };
  
  return fetchStream<ChatEvent>(env.NEXT_PUBLIC_API_URL + "/chat/stream", {
    body: JSON.stringify({
      messages: [...state.messages, convertedMessage],
      deep_thinking_mode: params.deepThinkingMode,
      search_before_planning: params.searchBeforePlanning,
      debug:
        typeof window !== 'undefined' &&
        location.search.includes("debug") &&
        !location.search.includes("debug=false"),
    }),
    signal: options.abortSignal,
  });
}

export async function abortTask(taskId: string): Promise<{ status: string; message: string }> {
  const response = await fetch(env.NEXT_PUBLIC_API_URL + `/chat/abort/${taskId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to abort task: ${response.status}`);
  }
  
  return response.json();
}

export async function abortAllUserTasks(): Promise<{ status: string; message: string; aborted_tasks?: string[] }> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(env.NEXT_PUBLIC_API_URL + '/chat/abort-user-tasks', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to abort user tasks: ${response.status}`);
  }
  
  return response.json();
}

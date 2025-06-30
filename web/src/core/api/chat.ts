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

// 刷新Token
async function refreshToken(): Promise<boolean> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (!token) {
    return false;
  }

  try {
    const response = await fetch(env.NEXT_PUBLIC_API_URL + '/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('auth_token', data.token);
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error('Token refresh error:', error);
    return false;
  }
}

export async function abortAllUserTasks(): Promise<{ status: string; message: string; aborted_tasks?: string[] }> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (!token) {
    throw new Error('No authentication token found');
  }

  try {
    const response = await fetch(env.NEXT_PUBLIC_API_URL + '/chat/abort-user-tasks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      return response.json();
    } else if (response.status === 401) {
      const errorData = await response.json();
      if (errorData.detail?.includes('已过期')) {
        // Token过期，尝试刷新
        const refreshed = await refreshToken();
        if (refreshed) {
          // 刷新成功，重新调用
          return abortAllUserTasks();
        }
      }
      // Token无效或刷新失败
      localStorage.removeItem('auth_token');
      throw new Error('Authentication failed. Please login again.');
    } else {
      throw new Error(`Failed to abort user tasks: ${response.status}`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Authentication failed')) {
      throw error;
    }
    throw new Error(`Failed to abort user tasks: ${error}`);
  }
}

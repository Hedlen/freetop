import { env } from "~/env";

import { type Message } from "../messaging";
import { fetchStream } from "../sse";

import { type ChatEvent } from "./types";

export function chatStream(
  userMessage: Message,
  state: { messages: { role: string; content: string }[] },
  params: { deepThinkingMode: boolean; searchBeforePlanning: boolean },
  options: { abortSignal?: AbortSignal } = {},
) {
  return fetchStream<ChatEvent>(env.NEXT_PUBLIC_API_URL + "/chat/stream", {
    body: JSON.stringify({
      messages: [...state.messages, userMessage],
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

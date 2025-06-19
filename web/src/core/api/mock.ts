import { type Message } from "../messaging";
import { timeout } from "../utils";

import mock from "./mock-3.txt";
import { type ChatEvent } from "./types";

export async function* chatStream(
  userMessage: Message,
): AsyncIterable<ChatEvent> {
  for (const chunk of mock.split("\n\n")) {
    const lines = chunk.split("\n");
    let event: string | undefined;
    let data: string | undefined;
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        event = line.split("event: ")[1];
      } else if (line.startsWith("data: ")) {
        data = line.split("data: ")[1];
      }
    }
    if (event && data) {
      if (event === "message") {
        await timeout(0);
      } else {
        await timeout(0);
      }
      yield {
        type: event as ChatEvent["type"],
        data: JSON.parse(data) as ChatEvent["data"],
      } as ChatEvent;
    }
  }
}

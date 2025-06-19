import { type StreamEvent } from "./StreamEvent";

export async function* fetchStream<T extends StreamEvent>(
  url: string,
  init: RequestInit,
): AsyncIterable<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    },
    ...init,
  });
  if (response.status !== 200) {
    throw new Error(`Failed to fetch from ${url}: ${response.status}`);
  }
  // Read from response body, event by event. An event always ends with a '\n\n'.
  const reader = response.body
    ?.pipeThrough(new TextDecoderStream())
    .getReader();
  if (!reader) {
    throw new Error("Response body is not readable");
  }
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += value;
    while (true) {
      const index = buffer.indexOf("\n\n");
      if (index === -1) {
        break;
      }
      const chunk = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);
      const event = parseEvent<T>(chunk);
      if (event) {
        yield event;
      }
    }
  }
}

function parseEvent<T extends StreamEvent>(chunk: string) {
  let resultType = "message";
  let resultData: object | null = null;
  for (const line of chunk.split("\n")) {
    const pos = line.indexOf(": ");
    if (pos === -1) {
      continue;
    }
    const key = line.slice(0, pos);
    const value = line.slice(pos + 2);
    if (key === "event") {
      resultType = value;
    } else if (key === "data") {
      resultData = JSON.parse(value);
    }
  }
  if (resultType === "message" && resultData === null) {
    return undefined;
  }
  return {
    type: resultType,
    data: resultData,
  } as T;
}

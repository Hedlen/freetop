import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchStream } from '../fetch-stream';

// Helper to create a mock ReadableStream from SSE text
function createMockStream(sseText: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(sseText));
      controller.close();
    },
  });
}

// Helper to create a mock Response with SSE body
function createMockResponse(sseText: string, status = 200): Response {
  const stream = createMockStream(sseText);
  return new Response(stream, {
    status,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

describe('fetchStream', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('parses a simple SSE message event', async () => {
    const sseText = 'event: message\ndata: {"content":"hello"}\n\n';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createMockResponse(sseText)));

    const events: any[] = [];
    for await (const event of fetchStream('/api/test', {})) {
      events.push(event);
    }

    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe('message');
    expect(events[0]?.data).toEqual({ content: 'hello' });
  });

  it('parses multiple SSE events', async () => {
    const sseText = [
      'event: start_of_workflow\ndata: {"workflow_id":"wf1"}\n\n',
      'event: message\ndata: {"delta":{"content":"Hello"}}\n\n',
      'event: end_of_workflow\ndata: {"workflow_id":"wf1"}\n\n',
    ].join('');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createMockResponse(sseText)));

    const events: any[] = [];
    for await (const event of fetchStream('/api/test', {})) {
      events.push(event);
    }

    expect(events).toHaveLength(3);
    expect(events[0]?.type).toBe('start_of_workflow');
    expect(events[1]?.type).toBe('message');
    expect(events[2]?.type).toBe('end_of_workflow');
  });

  it('captures taskId from task_started event and attaches to subsequent events', async () => {
    const sseText = [
      'event: task_started\ndata: {"task_id":"task-123"}\n\n',
      'event: message\ndata: {"delta":{"content":"Hi"}}\n\n',
    ].join('');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createMockResponse(sseText)));

    const events: any[] = [];
    for await (const event of fetchStream('/api/test', {})) {
      events.push(event);
    }

    // task_started is consumed (not yielded), message event gets taskId attached
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe('message');
    expect(events[0]?.taskId).toBe('task-123');
  });

  it('does not yield task_started event itself', async () => {
    const sseText = 'event: task_started\ndata: {"task_id":"task-abc"}\n\n';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createMockResponse(sseText)));

    const events: any[] = [];
    for await (const event of fetchStream('/api/test', {})) {
      events.push(event);
    }

    expect(events).toHaveLength(0);
  });

  it('throws on non-200 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createMockResponse('', 500)));

    await expect(async () => {
      for await (const _ of fetchStream('/api/test', {})) {
        // consume
      }
    }).rejects.toThrow('500');
  });

  it('stops reading when AbortSignal is already aborted', async () => {
    const sseText = 'event: message\ndata: {"content":"hello"}\n\n';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createMockResponse(sseText)));

    const controller = new AbortController();
    controller.abort();

    const events: any[] = [];
    for await (const event of fetchStream('/api/test', { signal: controller.signal })) {
      events.push(event);
    }

    // Should yield no events since signal was already aborted
    expect(events).toHaveLength(0);
  });
});

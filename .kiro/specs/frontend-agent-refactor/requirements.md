# Requirements Document

## Introduction

本文档描述 FreeTop 平台的全面重构需求，涵盖三个核心方向：

1. **前端响应性与滑动体验优化** — 解决页面响应慢、交互卡顿、移动端滑动不流畅等问题。当前 `MessageHistoryView` 存在多层嵌套滚动容器、过度使用 `will-change`、`SlidingLayout` 在 `window.innerWidth` 上直接读取导致 SSR 不一致等问题。
2. **智能体框架升级** — 基于 LangGraph 最新最佳实践（checkpointing、human-in-the-loop、streaming token-by-token）以及 CrewAI/AutoGen 的多智能体协作模式，优化当前 `src/graph/` 中的图结构、节点设计和状态管理。
3. **测试覆盖完善** — 确保前端组件、后端 API、智能体工作流均有充分的单元测试和集成测试覆盖。

目标用户为需要与 AI 智能体协作完成复杂任务的专业用户，重构后将显著提升交互流畅度、智能体执行效率和系统可靠性。

---

## Glossary

- **Chat_Page**: `web/src/app/chat/page.tsx` 中的主聊天页面组件
- **MessageHistoryView**: `web/src/app/_components/MessageHistoryView.tsx` 中的消息历史展示组件
- **SlidingLayout**: `web/src/app/_components/SlidingLayout.tsx` 中的滑动侧边面板布局组件
- **InputBox**: `web/src/app/_components/InputBox.tsx` 中的消息输入框组件
- **Store**: `web/src/core/store/store.ts` 中基于 Zustand 的全局状态管理
- **SSE_Stream**: `web/src/core/sse/fetch-stream.ts` 中的 Server-Sent Events 流处理模块
- **Graph**: `src/graph/builder.py` 中构建的 LangGraph 智能体工作流图
- **Supervisor_Node**: `src/graph/nodes.py` 中的 supervisor 节点，负责路由决策
- **Planner_Node**: `src/graph/nodes.py` 中的 planner 节点，负责任务规划
- **Coordinator_Node**: `src/graph/nodes.py` 中的 coordinator 节点，负责用户沟通
- **State**: `src/graph/types.py` 中定义的 LangGraph 状态类型
- **WorkflowService**: `src/service/workflow_service.py` 中的工作流服务，处理 SSE 事件流
- **API_App**: `src/api/app.py` 中的 FastAPI 应用
- **Test_Suite**: `tests/` 目录下的测试套件

---

## Requirements

### Requirement 1: 消息列表滚动性能优化

**User Story:** As a user, I want the message list to scroll smoothly without jank, so that I can read AI responses without interruption.

#### Acceptance Criteria

1. WHEN the message list contains more than 50 messages, THE MessageHistoryView SHALL render only the visible messages using virtual scrolling, keeping DOM node count below 30 at any time.
2. WHEN new assistant content is streamed in, THE MessageHistoryView SHALL auto-scroll to the bottom within 16ms (one animation frame) without layout thrashing.
3. WHEN the user manually scrolls up, THE MessageHistoryView SHALL stop auto-scrolling and display a "scroll to bottom" button within 200ms of the scroll event.
4. WHEN the user clicks the "scroll to bottom" button, THE MessageHistoryView SHALL animate to the bottom within 300ms using smooth scrolling.
5. THE MessageHistoryView SHALL use a single scroll container element, eliminating nested scroll contexts that cause event capture conflicts.
6. WHEN the window is resized, THE MessageHistoryView SHALL debounce scroll recalculation with a 150ms delay to prevent layout thrashing.
7. THE MessageHistoryView SHALL NOT attach more than one `wheel` event listener per scroll container instance.

### Requirement 2: SlidingLayout 滑动面板性能修复

**User Story:** As a user, I want the side panel to slide open and close smoothly, so that I can view tool results without the page feeling sluggish.

#### Acceptance Criteria

1. THE SlidingLayout SHALL NOT read `window.innerWidth` directly during render to avoid SSR hydration mismatches; WHEN panel width is needed, THE SlidingLayout SHALL use a CSS `clamp()` value or a `useEffect`-guarded state variable.
2. WHEN the side panel opens or closes, THE SlidingLayout SHALL complete the CSS transition within 350ms using `transform: translateX` on the GPU compositor layer.
3. WHEN the side panel is closed, THE SlidingLayout SHALL remove the panel DOM node from the document after the transition completes to reduce memory usage.
4. WHILE the side panel transition is in progress, THE SlidingLayout SHALL set `pointer-events: none` on both the main content and the panel to prevent interaction conflicts.
5. WHEN the user taps the overlay on mobile, THE SlidingLayout SHALL close the panel within one animation frame.
6. THE SlidingLayout SHALL expose a `panelWidth` prop with a default of `min(600px, 80vw)` resolved via CSS, so that callers do not need to compute pixel values.

### Requirement 3: 移动端触摸滑动体验优化

**User Story:** As a mobile user, I want to swipe through the chat naturally, so that the experience feels native and responsive.

#### Acceptance Criteria

1. THE Chat_Page SHALL set `touch-action: pan-y` on the message scroll container so that vertical swipes are handled natively by the browser without JavaScript intervention.
2. WHEN a touch scroll event occurs on the message list, THE MessageHistoryView SHALL NOT call `preventDefault()` on the touch event, allowing native momentum scrolling.
3. THE Chat_Page SHALL set `-webkit-overflow-scrolling: touch` and `overscroll-behavior-y: contain` on the message scroll container to enable iOS momentum scrolling and prevent scroll chaining.
4. WHEN the virtual keyboard appears on mobile, THE InputBox SHALL remain visible above the keyboard by using `env(safe-area-inset-bottom)` and `dvh` viewport units.
5. THE Chat_Page SHALL pass `passive: true` to all touch event listeners to avoid blocking the browser's scroll thread.

### Requirement 4: 前端状态管理与渲染优化

**User Story:** As a developer, I want the frontend state updates to be batched and efficient, so that streaming responses do not cause excessive re-renders.

#### Acceptance Criteria

1. WHEN streaming message content arrives, THE Store SHALL batch DOM updates using `requestAnimationFrame`, ensuring no more than one `setState` call per animation frame per message.
2. THE MessageHistoryView SHALL wrap each `MessageView` in `React.memo` with a custom comparator that only re-renders when `message.content` or `message.id` changes.
3. WHEN the `responding` state changes, THE Chat_Page SHALL NOT re-render the entire message list; only the loading indicator component SHALL update.
4. THE Store SHALL use Zustand's `subscribeWithSelector` middleware so that components subscribe to specific slices of state rather than the entire store object.
5. WHEN a workflow message is updated, THE Store SHALL perform an immutable in-place update using structural sharing to avoid cloning the entire messages array.

### Requirement 5: LangGraph 图结构与 Checkpointing 升级

**User Story:** As a developer, I want the agent graph to support conversation persistence and resumability, so that long-running tasks can survive server restarts.

#### Acceptance Criteria

1. THE Graph SHALL be compiled with a `MemorySaver` checkpointer (or `SqliteSaver` in production) so that workflow state is persisted between invocations.
2. WHEN `build_graph()` is called, THE Graph SHALL accept a `checkpointer` parameter, defaulting to `MemorySaver`, to allow dependency injection in tests.
3. THE State SHALL include a `thread_id` field of type `str` so that each user conversation maps to a unique LangGraph thread.
4. WHEN the `WorkflowService` invokes the graph, THE WorkflowService SHALL pass `{"configurable": {"thread_id": thread_id}}` in the LangGraph config to enable per-conversation state isolation.
5. WHEN a workflow is aborted via the abort API, THE WorkflowService SHALL call `graph.update_state()` to mark the thread as interrupted rather than leaving it in an inconsistent state.

### Requirement 6: Supervisor 节点路由优化

**User Story:** As a developer, I want the supervisor to make routing decisions more reliably, so that agents are not called in unnecessary loops.

#### Acceptance Criteria

1. THE Supervisor_Node SHALL use LangGraph's `Command` with structured output validated against the `Router` TypedDict schema, raising a `ValueError` if the LLM returns an invalid agent name.
2. WHEN the same agent is selected consecutively more than once, THE Supervisor_Node SHALL increment a `repeat_count` field in State and route to `planner` for replanning after the first repeat.
3. WHEN `repeat_count` reaches 3, THE Supervisor_Node SHALL route to `__end__` to terminate the workflow and prevent infinite loops.
4. THE Supervisor_Node SHALL log the routing decision and `repeat_count` at `INFO` level on every invocation.
5. WHEN the supervisor routes to `FINISH`, THE Supervisor_Node SHALL emit a `Command` with `goto="__end__"` and update `State.next` to `"__end__"`.

### Requirement 7: 多智能体并行执行支持

**User Story:** As a user, I want independent research and code tasks to run in parallel, so that complex workflows complete faster.

#### Acceptance Criteria

1. WHERE the planner identifies two or more independent sub-tasks, THE Graph SHALL support a `parallel_node` that fans out to multiple agent nodes using LangGraph's `Send` API.
2. WHEN parallel agents complete, THE Graph SHALL merge their results into a single `HumanMessage` in State before routing back to the supervisor.
3. THE Planner_Node SHALL output a `parallel_tasks` field in its JSON plan when sub-tasks are independent, with each entry containing `agent`, `task`, and `dependencies` keys.
4. WHEN a parallel sub-task fails, THE Graph SHALL continue executing remaining parallel sub-tasks and include the error in the merged result.
5. THE WorkflowService SHALL emit a `parallel_start` SSE event when parallel execution begins and a `parallel_end` event when all parallel tasks complete.

### Requirement 8: 流式输出 Token 级别优化

**User Story:** As a user, I want to see AI responses appear word by word as they are generated, so that I get faster perceived response times.

#### Acceptance Criteria

1. WHEN an LLM node streams tokens, THE WorkflowService SHALL yield each `on_chat_model_stream` event immediately without buffering, with a maximum latency of 50ms from token generation to SSE emission.
2. THE SSE_Stream SHALL parse SSE events incrementally using a streaming text decoder, not accumulating the full response before parsing.
3. WHEN the coordinator node produces a `handoff_to_planner` response, THE WorkflowService SHALL suppress all coordinator tokens from the SSE stream and NOT send them to the frontend.
4. THE WorkflowService SHALL include a `agent_name` field in every `message` SSE event so the frontend can attribute streaming content to the correct agent.
5. WHEN the SSE connection is dropped by the client, THE WorkflowService SHALL detect the disconnection within 1 second and set the `abort_event` to stop LLM token generation.

### Requirement 9: 测试覆盖 — 前端单元测试

**User Story:** As a developer, I want frontend components to have unit tests, so that regressions are caught before deployment.

#### Acceptance Criteria

1. THE Test_Suite SHALL include unit tests for `MessageHistoryView` that verify auto-scroll behavior when `responding` changes from `false` to `true`.
2. THE Test_Suite SHALL include unit tests for `SlidingLayout` that verify the panel opens and closes correctly when `isOpen` prop changes.
3. THE Test_Suite SHALL include unit tests for the `Store.sendMessage` function that verify messages are added and `responding` is set to `true` during streaming.
4. THE Test_Suite SHALL include unit tests for `SSE_Stream.fetchStream` that verify correct parsing of multi-line SSE events and `task_started` event handling.
5. WHEN any frontend unit test is run, THE Test_Suite SHALL complete within 30 seconds in a CI environment without requiring a live backend.

### Requirement 10: 测试覆盖 — 后端单元与集成测试

**User Story:** As a developer, I want backend agent logic to have tests, so that graph routing and API endpoints behave correctly.

#### Acceptance Criteria

1. THE Test_Suite SHALL include unit tests for `supervisor_node` that verify it routes to `__end__` when `repeat_count` reaches 3.
2. THE Test_Suite SHALL include unit tests for `planner_node` that verify it returns `goto="__end__"` when the LLM response is not valid JSON.
3. THE Test_Suite SHALL include integration tests for `POST /api/chat/stream` that verify the SSE response contains `start_of_workflow` and `end_of_workflow` events for a simple query.
4. THE Test_Suite SHALL include integration tests for `POST /api/chat/abort/{task_id}` that verify the workflow stops emitting events after the abort signal is set.
5. WHEN all backend tests are run with `pytest`, THE Test_Suite SHALL achieve at least 70% line coverage on `src/graph/nodes.py` and `src/service/workflow_service.py`.
6. THE Test_Suite SHALL use `pytest-asyncio` for all async test functions and SHALL NOT use `asyncio.run()` directly inside test bodies.

### Requirement 11: 前端构建与 CI 质量门禁

**User Story:** As a developer, I want the frontend build to fail on type errors and lint violations, so that code quality is enforced automatically.

#### Acceptance Criteria

1. THE Chat_Page SHALL have zero TypeScript type errors as reported by `tsc --noEmit` with the existing `tsconfig.json` settings.
2. THE Chat_Page SHALL have zero ESLint errors as reported by the existing `.eslintrc.cjs` configuration.
3. WHEN `next build` is run, THE Chat_Page SHALL produce a static export with no build warnings related to `window` access during SSR.
4. THE SlidingLayout SHALL NOT contain any direct `window.*` property access outside of `useEffect` or event handler callbacks.
5. WHEN the frontend test suite is run with `vitest --run`, THE Test_Suite SHALL report zero failing tests.

# Implementation Plan: Frontend & Agent Refactor

## Overview

按依赖顺序将设计文档拆解为可增量执行的编码任务。前端使用 TypeScript/React，后端使用 Python。每个任务均引用具体需求条款，测试子任务标记为可选（`*`）。

## Tasks

- [x] 1. 后端：State 类型扩展与 build_graph() Checkpointing 注入
  - 在 `src/graph/types.py` 的 `State` 中新增 `thread_id: str`、`repeat_count: int`、`parallel_tasks: list`、`parallel_results: list`、`user_id: Optional[int]` 字段
  - 修改 `src/graph/builder.py` 的 `build_graph(checkpointer=None)` 签名，默认注入 `MemorySaver`，并在 `builder.compile(checkpointer=checkpointer)` 时传入
  - _Requirements: 5.1, 5.2, 5.3_

  - [ ]* 1.1 为 build_graph() checkpointer 注入编写单元测试
    - 验证 `build_graph()` 默认使用 `MemorySaver`
    - 验证传入自定义 checkpointer 时被正确使用
    - _Requirements: 5.2_

- [x] 2. 后端：WorkflowService thread_id 传递
  - 在 `src/service/workflow_service.py` 的 `run_agent_workflow()` 中新增 `thread_id: Optional[str]` 参数，若为 `None` 则自动生成 `uuid4()`
  - 将 `config` 改为 `{"configurable": {"thread_id": thread_id}, "recursion_limit": 50}` 并传入 `graph.astream_events()`
  - 在 `src/api/app.py` 的 `/api/chat/stream` 端点中从请求头或请求体提取 `thread_id` 并透传
  - _Requirements: 5.3, 5.4_

  - [ ]* 2.1 为 thread_id 传递编写单元测试
    - 验证未提供 `thread_id` 时自动生成唯一值
    - 验证 `thread_id` 正确出现在 `graph.astream_events()` 的 config 中
    - _Requirements: 5.4_

- [x] 3. 后端：Supervisor 节点路由优化
  - 修改 `src/graph/nodes.py` 的 `supervisor_node`：将 `repeat_count` 终止阈值从 2 调整为 3（`repeat_count >= 3` 时 `goto="__end__"`）
  - 在 `repeat_count == 1` 时路由到 `planner`，`repeat_count >= 2` 时路由到 `__end__`（与设计文档一致）
  - 添加对 LLM 返回无效 agent 名称的 `ValueError` 校验（agent 名不在 `TEAM_MEMBERS + ["FINISH"]` 中时抛出）
  - 在每次路由决策时以 `INFO` 级别记录 `goto` 和 `repeat_count`
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 3.1 为 supervisor_node 路由逻辑编写单元测试
    - 验证 `repeat_count=0` 时正常路由到目标 agent
    - 验证 `repeat_count=1` 时路由到 `planner`
    - 验证 `repeat_count=3` 时路由到 `__end__`
    - 验证无效 agent 名称时抛出 `ValueError`
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 3.2 为 supervisor_node 编写 Hypothesis 属性测试（Property 6、Property 7）
    - **Property 6: Supervisor 路由重复计数与终止**
    - **Validates: Requirements 6.2, 6.3**
    - **Property 7: Supervisor 无效路由拒绝**
    - **Validates: Requirements 6.1**
    - 文件路径：`tests/property/test_supervisor_properties.py`

- [x] 4. 后端：并行执行节点实现
  - 在 `src/graph/types.py` 中确认 `parallel_tasks` 和 `parallel_results` 字段已存在（Task 1 完成后）
  - 在 `src/graph/nodes.py` 中实现 `parallel_dispatch_node`：读取 `state["parallel_tasks"]`，使用 `Send` API 分发到各 agent 节点
  - 在 `src/graph/nodes.py` 中实现 `parallel_merge_node`：收集 `state["parallel_results"]`，合并为单条 `HumanMessage`，每个并行子任务独立 `try/except`，失败时写入 `{"agent": name, "content": f"ERROR: {e}", "error": True}`
  - 在 `src/graph/builder.py` 中注册 `parallel_dispatch_node` 和 `parallel_merge_node` 节点及相应边
  - 在 `src/service/workflow_service.py` 中新增 `parallel_start` 和 `parallel_end` SSE 事件的 yield 逻辑
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 4.1 为 parallel_merge_node 编写单元测试
    - 验证 N 个并行任务结果合并后包含 N 个片段
    - 验证某个子任务失败时其他任务结果仍包含在合并结果中
    - _Requirements: 7.2, 7.4_

  - [ ]* 4.2 为并行节点编写 Hypothesis 属性测试（Property 8、Property 9）
    - **Property 8: 并行任务结果合并完整性**
    - **Validates: Requirements 7.2**
    - **Property 9: 并行任务失败隔离**
    - **Validates: Requirements 7.4**
    - 文件路径：`tests/property/test_parallel_properties.py`

- [x] 5. 后端：WorkflowService SSE agent_name 注入与协调器 Token 过滤
  - 在 `src/service/workflow_service.py` 的 `on_chat_model_stream` 事件处理中，为每个 `message` SSE 事件的 `data` 字段添加 `agent_name: node` 字段
  - 确认协调器 `handoff_to_planner` 过滤逻辑正确：当 `is_handoff_case=True` 时不 yield 任何 coordinator token 事件
  - _Requirements: 8.3, 8.4_

  - [ ]* 5.1 为 SSE agent_name 注入编写单元测试
    - 验证每个 `message` 事件包含非空 `agent_name` 字段
    - 验证 coordinator handoff 时零个 coordinator token 事件被 yield
    - _Requirements: 8.3, 8.4_

  - [ ]* 5.2 为协调器 Token 过滤编写集成测试（Property 10）
    - **Property 10: 协调器 Token 过滤**
    - **Validates: Requirements 8.3**
    - 文件路径：`tests/integration/test_chat_stream.py`

- [x] 6. 后端：Planner 节点 JSON 校验与 abort 状态更新
  - 确认 `src/graph/nodes.py` 的 `planner_node` 在 `json_repair` 修复失败后返回 `goto="__end__"`（当前逻辑已存在，补充测试覆盖）
  - 在 `src/service/workflow_service.py` 的 abort 处理中，调用 `graph.update_state()` 将 thread 标记为 interrupted（需要 checkpointer 支持，依赖 Task 1）
  - _Requirements: 5.5, 10.2_

  - [ ]* 6.1 为 planner_node 无效 JSON 终止编写单元测试
    - 验证 LLM 返回非 JSON 时 `goto="__end__"`
    - 验证 `json_repair` 可修复的 JSON 正常继续
    - _Requirements: 10.2_

- [x] 7. 后端测试基础设施搭建
  - 在 `pyproject.toml` 的 `[project.optional-dependencies]` 中添加 `pytest-asyncio>=0.23.0` 和 `hypothesis>=6.0.0`
  - 确认 `pytest.ini` 中 `asyncio_mode = auto` 已配置（或在 `pyproject.toml` 中设置）
  - 创建 `tests/unit/`、`tests/integration/`、`tests/property/` 目录及各自的 `__init__.py`
  - 创建 `tests/conftest.py`，提供 `build_mock_state()` fixture 和 mock LLM patch 工具函数
  - _Requirements: 10.5, 10.6_

- [x] 8. 后端：集成测试实现
  - 在 `tests/integration/test_chat_stream.py` 中实现 `POST /api/chat/stream` 集成测试：验证 SSE 响应包含 `start_of_workflow` 和 `end_of_workflow` 事件
  - 在 `tests/integration/test_abort.py` 中实现 abort 集成测试：验证 abort 后工作流停止 yield 事件
  - _Requirements: 10.3, 10.4_

- [x] 9. 后端检查点 — 确保所有后端测试通过
  - 运行 `pytest tests/ --cov=src --cov-report=term-missing`，确保 `src/graph/nodes.py` 覆盖率 ≥ 70%，`src/service/workflow_service.py` 覆盖率 ≥ 70%
  - 确保所有测试通过，如有问题向用户反馈。

- [x] 10. 前端：测试基础设施搭建
  - 在 `web/package.json` 中添加开发依赖：`vitest`、`@vitejs/plugin-react`、`@testing-library/react`、`@testing-library/user-event`、`jsdom`、`fast-check`
  - 创建 `web/vitest.config.ts`，配置 `environment: 'jsdom'`、`globals: true`、`setupFiles: ['./src/test/setup.ts']`
  - 创建 `web/src/test/setup.ts`，引入 `@testing-library/jest-dom` matchers
  - 在 `web/package.json` 的 `scripts` 中添加 `"test": "vitest --run"` 命令
  - _Requirements: 9.5, 11.5_

- [x] 11. 前端：Zustand Store subscribeWithSelector 升级
  - 修改 `web/src/core/store/store.ts`，为 `create()` 调用包裹 `subscribeWithSelector` 中间件
  - 将 `Chat_Page` 和 `MessageHistoryView` 中的全量 store 订阅改为切片订阅（`useStore(state => state.messages)` 等）
  - 确保 `responding` 状态变化不触发消息列表重渲染，仅更新 loading indicator 组件
  - _Requirements: 4.3, 4.4_

  - [ ]* 11.1 为 Store subscribeWithSelector 编写单元测试
    - 验证 `responding` 变化时消息列表订阅者不被触发
    - 验证切片订阅只在对应字段变化时触发
    - _Requirements: 4.3, 4.4_

- [x] 12. 前端：Store rAF 批处理与结构共享
  - 在 `web/src/core/store/store.ts` 中实现流式 token 更新的 `requestAnimationFrame` 批处理：同一帧内多个 token 事件合并为一次 `setState`
  - 实现 workflow 消息的 immutable in-place 更新（结构共享），避免克隆整个 `messages` 数组
  - _Requirements: 4.1, 4.5_

  - [ ]* 12.1 为 rAF 批处理编写单元测试
    - 验证单帧内 N 个 token 事件只触发一次 `setState`
    - 验证消息更新时其他消息对象保持引用相等
    - _Requirements: 4.1, 4.5_

  - [ ]* 12.2 为 rAF 批处理编写 fast-check 属性测试（Property 3、Property 5）
    - **Property 3: rAF 批处理更新频率**
    - **Validates: Requirements 4.1**
    - **Property 5: 结构共享不变量**
    - **Validates: Requirements 4.5**
    - 文件路径：`web/src/core/store/__tests__/store.test.ts`

- [x] 13. 前端：MessageHistoryView 虚拟滚动重构
  - 在 `web/package.json` 中添加 `@tanstack/react-virtual` 依赖
  - 重构 `web/src/app/_components/MessageHistoryView.tsx`：使用 `useVirtualizer` 实现虚拟滚动，单一滚动容器（`overflow-y: auto`），消除嵌套滚动上下文
  - 使用 `IntersectionObserver` 检测底部元素可见性，替代 scroll 事件轮询，实现自动滚动到底部逻辑
  - 确保 `wheel` 事件监听器通过 `useEffect` 依赖数组精确控制，每个容器实例只注册一次
  - 为每个 `MessageView` 包裹 `React.memo`，自定义比较函数仅在 `message.content` 或 `message.id` 变化时重渲染
  - 在滚动容器上设置 `touch-action: pan-y`、`-webkit-overflow-scrolling: touch`、`overscroll-behavior-y: contain`
  - 不在 touch 事件处理中调用 `preventDefault()`，所有 touch 监听器使用 `passive: true`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 3.1, 3.2, 3.3, 3.5_

  - [ ]* 13.1 为 MessageHistoryView 编写单元测试
    - 验证 `responding` 从 `false` 变为 `true` 时自动滚动到底部
    - 验证用户手动上滚后显示"滚动到底部"按钮
    - 验证点击按钮后滚动到底部
    - _Requirements: 1.2, 1.3, 1.4_

  - [ ]* 13.2 为虚拟滚动编写 fast-check 属性测试（Property 1、Property 2）
    - **Property 1: 虚拟滚动 DOM 节点数量上限**
    - **Validates: Requirements 1.1**
    - **Property 2: 单一滚动容器不变量**
    - **Validates: Requirements 1.5**
    - 文件路径：`web/src/app/_components/__tests__/MessageHistoryView.test.tsx`

- [x] 14. 前端：SlidingLayout SSR 安全修复与 GPU 动画
  - 重构 `web/src/app/_components/SlidingLayout.tsx`：移除所有 `window.innerWidth` 直接读取，改用 CSS `min(600px, 80vw)` 或 `useEffect` 内的 state 变量
  - 将面板宽度改为 CSS `clamp()` / `min()` 值，新增 `panelWidth` prop（默认 `"min(600px, 80vw)"`）
  - 动画使用 `transform: translateX`，仅在动画期间设置 `will-change: transform`，动画结束后移除
  - 通过 `onTransitionEnd` 回调在面板关闭后卸载 DOM 节点
  - 过渡期间对主内容和面板均设置 `pointer-events: none`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 11.3, 11.4_

  - [ ]* 14.1 为 SlidingLayout 编写单元测试
    - 验证 `isOpen` 变化时面板正确开关
    - 验证 SSR 环境下无 `window` 访问错误
    - 验证过渡期间 `pointer-events: none` 被设置
    - _Requirements: 2.1, 2.2, 2.4_

- [x] 15. 前端：InputBox 移动端键盘适配
  - 修改 `web/src/app/_components/InputBox.tsx`：使用 `env(safe-area-inset-bottom)` 和 `dvh` 视口单位确保虚拟键盘弹出时输入框可见
  - _Requirements: 3.4_

  - [ ]* 15.1 为 InputBox 编写单元测试
    - 验证组件正确渲染并包含 safe-area 相关样式
    - _Requirements: 3.4_

- [x] 16. 前端：SSE Stream task_started 事件与 AbortSignal 处理
  - 检查 `web/src/core/sse/fetch-stream.ts`，确保 `task_started` 事件的 `taskId` 正确传播到所有后续事件处理
  - 确保 `AbortSignal` 触发时立即释放 reader lock，不阻塞后续请求
  - 确认 SSE 事件使用 `TextDecoderStream` 增量解析，不累积完整响应
  - _Requirements: 8.2, 8.5_

  - [ ]* 16.1 为 SSE fetchStream 编写单元测试
    - 验证多行 SSE 事件的正确解析
    - 验证 `task_started` 事件处理
    - 验证 abort 时 reader lock 被释放
    - _Requirements: 9.4_

- [x] 17. 前端检查点 — 确保所有前端测试通过
  - 在 `web/` 目录下运行 `pnpm vitest --run`，确保零失败测试
  - 运行 `tsc --noEmit` 确保零 TypeScript 类型错误
  - 确保所有测试通过，如有问题向用户反馈。
  - _Requirements: 11.1, 11.5_

- [x] 18. CI 质量门禁配置
  - 在 `.github/workflows/` 中创建或更新 CI 配置文件，添加以下步骤：
    - 前端：`cd web && pnpm install && pnpm vitest --run`
    - 前端类型检查：`cd web && pnpm tsc --noEmit`
    - 前端 lint：`cd web && pnpm eslint src/`
    - 后端：`pytest tests/ --cov=src --cov-report=term-missing --cov-fail-under=70`
  - _Requirements: 11.1, 11.2, 10.5_

- [x] 19. 最终检查点 — 端到端验证
  - 确保所有后端测试通过（`pytest tests/`）
  - 确保所有前端测试通过（`cd web && pnpm vitest --run`）
  - 确保前端构建无 SSR 相关警告（`cd web && pnpm next build`）
  - 确保所有测试通过，如有问题向用户反馈。

## Notes

- 标记 `*` 的子任务为可选，可跳过以加快 MVP 交付
- 每个任务引用具体需求条款以保证可追溯性
- 任务按依赖顺序排列：后端基础设施（1-9）→ 前端基础设施（10）→ 前端功能（11-16）→ 检查点（17-19）
- 属性测试（fast-check / Hypothesis）验证设计文档中定义的 12 个正确性属性
- 后端测试目标：`src/graph/nodes.py` ≥ 70%，`src/service/workflow_service.py` ≥ 70%，`src/graph/builder.py` ≥ 90%
- 前端测试目标：store ≥ 80%，SSE ≥ 80%

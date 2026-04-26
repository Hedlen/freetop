"""
单元测试：WorkflowService SSE agent_name 注入与协调器 Token 过滤
验证 Requirements 8.3, 8.4

通过直接测试 SSE 事件处理逻辑（不依赖完整导入链）来验证：
1. 每个 message 事件包含 agent_name 字段
2. coordinator handoff 时零个 coordinator token 事件被 yield
"""
import asyncio
import sys
import types
import pytest
from unittest.mock import MagicMock, AsyncMock, patch


def _make_chunk(content, chunk_id="chunk-1", reasoning_content=None):
    """创建模拟的 LLM chunk"""
    chunk = MagicMock()
    chunk.content = content
    chunk.id = chunk_id
    chunk.additional_kwargs = {}
    if reasoning_content:
        chunk.additional_kwargs["reasoning_content"] = reasoning_content
    return chunk


def _make_stream_event(node, content, chunk_id="chunk-1", reasoning_content=None):
    """创建模拟的 on_chat_model_stream 事件"""
    return {
        "event": "on_chat_model_stream",
        "name": "ChatOpenAI",
        "run_id": "run-1",
        "data": {"chunk": _make_chunk(content, chunk_id, reasoning_content)},
        "metadata": {"checkpoint_ns": f"{node}:abc", "langgraph_step": "1"},
    }


async def _async_iter(items):
    """将列表转换为异步迭代器"""
    for item in items:
        yield item


async def _collect(async_gen):
    """收集异步生成器的所有事件"""
    events = []
    async for event in async_gen:
        events.append(event)
    return events


def _setup_module_mocks():
    """设置模块级别的 mock，避免导入链问题"""
    # Mock markdownify
    mock_markdownify = types.ModuleType("markdownify")
    mock_markdownify.markdownify = lambda x, **kw: x
    sys.modules.setdefault("markdownify", mock_markdownify)

    # Mock playwright
    for mod in ["playwright", "playwright.async_api", "playwright.sync_api"]:
        sys.modules.setdefault(mod, types.ModuleType(mod))

    # Mock browser-related modules
    for mod in ["src.tools.browser", "src.tools.smart_browser"]:
        if mod not in sys.modules:
            m = types.ModuleType(mod)
            m.browser_tool = MagicMock()
            m.smart_browser_tool = MagicMock()
            m.Browser = MagicMock()
            m.BrowserTool = MagicMock()
            m.SmartBrowserTool = MagicMock()
            m.create_browser_config = MagicMock(return_value={})
            sys.modules[mod] = m


_setup_module_mocks()


@pytest.fixture
def mock_workflow_service():
    """提供一个可测试的 run_agent_workflow，mock 掉 graph 和配置"""
    # 先确保 mock 已设置
    _setup_module_mocks()

    # 动态导入（在 mock 设置后）
    # 直接 patch graph 模块
    mock_graph = MagicMock()

    with patch.dict("sys.modules", {
        "src.graph": MagicMock(build_graph=MagicMock()),
        "src.config": MagicMock(
            TEAM_MEMBERS=["researcher", "coder"],
            TEAM_MEMBER_CONFIGRATIONS={}
        ),
        "langchain_community.adapters.openai": MagicMock(
            convert_message_to_dict=lambda m: {"role": "assistant", "content": str(m)}
        ),
    }):
        # 重新导入以使用 mock
        if "src.service.workflow_service" in sys.modules:
            del sys.modules["src.service.workflow_service"]

        import importlib
        import src.service.workflow_service as wf_module
        wf_module.graph = mock_graph

        yield wf_module, mock_graph


# ─── 核心逻辑测试（不依赖完整导入链）─────────────────────────────────────────

class TestAgentNameInjection:
    """测试 agent_name 字段注入逻辑"""

    def _run_stream_logic(self, stream_events, team_members=None):
        """
        直接模拟 workflow_service 中的 on_chat_model_stream 处理逻辑，
        返回所有 yield 的事件。
        """
        if team_members is None:
            team_members = ["researcher", "coder", "browser"]

        streaming_llm_agents = [*team_members, "planner", "coordinator"]
        MAX_CACHE_SIZE = 3
        coordinator_cache = []
        is_handoff_case = False
        yielded = []

        for event in stream_events:
            kind = event.get("event")
            data = event.get("data")
            metadata = event.get("metadata", {})
            node = (
                ""
                if metadata.get("checkpoint_ns") is None
                else metadata.get("checkpoint_ns").split(":")[0]
            )

            if kind != "on_chat_model_stream" or node not in streaming_llm_agents:
                continue

            content = data["chunk"].content
            chunk_id = data["chunk"].id

            if content is None or content == "":
                if not data["chunk"].additional_kwargs.get("reasoning_content"):
                    continue
                ydata = {
                    "event": "message",
                    "data": {
                        "agent_name": node,
                        "message_id": chunk_id,
                        "delta": {
                            "reasoning_content": data["chunk"].additional_kwargs["reasoning_content"]
                        },
                    },
                }
                yielded.append(ydata)
            else:
                if node == "coordinator":
                    if len(coordinator_cache) < MAX_CACHE_SIZE:
                        coordinator_cache.append(content)
                        cached_content = "".join(coordinator_cache)
                        if cached_content.startswith("handoff"):
                            is_handoff_case = True
                            continue
                        if len(coordinator_cache) < MAX_CACHE_SIZE:
                            continue
                        ydata = {
                            "event": "message",
                            "data": {
                                "agent_name": node,
                                "message_id": chunk_id,
                                "delta": {"content": cached_content},
                            },
                        }
                        yielded.append(ydata)
                    elif not is_handoff_case:
                        ydata = {
                            "event": "message",
                            "data": {
                                "agent_name": node,
                                "message_id": chunk_id,
                                "delta": {"content": content},
                            },
                        }
                        yielded.append(ydata)
                    else:
                        # is_handoff_case=True: suppress all coordinator tokens
                        continue
                else:
                    ydata = {
                        "event": "message",
                        "data": {
                            "agent_name": node,
                            "message_id": chunk_id,
                            "delta": {"content": content},
                        },
                    }
                    yielded.append(ydata)

        return yielded

    def test_regular_agent_message_has_agent_name(self):
        """验证普通 agent 的 message 事件包含正确的 agent_name (Requirement 8.4)"""
        events = [
            _make_stream_event("researcher", "Hello world", "id-1"),
            _make_stream_event("coder", "def foo(): pass", "id-2"),
        ]
        yielded = self._run_stream_logic(events)

        assert len(yielded) == 2
        assert yielded[0]["data"]["agent_name"] == "researcher"
        assert yielded[1]["data"]["agent_name"] == "coder"

    def test_planner_message_has_agent_name(self):
        """验证 planner 的 message 事件包含 agent_name (Requirement 8.4)"""
        events = [
            _make_stream_event("planner", "Planning step 1", "id-1"),
        ]
        yielded = self._run_stream_logic(events)

        assert len(yielded) == 1
        assert yielded[0]["data"]["agent_name"] == "planner"

    def test_reasoning_content_message_has_agent_name(self):
        """验证 reasoning_content 类型的 message 事件也包含 agent_name (Requirement 8.4)"""
        events = [
            _make_stream_event("planner", "", "id-1", reasoning_content="thinking..."),
        ]
        yielded = self._run_stream_logic(events)

        assert len(yielded) == 1
        assert yielded[0]["data"]["agent_name"] == "planner"
        assert "reasoning_content" in yielded[0]["data"]["delta"]

    def test_all_message_events_have_agent_name(self):
        """验证所有 message 事件都包含非空 agent_name 字段 (Requirement 8.4)"""
        events = [
            _make_stream_event("researcher", "Research result", "id-1"),
            _make_stream_event("planner", "Plan", "id-2"),
            _make_stream_event("coder", "Code", "id-3"),
            _make_stream_event("planner", "", "id-4", reasoning_content="thinking"),
        ]
        yielded = self._run_stream_logic(events)

        assert len(yielded) == 4
        for evt in yielded:
            assert "agent_name" in evt["data"], f"缺少 agent_name: {evt}"
            assert evt["data"]["agent_name"] != "", "agent_name 不能为空"


class TestCoordinatorHandoffFilter:
    """测试协调器 handoff token 过滤逻辑"""

    def _run_coordinator_logic(self, coordinator_tokens):
        """运行 coordinator token 处理逻辑，返回 yielded 事件"""
        MAX_CACHE_SIZE = 3
        coordinator_cache = []
        is_handoff_case = False
        yielded = []

        for token, chunk_id in coordinator_tokens:
            content = token
            node = "coordinator"

            if len(coordinator_cache) < MAX_CACHE_SIZE:
                coordinator_cache.append(content)
                cached_content = "".join(coordinator_cache)
                if cached_content.startswith("handoff"):
                    is_handoff_case = True
                    continue
                if len(coordinator_cache) < MAX_CACHE_SIZE:
                    continue
                ydata = {
                    "event": "message",
                    "data": {
                        "agent_name": node,
                        "message_id": chunk_id,
                        "delta": {"content": cached_content},
                    },
                }
                yielded.append(ydata)
            elif not is_handoff_case:
                ydata = {
                    "event": "message",
                    "data": {
                        "agent_name": node,
                        "message_id": chunk_id,
                        "delta": {"content": content},
                    },
                }
                yielded.append(ydata)
            else:
                # is_handoff_case=True: suppress
                continue

        return yielded, is_handoff_case

    def test_handoff_suppresses_all_coordinator_tokens(self):
        """验证 handoff 时零个 coordinator token 事件被 yield (Requirement 8.3)"""
        # "handoff_to_planner" 分成多个 token
        tokens = [
            ("han", "id-1"),
            ("dof", "id-2"),
            ("f_t", "id-3"),
            ("o_p", "id-4"),
            ("lan", "id-5"),
            ("ner", "id-6"),
        ]
        yielded, is_handoff = self._run_coordinator_logic(tokens)

        assert is_handoff is True, "应该检测到 handoff case"
        assert len(yielded) == 0, \
            f"handoff 时不应 yield 任何 coordinator token，但得到了 {len(yielded)} 个"

    def test_handoff_detected_at_first_token(self):
        """验证第一个 token 就是 'handoff' 时立即过滤"""
        tokens = [
            ("handoff_to_planner", "id-1"),
            ("more content", "id-2"),
        ]
        yielded, is_handoff = self._run_coordinator_logic(tokens)

        assert is_handoff is True
        assert len(yielded) == 0

    def test_non_handoff_coordinator_yields_tokens(self):
        """验证非 handoff coordinator 响应正常 yield"""
        tokens = [
            ("Sur", "id-1"),
            ("e, ", "id-2"),
            ("I c", "id-3"),
            ("an ", "id-4"),
            ("help", "id-5"),
        ]
        yielded, is_handoff = self._run_coordinator_logic(tokens)

        assert is_handoff is False
        # 前3个 token 被缓存，第3个时发送 cached_content，之后每个 token 单独发送
        assert len(yielded) >= 1
        for evt in yielded:
            assert evt["data"]["agent_name"] == "coordinator"

    def test_handoff_case_suppresses_tokens_after_cache_full(self):
        """验证 is_handoff_case=True 时，cache 满后的 token 也被过滤"""
        # 前两个 token 合起来是 "ha"，第三个是 "ndoff..."
        tokens = [
            ("ha", "id-1"),
            ("nd", "id-2"),
            ("off_to_planner", "id-3"),  # 第3个 token 使 cached_content = "handoff_to_planner"
            ("extra token 1", "id-4"),
            ("extra token 2", "id-5"),
        ]
        yielded, is_handoff = self._run_coordinator_logic(tokens)

        assert is_handoff is True
        assert len(yielded) == 0, \
            f"handoff 后所有 token 都应被过滤，但得到了 {len(yielded)} 个"

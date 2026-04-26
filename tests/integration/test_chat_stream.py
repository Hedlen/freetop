"""
集成测试：POST /api/chat/stream 端点
验证 SSE 响应包含正确的事件序列

Validates: Requirements 10.3, 10.4
"""
# conftest.py 中的 setup_app_mocks() 已在模块加载时执行，确保依赖已 mock
import json
import asyncio
import pytest
from unittest.mock import patch, MagicMock
import httpx
from httpx import ASGITransport

from src.api.app import app


def make_client() -> httpx.AsyncClient:
    """创建使用 ASGITransport 的测试客户端（兼容 httpx >= 0.20）"""
    return httpx.AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    )


# ── 辅助函数 ──────────────────────────────────────────────────────────────────

def parse_sse_lines(content: str) -> list[dict]:
    """解析 SSE 响应文本，返回事件列表"""
    events = []
    current_event: dict = {}

    for line in content.splitlines():
        line = line.strip()
        if line.startswith("event:"):
            current_event["event"] = line[len("event:"):].strip()
        elif line.startswith("data:"):
            raw = line[len("data:"):].strip()
            try:
                current_event["data"] = json.loads(raw)
            except json.JSONDecodeError:
                current_event["data"] = raw
        elif line == "" and current_event:
            events.append(current_event)
            current_event = {}

    if current_event:
        events.append(current_event)

    return events


async def mock_workflow_generator(*args, **kwargs):
    """模拟 run_agent_workflow，yield 最小化的 SSE 事件序列"""
    yield {"event": "start_of_workflow", "data": {"workflow_id": "test-wf-1"}}
    yield {
        "event": "message",
        "data": {
            "message_id": "msg-1",
            "delta": {"content": "Hello"},
            "agent_name": "researcher",
        },
    }
    yield {"event": "end_of_workflow", "data": {"workflow_id": "test-wf-1"}}


# ── 测试类 ────────────────────────────────────────────────────────────────────

class TestChatStreamEndpoint:
    """POST /api/chat/stream 集成测试"""

    @pytest.fixture
    def chat_request_body(self):
        return {
            "messages": [{"role": "user", "content": "Hello, what can you do?"}],
            "debug": False,
            "deep_thinking_mode": False,
            "search_before_planning": False,
        }

    @pytest.mark.asyncio
    async def test_sse_content_type(self, chat_request_body):
        """验证响应 Content-Type 为 text/event-stream (Requirement 10.3)"""
        with patch("src.api.app.run_agent_workflow", new=mock_workflow_generator):
            async with make_client() as client:
                async with client.stream(
                    "POST",
                    "/api/chat/stream",
                    json=chat_request_body,
                    timeout=10.0,
                ) as response:
                    assert response.status_code == 200
                    content_type = response.headers.get("content-type", "")
                    assert "text/event-stream" in content_type

    @pytest.mark.asyncio
    async def test_task_started_event_with_task_id(self, chat_request_body):
        """验证响应包含 task_started 事件且含 task_id (Requirement 10.3)"""
        with patch("src.api.app.run_agent_workflow", new=mock_workflow_generator):
            async with make_client() as client:
                async with client.stream(
                    "POST",
                    "/api/chat/stream",
                    json=chat_request_body,
                    timeout=10.0,
                ) as response:
                    assert response.status_code == 200
                    body = await response.aread()
                    text = body.decode("utf-8")

        events = parse_sse_lines(text)
        event_types = [e.get("event") for e in events]

        assert "task_started" in event_types, f"缺少 task_started 事件，得到: {event_types}"

        task_started = next(e for e in events if e.get("event") == "task_started")
        assert "task_id" in task_started.get("data", {}), "task_started 事件缺少 task_id 字段"
        assert task_started["data"]["task_id"], "task_id 不能为空"

    @pytest.mark.asyncio
    async def test_start_and_end_of_workflow_events(self, chat_request_body):
        """验证响应包含 start_of_workflow 和 end_of_workflow 事件 (Requirement 10.3)"""
        with patch("src.api.app.run_agent_workflow", new=mock_workflow_generator):
            async with make_client() as client:
                async with client.stream(
                    "POST",
                    "/api/chat/stream",
                    json=chat_request_body,
                    timeout=10.0,
                ) as response:
                    body = await response.aread()
                    text = body.decode("utf-8")

        events = parse_sse_lines(text)
        event_types = [e.get("event") for e in events]

        assert "start_of_workflow" in event_types, (
            f"缺少 start_of_workflow 事件，得到: {event_types}"
        )
        assert "end_of_workflow" in event_types, (
            f"缺少 end_of_workflow 事件，得到: {event_types}"
        )

    @pytest.mark.asyncio
    async def test_event_order_task_started_first(self, chat_request_body):
        """验证 task_started 是第一个事件"""
        with patch("src.api.app.run_agent_workflow", new=mock_workflow_generator):
            async with make_client() as client:
                async with client.stream(
                    "POST",
                    "/api/chat/stream",
                    json=chat_request_body,
                    timeout=10.0,
                ) as response:
                    body = await response.aread()
                    text = body.decode("utf-8")

        events = parse_sse_lines(text)
        assert events, "响应中没有任何 SSE 事件"
        assert events[0].get("event") == "task_started", (
            f"第一个事件应为 task_started，实际为: {events[0].get('event')}"
        )

    @pytest.mark.asyncio
    async def test_unauthenticated_request_allowed(self, chat_request_body):
        """验证未认证请求（无 Authorization 头）可以正常访问（无订阅检查）"""
        with patch("src.api.app.run_agent_workflow", new=mock_workflow_generator):
            async with make_client() as client:
                async with client.stream(
                    "POST",
                    "/api/chat/stream",
                    json=chat_request_body,
                    timeout=10.0,
                ) as response:
                    assert response.status_code == 200
                    body = await response.aread()
                    text = body.decode("utf-8")

        events = parse_sse_lines(text)
        event_types = [e.get("event") for e in events]
        assert "task_started" in event_types

    @pytest.mark.asyncio
    async def test_workflow_error_yields_error_message(self, chat_request_body):
        """验证 workflow 抛出异常时，响应仍然是 SSE 流并包含 task_started 事件"""
        async def error_workflow(*args, **kwargs):
            yield {"event": "start_of_workflow", "data": {}}
            raise RuntimeError("模拟 LLM 错误")

        with patch("src.api.app.run_agent_workflow", new=error_workflow):
            async with make_client() as client:
                async with client.stream(
                    "POST",
                    "/api/chat/stream",
                    json=chat_request_body,
                    timeout=10.0,
                ) as response:
                    assert response.status_code == 200
                    body = await response.aread()
                    text = body.decode("utf-8")

        events = parse_sse_lines(text)
        event_types = [e.get("event") for e in events]
        assert "task_started" in event_types

    @pytest.mark.asyncio
    async def test_subscription_denied_returns_403(self, chat_request_body):
        """验证订阅检查失败时返回 403"""
        with patch("src.api.app.UserService.verify_token", return_value={"user_id": 1}), \
             patch("src.api.app.get_db") as mock_get_db:
            mock_user = MagicMock()
            mock_user.id = 1
            mock_user.is_active = True
            mock_db = MagicMock()
            mock_db.query.return_value.filter.return_value.first.return_value = mock_user
            mock_get_db.return_value = iter([mock_db])

            with patch(
                "src.services.subscription_service.SubscriptionService.can_user_access_service",
                return_value=(False, "订阅已过期"),
            ):
                async with make_client() as client:
                    response = await client.post(
                        "/api/chat/stream",
                        json=chat_request_body,
                        headers={"Authorization": "Bearer fake_token"},
                        timeout=10.0,
                    )
                    assert response.status_code == 403

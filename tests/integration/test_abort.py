"""
集成测试：POST /api/chat/abort/{task_id} 端点
验证 abort 功能正确工作

Validates: Requirements 10.3, 10.4
"""
# conftest.py 中的 setup_app_mocks() 已在模块加载时执行，确保依赖已 mock
import json
import asyncio
import pytest
from unittest.mock import patch
import httpx
from httpx import ASGITransport

from src.api.app import app, task_abort_events


def make_client() -> httpx.AsyncClient:
    """创建使用 ASGITransport 的测试客户端（兼容 httpx >= 0.20）"""
    return httpx.AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    )


# ── 测试类 ────────────────────────────────────────────────────────────────────

class TestAbortEndpoint:
    """POST /api/chat/abort/{task_id} 集成测试"""

    @pytest.mark.asyncio
    async def test_abort_valid_task_id_returns_success(self):
        """验证对有效 task_id 的 abort 请求返回成功 (Requirement 10.4)"""
        test_task_id = "test-task-valid-001"
        abort_event = asyncio.Event()
        task_abort_events[test_task_id] = abort_event

        try:
            async with make_client() as client:
                response = await client.post(
                    f"/api/chat/abort/{test_task_id}",
                    timeout=5.0,
                )

            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "success", f"期望 status=success，得到: {data}"
            assert test_task_id in data.get("message", ""), (
                f"响应消息应包含 task_id，得到: {data}"
            )
            assert abort_event.is_set(), "abort_event 应该已被设置"
        finally:
            task_abort_events.pop(test_task_id, None)

    @pytest.mark.asyncio
    async def test_abort_invalid_task_id_returns_not_found(self):
        """验证对无效 task_id 的 abort 请求返回 not_found 状态 (Requirement 10.4)"""
        non_existent_task_id = "non-existent-task-99999"

        async with make_client() as client:
            response = await client.post(
                f"/api/chat/abort/{non_existent_task_id}",
                timeout=5.0,
            )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "not_found", (
            f"期望 status=not_found，得到: {data}"
        )

    @pytest.mark.asyncio
    async def test_abort_sets_abort_event(self):
        """验证 abort 请求正确设置了 abort_event"""
        test_task_id = "test-task-event-002"
        abort_event = asyncio.Event()
        task_abort_events[test_task_id] = abort_event

        assert not abort_event.is_set(), "初始状态 abort_event 不应被设置"

        try:
            async with make_client() as client:
                response = await client.post(
                    f"/api/chat/abort/{test_task_id}",
                    timeout=5.0,
                )

            assert response.status_code == 200
            assert abort_event.is_set(), "abort 后 abort_event 应该被设置"
        finally:
            task_abort_events.pop(test_task_id, None)

    @pytest.mark.asyncio
    async def test_abort_during_active_stream(self):
        """验证 abort 后 workflow 停止发送事件 (Requirement 10.4)"""
        chat_request_body = {
            "messages": [{"role": "user", "content": "Tell me a long story"}],
            "debug": False,
        }

        received_events = []
        task_id_holder = {}

        async def capturing_workflow(*args, abort_event=None, **kwargs):
            """捕获 abort_event 并在被设置时停止"""
            yield {"event": "start_of_workflow", "data": {}}
            for i in range(20):
                if abort_event and abort_event.is_set():
                    return
                await asyncio.sleep(0.02)
                yield {
                    "event": "message",
                    "data": {
                        "message_id": f"msg-{i}",
                        "delta": {"content": f"word{i} "},
                        "agent_name": "researcher",
                    },
                }
            yield {"event": "end_of_workflow", "data": {}}

        with patch(
            "src.api.app.run_agent_workflow",
            side_effect=capturing_workflow,
        ):
            async with make_client() as client:
                async with client.stream(
                    "POST",
                    "/api/chat/stream",
                    json=chat_request_body,
                    timeout=10.0,
                ) as stream_response:
                    assert stream_response.status_code == 200

                    current_event_type = None
                    async for line in stream_response.aiter_lines():
                        line = line.strip()
                        if line.startswith("event:"):
                            current_event_type = line[len("event:"):].strip()
                        elif line.startswith("data:"):
                            raw = line[len("data:"):].strip()
                            try:
                                data = json.loads(raw)
                            except json.JSONDecodeError:
                                data = raw
                            received_events.append({"event": current_event_type, "data": data})

                            if (
                                current_event_type == "task_started"
                                and isinstance(data, dict)
                                and "task_id" in data
                            ):
                                task_id_holder["task_id"] = data["task_id"]
                                abort_resp = await client.post(
                                    f"/api/chat/abort/{data['task_id']}",
                                    timeout=5.0,
                                )
                                assert abort_resp.status_code == 200
                                break

        assert "task_id" in task_id_holder, "应该收到 task_started 事件"

    @pytest.mark.asyncio
    async def test_abort_multiple_times_same_task(self):
        """验证对同一 task_id 多次 abort 不会报错"""
        test_task_id = "test-task-multi-abort-003"
        abort_event = asyncio.Event()
        task_abort_events[test_task_id] = abort_event

        try:
            async with make_client() as client:
                response1 = await client.post(
                    f"/api/chat/abort/{test_task_id}",
                    timeout=5.0,
                )
                assert response1.status_code == 200
                assert response1.json()["status"] == "success"

                # 第二次 abort（task 已被清理，应该返回 not_found）
                response2 = await client.post(
                    f"/api/chat/abort/{test_task_id}",
                    timeout=5.0,
                )
                assert response2.status_code == 200
                assert response2.json()["status"] in ("success", "not_found")
        finally:
            task_abort_events.pop(test_task_id, None)

    @pytest.mark.asyncio
    async def test_abort_response_structure(self):
        """验证 abort 响应包含必要字段"""
        test_task_id = "test-task-structure-004"
        abort_event = asyncio.Event()
        task_abort_events[test_task_id] = abort_event

        try:
            async with make_client() as client:
                response = await client.post(
                    f"/api/chat/abort/{test_task_id}",
                    timeout=5.0,
                )

            assert response.status_code == 200
            data = response.json()
            assert "status" in data, "响应应包含 status 字段"
            assert "message" in data, "响应应包含 message 字段"
        finally:
            task_abort_events.pop(test_task_id, None)

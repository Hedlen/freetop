#!/usr/bin/env python3
"""
测试配置文件
提供共享的fixtures和测试配置
"""

import os
import sys
import pytest
import tempfile
import shutil
from pathlib import Path

# 添加src目录到Python路径
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'src'))


@pytest.fixture(scope="session")
def project_root():
    """项目根目录"""
    return Path(__file__).parent.parent


@pytest.fixture(scope="session")
def src_dir(project_root):
    """源代码目录"""
    return project_root / "src"


@pytest.fixture(scope="function")
def temp_dir():
    """临时目录fixture"""
    temp_path = tempfile.mkdtemp()
    yield Path(temp_path)
    shutil.rmtree(temp_path, ignore_errors=True)


@pytest.fixture(scope="function")
def mock_env_vars():
    """模拟环境变量"""
    original_env = os.environ.copy()
    
    # 设置测试环境变量
    test_env = {
        'CHROME_HEADLESS': 'true',
        'DATABASE_URL': 'sqlite:///test.db',
        'JWT_SECRET_KEY': 'test_secret_key_for_testing_only',
        'REDIS_URL': 'redis://localhost:6379/1',
        'ENVIRONMENT': 'test'
    }
    
    os.environ.update(test_env)
    
    yield test_env
    
    # 恢复原始环境变量
    os.environ.clear()
    os.environ.update(original_env)


@pytest.fixture(scope="function")
def mock_request_headers():
    """模拟请求头"""
    return {
        'desktop': {
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        'mobile': {
            'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
        },
        'tablet': {
            'user-agent': 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
        },
        'android': {
            'user-agent': 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Mobile Safari/537.36'
        }
    }


@pytest.fixture(scope="function")
def mock_user_settings():
    """模拟用户设置"""
    return {
        'test_user_1': {
            'headless': True,
            'window_size': '1920x1080',
            'proxy': None,
            'user_agent': None
        },
        'test_user_2': {
            'headless': False,
            'window_size': '1366x768',
            'proxy': 'http://proxy.example.com:8080',
            'user_agent': 'Custom User Agent'
        },
        'test_user_mobile': {
            'headless': True,
            'window_size': '375x667',
            'proxy': None,
            'user_agent': None
        }
    }


@pytest.fixture(scope="function")
def mock_jwt_tokens():
    """模拟JWT tokens"""
    return {
        'valid_token': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoidGVzdF91c2VyXzEiLCJleHAiOjk5OTk5OTk5OTl9.test_signature',
        'expired_token': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoidGVzdF91c2VyXzEiLCJleHAiOjF9.test_signature',
        'invalid_token': 'invalid.token.format',
        'malformed_token': 'not_a_jwt_token'
    }


@pytest.fixture(scope="function")
def capture_logs(caplog):
    """捕获日志输出"""
    import logging
    caplog.set_level(logging.DEBUG)
    return caplog


# 测试标记
def pytest_configure(config):
    """配置pytest标记"""
    config.addinivalue_line(
        "markers", "unit: 单元测试"
    )
    config.addinivalue_line(
        "markers", "integration: 集成测试"
    )
    config.addinivalue_line(
        "markers", "functional: 功能测试"
    )
    config.addinivalue_line(
        "markers", "e2e: 端到端测试"
    )
    config.addinivalue_line(
        "markers", "slow: 运行时间较长的测试"
    )
    config.addinivalue_line(
        "markers", "browser: 需要浏览器的测试"
    )
    config.addinivalue_line(
        "markers", "database: 需要数据库的测试"
    )
    config.addinivalue_line(
        "markers", "network: 需要网络连接的测试"
    )


# 测试会话钩子
def pytest_sessionstart(session):
    """测试会话开始时的钩子"""
    print("\n🧪 开始运行测试套件...")


def pytest_sessionfinish(session, exitstatus):
    """测试会话结束时的钩子"""
    if exitstatus == 0:
        print("\n✅ 所有测试通过！")
    else:
        print(f"\n❌ 测试失败，退出码: {exitstatus}")


# 测试收集钩子
def pytest_collection_modifyitems(config, items):
    """修改测试收集项"""
    # 为不同目录的测试添加标记
    for item in items:
        # 获取测试文件的相对路径
        rel_path = os.path.relpath(item.fspath, config.rootdir)
        
        if "unit" in rel_path:
            item.add_marker(pytest.mark.unit)
        elif "integration" in rel_path:
            item.add_marker(pytest.mark.integration)
        elif "functional" in rel_path:
            item.add_marker(pytest.mark.functional)
        elif "e2e" in rel_path:
            item.add_marker(pytest.mark.e2e)
        
        # 为包含特定关键词的测试添加标记
        if "browser" in item.name.lower():
            item.add_marker(pytest.mark.browser)
        if "database" in item.name.lower() or "db" in item.name.lower():
            item.add_marker(pytest.mark.database)
        if "network" in item.name.lower() or "api" in item.name.lower():
            item.add_marker(pytest.mark.network)


# ── Fixtures for supervisor/planner tests ──────────────────────────────────────

@pytest.fixture
def build_mock_state():
    """
    返回一个工厂函数，用于构建 supervisor/planner 测试所需的 State-like dict。

    用法::

        def test_something(build_mock_state):
            state = build_mock_state(next_agent="researcher", repeat_count=0)
    """
    def _factory(
        next_agent: str = "researcher",
        repeat_count: int = 0,
        team_members: list | None = None,
    ) -> dict:
        if team_members is None:
            team_members = ["researcher", "coder", "browser", "reporter"]
        return {
            "messages": [],
            "next": next_agent,
            "repeat_count": repeat_count,
            "team_members": team_members,
            "deep_thinking_mode": False,
            "search_before_planning": False,
            "plan": None,
            "observations": [],
        }

    return _factory


@pytest.fixture
def mock_llm_factory():
    """
    返回一个可配置返回值的 mock LLM 工厂函数。

    用法::

        def test_something(mock_llm_factory):
            llm = mock_llm_factory(response="Hello")
            result = llm.invoke("prompt")
            assert result.content == "Hello"
    """
    from unittest.mock import MagicMock

    def _factory(response: str = "", tool_calls: list | None = None):
        llm = MagicMock()
        ai_message = MagicMock()
        ai_message.content = response
        ai_message.tool_calls = tool_calls or []
        llm.invoke.return_value = ai_message
        llm.ainvoke.return_value = ai_message
        # 支持链式调用 llm | parser
        llm.__or__ = lambda self, other: self
        return llm

    return _factory

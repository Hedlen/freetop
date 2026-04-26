"""
集成测试共享配置：在导入 FastAPI app 之前 mock 掉所有重量级依赖
"""
import sys
import types
from unittest.mock import MagicMock, AsyncMock
from fastapi import APIRouter


def _make_router_module(name: str) -> types.ModuleType:
    """创建一个带有空 APIRouter 的模块 mock"""
    m = types.ModuleType(name)
    m.router = APIRouter()
    return m


def setup_app_mocks():
    """全面 mock 掉 app.py 的导入链，使其可以在测试环境中加载"""

    # ── 第三方库 ──────────────────────────────────────────────────────────────
    mock_markdownify = types.ModuleType("markdownify")
    mock_markdownify.markdownify = lambda x, **kw: x
    sys.modules.setdefault("markdownify", mock_markdownify)

    mock_readabilipy = types.ModuleType("readabilipy")
    mock_readabilipy.simple_json_from_html_string = MagicMock(return_value={})
    sys.modules.setdefault("readabilipy", mock_readabilipy)

    for mod in ["playwright", "playwright.async_api", "playwright.sync_api"]:
        sys.modules.setdefault(mod, types.ModuleType(mod))

    for mod in ["browser_use", "browser_use.agent", "browser_use.agent.service"]:
        sys.modules.setdefault(mod, types.ModuleType(mod))

    for mod in [
        "langchain_community",
        "langchain_community.adapters",
        "langchain_community.adapters.openai",
        "langchain_community.chat_models",
        "langchain_community.chat_models.litellm",
    ]:
        if mod not in sys.modules:
            m = types.ModuleType(mod)
            m.convert_message_to_dict = lambda x: {"role": "assistant", "content": str(x)}
            sys.modules[mod] = m

    # ── src.crawler ───────────────────────────────────────────────────────────
    for mod in [
        "src.crawler",
        "src.crawler.article",
        "src.crawler.crawler",
        "src.crawler.readability_extractor",
        "src.crawler.jina_client",
    ]:
        sys.modules.setdefault(mod, types.ModuleType(mod))

    # ── src.tools（必须是 package，不能直接替换为 ModuleType）────────────────
    # 只 mock 具体子模块，不替换 src.tools 本身
    for mod_name, attrs in [
        ("src.tools.browser", {"browser_tool": MagicMock(), "BrowserTool": MagicMock()}),
        ("src.tools.smart_browser", {"smart_browser_tool": MagicMock(), "SmartBrowserTool": MagicMock()}),
        ("src.tools.crawl", {"crawl_tool": MagicMock()}),
        ("src.tools.python_repl", {"python_repl_tool": MagicMock()}),
        ("src.tools.proxy_manager", {"ProxyManager": MagicMock()}),
    ]:
        if mod_name not in sys.modules:
            m = types.ModuleType(mod_name)
            for attr, val in attrs.items():
                setattr(m, attr, val)
            sys.modules[mod_name] = m

    # ── src.agents ────────────────────────────────────────────────────────────
    for mod_name, attrs in [
        ("src.agents", {"research_agent": MagicMock(), "coder_agent": MagicMock(), "browser_agent": MagicMock()}),
        ("src.agents.agents", {"research_agent": MagicMock(), "coder_agent": MagicMock(), "browser_agent": MagicMock()}),
    ]:
        if mod_name not in sys.modules:
            m = types.ModuleType(mod_name)
            for attr, val in attrs.items():
                setattr(m, attr, val)
            sys.modules[mod_name] = m

    # ── src.llms (stub to avoid langchain_community.chat_models import) ─────
    for mod_name, attrs in [
        ("src.llms", {}),
        ("src.llms.llm", {"get_llm_by_type": MagicMock()}),
        ("src.llms.litellm_v2", {"ChatLiteLLMV2": MagicMock()}),
    ]:
        if mod_name not in sys.modules:
            m = types.ModuleType(mod_name)
            for attr, val in attrs.items():
                setattr(m, attr, val)
            sys.modules[mod_name] = m

    # ── src.graph ─────────────────────────────────────────────────────────────
    # Do NOT mock src.graph.* here — integration tests mock run_agent_workflow
    # directly, so the graph package is never actually called. Mocking it would
    # break unit tests that need to import the real src.graph.nodes module.
    pass

    # ── src.service.workflow_service ──────────────────────────────────────────
    if "src.service.workflow_service" not in sys.modules:
        m = types.ModuleType("src.service.workflow_service")
        m.run_agent_workflow = AsyncMock()
        m.run_simple_chat = AsyncMock()
        sys.modules["src.service.workflow_service"] = m

    # ── src.api.proxy_test（包含 proxy_manager 导入）─────────────────────────
    if "src.api.proxy_test" not in sys.modules:
        sys.modules["src.api.proxy_test"] = _make_router_module("src.api.proxy_test")

    # ── src.routers ───────────────────────────────────────────────────────────
    for mod_name in [
        "src.routers.payments",
        "src.routers.auth",
        "src.routers.subscription",
        "src.routers.chat_secure",
        "src.routers.health",
    ]:
        if mod_name not in sys.modules:
            sys.modules[mod_name] = _make_router_module(mod_name)


# 在模块加载时立即执行
setup_app_mocks()

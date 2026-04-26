"""
Unit tests for supervisor_node routing logic.
Tests: Requirements 6.1, 6.2, 6.3, 6.4, 6.5
"""
import sys
import os
import pytest
from unittest.mock import patch, MagicMock

# Ensure src is importable
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

# ---------------------------------------------------------------------------
# Stub out heavy transitive dependencies BEFORE importing src.graph.nodes
# (markdownify, playwright, browser-use, langchain_community, etc. are not
# installed in the test environment)
# ---------------------------------------------------------------------------
_STUBS = [
    "markdownify",
    "readabilipy",
    "playwright", "playwright.async_api", "playwright.sync_api",
    "browser_use", "browser_use.agent", "browser_use.agent.service",
    "google", "google.protobuf", "google.protobuf.any",
    "langchain_community", "langchain_community.adapters",
    "langchain_community.adapters.openai",
    "langchain_community.chat_models", "langchain_community.chat_models.litellm",
    "langchain_openai", "langchain_deepseek",
    "litellm",
    "src.llms", "src.llms.llm", "src.llms.litellm_v2",
    "src.crawler", "src.crawler.article", "src.crawler.crawler",
    "src.crawler.readability_extractor", "src.crawler.jina_client",
    "src.tools.crawl", "src.tools.browser", "src.tools.smart_browser",
    "src.tools.proxy_manager", "src.tools.python_repl",
    "src.agents", "src.agents.agents",
    "src.tools.search",
    "src.config.agents",
]
for _mod in _STUBS:
    if _mod not in sys.modules:
        sys.modules[_mod] = MagicMock()

# Ensure agent stubs have the required attributes
for _attr in ("research_agent", "coder_agent", "browser_agent"):
    if not hasattr(sys.modules["src.agents"], _attr):
        setattr(sys.modules["src.agents"], _attr, MagicMock())

if not hasattr(sys.modules["src.tools.search"], "search"):
    sys.modules["src.tools.search"].search = MagicMock()

# Ensure src.llms.llm has get_llm_by_type
if not hasattr(sys.modules["src.llms.llm"], "get_llm_by_type"):
    sys.modules["src.llms.llm"].get_llm_by_type = MagicMock()

# Ensure src.config.agents has AGENT_LLM_MAP
if not hasattr(sys.modules["src.config.agents"], "AGENT_LLM_MAP"):
    sys.modules["src.config.agents"].AGENT_LLM_MAP = {
        "supervisor": "basic", "planner": "basic", "researcher": "basic",
        "coder": "basic", "browser": "basic", "reporter": "basic",
    }

# Now safe to import the real module
import src.graph.nodes  # noqa: E402
from langchain_core.messages import HumanMessage  # noqa: E402
from langgraph.types import Command  # noqa: E402


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

TEAM_MEMBERS = ["researcher", "coder", "browser", "reporter"]


def build_mock_state(
    next_agent: str = "researcher",
    repeat_count: int = 0,
    team_members: list | None = None,
) -> dict:
    """Build a minimal State-like dict for supervisor_node tests."""
    return {
        "messages": [HumanMessage(content="test task")],
        "TEAM_MEMBERS": team_members if team_members is not None else TEAM_MEMBERS,
        "TEAM_MEMBER_CONFIGRATIONS": {},
        "next": next_agent,
        "full_plan": "",
        "deep_thinking_mode": False,
        "search_before_planning": False,
        "thread_id": "test-thread",
        "repeat_count": repeat_count,
        "parallel_tasks": [],
        "parallel_results": [],
        "user_id": None,
    }


def make_llm_response(agent_name: str):
    """Return a mock LLM that yields the given agent name as structured output."""
    mock_llm = MagicMock()
    mock_llm.with_structured_output.return_value = mock_llm
    mock_llm.invoke.return_value = {"next": agent_name}
    return mock_llm


# ---------------------------------------------------------------------------
# Tests: normal routing (repeat_count == 0, different agent)
# ---------------------------------------------------------------------------

class TestSupervisorNormalRouting:
    """supervisor_node routes normally when no repeat occurs."""

    def test_routes_to_researcher(self):
        with patch("src.graph.nodes.get_llm_by_type", return_value=make_llm_response("researcher")), \
             patch("src.graph.nodes.apply_prompt_template", return_value=[HumanMessage(content="prompt")]):
            from src.graph.nodes import supervisor_node

            state = build_mock_state(next_agent="coder", repeat_count=0)
            cmd = supervisor_node(state)

            assert isinstance(cmd, Command)
            assert cmd.goto == "researcher"
            assert cmd.update["next"] == "researcher"
            assert cmd.update["repeat_count"] == 0

    def test_routes_to_coder(self):
        with patch("src.graph.nodes.get_llm_by_type", return_value=make_llm_response("coder")), \
             patch("src.graph.nodes.apply_prompt_template", return_value=[HumanMessage(content="prompt")]):
            from src.graph.nodes import supervisor_node

            state = build_mock_state(next_agent="researcher", repeat_count=0)
            cmd = supervisor_node(state)

            assert cmd.goto == "coder"
            assert cmd.update["repeat_count"] == 0


# ---------------------------------------------------------------------------
# Tests: repeat_count == 1 → reroute to planner
# ---------------------------------------------------------------------------

class TestSupervisorRepeatCount1:
    """When the same agent is selected again (repeat_count becomes 1), route to planner."""

    def test_reroutes_to_planner_on_first_repeat(self):
        with patch("src.graph.nodes.get_llm_by_type", return_value=make_llm_response("researcher")), \
             patch("src.graph.nodes.apply_prompt_template", return_value=[HumanMessage(content="prompt")]):
            from src.graph.nodes import supervisor_node

            # LLM returns "researcher" again; state.next is also "researcher"
            state = build_mock_state(next_agent="researcher", repeat_count=0)
            cmd = supervisor_node(state)

            assert cmd.goto == "planner"
            assert cmd.update["repeat_count"] == 1

    def test_reroutes_to_planner_for_any_repeated_agent(self):
        with patch("src.graph.nodes.get_llm_by_type", return_value=make_llm_response("coder")), \
             patch("src.graph.nodes.apply_prompt_template", return_value=[HumanMessage(content="prompt")]):
            from src.graph.nodes import supervisor_node

            state = build_mock_state(next_agent="coder", repeat_count=0)
            cmd = supervisor_node(state)

            assert cmd.goto == "planner"
            assert cmd.update["repeat_count"] == 1


# ---------------------------------------------------------------------------
# Tests: repeat_count >= 2 → terminate
# ---------------------------------------------------------------------------

class TestSupervisorRepeatCountTermination:
    """When repeat_count reaches 2 or more, route to __end__."""

    def test_terminates_at_repeat_count_2(self):
        with patch("src.graph.nodes.get_llm_by_type", return_value=make_llm_response("researcher")), \
             patch("src.graph.nodes.apply_prompt_template", return_value=[HumanMessage(content="prompt")]):
            from src.graph.nodes import supervisor_node

            # repeat_count is already 1, same agent selected again → becomes 2 → terminate
            state = build_mock_state(next_agent="researcher", repeat_count=1)
            cmd = supervisor_node(state)

            assert cmd.goto == "__end__"
            assert cmd.update["repeat_count"] == 2

    def test_terminates_at_repeat_count_3(self):
        with patch("src.graph.nodes.get_llm_by_type", return_value=make_llm_response("researcher")), \
             patch("src.graph.nodes.apply_prompt_template", return_value=[HumanMessage(content="prompt")]):
            from src.graph.nodes import supervisor_node

            # repeat_count is already 2, same agent selected again → becomes 3 → terminate
            state = build_mock_state(next_agent="researcher", repeat_count=2)
            cmd = supervisor_node(state)

            assert cmd.goto == "__end__"
            assert cmd.update["repeat_count"] == 3

    def test_terminates_when_repeat_count_already_high(self):
        with patch("src.graph.nodes.get_llm_by_type", return_value=make_llm_response("coder")), \
             patch("src.graph.nodes.apply_prompt_template", return_value=[HumanMessage(content="prompt")]):
            from src.graph.nodes import supervisor_node

            state = build_mock_state(next_agent="coder", repeat_count=5)
            cmd = supervisor_node(state)

            assert cmd.goto == "__end__"


# ---------------------------------------------------------------------------
# Tests: FINISH routing
# ---------------------------------------------------------------------------

class TestSupervisorFinishRouting:
    """When LLM returns FINISH, supervisor emits goto=__end__ with next=__end__."""

    def test_finish_routes_to_end(self):
        with patch("src.graph.nodes.get_llm_by_type", return_value=make_llm_response("FINISH")), \
             patch("src.graph.nodes.apply_prompt_template", return_value=[HumanMessage(content="prompt")]):
            from src.graph.nodes import supervisor_node

            state = build_mock_state(next_agent="researcher", repeat_count=0)
            cmd = supervisor_node(state)

            assert cmd.goto == "__end__"
            assert cmd.update["next"] == "__end__"

    def test_finish_update_contains_end(self):
        with patch("src.graph.nodes.get_llm_by_type", return_value=make_llm_response("FINISH")), \
             patch("src.graph.nodes.apply_prompt_template", return_value=[HumanMessage(content="prompt")]):
            from src.graph.nodes import supervisor_node

            state = build_mock_state(next_agent="coder", repeat_count=0)
            cmd = supervisor_node(state)

            # Requirement 6.5: update State.next to "__end__"
            assert cmd.update.get("next") == "__end__"


# ---------------------------------------------------------------------------
# Tests: invalid agent name raises ValueError
# ---------------------------------------------------------------------------

class TestSupervisorInvalidAgentValidation:
    """Requirement 6.1: ValueError raised for invalid agent names."""

    def test_raises_value_error_for_unknown_agent(self):
        with patch("src.graph.nodes.get_llm_by_type", return_value=make_llm_response("unknown_agent")), \
             patch("src.graph.nodes.apply_prompt_template", return_value=[HumanMessage(content="prompt")]):
            from src.graph.nodes import supervisor_node

            state = build_mock_state(next_agent="researcher", repeat_count=0)

            with pytest.raises(ValueError, match="invalid agent name"):
                supervisor_node(state)

    def test_raises_value_error_for_empty_string(self):
        with patch("src.graph.nodes.get_llm_by_type", return_value=make_llm_response("")), \
             patch("src.graph.nodes.apply_prompt_template", return_value=[HumanMessage(content="prompt")]):
            from src.graph.nodes import supervisor_node

            state = build_mock_state(next_agent="researcher", repeat_count=0)

            with pytest.raises(ValueError):
                supervisor_node(state)

    def test_valid_agents_do_not_raise(self):
        from src.graph.nodes import supervisor_node

        for agent in TEAM_MEMBERS + ["FINISH"]:
            with patch("src.graph.nodes.get_llm_by_type", return_value=make_llm_response(agent)), \
                 patch("src.graph.nodes.apply_prompt_template", return_value=[HumanMessage(content="prompt")]):
                state = build_mock_state(next_agent="coder", repeat_count=0)
                # Should not raise
                supervisor_node(state)


# ---------------------------------------------------------------------------
# Tests: INFO logging
# ---------------------------------------------------------------------------

class TestSupervisorLogging:
    """Requirement 6.4: routing decision logged at INFO level."""

    def test_logs_goto_and_repeat_count(self, caplog):
        import logging
        with patch("src.graph.nodes.get_llm_by_type", return_value=make_llm_response("researcher")), \
             patch("src.graph.nodes.apply_prompt_template", return_value=[HumanMessage(content="prompt")]):
            from src.graph.nodes import supervisor_node

            state = build_mock_state(next_agent="coder", repeat_count=0)

            with caplog.at_level(logging.INFO, logger="src.graph.nodes"):
                supervisor_node(state)

            log_text = " ".join(caplog.messages)
            assert "researcher" in log_text or "goto" in log_text.lower()

    def test_logs_repeat_count_on_termination(self, caplog):
        import logging
        with patch("src.graph.nodes.get_llm_by_type", return_value=make_llm_response("researcher")), \
             patch("src.graph.nodes.apply_prompt_template", return_value=[HumanMessage(content="prompt")]):
            from src.graph.nodes import supervisor_node

            state = build_mock_state(next_agent="researcher", repeat_count=1)

            with caplog.at_level(logging.INFO, logger="src.graph.nodes"):
                supervisor_node(state)

            log_text = " ".join(caplog.messages)
            assert "repeat_count" in log_text or "2" in log_text

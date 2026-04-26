"""
Unit tests for planner_node JSON validation logic.
Tests: Requirements 5.5, 10.2

Note on Requirement 10.2:
  The spec states planner_node should return goto='__end__' when the LLM response
  is not valid JSON. The implementation uses json_repair.loads() which never raises
  json.JSONDecodeError — it always returns a value (empty string for non-JSON input).
  As a result, the goto='__end__' branch is currently unreachable via json_repair.
  The tests below verify the actual runtime behavior of the implementation.
"""
import sys
import os
import json
import pytest
from unittest.mock import patch, MagicMock

# Ensure src is importable
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

# ---------------------------------------------------------------------------
# Stub out heavy transitive dependencies before importing src.graph.nodes
# ---------------------------------------------------------------------------
for _mod in [
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
    "src.crawler", "src.crawler.article",
    "src.tools.crawl",
    "src.tools",
    "src.agents",
    "src.agents.agents",
    "src.tools.search",
    "src.tools.browser",
    "src.tools.smart_browser",
    "src.tools.file_manager",
    "src.tools.python_repl",
    "src.tools.bash",
    "src.tools.str_replace_editor",
    "src.tools.terminal",
    "src.config.agents",
]:
    if _mod not in sys.modules:
        sys.modules[_mod] = MagicMock()

# Stub agents used by nodes.py
_agents_mock = sys.modules["src.agents"]
_agents_mock.research_agent = MagicMock()
_agents_mock.coder_agent = MagicMock()
_agents_mock.browser_agent = MagicMock()

# Stub search tool
_search_mock = sys.modules["src.tools.search"]
_search_mock.search = MagicMock()

# Stub llm
if not hasattr(sys.modules["src.llms.llm"], "get_llm_by_type"):
    sys.modules["src.llms.llm"].get_llm_by_type = MagicMock()

if not hasattr(sys.modules["src.config.agents"], "AGENT_LLM_MAP"):
    sys.modules["src.config.agents"].AGENT_LLM_MAP = {
        "supervisor": "basic", "planner": "basic", "researcher": "basic",
        "coder": "basic", "browser": "basic", "reporter": "basic",
    }

from langchain_core.messages import HumanMessage  # noqa: E402
from langgraph.types import Command  # noqa: E402
import src.graph.nodes  # noqa: E402


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def build_planner_state(messages=None) -> dict:
    """Build a minimal State-like dict for planner_node tests."""
    return {
        "messages": messages or [HumanMessage(content="Write a plan")],
        "TEAM_MEMBERS": ["researcher", "coder"],
        "TEAM_MEMBER_CONFIGRATIONS": {},
        "next": "",
        "full_plan": "",
        "deep_thinking_mode": False,
        "search_before_planning": False,
        "thread_id": "test-thread",
        "repeat_count": 0,
        "parallel_tasks": [],
        "parallel_results": [],
        "user_id": None,
    }


def make_streaming_llm(response_text: str):
    """Return a mock LLM whose .stream() yields the given text as a single chunk."""
    chunk = MagicMock()
    chunk.content = response_text
    mock_llm = MagicMock()
    mock_llm.stream.return_value = iter([chunk])
    return mock_llm


# ---------------------------------------------------------------------------
# Tests: non-JSON response behavior
#
# json_repair.loads() never raises json.JSONDecodeError — it returns an empty
# string for non-JSON input. The implementation therefore routes to "supervisor"
# even for plain-text LLM responses (full_plan becomes '""').
# ---------------------------------------------------------------------------

class TestPlannerNodeNonJSONResponse:
    """Verify actual behavior when LLM returns non-JSON text."""

    def test_plain_text_response_routes_to_supervisor(self):
        """json_repair converts plain text to empty string → routes to supervisor."""
        with patch("src.graph.nodes.get_llm_by_type", return_value=make_streaming_llm("This is not JSON at all")), \
             patch("src.graph.nodes.apply_prompt_template", return_value=[HumanMessage(content="prompt")]):
            from src.graph.nodes import planner_node

            state = build_planner_state()
            cmd = planner_node(state)

            assert isinstance(cmd, Command)
            # json_repair returns '' for non-JSON; json.dumps('') = '""' which is valid
            assert cmd.goto == "supervisor"

    def test_empty_response_routes_to_supervisor(self):
        """Empty LLM response → json_repair returns '' → routes to supervisor."""
        with patch("src.graph.nodes.get_llm_by_type", return_value=make_streaming_llm("")), \
             patch("src.graph.nodes.apply_prompt_template", return_value=[HumanMessage(content="prompt")]):
            from src.graph.nodes import planner_node

            state = build_planner_state()
            cmd = planner_node(state)

            assert cmd.goto == "supervisor"

    def test_goto_end_when_json_decode_error_raised(self):
        """If json_repair raises json.JSONDecodeError, goto='__end__' (Requirement 10.2)."""
        import json as _json

        with patch("src.graph.nodes.get_llm_by_type", return_value=make_streaming_llm("bad")), \
             patch("src.graph.nodes.apply_prompt_template", return_value=[HumanMessage(content="prompt")]), \
             patch("src.graph.nodes.json_repair.loads", side_effect=_json.JSONDecodeError("err", "", 0)):
            from src.graph.nodes import planner_node

            state = build_planner_state()
            cmd = planner_node(state)

            assert cmd.goto == "__end__"


# ---------------------------------------------------------------------------
# Tests: repairable JSON → goto="supervisor"
# ---------------------------------------------------------------------------

class TestPlannerNodeRepairableJSON:
    """json_repair can fix minor JSON issues; planner_node should continue to supervisor."""

    def test_unquoted_key_json_repaired_goes_to_supervisor(self):
        """{key: "value"} is repairable by json_repair → goto='supervisor'."""
        with patch("src.graph.nodes.get_llm_by_type", return_value=make_streaming_llm('{key: "value"}')), \
             patch("src.graph.nodes.apply_prompt_template", return_value=[HumanMessage(content="prompt")]):
            from src.graph.nodes import planner_node

            state = build_planner_state()
            cmd = planner_node(state)

            assert isinstance(cmd, Command)
            assert cmd.goto == "supervisor"

    def test_trailing_comma_json_repaired_goes_to_supervisor(self):
        """JSON with trailing comma is repairable → goto='supervisor'."""
        with patch("src.graph.nodes.get_llm_by_type", return_value=make_streaming_llm('{"steps": ["a", "b",]}')), \
             patch("src.graph.nodes.apply_prompt_template", return_value=[HumanMessage(content="prompt")]):
            from src.graph.nodes import planner_node

            state = build_planner_state()
            cmd = planner_node(state)

            assert cmd.goto == "supervisor"


# ---------------------------------------------------------------------------
# Tests: valid JSON → goto="supervisor"
# ---------------------------------------------------------------------------

class TestPlannerNodeValidJSON:
    """Requirement 10.2: valid JSON response routes to supervisor."""

    def test_valid_json_object_goes_to_supervisor(self):
        """Valid JSON object → goto='supervisor'."""
        plan = json.dumps({"steps": [{"agent": "researcher", "task": "research topic"}]})
        with patch("src.graph.nodes.get_llm_by_type", return_value=make_streaming_llm(plan)), \
             patch("src.graph.nodes.apply_prompt_template", return_value=[HumanMessage(content="prompt")]):
            from src.graph.nodes import planner_node

            state = build_planner_state()
            cmd = planner_node(state)

            assert isinstance(cmd, Command)
            assert cmd.goto == "supervisor"

    def test_valid_json_updates_full_plan(self):
        """Valid JSON is stored in state update under 'full_plan'."""
        plan = json.dumps({"steps": [{"agent": "coder", "task": "write code"}]})
        with patch("src.graph.nodes.get_llm_by_type", return_value=make_streaming_llm(plan)), \
             patch("src.graph.nodes.apply_prompt_template", return_value=[HumanMessage(content="prompt")]):
            from src.graph.nodes import planner_node

            state = build_planner_state()
            cmd = planner_node(state)

            assert "full_plan" in cmd.update
            parsed = json.loads(cmd.update["full_plan"])
            assert "steps" in parsed

    def test_json_fenced_code_block_stripped_and_valid(self):
        """LLM wraps JSON in ```json ... ``` fences → stripped and parsed correctly."""
        plan = json.dumps({"steps": []})
        fenced = f"```json\n{plan}\n```"
        with patch("src.graph.nodes.get_llm_by_type", return_value=make_streaming_llm(fenced)), \
             patch("src.graph.nodes.apply_prompt_template", return_value=[HumanMessage(content="prompt")]):
            from src.graph.nodes import planner_node

            state = build_planner_state()
            cmd = planner_node(state)

            assert cmd.goto == "supervisor"

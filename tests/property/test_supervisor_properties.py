"""
Hypothesis property tests for supervisor_node.

Property 6: Supervisor 路由重复计数与终止
  Validates: Requirements 6.2, 6.3

Property 7: Supervisor 无效路由拒绝
  Validates: Requirements 6.1
"""
import sys
import pytest
from unittest.mock import patch, MagicMock
from hypothesis import given, settings, assume
from hypothesis import strategies as st

# ---------------------------------------------------------------------------
# Stub out heavy transitive dependencies BEFORE importing src.graph.nodes
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

for _attr in ("research_agent", "coder_agent", "browser_agent"):
    if not hasattr(sys.modules["src.agents"], _attr):
        setattr(sys.modules["src.agents"], _attr, MagicMock())

if not hasattr(sys.modules["src.tools.search"], "search"):
    sys.modules["src.tools.search"].search = MagicMock()

if not hasattr(sys.modules["src.llms.llm"], "get_llm_by_type"):
    sys.modules["src.llms.llm"].get_llm_by_type = MagicMock()

if not hasattr(sys.modules["src.config.agents"], "AGENT_LLM_MAP"):
    sys.modules["src.config.agents"].AGENT_LLM_MAP = {
        "supervisor": "basic", "planner": "basic", "researcher": "basic",
        "coder": "basic", "browser": "basic", "reporter": "basic",
    }

import src.graph.nodes  # noqa: E402  — ensure real module is loaded
from langchain_core.messages import HumanMessage  # noqa: E402
from langgraph.types import Command  # noqa: E402


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

TEAM_MEMBERS = ["researcher", "coder", "browser", "reporter"]
VALID_OPTIONS = TEAM_MEMBERS + ["FINISH"]


def build_mock_state(next_agent: str, repeat_count: int) -> dict:
    return {
        "messages": [HumanMessage(content="test task")],
        "TEAM_MEMBERS": TEAM_MEMBERS,
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
    mock_llm = MagicMock()
    mock_llm.with_structured_output.return_value = mock_llm
    mock_llm.invoke.return_value = {"next": agent_name}
    return mock_llm


# ---------------------------------------------------------------------------
# Property 6: Supervisor 路由重复计数与终止
# Validates: Requirements 6.2, 6.3
# ---------------------------------------------------------------------------

@given(
    agent=st.sampled_from(TEAM_MEMBERS),
    repeat_count=st.integers(min_value=0, max_value=5),
)
@settings(max_examples=100, deadline=None)
@patch("src.graph.nodes.apply_prompt_template")
@patch("src.graph.nodes.get_llm_by_type")
def test_property6_supervisor_repeat_count_routing(
    mock_llm_factory, mock_template, agent, repeat_count
):
    """
    Property 6: Supervisor 路由重复计数与终止

    For any agent and repeat_count:
    - repeat_count == 0 (different agent selected): routes to that agent
    - repeat_count becomes 1 (same agent repeated once): routes to planner
    - repeat_count >= 2 (same agent repeated twice+): routes to __end__

    Validates: Requirements 6.2, 6.3
    """
    from src.graph.nodes import supervisor_node

    mock_template.return_value = [HumanMessage(content="prompt")]
    # LLM returns the same agent as state.next to trigger repeat logic
    mock_llm_factory.return_value = make_llm_response(agent)

    state = build_mock_state(next_agent=agent, repeat_count=repeat_count)
    cmd = supervisor_node(state)

    new_repeat_count = repeat_count + 1  # same agent selected → increments

    if new_repeat_count == 1:
        # First repeat: reroute to planner
        assert cmd.goto == "planner", (
            f"Expected planner for repeat_count={repeat_count}+1=1, got {cmd.goto}"
        )
    else:
        # repeat_count >= 2: terminate
        assert cmd.goto == "__end__", (
            f"Expected __end__ for repeat_count={repeat_count}+1={new_repeat_count}, got {cmd.goto}"
        )


@given(
    agent=st.sampled_from(TEAM_MEMBERS),
    prev_agent=st.sampled_from(TEAM_MEMBERS),
)
@settings(max_examples=100, deadline=None)
@patch("src.graph.nodes.apply_prompt_template")
@patch("src.graph.nodes.get_llm_by_type")
def test_property6_no_repeat_resets_count(
    mock_llm_factory, mock_template, agent, prev_agent
):
    """
    Property 6 (corollary): When a different agent is selected, repeat_count resets to 0.

    Validates: Requirements 6.2
    """
    assume(agent != prev_agent)

    from src.graph.nodes import supervisor_node

    mock_template.return_value = [HumanMessage(content="prompt")]
    mock_llm_factory.return_value = make_llm_response(agent)

    # prev_agent != agent, so no repeat
    state = build_mock_state(next_agent=prev_agent, repeat_count=3)
    cmd = supervisor_node(state)

    assert cmd.update["repeat_count"] == 0, (
        f"Expected repeat_count reset to 0 when switching agents, got {cmd.update['repeat_count']}"
    )
    assert cmd.goto == agent


# ---------------------------------------------------------------------------
# Property 7: Supervisor 无效路由拒绝
# Validates: Requirements 6.1
# ---------------------------------------------------------------------------

@given(
    invalid_agent=st.text(
        alphabet=st.characters(whitelist_categories=("Ll", "Lu", "Nd")),
        min_size=1,
        max_size=30,
    )
)
@settings(max_examples=100, deadline=None)
@patch("src.graph.nodes.apply_prompt_template")
@patch("src.graph.nodes.get_llm_by_type")
def test_property7_invalid_agent_raises_value_error(
    mock_llm_factory, mock_template, invalid_agent
):
    """
    Property 7: Supervisor 无效路由拒绝

    For any LLM response that contains an agent name not in TEAM_MEMBERS + ["FINISH"],
    supervisor_node should raise a ValueError.

    Validates: Requirements 6.1
    """
    assume(invalid_agent not in VALID_OPTIONS)
    assume(len(invalid_agent) > 0)

    from src.graph.nodes import supervisor_node

    mock_template.return_value = [HumanMessage(content="prompt")]
    mock_llm_factory.return_value = make_llm_response(invalid_agent)

    state = build_mock_state(next_agent="researcher", repeat_count=0)

    with pytest.raises(ValueError):
        supervisor_node(state)


@given(agent=st.sampled_from(VALID_OPTIONS))
@settings(max_examples=50, deadline=None)
@patch("src.graph.nodes.apply_prompt_template")
@patch("src.graph.nodes.get_llm_by_type")
def test_property7_valid_agents_never_raise(
    mock_llm_factory, mock_template, agent
):
    """
    Property 7 (inverse): Valid agent names must never raise ValueError.

    Validates: Requirements 6.1
    """
    from src.graph.nodes import supervisor_node

    mock_template.return_value = [HumanMessage(content="prompt")]
    mock_llm_factory.return_value = make_llm_response(agent)

    # Use a different prev_next to avoid repeat logic interfering
    state = build_mock_state(next_agent="__none__", repeat_count=0)

    # Should not raise ValueError for valid options
    try:
        supervisor_node(state)
    except ValueError as e:
        pytest.fail(f"Valid agent '{agent}' raised ValueError: {e}")

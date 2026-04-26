import logging
import json
import json_repair
import logging
from copy import deepcopy
from typing import Literal
from langchain_core.messages import HumanMessage, BaseMessage

import json_repair
from langchain_core.messages import HumanMessage
from langgraph.types import Command, Send

from src.agents import research_agent, coder_agent, browser_agent
from src.llms.llm import get_llm_by_type
from src.config import TEAM_MEMBERS
from src.config.agents import AGENT_LLM_MAP
from src.prompts.template import apply_prompt_template
from src.tools.search import search
from src.utils.json_utils import repair_json_output
from .types import State, Router

logger = logging.getLogger(__name__)

RESPONSE_FORMAT = "Response from {}:\n\n<response>\n{}\n</response>\n\n*Please execute the next step.*"


def research_node(state: State) -> Command[Literal["supervisor"]]:
    """Node for the researcher agent that performs research tasks."""
    logger.info("Research agent starting task")
    result = research_agent.invoke(state)
    logger.info("Research agent completed task")
    response_content = result["messages"][-1].content
    # 尝试修复可能的JSON输出
    response_content = repair_json_output(response_content)
    logger.debug(f"Research agent response: {response_content}")
    return Command(
        update={
            "messages": [
                HumanMessage(
                    content=response_content,
                    name="researcher",
                )
            ]
        },
        goto="supervisor",
    )


def code_node(state: State) -> Command[Literal["supervisor"]]:
    """Node for the coder agent that executes Python code."""
    logger.info("Code agent starting task")
    result = coder_agent.invoke(state)
    logger.info("Code agent completed task")
    response_content = result["messages"][-1].content
    # 尝试修复可能的JSON输出
    response_content = repair_json_output(response_content)
    logger.debug(f"Code agent response: {response_content}")
    return Command(
        update={
            "messages": [
                HumanMessage(
                    content=response_content,
                    name="coder",
                )
            ]
        },
        goto="supervisor",
    )


def browser_node(state: State) -> Command[Literal["supervisor"]]:
    """Node for the browser agent that performs web browsing tasks."""
    logger.info("Browser agent starting task")
    
    # 获取用户特定的browser_tool
    from src.service.workflow_service import current_browser_tool
    if current_browser_tool:
        # 使用用户特定的browser_tool创建临时agent
        from src.agents.agents import create_agent
        user_id = state.get("user_id")
        temp_browser_agent = create_agent("browser", [current_browser_tool], "browser", user_id)
        result = temp_browser_agent.invoke(state)
    else:
        # 回退到默认的browser_agent
        result = browser_agent.invoke(state)
    
    logger.info("Browser agent completed task")
    response_content = result["messages"][-1].content
    # 尝试修复可能的JSON输出
    response_content = repair_json_output(response_content)
    logger.debug(f"Browser agent response: {response_content}")
    return Command(
        update={
            "messages": [
                HumanMessage(
                    content=response_content,
                    name="browser",
                )
            ]
        },
        goto="supervisor",
    )


def supervisor_node(state: State) -> Command[Literal[*TEAM_MEMBERS, "__end__"]]:
    """Supervisor node that decides which agent should act next."""
    logger.info("Supervisor evaluating next action")
    messages = apply_prompt_template("supervisor", state)
    # preprocess messages to make supervisor execute better.
    messages = deepcopy(messages)
    for message in messages:
        if isinstance(message, BaseMessage) and message.name in TEAM_MEMBERS:
            message.content = RESPONSE_FORMAT.format(message.name, message.content)
    user_id = state.get("user_id")
    response = (
        get_llm_by_type(AGENT_LLM_MAP["supervisor"], user_id)
        .with_structured_output(schema=Router, method="json_mode")
        .invoke(messages)
    )
    goto = response["next"]
    logger.debug(f"Current state messages: {state['messages']}")
    logger.debug(f"Supervisor response: {response}")

    # 校验 LLM 返回的 agent 名称是否合法
    valid_options = state.get("TEAM_MEMBERS", TEAM_MEMBERS) + ["FINISH"]
    if goto not in valid_options:
        raise ValueError(
            f"Supervisor returned invalid agent name '{goto}'. "
            f"Valid options are: {valid_options}"
        )

    # 防止在同一代理上反复循环：基于上一次的 next 以及重复计数进行限流
    prev_next = state.get("next")
    repeat_count = state.get("repeat_count", 0)
    if prev_next == goto:
        repeat_count += 1
    else:
        repeat_count = 0

    # 当同一代理连续被选中时，尝试回退到 planner 做一次重新规划；
    # 若仍然无法收敛（repeat_count >= 2），则结束本轮，避免无限循环。
    if goto != "FINISH" and prev_next == goto:
        if repeat_count == 1:
            logger.info(f"Detected repeated delegation to {goto}, rerouting to planner for replanning")
            goto = "planner"
        elif repeat_count >= 2:
            logger.info(f"Repeated delegation persists (repeat_count={repeat_count}), terminating workflow to avoid loops")
            goto = "__end__"

    if goto == "FINISH":
        logger.info(f"Workflow completed, goto=__end__, repeat_count={repeat_count}")
        return Command(goto="__end__", update={"next": "__end__", "repeat_count": repeat_count})

    logger.info(f"Supervisor routing decision: goto={goto}, repeat_count={repeat_count}")
    return Command(goto=goto, update={"next": goto, "repeat_count": repeat_count})



def planner_node(state: State) -> Command[Literal["supervisor", "__end__"]]:
    """Planner node that generate the full plan."""
    logger.info("Planner generating full plan")
    messages = apply_prompt_template("planner", state)
    # whether to enable deep thinking mode
    user_id = state.get("user_id")
    llm = get_llm_by_type("basic", user_id)
    if state.get("deep_thinking_mode"):
        llm = get_llm_by_type("reasoning", user_id)
    if state.get("search_before_planning"):
        # 从state中获取user_id，如果没有则为None
        user_id = state.get("user_id")
        searched_content = search.invoke({"query": state["messages"][-1].content, "user_id": user_id})
        if isinstance(searched_content, list):
            messages = deepcopy(messages)
            messages[
                -1
            ].content += f"\n\n# Relative Search Results\n\n{json.dumps([{'title': elem['title'], 'content': elem['content']} for elem in searched_content], ensure_ascii=False)}"
        else:
            logger.error(
                f"Tavily search returned malformed response: {searched_content}"
            )
    stream = llm.stream(messages)
    full_response = ""
    for chunk in stream:
        full_response += chunk.content
    logger.debug(f"Current state messages: {state['messages']}")
    logger.debug(f"Planner response: {full_response}")

    if full_response.startswith("```json"):
        full_response = full_response.removeprefix("```json")

    if full_response.endswith("```"):
        full_response = full_response.removesuffix("```")

    goto = "supervisor"
    try:
        repaired_response = json_repair.loads(full_response)
        full_response = json.dumps(repaired_response)
    except json.JSONDecodeError:
        logger.warning("Planner response is not a valid JSON")
        goto = "__end__"

    return Command(
        update={
            "messages": [HumanMessage(content=full_response, name="planner")],
            "full_plan": full_response,
        },
        goto=goto,
    )


def parallel_dispatch_node(state: State):
    """Dispatch parallel tasks to agent nodes using LangGraph Send API."""
    tasks = state.get("parallel_tasks", [])
    if not tasks:
        logger.info("No parallel tasks found, routing to supervisor")
        return Command(goto="supervisor")
    logger.info(f"Dispatching {len(tasks)} parallel tasks")
    return [Send(task["agent"], {**state, "current_task": task}) for task in tasks]


def parallel_merge_node(state: State) -> Command[Literal["supervisor"]]:
    """Merge results from all parallel agent tasks into a single HumanMessage."""
    parallel_results = state.get("parallel_results", [])
    logger.info(f"Merging {len(parallel_results)} parallel task results")

    segments = []
    for r in parallel_results:
        try:
            agent_name = r["agent"]
            content = r["content"]
            segments.append(f"[{agent_name}]: {content}")
        except Exception as e:
            agent_name = r.get("agent", "unknown") if isinstance(r, dict) else "unknown"
            error_msg = f"ERROR: {e}"
            segments.append(f"[{agent_name}]: {error_msg}")
            logger.warning(f"Error processing parallel result for agent '{agent_name}': {e}")

    merged = "\n\n---\n\n".join(segments)
    return Command(
        update={"messages": [HumanMessage(content=merged, name="parallel_merge")]},
        goto="supervisor",
    )


def coordinator_node(state: State) -> Command[Literal["planner", "__end__"]]:
    """Coordinator node that communicate with customers."""
    logger.info("Coordinator talking.")
    messages = apply_prompt_template("coordinator", state)
    user_id = state.get("user_id")
    response = get_llm_by_type(AGENT_LLM_MAP["coordinator"], user_id).invoke(messages)
    logger.debug(f"Current state messages: {state['messages']}")
    response_content = response.content
    # 尝试修复可能的JSON输出
    response_content = repair_json_output(response_content)
    logger.debug(f"Coordinator response: {response_content}")

    goto = "__end__"
    if "handoff_to_planner" in response_content:
        goto = "planner"

    # 更新response.content为修复后的内容
    response.content = response_content

    return Command(
        goto=goto,
    )


def reporter_node(state: State) -> Command[Literal["supervisor"]]:
    """Reporter node that write a final report."""
    logger.info("Reporter write final report")
    messages = apply_prompt_template("reporter", state)
    user_id = state.get("user_id")
    response = get_llm_by_type(AGENT_LLM_MAP["reporter"], user_id).invoke(messages)
    logger.debug(f"Current state messages: {state['messages']}")
    response_content = response.content
    # 尝试修复可能的JSON输出
    response_content = repair_json_output(response_content)
    logger.debug(f"reporter response: {response_content}")

    return Command(
        update={
            "messages": [
                HumanMessage(
                    content=response_content,
                    name="reporter",
                )
            ]
        },
        goto="supervisor",
    )

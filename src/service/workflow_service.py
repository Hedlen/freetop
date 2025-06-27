import logging
from typing import Optional
import asyncio

from src.config import TEAM_MEMBER_CONFIGRATIONS, TEAM_MEMBERS
from src.graph import build_graph
from src.tools.browser import browser_tool
from src.tools.smart_browser import smart_browser_tool
from langchain_community.adapters.openai import convert_message_to_dict
import uuid

# Configure logging
logging.basicConfig(
    level=logging.INFO,  # Default level is INFO
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)


def enable_debug_logging():
    """Enable debug level logging for more detailed execution information."""
    logging.getLogger("src").setLevel(logging.DEBUG)


logger = logging.getLogger(__name__)

# Create the graph
graph = build_graph()

# Cache for coordinator messages
MAX_CACHE_SIZE = 3

# Global variable to track current browser tool instance
current_browser_tool: Optional[browser_tool] = None
current_smart_browser_tool: Optional = None

def set_current_smart_browser_tool(tool_instance):
    """设置当前的智能浏览器工具实例"""
    global current_smart_browser_tool
    current_smart_browser_tool = tool_instance

def get_current_smart_browser_tool():
    """获取当前的智能浏览器工具实例"""
    return current_smart_browser_tool


async def run_agent_workflow(
    user_input_messages: list,
    debug: Optional[bool] = False,
    deep_thinking_mode: Optional[bool] = False,
    search_before_planning: Optional[bool] = False,
    team_members: Optional[list] = None,
    abort_event: Optional[asyncio.Event] = None,
    user_id: Optional[int] = None,
):
    """Run the agent workflow to process and respond to user input messages.

    This function orchestrates the execution of various agents in a workflow to handle
    user requests. It manages agent communication, tool usage, and generates streaming
    events for the workflow progress.

    Args:
        user_input_messages: List of user messages to process in the workflow
        debug: If True, enables debug level logging for detailed execution information
        deep_thinking_mode: If True, enables more thorough analysis and consideration
            in agent responses
        search_before_planning: If True, performs preliminary research before creating
            the execution plan
        team_members: Optional list of specific team members to involve in the workflow.
            If None, uses default TEAM_MEMBERS configuration
        abort_event: Optional asyncio.Event that can be set to abort the workflow

    Returns:
        Yields various event dictionaries containing workflow state and progress information,
        including agent activities, tool calls, and the final workflow state

    Raises:
        ValueError: If user_input_messages is empty
        asyncio.CancelledError: If the workflow is cancelled during execution
    """
    if not user_input_messages:
        raise ValueError("Input could not be empty")

    if debug:
        enable__logging()

    logger.info(f"Starting workflow with user input: {user_input_messages}")

    workflow_id = str(uuid.uuid4())

    team_members = team_members if team_members else TEAM_MEMBERS

    streaming_llm_agents = [*team_members, "planner", "coordinator"]

    # Reset coordinator cache at the start of each workflow
    global current_browser_tool
    coordinator_cache = []
    
    # Create browser tool with user-specific configuration
    if user_id:
        from src.tools.browser import create_browser_config, BrowserTool
        from src.tools.browser import Browser
        user_browser_config = create_browser_config(user_id)
        user_browser = Browser(config=user_browser_config)
        current_browser_tool = BrowserTool()
        current_browser_tool.browser = user_browser
    else:
        current_browser_tool = browser_tool
    is_handoff_case = False
    is_workflow_triggered = False

    try:
        async for event in graph.astream_events(
            {
                # Constants
                "TEAM_MEMBERS": team_members,
                "TEAM_MEMBER_CONFIGRATIONS": TEAM_MEMBER_CONFIGRATIONS,
                # Runtime Variables
                "messages": user_input_messages,
                "deep_thinking_mode": deep_thinking_mode,
                "search_before_planning": search_before_planning,
                "user_id": user_id,
            },
            version="v2",
        ):
            # Check for abort signal
            if abort_event and abort_event.is_set():
                logger.info("Abort signal received, terminating workflow")
                if current_browser_tool:
                    await current_browser_tool.terminate()
                if current_smart_browser_tool:
                    await current_smart_browser_tool.terminate()
                raise asyncio.CancelledError("Workflow aborted by user request")
            kind = event.get("event")
            data = event.get("data")
            name = event.get("name")
            metadata = event.get("metadata")
            node = (
                ""
                if (metadata.get("checkpoint_ns") is None)
                else metadata.get("checkpoint_ns").split(":")[0]
            )
            langgraph_step = (
                ""
                if (metadata.get("langgraph_step") is None)
                else str(metadata["langgraph_step"])
            )
            run_id = "" if (event.get("run_id") is None) else str(event["run_id"])

            if kind == "on_chain_start" and name in streaming_llm_agents:
                if name == "planner":
                    is_workflow_triggered = True
                    yield {
                        "event": "start_of_workflow",
                        "data": {
                            "workflow_id": workflow_id,
                            "input": user_input_messages,
                        },
                    }
                ydata = {
                    "event": "start_of_agent",
                    "data": {
                        "agent_name": name,
                        "agent_id": f"{workflow_id}_{name}_{langgraph_step}",
                    },
                }
            elif kind == "on_chain_end" and name in streaming_llm_agents:
                ydata = {
                    "event": "end_of_agent",
                    "data": {
                        "agent_name": name,
                        "agent_id": f"{workflow_id}_{name}_{langgraph_step}",
                    },
                }
            elif kind == "on_chat_model_start" and node in streaming_llm_agents:
                ydata = {
                    "event": "start_of_llm",
                    "data": {"agent_name": node},
                }
            elif kind == "on_chat_model_end" and node in streaming_llm_agents:
                ydata = {
                    "event": "end_of_llm",
                    "data": {"agent_name": node},
                }
            elif kind == "on_chat_model_stream" and node in streaming_llm_agents:
                content = data["chunk"].content
                if content is None or content == "":
                    if not data["chunk"].additional_kwargs.get("reasoning_content"):
                        # Skip empty messages
                        continue
                    ydata = {
                        "event": "message",
                        "data": {
                            "message_id": data["chunk"].id,
                            "delta": {
                                "reasoning_content": (
                                    data["chunk"].additional_kwargs["reasoning_content"]
                                )
                            },
                        },
                    }
                else:
                    # Check if the message is from the coordinator
                    if node == "coordinator":
                        if len(coordinator_cache) < MAX_CACHE_SIZE:
                            coordinator_cache.append(content)
                            cached_content = "".join(coordinator_cache)
                            if cached_content.startswith("handoff"):
                                is_handoff_case = True
                                continue
                            if len(coordinator_cache) < MAX_CACHE_SIZE:
                                continue
                            # Send the cached message
                            ydata = {
                                "event": "message",
                                "data": {
                                    "message_id": data["chunk"].id,
                                    "delta": {"content": cached_content},
                                },
                            }
                        elif not is_handoff_case:
                            # For other agents, send the message directly
                            ydata = {
                                "event": "message",
                                "data": {
                                    "message_id": data["chunk"].id,
                                    "delta": {"content": content},
                                },
                            }
                    else:
                        # For other agents, send the message directly
                        ydata = {
                            "event": "message",
                            "data": {
                                "message_id": data["chunk"].id,
                                "delta": {"content": content},
                            },
                        }
            elif kind == "on_tool_start" and node in team_members:
                ydata = {
                    "event": "tool_call",
                    "data": {
                        "tool_call_id": f"{workflow_id}_{node}_{name}_{run_id}",
                        "tool_name": name,
                        "tool_input": data.get("input"),
                    },
                }
            elif kind == "on_tool_end" and node in team_members:
                ydata = {
                    "event": "tool_call_result",
                    "data": {
                        "tool_call_id": f"{workflow_id}_{node}_{name}_{run_id}",
                        "tool_name": name,
                        "tool_result": (
                            data["output"].content if data.get("output") and hasattr(data["output"], "content") 
                            else str(data["output"]) if data.get("output") else ""
                        ),
                    },
                }
            else:
                continue
            yield ydata
    except asyncio.CancelledError:
        logger.info("Workflow cancelled, terminating browser agent if exists")
        if current_browser_tool:
            try:
                await current_browser_tool.terminate()
            except Exception as terminate_error:
                logger.warning(f"终止浏览器工具时出现警告: {terminate_error}")
        if current_smart_browser_tool:
            try:
                await current_smart_browser_tool.terminate()
            except Exception as terminate_error:
                logger.warning(f"终止智能浏览器工具时出现警告: {terminate_error}")
        raise
    finally:
        # 确保在工作流结束时清理浏览器实例
        if current_browser_tool:
            try:
                # 调用terminate方法进行完整清理
                await current_browser_tool.terminate()
                logger.info("浏览器工具已完全清理")
            except Exception as cleanup_error:
                logger.warning(f"清理浏览器工具时出现警告: {cleanup_error}")
            finally:
                current_browser_tool = None
        
        if current_smart_browser_tool:
            try:
                # 调用terminate方法进行完整清理
                await current_smart_browser_tool.terminate()
                logger.info("智能浏览器工具已完全清理")
            except Exception as cleanup_error:
                logger.warning(f"清理智能浏览器工具时出现警告: {cleanup_error}")
            finally:
                current_smart_browser_tool = None

    if is_workflow_triggered:
        # TODO: remove messages attributes after Frontend being compatible with final_session_state event.
        def safe_convert_message(msg):
            """安全地转换消息，处理可能的转换错误"""
            try:
                return convert_message_to_dict(msg)
            except Exception as e:
                logger.warning(f"Failed to convert message to dict: {e}")
                # 返回一个安全的默认格式
                return {
                    "role": getattr(msg, 'role', 'user'),
                    "content": str(getattr(msg, 'content', ''))
                }
        
        yield {
            "event": "end_of_workflow",
            "data": {
                "workflow_id": workflow_id,
                "messages": [
                    safe_convert_message(msg)
                    for msg in data["output"].get("messages", [])
                ],
            },
        }
    def safe_convert_message(msg):
        """安全地转换消息，处理可能的转换错误"""
        try:
            return convert_message_to_dict(msg)
        except Exception as e:
            logger.warning(f"Failed to convert message to dict: {e}")
            # 返回一个安全的默认格式
            return {
                "role": getattr(msg, 'role', 'user'),
                "content": str(getattr(msg, 'content', ''))
            }
    
    yield {
        "event": "final_session_state",
        "data": {
            "messages": [
                safe_convert_message(msg)
                for msg in data["output"].get("messages", [])
            ],
        },
    }

from typing import Literal, Optional
from typing_extensions import TypedDict
from langgraph.graph import MessagesState

from src.config import TEAM_MEMBERS

# Define routing options
OPTIONS = TEAM_MEMBERS + ["FINISH"]


class Router(TypedDict):
    """Worker to route to next. If no workers needed, route to FINISH."""

    next: Literal[*OPTIONS]


class State(MessagesState):
    """State for the agent system, extends MessagesState with next field."""

    # Constants
    TEAM_MEMBERS: list[str]
    TEAM_MEMBER_CONFIGRATIONS: dict[str, dict]

    # Runtime Variables
    next: str
    full_plan: str
    deep_thinking_mode: bool
    search_before_planning: bool
    thread_id: str
    repeat_count: int
    parallel_tasks: list
    parallel_results: list
    user_id: Optional[int]

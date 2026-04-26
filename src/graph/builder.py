from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import StateGraph, START

from .types import State
from .nodes import (
    supervisor_node,
    research_node,
    code_node,
    coordinator_node,
    browser_node,
    reporter_node,
    planner_node,
    parallel_dispatch_node,
    parallel_merge_node,
)


def build_graph(checkpointer=None):
    """Build and return the agent workflow graph."""
    if checkpointer is None:
        checkpointer = MemorySaver()
    builder = StateGraph(State)
    builder.add_edge(START, "coordinator")
    builder.add_node("coordinator", coordinator_node)
    builder.add_node("planner", planner_node)
    builder.add_node("supervisor", supervisor_node)
    builder.add_node("researcher", research_node)
    builder.add_node("coder", code_node)
    builder.add_node("browser", browser_node)
    builder.add_node("reporter", reporter_node)
    builder.add_node("parallel_dispatch", parallel_dispatch_node)
    builder.add_node("parallel_merge", parallel_merge_node)
    return builder.compile(checkpointer=checkpointer)

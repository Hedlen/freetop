import os
from datetime import datetime
from jinja2 import Environment, FileSystemLoader, select_autoescape
from langgraph.prebuilt.chat_agent_executor import AgentState

# Initialize Jinja2 environment
env = Environment(
    loader=FileSystemLoader(os.path.dirname(__file__)),
    autoescape=select_autoescape(),
    trim_blocks=True,
    lstrip_blocks=True,
)


def get_prompt_template(prompt_name: str) -> str:
    """
    Load and return a prompt template using Jinja2.

    Args:
        prompt_name: Name of the prompt template file (without .md extension)

    Returns:
        The template string with proper variable substitution syntax
    """
    try:
        template = env.get_template(f"{prompt_name}.md")
        return template.render()
    except Exception as e:
        raise ValueError(f"Error loading template {prompt_name}: {e}")


def apply_prompt_template(prompt_name: str, state: AgentState) -> list:
    """
    Apply template variables to a prompt template and return formatted messages.

    Args:
        prompt_name: Name of the prompt template to use
        state: Current agent state containing variables to substitute

    Returns:
        List of messages with the system prompt as the first message
    """
    # Convert state to dict for template rendering
    # Extract last user question for contextual lead-in in reporter outputs
    last_user_query = ""
    try:
        msgs = state.get("messages", [])
        for m in reversed(msgs):
            role = getattr(m, "role", None) if hasattr(m, "role") else (m.get("role") if isinstance(m, dict) else None)
            content = getattr(m, "content", None) if hasattr(m, "content") else (m.get("content") if isinstance(m, dict) else None)
            if role == "user" and isinstance(content, str) and content.strip():
                last_user_query = content.strip()
                break
    except Exception:
        last_user_query = ""

    state_vars = {
        "CURRENT_TIME": datetime.now().strftime("%a %b %d %Y %H:%M:%S %z"),
        "LAST_USER_QUERY": last_user_query,
        **state,
    }

    try:
        template = env.get_template(f"{prompt_name}.md")
        system_prompt = template.render(**state_vars)
        return [{"role": "system", "content": system_prompt}] + state["messages"]
    except Exception as e:
        raise ValueError(f"Error applying template {prompt_name}: {e}")

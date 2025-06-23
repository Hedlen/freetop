import logging
import os
from typing import Annotated, Optional, Type, TypeVar

from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_core.tools import tool
from .decorators import log_io, create_logged_tool
from src.tools.browser import create_browser_config
from src.config import TAVILY_MAX_RESULTS

logger = logging.getLogger(__name__)

T = TypeVar('T')

class LoggedToolMixin:
    """Mixin class to add logging capabilities to tools."""
    
    def invoke(self, *args, **kwargs):
        """Override invoke method to add logging."""
        logger.info(f"Invoking {self.__class__.__name__} with args: {args}, kwargs: {kwargs}")
        try:
            result = super().invoke(*args, **kwargs)
            logger.info(f"{self.__class__.__name__} completed successfully")
            return result
        except Exception as e:
            logger.error(f"{self.__class__.__name__} failed with error: {e}")
            raise

# Initialize Tavily search tool with logging
LoggedTavilySearch = create_logged_tool(TavilySearchResults)

def create_search_config(user_id: Optional[int] = None):
    """创建搜索配置，支持用户设置覆盖环境变量"""
    # 默认配置
    config = {
        'tavily_api_key': os.getenv('TAVILY_API_KEY'),
        'max_results': TAVILY_MAX_RESULTS
    }
    
    # 如果有用户ID，尝试获取用户设置
    if user_id:
        try:
            from src.services.user_service import UserService
            user_settings_result = UserService.get_user_settings(user_id)
            if user_settings_result.get('success') and user_settings_result.get('settings'):
                search_settings = user_settings_result['settings'].get('search', {})
                
                # 优先使用用户设置
                if search_settings.get('tavily_api_key'):
                    config['tavily_api_key'] = search_settings['tavily_api_key']
                if search_settings.get('max_search_results'):
                    config['max_results'] = search_settings['max_search_results']
                    
                logger.info("使用用户配置的搜索设置")
        except Exception as e:
            logger.warning(f"获取用户搜索设置失败，将使用环境变量配置: {e}")
    
    return config


@tool
@log_io
def search(
    query: Annotated[str, "The search query."],
    user_id: Annotated[Optional[int], "User ID for personalized configuration"] = None,
) -> str:
    """Use this to search the internet for information."""
    try:
        config = create_search_config(user_id)
        
        # 使用LoggedTavilySearch创建实例，使用用户配置的API密钥
        tavily_tool = LoggedTavilySearch(
            name="tavily_search",
            max_results=config['max_results'],
            tavily_api_key=config['tavily_api_key']
        )
        results = tavily_tool.invoke({"query": query})
        return results
    except BaseException as e:
        error_msg = f"Failed to search. Error: {repr(e)}"
        logger.error(error_msg)
        return error_msg

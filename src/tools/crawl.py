import logging
from typing import Annotated, Optional

from langchain_core.messages import HumanMessage
from langchain_core.tools import tool
from .decorators import log_io

from src.crawler import Crawler

logger = logging.getLogger(__name__)


def create_crawler_config(user_id: Optional[int] = None):
    """创建爬虫配置，支持用户设置覆盖环境变量"""
    import os
    
    # 默认配置
    config = {
        'tavily_api_key': os.getenv('TAVILY_API_KEY'),
        'jina_api_key': os.getenv('JINA_API_KEY'),
        'proxy_server': os.getenv('CHROME_PROXY_SERVER'),
        'proxy_username': os.getenv('CHROME_PROXY_USERNAME'),
        'proxy_password': os.getenv('CHROME_PROXY_PASSWORD')
    }
    
    # 如果有用户ID，尝试获取用户设置
    if user_id:
        try:
            from src.services.user_service import UserService
            user_settings_result = UserService.get_user_settings(user_id)
            if user_settings_result.get('success') and user_settings_result.get('settings'):
                crawler_settings = user_settings_result['settings'].get('crawler', {})
                browser_settings = user_settings_result['settings'].get('browser', {})
                
                # 优先使用用户设置
                if crawler_settings.get('tavily_api_key'):
                    config['tavily_api_key'] = crawler_settings['tavily_api_key']
                if crawler_settings.get('jina_api_key'):
                    config['jina_api_key'] = crawler_settings['jina_api_key']
                if crawler_settings.get('timeout'):
                    config['timeout'] = crawler_settings['timeout']
                if crawler_settings.get('delay'):
                    config['delay'] = crawler_settings['delay']
                if crawler_settings.get('user_agent'):
                    config['user_agent'] = crawler_settings['user_agent']
                if crawler_settings.get('enable_javascript') is not None:
                    config['enable_javascript'] = crawler_settings['enable_javascript']
                if crawler_settings.get('max_search_results'):
                    config['max_search_results'] = crawler_settings['max_search_results']
                if browser_settings.get('proxy_server'):
                    config['proxy_server'] = browser_settings['proxy_server']
                if browser_settings.get('proxy_username'):
                    config['proxy_username'] = browser_settings['proxy_username']
                if browser_settings.get('proxy_password'):
                    config['proxy_password'] = browser_settings['proxy_password']
                    
                logger.info("使用用户配置的爬虫设置")
        except Exception as e:
            logger.warning(f"获取用户爬虫设置失败，将使用环境变量配置: {e}")
    
    return config


@tool
@log_io
def crawl_tool(
    url: Annotated[str, "The url to crawl."],
    user_id: Annotated[Optional[int], "User ID for personalized configuration"] = None,
) -> HumanMessage:
    """Use this to crawl a url and get a readable content in markdown format."""
    try:
        config = create_crawler_config(user_id)
        crawler = Crawler(config)
        article = crawler.crawl(url)
        
        if article is None:
            error_msg = "Failed to crawl. Unable to extract content from the URL."
            logger.error(error_msg)
            return error_msg
            
        return {"role": "user", "content": article.to_message()}
    except BaseException as e:
        error_msg = f"Failed to crawl. Error: {repr(e)}"
        logger.error(error_msg)
        return error_msg

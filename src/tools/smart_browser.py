import logging
import json
import os
import asyncio
import uuid
from typing import Optional, Dict, Any
from urllib.parse import urlparse
from pydantic import BaseModel, Field
from langchain.tools import BaseTool
from browser_use import AgentHistoryList, Browser, BrowserConfig
from browser_use import Agent as BrowserAgent
from src.llms.llm import basic_llm
from src.tools.browser import create_browser_config
from src.tools.proxy_manager import ProxyManager
from src.config import BROWSER_HISTORY_DIR

logger = logging.getLogger(__name__)

class SmartBrowserInput(BaseModel):
    """智能浏览器工具输入"""
    instruction: str = Field(..., description="浏览器操作指令")
    target_url: Optional[str] = Field(None, description="目标URL，用于智能代理决策")

class SmartBrowserTool(BaseTool):
    """智能浏览器工具，支持根据目标URL动态配置代理"""
    
    name: str = "smart_browser"
    args_schema: type = SmartBrowserInput
    description: str = (
        "智能浏览器工具，根据目标网站自动选择最佳的代理策略。"
        "支持国内网站直连，国外网站代理的智能切换。"
        "输入应包含自然语言描述的浏览器操作指令，如'访问google.com搜索browser-use'。"
    )
    
    # 添加字段类型注解
    _agent: Optional['BrowserAgent'] = None
    browser: Optional['Browser'] = None
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
    
    def _extract_url_from_instruction(self, instruction: str) -> Optional[str]:
        """从指令中提取URL"""
        import re
        
        # 匹配常见的URL模式
        url_patterns = [
            r'https?://[^\s]+',
            r'www\.[^\s]+',
            r'[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:/[^\s]*)?'
        ]
        
        for pattern in url_patterns:
            matches = re.findall(pattern, instruction, re.IGNORECASE)
            if matches:
                url = matches[0]
                # 确保URL有协议前缀
                if not url.startswith(('http://', 'https://')):
                    url = 'https://' + url
                return url
        
        # 检查常见的网站名称
        site_mappings = {
            'google': 'https://www.google.com',
            'youtube': 'https://www.youtube.com',
            'github': 'https://github.com',
            'stackoverflow': 'https://stackoverflow.com',
            'reddit': 'https://www.reddit.com',
            'twitter': 'https://twitter.com',
            'facebook': 'https://www.facebook.com',
            'baidu': 'https://www.baidu.com',
            'taobao': 'https://www.taobao.com',
            'zhihu': 'https://www.zhihu.com',
            'bilibili': 'https://www.bilibili.com'
        }
        
        instruction_lower = instruction.lower()
        for site, url in site_mappings.items():
            if site in instruction_lower:
                return url
        
        return None
    
    def _create_smart_browser_config(self, user_id: int = None, target_url: str = None) -> BrowserConfig:
        """创建智能浏览器配置"""
        return create_browser_config(user_id=user_id, target_url=target_url)
    
    def _generate_browser_result(self, result_content: str, generated_gif_path: str, 
                               proxy_info: Dict = None) -> dict:
        """生成浏览器结果"""
        result = {
            "result_content": result_content,
            "generated_gif_path": generated_gif_path,
        }
        
        if proxy_info:
            result["proxy_info"] = proxy_info
        
        return result
    
    def _run(self, instruction: str, target_url: str = None, user_id: int = None) -> str:
        """运行智能浏览器任务"""
        generated_gif_path = f"{BROWSER_HISTORY_DIR}/{uuid.uuid4()}.gif"
        
        # 如果没有提供target_url，尝试从指令中提取
        if not target_url:
            target_url = self._extract_url_from_instruction(instruction)
        
        proxy_info = {}
        
        try:
            # 创建智能浏览器配置
            browser_config = self._create_smart_browser_config(user_id=user_id, target_url=target_url)
            
            # 记录代理信息
            if hasattr(browser_config, 'proxy') and browser_config.proxy:
                proxy_info = {
                    "used_proxy": True,
                    "proxy_server": browser_config.proxy.get('server'),
                    "target_url": target_url,
                    "strategy": "smart"
                }
                logger.info(f"使用代理访问 {target_url}: {browser_config.proxy.get('server')}")
            else:
                proxy_info = {
                    "used_proxy": False,
                    "target_url": target_url,
                    "strategy": "direct"
                }
                logger.info(f"直连访问 {target_url}")
            
            # 创建浏览器实例
            browser_instance = Browser(config=browser_config)
            
            # 创建浏览器代理
            self._agent = BrowserAgent(
                task=instruction,
                llm=basic_llm,
                browser=browser_instance,
                generate_gif=generated_gif_path,
            )
            
            # 运行任务
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            try:
                result = loop.run_until_complete(self._agent.run())
                
                if isinstance(result, AgentHistoryList):
                    return json.dumps(
                        self._generate_browser_result(
                            result.final_result(), 
                            generated_gif_path,
                            proxy_info
                        )
                    )
                else:
                    return json.dumps(
                        self._generate_browser_result(
                            result, 
                            generated_gif_path,
                            proxy_info
                        )
                    )
            
            finally:
                # 清理浏览器实例
                # if self._agent and self._agent.browser:
                #     try:
                #         cleanup_loop = asyncio.new_event_loop()
                #         asyncio.set_event_loop(cleanup_loop)
                #         cleanup_loop.run_until_complete(self._agent.browser.close())
                #         cleanup_loop.close()
                #     except Exception as cleanup_error:
                #         logger.warning(f"浏览器清理时出现警告: {cleanup_error}")
                loop.close()
        
        except Exception as e:
            logger.error(f"智能浏览器启动失败: {str(e)}")
            
            # 检查是否是代理连接问题
            if "proxy" in str(e).lower() or "connection" in str(e).lower():
                logger.warning("检测到代理连接问题，尝试直连")
                try:
                    # 尝试直连模式
                    direct_config = BrowserConfig(headless=browser_config.headless)
                    browser_instance = Browser(config=direct_config)
                    
                    self._agent = BrowserAgent(
                        task=instruction,
                        llm=basic_llm,
                        browser=browser_instance,
                        generate_gif=generated_gif_path,
                    )
                    
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    
                    try:
                        result = loop.run_until_complete(self._agent.run())
                        proxy_info["fallback_to_direct"] = True
                        
                        if isinstance(result, AgentHistoryList):
                            return json.dumps(
                                self._generate_browser_result(
                                    result.final_result(), 
                                    generated_gif_path,
                                    proxy_info
                                )
                            )
                        else:
                            return json.dumps(
                                self._generate_browser_result(
                                    result, 
                                    generated_gif_path,
                                    proxy_info
                                )
                            )
                    finally:
                        # if self._agent and self._agent.browser:
                        #     try:
                        #         cleanup_loop = asyncio.new_event_loop()
                        #         asyncio.set_event_loop(cleanup_loop)
                        #         cleanup_loop.run_until_complete(self._agent.browser.close())
                        #         cleanup_loop.close()
                        #     except Exception as cleanup_error:
                        #         logger.warning(f"浏览器清理时出现警告: {cleanup_error}")
                        loop.close()
                
                except Exception as fallback_error:
                    logger.error(f"直连模式也失败: {str(fallback_error)}")
                    return json.dumps({
                        "result_content": f"浏览器访问失败：代理连接失败且直连也无法访问。错误信息：{str(e)}",
                        "generated_gif_path": generated_gif_path,
                        "error_type": "connection_failed",
                        "proxy_info": proxy_info
                    })
            
            return json.dumps({
                "result_content": f"智能浏览器执行失败：{str(e)}",
                "generated_gif_path": generated_gif_path,
                "error_type": "execution_failed",
                "proxy_info": proxy_info
            })
    
    def test_proxy_connectivity(self, target_url: str, user_id: int = None) -> Dict[str, Any]:
        """测试代理连接性"""
        try:
            from src.services.user_service import UserService
            
            # 获取用户设置
            proxy_config = {}
            if user_id:
                user_settings_result = UserService.get_user_settings(user_id)
                if user_settings_result.get('success') and user_settings_result.get('settings'):
                    browser_settings = user_settings_result['settings'].get('browser', {})
                    proxy_config = {
                        'strategy': browser_settings.get('proxy_strategy', 'smart'),
                        'server': browser_settings.get('proxy_server'),
                        'username': browser_settings.get('proxy_username'),
                        'password': browser_settings.get('proxy_password'),
                        'type': browser_settings.get('proxy_type', 'http'),
                        'auto_detect_proxy': browser_settings.get('auto_detect_proxy', True),
                        'domestic_direct': browser_settings.get('domestic_direct', True),
                        'whitelist': browser_settings.get('proxy_whitelist', []),
                        'blacklist': browser_settings.get('proxy_blacklist', [])
                    }
            
            # 创建代理管理器
            proxy_manager = ProxyManager(
                strategy=proxy_config.get('strategy', 'smart'),
                proxy_config=proxy_config
            )
            
            # 测试连接性
            success, message = proxy_manager.test_connectivity(target_url)
            
            return {
                "success": success,
                "message": message,
                "target_url": target_url,
                "proxy_config": proxy_manager.get_proxy_config(target_url),
                "strategy": proxy_config.get('strategy', 'smart')
            }
        
        except Exception as e:
            return {
                "success": False,
                "message": f"测试失败: {str(e)}",
                "target_url": target_url
            }

# 创建工具实例
smart_browser_tool = SmartBrowserTool()
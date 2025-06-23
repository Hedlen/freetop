import asyncio
import logging
import json
import os
import signal
import subprocess
from pydantic import BaseModel, Field
from typing import Optional, ClassVar, Type
from langchain.tools import BaseTool
from browser_use import AgentHistoryList, Browser, BrowserConfig
from browser_use import Agent as BrowserAgent
from src.llms.llm import vl_llm
from src.tools.decorators import create_logged_tool
from src.config import (
    CHROME_INSTANCE_PATH,
    CHROME_HEADLESS,
    CHROME_PROXY_STRATEGY,
    CHROME_PROXY_SERVER,
    CHROME_PROXY_USERNAME,
    CHROME_PROXY_PASSWORD,
    CHROME_PROXY_TYPE,
    CHROME_AUTO_DETECT_PROXY,
    CHROME_DOMESTIC_DIRECT,
    CHROME_PROXY_WHITELIST,
    CHROME_PROXY_BLACKLIST,
    BROWSER_HISTORY_DIR,
)
from src.tools.proxy_manager import ProxyManager
import uuid
import asyncio

# Configure logging
logger = logging.getLogger(__name__)

# 使用 Chromium 而不是 Chrome，避免与用户本地 Chrome 冲突
def create_browser_config(user_id: int = None, target_url: str = None):
    """创建浏览器配置，支持智能代理策略"""
    config = BrowserConfig(
        headless=CHROME_HEADLESS,
    )
    
    # 优先级：前端用户设置 > 环境变量 > 默认值
    chrome_path = None
    proxy_strategy = CHROME_PROXY_STRATEGY
    proxy_server = None
    proxy_username = None
    proxy_password = None
    proxy_type = CHROME_PROXY_TYPE
    auto_detect_proxy = CHROME_AUTO_DETECT_PROXY
    domestic_direct = CHROME_DOMESTIC_DIRECT
    proxy_whitelist = CHROME_PROXY_WHITELIST
    proxy_blacklist = CHROME_PROXY_BLACKLIST
    
    # 1. 尝试从用户设置获取配置
    if user_id:
        try:
            from src.services.user_service import UserService
            user_settings_result = UserService.get_user_settings(user_id)
            if user_settings_result.get('success') and user_settings_result.get('settings'):
                browser_settings = user_settings_result['settings'].get('browser', {})
                if browser_settings:
                    chrome_path = browser_settings.get('chrome_path')
                    proxy_strategy = browser_settings.get('proxy_strategy', proxy_strategy)
                    proxy_server = browser_settings.get('proxy_server')
                    proxy_type = browser_settings.get('proxy_type', proxy_type)
                    auto_detect_proxy = browser_settings.get('auto_detect_proxy', auto_detect_proxy)
                    domestic_direct = browser_settings.get('domestic_direct', domestic_direct)
                    proxy_whitelist = browser_settings.get('proxy_whitelist', proxy_whitelist)
                    proxy_blacklist = browser_settings.get('proxy_blacklist', proxy_blacklist)
                    proxy_username = browser_settings.get('proxy_username')
                    proxy_password = browser_settings.get('proxy_password')
                    logger.info("使用前端用户设置的浏览器配置")
        except Exception as e:
            logger.warning(f"获取用户设置失败，将使用环境变量配置: {e}")
    
    # 2. 如果前端没有设置，仅对代理使用环境变量，浏览器路径使用默认值
    # chrome_path保持None，使用默认的Playwright内置Chromium
    if proxy_server is None:
        proxy_server = CHROME_PROXY_SERVER
    if proxy_username is None:
        proxy_username = CHROME_PROXY_USERNAME
    if proxy_password is None:
        proxy_password = CHROME_PROXY_PASSWORD
    
    # 3. 设置浏览器路径
    if chrome_path:
        import os
        if os.path.exists(chrome_path):
            config.chrome_instance_path = chrome_path
            logger.info(f"使用浏览器路径: {chrome_path}")
        else:
            logger.warning(f"浏览器路径不存在: {chrome_path}，将使用默认Chromium")
            config.chrome_instance_path = None
    else:
        config.chrome_instance_path = None
        if user_id:
            logger.info(f"用户 {user_id} 未配置浏览器路径，使用默认的 Playwright 内置 Chromium")
        else:
            logger.info("未配置浏览器路径，使用默认的 Playwright 内置 Chromium")
    
    # 4. 配置智能代理
    if target_url and proxy_strategy != 'direct':
        # 创建代理管理器
        proxy_manager = ProxyManager(
            strategy=proxy_strategy,
            proxy_config={
                'server': proxy_server,
                'username': proxy_username,
                'password': proxy_password,
                'type': proxy_type,
                'auto_detect_proxy': auto_detect_proxy,
                'domestic_direct': domestic_direct,
                'whitelist': proxy_whitelist,
                'blacklist': proxy_blacklist
            }
        )
        
        # 根据目标URL决定是否使用代理
        proxy_config = proxy_manager.get_proxy_config(target_url)
        if proxy_config:
            config.proxy = proxy_config
            logger.info(f"为URL {target_url} 配置代理: {proxy_config['server']}")
        else:
            logger.info(f"为URL {target_url} 配置直连")
    elif proxy_server and proxy_strategy == 'manual':
        # 手动配置模式，直接使用配置的代理
        proxy_config = {
            "server": proxy_server,
        }
        if proxy_username:
            proxy_config["username"] = proxy_username
        if proxy_password:
            proxy_config["password"] = proxy_password
        config.proxy = proxy_config
        logger.info(f"手动配置代理: {proxy_server}")
    
    return config

# 移除全局browser配置，改为在运行时动态创建
# browser_config = create_browser_config()
# expected_browser = Browser(config=browser_config)


class BrowserUseInput(BaseModel):
    """Input for WriteFileTool."""

    instruction: str = Field(..., description="The instruction to use browser")


class BrowserTool(BaseTool):
    name: ClassVar[str] = "browser"
    args_schema: Type[BaseModel] = BrowserUseInput
    description: ClassVar[str] = (
        "Use this tool to interact with web browsers. Input should be a natural language description of what you want to do with the browser, such as 'Go to google.com and search for browser-use', or 'Navigate to Reddit and find the top post about AI'."
    )

    _agent: Optional[BrowserAgent] = None
    browser: Optional[Browser] = None

    def _generate_browser_result(
        self, result_content: str, generated_gif_path: str
    ) -> dict:
        return {
            "result_content": result_content,
            "generated_gif_path": generated_gif_path,
        }

    def _run(self, instruction: str, user_id: int = None) -> str:
        generated_gif_path = f"{BROWSER_HISTORY_DIR}/{uuid.uuid4()}.gif"
        """Run the browser task synchronously."""
        
        # 如果已经有browser实例（由workflow_service设置），使用它
        if hasattr(self, 'browser') and self.browser:
            browser_instance = self.browser
        else:
            # 否则动态创建浏览器配置
            browser_config = create_browser_config(user_id)
            browser_instance = Browser(config=browser_config)
        
        try:
            self._agent = BrowserAgent(
                task=instruction,
                llm=vl_llm,
                browser=browser_instance,
                generate_gif=generated_gif_path,
            )

            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                result = loop.run_until_complete(self._agent.run())

                if isinstance(result, AgentHistoryList):
                    return json.dumps(
                        self._generate_browser_result(
                            result.final_result(), generated_gif_path
                        )
                    )
                else:
                    return json.dumps(
                        self._generate_browser_result(result, generated_gif_path)
                    )
            finally:
                # 确保清理浏览器实例
                if self._agent and self._agent.browser:
                    try:
                        cleanup_loop = asyncio.new_event_loop()
                        asyncio.set_event_loop(cleanup_loop)
                        cleanup_loop.run_until_complete(self._agent.browser.close())
                        cleanup_loop.close()
                    except Exception as cleanup_error:
                        logger.warning(f"浏览器清理时出现警告: {cleanup_error}")
                loop.close()
                
        except Exception as e:
            logger.error(f"浏览器启动失败: {str(e)}")
            
            # 检查是否是Chrome实例连接问题
            if "connect ECONNREFUSED" in str(e) or "connect_over_cdp" in str(e):
                logger.warning("检测到Chrome连接问题，可能是多个Chrome实例冲突")
                return json.dumps({
                    "result_content": "浏览器连接失败：检测到Chrome实例冲突。请关闭所有Chrome浏览器窗口后重试，或在设置中配置使用独立的浏览器路径。",
                    "generated_gif_path": generated_gif_path,
                    "error_type": "chrome_instance_conflict"
                })
            
            # 如果配置了自定义浏览器路径但启动失败，尝试使用默认Chromium
            if CHROME_INSTANCE_PATH and "chrome_instance_conflict" not in str(e):
                logger.info("尝试使用默认Chromium重新启动浏览器")
                try:
                    fallback_config = BrowserConfig(
                        headless=CHROME_HEADLESS,
                        browser_type="chromium",
                        chrome_instance_path=None,
                    )
                    if CHROME_PROXY_SERVER:
                        proxy_config = {
                            "server": CHROME_PROXY_SERVER,
                        }
                        if CHROME_PROXY_USERNAME:
                            proxy_config["username"] = CHROME_PROXY_USERNAME
                        if CHROME_PROXY_PASSWORD:
                            proxy_config["password"] = CHROME_PROXY_PASSWORD
                        fallback_config.proxy = proxy_config
                    
                    fallback_browser = Browser(config=fallback_config)
                    self._agent = BrowserAgent(
                        task=instruction,
                        llm=vl_llm,
                        browser=fallback_browser,
                        generate_gif=generated_gif_path,
                    )
                    
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    try:
                        result = loop.run_until_complete(self._agent.run())
                        logger.info("使用默认Chromium成功执行任务")
                        
                        if isinstance(result, AgentHistoryList):
                            return json.dumps(
                                self._generate_browser_result(
                                    result.final_result(), generated_gif_path
                                )
                            )
                        else:
                            return json.dumps(
                                self._generate_browser_result(result, generated_gif_path)
                            )
                    finally:
                        # 确保清理fallback浏览器实例
                        if self._agent and self._agent.browser:
                            try:
                                cleanup_loop = asyncio.new_event_loop()
                                asyncio.set_event_loop(cleanup_loop)
                                cleanup_loop.run_until_complete(self._agent.browser.close())
                                cleanup_loop.close()
                            except Exception as cleanup_error:
                                logger.warning(f"Fallback浏览器清理时出现警告: {cleanup_error}")
                        loop.close()
                        
                except Exception as fallback_error:
                    logger.error(f"使用默认Chromium也失败: {str(fallback_error)}")
                    return json.dumps({
                        "result_content": f"浏览器启动失败，请检查配置。原始错误: {str(e)}，降级错误: {str(fallback_error)}",
                        "generated_gif_path": generated_gif_path,
                        "error_type": "browser_startup_failed"
                    })
            else:
                return json.dumps({
                    "result_content": f"浏览器启动失败: {str(e)}",
                    "generated_gif_path": generated_gif_path,
                    "error_type": "browser_startup_failed"
                })
        finally:
            # 强制清理所有引用
            self._agent = None
            if hasattr(self, 'browser'):
                self.browser = None

    def _force_kill_chrome_processes(self):
        """强制终止可能残留的Chrome进程，但避免清理用户正在使用的Chrome浏览器"""
        try:
            if os.name == 'nt':  # Windows
                # 首先检查是否有用户正在使用的Chrome进程
                user_chrome_running = self._check_user_chrome_running()
                if user_chrome_running:
                    logger.info("检测到用户正在使用Chrome浏览器，跳过Chrome进程清理")
                    return
                
                # 查找并终止Chrome进程
                result = subprocess.run(
                    ['tasklist', '/FI', 'IMAGENAME eq chrome.exe', '/FO', 'CSV'],
                    capture_output=True, text=True, timeout=5
                )
                if 'chrome.exe' in result.stdout:
                    subprocess.run(['taskkill', '/F', '/IM', 'chrome.exe'], 
                                 capture_output=True, timeout=5)
                    logger.info("已强制终止Chrome进程")
            else:  # Unix-like systems
                # 对于Unix系统，也检查用户Chrome进程
                user_chrome_running = self._check_user_chrome_running()
                if user_chrome_running:
                    logger.info("检测到用户正在使用Chrome浏览器，跳过Chrome进程清理")
                    return
                    
                subprocess.run(['pkill', '-f', 'chrome'], capture_output=True, timeout=5)
                logger.info("已强制终止Chrome进程")
        except Exception as e:
            logger.warning(f"强制终止Chrome进程时出现警告: {str(e)}")
    
    def _check_user_chrome_running(self):
        """检测用户是否正在使用Chrome浏览器"""
        try:
            if os.name == 'nt':  # Windows
                # 使用tasklist获取Chrome进程信息
                result = subprocess.run(
                    ['tasklist', '/FI', 'IMAGENAME eq chrome.exe', '/FO', 'CSV'],
                    capture_output=True, text=True, timeout=5
                )
                if result.returncode == 0 and 'chrome.exe' in result.stdout:
                    # 如果有任何Chrome进程，都认为用户可能在使用
                    logger.info("检测到Chrome进程，为安全起见跳过清理")
                    return True
            else:  # Unix-like systems
                # 使用pgrep检查Chrome进程
                result = subprocess.run(
                    ['pgrep', '-f', 'chrome'], capture_output=True, text=True, timeout=5
                )
                if result.returncode == 0 and result.stdout.strip():
                    logger.info("检测到Chrome进程，为安全起见跳过清理")
                    return True
            return False
        except Exception as e:
            logger.warning(f"检测Chrome进程时出现警告: {str(e)}")
            # 如果检测失败，为了安全起见，假设用户正在使用Chrome
            logger.info("检测失败，为安全起见跳过Chrome进程清理")
            return True

    async def terminate(self):
        """Terminate the browser agent if it exists."""
        browser_closed = False
        
        if self._agent and self._agent.browser:
            try:
                # 尝试优雅关闭浏览器
                await self._agent.browser.close()
                logger.info("浏览器实例已成功关闭")
                browser_closed = True
            except Exception as e:
                logger.warning(f"浏览器终止时出现警告: {str(e)}")
                # 即使关闭失败，也要清理引用
        
        # 如果有独立的浏览器实例，也要清理
        if hasattr(self, 'browser') and self.browser:
            try:
                await self.browser.close()
                logger.info("独立浏览器实例已成功关闭")
                browser_closed = True
            except Exception as e:
                logger.warning(f"独立浏览器终止时出现警告: {str(e)}")
            finally:
                self.browser = None
        
        # 清理引用
        self._agent = None
        
        # 如果浏览器关闭失败，尝试强制终止Chrome进程
        if not browser_closed:
            logger.warning("浏览器未能正常关闭，尝试强制终止Chrome进程")
            self._force_kill_chrome_processes()

    async def _arun(self, instruction: str, user_id: int = None) -> str:
        """Run the browser task asynchronously."""
        generated_gif_path = f"{BROWSER_HISTORY_DIR}/{uuid.uuid4()}.gif"
        
        # 如果已经有browser实例（由workflow_service设置），使用它
        if hasattr(self, 'browser') and self.browser:
            browser_instance = self.browser
        else:
            # 否则动态创建浏览器配置
            browser_config = create_browser_config(user_id)
            browser_instance = Browser(config=browser_config)
        
        self._agent = BrowserAgent(
            task=instruction,
            llm=vl_llm,
            browser=browser_instance,
            generate_gif=generated_gif_path,  # Will be set per request
        )
        try:
            result = await self._agent.run()
            if isinstance(result, AgentHistoryList):
                return json.dumps(
                    self._generate_browser_result(
                        result.final_result(), generated_gif_path
                    )
                )
            else:
                return json.dumps(
                    self._generate_browser_result(result, generated_gif_path)
                )
        except Exception as e:
            logger.error(f"浏览器任务执行失败: {str(e)}")
            return json.dumps({
                "result_content": f"浏览器任务执行失败: {str(e)}",
                "generated_gif_path": generated_gif_path,
                "error_type": "task_execution_failed"
            })
        finally:
            # 确保清理浏览器实例
            if self._agent and self._agent.browser:
                try:
                    await self._agent.browser.close()
                except Exception as cleanup_error:
                    logger.warning(f"异步浏览器清理时出现警告: {cleanup_error}")
            self._agent = None


BrowserTool = create_logged_tool(BrowserTool)
browser_tool = BrowserTool()

if __name__ == "__main__":
    browser_tool._run(instruction="go to github.com and search FreeTop")

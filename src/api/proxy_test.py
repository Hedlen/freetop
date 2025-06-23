from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from src.tools.smart_browser import smart_browser_tool
from src.tools.proxy_manager import ProxyManager
from src.services.user_service import UserService
from src.api.auth import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/proxy", tags=["proxy"])

class ProxyTestRequest(BaseModel):
    target_url: str
    proxy_strategy: Optional[str] = 'smart'
    proxy_server: Optional[str] = None
    proxy_username: Optional[str] = None
    proxy_password: Optional[str] = None
    proxy_type: Optional[str] = 'http'
    auto_detect_proxy: Optional[bool] = True
    domestic_direct: Optional[bool] = True
    proxy_whitelist: Optional[List[str]] = []
    proxy_blacklist: Optional[List[str]] = []

class ProxyConfigResponse(BaseModel):
    strategy: str
    will_use_proxy: bool
    proxy_config: Optional[Dict[str, Any]] = None
    reason: str
    domain_type: str  # domestic, foreign, unknown

class ProxyTestResponse(BaseModel):
    success: bool
    message: str
    target_url: str
    proxy_config: Optional[Dict[str, Any]] = None
    strategy: str
    response_time: Optional[float] = None

@router.post("/test", response_model=ProxyTestResponse)
async def test_proxy_connectivity(
    request: ProxyTestRequest,
    current_user: dict = Depends(get_current_user)
):
    """测试代理连接性"""
    try:
        user_id = current_user.get('user_id')
        
        # 创建代理管理器
        proxy_manager = ProxyManager(
            strategy=request.proxy_strategy,
            proxy_config={
                'server': request.proxy_server,
                'username': request.proxy_username,
                'password': request.proxy_password,
                'type': request.proxy_type,
                'auto_detect_proxy': request.auto_detect_proxy,
                'domestic_direct': request.domestic_direct,
                'whitelist': request.proxy_whitelist,
                'blacklist': request.proxy_blacklist
            }
        )
        
        # 测试连接性
        import time
        start_time = time.time()
        success, message = proxy_manager.test_connectivity(request.target_url)
        response_time = time.time() - start_time
        
        return ProxyTestResponse(
            success=success,
            message=message,
            target_url=request.target_url,
            proxy_config=proxy_manager.get_proxy_config(request.target_url),
            strategy=request.proxy_strategy,
            response_time=response_time
        )
    
    except Exception as e:
        logger.error(f"代理测试失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"代理测试失败: {str(e)}")

@router.post("/config", response_model=ProxyConfigResponse)
async def get_proxy_config(
    request: ProxyTestRequest,
    current_user: dict = Depends(get_current_user)
):
    """获取指定URL的代理配置决策"""
    try:
        # 创建代理管理器
        proxy_manager = ProxyManager(
            strategy=request.proxy_strategy,
            proxy_config={
                'server': request.proxy_server,
                'username': request.proxy_username,
                'password': request.proxy_password,
                'type': request.proxy_type,
                'auto_detect_proxy': request.auto_detect_proxy,
                'domestic_direct': request.domestic_direct,
                'whitelist': request.proxy_whitelist,
                'blacklist': request.proxy_blacklist
            }
        )
        
        # 获取代理配置
        will_use_proxy = proxy_manager.should_use_proxy(request.target_url)
        proxy_config = proxy_manager.get_proxy_config(request.target_url)
        
        # 判断域名类型
        domain = proxy_manager._extract_domain(request.target_url)
        domain_type = 'unknown'
        reason = '未知域名，使用默认策略'
        
        if proxy_manager._domain_in_list(domain, request.proxy_whitelist):
            domain_type = 'whitelist'
            reason = '域名在代理白名单中'
        elif proxy_manager._domain_in_list(domain, request.proxy_blacklist):
            domain_type = 'blacklist'
            reason = '域名在代理黑名单中'
        elif proxy_manager._is_domestic_domain(domain):
            domain_type = 'domestic'
            reason = '识别为国内域名'
        elif proxy_manager._is_foreign_domain(domain):
            domain_type = 'foreign'
            reason = '识别为国外域名'
        
        return ProxyConfigResponse(
            strategy=request.proxy_strategy,
            will_use_proxy=will_use_proxy,
            proxy_config=proxy_config,
            reason=reason,
            domain_type=domain_type
        )
    
    except Exception as e:
        logger.error(f"获取代理配置失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取代理配置失败: {str(e)}")

@router.get("/auto-detect")
async def auto_detect_proxy(
    current_user: dict = Depends(get_current_user)
):
    """自动检测系统代理设置"""
    try:
        proxy_manager = ProxyManager(strategy='auto')
        system_proxy = proxy_manager._detect_system_proxy()
        
        if system_proxy:
            return {
                "success": True,
                "proxy_server": system_proxy,
                "message": "检测到系统代理设置"
            }
        else:
            return {
                "success": False,
                "proxy_server": None,
                "message": "未检测到系统代理设置"
            }
    
    except Exception as e:
        logger.error(f"自动检测代理失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"自动检测代理失败: {str(e)}")

@router.get("/presets")
async def get_proxy_presets():
    """获取代理配置预设"""
    return {
        "strategies": [
            {
                "value": "smart",
                "label": "智能代理",
                "description": "国外网站使用代理，国内网站直连"
            },
            {
                "value": "auto",
                "label": "自动检测",
                "description": "自动检测系统代理设置"
            },
            {
                "value": "manual",
                "label": "手动配置",
                "description": "使用手动配置的代理服务器"
            },
            {
                "value": "direct",
                "label": "直连",
                "description": "所有网站都直接连接"
            }
        ],
        "proxy_types": [
            {"value": "http", "label": "HTTP"},
            {"value": "https", "label": "HTTPS"},
            {"value": "socks4", "label": "SOCKS4"},
            {"value": "socks5", "label": "SOCKS5"}
        ],
        "common_domestic_sites": [
            "baidu.com", "taobao.com", "tmall.com", "jd.com", "qq.com",
            "weibo.com", "zhihu.com", "bilibili.com", "douyin.com"
        ],
        "common_foreign_sites": [
            "google.com", "youtube.com", "facebook.com", "twitter.com",
            "github.com", "stackoverflow.com", "reddit.com"
        ]
    }
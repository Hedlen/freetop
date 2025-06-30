#!/usr/bin/env python3
"""
健康检查路由
提供系统健康状态和配置检查
"""

from fastapi import APIRouter, Depends, Request
from typing import Dict, Any
import logging
import os
import json
from datetime import datetime
from src.services.user_service import UserService
from src.services.user_settings_cache import user_settings_cache
from src.models.user import UserSettings
from src.database.connection import get_db_session
from src.middleware.auth_enhanced import get_current_user_id_optional

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/health", tags=["health"])

@router.get("/")
async def health_check() -> Dict[str, Any]:
    """基础健康检查"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "freetop-api"
    }

@router.get("/config")
async def check_config_health() -> Dict[str, Any]:
    """检查配置健康状态"""
    try:
        health_status = {
            "status": "healthy",
            "checks": {},
            "timestamp": datetime.now().isoformat()
        }
        
        # 检查环境变量
        env_check = {
            "CHROME_HEADLESS": os.getenv('CHROME_HEADLESS', 'Not set'),
            "CHROME_INSTANCE_PATH": os.getenv('CHROME_INSTANCE_PATH', 'Not set'),
            "CHROME_PROXY_SERVER": os.getenv('CHROME_PROXY_SERVER', 'Not set'),
            "status": "ok"
        }
        health_status["checks"]["environment"] = env_check
        
        # 检查数据库连接
        try:
            with get_db_session() as db:
                user_count = db.query(UserSettings).count()
                db_check = {
                    "connection": "ok",
                    "user_settings_count": user_count,
                    "status": "ok"
                }
        except Exception as e:
            db_check = {
                "connection": "failed",
                "error": str(e),
                "status": "error"
            }
            health_status["status"] = "unhealthy"
        
        health_status["checks"]["database"] = db_check
        
        # 检查用户设置
        try:
            with get_db_session() as db:
                sample_user = db.query(UserSettings).first()
                if sample_user:
                    settings_data = sample_user.get_settings()
                    browser_config = settings_data.get('browser', {})
                    
                    config_check = {
                        "sample_user_id": sample_user.user_id,
                        "browser_config_keys": list(browser_config.keys()),
                        "headless_value": browser_config.get('headless'),
                        "headless_type": str(type(browser_config.get('headless'))),
                        "status": "ok"
                    }
                else:
                    config_check = {
                        "message": "no user settings found",
                        "status": "warning"
                    }
        except Exception as e:
            config_check = {
                "error": str(e),
                "status": "error"
            }
            health_status["status"] = "unhealthy"
        
        health_status["checks"]["user_config"] = config_check
        
        # 检查缓存状态
        try:
            cache_stats = user_settings_cache.get_stats()
            cache_check = {
                "stats": cache_stats,
                "status": "ok"
            }
        except Exception as e:
            cache_check = {
                "error": str(e),
                "status": "error"
            }
            health_status["status"] = "unhealthy"
        
        health_status["checks"]["cache"] = cache_check
        
        return health_status
        
    except Exception as e:
        logger.error(f"健康检查失败: {e}")
        return {
            "status": "error",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@router.get("/browser-config")
async def check_browser_config(request: Request) -> Dict[str, Any]:
    """检查浏览器配置状态"""
    try:
        # 获取用户ID（可选）
        user_id = get_current_user_id_optional(request)
        
        config_info = {
            "timestamp": datetime.now().isoformat(),
            "user_id": user_id,
            "environment": {
                "CHROME_HEADLESS": os.getenv('CHROME_HEADLESS', 'Not set'),
                "CHROME_INSTANCE_PATH": os.getenv('CHROME_INSTANCE_PATH', 'Not set'),
            },
            "request_headers": {
                "user_agent": request.headers.get('user-agent', 'Not provided'),
                "authorization": "Present" if request.headers.get('authorization') else "Not present"
            }
        }
        
        # 如果有用户ID，获取用户设置
        if user_id:
            try:
                user_settings_result = UserService.get_user_settings(user_id)
                if user_settings_result.get('success'):
                    browser_settings = user_settings_result['settings'].get('browser', {})
                    config_info["user_settings"] = {
                        "headless": browser_settings.get('headless'),
                        "headless_type": str(type(browser_settings.get('headless'))),
                        "window_size": browser_settings.get('window_size'),
                        "proxy_strategy": browser_settings.get('proxy_strategy')
                    }
                else:
                    config_info["user_settings"] = {
                        "error": user_settings_result.get('message', 'Unknown error')
                    }
            except Exception as e:
                config_info["user_settings"] = {
                    "error": str(e)
                }
        else:
            config_info["user_settings"] = "No user authentication"
        
        # 模拟移动端检测
        from src.tools.browser import is_mobile_request
        headers_dict = dict(request.headers)
        is_mobile = is_mobile_request(headers_dict)
        config_info["mobile_detection"] = {
            "is_mobile": is_mobile,
            "detection_based_on": "user-agent header"
        }
        
        # 预测最终配置
        predicted_headless = None
        if is_mobile:
            predicted_headless = True
            config_info["predicted_config"] = {
                "headless": True,
                "reason": "Mobile device detected, forced headless"
            }
        elif user_id and config_info.get("user_settings", {}).get("headless") is not None:
            predicted_headless = config_info["user_settings"]["headless"]
            config_info["predicted_config"] = {
                "headless": predicted_headless,
                "reason": "User setting"
            }
        else:
            env_headless = os.getenv('CHROME_HEADLESS', 'True').lower() in ('true', '1', 'yes', 'on')
            predicted_headless = env_headless
            config_info["predicted_config"] = {
                "headless": predicted_headless,
                "reason": "Environment variable or default"
            }
        
        return config_info
        
    except Exception as e:
        logger.error(f"浏览器配置检查失败: {e}")
        return {
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@router.get("/cache-stats")
async def get_cache_stats() -> Dict[str, Any]:
    """获取缓存统计信息"""
    try:
        stats = user_settings_cache.get_stats()
        return {
            "timestamp": datetime.now().isoformat(),
            "cache_stats": stats
        }
    except Exception as e:
        logger.error(f"获取缓存统计失败: {e}")
        return {
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@router.post("/cache/clear")
async def clear_cache() -> Dict[str, Any]:
    """清空缓存（管理员功能）"""
    try:
        user_settings_cache.clear()
        return {
            "success": True,
            "message": "缓存已清空",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"清空缓存失败: {e}")
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@router.post("/cache/cleanup")
async def cleanup_cache() -> Dict[str, Any]:
    """清理过期缓存"""
    try:
        user_settings_cache.cleanup_expired()
        stats = user_settings_cache.get_stats()
        return {
            "success": True,
            "message": "过期缓存已清理",
            "cache_stats": stats,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"清理缓存失败: {e}")
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }
"""
安全的聊天API路由
提供订阅验证、使用限制、异常检测等功能
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Header, Body
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
import logging

from src.database.connection import get_db
from src.services.subscription_service import SubscriptionService
from src.middleware.auth_middleware import (
    get_current_user, require_trial_or_subscription, log_user_operation, AuthMiddleware
)
from src.models.user import User

router = APIRouter(prefix="/api/chat", tags=["chat"])
logger = logging.getLogger(__name__)

# 请求模型
class ChatMessage(BaseModel):
    role: str = Field(..., description="消息角色：user 或 assistant")
    content: str = Field(..., description="消息内容")

class ChatRequest(BaseModel):
    messages: List[ChatMessage] = Field(..., description="对话历史")
    debug: Optional[bool] = Field(False, description="是否启用调试模式")
    deep_thinking_mode: Optional[bool] = Field(False, description="是否启用深度思考模式")
    search_before_planning: Optional[bool] = Field(False, description="是否在规划前搜索")

class ChatResponse(BaseModel):
    success: bool
    message: str
    response: Optional[Dict[str, Any]] = None
    usage_info: Optional[Dict[str, Any]] = None

class UsageInfo(BaseModel):
    has_subscription: bool
    has_trial: bool
    trial_days_remaining: int
    trial_chats_remaining: int
    daily_chats_remaining: int
    subscription_plan: Optional[str] = None
    subscription_days_remaining: int

# API端点
@router.post("/secure", response_model=ChatResponse)
@log_user_operation("chat_request", "chat", None)
async def secure_chat_endpoint(
    request: ChatRequest,
    current_user: User = Depends(require_trial_or_subscription),
    db: Session = Depends(get_db)
):
    """
    安全的聊天API端点
    需要有效订阅或试用才能访问
    """
    try:
        # 检查用户是否可以访问服务
        can_access, reason = SubscriptionService.can_user_access_service(current_user.id)
        if not can_access:
            raise HTTPException(
                status_code=403,
                detail=f"服务访问被拒绝: {reason}"
            )
        
        # 如果是试用用户，检查使用限制
        if SubscriptionService.has_active_trial(current_user.id):
            success = SubscriptionService.increment_trial_usage(current_user.id)
            if not success:
                raise HTTPException(
                    status_code=403,
                    detail="试用次数已用完，请订阅以继续使用"
                )
        
        # 获取用户订阅信息
        subscription_status = SubscriptionService.get_subscription_status(current_user.id)
        trial_status = SubscriptionService.get_trial_status(current_user.id)
        
        # 构建使用信息
        usage_info = UsageInfo(
            has_subscription=subscription_status["has_subscription"],
            has_trial=trial_status["is_active"],
            trial_days_remaining=trial_status["days_remaining"],
            trial_chats_remaining=trial_status["chats_remaining"],
            daily_chats_remaining=trial_status["daily_chats_remaining"],
            subscription_plan=subscription_status.get("plan_name"),
            subscription_days_remaining=subscription_status["days_remaining"]
        )
        
        # 这里应该调用实际的聊天服务
        # 暂时返回模拟响应
        response_content = {
            "role": "assistant",
            "content": "这是一个安全的聊天响应。您的订阅状态已验证。"
        }
        
        # 记录成功的聊天请求
        AuthMiddleware.log_operation(
            user_id=current_user.id,
            operation_type="chat_success",
            resource="chat",
            details={
                "message_count": len(request.messages),
                "has_subscription": subscription_status["has_subscription"],
                "has_trial": trial_status["is_active"]
            }
        )
        
        return ChatResponse(
            success=True,
            message="聊天请求处理成功",
            response=response_content,
            usage_info=usage_info.dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat request error: {e}")
        
        # 记录失败的聊天请求
        AuthMiddleware.log_operation(
            user_id=current_user.id,
            operation_type="chat_failed",
            resource="chat",
            details={"error": str(e)},
            status="failed"
        )
        
        raise HTTPException(status_code=500, detail="聊天请求处理失败")

@router.get("/usage")
@log_user_operation("usage_queried", "chat", None)
async def get_usage_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    获取用户使用情况信息
    """
    try:
        # 获取用户订阅和试用信息
        subscription_status = SubscriptionService.get_subscription_status(current_user.id)
        trial_status = SubscriptionService.get_trial_status(current_user.id)
        
        return {
            "success": True,
            "subscription": subscription_status,
            "trial": trial_status,
            "can_access": subscription_status["is_active"] or trial_status["is_active"]
        }
        
    except Exception as e:
        logger.error(f"Get usage info error: {e}")
        raise HTTPException(status_code=500, detail="获取使用信息失败")

@router.get("/limits")
async def get_chat_limits(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    获取用户聊天限制信息
    """
    try:
        # 检查用户是否可以访问服务
        can_access, reason = SubscriptionService.can_user_access_service(current_user.id)
        
        if not can_access:
            return {
                "success": True,
                "can_chat": False,
                "reason": reason,
                "limits": None
            }
        
        # 获取用户订阅和试用信息
        subscription_status = SubscriptionService.get_subscription_status(current_user.id)
        trial_status = SubscriptionService.get_trial_status(current_user.id)
        
        limits = {
            "has_subscription": subscription_status["has_subscription"],
            "has_trial": trial_status["is_active"],
            "daily_chat_limit": None,
            "daily_chats_used": None,
            "total_chat_limit": None,
            "total_chats_used": None
        }
        
        if subscription_status["has_subscription"]:
            # 订阅用户通常没有严格限制
            limits["daily_chat_limit"] = 1000  # 合理的每日限制
            limits["daily_chats_used"] = 0  # 这里应该从实际数据获取
            limits["total_chat_limit"] = -1  # 无限制
            limits["total_chats_used"] = 0
        elif trial_status["is_active"]:
            # 试用用户限制
            limits["daily_chat_limit"] = 10
            limits["daily_chats_used"] = trial_status["daily_chats_remaining"]
            limits["total_chat_limit"] = trial_status["max_chats"]
            limits["total_chats_used"] = trial_status["used_chats"]
        
        return {
            "success": True,
            "can_chat": True,
            "reason": None,
            "limits": limits
        }
        
    except Exception as e:
        logger.error(f"Get chat limits error: {e}")
        raise HTTPException(status_code=500, detail="获取聊天限制失败")

@router.post("/trial/create")
@log_user_operation("trial_created", "chat", None)
async def create_trial_access(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    为用户创建试用访问权限
    """
    try:
        # 检查是否已有试用或订阅
        if SubscriptionService.has_active_subscription(current_user.id):
            raise HTTPException(
                status_code=400,
                detail="已有有效订阅，无法创建试用"
            )
        
        if SubscriptionService.has_active_trial(current_user.id):
            raise HTTPException(
                status_code=400,
                detail="已有有效试用"
            )
        
        # 创建试用
        trial = SubscriptionService.create_trial_for_user(current_user.id)
        
        # 获取更新后的试用状态
        trial_status = SubscriptionService.get_trial_status(current_user.id)
        
        return {
            "success": True,
            "message": "试用已创建",
            "trial": trial_status
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create trial error: {e}")
        raise HTTPException(status_code=500, detail="创建试用失败")
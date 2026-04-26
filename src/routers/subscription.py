"""
订阅管理API路由
提供订阅计划、用户订阅状态、试用管理等功能的API接口
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Query, Path, Body
from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List
from datetime import datetime
import logging
from sqlalchemy.orm import Session

from src.database.connection import get_db
from src.services.subscription_service import SubscriptionService
from src.middleware.auth_middleware import (
    get_current_user, get_current_user_optional, require_subscription, log_user_operation, AuthMiddleware
)
from src.models.user import User

router = APIRouter(prefix="/api/subscription", tags=["subscription"])
logger = logging.getLogger(__name__)

# 请求模型
class CreateSubscriptionRequest(BaseModel):
    plan_id: int = Field(..., description="订阅计划ID")
    duration_months: int = Field(1, ge=1, le=12, description="订阅时长（月）")

class SubscriptionStatusResponse(BaseModel):
    has_subscription: bool
    is_active: bool
    plan_name: Optional[str]
    plan_id: Optional[int]
    start_date: Optional[str]
    end_date: Optional[str]
    days_remaining: int
    auto_renew: Optional[bool]
    trial_status: Dict[str, Any]

class TrialStatusResponse(BaseModel):
    has_trial: bool
    is_active: bool
    days_remaining: int
    chats_remaining: int
    daily_chats_remaining: int
    start_date: Optional[str]
    end_date: Optional[str]
    used_chats: int
    max_chats: int

class SubscriptionPlanResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    price: float
    currency: str
    period: str
    features: List[str]
    max_chats_per_day: Optional[int]
    max_searches_per_day: Optional[int]
    api_access: bool
    team_features: bool
    priority_support: bool
    is_active: bool

# API端点
@router.get("/plans", response_model=List[SubscriptionPlanResponse])
def get_subscription_plans(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    获取所有可用的订阅计划
    公开接口，无需登录即可查看
    """
    try:
        plans = SubscriptionService.get_all_plans()
        return [plan.to_dict() for plan in plans]
    except Exception as e:
        logger.error(f"Failed to get subscription plans: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/status", response_model=SubscriptionStatusResponse)
def get_subscription_status(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    获取当前用户的订阅状态
    包括订阅信息和试用状态
    """
    try:
        if not current_user:
            # 未登录用户返回默认状态
            return SubscriptionStatusResponse(
                has_subscription=False,
                is_active=False,
                plan_name='免费版',
                plan_id=None,
                start_date=None,
                end_date=None,
                days_remaining=0,
                auto_renew=False,
                trial_status={
                    "has_trial": False,
                    "is_active": False,
                    "days_remaining": 0,
                    "chats_remaining": 0,
                    "daily_chats_remaining": 10,
                    "start_date": None,
                    "end_date": None,
                    "used_chats": 0,
                    "max_chats": 0
                }
            )
        
        status = SubscriptionService.get_subscription_status(current_user.id)
        return SubscriptionStatusResponse(**status)
    except Exception as e:
        logger.error(f"Failed to get subscription status: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/trial/status", response_model=TrialStatusResponse)
def get_trial_status(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    获取当前用户的试用状态
    """
    try:
        if not current_user:
            # 未登录用户返回默认试用状态
            return TrialStatusResponse(
                has_trial=False,
                is_active=False,
                days_remaining=0,
                chats_remaining=0,
                daily_chats_remaining=10,
                start_date=None,
                end_date=None,
                used_chats=0,
                max_chats=0
            )
        
        status = SubscriptionService.get_trial_status(current_user.id)
        return TrialStatusResponse(**status)
    except Exception as e:
        logger.error(f"Failed to get trial status: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/create", response_model=SubscriptionStatusResponse)
@log_user_operation("subscription_created", "subscription", None)
def create_subscription(
    request: CreateSubscriptionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    创建新的订阅
    需要用户登录验证
    """
    try:
        # 验证订阅计划存在且有效
        plan = SubscriptionService.get_plan_by_id(request.plan_id)
        if not plan:
            raise HTTPException(status_code=404, detail="Subscription plan not found")
        
        if not plan.is_active:
            raise HTTPException(status_code=400, detail="Subscription plan is not active")
        
        # 创建订阅
        subscription = SubscriptionService.create_subscription(
            user_id=current_user.id,
            plan_id=request.plan_id,
            duration_months=request.duration_months
        )
        
        # 返回更新后的状态
        status = SubscriptionService.get_subscription_status(current_user.id)
        return SubscriptionStatusResponse(**status)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to create subscription: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/cancel", response_model=SubscriptionStatusResponse)
@log_user_operation("subscription_cancelled", "subscription", None)
def cancel_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    取消当前用户的订阅
    订阅将在当前周期结束后停止
    """
    try:
        success = SubscriptionService.cancel_subscription(current_user.id)
        if not success:
            raise HTTPException(status_code=404, detail="No active subscription found")
        
        # 返回更新后的状态
        status = SubscriptionService.get_subscription_status(current_user.id)
        return SubscriptionStatusResponse(**status)
        
    except Exception as e:
        logger.error(f"Failed to cancel subscription: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/trial/create", response_model=TrialStatusResponse)
@log_user_operation("trial_created", "subscription", None)
def create_trial(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    为用户创建试用
    每个用户只能创建一次试用
    """
    try:
        # 检查是否已有试用
        existing_trial = SubscriptionService.get_user_trial(current_user.id)
        if existing_trial:
            raise HTTPException(status_code=400, detail="Trial already exists for this user")
        
        # 检查是否已有订阅
        if SubscriptionService.has_active_subscription(current_user.id):
            raise HTTPException(status_code=400, detail="Cannot create trial for user with active subscription")
        
        # 创建试用
        trial = SubscriptionService.create_trial_for_user(current_user.id)
        
        # 返回更新后的状态
        status = SubscriptionService.get_trial_status(current_user.id)
        return TrialStatusResponse(**status)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to create trial: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/check-access")
def check_service_access(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    检查用户是否可以访问服务
    返回访问权限状态和原因
    """
    try:
        can_access, reason = SubscriptionService.can_user_access_service(current_user.id)
        
        return {
            "can_access": can_access,
            "reason": reason,
            "subscription_status": SubscriptionService.get_subscription_status(current_user.id),
            "trial_status": SubscriptionService.get_trial_status(current_user.id)
        }
        
    except Exception as e:
        logger.error(f"Failed to check service access: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/usage/increment")
@log_user_operation("usage_incremented", "subscription", None)
def increment_usage(
    usage_type: str = Body("chat", description="使用类型: chat, search"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    增加用户使用次数（用于试用限制）
    """
    try:
        # 检查用户是否有有效订阅或试用
        can_access, reason = SubscriptionService.can_user_access_service(current_user.id)
        if not can_access:
            raise HTTPException(
                status_code=403, 
                detail=f"Service access denied: {reason}"
            )
        
        # 如果有订阅，直接返回成功
        if SubscriptionService.has_active_subscription(current_user.id):
            return {"success": True, "has_subscription": True}
        
        # 如果是试用，增加使用次数
        if SubscriptionService.has_active_trial(current_user.id):
            success = SubscriptionService.increment_trial_usage(current_user.id)
            if not success:
                raise HTTPException(
                    status_code=403, 
                    detail="Trial limit exceeded"
                )
            return {"success": True, "has_subscription": False, "trial_usage_increased": True}
        
        raise HTTPException(status_code=403, detail="No valid subscription or trial")
        
    except Exception as e:
        logger.error(f"Failed to increment usage: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
"""
订阅服务
管理用户订阅、试用期、权限验证等功能
"""

from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import logging

from src.models.user import User
from src.models.subscription import Subscription, SubscriptionPlan, UserTrial
from src.database.connection import get_db_session
from src.middleware.auth_middleware import AuthMiddleware

logger = logging.getLogger(__name__)

class SubscriptionService:
    """订阅服务类"""
    
    # 试用期配置
    TRIAL_DAYS = 7  # 试用天数
    TRIAL_CHAT_LIMIT = 10  # 试用期间每日聊天次数限制
    
    @staticmethod
    def get_user_subscription(user_id: int) -> Optional[Subscription]:
        """获取用户当前订阅"""
        with get_db_session() as db:
            return db.query(Subscription).filter(
                Subscription.user_id == user_id,
                Subscription.status == 'active',
                Subscription.end_date > datetime.utcnow()
            ).first()
    
    @staticmethod
    def has_active_subscription(user_id: int) -> bool:
        """检查用户是否有有效订阅"""
        subscription = SubscriptionService.get_user_subscription(user_id)
        return subscription is not None
    
    @staticmethod
    def get_user_trial(user_id: int) -> Optional[UserTrial]:
        """获取用户试用信息"""
        with get_db_session() as db:
            return db.query(UserTrial).filter(
                UserTrial.user_id == user_id
            ).first()
    
    @staticmethod
    def has_active_trial(user_id: int) -> bool:
        """检查用户是否有有效试用"""
        trial = SubscriptionService.get_user_trial(user_id)
        if not trial:
            return False
        
        # 检查试用是否过期
        if trial.end_date < datetime.utcnow():
            return False
        
        # 检查试用次数是否用完
        if trial.used_chats >= trial.max_chats:
            return False
        
        return True
    
    @staticmethod
    def can_user_access_service(user_id: int) -> tuple[bool, str]:
        """检查用户是否可以访问服务"""
        # 检查订阅
        if SubscriptionService.has_active_subscription(user_id):
            return True, "subscription_active"
        
        # 检查试用
        if SubscriptionService.has_active_trial(user_id):
            return True, "trial_active"
        
        return False, "no_valid_subscription_or_trial"
    
    @staticmethod
    def create_trial_for_user(user_id: int) -> UserTrial:
        """为用户创建试用"""
        with get_db_session() as db:
            # 检查是否已经有试用
            existing_trial = db.query(UserTrial).filter(
                UserTrial.user_id == user_id
            ).first()
            
            if existing_trial:
                return existing_trial
            
            # 创建新试用
            trial = UserTrial(
                user_id=user_id,
                start_date=datetime.utcnow(),
                end_date=datetime.utcnow() + timedelta(days=SubscriptionService.TRIAL_DAYS),
                max_chats=SubscriptionService.TRIAL_CHAT_LIMIT * SubscriptionService.TRIAL_DAYS,
                used_chats=0,
                is_active=True
            )
            
            db.add(trial)
            db.commit()
            db.refresh(trial)
            
            # 记录操作日志
            AuthMiddleware.log_operation(
                user_id=user_id,
                operation_type="trial_created",
                resource="subscription",
                details={"trial_days": SubscriptionService.TRIAL_DAYS, "max_chats": trial.max_chats}
            )
            
            logger.info(f"Trial created for user {user_id}")
            return trial
    
    @staticmethod
    def increment_trial_usage(user_id: int) -> bool:
        """增加试用使用次数"""
        with get_db_session() as db:
            trial = db.query(UserTrial).filter(
                UserTrial.user_id == user_id,
                UserTrial.is_active == True,
                UserTrial.end_date > datetime.utcnow()
            ).first()
            
            if not trial:
                return False
            
            # 检查今日是否已重置
            today = datetime.utcnow().date()
            if trial.last_chat_date != today:
                trial.daily_chats = 0
                trial.last_chat_date = today
            
            # 检查今日限制
            if trial.daily_chats >= SubscriptionService.TRIAL_CHAT_LIMIT:
                return False
            
            # 增加使用次数
            trial.used_chats += 1
            trial.daily_chats += 1
            
            db.commit()
            return True
    
    @staticmethod
    def get_trial_status(user_id: int) -> Dict[str, Any]:
        """获取试用状态"""
        trial = SubscriptionService.get_user_trial(user_id)
        if not trial:
            return {
                "has_trial": False,
                "is_active": False,
                "days_remaining": 0,
                "chats_remaining": 0,
                "daily_chats_remaining": 0
            }
        
        now = datetime.utcnow()
        days_remaining = max(0, (trial.end_date.date() - now.date()).days)
        chats_remaining = max(0, trial.max_chats - trial.used_chats)
        daily_chats_remaining = max(0, SubscriptionService.TRIAL_CHAT_LIMIT - trial.daily_chats)
        
        return {
            "has_trial": True,
            "is_active": trial.is_active and trial.end_date > now,
            "days_remaining": days_remaining,
            "chats_remaining": chats_remaining,
            "daily_chats_remaining": daily_chats_remaining,
            "start_date": trial.start_date.isoformat(),
            "end_date": trial.end_date.isoformat(),
            "used_chats": trial.used_chats,
            "max_chats": trial.max_chats
        }
    
    @staticmethod
    def get_subscription_status(user_id: int) -> Dict[str, Any]:
        """获取订阅状态"""
        subscription = SubscriptionService.get_user_subscription(user_id)
        trial_status = SubscriptionService.get_trial_status(user_id)
        
        if not subscription:
            return {
                "has_subscription": False,
                "is_active": False,
                "plan_name": None,
                "end_date": None,
                "days_remaining": 0,
                "trial_status": trial_status
            }
        
        now = datetime.utcnow()
        days_remaining = max(0, (subscription.end_date.date() - now.date()).days)
        
        return {
            "has_subscription": True,
            "is_active": subscription.status == 'active' and subscription.end_date > now,
            "plan_name": subscription.plan.name if subscription.plan else None,
            "plan_id": subscription.plan_id,
            "start_date": subscription.start_date.isoformat(),
            "end_date": subscription.end_date.isoformat(),
            "days_remaining": days_remaining,
            "auto_renew": subscription.auto_renew,
            "trial_status": trial_status
        }
    
    @staticmethod
    def create_subscription(user_id: int, plan_id: int, duration_months: int = 1) -> Subscription:
        """为用户创建订阅"""
        with get_db_session() as db:
            # 检查订阅计划是否存在
            plan = db.query(SubscriptionPlan).filter(
                SubscriptionPlan.id == plan_id
            ).first()
            
            if not plan:
                raise ValueError("Subscription plan not found")
            
            # 取消现有订阅
            existing_sub = db.query(Subscription).filter(
                Subscription.user_id == user_id,
                Subscription.status == 'active'
            ).first()
            
            if existing_sub:
                existing_sub.status = 'cancelled'
                existing_sub.updated_at = datetime.utcnow()
            
            # 创建新订阅
            start_date = datetime.utcnow()
            end_date = start_date + timedelta(days=30 * duration_months)
            
            subscription = Subscription(
                user_id=user_id,
                plan_id=plan_id,
                status='active',
                start_date=start_date,
                end_date=end_date,
                auto_renew=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            db.add(subscription)
            db.commit()
            db.refresh(subscription)
            
            # 记录操作日志
            AuthMiddleware.log_operation(
                user_id=user_id,
                operation_type="subscription_created",
                resource="subscription",
                details={
                    "plan_id": plan_id,
                    "plan_name": plan.name,
                    "duration_months": duration_months,
                    "amount": plan.price
                }
            )
            
            logger.info(f"Subscription created for user {user_id}: plan {plan_id}")
            return subscription
    
    @staticmethod
    def cancel_subscription(user_id: int) -> bool:
        """取消用户订阅"""
        with get_db_session() as db:
            subscription = db.query(Subscription).filter(
                Subscription.user_id == user_id,
                Subscription.status == 'active'
            ).first()
            
            if not subscription:
                return False
            
            subscription.status = 'cancelled'
            subscription.updated_at = datetime.utcnow()
            
            db.commit()
            
            # 记录操作日志
            AuthMiddleware.log_operation(
                user_id=user_id,
                operation_type="subscription_cancelled",
                resource="subscription",
                details={"plan_id": subscription.plan_id}
            )
            
            logger.info(f"Subscription cancelled for user {user_id}")
            return True
    
    @staticmethod
    def check_subscription_renewal():
        """检查订阅续费（定时任务）"""
        with get_db_session() as db:
            # 查找即将到期的订阅
            renewal_threshold = datetime.utcnow() + timedelta(days=3)
            expiring_subs = db.query(Subscription).filter(
                Subscription.status == 'active',
                Subscription.end_date <= renewal_threshold,
                Subscription.auto_renew == True
            ).all()
            
            for subscription in expiring_subs:
                # 这里应该调用支付服务进行自动续费
                # 暂时只记录日志
                logger.info(f"Subscription renewal needed for user {subscription.user_id}")
                
                # 记录操作日志
                AuthMiddleware.log_operation(
                    user_id=subscription.user_id,
                    operation_type="subscription_renewal_reminder",
                    resource="subscription",
                    details={
                        "subscription_id": subscription.id,
                        "plan_id": subscription.plan_id,
                        "end_date": subscription.end_date.isoformat()
                    }
                )
    
    @staticmethod
    def get_all_plans() -> List[SubscriptionPlan]:
        """获取所有订阅计划"""
        with get_db_session() as db:
            return db.query(SubscriptionPlan).filter(
                SubscriptionPlan.is_active == True
            ).order_by(SubscriptionPlan.price.asc()).all()
    
    @staticmethod
    def get_plan_by_id(plan_id: int) -> Optional[SubscriptionPlan]:
        """根据ID获取订阅计划"""
        with get_db_session() as db:
            return db.query(SubscriptionPlan).filter(
                SubscriptionPlan.id == plan_id,
                SubscriptionPlan.is_active == True
            ).first()
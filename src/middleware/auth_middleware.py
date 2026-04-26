"""
认证和授权中间件
提供JWT验证、权限检查、操作日志记录等功能
"""

from fastapi import Request, HTTPException, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import logging
import jwt
import os
from typing import Optional, Dict, Any

from src.database.connection import get_db, get_db_session
from functools import wraps
import inspect
from src.services.user_service import UserService
from src.models.user import User
from src.models.operation_log import OperationLog

logger = logging.getLogger(__name__)

# JWT配置
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24
JWT_REFRESH_EXPIRATION_DAYS = 7

# 安全令牌
security = HTTPBearer()

class AuthMiddleware:
    """认证中间件类"""
    
    @staticmethod
    def verify_token(token: str) -> Optional[Dict[str, Any]]:
        """验证JWT令牌"""
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("Token has expired")
            return None
        except jwt.InvalidTokenError:
            logger.warning("Invalid token")
            return None
    
    @staticmethod
    def generate_token(user_id: int, username: str, token_type: str = "access") -> str:
        """生成JWT令牌"""
        if token_type == "access":
            exp = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
        else:  # refresh token
            exp = datetime.utcnow() + timedelta(days=JWT_REFRESH_EXPIRATION_DAYS)
        
        payload = {
            "user_id": user_id,
            "username": username,
            "token_type": token_type,
            "exp": exp,
            "iat": datetime.utcnow()
        }
        return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    
    @staticmethod
    def refresh_token(refresh_token: str) -> Optional[str]:
        """刷新访问令牌"""
        payload = AuthMiddleware.verify_token(refresh_token)
        if not payload or payload.get("token_type") != "refresh":
            return None
        
        return AuthMiddleware.generate_token(payload["user_id"], payload["username"], "access")
    
    @staticmethod
    def get_current_user_from_token(
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ) -> User:
        """从令牌获取当前用户"""
        token = credentials.credentials
        payload = AuthMiddleware.verify_token(token)
        
        if not payload:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        with get_db_session() as db:
            user = db.query(User).filter(User.id == payload["user_id"]).first()
        if not user or not user.is_active:
            raise HTTPException(
                status_code=401,
                detail="User not found or inactive",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return user
    
    @staticmethod
    def require_subscription(user: User = Depends(get_current_user_from_token)) -> User:
        """要求用户有有效订阅"""
        from src.services.subscription_service import SubscriptionService
        
        if not SubscriptionService.has_active_subscription(user.id):
            raise HTTPException(
                status_code=403,
                detail="Active subscription required",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return user
    
    @staticmethod
    def require_trial_or_subscription(user: User = Depends(get_current_user_from_token)) -> User:
        """要求用户有有效试用或订阅"""
        from src.services.subscription_service import SubscriptionService
        
        if not (SubscriptionService.has_active_subscription(user.id) or 
                SubscriptionService.has_active_trial(user.id)):
            raise HTTPException(
                status_code=403,
                detail="Active subscription or trial required",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return user
    
    @staticmethod
    def log_operation(
        user_id: int,
        operation_type: str,
        resource: str,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ):
        """记录操作日志"""
        try:
            with get_db_session() as db:
                log = OperationLog(
                    user_id=user_id,
                    operation_type=operation_type,
                    resource=resource,
                    details=details or {},
                    ip_address=ip_address,
                    user_agent=user_agent,
                    created_at=datetime.utcnow()
                )
                db.add(log)
                db.commit()
        except Exception as e:
            logger.error(f"Failed to log operation: {e}")
    
    @staticmethod
    def detect_anomalous_behavior(
        user_id: int,
        operation_type: str,
        ip_address: Optional[str] = None
    ) -> bool:
        """检测异常行为"""
        try:
            with get_db_session() as db:
                # 检查短时间内的操作频率
                time_threshold = datetime.utcnow() - timedelta(minutes=5)
                recent_operations = db.query(OperationLog).filter(
                    OperationLog.user_id == user_id,
                    OperationLog.operation_type == operation_type,
                    OperationLog.created_at >= time_threshold
                ).count()
                
                # 如果5分钟内同一操作超过10次，视为异常
                if recent_operations > 10:
                    logger.warning(f"Anomalous behavior detected for user {user_id}: "
                                   f"{recent_operations} {operation_type} operations in 5 minutes")
                    return True
                
                # 检查IP地址变化
                if ip_address:
                    last_operation = db.query(OperationLog).filter(
                        OperationLog.user_id == user_id
                    ).order_by(OperationLog.created_at.desc()).first()
                    
                    if last_operation and last_operation.ip_address != ip_address:
                        logger.warning(f"IP address change detected for user {user_id}: "
                                       f"from {last_operation.ip_address} to {ip_address}")
                        return True
                
                return False
        except Exception as e:
            logger.error(f"Failed to detect anomalous behavior: {e}")
            return False

# 快捷依赖项
def get_current_user(user: User = Depends(AuthMiddleware.get_current_user_from_token)) -> User:
    """获取当前用户"""
    return user

def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = None
) -> Optional[User]:
    """可选的当前用户获取（用于公开接口）"""
    try:
        if not credentials:
            return None
            
        token = credentials.credentials
        payload = AuthMiddleware.verify_token(token)
        
        if not payload:
            return None
        
        with get_db_session() as db:
            user = db.query(User).filter(User.id == payload["user_id"]).first()
        if not user or not user.is_active:
            return None
        
        return user
    except Exception:
        return None

def require_subscription(user: User = Depends(AuthMiddleware.require_subscription)) -> User:
    """要求有效订阅"""
    return user

def require_trial_or_subscription(user: User = Depends(AuthMiddleware.require_trial_or_subscription)) -> User:
    """要求有效试用或订阅"""
    return user

def log_user_operation(
    operation_type: str,
    resource: str,
    details: Optional[Dict[str, Any]] = None
):
    """记录用户操作日志的装饰器（保持原函数签名，支持从kwargs获取Request）"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            request: Optional[Request] = kwargs.get('req') or kwargs.get('request')
            user = kwargs.get('user') or kwargs.get('current_user')
            ip_address = request.client.host if request and request.client else None
            user_agent = request.headers.get("user-agent") if request else None

            if user:
                AuthMiddleware.log_operation(
                    user_id=user.id,
                    operation_type=operation_type,
                    resource=resource,
                    details=details,
                    ip_address=ip_address,
                    user_agent=user_agent
                )

            if user and AuthMiddleware.detect_anomalous_behavior(
                user.id, operation_type, ip_address
            ):
                logger.warning(f"Blocking potential anomalous operation for user {user.id}")
                raise HTTPException(
                    status_code=429,
                    detail="Too many requests. Please try again later."
                )

            return await func(*args, **kwargs)
        # 保留原始函数签名，确保FastAPI正确解析请求体
        wrapper.__signature__ = inspect.signature(func)
        return wrapper
    return decorator

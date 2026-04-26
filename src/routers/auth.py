"""
增强的认证API路由
提供安全的用户认证、JWT管理、操作日志等功能
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Header, Body
from pydantic import BaseModel, Field, validator, EmailStr
from typing import Optional, Dict, Any
from datetime import datetime
import logging
from sqlalchemy.orm import Session

from src.database.connection import get_db
from src.services.user_service import UserService
from src.middleware.auth_middleware import (
    get_current_user, AuthMiddleware, log_user_operation
)
from src.models.user import User

router = APIRouter(prefix="/api/auth", tags=["authentication"])
logger = logging.getLogger(__name__)

# 请求模型
class UserRegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="用户名")
    email: EmailStr = Field(..., description="邮箱地址")
    password: str = Field(..., min_length=6, max_length=100, description="密码")
    
    @validator('username')
    def validate_username(cls, v):
        if not v.isalnum() and '_' not in v:
            raise ValueError('用户名只能包含字母、数字和下划线')
        return v.lower()
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('密码长度至少为6位')
        if not any(c.isupper() for c in v):
            raise ValueError('密码必须包含至少一个大写字母')
        if not any(c.islower() for c in v):
            raise ValueError('密码必须包含至少一个小写字母')
        if not any(c.isdigit() for c in v):
            raise ValueError('密码必须包含至少一个数字')
        return v

class UserLoginRequest(BaseModel):
    username: str = Field(..., description="用户名或邮箱")
    password: str = Field(..., description="密码")
    remember_me: bool = Field(False, description="记住我")

class PasswordResetRequest(BaseModel):
    email: EmailStr = Field(..., description="邮箱地址")

class PasswordChangeRequest(BaseModel):
    current_password: str = Field(..., description="当前密码")
    new_password: str = Field(..., min_length=6, description="新密码")
    
    @validator('new_password')
    def validate_new_password(cls, v):
        if len(v) < 6:
            raise ValueError('密码长度至少为6位')
        if not any(c.isupper() for c in v):
            raise ValueError('密码必须包含至少一个大写字母')
        if not any(c.islower() for c in v):
            raise ValueError('密码必须包含至少一个小写字母')
        if not any(c.isdigit() for c in v):
            raise ValueError('密码必须包含至少一个数字')
        return v

class EmailVerificationRequest(BaseModel):
    email: EmailStr = Field(..., description="邮箱地址")
    verification_code: str = Field(..., min_length=6, max_length=6, description="6位验证码")

class ResendVerificationRequest(BaseModel):
    email: EmailStr = Field(..., description="邮箱地址")

class PasswordResetConfirmRequest(BaseModel):
    email: EmailStr = Field(..., description="邮箱地址")
    verification_code: str = Field(..., min_length=6, max_length=6, description="6位验证码")
    new_password: str = Field(..., min_length=6, description="新密码")
    
    @validator('new_password')
    def validate_new_password(cls, v):
        if len(v) < 6:
            raise ValueError('密码长度至少为6位')
        if not any(c.isupper() for c in v):
            raise ValueError('密码必须包含至少一个大写字母')
        if not any(c.islower() for c in v):
            raise ValueError('密码必须包含至少一个小写字母')
        if not any(c.isdigit() for c in v):
            raise ValueError('密码必须包含至少一个数字')
        return v

class AuthResponse(BaseModel):
    success: bool
    message: str
    user: Optional[Dict[str, Any]] = None
    token: Optional[str] = None
    refresh_token: Optional[str] = None
    expires_in: Optional[int] = None

class TokenRefreshResponse(BaseModel):
    success: bool
    token: str
    expires_in: int

# API端点
@router.post("/register-secure", response_model=AuthResponse)
async def register_user(
    request: UserRegisterRequest,
    req: Request,
    db: Session = Depends(get_db)
):
    """
    用户注册，包含严格验证和安全检查
    """
    try:
        # 检测异常行为（防止批量注册）
        if AuthMiddleware.detect_anomalous_behavior(
            user_id=0,
            operation_type="registration_attempt",
            ip_address=req.client.host if req.client else None
        ):
            raise HTTPException(
                status_code=429,
                detail="注册过于频繁，请稍后再试"
            )
        
        # 创建用户
        result = UserService.create_user(
            username=request.username,
            email=request.email,
            password=request.password
        )
        
        if result["success"]:
            user = result["user"]
            
            # 生成访问令牌和刷新令牌
            access_token = AuthMiddleware.generate_token(user["id"], user["username"], "access")
            refresh_token = AuthMiddleware.generate_token(user["id"], user["username"], "refresh")
            
            # 记录成功注册
            AuthMiddleware.log_operation(
                user_id=user["id"],
                operation_type="registration_success",
                resource="auth",
                details={"username": request.username, "email": request.email},
                ip_address=req.client.host if req.client else None,
                user_agent=req.headers.get("user-agent")
            )
            
            return AuthResponse(
                success=True,
                message="注册成功",
                user=user,
                token=access_token,
                refresh_token=refresh_token,
                expires_in=24 * 60 * 60  # 24小时
            )
        else:
            return AuthResponse(
                success=False,
                message=result["message"]
            )
            
    except ValueError as e:
        return AuthResponse(
            success=False,
            message=str(e)
        )
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(status_code=500, detail="注册失败，请稍后重试")

@router.post("/login", response_model=AuthResponse)
async def login_user(
    request: UserLoginRequest,
    req: Request,
    db: Session = Depends(get_db)
):
    """
    用户登录，包含安全验证和异常检测
    """
    try:
        # 检测异常行为（防止暴力破解）
        if AuthMiddleware.detect_anomalous_behavior(
            user_id=0,
            operation_type="login_attempt",
            ip_address=req.client.host if req.client else None
        ):
            raise HTTPException(
                status_code=429,
                detail="登录过于频繁，请稍后再试"
            )
        
        # 验证用户
        result = UserService.authenticate_user(
            username=request.username,
            password=request.password
        )
        
        if result["success"]:
            user = result["user"]
            
            # 生成访问令牌和刷新令牌
            access_token = AuthMiddleware.generate_token(user["id"], user["username"], "access")
            refresh_token = AuthMiddleware.generate_token(user["id"], user["username"], "refresh")
            
            # 记录成功登录
            AuthMiddleware.log_operation(
                user_id=user["id"],
                operation_type="login_success",
                resource="auth",
                details={"username": request.username},
                ip_address=req.client.host if req.client else None,
                user_agent=req.headers.get("user-agent")
            )
            
            return AuthResponse(
                success=True,
                message="登录成功",
                user=user,
                token=access_token,
                refresh_token=refresh_token,
                expires_in=24 * 60 * 60  # 24小时
            )
        else:
            # 记录登录失败
            AuthMiddleware.log_operation(
                user_id=0,
                operation_type="login_failed",
                resource="auth",
                details={"username": request.username, "reason": result["message"]},
                ip_address=req.client.host if req.client else None,
                user_agent=req.headers.get("user-agent")
            )
            
            return AuthResponse(
                success=False,
                message=result["message"]
            )
            
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="登录失败，请稍后重试")

@router.post("/refresh", response_model=TokenRefreshResponse)
async def refresh_token(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    刷新访问令牌
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="未提供刷新令牌")
    
    refresh_token = authorization.split(" ")[1]
    
    try:
        # 验证刷新令牌
        new_access_token = AuthMiddleware.refresh_token(refresh_token)
        
        if not new_access_token:
            raise HTTPException(status_code=401, detail="刷新令牌无效或已过期")
        
        return TokenRefreshResponse(
            success=True,
            token=new_access_token,
            expires_in=24 * 60 * 60  # 24小时
        )
        
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        raise HTTPException(status_code=401, detail="刷新令牌无效")

@router.post("/logout")
async def logout_user(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    用户登出
    """
    try:
        # 记录登出操作
        AuthMiddleware.log_operation(
            user_id=current_user.id,
            operation_type="logout",
            resource="auth",
            details={"username": current_user.username}
        )
        
        # 调用用户服务进行登出处理
        result = UserService.logout_user(current_user.id)
        
        return {"success": True, "message": "登出成功"}
        
    except Exception as e:
        logger.error(f"Logout error: {e}")
        raise HTTPException(status_code=500, detail="登出失败")

@router.get("/me", response_model=Dict[str, Any])
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    获取当前用户信息
    """
    try:
        # 记录访问操作
        AuthMiddleware.log_operation(
            user_id=current_user.id,
            operation_type="profile_access",
            resource="auth",
            details={"username": current_user.username}
        )
        
        return {
            "success": True,
            "user": current_user.to_dict()
        }
        
    except Exception as e:
        logger.error(f"Get user info error: {e}")
        raise HTTPException(status_code=500, detail="获取用户信息失败")

@router.post("/password/reset")
async def request_password_reset(
    request: PasswordResetRequest,
    req: Request,
    db: Session = Depends(get_db)
):
    """
    请求密码重置
    """
    try:
        # 记录密码重置请求
        AuthMiddleware.log_operation(
            user_id=0,
            operation_type="password_reset_request",
            resource="auth",
            details={"email": request.email},
            ip_address=req.client.host if req.client else None,
            user_agent=req.headers.get("user-agent")
        )
        
        # 这里应该发送密码重置邮件
        # 暂时返回成功响应
        return {"success": True, "message": "密码重置邮件已发送"}
        
    except Exception as e:
        logger.error(f"Password reset error: {e}")
        raise HTTPException(status_code=500, detail="密码重置请求失败")

@router.post("/password/change")
async def change_password(
    request: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    修改密码
    """
    try:
        # 验证当前密码
        if not current_user.verify_password(request.current_password):
            raise HTTPException(status_code=400, detail="当前密码错误")
        
        # 更新密码
        result = UserService.update_password(current_user.id, request.new_password)
        
        if result["success"]:
            # 记录密码修改操作
            AuthMiddleware.log_operation(
                user_id=current_user.id,
                operation_type="password_changed",
                resource="auth",
                details={"username": current_user.username}
            )
            
            return {"success": True, "message": "密码修改成功"}
        else:
            raise HTTPException(status_code=400, detail=result["message"])
            
    except Exception as e:
        logger.error(f"Password change error: {e}")
        raise HTTPException(status_code=500, detail="密码修改失败")

@router.get("/security/status")
async def get_security_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    获取用户安全状态
    """
    try:
        # 获取用户安全信息
        security_info = UserService.get_user_security_info(current_user.id)
        
        return {
            "success": True,
            "security": security_info
        }
        
    except Exception as e:
        logger.error(f"Get security status error: {e}")
        raise HTTPException(status_code=500, detail="获取安全状态失败")

# 邮箱验证相关端点
@router.post("/email/verify")
async def verify_email(
    request: EmailVerificationRequest,
    req: Request,
    db: Session = Depends(get_db)
):
    """
    验证邮箱验证码
    """
    try:
        # 验证邮箱验证码
        result = UserService.verify_email_code(request.email, request.verification_code)
        
        if result["success"]:
            # 记录验证成功
            AuthMiddleware.log_operation(
                user_id=result["user"]["id"],
                operation_type="email_verified",
                resource="auth",
                details={"email": request.email},
                ip_address=req.client.host if req.client else None,
                user_agent=req.headers.get("user-agent")
            )
            
            return {
                "success": True,
                "message": "邮箱验证成功",
                "user": result["user"]
            }
        else:
            return {
                "success": False,
                "message": result["message"]
            }
            
    except Exception as e:
        logger.error(f"Email verification error: {e}")
        raise HTTPException(status_code=500, detail="邮箱验证失败")

@router.post("/email/resend-verification")
async def resend_verification_email(
    request: ResendVerificationRequest,
    req: Request,
    db: Session = Depends(get_db)
):
    """
    重新发送邮箱验证邮件
    """
    try:
        # 重新发送验证邮件
        result = UserService.resend_verification_email(request.email)
        
        if result["success"]:
            # 记录重新发送操作
            AuthMiddleware.log_operation(
                user_id=0,
                operation_type="verification_email_resent",
                resource="auth",
                details={"email": request.email},
                ip_address=req.client.host if req.client else None,
                user_agent=req.headers.get("user-agent")
            )
            
            return {
                "success": True,
                "message": "验证邮件已重新发送"
            }
        else:
            return {
                "success": False,
                "message": result["message"]
            }
            
    except Exception as e:
        logger.error(f"Resend verification email error: {e}")
        raise HTTPException(status_code=500, detail="重新发送验证邮件失败")

@router.post("/password/reset-request")
async def request_password_reset(
    request: PasswordResetRequest,
    req: Request,
    db: Session = Depends(get_db)
):
    """
    请求密码重置（发送重置邮件）
    """
    try:
        # 检测异常行为
        if AuthMiddleware.detect_anomalous_behavior(
            user_id=0,
            operation_type="password_reset_request",
            ip_address=req.client.host if req.client else None
        ):
            raise HTTPException(
                status_code=429,
                detail="密码重置请求过于频繁，请稍后再试"
            )
        
        # 发送密码重置邮件
        result = UserService.send_password_reset_email(request.email)
        
        # 记录密码重置请求（无论成功与否，都记录）
        AuthMiddleware.log_operation(
            user_id=0,
            operation_type="password_reset_requested",
            resource="auth",
            details={"email": request.email, "success": result["success"]},
            ip_address=req.client.host if req.client else None,
            user_agent=req.headers.get("user-agent")
        )
        
        if result["success"]:
            return {
                "success": True,
                "message": "密码重置邮件已发送，请查看您的邮箱"
            }
        else:
            return {
                "success": False,
                "message": result["message"]
            }
            
    except Exception as e:
        logger.error(f"Password reset request error: {e}")
        raise HTTPException(status_code=500, detail="密码重置请求失败")

@router.post("/password/reset-confirm")
async def confirm_password_reset(
    request: PasswordResetConfirmRequest,
    req: Request,
    db: Session = Depends(get_db)
):
    """
    确认密码重置
    """
    try:
        # 重置密码
        result = UserService.reset_password(request.reset_token, request.new_password)
        
        if result["success"]:
            # 记录密码重置成功
            AuthMiddleware.log_operation(
                user_id=0,
                operation_type="password_reset_success",
                resource="auth",
                details={"token": request.reset_token[:10] + "..."},  # 只记录部分令牌
                ip_address=req.client.host if req.client else None,
                user_agent=req.headers.get("user-agent")
            )
            
            return {
                "success": True,
                "message": "密码重置成功"
            }
        else:
            return {
                "success": False,
                "message": result["message"]
            }
            
    except Exception as e:
        logger.error(f"Password reset confirm error: {e}")
        raise HTTPException(status_code=500, detail="密码重置失败")

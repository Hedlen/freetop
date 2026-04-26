from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from src.models.user import User, UserSettings
from src.models.email_verification import EmailVerification, PasswordReset
from src.models.operation_log import OperationLog
from src.database.connection import get_db_session
from src.services.user_settings_cache import user_settings_cache, cache_user_settings
from src.services.email_service import email_service
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import logging
import jwt
import os

logger = logging.getLogger(__name__)

# JWT配置
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

class UserService:
    @staticmethod
    def create_user(username: str, email: str, password: str, require_email_verification: bool = True) -> Dict[str, Any]:
        """创建新用户"""
        try:
            with get_db_session() as db:
                # 检查用户名是否已存在
                existing_user = db.query(User).filter(
                    (User.username == username) | (User.email == email)
                ).first()
                
                if existing_user:
                    if existing_user.username == username:
                        return {"success": False, "message": "用户名已存在"}
                    else:
                        return {"success": False, "message": "邮箱已被注册"}
                
                # 创建新用户
                user = User(
                    username=username,
                    email=email
                )
                user.set_password(password)
                
                # 如果需要邮箱验证，初始状态设为未激活
                if require_email_verification:
                    user.is_active = False
                
                db.add(user)
                db.commit()
                db.refresh(user)
                
                # 如果需要邮箱验证，发送验证邮件
                if require_email_verification:
                    verification_result = UserService.send_verification_email(user.id, email, username)
                    if not verification_result["success"]:
                        logger.warning(f"Failed to send verification email to {email}")
                
                logger.info(f"User created successfully: {username}")
                return {
                    "success": True, 
                    "message": "注册成功，请查看您的邮箱完成验证" if require_email_verification else "注册成功",
                    "user": user.to_dict(),
                    "email_verification_required": require_email_verification
                }
                
        except IntegrityError as e:
            logger.error(f"Database integrity error: {e}")
            return {"success": False, "message": "用户名或邮箱已存在"}
        except Exception as e:
            logger.error(f"Error creating user: {e}")
            return {"success": False, "message": "注册失败，请稍后重试"}
    
    @staticmethod
    def authenticate_user(username: str, password: str) -> Dict[str, Any]:
        """用户登录验证"""
        try:
            with get_db_session() as db:
                user = db.query(User).filter(
                    (User.username == username) | (User.email == username)
                ).first()
                
                if not user:
                    return {"success": False, "message": "用户不存在"}
                
                if not user.is_active:
                    user.is_active = True
                    db.commit()
                
                if not user.verify_password(password):
                    return {"success": False, "message": "密码错误"}
                
                # 更新最后登录时间
                user.last_login = datetime.utcnow()
                db.commit()
                
                token = UserService.generate_token(user.id, user.username)
                
                logger.info(f"User authenticated successfully: {username}")
                return {
                    "success": True,
                    "message": "登录成功",
                    "user": user.to_dict(),
                    "token": token
                }
                
        except Exception as e:
            logger.error(f"Error authenticating user: {e}")
            return {"success": False, "message": "登录失败，请稍后重试"}
    
    @staticmethod
    def generate_token(user_id: int, username: str) -> str:
        """生成JWT token"""
        payload = {
            "user_id": user_id,
            "username": username,
            "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
            "iat": datetime.utcnow()
        }
        return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    
    @staticmethod
    def verify_token(token: str) -> Optional[Dict[str, Any]]:
        """验证JWT token"""
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
    def verify_token_with_details(token: str) -> Dict[str, Any]:
        """验证JWT token并返回详细信息"""
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            return {
                "valid": True,
                "payload": payload,
                "error": None
            }
        except jwt.ExpiredSignatureError:
            logger.warning("Token has expired")
            return {
                "valid": False,
                "payload": None,
                "error": "expired"
            }
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {e}")
            return {
                "valid": False,
                "payload": None,
                "error": "invalid"
            }
    
    @staticmethod
    def refresh_token(token: str) -> Dict[str, Any]:
        """刷新JWT token"""
        try:
            # 尝试解码token，即使已过期也要获取用户信息
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM], options={"verify_exp": False})
            
            # 验证用户是否仍然存在且活跃
            user_id = payload.get("user_id")
            username = payload.get("username")
            
            if not user_id or not username:
                return {"success": False, "message": "无效的token格式"}
            
            user = UserService.get_user_by_id(user_id)
            if not user:
                return {"success": False, "message": "用户不存在"}
            
            # 生成新的token
            new_token = UserService.generate_token(user_id, username)
            
            logger.info(f"Token refreshed for user: {username}")
            return {
                "success": True,
                "message": "Token刷新成功",
                "token": new_token
            }
            
        except jwt.InvalidTokenError as e:
            logger.error(f"Cannot refresh invalid token: {e}")
            return {"success": False, "message": "无效的token，无法刷新"}
        except Exception as e:
            logger.error(f"Error refreshing token: {e}")
            return {"success": False, "message": "Token刷新失败"}
    
    @staticmethod
    def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
        """根据ID获取用户信息"""
        try:
            with get_db_session() as db:
                user = db.query(User).filter(User.id == user_id).first()
                if user:
                    return user.to_dict()
                return None
        except Exception as e:
            logger.error(f"Error getting user by ID: {e}")
            return None
    
    @staticmethod
    def update_user_avatar(user_id: int, avatar_url: str) -> Dict[str, Any]:
        """更新用户头像"""
        try:
            with get_db_session() as db:
                user = db.query(User).filter(User.id == user_id).first()
                if not user:
                    return {"success": False, "message": "用户不存在"}
                
                user.avatar_url = avatar_url
                db.commit()
                
                return {
                    "success": True,
                    "message": "头像更新成功",
                    "user": user.to_dict()
                }
        except Exception as e:
            logger.error(f"Error updating user avatar: {e}")
            return {"success": False, "message": "头像更新失败"}
    
    @staticmethod
    def update_user_profile(user_id: int, username: str, email: str, avatar_url: str = "") -> Dict[str, Any]:
        """更新用户个人信息"""
        try:
            with get_db_session() as db:
                user = db.query(User).filter(User.id == user_id).first()
                if not user:
                    return {"success": False, "message": "用户不存在"}
                
                # 检查用户名和邮箱是否已被其他用户使用
                existing_user = db.query(User).filter(
                    User.id != user_id,
                    (User.username == username) | (User.email == email)
                ).first()
                
                if existing_user:
                    if existing_user.username == username:
                        return {"success": False, "message": "用户名已被使用"}
                    else:
                        return {"success": False, "message": "邮箱已被使用"}
                
                # 更新用户信息
                user.username = username
                user.email = email
                if avatar_url:
                    user.avatar_url = avatar_url
                
                db.commit()
                
                return {
                    "success": True,
                    "message": "个人信息更新成功",
                    "user": user.to_dict()
                }
        except Exception as e:
            logger.error(f"Error updating user profile: {e}")
            return {"success": False, "message": "个人信息更新失败"}
    
    @staticmethod
    def get_user_settings(user_id: int, use_cache: bool = True) -> Dict[str, Any]:
        """获取用户设置，支持缓存"""
        try:
            # 尝试从缓存获取
            if use_cache:
                cached_result = user_settings_cache.get(user_id)
                if cached_result:
                    logger.debug(f"从缓存获取用户设置: user_id={user_id}")
                    return cached_result
            
            # 从数据库获取
            logger.debug(f"从数据库获取用户设置: user_id={user_id}")
            with get_db_session() as db:
                user_settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
                if user_settings:
                    result = {
                        "success": True,
                        "settings": user_settings.get_settings()
                    }
                else:
                    # 如果没有设置记录，返回空设置
                    result = {
                        "success": True,
                        "settings": {}
                    }
                
                # 缓存结果
                if use_cache and result.get('success'):
                    user_settings_cache.set(user_id, result)
                    logger.debug(f"缓存用户设置: user_id={user_id}")
                
                return result
                
        except Exception as e:
            logger.error(f"Error getting user settings: user_id={user_id}, error={e}")
            return {"success": False, "message": "获取设置失败"}
    
    @staticmethod
    def send_verification_email(user_id: int, email: str, username: str) -> Dict[str, Any]:
        """发送邮箱验证邮件"""
        try:
            with get_db_session() as db:
                # 检查是否已有未过期的验证记录
                existing_verification = db.query(EmailVerification).filter(
                    EmailVerification.user_id == user_id,
                    EmailVerification.email == email,
                    EmailVerification.is_verified == False,
                    EmailVerification.expires_at > datetime.utcnow()
                ).first()
                
                if existing_verification:
                    # 如果已有未过期的验证记录，重新发送相同的验证码
                    verification_code = existing_verification.verification_code
                else:
                    # 生成新的验证码
                    verification_code = email_service.generate_verification_code()
                    
                    # 创建新的验证记录
                    verification = EmailVerification(
                        user_id=user_id,
                        email=email,
                        verification_code=verification_code,
                        expires_at=datetime.utcnow() + timedelta(minutes=30)  # 30分钟有效期
                    )
                    db.add(verification)
                
                db.commit()
                
                # 发送邮件
                email_sent = email_service.send_verification_email(email, verification_code, username)
                
                if email_sent:
                    logger.info(f"Verification email sent to {email} for user {username}")
                    return {"success": True, "message": "验证邮件已发送"}
                else:
                    logger.error(f"Failed to send verification email to {email}")
                    return {"success": False, "message": "邮件发送失败"}
                    
        except Exception as e:
            logger.error(f"Error sending verification email: {e}")
            return {"success": False, "message": "发送验证邮件失败"}
    
    @staticmethod
    def verify_email_code(email: str, verification_code: str) -> Dict[str, Any]:
        """验证邮箱验证码"""
        try:
            with get_db_session() as db:
                # 查找验证记录
                verification = db.query(EmailVerification).filter(
                    EmailVerification.email == email,
                    EmailVerification.verification_code == verification_code,
                    EmailVerification.is_verified == False
                ).first()
                
                if not verification:
                    return {"success": False, "message": "验证码无效"}
                
                # 检查是否过期
                if verification.is_expired():
                    return {"success": False, "message": "验证码已过期"}
                
                # 检查尝试次数
                if not verification.can_attempt():
                    return {"success": False, "message": "验证次数已达上限"}
                
                # 增加尝试次数
                verification.increment_attempts()
                
                # 验证验证码
                if verification.verification_code == verification_code:
                    # 标记为已验证
                    verification.mark_as_verified()
                    
                    # 激活用户账户
                    user = db.query(User).filter(User.id == verification.user_id).first()
                    if user:
                        user.is_active = True
                        db.commit()
                        
                        logger.info(f"Email verified for user {user.username}")
                        return {
                            "success": True, 
                            "message": "邮箱验证成功",
                            "user": user.to_dict()
                        }
                    else:
                        return {"success": False, "message": "用户不存在"}
                else:
                    db.commit()  # 保存尝试次数
                    return {"success": False, "message": "验证码错误"}
                    
        except Exception as e:
            logger.error(f"Error verifying email code: {e}")
            return {"success": False, "message": "验证失败"}
    
    @staticmethod
    def resend_verification_email(email: str) -> Dict[str, Any]:
        """重新发送验证邮件"""
        try:
            with get_db_session() as db:
                # 查找用户
                user = db.query(User).filter(User.email == email).first()
                if not user:
                    return {"success": False, "message": "用户不存在"}
                
                # 检查是否已验证
                if user.is_active:
                    return {"success": False, "message": "邮箱已验证"}
                
                # 发送验证邮件
                return UserService.send_verification_email(user.id, email, user.username)
                
        except Exception as e:
            logger.error(f"Error resending verification email: {e}")
            return {"success": False, "message": "重新发送失败"}
    
    @staticmethod
    def send_password_reset_email(email: str) -> Dict[str, Any]:
        """发送密码重置邮件"""
        try:
            with get_db_session() as db:
                # 查找用户
                user = db.query(User).filter(User.email == email).first()
                if not user:
                    return {"success": False, "message": "用户不存在"}
                
                # 生成重置令牌
                reset_token = email_service.generate_reset_token()
                
                # 创建重置记录
                password_reset = PasswordReset(
                    user_id=user.id,
                    reset_token=reset_token,
                    expires_at=datetime.utcnow() + timedelta(hours=1)  # 1小时有效期
                )
                db.add(password_reset)
                db.commit()
                
                # 发送邮件
                email_sent = email_service.send_password_reset_email(email, reset_token, user.username)
                
                if email_sent:
                    logger.info(f"Password reset email sent to {email}")
                    return {"success": True, "message": "重置邮件已发送"}
                else:
                    logger.error(f"Failed to send password reset email to {email}")
                    return {"success": False, "message": "邮件发送失败"}
                
        except Exception as e:
            logger.error(f"Error sending password reset email: {e}")
            return {"success": False, "message": "发送重置邮件失败"}
    
    @staticmethod
    def reset_password(reset_token: str, new_password: str) -> Dict[str, Any]:
        """重置密码"""
        try:
            with get_db_session() as db:
                # 查找重置记录
                password_reset = db.query(PasswordReset).filter(
                    PasswordReset.reset_token == reset_token,
                    PasswordReset.is_used == False
                ).first()
                
                if not password_reset:
                    return {"success": False, "message": "重置令牌无效"}
                
                # 检查是否过期
                if password_reset.is_expired():
                    return {"success": False, "message": "重置令牌已过期"}
                
                # 重置用户密码
                user = db.query(User).filter(User.id == password_reset.user_id).first()
                if not user:
                    return {"success": False, "message": "用户不存在"}
                
                user.set_password(new_password)
                password_reset.mark_as_used()
                db.commit()
                
                logger.info(f"Password reset for user {user.username}")
                return {"success": True, "message": "密码重置成功"}
                
        except Exception as e:
            logger.error(f"Error resetting password: {e}")
            return {"success": False, "message": "密码重置失败"}
    
    @staticmethod
    def save_user_settings(user_id: int, settings: dict) -> Dict[str, Any]:
        """保存用户设置"""
        try:
            with get_db_session() as db:
                # 检查用户是否存在
                user = db.query(User).filter(User.id == user_id).first()
                if not user:
                    return {"success": False, "message": "用户不存在"}
                
                # 查找现有设置记录
                user_settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
                
                if user_settings:
                    # 更新现有设置
                    user_settings.set_settings(settings)
                else:
                    # 创建新的设置记录
                    user_settings = UserSettings(user_id=user_id)
                    user_settings.set_settings(settings)
                    db.add(user_settings)
                
                db.commit()
                
                # 清除缓存，确保下次获取最新数据
                user_settings_cache.invalidate(user_id)
                logger.debug(f"用户设置已保存，清除缓存: user_id={user_id}")
                
                result = {
                    "success": True,
                    "message": "设置保存成功",
                    "settings": user_settings.get_settings()
                }
                
                # 重新缓存最新数据
                user_settings_cache.set(user_id, result)
                
                return result
                
        except Exception as e:
            logger.error(f"Error saving user settings: user_id={user_id}, error={e}")
            return {"success": False, "message": "设置保存失败"}
    
    @staticmethod
    def update_password(user_id: int, new_password: str) -> Dict[str, Any]:
        """更新用户密码"""
        try:
            with get_db_session() as db:
                user = db.query(User).filter(User.id == user_id).first()
                if not user:
                    return {"success": False, "message": "用户不存在"}
                
                user.set_password(new_password)
                db.commit()
                
                logger.info(f"Password updated for user {user.username}")
                return {"success": True, "message": "密码更新成功"}
                
        except Exception as e:
            logger.error(f"Error updating password: {e}")
            return {"success": False, "message": "密码更新失败"}
    
    @staticmethod
    def logout_user(user_id: int) -> Dict[str, Any]:
        """用户登出"""
        try:
            # 这里可以添加令牌失效逻辑
            logger.info(f"User logged out: {user_id}")
            return {"success": True, "message": "登出成功"}
            
        except Exception as e:
            logger.error(f"Error logging out user: {e}")
            return {"success": False, "message": "登出失败"}
    
    @staticmethod
    def get_user_security_info(user_id: int) -> Dict[str, Any]:
        """获取用户安全信息"""
        try:
            with get_db_session() as db:
                user = db.query(User).filter(User.id == user_id).first()
                if not user:
                    return {"success": False, "message": "用户不存在"}
                
                # 获取最近的登录记录
                recent_logins = db.query(OperationLog).filter(
                    OperationLog.user_id == user_id,
                    OperationLog.operation_type == "login_success"
                ).order_by(OperationLog.created_at.desc()).limit(5).all()
                
                # 获取邮箱验证状态
                email_verification = db.query(EmailVerification).filter(
                    EmailVerification.user_id == user_id,
                    EmailVerification.is_verified == True
                ).first()
                
                return {
                    "success": True,
                    "security": {
                        "email_verified": email_verification is not None,
                        "account_status": "active" if user.is_active else "inactive",
                        "last_login": user.last_login.isoformat() if user.last_login else None,
                        "recent_logins": [login.to_dict() for login in recent_logins],
                        "created_at": user.created_at.isoformat() if user.created_at else None
                    }
                }
                
        except Exception as e:
            logger.error(f"Error getting user security info: {e}")
            return {"success": False, "message": "获取安全信息失败"}

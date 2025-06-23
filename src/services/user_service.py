from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from src.models.user import User, UserSettings
from src.database.connection import get_db_session
from datetime import datetime
from typing import Optional, Dict, Any
import logging
import jwt
import os
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# JWT配置
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

class UserService:
    @staticmethod
    def create_user(username: str, email: str, password: str) -> Dict[str, Any]:
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
                
                db.add(user)
                db.commit()
                db.refresh(user)
                
                logger.info(f"User created successfully: {username}")
                return {
                    "success": True, 
                    "message": "注册成功",
                    "user": user.to_dict()
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
                    return {"success": False, "message": "账户已被禁用"}
                
                if not user.verify_password(password):
                    return {"success": False, "message": "密码错误"}
                
                # 更新最后登录时间
                user.last_login = datetime.utcnow()
                db.commit()
                
                # 生成JWT token
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
    def get_user_settings(user_id: int) -> Dict[str, Any]:
        """获取用户设置"""
        try:
            with get_db_session() as db:
                user_settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
                if user_settings:
                    return {
                        "success": True,
                        "settings": user_settings.get_settings()
                    }
                else:
                    # 如果没有设置记录，返回空设置
                    return {
                        "success": True,
                        "settings": {}
                    }
        except Exception as e:
            logger.error(f"Error getting user settings: {e}")
            return {"success": False, "message": "获取设置失败"}
    
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
                
                return {
                    "success": True,
                    "message": "设置保存成功",
                    "settings": user_settings.get_settings()
                }
        except Exception as e:
            logger.error(f"Error saving user settings: {e}")
            return {"success": False, "message": "设置保存失败"}
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import hashlib
import secrets
import bcrypt
import json

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    salt = Column(String(32), nullable=False)
    avatar_url = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    def set_password(self, password: str):
        """设置密码，使用bcrypt哈希"""
        self.salt = secrets.token_hex(16)
        password_bytes = (password + self.salt).encode('utf-8')
        self.password_hash = bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode('utf-8')
    
    def verify_password(self, password: str) -> bool:
        """验证密码"""
        password_bytes = (password + self.salt).encode('utf-8')
        return bcrypt.checkpw(password_bytes, self.password_hash.encode('utf-8'))
    
    def to_dict(self) -> dict:
        """转换为字典格式"""
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "avatar_url": self.avatar_url,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_login": self.last_login.isoformat() if self.last_login else None
        }
    
    @staticmethod
    def _hash_password(password: str, salt: str) -> str:
        """使用SHA-256和盐值哈希密码"""
        return hashlib.sha256((password + salt).encode()).hexdigest()


class UserSettings(Base):
    __tablename__ = "user_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    settings_data = Column(Text, nullable=False)  # JSON格式存储设置
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 建立与User的关系
    user = relationship("User", backref="settings")
    
    def set_settings(self, settings_dict: dict):
        """设置用户配置"""
        self.settings_data = json.dumps(settings_dict, ensure_ascii=False)
    
    def get_settings(self) -> dict:
        """获取用户配置"""
        try:
            return json.loads(self.settings_data) if self.settings_data else {}
        except json.JSONDecodeError:
            return {}
    
    def to_dict(self) -> dict:
        """转换为字典格式"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "settings": self.get_settings(),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
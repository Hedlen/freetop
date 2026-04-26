from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import secrets

Base = declarative_base()

class EmailVerification(Base):
    __tablename__ = "email_verifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    email = Column(String(100), nullable=False, index=True)
    verification_code = Column(String(6), nullable=False, index=True)
    is_verified = Column(Boolean, default=False)
    attempts = Column(Integer, default=0)
    max_attempts = Column(Integer, default=5)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    verified_at = Column(DateTime(timezone=True), nullable=True)
    
    # 建立与User的关系
    user = relationship("User", backref="email_verifications")
    
    def is_expired(self) -> bool:
        """检查验证码是否过期"""
        return datetime.utcnow() > self.expires_at
    
    def can_attempt(self) -> bool:
        """检查是否还可以尝试验证"""
        return self.attempts < self.max_attempts and not self.is_verified
    
    def increment_attempts(self):
        """增加尝试次数"""
        self.attempts += 1
    
    def mark_as_verified(self):
        """标记为已验证"""
        self.is_verified = True
        self.verified_at = datetime.utcnow()
    
    def to_dict(self) -> dict:
        """转换为字典格式"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "email": self.email,
            "is_verified": self.is_verified,
            "attempts": self.attempts,
            "max_attempts": self.max_attempts,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "verified_at": self.verified_at.isoformat() if self.verified_at else None,
            "is_expired": self.is_expired()
        }

class PasswordReset(Base):
    __tablename__ = "password_resets"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reset_token = Column(String(64), nullable=False, unique=True, index=True)
    is_used = Column(Boolean, default=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    used_at = Column(DateTime(timezone=True), nullable=True)
    
    # 建立与User的关系
    user = relationship("User", backref="password_resets")
    
    def is_expired(self) -> bool:
        """检查重置令牌是否过期"""
        return datetime.utcnow() > self.expires_at
    
    def mark_as_used(self):
        """标记为已使用"""
        self.is_used = True
        self.used_at = datetime.utcnow()
    
    def to_dict(self) -> dict:
        """转换为字典格式"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "is_used": self.is_used,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "used_at": self.used_at.isoformat() if self.used_at else None,
            "is_expired": self.is_expired()
        }
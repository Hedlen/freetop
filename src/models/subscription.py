"""
订阅相关模型
管理用户订阅、订阅计划、试用期等
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Numeric, Text, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import json
from .user import Base

class SubscriptionPlan(Base):
    """订阅计划表"""
    __tablename__ = "subscription_plans"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)
    price = Column(Numeric(10, 2), nullable=False, index=True)  # 价格，支持小数
    currency = Column(String(3), nullable=False, default="CNY")  # 货币代码
    period = Column(String(20), nullable=False, default="monthly")  # 周期：monthly, yearly
    features = Column(Text, nullable=True)  # 功能列表（JSON格式）
    max_chats_per_day = Column(Integer, nullable=True)  # 每日聊天次数限制
    max_searches_per_day = Column(Integer, nullable=True)  # 每日搜索次数限制
    api_access = Column(Boolean, default=False)  # 是否支持API访问
    team_features = Column(Boolean, default=False)  # 是否支持团队功能
    priority_support = Column(Boolean, default=False)  # 是否支持优先技术支持
    is_active = Column(Boolean, default=True, index=True)  # 是否激活
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 建立与Subscription的关系（注释掉以避免循环导入问题）
    # subscriptions = relationship("Subscription", backref="plan")
    
    def set_features(self, features_list: list):
        """设置功能列表"""
        self.features = json.dumps(features_list, ensure_ascii=False)
    
    def get_features(self) -> list:
        """获取功能列表"""
        try:
            return json.loads(self.features) if self.features else []
        except json.JSONDecodeError:
            return []
    
    def to_dict(self) -> dict:
        """转换为字典格式"""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "price": float(self.price),
            "currency": self.currency,
            "period": self.period,
            "features": self.get_features(),
            "max_chats_per_day": self.max_chats_per_day,
            "max_searches_per_day": self.max_searches_per_day,
            "api_access": self.api_access,
            "team_features": self.team_features,
            "priority_support": self.priority_support,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

class Subscription(Base):
    """用户订阅表"""
    __tablename__ = "subscriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    plan_id = Column(Integer, ForeignKey("subscription_plans.id"), nullable=False, index=True)
    status = Column(String(20), nullable=False, default="active", index=True)  # active, inactive, cancelled, expired
    start_date = Column(DateTime(timezone=True), nullable=False, index=True)
    end_date = Column(DateTime(timezone=True), nullable=False, index=True)
    auto_renew = Column(Boolean, default=True)  # 是否自动续费
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=True)  # 关联的支付记录
    cancelled_at = Column(DateTime(timezone=True), nullable=True)  # 取消时间
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 建立关系（注释掉以避免循环导入问题）
    # user = relationship("User", backref="subscriptions")
    # payment = relationship("Payment", backref="subscription")
    
    # 创建复合索引以提高查询性能
    __table_args__ = (
        Index('idx_user_status', 'user_id', 'status'),
        Index('idx_end_date_status', 'end_date', 'status'),
        Index('idx_user_active', 'user_id', 'status', 'end_date'),
    )
    
    def is_active(self) -> bool:
        """检查订阅是否有效"""
        return (self.status == "active" and 
                self.start_date <= datetime.utcnow() <= self.end_date)
    
    def to_dict(self) -> dict:
        """转换为字典格式"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "plan_id": self.plan_id,
            "status": self.status,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "auto_renew": self.auto_renew,
            "payment_id": self.payment_id,
            "cancelled_at": self.cancelled_at.isoformat() if self.cancelled_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "plan": self.plan.to_dict() if self.plan else None
        }

class UserTrial(Base):
    """用户试用期表"""
    __tablename__ = "user_trials"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True)
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    max_chats = Column(Integer, nullable=False, default=70)  # 试用期间总聊天次数
    used_chats = Column(Integer, nullable=False, default=0)  # 已使用的聊天次数
    max_searches = Column(Integer, nullable=True, default=50)  # 试用期间总搜索次数
    used_searches = Column(Integer, nullable=True, default=0)  # 已使用的搜索次数
    daily_chat_limit = Column(Integer, nullable=False, default=10)  # 每日聊天次数限制
    daily_chats = Column(Integer, nullable=False, default=0)  # 今日已使用聊天次数
    last_chat_date = Column(DateTime(timezone=True), nullable=True)  # 最后聊天日期
    is_active = Column(Boolean, default=True, index=True)  # 是否激活
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 建立与User的关系（注释掉以避免循环导入问题）
    # user = relationship("User", backref="trial")
    
    def is_valid(self) -> bool:
        """检查试用是否有效"""
        now = datetime.utcnow()
        return (self.is_active and 
                self.start_date <= now <= self.end_date and
                self.used_chats < self.max_chats)
    
    def can_chat_today(self) -> bool:
        """检查今日是否可以聊天"""
        if not self.is_valid():
            return False
        
        # 检查每日限制
        today = datetime.utcnow().date()
        if self.last_chat_date and self.last_chat_date.date() != today:
            # 新的一天，重置每日计数
            return True
        
        return self.daily_chats < self.daily_chat_limit
    
    def increment_usage(self, usage_type: str = "chat") -> bool:
        """增加使用次数"""
        if usage_type == "chat":
            if self.used_chats >= self.max_chats:
                return False
            
            # 检查每日限制
            today = datetime.utcnow().date()
            if self.last_chat_date and self.last_chat_date.date() != today:
                self.daily_chats = 0
                self.last_chat_date = datetime.utcnow()
            
            if self.daily_chats >= self.daily_chat_limit:
                return False
            
            self.used_chats += 1
            self.daily_chats += 1
            self.last_chat_date = datetime.utcnow()
            return True
        
        elif usage_type == "search" and self.max_searches:
            if self.used_searches >= self.max_searches:
                return False
            self.used_searches += 1
            return True
        
        return False
    
    def to_dict(self) -> dict:
        """转换为字典格式"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "max_chats": self.max_chats,
            "used_chats": self.used_chats,
            "max_searches": self.max_searches,
            "used_searches": self.used_searches,
            "daily_chat_limit": self.daily_chat_limit,
            "daily_chats": self.daily_chats,
            "last_chat_date": self.last_chat_date.isoformat() if self.last_chat_date else None,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
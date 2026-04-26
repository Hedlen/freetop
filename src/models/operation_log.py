"""
操作日志模型
用于记录用户操作、安全事件和系统行为
"""

from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Index, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import json

Base = declarative_base()

class OperationLog(Base):
    """操作日志表"""
    __tablename__ = "operation_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    operation_type = Column(String(50), nullable=False, index=True)  # 操作类型
    resource = Column(String(100), nullable=False, index=True)  # 资源名称
    details = Column(Text, nullable=True)  # 详细信息（JSON格式）
    ip_address = Column(String(45), nullable=True, index=True)  # IP地址
    user_agent = Column(String(500), nullable=True)  # 用户代理
    status = Column(String(20), default="success", index=True)  # 操作状态
    error_message = Column(Text, nullable=True)  # 错误信息
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # 建立与User的关系
    user = relationship("User", backref="operation_logs")
    
    # 创建复合索引以提高查询性能
    __table_args__ = (
        Index('idx_user_operation', 'user_id', 'operation_type'),
        Index('idx_user_created', 'user_id', 'created_at'),
        Index('idx_operation_type_created', 'operation_type', 'created_at'),
    )
    
    def set_details(self, details_dict: dict):
        """设置详细信息"""
        self.details = json.dumps(details_dict, ensure_ascii=False)
    
    def get_details(self) -> dict:
        """获取详细信息"""
        try:
            return json.loads(self.details) if self.details else {}
        except json.JSONDecodeError:
            return {}
    
    def to_dict(self) -> dict:
        """转换为字典格式"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "operation_type": self.operation_type,
            "resource": self.resource,
            "details": self.get_details(),
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "status": self.status,
            "error_message": self.error_message,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class SecurityEvent(Base):
    """安全事件表"""
    __tablename__ = "security_events"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # 可能为None（系统事件）
    event_type = Column(String(50), nullable=False, index=True)  # 事件类型
    severity = Column(String(20), nullable=False, index=True)  # 严重程度
    description = Column(Text, nullable=False)  # 事件描述
    details = Column(Text, nullable=True)  # 详细信息（JSON格式）
    ip_address = Column(String(45), nullable=True, index=True)  # IP地址
    user_agent = Column(String(500), nullable=True)  # 用户代理
    resolved = Column(Boolean, default=False, index=True)  # 是否已解决
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # 建立与User的关系
    user = relationship("User", backref="security_events")
    
    # 创建复合索引以提高查询性能
    __table_args__ = (
        Index('idx_user_event_type', 'user_id', 'event_type'),
        Index('idx_severity_created', 'severity', 'created_at'),
        Index('idx_unresolved_events', 'resolved', 'created_at'),
    )
    
    def set_details(self, details_dict: dict):
        """设置详细信息"""
        self.details = json.dumps(details_dict, ensure_ascii=False)
    
    def get_details(self) -> dict:
        """获取详细信息"""
        try:
            return json.loads(self.details) if self.details else {}
        except json.JSONDecodeError:
            return {}
    
    def to_dict(self) -> dict:
        """转换为字典格式"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "event_type": self.event_type,
            "severity": self.severity,
            "description": self.description,
            "details": self.get_details(),
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "resolved": self.resolved,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class LoginAttempt(Base):
    """登录尝试表"""
    __tablename__ = "login_attempts"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), nullable=True, index=True)  # 尝试登录的用户名
    ip_address = Column(String(45), nullable=False, index=True)  # IP地址
    user_agent = Column(String(500), nullable=True)  # 用户代理
    success = Column(Boolean, nullable=False, index=True)  # 是否成功
    failure_reason = Column(String(100), nullable=True)  # 失败原因
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # 创建复合索引以提高查询性能
    __table_args__ = (
        Index('idx_ip_success', 'ip_address', 'success'),
        Index('idx_username_success', 'username', 'success'),
        Index('idx_created_ip', 'created_at', 'ip_address'),
    )
    
    def to_dict(self) -> dict:
        """转换为字典格式"""
        return {
            "id": self.id,
            "username": self.username,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "success": self.success,
            "failure_reason": self.failure_reason,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
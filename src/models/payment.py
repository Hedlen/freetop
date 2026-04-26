from sqlalchemy import Column, Integer, String, DateTime, Numeric, ForeignKey, Boolean, Text, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .user import Base

class Order(Base):
    __tablename__ = "orders"
    
    # 订单状态枚举
    STATUS_CREATED = "created"          # 订单已创建
    STATUS_PENDING = "pending"          # 等待支付
    STATUS_SUCCEEDED = "succeeded"      # 支付成功
    STATUS_FAILED = "failed"            # 支付失败
    STATUS_CANCELLED = "cancelled"      # 订单取消
    STATUS_EXPIRED = "expired"          # 订单过期
    STATUS_CLOSED = "closed"            # 订单关闭
    
    # 支付渠道枚举
    CHANNEL_WECHAT = "wechat"
    CHANNEL_ALIPAY = "alipay"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    amount = Column(Numeric(18, 2), nullable=False)
    currency = Column(String(8), nullable=False)
    status = Column(String(32), nullable=False, default=STATUS_CREATED)
    channel = Column(String(16), nullable=False)
    region = Column(String(16), nullable=True)
    description = Column(String(256), nullable=True)
    extra_data = Column(Text, nullable=True)  # JSON格式的额外数据
    expire_at = Column(DateTime(timezone=True), nullable=True)
    gateway_order_id = Column(String(128), nullable=True)  # 第三方订单号
    error_message = Column(String(512), nullable=True)  # 错误信息
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 关系
    payments = relationship("Payment", backref="order", cascade="all, delete-orphan")
    
    # 索引
    __table_args__ = (
        Index('idx_orders_user_id', 'user_id'),
        Index('idx_orders_status', 'status'),
        Index('idx_orders_channel', 'channel'),
        Index('idx_orders_created_at', 'created_at'),
        Index('idx_orders_gateway_order_id', 'gateway_order_id'),
    )

class Payment(Base):
    __tablename__ = "payments"
    
    # 支付状态枚举
    STATUS_PENDING = "pending"          # 等待支付
    STATUS_PROCESSING = "processing"    # 处理中
    STATUS_SUCCEEDED = "succeeded"      # 支付成功
    STATUS_FAILED = "failed"            # 支付失败
    STATUS_CANCELLED = "cancelled"      # 支付取消
    STATUS_EXPIRED = "expired"          # 支付过期
    STATUS_CLOSED = "closed"            # 支付关闭
    
    # 支付方式枚举
    METHOD_H5 = "h5"
    METHOD_APP = "app"
    METHOD_NATIVE = "native"
    METHOD_JSAPI = "jsapi"
    METHOD_MINIPROGRAM = "miniprogram"
    
    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    gateway_payment_id = Column(String(128), nullable=True)  # 第三方支付单号
    method = Column(String(16), nullable=True)
    status = Column(String(32), nullable=False, default=STATUS_PENDING)
    amount = Column(Numeric(18, 2), nullable=False)  # 支付金额（可能和订单金额不同）
    currency = Column(String(8), nullable=False)
    three_ds_required = Column(Boolean, default=False)
    prepaid_id = Column(String(256), nullable=True)  # 微信预支付ID
    qr_code = Column(String(512), nullable=True)  # 支付二维码
    pay_url = Column(String(512), nullable=True)  # 支付链接
    error_code = Column(String(64), nullable=True)  # 错误代码
    error_message = Column(String(512), nullable=True)  # 错误信息
    paid_at = Column(DateTime(timezone=True), nullable=True)  # 实际支付时间
    gateway_response = Column(Text, nullable=True)  # 第三方响应原始数据
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 关系
    refunds = relationship("Refund", backref="payment", cascade="all, delete-orphan")
    
    # 索引
    __table_args__ = (
        Index('idx_payments_order_id', 'order_id'),
        Index('idx_payments_status', 'status'),
        Index('idx_payments_gateway_payment_id', 'gateway_payment_id'),
        Index('idx_payments_created_at', 'created_at'),
    )

class Refund(Base):
    __tablename__ = "refunds"
    
    # 退款状态枚举
    STATUS_PENDING = "pending"          # 等待退款
    STATUS_PROCESSING = "processing"    # 处理中
    STATUS_SUCCEEDED = "succeeded"      # 退款成功
    STATUS_FAILED = "failed"            # 退款失败
    STATUS_PARTIAL = "partial"          # 部分退款
    
    id = Column(Integer, primary_key=True)
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=False)
    gateway_refund_id = Column(String(128), nullable=True)  # 第三方退款单号
    amount = Column(Numeric(18, 2), nullable=False)
    status = Column(String(32), nullable=False, default=STATUS_PENDING)
    reason = Column(String(256), nullable=True)
    refund_reason = Column(String(64), nullable=True)  # 退款原因代码
    refund_message = Column(String(512), nullable=True)  # 退款说明
    refunded_at = Column(DateTime(timezone=True), nullable=True)  # 实际退款时间
    gateway_response = Column(Text, nullable=True)  # 第三方响应原始数据
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 索引
    __table_args__ = (
        Index('idx_refunds_payment_id', 'payment_id'),
        Index('idx_refunds_status', 'status'),
        Index('idx_refunds_gateway_refund_id', 'gateway_refund_id'),
        Index('idx_refunds_created_at', 'created_at'),
    )

class WebhookEvent(Base):
    __tablename__ = "webhook_events"
    
    id = Column(Integer, primary_key=True)
    gateway = Column(String(16), nullable=False)  # wechat, alipay
    event_type = Column(String(64), nullable=False)  # 事件类型
    event_id = Column(String(128), nullable=True)  # 第三方事件ID
    payload = Column(Text, nullable=False)  # 原始payload
    payload_hash = Column(String(128), nullable=False)  # payload哈希
    signature = Column(String(256), nullable=True)  # 签名
    signature_verified = Column(Boolean, default=False)  # 签名验证结果
    processed = Column(Boolean, default=False)  # 是否已处理
    process_result = Column(String(64), nullable=True)  # 处理结果
    process_message = Column(String(512), nullable=True)  # 处理消息
    processed_at = Column(DateTime(timezone=True), nullable=True)  # 处理时间
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 索引
    __table_args__ = (
        Index('idx_webhook_events_gateway', 'gateway'),
        Index('idx_webhook_events_event_type', 'event_type'),
        Index('idx_webhook_events_processed', 'processed'),
        Index('idx_webhook_events_created_at', 'created_at'),
        Index('idx_webhook_events_event_id', 'event_id'),
    )

class IdempotencyKey(Base):
    __tablename__ = "idempotency_keys"
    
    id = Column(Integer, primary_key=True)
    scope = Column(String(64), nullable=False)  # 作用域，如：payment_intent, refund
    key = Column(String(128), nullable=False, unique=True)  # 幂等键
    request_hash = Column(String(128), nullable=False)  # 请求哈希
    response_data = Column(Text, nullable=True)  # 响应数据（JSON）
    status = Column(String(32), nullable=False, default="success")  # 处理状态
    expire_at = Column(DateTime(timezone=True), nullable=True)  # 过期时间
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 索引
    __table_args__ = (
        Index('idx_idempotency_keys_scope_key', 'scope', 'key'),
        Index('idx_idempotency_keys_expire_at', 'expire_at'),
        Index('idx_idempotency_keys_created_at', 'created_at'),
    )

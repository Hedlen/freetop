from fastapi import APIRouter, Depends, HTTPException, Request, Query, Path, Body
from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from datetime import datetime
import logging

from src.database.connection import get_db
from src.services.payment_service import (
    create_order, confirm_payment, apply_refund, record_webhook_event, simulate_gateway_intent,
    query_payment_status, query_refund_status, process_webhook_event, fail_payment, fail_refund,
    confirm_refund, get_payment_statistics, create_payment_intent as service_create_payment_intent
)
from src.config.payment_config import get_payment_config
from src.utils.payment_utils import generate_idempotency_key, validate_amount, validate_currency
from src.middleware.auth_middleware import (
    get_current_user, require_subscription, log_user_operation, AuthMiddleware
)
from src.models.user import User

router = APIRouter(prefix="/api/payments", tags=["payments"])
payment_config = get_payment_config()
logger = logging.getLogger(__name__)

# 请求模型
class IntentRequest(BaseModel):
    amount: float = Field(..., gt=0, description="支付金额")
    currency: str = Field(..., description="货币代码 (CNY, USD等)")
    region: Optional[str] = Field(None, description="地区代码 (CN, US等)")
    idempotency_key: str = Field(..., description="幂等键")
    user_id: Optional[int] = Field(None, description="用户ID")
    description: Optional[str] = Field(None, description="订单描述")
    extra_data: Optional[Dict[str, Any]] = Field(None, description="额外元数据")
    channel: Optional[str] = Field(None, description="支付渠道 (wechat, alipay)")
    
    @validator('currency')
    def validate_currency_code(cls, v):
        if not validate_currency(v):
            raise ValueError('Invalid currency code')
        return v.upper()
    
    @validator('idempotency_key')
    def validate_idempotency_key(cls, v):
        if not v or len(v) < 10:
            raise ValueError('Idempotency key must be at least 10 characters')
        return v

class IntentResponse(BaseModel):
    order_id: int = Field(..., description="订单ID")
    gateway_order_id: str = Field(..., description="网关订单号")
    channel: str = Field(..., description="支付渠道")
    method: str = Field(..., description="支付方式")
    status: str = Field(..., description="订单状态")
    pay_url: Optional[str] = Field(None, description="支付链接")
    qrcode: Optional[str] = Field(None, description="支付二维码")
    prepaid_id: Optional[str] = Field(None, description="预支付ID")
    expire_at: Optional[datetime] = Field(None, description="过期时间")
    amount: float = Field(..., description="订单金额")
    currency: str = Field(..., description="货币代码")

class ConfirmRequest(BaseModel):
    order_id: int = Field(..., description="订单ID")
    gateway_payment_id: Optional[str] = Field(None, description="网关支付ID")
    gateway_response: Optional[Dict[str, Any]] = Field(None, description="网关响应数据")

class PaymentStatusResponse(BaseModel):
    order_id: int = Field(..., description="订单ID")
    gateway_order_id: str = Field(..., description="网关订单号")
    status: str = Field(..., description="订单状态")
    amount: float = Field(..., description="订单金额")
    currency: str = Field(..., description="货币代码")
    channel: str = Field(..., description="支付渠道")
    expire_at: Optional[datetime] = Field(None, description="过期时间")
    is_expired: bool = Field(..., description="是否已过期")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")
    payment: Optional[Dict[str, Any]] = Field(None, description="支付信息")

class RefundRequest(BaseModel):
    payment_id: int = Field(..., description="支付ID")
    amount: float = Field(..., gt=0, description="退款金额")
    reason: Optional[str] = Field(None, description="退款原因")
    refund_reason: Optional[str] = Field(None, description="退款原因代码")

class RefundResponse(BaseModel):
    refund_id: int = Field(..., description="退款ID")
    gateway_refund_id: str = Field(..., description="网关退款ID")
    status: str = Field(..., description="退款状态")
    amount: float = Field(..., description="退款金额")
    reason: Optional[str] = Field(None, description="退款原因")
    created_at: datetime = Field(..., description="创建时间")

class RefundStatusResponse(BaseModel):
    refund_id: int = Field(..., description="退款ID")
    gateway_refund_id: str = Field(..., description="网关退款ID")
    status: str = Field(..., description="退款状态")
    amount: float = Field(..., description="退款金额")
    reason: Optional[str] = Field(None, description="退款原因")
    refund_reason: Optional[str] = Field(None, description="退款原因代码")
    refunded_at: Optional[datetime] = Field(None, description="退款时间")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")
    payment: Dict[str, Any] = Field(..., description="支付信息")

class WebhookResponse(BaseModel):
    success: bool = Field(..., description="处理结果")
    message: str = Field(..., description="处理消息")
    event_id: Optional[int] = Field(None, description="事件ID")

class PaymentStatsResponse(BaseModel):
    total_orders: int = Field(..., description="总订单数")
    successful_orders: int = Field(..., description="成功订单数")
    failed_orders: int = Field(..., description="失败订单数")
    success_rate: float = Field(..., description="成功率")
    total_amount: float = Field(..., description="总金额")
    successful_amount: float = Field(..., description="成功金额")
    conversion_rate: float = Field(..., description="转化率")

class ConfigReloadResponse(BaseModel):
    success: bool = Field(..., description="重载结果")
    message: str = Field(..., description="重载消息")
    config: Dict[str, Any] = Field(..., description="当前配置")

# API端点
@router.post("/intent", response_model=IntentResponse)
@log_user_operation("payment_intent_created", "payment", None)
def create_payment_intent(
    request: IntentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    创建支付意图
    
    创建订单并生成支付参数，支持微信和支付宝支付
    需要用户登录验证
    """
    try:
        # 验证用户ID与当前登录用户匹配
        if request.user_id and request.user_id != current_user.id:
            raise HTTPException(
                status_code=403, 
                detail="Cannot create payment intent for different user"
            )
        
        # 使用当前登录用户的ID
        user_id = current_user.id
        
        # 创建订单
        order = create_order(
            db=db,
            user_id=user_id,
            amount=request.amount,
            currency=request.currency,
            region=request.region,
            idempotency_key=request.idempotency_key,
            description=request.description,
            extra_data=request.extra_data,
            channel=request.channel
        )
        
        # 创建支付意图
        payment = service_create_payment_intent(db, order.id)
        
        # 模拟网关响应（实际项目中这里调用真实网关）
        gateway_response = simulate_gateway_intent(
            channel=order.channel,
            order_id=order.id,
            amount=float(order.amount),
            currency=order.currency,
            method=payment.method
        )
        
        # 更新支付信息
        if gateway_response.get("prepay_id"):
            payment.prepaid_id = gateway_response["prepay_id"]
        if gateway_response.get("qrcode"):
            payment.qr_code = gateway_response["qrcode"]
        if gateway_response.get("pay_url"):
            payment.pay_url = gateway_response["pay_url"]
        
        db.flush()
        
        return IntentResponse(
            order_id=order.id,
            gateway_order_id=order.gateway_order_id,
            channel=order.channel,
            method=payment.method,
            status=order.status,
            pay_url=payment.pay_url,
            qrcode=payment.qr_code,
            prepaid_id=payment.prepaid_id,
            expire_at=order.expire_at,
            amount=float(order.amount),
            currency=order.currency
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to create payment intent: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/confirm", response_model=PaymentStatusResponse)
def confirm_payment_status(
    request: ConfirmRequest,
    db: Session = Depends(get_db)
):
    """
    确认支付结果
    
    接收支付结果通知，更新订单和支付状态
    """
    try:
        order, payment = confirm_payment(
            db=db,
            order_id=request.order_id,
            gateway_payment_id=request.gateway_payment_id,
            gateway_response=request.gateway_response
        )
        
        return query_payment_status(db, order.id)
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to confirm payment: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/status/{order_id}", response_model=PaymentStatusResponse)
@log_user_operation("payment_status_queried", "payment", None)
def get_payment_status(
    order_id: int = Path(..., description="订单ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    查询支付状态
    
    获取订单和支付的详细状态信息
    需要用户登录验证，确保用户只能查询自己的订单
    """
    try:
        # 验证订单属于当前用户
        from src.services.payment_service import get_order_by_id
        order = get_order_by_id(db, order_id)
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        if order.user_id != current_user.id:
            raise HTTPException(
                status_code=403, 
                detail="Cannot query payment status for different user's order"
            )
        
        return query_payment_status(db, order_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to query payment status: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/refund", response_model=RefundResponse)
def create_refund(
    request: RefundRequest,
    db: Session = Depends(get_db)
):
    """
    创建退款
    
    申请退款，支持部分退款和全额退款
    """
    try:
        refund = apply_refund(
            db=db,
            payment_id=request.payment_id,
            amount=request.amount,
            reason=request.reason,
            refund_reason=request.refund_reason
        )
        
        return RefundResponse(
            refund_id=refund.id,
            gateway_refund_id=refund.gateway_refund_id,
            status=refund.status,
            amount=float(refund.amount),
            reason=refund.reason,
            created_at=refund.created_at
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to create refund: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/refund/status/{refund_id}", response_model=RefundStatusResponse)
def get_refund_status(
    refund_id: int = Path(..., description="退款ID"),
    db: Session = Depends(get_db)
):
    """
    查询退款状态
    
    获取退款的详细状态信息
    """
    try:
        return query_refund_status(db, refund_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to query refund status: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/refund/confirm/{refund_id}", response_model=RefundStatusResponse)
def confirm_refund_status(
    refund_id: int = Path(..., description="退款ID"),
    gateway_refund_id: Optional[str] = Body(None, description="网关退款ID"),
    gateway_response: Optional[Dict[str, Any]] = Body(None, description="网关响应数据"),
    db: Session = Depends(get_db)
):
    """
    确认退款结果
    
    接收退款结果通知，更新退款状态
    """
    try:
        refund = confirm_refund(
            db=db,
            refund_id=refund_id,
            gateway_refund_id=gateway_refund_id,
            gateway_response=gateway_response
        )
        
        return query_refund_status(db, refund.id)
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to confirm refund: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/webhooks/wechat", response_model=WebhookResponse)
async def wechat_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    微信支付Webhook
    
    接收微信支付结果通知
    """
    try:
        # 获取原始payload
        body = await request.body()
        payload_str = body.decode('utf-8')
        
        # 解析XML格式（微信支付使用XML）
        import xml.etree.ElementTree as ET
        root = ET.fromstring(payload_str)
        payload = {}
        for child in root:
            payload[child.tag] = child.text or ""
        
        # 记录webhook事件
        event = record_webhook_event(
            db=db,
            gateway="wechat",
            event_type="payment_notification",
            payload=payload,
            signature=payload.get("sign"),
            event_id=payload.get("transaction_id")
        )
        
        # 处理事件
        success = process_webhook_event(db, event.id)
        
        # 返回微信要求的响应格式
        if success:
            return {"success": True, "message": "OK", "event_id": event.id}
        else:
            return {"success": False, "message": "Processing failed", "event_id": event.id}
            
    except Exception as e:
        logger.error(f"Failed to process WeChat webhook: {e}")
        return {"success": False, "message": f"Error: {str(e)}"}

@router.post("/webhooks/alipay", response_model=WebhookResponse)
async def alipay_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    支付宝Webhook
    
    接收支付宝支付结果通知
    """
    try:
        # 获取参数（支付宝使用POST参数）
        form_data = await request.form()
        payload = dict(form_data)
        
        # 记录webhook事件
        event = record_webhook_event(
            db=db,
            gateway="alipay",
            event_type="payment_notification",
            payload=payload,
            signature=payload.get("sign"),
            event_id=payload.get("trade_no")
        )
        
        # 处理事件
        success = process_webhook_event(db, event.id)
        
        # 返回支付宝要求的响应格式
        if success:
            return {"success": True, "message": "success", "event_id": event.id}
        else:
            return {"success": False, "message": "processing_failed", "event_id": event.id}
            
    except Exception as e:
        logger.error(f"Failed to process Alipay webhook: {e}")
        return {"success": False, "message": f"error: {str(e)}"}

@router.get("/statistics", response_model=PaymentStatsResponse)
def get_statistics(
    start_date: Optional[datetime] = Query(None, description="开始时间"),
    end_date: Optional[datetime] = Query(None, description="结束时间"),
    db: Session = Depends(get_db)
):
    """
    获取支付统计信息
    
    返回支付相关的统计数据
    """
    try:
        stats = get_payment_statistics(db, start_date, end_date)
        return PaymentStatsResponse(**stats)
    except Exception as e:
        logger.error(f"Failed to get payment statistics: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/config/reload", response_model=ConfigReloadResponse)
def reload_config():
    """
    重载支付配置
    
    重新加载支付配置文件，支持热更新
    """
    try:
        success = payment_config.reload_config()
        current_config = payment_config.get_config()
        
        # 脱敏敏感信息
        masked_config = mask_sensitive_data(current_config)
        
        return ConfigReloadResponse(
            success=success,
            message="Configuration reloaded successfully" if success else "Failed to reload configuration",
            config=masked_config
        )
    except Exception as e:
        logger.error(f"Failed to reload payment config: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to reload configuration: {str(e)}")

@router.get("/config/status")
def get_config_status():
    """
    获取配置状态
    
    返回当前支付配置的状态信息
    """
    try:
        config = payment_config.get_config()
        
        return {
            "wechat_enabled": payment_config.is_wechat_enabled(),
            "alipay_enabled": payment_config.is_alipay_enabled(),
            "wechat_configured": bool(config.get("wechat", {}).get("mch_id") and 
                                  config.get("wechat", {}).get("app_id")),
            "alipay_configured": bool(config.get("alipay", {}).get("app_id")),
            "sandbox_mode": config.get("wechat", {}).get("sandbox", True) or 
                           config.get("alipay", {}).get("sandbox", True),
            "last_modified": payment_config._last_modified
        }
    except Exception as e:
        logger.error(f"Failed to get config status: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# 生成幂等键端点
@router.get("/idempotency/key")
def generate_idempotency_key_endpoint():
    """
    生成幂等键
    
    为客户端生成唯一的幂等键
    """
    return {
        "idempotency_key": generate_idempotency_key()
    }

# 健康检查端点
@router.get("/health")
def health_check():
    """
    健康检查
    
    检查支付系统状态
    """
    try:
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "channels": {
                "wechat": payment_config.is_wechat_enabled(),
                "alipay": payment_config.is_alipay_enabled()
            }
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }
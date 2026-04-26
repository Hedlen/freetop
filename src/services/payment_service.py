import hashlib
import json
import logging
from typing import Optional, Tuple, Dict, Any, List
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from src.models.payment import (
    Order, Payment, Refund, WebhookEvent, IdempotencyKey,
    Order as OrderModel, Payment as PaymentModel, Refund as RefundModel
)
from src.config.payment_config import get_payment_config
from src.utils.payment_utils import (
    generate_idempotency_key, generate_order_no, generate_payment_no, generate_refund_no,
    validate_amount, validate_currency, validate_region, validate_order_data,
    calculate_wechat_sign, verify_wechat_sign, calculate_alipay_sign, verify_alipay_sign,
    generate_hash, get_order_expire_time, is_order_expired, format_amount_for_gateway,
    parse_amount_from_gateway, safe_json_loads, mask_sensitive_data
)

logger = logging.getLogger(__name__)
payment_config = get_payment_config()

def _hash_payload(data: dict) -> str:
    """生成payload哈希"""
    return generate_hash(data)

def require_idempotency(db: Session, scope: str, key: str, payload: dict) -> Optional[Dict[str, Any]]:
    """检查幂等性，如果已存在则返回之前的响应"""
    h = _hash_payload(payload)
    
    # 清理过期的幂等键
    cleanup_expired_idempotency_keys(db)
    
    exists = db.query(IdempotencyKey).filter_by(scope=scope, key=key).first()
    if exists:
        if exists.request_hash != h:
            raise ValueError("Idempotency key mismatch - request content changed")
        
        # 返回之前的响应数据
        if exists.response_data:
            try:
                return safe_json_loads(exists.response_data)
            except Exception as e:
                logger.warning(f"Failed to parse idempotency response data: {e}")
        
        return {"idempotency_key": key, "status": "already_processed"}
    
    return None

def save_idempotency_response(db: Session, scope: str, key: str, payload: dict, 
                            response_data: Dict[str, Any], status: str = "success") -> None:
    """保存幂等响应"""
    h = _hash_payload(payload)
    expire_hours = payment_config.get_common_config().get("idempotency_key_expire_hours", 24)
    expire_at = datetime.now() + timedelta(hours=expire_hours)
    
    idempotency_key = IdempotencyKey(
        scope=scope,
        key=key,
        request_hash=h,
        response_data=json.dumps(response_data),
        status=status,
        expire_at=expire_at
    )
    db.add(idempotency_key)

def cleanup_expired_idempotency_keys(db: Session) -> None:
    """清理过期的幂等键"""
    try:
        expired_keys = db.query(IdempotencyKey).filter(
            IdempotencyKey.expire_at < datetime.now()
        ).all()
        
        for key in expired_keys:
            db.delete(key)
        
        if expired_keys:
            logger.info(f"Cleaned up {len(expired_keys)} expired idempotency keys")
    except Exception as e:
        logger.warning(f"Failed to cleanup expired idempotency keys: {e}")

def route_channel(currency: str, region: Optional[str], user_preference: Optional[str] = None) -> str:
    """智能路由选择支付渠道"""
    # 如果用户有偏好，优先使用用户偏好
    if user_preference and payment_config.is_channel_enabled(user_preference):
        return user_preference
    
    # 根据货币和地区智能路由
    currency_upper = currency.upper()
    region_lower = region.lower() if region else ""
    
    # 人民币或中国大陆地区优先使用微信支付
    if currency_upper == "CNY" or region_lower in ["cn", "china"]:
        if payment_config.is_wechat_enabled():
            return "wechat"
        elif payment_config.is_alipay_enabled():
            return "alipay"
    
    # 其他情况优先使用支付宝
    if payment_config.is_alipay_enabled():
        return "alipay"
    elif payment_config.is_wechat_enabled():
        return "wechat"
    
    raise ValueError("No payment channel available")

def validate_order_request(data: Dict[str, Any]) -> Tuple[bool, str]:
    """验证订单请求数据"""
    try:
        # 基本验证
        is_valid, message = validate_order_data(data)
        if not is_valid:
            return False, message
        
        # 验证金额范围
        amount = Decimal(str(data["amount"]))
        common_config = payment_config.get_common_config()
        min_amount = Decimal(str(common_config.get("min_payment_amount", 0.01)))
        max_amount = Decimal(str(common_config.get("max_payment_amount", 1000000.00)))
        
        if not validate_amount(amount, min_amount, max_amount):
            return False, f"Amount must be between {min_amount} and {max_amount}"
        
        # 验证渠道可用性
        channel = data.get("channel")
        if channel and not payment_config.is_channel_enabled(channel):
            return False, f"Payment channel {channel} is not enabled"
        
        # 验证用户ID
        if "user_id" in data and data["user_id"]:
            user_id = int(data["user_id"])
            if user_id <= 0:
                return False, "Invalid user_id"
        
        return True, ""
        
    except Exception as e:
        logger.error(f"Order validation error: {e}")
        return False, f"Validation error: {str(e)}"

def create_order(db: Session, user_id: Optional[int], amount: float, currency: str, 
                region: Optional[str], idempotency_key: str, description: Optional[str] = None,
                extra_data: Optional[Dict[str, Any]] = None, channel: Optional[str] = None) -> Order:
    """创建订单"""
    try:
        # 检查幂等性
        payload = {
            "user_id": user_id,
            "amount": amount,
            "currency": currency,
            "region": region,
            "description": description,
            "extra_data": extra_data,
            "channel": channel
        }
        
        existing_response = require_idempotency(db, "order:create", idempotency_key, payload)
        if existing_response:
            # 返回已存在的订单
            order_id = existing_response.get("order_id")
            if order_id:
                order = db.query(Order).filter_by(id=order_id).first()
                if order:
                    return order
        
        # 验证请求数据
        is_valid, message = validate_order_request(payload)
        if not is_valid:
            raise ValueError(f"Invalid order request: {message}")
        
        # 路由选择渠道
        selected_channel = channel or route_channel(currency, region)
        if not payment_config.is_channel_enabled(selected_channel):
            raise ValueError(f"Selected payment channel {selected_channel} is not enabled")
        
        # 计算过期时间
        expire_minutes = payment_config.get_common_config().get("order_expire_minutes", 30)
        expire_at = get_order_expire_time(expire_minutes)
        
        # 创建订单
        order = Order(
            user_id=user_id,
            amount=Decimal(str(amount)),
            currency=currency.upper(),
            status=Order.STATUS_CREATED,
            channel=selected_channel,
            region=region,
            description=description,
            extra_data=json.dumps(extra_data) if extra_data else None,
            expire_at=expire_at,
            gateway_order_id=generate_order_no()
        )
        
        db.add(order)
        db.flush()
        
        # 创建初始支付记录
        payment = Payment(
            order_id=order.id,
            amount=order.amount,
            currency=order.currency,
            status=Payment.STATUS_PENDING,
            method=Payment.METHOD_H5,  # 默认H5支付
            gateway_payment_id=generate_payment_no()
        )
        
        db.add(payment)
        
        # 保存幂等响应
        response_data = {
            "order_id": order.id,
            "gateway_order_id": order.gateway_order_id,
            "status": order.status,
            "channel": order.channel
        }
        save_idempotency_response(db, "order:create", idempotency_key, payload, response_data)
        
        logger.info(f"Order created: {order.gateway_order_id}, channel: {order.channel}, amount: {order.amount}")
        return order
        
    except Exception as e:
        logger.error(f"Failed to create order: {e}")
        raise

def create_payment_intent(db: Session, order_id: int, method: str = "h5") -> Payment:
    """创建支付意图"""
    try:
        order = db.query(Order).filter_by(id=order_id).first()
        if not order:
            raise ValueError("Order not found")
        
        if is_order_expired(order.expire_at):
            order.status = Order.STATUS_EXPIRED
            raise ValueError("Order has expired")
        
        if order.status != Order.STATUS_CREATED:
            raise ValueError(f"Order status {order.status} is not suitable for payment")
        
        # 获取最新的支付记录
        latest_payment = db.query(Payment).filter_by(order_id=order_id).order_by(Payment.id.desc()).first()
        
        # 如果已有支付记录且状态合适，直接返回
        if latest_payment and latest_payment.status in [Payment.STATUS_PENDING, Payment.STATUS_PROCESSING]:
            return latest_payment
        
        # 创建新的支付记录
        payment = Payment(
            order_id=order_id,
            amount=order.amount,
            currency=order.currency,
            status=Payment.STATUS_PENDING,
            method=method,
            gateway_payment_id=generate_payment_no()
        )
        
        db.add(payment)
        
        # 更新订单状态
        order.status = Order.STATUS_PENDING
        
        logger.info(f"Payment intent created: {payment.gateway_payment_id}, order: {order.gateway_order_id}")
        return payment
        
    except Exception as e:
        logger.error(f"Failed to create payment intent: {e}")
        raise

def confirm_payment(db: Session, order_id: int, gateway_payment_id: Optional[str] = None,
                   gateway_response: Optional[Dict[str, Any]] = None) -> Tuple[Order, Payment]:
    """确认支付"""
    try:
        order = db.query(Order).filter_by(id=order_id).first()
        if not order:
            raise ValueError("Order not found")
        
        payment = db.query(Payment).filter_by(order_id=order_id).order_by(Payment.id.desc()).first()
        if not payment:
            raise ValueError("Payment not found")
        
        if payment.status != Payment.STATUS_PENDING:
            raise ValueError(f"Payment status {payment.status} is not suitable for confirmation")
        
        # 更新支付状态
        payment.status = Payment.STATUS_SUCCEEDED
        payment.paid_at = datetime.now()
        if gateway_payment_id:
            payment.gateway_payment_id = gateway_payment_id
        if gateway_response:
            payment.gateway_response = json.dumps(gateway_response)
        
        # 更新订单状态
        order.status = Order.STATUS_SUCCEEDED
        
        logger.info(f"Payment confirmed: {payment.gateway_payment_id}, order: {order.gateway_order_id}")
        return order, payment
        
    except Exception as e:
        logger.error(f"Failed to confirm payment: {e}")
        raise

def fail_payment(db: Session, order_id: int, error_code: Optional[str] = None,
                error_message: Optional[str] = None, gateway_response: Optional[Dict[str, Any]] = None) -> Tuple[Order, Payment]:
    """标记支付失败"""
    try:
        order = db.query(Order).filter_by(id=order_id).first()
        if not order:
            raise ValueError("Order not found")
        
        payment = db.query(Payment).filter_by(order_id=order_id).order_by(Payment.id.desc()).first()
        if not payment:
            raise ValueError("Payment not found")
        
        # 更新支付状态
        payment.status = Payment.STATUS_FAILED
        payment.error_code = error_code
        payment.error_message = error_message
        if gateway_response:
            payment.gateway_response = json.dumps(gateway_response)
        
        # 更新订单状态
        order.status = Order.STATUS_FAILED
        order.error_message = error_message
        
        logger.warning(f"Payment failed: {payment.gateway_payment_id}, order: {order.gateway_order_id}, error: {error_message}")
        return order, payment
        
    except Exception as e:
        logger.error(f"Failed to fail payment: {e}")
        raise

def query_payment_status(db: Session, order_id: int) -> Dict[str, Any]:
    """查询支付状态"""
    try:
        order = db.query(Order).filter_by(id=order_id).first()
        if not order:
            raise ValueError("Order not found")
        
        payment = db.query(Payment).filter_by(order_id=order_id).order_by(Payment.id.desc()).first()
        
        result = {
            "order_id": order.id,
            "gateway_order_id": order.gateway_order_id,
            "status": order.status,
            "amount": float(order.amount),
            "currency": order.currency,
            "channel": order.channel,
            "expire_at": order.expire_at.isoformat() if order.expire_at else None,
            "is_expired": is_order_expired(order.expire_at) if order.expire_at else False,
            "created_at": order.created_at.isoformat(),
            "updated_at": order.updated_at.isoformat()
        }
        
        if payment:
            result["payment"] = {
                "payment_id": payment.id,
                "gateway_payment_id": payment.gateway_payment_id,
                "status": payment.status,
                "method": payment.method,
                "paid_at": payment.paid_at.isoformat() if payment.paid_at else None,
                "error_code": payment.error_code,
                "error_message": payment.error_message
            }
        
        return result
        
    except Exception as e:
        logger.error(f"Failed to query payment status: {e}")
        raise

def apply_refund(db: Session, payment_id: int, amount: float, reason: Optional[str] = None,
                refund_reason: Optional[str] = None) -> Refund:
    """申请退款"""
    try:
        payment = db.query(Payment).filter_by(id=payment_id).first()
        if not payment:
            raise ValueError("Payment not found")
        
        if payment.status != Payment.STATUS_SUCCEEDED:
            raise ValueError(f"Payment status {payment.status} is not suitable for refund")
        
        # 检查退款金额
        refund_amount = Decimal(str(amount))
        if refund_amount <= 0:
            raise ValueError("Refund amount must be greater than 0")
        
        if refund_amount > payment.amount:
            raise ValueError("Refund amount cannot exceed payment amount")
        
        # 检查累计退款金额
        total_refunded = db.query(func.sum(Refund.amount)).filter_by(payment_id=payment_id).filter(
            Refund.status.in_([Refund.STATUS_SUCCEEDED, Refund.STATUS_PARTIAL])
        ).scalar() or Decimal("0")
        
        if total_refunded + refund_amount > payment.amount:
            raise ValueError("Total refund amount would exceed payment amount")
        
        # 创建退款记录
        refund = Refund(
            payment_id=payment_id,
            amount=refund_amount,
            status=Refund.STATUS_PENDING,
            reason=reason,
            refund_reason=refund_reason,
            gateway_refund_id=generate_refund_no()
        )
        
        db.add(refund)
        
        logger.info(f"Refund applied: {refund.gateway_refund_id}, payment: {payment.gateway_payment_id}, amount: {refund.amount}")
        return refund
        
    except Exception as e:
        logger.error(f"Failed to apply refund: {e}")
        raise

def confirm_refund(db: Session, refund_id: int, gateway_refund_id: Optional[str] = None,
                  gateway_response: Optional[Dict[str, Any]] = None) -> Refund:
    """确认退款"""
    try:
        refund = db.query(Refund).filter_by(id=refund_id).first()
        if not refund:
            raise ValueError("Refund not found")
        
        if refund.status != Refund.STATUS_PENDING:
            raise ValueError(f"Refund status {refund.status} is not suitable for confirmation")
        
        # 更新退款状态
        refund.status = Refund.STATUS_SUCCEEDED
        refund.refunded_at = datetime.now()
        if gateway_refund_id:
            refund.gateway_refund_id = gateway_refund_id
        if gateway_response:
            refund.gateway_response = json.dumps(gateway_response)
        
        logger.info(f"Refund confirmed: {refund.gateway_refund_id}, amount: {refund.amount}")
        return refund
        
    except Exception as e:
        logger.error(f"Failed to confirm refund: {e}")
        raise

def fail_refund(db: Session, refund_id: int, error_message: Optional[str] = None,
               gateway_response: Optional[Dict[str, Any]] = None) -> Refund:
    """标记退款失败"""
    try:
        refund = db.query(Refund).filter_by(id=refund_id).first()
        if not refund:
            raise ValueError("Refund not found")
        
        if refund.status != Refund.STATUS_PENDING:
            raise ValueError(f"Refund status {refund.status} is not suitable for failure")
        
        # 更新退款状态
        refund.status = Refund.STATUS_FAILED
        refund.refund_message = error_message
        if gateway_response:
            refund.gateway_response = json.dumps(gateway_response)
        
        logger.warning(f"Refund failed: {refund.gateway_refund_id}, error: {error_message}")
        return refund
        
    except Exception as e:
        logger.error(f"Failed to fail refund: {e}")
        raise

def query_refund_status(db: Session, refund_id: int) -> Dict[str, Any]:
    """查询退款状态"""
    try:
        refund = db.query(Refund).filter_by(id=refund_id).first()
        if not refund:
            raise ValueError("Refund not found")
        
        payment = refund.payment
        
        result = {
            "refund_id": refund.id,
            "gateway_refund_id": refund.gateway_refund_id,
            "status": refund.status,
            "amount": float(refund.amount),
            "reason": refund.reason,
            "refund_reason": refund.refund_reason,
            "refunded_at": refund.refunded_at.isoformat() if refund.refunded_at else None,
            "created_at": refund.created_at.isoformat(),
            "updated_at": refund.updated_at.isoformat(),
            "payment": {
                "payment_id": payment.id,
                "gateway_payment_id": payment.gateway_payment_id,
                "original_amount": float(payment.amount)
            }
        }
        
        return result
        
    except Exception as e:
        logger.error(f"Failed to query refund status: {e}")
        raise

def record_webhook_event(db: Session, gateway: str, event_type: str, payload: Dict[str, Any],
                        signature: Optional[str] = None, event_id: Optional[str] = None) -> WebhookEvent:
    """记录webhook事件"""
    try:
        # 检查是否已经处理过相同事件
        if event_id:
            existing_event = db.query(WebhookEvent).filter_by(gateway=gateway, event_id=event_id).first()
            if existing_event:
                logger.info(f"Webhook event already processed: {gateway}/{event_id}")
                return existing_event
        
        # 创建webhook事件记录
        event = WebhookEvent(
            gateway=gateway,
            event_type=event_type,
            event_id=event_id,
            payload=json.dumps(payload),
            payload_hash=_hash_payload(payload),
            signature=signature,
            signature_verified=False,
            processed=False
        )
        
        db.add(event)
        logger.info(f"Webhook event recorded: {gateway}/{event_type}")
        return event
        
    except Exception as e:
        logger.error(f"Failed to record webhook event: {e}")
        raise

def verify_webhook_signature(event: WebhookEvent, gateway_config: Dict[str, Any]) -> bool:
    """验证webhook签名"""
    try:
        payload = safe_json_loads(event.payload, {})
        
        if event.gateway == "wechat":
            api_key = gateway_config.get("api_key", "")
            sign_type = gateway_config.get("sign_type", "HMAC-SHA256")
            is_valid = verify_wechat_sign(payload, api_key, sign_type)
            
        elif event.gateway == "alipay":
            public_key_path = gateway_config.get("alipay_public_key_path", "")
            sign_type = gateway_config.get("sign_type", "RSA2")
            is_valid = verify_alipay_sign(payload, public_key_path, sign_type)
            
        else:
            logger.warning(f"Unknown gateway for signature verification: {event.gateway}")
            is_valid = False
        
        event.signature_verified = is_valid
        return is_valid
        
    except Exception as e:
        logger.error(f"Failed to verify webhook signature: {e}")
        event.signature_verified = False
        return False

def process_webhook_event(db: Session, event_id: int) -> bool:
    """处理webhook事件"""
    try:
        event = db.query(WebhookEvent).filter_by(id=event_id).first()
        if not event:
            logger.error(f"Webhook event not found: {event_id}")
            return False
        
        if event.processed:
            logger.info(f"Webhook event already processed: {event_id}")
            return True
        
        # 获取网关配置
        gateway_config = payment_config.get_channel_config(event.gateway)
        
        # 验证签名
        if not verify_webhook_signature(event, gateway_config):
            event.process_result = "signature_verification_failed"
            event.process_message = "Webhook signature verification failed"
            event.processed = True
            event.processed_at = datetime.now()
            logger.warning(f"Webhook signature verification failed: {event_id}")
            return False
        
        # 解析payload
        payload = safe_json_loads(event.payload, {})
        
        # 根据事件类型处理
        success = False
        if event.gateway == "wechat":
            success = process_wechat_webhook(db, event, payload)
        elif event.gateway == "alipay":
            success = process_alipay_webhook(db, event, payload)
        else:
            event.process_result = "unsupported_gateway"
            event.process_message = f"Unsupported gateway: {event.gateway}"
        
        event.processed = True
        event.processed_at = datetime.now()
        event.process_result = "success" if success else "failed"
        
        logger.info(f"Webhook event processed: {event_id}, result: {event.process_result}")
        return success
        
    except Exception as e:
        logger.error(f"Failed to process webhook event: {e}")
        if event:
            event.process_result = "error"
            event.process_message = str(e)
            event.processed = True
            event.processed_at = datetime.now()
        return False

def process_wechat_webhook(db: Session, event: WebhookEvent, payload: Dict[str, Any]) -> bool:
    """处理微信支付webhook"""
    try:
        # 解析微信支付结果
        result_code = payload.get("result_code", "")
        out_trade_no = payload.get("out_trade_no", "")
        transaction_id = payload.get("transaction_id", "")
        
        if result_code == "SUCCESS":
            # 查找订单
            order = db.query(Order).filter_by(gateway_order_id=out_trade_no).first()
            if not order:
                event.process_message = f"Order not found: {out_trade_no}"
                return False
            
            # 确认支付
            confirm_payment(db, order.id, transaction_id, payload)
            event.process_message = f"Payment confirmed for order: {out_trade_no}"
            return True
            
        else:
            err_code = payload.get("err_code", "")
            err_code_des = payload.get("err_code_des", "")
            
            # 查找订单并标记失败
            order = db.query(Order).filter_by(gateway_order_id=out_trade_no).first()
            if order:
                fail_payment(db, order.id, err_code, err_code_des, payload)
            
            event.process_message = f"Payment failed: {err_code} - {err_code_des}"
            return False
            
    except Exception as e:
        event.process_message = f"Failed to process WeChat webhook: {str(e)}"
        logger.error(f"Failed to process WeChat webhook: {e}")
        return False

def process_alipay_webhook(db: Session, event: WebhookEvent, payload: Dict[str, Any]) -> bool:
    """处理支付宝webhook"""
    try:
        # 解析支付宝支付结果
        trade_status = payload.get("trade_status", "")
        out_trade_no = payload.get("out_trade_no", "")
        trade_no = payload.get("trade_no", "")
        
        if trade_status == "TRADE_SUCCESS" or trade_status == "TRADE_FINISHED":
            # 查找订单
            order = db.query(Order).filter_by(gateway_order_id=out_trade_no).first()
            if not order:
                event.process_message = f"Order not found: {out_trade_no}"
                return False
            
            # 确认支付
            confirm_payment(db, order.id, trade_no, payload)
            event.process_message = f"Payment confirmed for order: {out_trade_no}"
            return True
            
        elif trade_status == "TRADE_CLOSED":
            # 订单关闭
            order = db.query(Order).filter_by(gateway_order_id=out_trade_no).first()
            if order:
                order.status = Order.STATUS_CLOSED
                event.process_message = f"Order closed: {out_trade_no}"
            return True
            
        else:
            event.process_message = f"Unhandled trade status: {trade_status}"
            return False
            
    except Exception as e:
        event.process_message = f"Failed to process Alipay webhook: {str(e)}"
        logger.error(f"Failed to process Alipay webhook: {e}")
        return False

def simulate_gateway_intent(channel: str, order_id: int, amount: float, currency: str, 
                          method: str = "h5") -> Dict[str, Any]:
    """模拟网关支付意图（用于测试）"""
    try:
        if channel == "wechat":
            return {
                "method": method,
                "pay_url": f"https://sandbox.wechat.local/pay/{order_id}?amount={amount}&currency={currency}",
                "prepay_id": f"wx{int(time.time() * 1000)}",
                "qrcode": f"https://sandbox.wechat.local/qrcode/{order_id}"
            }
        elif channel == "alipay":
            return {
                "method": method,
                "qrcode": f"https://sandbox.alipay.local/qrcode/{order_id}?amount={amount}&currency={currency}",
                "pay_url": f"https://sandbox.alipay.local/pay/{order_id}",
                "trade_no": f"alipay{int(time.time() * 1000)}"
            }
        else:
            return {
                "method": method,
                "pay_url": f"https://sandbox.local/pay/{order_id}?amount={amount}&currency={currency}"
            }
            
    except Exception as e:
        logger.error(f"Failed to simulate gateway intent: {e}")
        return {"method": method, "pay_url": "", "error": str(e)}

def get_payment_statistics(db: Session, start_date: Optional[datetime] = None, 
                         end_date: Optional[datetime] = None) -> Dict[str, Any]:
    """获取支付统计信息"""
    try:
        query = db.query(Order)
        
        if start_date:
            query = query.filter(Order.created_at >= start_date)
        if end_date:
            query = query.filter(Order.created_at <= end_date)
        
        orders = query.all()
        
        total_orders = len(orders)
        successful_orders = len([o for o in orders if o.status == Order.STATUS_SUCCEEDED])
        failed_orders = len([o for o in orders if o.status == Order.STATUS_FAILED])
        
        total_amount = sum(float(o.amount) for o in orders)
        successful_amount = sum(float(o.amount) for o in orders if o.status == Order.STATUS_SUCCEEDED)
        
        return {
            "total_orders": total_orders,
            "successful_orders": successful_orders,
            "failed_orders": failed_orders,
            "success_rate": successful_orders / total_orders if total_orders > 0 else 0,
            "total_amount": total_amount,
            "successful_amount": successful_amount,
            "conversion_rate": successful_amount / total_amount if total_amount > 0 else 0
        }
        
    except Exception as e:
        logger.error(f"Failed to get payment statistics: {e}")
        return {
            "total_orders": 0,
            "successful_orders": 0,
            "failed_orders": 0,
            "success_rate": 0,
            "total_amount": 0,
            "successful_amount": 0,
            "conversion_rate": 0
        }
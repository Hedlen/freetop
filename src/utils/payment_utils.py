import hashlib
import json
import hmac
import base64
import time
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Union
from decimal import Decimal, InvalidOperation
import logging

logger = logging.getLogger(__name__)

def generate_idempotency_key() -> str:
    """生成幂等键"""
    return f"{uuid.uuid4().hex}{int(time.time() * 1000)}"

def generate_order_no() -> str:
    """生成订单号"""
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    random_part = uuid.uuid4().hex[:8].upper()
    return f"ORD{timestamp}{random_part}"

def generate_payment_no() -> str:
    """生成支付单号"""
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    random_part = uuid.uuid4().hex[:8].upper()
    return f"PAY{timestamp}{random_part}"

def generate_refund_no() -> str:
    """生成退款单号"""
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    random_part = uuid.uuid4().hex[:8].upper()
    return f"REF{timestamp}{random_part}"

def validate_amount(amount: Union[Decimal, float, str], min_amount: Decimal = Decimal("0.01"), 
                   max_amount: Decimal = Decimal("1000000.00")) -> bool:
    """验证金额有效性"""
    try:
        if isinstance(amount, str):
            amount = Decimal(amount)
        elif isinstance(amount, float):
            amount = Decimal(str(amount))
        
        if amount <= 0:
            return False
        
        if amount < min_amount or amount > max_amount:
            return False
        
        # 检查小数位数（最多2位）
        if amount.as_tuple().exponent < -2:
            return False
        
        return True
    except (InvalidOperation, ValueError, TypeError):
        return False

def validate_currency(currency: str) -> bool:
    """验证货币代码"""
    valid_currencies = {"CNY", "USD", "EUR", "GBP", "JPY", "HKD"}
    return currency.upper() in valid_currencies

def validate_region(region: str) -> bool:
    """验证地区代码"""
    valid_regions = {"CN", "US", "EU", "JP", "HK", "SG", "AU"}
    return region.upper() in valid_regions

def calculate_wechat_sign(params: Dict[str, Any], api_key: str, sign_type: str = "HMAC-SHA256") -> str:
    """计算微信支付签名"""
    # 过滤空值和签名参数
    filtered_params = {k: v for k, v in params.items() if v and k != "sign"}
    
    # 按键名排序
    sorted_params = sorted(filtered_params.items())
    
    # 拼接字符串
    sign_string = "&".join(f"{k}={v}" for k, v in sorted_params)
    sign_string += f"&key={api_key}"
    
    if sign_type.upper() == "MD5":
        return hashlib.md5(sign_string.encode('utf-8')).hexdigest().upper()
    elif sign_type.upper() == "HMAC-SHA256":
        return hmac.new(
            api_key.encode('utf-8'),
            sign_string.encode('utf-8'),
            hashlib.sha256
        ).hexdigest().upper()
    else:
        raise ValueError(f"Unsupported sign type: {sign_type}")

def verify_wechat_sign(params: Dict[str, Any], api_key: str, sign_type: str = "HMAC-SHA256") -> bool:
    """验证微信支付签名"""
    sign = params.get("sign", "")
    if not sign:
        return False
    
    calculated_sign = calculate_wechat_sign(params, api_key, sign_type)
    return sign.upper() == calculated_sign.upper()

def calculate_alipay_sign(params: Dict[str, Any], private_key_path: str, sign_type: str = "RSA2") -> str:
    """计算支付宝签名"""
    from Crypto.PublicKey import RSA
    from Crypto.Signature import pkcs1_15
    from Crypto.Hash import SHA256, SHA1
    
    # 过滤空值和签名参数
    filtered_params = {k: v for k, v in params.items() if v and k != "sign" and k != "sign_type"}
    
    # 按键名排序
    sorted_params = sorted(filtered_params.items())
    
    # 拼接字符串
    sign_string = "&".join(f"{k}={v}" for k, v in sorted_params)
    
    # 读取私钥
    with open(private_key_path, 'r') as f:
        private_key = RSA.import_key(f.read())
    
    if sign_type.upper() == "RSA":
        hash_obj = SHA1.new(sign_string.encode('utf-8'))
    elif sign_type.upper() == "RSA2":
        hash_obj = SHA256.new(sign_string.encode('utf-8'))
    else:
        raise ValueError(f"Unsupported sign type: {sign_type}")
    
    signature = pkcs1_15.new(private_key).sign(hash_obj)
    return base64.b64encode(signature).decode('utf-8')

def verify_alipay_sign(params: Dict[str, Any], public_key_path: str, sign_type: str = "RSA2") -> bool:
    """验证支付宝签名"""
    from Crypto.PublicKey import RSA
    from Crypto.Signature import pkcs1_15
    from Crypto.Hash import SHA256, SHA1
    
    sign = params.get("sign", "")
    if not sign:
        return False
    
    # 过滤空值和签名参数
    filtered_params = {k: v for k, v in params.items() if v and k != "sign" and k != "sign_type"}
    
    # 按键名排序
    sorted_params = sorted(filtered_params.items())
    
    # 拼接字符串
    sign_string = "&".join(f"{k}={v}" for k, v in sorted_params)
    
    # 读取公钥
    with open(public_key_path, 'r') as f:
        public_key = RSA.import_key(f.read())
    
    try:
        signature = base64.b64decode(sign)
        
        if sign_type.upper() == "RSA":
            hash_obj = SHA1.new(sign_string.encode('utf-8'))
        elif sign_type.upper() == "RSA2":
            hash_obj = SHA256.new(sign_string.encode('utf-8'))
        else:
            return False
        
        pkcs1_15.new(public_key).verify(hash_obj, signature)
        return True
    except (ValueError, TypeError):
        return False

def validate_order_data(data: Dict[str, Any]) -> tuple[bool, str]:
    """验证订单数据"""
    required_fields = ["amount", "currency", "channel"]
    
    # 检查必填字段
    for field in required_fields:
        if field not in data or not data[field]:
            return False, f"Missing required field: {field}"
    
    # 验证金额
    if not validate_amount(data["amount"]):
        return False, "Invalid amount"
    
    # 验证货币
    if not validate_currency(data["currency"]):
        return False, "Invalid currency"
    
    # 验证渠道
    valid_channels = {"wechat", "alipay"}
    if data["channel"] not in valid_channels:
        return False, "Invalid payment channel"
    
    # 验证地区（可选）
    if "region" in data and data["region"]:
        if not validate_region(data["region"]):
            return False, "Invalid region"
    
    # 验证用户ID（可选）
    if "user_id" in data and data["user_id"]:
        try:
            user_id = int(data["user_id"])
            if user_id <= 0:
                return False, "Invalid user_id"
        except (ValueError, TypeError):
            return False, "Invalid user_id"
    
    return True, ""

def generate_hash(data: Any) -> str:
    """生成数据哈希"""
    if isinstance(data, dict):
        # 确保键值对按key排序，保证一致性
        data_str = json.dumps(data, sort_keys=True, separators=(',', ':'))
    else:
        data_str = str(data)
    
    return hashlib.sha256(data_str.encode('utf-8')).hexdigest()

def is_idempotency_key_expired(created_at: datetime, expire_hours: int = 24) -> bool:
    """检查幂等键是否过期"""
    expire_time = created_at + timedelta(hours=expire_hours)
    return datetime.now() > expire_time

def safe_json_loads(data: str, default: Any = None) -> Any:
    """安全加载JSON数据"""
    try:
        return json.loads(data) if data else default
    except (json.JSONDecodeError, TypeError):
        return default

def format_amount_for_gateway(amount: Decimal) -> str:
    """格式化金额供网关使用（转换为分或元）"""
    # 微信支付需要转换为分
    return str(int(amount * 100))

def parse_amount_from_gateway(amount_str: str, unit: str = "fen") -> Decimal:
    """从网关解析金额"""
    try:
        amount = Decimal(amount_str)
        if unit == "fen":  # 分转元
            return amount / 100
        else:  # 元
            return amount
    except (InvalidOperation, ValueError, TypeError):
        return Decimal("0")

def get_order_expire_time(minutes: int = 30) -> datetime:
    """获取订单过期时间"""
    return datetime.now() + timedelta(minutes=minutes)

def is_order_expired(expire_at: datetime) -> bool:
    """检查订单是否过期"""
    return datetime.now() > expire_at

def validate_webhook_ip(ip: str, gateway: str) -> bool:
    """验证Webhook IP地址"""
    # 微信支付IP白名单（示例，实际需要根据官方文档配置）
    wechat_ips = {
        "101.226.103.0/25",
        "140.207.54.0/25", 
        "103.7.30.0/25",
        "183.3.234.0/25",
        "58.251.80.0/25"
    }
    
    # 支付宝IP白名单（示例）
    alipay_ips = {
        "121.0.29.0/24",
        "110.75.128.0/19",
        "115.124.16.0/20",
        "110.75.145.0/24",
        "110.75.145.255/24"
    }
    
    # 这里应该实现IP段匹配逻辑
    # 简化处理，实际项目中需要完整的IP匹配算法
    return True

def mask_sensitive_data(data: Dict[str, Any], sensitive_keys: set = None) -> Dict[str, Any]:
    """脱敏敏感数据"""
    if sensitive_keys is None:
        sensitive_keys = {"api_key", "private_key", "cert_path", "password", "secret"}
    
    masked_data = data.copy()
    for key, value in masked_data.items():
        if any(sensitive_key in key.lower() for sensitive_key in sensitive_keys):
            if isinstance(value, str) and len(value) > 8:
                masked_data[key] = f"{value[:4]}****{value[-4:]}"
            else:
                masked_data[key] = "****"
        elif isinstance(value, dict):
            masked_data[key] = mask_sensitive_data(value, sensitive_keys)
    
    return masked_data
#!/usr/bin/env python3
"""
增强的JWT认证中间件
提供详细的token验证日志和错误处理
"""

import jwt
import logging
from datetime import datetime
from typing import Optional
from fastapi import HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Request

logger = logging.getLogger(__name__)

# 从配置中获取密钥和算法
try:
    from config.settings import SECRET_KEY, ALGORITHM
except ImportError:
    # 如果无法导入配置，使用默认值（生产环境中应该避免）
    SECRET_KEY = "your-secret-key-here"
    ALGORITHM = "HS256"
    logger.warning("无法导入JWT配置，使用默认值")

security = HTTPBearer()

def enhanced_verify_token(token: str) -> Optional[int]:
    """增强的token验证，包含详细日志"""
    try:
        if not token:
            logger.warning("JWT验证失败: token为空")
            return None
            
        # 解码token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        exp = payload.get("exp")
        iat = payload.get("iat")
        
        # 检查必要字段
        if not user_id:
            logger.warning("JWT验证失败: token中缺少用户ID")
            return None
        
        # 检查过期时间
        if exp:
            exp_datetime = datetime.fromtimestamp(exp)
            current_time = datetime.now()
            if current_time > exp_datetime:
                logger.warning(f"JWT验证失败: token已过期 (过期时间: {exp_datetime}, 当前时间: {current_time})")
                return None
        
        # 检查签发时间（防止未来时间的token）
        if iat:
            iat_datetime = datetime.fromtimestamp(iat)
            current_time = datetime.now()
            if iat_datetime > current_time:
                logger.warning(f"JWT验证失败: token签发时间异常 (签发时间: {iat_datetime}, 当前时间: {current_time})")
                return None
        
        logger.info(f"JWT验证成功: user_id={user_id}, 过期时间={exp_datetime if exp else 'None'}")
        return int(user_id)
        
    except jwt.ExpiredSignatureError:
        logger.warning("JWT验证失败: 签名已过期")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"JWT验证失败: 无效token - {e}")
        return None
    except ValueError as e:
        logger.warning(f"JWT验证失败: 用户ID格式错误 - {e}")
        return None
    except Exception as e:
        logger.error(f"JWT验证异常: {e}")
        return None

def get_current_user_id(credentials: HTTPAuthorizationCredentials = security) -> Optional[int]:
    """从请求中获取当前用户ID"""
    if not credentials:
        logger.debug("无认证凭据")
        return None
    
    token = credentials.credentials
    user_id = enhanced_verify_token(token)
    
    if user_id is None:
        logger.warning("用户认证失败")
    
    return user_id

def get_current_user_id_optional(request: Request) -> Optional[int]:
    """可选的用户ID获取，不抛出异常"""
    try:
        # 尝试从Authorization header获取token
        auth_header = request.headers.get("authorization")
        if not auth_header:
            logger.debug("请求中无Authorization header")
            return None
        
        # 解析Bearer token
        if not auth_header.startswith("Bearer "):
            logger.debug("Authorization header格式错误")
            return None
        
        token = auth_header[7:]  # 移除"Bearer "前缀
        user_id = enhanced_verify_token(token)
        
        return user_id
        
    except Exception as e:
        logger.warning(f"获取用户ID时发生异常: {e}")
        return None

def require_authentication(credentials: HTTPAuthorizationCredentials = security) -> int:
    """要求认证的依赖项，认证失败时抛出异常"""
    user_id = get_current_user_id(credentials)
    
    if user_id is None:
        logger.warning("认证失败，拒绝访问")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="认证失败",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user_id

def log_authentication_attempt(request: Request, user_id: Optional[int]):
    """记录认证尝试"""
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    
    if user_id:
        logger.info(f"认证成功: user_id={user_id}, IP={client_ip}, User-Agent={user_agent[:50]}...")
    else:
        logger.warning(f"认证失败: IP={client_ip}, User-Agent={user_agent[:50]}...")

# 中间件函数
async def auth_middleware(request: Request, call_next):
    """认证中间件"""
    # 获取用户ID（不强制要求认证）
    user_id = get_current_user_id_optional(request)
    
    # 记录认证尝试
    log_authentication_attempt(request, user_id)
    
    # 将用户ID添加到请求状态中
    request.state.user_id = user_id
    
    response = await call_next(request)
    return response
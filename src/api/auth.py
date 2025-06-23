from fastapi import Header, HTTPException
from src.services.user_service import UserService


async def get_current_user(authorization: str = Header(None)):
    """
    获取当前用户信息
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="未提供认证令牌")
    
    token = authorization.split(" ")[1]
    payload = UserService.verify_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="无效的认证令牌")
    
    user = UserService.get_user_by_id(payload["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    return {"success": True, "user": user}
from fastapi import Header, HTTPException
from src.services.user_service import UserService


async def get_current_user(authorization: str = Header(None)):
    """
    获取当前用户信息
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="未提供认证令牌")
    
    token = authorization.split(" ")[1]
    token_info = UserService.verify_token_with_details(token)
    
    if not token_info["valid"]:
        if token_info["error"] == "expired":
            raise HTTPException(status_code=401, detail="认证令牌已过期，请刷新令牌")
        else:
            raise HTTPException(status_code=401, detail="无效的认证令牌")
    
    user = UserService.get_user_by_id(token_info["payload"]["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    return {"success": True, "user": user}
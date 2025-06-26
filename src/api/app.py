"""
FastAPI application for LangManus.
"""

import json
import logging
import os
from typing import Dict, List, Any, Optional, Union, Set
import weakref

from fastapi import FastAPI, HTTPException, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse
import asyncio
from typing import AsyncGenerator, Dict, List, Any

from src.graph import build_graph
from src.config import TEAM_MEMBERS, TEAM_MEMBER_CONFIGRATIONS, BROWSER_HISTORY_DIR
from src.service.workflow_service import run_agent_workflow
from src.services.user_service import UserService
from src.database.connection import init_database
from src.api.proxy_test import router as proxy_router

# Configure logging
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="FreeTop API",
    description="API for FreeTop LangGraph-based agent workflow",
    version="0.1.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Include proxy test router
app.include_router(proxy_router)

# Create the graph
graph = build_graph()

# Global task tracker for managing running workflows
active_tasks: Dict[str, asyncio.Task] = {}
task_abort_events: Dict[str, asyncio.Event] = {}
# Track tasks by user ID for bulk operations
user_tasks: Dict[int, Set[str]] = {}


class ChatMessage(BaseModel):
    role: str = Field(
        ..., description="The role of the message sender (user or assistant)"
    )
    content: str = Field(
        ...,
        description="The content of the message",
    )


class ChatRequest(BaseModel):
    messages: List[ChatMessage] = Field(..., description="The conversation history")
    debug: Optional[bool] = Field(False, description="Whether to enable debug logging")
    deep_thinking_mode: Optional[bool] = Field(
        False, description="Whether to enable deep thinking mode"
    )
    search_before_planning: Optional[bool] = Field(
        False, description="Whether to search before planning"
    )
    team_members: Optional[list] = Field(None, description="enabled team members")


class UserRegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="用户名")
    email: str = Field(..., description="邮箱地址")
    password: str = Field(..., min_length=6, description="密码")


class UserLoginRequest(BaseModel):
    username: str = Field(..., description="用户名或邮箱")
    password: str = Field(..., description="密码")


class UserResponse(BaseModel):
    success: bool
    message: str
    user: Optional[dict] = None
    token: Optional[str] = None


@app.post("/api/chat/stream")
async def chat_endpoint(request: ChatRequest, req: Request, authorization: str = Header(None)):
    """
    Chat endpoint for LangGraph invoke.

    Args:
        request: The chat request
        req: The FastAPI request object for connection state checking

    Returns:
        The streamed response
    """
    import uuid
    
    # Get user_id from authorization token first
    user_id = None
    if authorization:
        try:
            payload = UserService.verify_token(authorization)
            if payload:
                user_id = payload.get("user_id")
        except Exception as e:
            logger.warning(f"Failed to get user_id from token: {e}")
    
    # Generate unique task ID for this request
    task_id = str(uuid.uuid4())
    abort_event = asyncio.Event()
    task_abort_events[task_id] = abort_event
    
    # Track task by user ID if user is authenticated
    if user_id is not None:
        if user_id not in user_tasks:
            user_tasks[user_id] = set()
        user_tasks[user_id].add(task_id)
    
    try:
        # Convert Pydantic models to dictionaries and normalize content format
        messages = []
        for msg in request.messages:
            message_dict = {"role": msg.role}

            # Handle both string content and list of content items
            message_dict["content"] = msg.content

            messages.append(message_dict)

        async def event_generator():
            try:
                # Send task ID to client for abort functionality
                yield {
                    "event": "task_started",
                    "data": json.dumps({"task_id": task_id}, ensure_ascii=False),
                }
                
                async for event in run_agent_workflow(
                    messages,
                    request.debug,
                    request.deep_thinking_mode,
                    request.search_before_planning,
                    request.team_members,
                    abort_event=abort_event,
                    user_id=user_id,
                ):
                    # Check if client is still connected or abort requested
                    if await req.is_disconnected():
                        logger.info("Client disconnected, stopping workflow")
                        abort_event.set()
                        break
                    
                    if abort_event.is_set():
                        logger.info("Workflow abort requested, stopping")
                        break
                        
                    yield {
                        "event": event["event"],
                        "data": json.dumps(event["data"], ensure_ascii=False),
                    }
            except asyncio.CancelledError:
                logger.info("Stream processing cancelled")
                abort_event.set()
                raise
            except Exception as e:
                logger.error(f"Error in workflow: {e}")
                abort_event.set()
                raise
            finally:
                # Clean up task tracking
                if task_id in task_abort_events:
                    del task_abort_events[task_id]
                if task_id in active_tasks:
                    del active_tasks[task_id]
                # Clean up user task tracking
                if user_id is not None and user_id in user_tasks and task_id in user_tasks[user_id]:
                    user_tasks[user_id].discard(task_id)
                    if not user_tasks[user_id]:  # Remove empty set
                        del user_tasks[user_id]

        return EventSourceResponse(
            event_generator(),
            media_type="text/event-stream",
            sep="\n",
        )
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        # Clean up on error
        if task_id in task_abort_events:
            del task_abort_events[task_id]
        if task_id in active_tasks:
            del active_tasks[task_id]
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/browser_history/{filename}")
async def get_browser_history_file(filename: str):
    """
    Get a specific browser history GIF file.

    Args:
        filename: The filename of the GIF to retrieve

    Returns:
        The GIF file
    """
    try:
        file_path = os.path.join(BROWSER_HISTORY_DIR, filename)
        if not os.path.exists(file_path) or not filename.endswith(".gif"):
            raise HTTPException(status_code=404, detail="File not found")

        return FileResponse(file_path, media_type="image/gif", filename=filename)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving browser history file: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/team_members")
async def get_team_members():
    """
    Get the configuration of all team members.

    Returns:
        dict: A dictionary containing team member configurations
    """
    try:
        return {"team_members": TEAM_MEMBER_CONFIGRATIONS}
    except Exception as e:
        logger.error(f"Error getting team members: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat/abort/{task_id}")
async def abort_task(task_id: str):
    """
    Abort a running chat task.

    Args:
        task_id: The ID of the task to abort

    Returns:
        dict: Status of the abort operation
    """
    try:
        if task_id in task_abort_events:
            # Signal the workflow to stop
            task_abort_events[task_id].set()
            logger.info(f"Abort signal sent for task {task_id}")
            
            # Cancel the task if it exists
            if task_id in active_tasks:
                task = active_tasks[task_id]
                if not task.done():
                    task.cancel()
                    logger.info(f"Task {task_id} cancelled")
            
            return {"status": "success", "message": f"Task {task_id} abort requested"}
        else:
            return {"status": "not_found", "message": f"Task {task_id} not found or already completed"}
    except Exception as e:
        logger.error(f"Error aborting task {task_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat/abort-user-tasks")
async def abort_user_tasks(request: Request):
    """
    Abort all running tasks for a specific user.
    This is useful when user refreshes the page or closes the browser.
    
    Returns:
        dict: Status of the abort operation
    """
    try:
        # Get user_id from authorization token
        user_id = None
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:]
            try:
                payload = UserService.verify_token(token)
                if payload:
                    user_id = payload.get("user_id")
            except Exception as e:
                logger.warning(f"Invalid token in abort user tasks: {e}")
                return {"status": "error", "message": "Invalid authorization token"}
        
        if not user_id:
            return {"status": "error", "message": "User not authenticated"}
        
        aborted_tasks = []
        if user_id in user_tasks:
            task_ids = list(user_tasks[user_id])  # Create a copy to avoid modification during iteration
            
            for task_id in task_ids:
                try:
                    # Set the abort event
                    if task_id in task_abort_events:
                        task_abort_events[task_id].set()
                        logger.info(f"Abort signal sent for user {user_id} task {task_id}")
                    
                    # Cancel the task if it exists
                    if task_id in active_tasks:
                        task = active_tasks[task_id]
                        task.cancel()
                        logger.info(f"User {user_id} task {task_id} cancelled")
                    
                    aborted_tasks.append(task_id)
                except Exception as task_error:
                    logger.error(f"Error aborting task {task_id} for user {user_id}: {task_error}")
        
        if aborted_tasks:
            return {
                "status": "success", 
                "message": f"Aborted {len(aborted_tasks)} tasks for user {user_id}",
                "aborted_tasks": aborted_tasks
            }
        else:
            return {
                "status": "success", 
                "message": f"No active tasks found for user {user_id}"
            }
    except Exception as e:
        logger.error(f"Error aborting user tasks: {e}")
        return {"status": "error", "message": str(e)}


@app.post("/api/auth/register", response_model=UserResponse)
async def register_user(request: UserRegisterRequest):
    """
    用户注册
    """
    try:
        result = UserService.create_user(
            username=request.username,
            email=request.email,
            password=request.password
        )
        return UserResponse(**result)
    except Exception as e:
        logger.error(f"Error registering user: {e}")
        raise HTTPException(status_code=500, detail="注册失败")


@app.post("/api/auth/login", response_model=UserResponse)
async def login_user(request: UserLoginRequest):
    """
    用户登录
    """
    try:
        result = UserService.authenticate_user(
            username=request.username,
            password=request.password
        )
        return UserResponse(**result)
    except Exception as e:
        logger.error(f"Error logging in user: {e}")
        raise HTTPException(status_code=500, detail="登录失败")


@app.get("/api/auth/me")
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


class UserUpdateRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="用户名")
    email: str = Field(..., description="邮箱地址")
    avatar_url: str = Field(default="", description="头像URL")


@app.put("/api/user/profile", response_model=UserResponse)
async def update_user_profile(request: UserUpdateRequest, authorization: str = Header(None)):
    """
    更新用户个人信息
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="未提供认证令牌")
    
    token = authorization.split(" ")[1]
    payload = UserService.verify_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="无效的认证令牌")
    
    try:
        result = UserService.update_user_profile(
            user_id=payload["user_id"],
            username=request.username,
            email=request.email,
            avatar_url=request.avatar_url
        )
        return UserResponse(**result)
    except Exception as e:
        logger.error(f"Error updating user profile: {e}")
        raise HTTPException(status_code=500, detail="更新个人信息失败")


# 系统设置相关接口
class SettingsResponse(BaseModel):
    success: bool
    message: str = ""
    settings: dict = {}


@app.get("/api/settings", response_model=SettingsResponse)
async def get_user_settings(authorization: str = Header(None)):
    """获取用户设置"""
    try:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="未提供有效的认证令牌")
        
        token = authorization.split(" ")[1]
        payload = UserService.verify_token(token)
        if not payload:
            raise HTTPException(status_code=401, detail="无效的认证令牌")
        
        user_id = payload.get("user_id")
        result = UserService.get_user_settings(user_id)
        
        return SettingsResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user settings: {e}")
        raise HTTPException(status_code=500, detail="获取设置失败")


@app.post("/api/settings", response_model=SettingsResponse)
async def save_user_settings(settings: dict, authorization: str = Header(None)):
    """保存用户设置"""
    try:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="未提供有效的认证令牌")
        
        token = authorization.split(" ")[1]
        payload = UserService.verify_token(token)
        if not payload:
            raise HTTPException(status_code=401, detail="无效的认证令牌")
        
        user_id = payload.get("user_id")
        result = UserService.save_user_settings(user_id, settings)
        
        return SettingsResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving user settings: {e}")
        raise HTTPException(status_code=500, detail="保存设置失败")


# 初始化数据库
@app.on_event("startup")
async def startup_event():
    """
    应用启动时初始化数据库
    """
    try:
        init_database()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")

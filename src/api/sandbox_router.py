from fastapi import APIRouter, HTTPException
from src.sandbox.executor import SandboxExecutor
from src.sandbox.models import ExecuteRequest, ExecuteResult, RenderRequest, RenderResult

router = APIRouter(prefix="/api/sandbox", tags=["sandbox"])

_executor = SandboxExecutor()


@router.post("/execute", response_model=ExecuteResult)
def execute(req: ExecuteRequest):
    try:
        return _executor.execute(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/render", response_model=RenderResult)
def render(req: RenderRequest):
    try:
        return _executor.render(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

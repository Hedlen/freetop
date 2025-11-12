from fastapi import APIRouter, HTTPException
from src.sandbox.executor import SandboxExecutor
from src.sandbox.models import ExecuteRequest, ExecuteResult, RenderRequest, RenderResult

router = APIRouter(prefix="/api/sandbox", tags=["sandbox"])

def _get_executor() -> SandboxExecutor:
    return SandboxExecutor()


@router.post("/execute", response_model=ExecuteResult)
def execute(req: ExecuteRequest):
    try:
        return _get_executor().execute(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/render", response_model=RenderResult)
def render(req: RenderRequest):
    try:
        return _get_executor().render(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

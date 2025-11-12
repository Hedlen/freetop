from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class ResourceLimits(BaseModel):
    cpu_quota: Optional[int] = Field(200000, description="CPU quota in microseconds (200000=20% of 1 CPU)")
    cpu_period: Optional[int] = Field(100000, description="CPU period in microseconds")
    mem_limit: Optional[str] = Field("512m", description="Memory limit")
    pids_limit: Optional[int] = Field(128, description="Process count limit")
    shm_size: Optional[str] = Field("64m", description="/dev/shm size")
    network_enabled: Optional[bool] = Field(False, description="Whether to enable network inside container")


class SandboxFile(BaseModel):
    path: str
    content: str


class ExecuteRequest(BaseModel):
    session_id: Optional[str] = None
    language: Optional[str] = Field(None, description="Preferred language: node|python")
    command: Optional[str] = Field(None, description="Explicit run command")
    files: List[SandboxFile] = Field(default_factory=list)
    limits: ResourceLimits = Field(default_factory=ResourceLimits)
    timeout_seconds: int = Field(30, ge=1, le=300)
    run_static_checks: bool = Field(True)


class ExecuteResult(BaseModel):
    session_id: str
    exit_code: int
    stdout: str
    stderr: str
    eslint_report: Optional[str] = None
    pylint_report: Optional[str] = None
    duration_ms: int
    stats: Dict[str, float] = Field(default_factory=dict)


class RenderRequest(BaseModel):
    session_id: Optional[str] = None
    files: List[SandboxFile] = Field(default_factory=list)
    limits: ResourceLimits = Field(default_factory=ResourceLimits)
    timeout_seconds: int = Field(30, ge=1, le=300)
    url_path: str = Field("/index.html")
    viewports: List[str] = Field(default_factory=lambda: ["1280x800", "375x812"])


class RenderResult(BaseModel):
    session_id: str
    screenshots: Dict[str, str]  # viewport => base64 PNG
    pdf_base64: Optional[str] = None
    logs: str = ""

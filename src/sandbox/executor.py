import base64
import io
import tarfile
import time
import uuid
from typing import Dict, List, Optional, Tuple

import docker

from .models import ExecuteRequest, ExecuteResult, RenderRequest, RenderResult


SANDBOX_IMAGE = "freetop-sandbox:latest"
SEC_COMP_PATH = "sandbox/seccomp.json"


class SandboxExecutor:
    def __init__(self):
        self.client = docker.from_env()

    def ensure_image(self) -> None:
        try:
            self.client.images.get(SANDBOX_IMAGE)
        except docker.errors.ImageNotFound:
            self.client.images.build(path="sandbox", tag=SANDBOX_IMAGE)

    def _make_tar(self, files: List[Tuple[str, bytes]]) -> bytes:
        buf = io.BytesIO()
        with tarfile.open(fileobj=buf, mode="w") as tar:
            for path, data in files:
                info = tarfile.TarInfo(name=path)
                info.size = len(data)
                info.mtime = int(time.time())
                tar.addfile(info, io.BytesIO(data))
        buf.seek(0)
        return buf.read()

    def _put_files(self, container, files: List[Tuple[str, bytes]], base_dir: str = "/work"):
        tar_bytes = self._make_tar(files)
        container.put_archive(base_dir, tar_bytes)

    def _detect_language_and_command(self, container) -> Tuple[str, str]:
        # Basic detection: package.json => node; requirements.txt or .py => python
        rc_pkg = container.exec_run("bash -lc 'test -f package.json'", demux=True)
        if rc_pkg.exit_code == 0:
            return ("node", "bash -lc 'if [ -f package-lock.json ]; then npm ci --ignore-scripts; else npm i --ignore-scripts; fi && node main.js || npm run start || node index.js'")
        rc_req = container.exec_run("bash -lc 'test -f requirements.txt'", demux=True)
        if rc_req.exit_code == 0:
            return ("python", "bash -lc 'pip install --no-cache-dir -r requirements.txt && python main.py || python app.py'"
                    )
        # fallback
        return ("python", "bash -lc 'python main.py || true'")

    def _run_static_checks(self, container) -> Tuple[str, str]:
        eslint_cmd = r"""bash -lc 'files=$(find . -type f -name "*.js" -o -name "*.ts"); if [ -n "$files" ]; then eslint . --ext .js,.ts || true; fi'"""
        pylint_cmd = r"""bash -lc 'files=$(find . -type f -name "*.py"); if [ -n "$files" ]; then pylint $files || true; fi'"""
        eslint = container.exec_run(eslint_cmd, demux=True)
        pylint = container.exec_run(pylint_cmd, demux=True)
        eslint_out = self._format_output(eslint)
        pylint_out = self._format_output(pylint)
        return eslint_out, pylint_out

    def _format_output(self, result) -> str:
        if not result:
            return ""
        out = ""
        if result.output:
            if result.output[0]:
                out += result.output[0].decode(errors="ignore")
            if result.output[1]:
                out += result.output[1].decode(errors="ignore")
        return out

    def _create_container(self, limits, enable_network: bool, labels: Dict[str, str]):
        return self.client.containers.run(
            SANDBOX_IMAGE,
            command=["sleep", "infinity"],
            detach=True,
            labels=labels,
            stdin_open=False,
            tty=False,
            mem_limit=limits.mem_limit,
            network_disabled=(not enable_network),
            cap_drop=["ALL"],
            security_opt=[f"seccomp={SEC_COMP_PATH}", "no-new-privileges"],
            pids_limit=limits.pids_limit,
            shm_size=limits.shm_size,
            name=f"sandbox_{labels.get('session_id')}",
        )

    def execute(self, req: ExecuteRequest) -> ExecuteResult:
        self.ensure_image()
        session_id = req.session_id or str(uuid.uuid4())
        labels = {"session_id": session_id, "role": "sandbox"}
        container = self._create_container(req.limits, req.limits.network_enabled, labels)
        try:
            files: List[Tuple[str, bytes]] = [(f.path, f.content.encode("utf-8")) for f in req.files]
            self._put_files(container, files)
            cmd = req.command
            lang = req.language
            if not cmd:
                lang, cmd = self._detect_language_and_command(container)

            eslint_report = None
            pylint_report = None
            if req.run_static_checks:
                er, pr = self._run_static_checks(container)
                eslint_report, pylint_report = er, pr

            start = time.time()
            exec_res = container.exec_run(cmd, demux=True)

            # Timeout handling
            waited = 0
            while exec_res.exit_code is None and waited < req.timeout_seconds:
                time.sleep(0.1)
                waited += 0.1
            if waited >= req.timeout_seconds:
                container.kill()
                exit_code = 124
                stdout = ""
                stderr = "Timeout exceeded"
            else:
                exit_code = exec_res.exit_code or 0
                stdout = exec_res.output[0].decode(errors="ignore") if exec_res.output and exec_res.output[0] else ""
                stderr = exec_res.output[1].decode(errors="ignore") if exec_res.output and exec_res.output[1] else ""

            stats = self._collect_stats(container)
            duration_ms = int((time.time() - start) * 1000)
            return ExecuteResult(
                session_id=session_id,
                exit_code=exit_code,
                stdout=stdout,
                stderr=stderr,
                eslint_report=eslint_report,
                pylint_report=pylint_report,
                duration_ms=duration_ms,
                stats=stats,
            )
        finally:
            try:
                container.stop(timeout=1)
            except Exception:
                pass
            try:
                container.remove(force=True)
            except Exception:
                pass

    def _collect_stats(self, container) -> Dict[str, float]:
        try:
            s = container.stats(stream=False)
            cpu_delta = s["cpu_stats"]["cpu_usage"]["total_usage"] - s["precpu_stats"]["cpu_usage"]["total_usage"]
            system_delta = s["cpu_stats"]["system_cpu_usage"] - s["precpu_stats"]["system_cpu_usage"]
            cpu = 0.0
            if system_delta > 0.0 and cpu_delta > 0.0:
                cpu = (cpu_delta / system_delta) * 100.0
            mem = s["memory_stats"].get("usage", 0) / (1024 * 1024)
            return {"cpu_percent": cpu, "mem_mb": mem}
        except Exception:
            return {}

    def render(self, req: RenderRequest) -> RenderResult:
        self.ensure_image()
        session_id = req.session_id or str(uuid.uuid4())
        labels = {"session_id": session_id, "role": "sandbox-render"}
        # Rendering needs network inside container only for localhost; keep disabled and bind to container port
        container = self._create_container(req.limits, True, labels)
        try:
            files: List[Tuple[str, bytes]] = [(f.path, f.content.encode("utf-8")) for f in req.files]
            self._put_files(container, files)
            # Start static server
            server_res = container.exec_run("bash -lc 'npx --yes http-server -p 8080 -c-1 ./ || ./node_modules/.bin/http-server -p 8080 -c-1 ./'", demux=True)
            # Give server time to boot
            time.sleep(1.0)
            screenshots: Dict[str, str] = {}
            logs = self._format_output(server_res)
            for vp in req.viewports:
                w, h = (int(vp.split("x")[0]), int(vp.split("x")[1]))
                outfile = f"shot_{w}x{h}.png"
                script = (
                    "node -e \"const { chromium } = require('playwright');(async()=>{"
                    f"const b=await chromium.launch();const p=await b.newPage();await p.setViewportSize({{width:{w},height:{h}}});"
                    f"await p.goto('http://127.0.0.1:8080{req.url_path}', {{ waitUntil: 'networkidle' }});"
                    f"await p.screenshot({{ path: '{outfile}' }});await b.close();}})().catch(e=>{{console.error(e);process.exit(1);}})\""
                )
                r = container.exec_run(f"bash -lc {script}", demux=True)
                logs += "\n" + self._format_output(r)
                # Read file back
                stream, stat = container.get_archive(f"/work/{outfile}")
                data = b"".join(stream)
                # Extract from tar
                with tarfile.open(fileobj=io.BytesIO(data), mode="r") as tar:
                    member = tar.getmember(outfile)
                    fobj = tar.extractfile(member)
                    img = fobj.read() if fobj else b""
                screenshots[vp] = base64.b64encode(img).decode("ascii")

            return RenderResult(session_id=session_id, screenshots=screenshots, pdf_base64=None, logs=logs)
        finally:
            try:
                container.stop(timeout=1)
            except Exception:
                pass
            try:
                container.remove(force=True)
            except Exception:
                pass

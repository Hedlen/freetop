import os
import pytest
from fastapi.testclient import TestClient
from src.api.app import app


def docker_available() -> bool:
    try:
        import docker
        docker.from_env().ping()
        return True
    except Exception:
        return False


def test_execute_python_hello_world():
    if not docker_available():
        pytest.skip("Docker not available, skip sandbox tests")
    client = TestClient(app)
    req = {
        "files": [
            {"path": "main.py", "content": "print('hello')"}
        ],
        "language": "python",
        "timeout_seconds": 10,
    }
    resp = client.post("/api/sandbox/execute", json=req, timeout=60)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["exit_code"] == 0
    assert "hello" in data["stdout"]


def test_execute_node_hello_world():
    if not docker_available():
        pytest.skip("Docker not available, skip sandbox tests")
    client = TestClient(app)
    req = {
        "files": [
            {"path": "package.json", "content": "{\n  \"name\": \"app\",\n  \"version\": \"1.0.0\"\n}"},
            {"path": "main.js", "content": "console.log('hello-node')"}
        ],
        "language": "node",
        "timeout_seconds": 10,
    }
    resp = client.post("/api/sandbox/execute", json=req, timeout=60)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["exit_code"] == 0
    assert "hello-node" in data["stdout"]


def test_render_static_page():
    if not docker_available():
        pytest.skip("Docker not available, skip sandbox tests")
    client = TestClient(app)
    html = """<!doctype html><html><head><meta charset='utf-8'><title>T</title></head>
    <body><h1 id='t'>Hello Render</h1></body></html>"""
    req = {
        "files": [{"path": "index.html", "content": html}],
        "url_path": "/index.html",
        "viewports": ["800x600", "375x812"],
        "timeout_seconds": 20,
    }
    resp = client.post("/api/sandbox/render", json=req, timeout=90)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "800x600" in data["screenshots"]
    assert len(data["screenshots"]["800x600"]) > 100

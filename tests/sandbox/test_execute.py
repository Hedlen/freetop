from fastapi.testclient import TestClient
from src.api.app import app


def test_execute_python_hello_world():
    client = TestClient(app)
    req = {
        "files": [
            {"path": "main.py", "content": "print('hello')"}
        ],
        "language": "python",
        "timeout_seconds": 10,
    }
    resp = client.post("/api/sandbox/execute", json=req, timeout=30)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["exit_code"] == 0
    assert "hello" in data["stdout"]

# 沙盒执行环境运维手册

## 构建沙盒镜像

```bash
docker build -t freetop-sandbox:latest -f sandbox/Dockerfile .
```

## 运行健康检查

- 调用 `POST /api/sandbox/execute` 传入简单 `python main.py` 或 `node main.js`
- 查看返回 `exit_code` 与 `stats`

## 资源与安全

- 通过 `mem_limit`, `pids_limit`, `shm_size` 控制资源
- 默认 `network_disabled`; 若需网页预览，启用网络并绑定本地端口
- 使用 `sandbox/seccomp.json` 与 `cap_drop=ALL`，禁止提权与危险系统调用

## 日志审计

- API 返回执行日志（stdout/stderr、静态分析报告）
- 后续可接入集中化日志（ELK/Grafana）

## 报警策略

- 退出码非 0、超时、内存使用超过阈值可触发报警（对接企业微信/Slack）

## CI/CD

- 参考 `.github/workflows/sandbox.yml`：
  - 构建与缓存沙盒镜像
  - 运行沙盒相关测试用例
  - 可选推送到镜像仓库（需配置 `REGISTRY` 与凭据）

## 压力测试

- 使用 `pytest` 并行触发多会话；或接入 k6/Locust 进行 100–500 并发验证


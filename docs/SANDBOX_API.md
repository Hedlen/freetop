# 沙盒执行环境 API 文档

## 概述
提供基于 Docker 容器的隔离执行环境，支持多语言、静态分析、安全限制、网页渲染预览与资源监控。

## 接口

- `POST /api/sandbox/execute`
  - 请求体：
    - `files`: 文件列表 `{ path, content }`
    - `language`: `node|python`（可选）
    - `command`: 自定义命令（可选）
    - `limits`: 资源限制（CPU、内存、进程、网络）
    - `timeout_seconds`: 默认 30
    - `run_static_checks`: 是否运行 ESLint/Pylint
  - 返回：`exit_code`, `stdout`, `stderr`, `eslint_report`, `pylint_report`, `stats`

- `POST /api/sandbox/render`
  - 请求体：
    - `files`: 前端项目文件
    - `url_path`: 访问路径（默认 `/index.html`）
    - `viewports`: 视口列表，例如 `1280x800`, `375x812`
    - `limits`, `timeout_seconds`
  - 返回：`screenshots`（base64 PNG），`logs`

## 资源限制
- `mem_limit`（例如 `512m`）
- `pids_limit`、`shm_size`
- `network_enabled`（默认禁用）
- Seccomp、`cap_drop=ALL`、`no-new-privileges`

## 安全
- 黑名单与 seccomp 拦截危险系统调用
- 只读容器、无主机挂载、隔离工作目录 `/work`

## 退出与监控
- 超时自动终止（默认 30 秒）
- 执行后返回 CPU/内存统计

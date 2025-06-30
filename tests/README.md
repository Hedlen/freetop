# 测试目录结构

本目录包含了项目的所有测试文件，按照测试类型进行分类管理。

## 目录结构

```
tests/
├── unit/           # 单元测试
├── integration/    # 集成测试
├── functional/     # 功能测试
├── e2e/           # 端到端测试
└── README.md      # 本文件
```

## 测试分类说明

### 单元测试 (unit/)
测试单个模块、函数或类的功能，不依赖外部系统。

**包含文件：**
- `test_user_service.py` - 用户服务单元测试
- `test_browser_config.py` - 浏览器配置单元测试
- `test_browser_settings_only.py` - 浏览器设置单元测试
- `test_fixes.py` - 修复效果验证测试

### 集成测试 (integration/)
测试多个模块之间的交互，可能涉及数据库、外部API等。

**包含文件：**
- `test_bash_tool.py` - Bash工具集成测试
- `test_config.py` - 配置集成测试
- `test_crawler.py` - 爬虫集成测试
- `test_python_repl_tool.py` - Python REPL工具集成测试
- `test_team_config.py` - 团队配置集成测试
- `test_template.py` - 模板集成测试
- `test_workflow.py` - 工作流集成测试
- `test_browser_integration.py` - 浏览器集成测试
- `test_browser_connectivity.py` - 浏览器连接测试
- `test_playwright_browser.py` - Playwright浏览器测试

### 功能测试 (functional/)
测试完整的业务功能，从用户角度验证系统行为。

**包含文件：**
- `test_api_headless.py` - API headless功能测试
- `test_gif_api.py` - GIF API功能测试
- `test_gif_paths.py` - GIF路径功能测试

### 端到端测试 (e2e/)
测试完整的用户场景，包括前端和后端的完整流程。

**包含文件：**
- `test_browser_events.html` - 浏览器事件端到端测试

## 运行测试

### 运行所有测试
```bash
python -m pytest tests/
```

### 运行特定类型的测试
```bash
# 单元测试
python -m pytest tests/unit/

# 集成测试
python -m pytest tests/integration/

# 功能测试
python -m pytest tests/functional/

# 端到端测试
python -m pytest tests/e2e/
```

### 运行特定测试文件
```bash
python -m pytest tests/unit/test_user_service.py
```

## 测试编写规范

1. **命名规范**：测试文件以 `test_` 开头，测试函数以 `test_` 开头
2. **文档字符串**：每个测试函数都应该有清晰的文档字符串说明测试目的
3. **断言**：使用清晰的断言消息，便于调试
4. **测试数据**：使用fixtures或测试数据文件管理测试数据
5. **清理**：确保测试后清理临时文件和状态

## 持续集成

测试会在以下情况自动运行：
- 提交代码到主分支
- 创建Pull Request
- 定期调度（每日构建）

## 测试覆盖率

生成测试覆盖率报告：
```bash
python -m pytest --cov=src tests/
```

生成HTML覆盖率报告：
```bash
python -m pytest --cov=src --cov-report=html tests/
```
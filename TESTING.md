# 测试指南

本文档介绍FreeTOP项目的测试体系和使用方法。

## 📁 测试目录结构

```
tests/
├── unit/           # 单元测试 - 测试单个模块、函数或类
├── integration/    # 集成测试 - 测试模块间交互
├── functional/     # 功能测试 - 测试完整业务功能
├── e2e/           # 端到端测试 - 测试完整用户场景
├── conftest.py    # 共享的测试配置和fixtures
├── __init__.py    # 测试包初始化
└── README.md      # 测试目录说明
```

## 🚀 快速开始

### 安装测试依赖

```bash
# 方法1: 使用测试脚本
python run_tests.py --install-deps

# 方法2: 直接安装
pip install pytest pytest-cov pytest-html pytest-xdist

# 方法3: 使用Makefile（如果支持）
make install-test-deps
```

### 运行测试

```bash
# 运行所有测试
python run_tests.py

# 或使用pytest直接运行
pytest tests/

# 或使用Makefile
make test
```

## 🧪 测试类型详解

### 单元测试 (Unit Tests)

**目的**: 测试单个模块、函数或类的功能，不依赖外部系统。

**特点**:
- 运行速度快
- 隔离性强
- 易于调试
- 覆盖率高

**运行方式**:
```bash
python run_tests.py --type unit
# 或
pytest tests/unit/
# 或
make test-unit
```

**包含测试**:
- `test_user_service.py` - 用户服务单元测试
- `test_browser_config.py` - 浏览器配置单元测试
- `test_browser_settings_only.py` - 浏览器设置单元测试
- `test_fixes.py` - 修复效果验证测试

### 集成测试 (Integration Tests)

**目的**: 测试多个模块之间的交互，可能涉及数据库、外部API等。

**特点**:
- 测试模块间协作
- 可能需要外部依赖
- 运行时间较长
- 发现接口问题

**运行方式**:
```bash
python run_tests.py --type integration
# 或
pytest tests/integration/
# 或
make test-integration
```

**包含测试**:
- `test_browser_integration.py` - 浏览器集成测试
- `test_browser_connectivity.py` - 浏览器连接测试
- `test_playwright_browser.py` - Playwright浏览器测试
- `test_crawler.py` - 爬虫集成测试
- 等等...

### 功能测试 (Functional Tests)

**目的**: 测试完整的业务功能，从用户角度验证系统行为。

**特点**:
- 业务场景导向
- 端到端流程
- 用户视角
- 验证需求实现

**运行方式**:
```bash
python run_tests.py --type functional
# 或
pytest tests/functional/
# 或
make test-functional
```

**包含测试**:
- `test_api_headless.py` - API headless功能测试
- `test_gif_api.py` - GIF API功能测试
- `test_gif_paths.py` - GIF路径功能测试

### 端到端测试 (E2E Tests)

**目的**: 测试完整的用户场景，包括前端和后端的完整流程。

**特点**:
- 完整用户流程
- 真实环境模拟
- 最高置信度
- 运行时间最长

**运行方式**:
```bash
python run_tests.py --type e2e
# 或
pytest tests/e2e/
# 或
make test-e2e
```

**包含测试**:
- `test_browser_events.html` - 浏览器事件端到端测试

## 📊 测试覆盖率

### 生成覆盖率报告

```bash
# 终端覆盖率报告
python run_tests.py --coverage

# HTML覆盖率报告
python run_tests.py --html-coverage

# 使用Makefile
make test-coverage
make test-html
```

### 查看HTML报告

生成HTML报告后，打开 `htmlcov/index.html` 文件查看详细的覆盖率信息。

## 🏷️ 测试标记

项目使用pytest标记来分类和过滤测试：

```bash
# 跳过慢速测试
python run_tests.py --markers "not slow"

# 只运行浏览器相关测试
python run_tests.py --markers "browser"

# 只运行数据库相关测试
python run_tests.py --markers "database"

# 只运行网络相关测试
python run_tests.py --markers "network"
```

**可用标记**:
- `unit` - 单元测试
- `integration` - 集成测试
- `functional` - 功能测试
- `e2e` - 端到端测试
- `slow` - 运行时间较长的测试
- `browser` - 需要浏览器的测试
- `database` - 需要数据库的测试
- `network` - 需要网络连接的测试

## 🛠️ 测试工具和配置

### pytest配置

项目使用 `pytest.ini` 文件配置pytest行为：
- 测试发现规则
- 输出格式
- 标记定义
- 警告过滤

### 共享Fixtures

`tests/conftest.py` 提供了共享的测试fixtures：
- `project_root` - 项目根目录
- `temp_dir` - 临时目录
- `mock_env_vars` - 模拟环境变量
- `mock_request_headers` - 模拟请求头
- `mock_user_settings` - 模拟用户设置
- `mock_jwt_tokens` - 模拟JWT tokens

### 测试运行脚本

`run_tests.py` 提供了便捷的测试执行接口：

```bash
# 查看所有选项
python run_tests.py --help

# 常用命令
python run_tests.py --type unit --verbose
python run_tests.py --coverage
python run_tests.py --file tests/unit/test_user_service.py
```

## 📝 编写测试的最佳实践

### 1. 命名规范

- 测试文件: `test_*.py`
- 测试类: `Test*`
- 测试函数: `test_*`

### 2. 测试结构

```python
def test_function_name():
    """测试描述：说明测试的目的和预期结果"""
    # Arrange - 准备测试数据
    input_data = "test_input"
    expected_result = "expected_output"
    
    # Act - 执行被测试的功能
    actual_result = function_under_test(input_data)
    
    # Assert - 验证结果
    assert actual_result == expected_result
```

### 3. 使用Fixtures

```python
def test_with_fixture(mock_user_settings, temp_dir):
    """使用fixtures的测试示例"""
    # 使用预定义的mock数据和临时目录
    user_id = "test_user_1"
    settings = mock_user_settings[user_id]
    
    # 测试逻辑...
```

### 4. 参数化测试

```python
import pytest

@pytest.mark.parametrize("input_val,expected", [
    ("desktop", False),
    ("mobile", True),
    ("tablet", True),
])
def test_is_mobile_device(input_val, expected):
    """参数化测试移动设备检测"""
    result = is_mobile_device(input_val)
    assert result == expected
```

### 5. 异常测试

```python
def test_function_raises_exception():
    """测试异常情况"""
    with pytest.raises(ValueError, match="Invalid input"):
        function_that_should_raise("invalid_input")
```

## 🔄 持续集成

### GitHub Actions

项目配置了GitHub Actions来自动运行测试：

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: 3.9
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          python run_tests.py --install-deps
      - name: Run tests
        run: python run_tests.py --coverage
```

### 本地CI模拟

```bash
# 模拟CI环境运行测试
python run_tests.py --type all --coverage --verbose

# 或使用Makefile
make test-ci
```

## 🐛 调试测试

### 运行单个测试

```bash
# 运行特定测试文件
pytest tests/unit/test_user_service.py

# 运行特定测试函数
pytest tests/unit/test_user_service.py::test_get_user_settings

# 运行特定测试类
pytest tests/unit/test_user_service.py::TestUserService
```

### 调试模式

```bash
# 详细输出
pytest -v tests/unit/test_user_service.py

# 显示print输出
pytest -s tests/unit/test_user_service.py

# 在第一个失败时停止
pytest -x tests/

# 显示最慢的10个测试
pytest --durations=10 tests/
```

### 使用pdb调试

```python
def test_debug_example():
    """调试示例"""
    import pdb; pdb.set_trace()  # 设置断点
    # 测试代码...
```

```bash
# 运行时自动进入pdb
pytest --pdb tests/unit/test_user_service.py
```

## 📈 性能测试

### 基准测试

```python
import pytest

@pytest.mark.slow
def test_performance_benchmark():
    """性能基准测试"""
    import time
    start_time = time.time()
    
    # 执行性能测试的代码
    result = expensive_operation()
    
    end_time = time.time()
    execution_time = end_time - start_time
    
    # 断言执行时间在可接受范围内
    assert execution_time < 1.0  # 1秒内完成
    assert result is not None
```

### 内存使用测试

```python
import psutil
import os

def test_memory_usage():
    """内存使用测试"""
    process = psutil.Process(os.getpid())
    initial_memory = process.memory_info().rss
    
    # 执行可能消耗大量内存的操作
    large_data = create_large_dataset()
    
    final_memory = process.memory_info().rss
    memory_increase = final_memory - initial_memory
    
    # 断言内存增长在可接受范围内
    assert memory_increase < 100 * 1024 * 1024  # 100MB
```

## 🔧 故障排除

### 常见问题

1. **导入错误**
   ```
   ModuleNotFoundError: No module named 'src'
   ```
   解决方案：确保在项目根目录运行测试，或检查`conftest.py`中的路径配置。

2. **数据库连接错误**
   ```
   sqlalchemy.exc.OperationalError: (sqlite3.OperationalError) no such table
   ```
   解决方案：确保测试数据库已初始化，或使用内存数据库进行测试。

3. **浏览器驱动问题**
   ```
   selenium.common.exceptions.WebDriverException: 'chromedriver' executable needs to be in PATH
   ```
   解决方案：安装并配置浏览器驱动，或使用headless模式。

### 清理测试环境

```bash
# 清理测试生成的文件
make clean-test

# 或手动清理
rm -rf htmlcov/
rm -f .coverage
rm -rf .pytest_cache/
find . -name "__pycache__" -type d -exec rm -rf {} +
```

## 📚 参考资源

- [pytest官方文档](https://docs.pytest.org/)
- [pytest-cov覆盖率插件](https://pytest-cov.readthedocs.io/)
- [Python测试最佳实践](https://docs.python-guide.org/writing/tests/)
- [测试驱动开发(TDD)](https://en.wikipedia.org/wiki/Test-driven_development)

## 🤝 贡献测试

如果你想为项目贡献测试代码：

1. 确保新功能有对应的测试
2. 保持测试覆盖率不下降
3. 遵循项目的测试规范
4. 运行完整测试套件确保没有破坏现有功能
5. 在PR中说明测试策略和覆盖的场景

```bash
# 提交前运行完整测试
python run_tests.py --coverage
```
# FreeTop

<div align="center">

![FreeTop Demo](assets/demo.gif)

**🚀 基于LangManus的增强型多代理AI自动化框架**

*站在巨人的肩膀上，打造更强大、更可靠的AI代理协作平台*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![Code style: black](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)
[![Tests](https://img.shields.io/badge/tests-4%20tier%20system-green.svg)](tests/)
[![Coverage](https://img.shields.io/badge/coverage-comprehensive-brightgreen.svg)](TESTING.md)

[English](README.md) | 中文

</div>

## 🙏 致敬LangManus

**FreeTop诞生于对[LangManus](https://github.com/langmanus/langmanus)的深度学习和改进。** 我们深深感谢LangManus团队创造的卓越多代理AI框架，为我们提供了坚实的技术基础和创新灵感。

在LangManus优秀架构的基础上，FreeTop专注于：
- 🧪 **生产级测试系统** - 4层测试架构确保代码质量
- 🔧 **增强的可靠性** - 改进的错误处理和恢复机制
- 📊 **优化的开发体验** - 更好的工具链和文档
- ⚙️ **灵活的配置管理** - 基于YAML的配置系统
- 🚀 **部署就绪** - 优化的Docker和生产环境配置

**我们相信开源协作的力量，致力于回馈社区，推动AI自动化技术的发展。**

> 源于开源，回馈开源

## 🌟 项目声明

**FreeTop** 是基于优秀开源项目LangManus构建的增强型多代理AI自动化框架。我们在LangManus坚实基础上，专注于提升系统的可靠性、可测试性和生产就绪性，旨在为开发者和企业提供更强大、更稳定的AI代理协作解决方案。

### 🎯 核心理念
- **站在巨人的肩膀上**：基于LangManus的优秀架构进行创新
- **生产级质量**：通过全面测试和优化确保系统稳定性
- **开发者友好**：提供更好的工具链和开发体验
- **社区驱动**：回馈开源社区，推动技术发展

FreeTop 是一个社区驱动的 AI 自动化框架，它建立在开源社区的卓越工作基础之上。我们的目标是将语言模型与专业工具（如网络搜索、爬虫和 Python 代码执行）相结合，同时回馈让这一切成为可能的社区。

## 演示视频

**Task**: Calculate the influence index of DeepSeek R1 on HuggingFace. This index can be designed by considering a weighted sum of factors such as followers, downloads, and likes.

**LangManus的全自动计划与解决方案**:

1. **收集最新信息**  
   通过在线搜索获取关于"DeepSeek R1"、"HuggingFace"以及相关主题的最新信息。

2. **访问HuggingFace官网**  
   使用 Chromium 实例访问 HuggingFace 的官方网站，搜索"DeepSeek R1"，并检索最新数据，包括关注者数量、点赞数、下载量及其他相关指标。

3. **查找模型影响力计算公式**  
   使用搜索引擎和网页抓取技术，寻找计算模型影响力的相关公式或方法。

4. **使用Python计算影响力指数**  
   基于收集到的数据，使用Python编程计算DeepSeek R1的影响力指数。

5. **生成综合报告**  
   将分析结果整理成一份全面的报告并呈现给用户。

![Demo](./assets/demo.gif)

- [在 YouTube 上观看](https://youtu.be/sZCHqrQBUGk)
- 中文自媒体报道
    - 01Coder - Manus 开源平替 - LangManus（LangChain力荐）
        - [YouTube](https://www.youtube.com/watch?v=XzCmPOfd0D0&lc=UgyNFuKmya8R6rVm_l94AaABAg&ab_channel=01Coder)
        - [B站](https://www.bilibili.com/video/BV1SeXqYfEop/)

## 📋 目录

- [🙏 致敬LangManus](#-致敬langmanus)
- [🌟 项目声明](#-项目声明)
- [📋 目录](#-目录)
- [🚀 快速开始](#-快速开始)
- [🏗️ 架构](#️-架构)
- [✨ 功能特性](#-功能特性)
- [🤔 为什么选择FreeTop？](#-为什么选择freetop)
- [🛠️ 安装](#️-安装)
- [⚙️ 配置](#️-配置)
- [📖 使用指南](#-使用指南)
- [🐳 Docker部署](#-docker部署)
- [🌐 Web界面](#-web界面)
- [🧪 开发](#-开发)
- [❓ 常见问题](#-常见问题)
- [🤝 贡献](#-贡献)
- [📄 许可证](#-许可证)
- [🙏 致谢](#-致谢)

## 🚀 快速开始

```bash
# 克隆仓库
git clone https://github.com/your-org/freetop.git
cd freetop

# 使用uv安装依赖（推荐）
uv sync

# 安装Playwright浏览器（用于浏览器自动化）
uv run playwright install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入你的 API 密钥

# 运行测试确保环境正常
python run_tests.py --type unit

# 启动FreeTop
uv run main.py
```

### 🎯 5分钟体验

1. **环境准备**：确保Python 3.8+和uv已安装
2. **快速安装**：运行上述命令
3. **配置API**：在`.env`文件中设置LLM API密钥
4. **开始使用**：运行`uv run main.py`开始您的AI自动化之旅

> 💡 **提示**：首次运行建议先执行测试，确保所有组件正常工作

## 项目声明

本项目是一个学术驱动的开源项目，由一群前同事在业余时间开发，旨在探索和交流 Multi-Agent 和 DeepResearch 相关领域的技术。

- **项目目的**：本项目的主要目的是学术研究、参与 GAIA 排行榜，并计划在未来发表相关论文。
- **独立性声明**：本项目完全独立，与我们的本职工作无关，不代表我们所在公司或任何组织的立场或观点。
- **无关联声明**：本项目与 Manus（无论是公司、组织还是其他实体）无任何关联。
- **澄清声明**：我们未在任何社交媒体平台上宣传过本项目，任何与本项目相关的不实报道均与本项目的学术精神无关。
- **贡献管理**：Issue 和 PR 将在我们空闲时间处理，可能存在延迟，敬请谅解。
- **免责声明**：本项目基于 MIT 协议开源，使用者需自行承担使用风险。我们对因使用本项目产生的任何直接或间接后果不承担责任。

## 🏗️ 架构

### FreeTop分层多代理架构

FreeTop在LangManus优秀架构基础上，实现了更加稳定和可靠的分层多代理系统：

![FreeTop 架构](./assets/architecture.png)

### 🤖 核心代理系统

FreeTop的代理系统经过优化，具备更强的协作能力和错误恢复机制：

1. **🎯 协调员（Coordinator）**
   - 工作流程的智能入口点
   - 增强的任务路由和负载均衡
   - 改进的错误处理和恢复机制

2. **📋 规划员（Planner）**
   - 智能任务分析和策略制定
   - 优化的执行计划生成
   - 动态计划调整能力

3. **👨‍💼 主管（Supervisor）**
   - 全面的代理监督和管理
   - 实时状态监控和性能优化
   - 智能资源分配和调度

4. **🔍 研究员（Researcher）**
   - 高效的信息收集和分析
   - 增强的搜索策略和内容提取
   - 智能信息过滤和整合

5. **💻 程序员（Coder）**
   - 强大的代码生成和修改能力
   - 集成的Python REPL环境
   - 代码质量检查和优化

6. **🌐 浏览器（Browser）**
   - 可靠的网页浏览和信息检索
   - 增强的Playwright集成
   - 智能页面解析和数据提取

7. **📊 汇报员（Reporter）**
   - 专业的报告生成和总结
   - 多格式输出支持
   - 智能内容组织和呈现

### 🔧 架构增强

FreeTop相比LangManus的关键改进：

- **🛡️ 增强的代理通信**：更稳定的消息传递和状态同步
- **🔄 强大的错误处理**：智能错误恢复和重试机制
- **📈 高级监控**：实时性能监控和资源使用跟踪
- **🧪 全面测试**：4层测试体系确保系统可靠性
- **⚙️ 灵活配置**：基于YAML的配置管理系统

## ✨ 功能特性

### 🚀 高级LLM集成

FreeTop提供业界领先的三层LLM系统，智能分配任务以优化性能和成本：

- 🧠 **推理LLM**：处理复杂逻辑和决策任务
- 🔧 **基础LLM**：执行标准操作和通用任务
- 👁️ **视觉LLM**：处理图像分析和视觉理解

**技术特性：**
- 支持通过[litellm](https://docs.litellm.ai/docs/providers)接入主流模型
- 智能模型选择和负载均衡
- OpenAI兼容的API接口
- 支持Qwen、GPT、Claude等多种模型

### 🔍 增强的工具和集成

FreeTop在LangManus基础上大幅提升了工具集成能力：

- **🌐 改进的搜索能力**
  - 增强的Tavily API集成
  - 优化的Jina神经搜索
  - 智能内容提取和过滤
  - 多源信息聚合

- **🤖 强大的浏览器自动化**
  - 稳定的Playwright集成
  - 智能页面解析
  - 自动化表单填写和交互
  - 截图和视觉验证

### 🧪 增强的开发特性

FreeTop为开发者提供了生产级的开发体验：

- **🐍 高级Python集成**
  - 增强的Python REPL环境
  - 安全的代码执行沙箱
  - 智能代码补全和错误检查
  - 使用uv进行快速包管理

- **🧪 全面的4层测试系统**
  - **单元测试**：测试独立模块和函数
  - **集成测试**：测试模块间交互
  - **功能测试**：测试完整业务功能
  - **端到端测试**：测试完整用户场景

### 📊 增强的工作流管理

FreeTop提供更强大的工作流控制和监控能力：

- **🎯 高级可视化和控制**
  - 实时工作流程图可视化
  - 智能多代理编排
  - 动态任务分配和优化
  - 性能监控和资源管理

- **⚙️ 灵活的配置和部署**
  - 基于YAML的配置管理
  - 环境变量支持
  - Docker容器化部署
  - 生产环境优化

## 🤔 为什么选择FreeTop？

### 🏗️ 基于LangManus卓越基础，增强生产就绪性

FreeTop不是重新发明轮子，而是站在LangManus这个巨人的肩膀上，专注于解决生产环境中的实际挑战：

**🎯 LangManus的卓越基础**
- ✅ 创新的多代理架构设计
- ✅ 优秀的LLM集成框架
- ✅ 强大的工具生态系统
- ✅ 清晰的代码架构

**🚀 FreeTop的生产级增强**
- 🧪 **全面测试覆盖**：4层测试体系确保代码质量
- 🔧 **增强配置管理**：灵活的YAML配置系统
- 🛡️ **提升系统可靠性**：改进的错误处理和恢复机制
- 📊 **优化监控能力**：实时性能监控和资源管理
- 👨‍💻 **改善开发体验**：更好的工具链和文档
- 🚀 **部署就绪**：优化的Docker和生产环境配置

### 🌟 相比LangManus的关键优势

| 特性 | LangManus | FreeTop |
|------|-----------|----------|
| 🧪 测试系统 | 基础测试 | 4层测试体系 |
| ⚙️ 配置管理 | 环境变量 | YAML + 环境变量 |
| 🛡️ 错误处理 | 标准处理 | 增强恢复机制 |
| 📊 监控能力 | 基础日志 | 实时性能监控 |
| 👨‍💻 开发体验 | 良好 | 优化工具链 |
| 🚀 部署就绪 | 开发环境 | 生产级配置 |

### 🤝 站在巨人的肩膀上

我们深深感谢整个开源生态系统的贡献：

- **[LangManus](https://github.com/langmanus/langmanus)**：我们的主要灵感和基础
- **[Qwen](https://github.com/QwenLM/Qwen)**：优秀的开源语言模型
- **[Tavily](https://tavily.com/)**：强大的搜索能力
- **[Jina](https://jina.ai/)**：先进的内容处理技术
- **[Browser-use](https://pypi.org/project/browser-use/)**：可靠的浏览器控制
- **[Playwright](https://playwright.dev/)**：现代化的Web自动化

### 🎯 我们的使命

**让AI自动化技术真正走向生产环境**

我们相信开源协作的力量，致力于：
- 🔄 **回馈社区**：将改进贡献回开源生态
- 📚 **知识分享**：提供详细文档和最佳实践
- 🤝 **协作发展**：与LangManus和其他项目保持良好合作
- 🚀 **推动创新**：探索AI自动化的新可能性

## 🛠️ 安装

### 📋 前置要求

- **Python 3.8+**：推荐使用Python 3.10或更高版本
- **[uv](https://github.com/astral-sh/uv)**：现代化的Python包管理器
- **Git**：用于克隆仓库

### 🚀 快速安装

#### 方法一：使用uv（推荐）

```bash
# 1. 克隆FreeTop仓库
git clone https://github.com/your-org/freetop.git
cd freetop

# 2. 使用uv安装Python和创建虚拟环境
uv python install 3.10
uv venv --python 3.10

# 3. 激活虚拟环境
# Unix/macOS:
source .venv/bin/activate
# Windows:
.venv\Scripts\activate

# 4. 安装项目依赖
uv sync

# 5. 安装Playwright浏览器
uv run playwright install
```

#### 方法二：使用传统pip

```bash
# 1. 克隆仓库
git clone https://github.com/your-org/freetop.git
cd freetop

# 2. 创建虚拟环境
python -m venv .venv

# 3. 激活虚拟环境
# Unix/macOS:
source .venv/bin/activate
# Windows:
.venv\Scripts\activate

# 4. 安装依赖
pip install -r requirements.txt

# 5. 安装Playwright
playwright install
```

### ✅ 验证安装

```bash
# 运行单元测试验证安装
python run_tests.py --type unit

# 检查系统状态
python -c "import src; print('FreeTop安装成功！')"
```

## ⚙️ 配置

### 🧠 FreeTop增强的三层LLM系统

FreeTop在LangManus基础上优化了三层LLM架构，实现智能任务分配和成本优化：

- **🧠 推理LLM**：处理复杂逻辑推理和决策制定
- **🔧 基础LLM**：执行标准操作和通用任务
- **👁️ 视觉LLM**：处理图像分析和视觉理解任务

### 📝 配置方法

#### 方法一：YAML配置（推荐）

```bash
# 复制配置模板
cp conf.yaml.example conf.yaml
```

```yaml
# 启用YAML配置模式
USE_CONF: true

# 三层LLM配置
# 遵循litellm配置参数: https://docs.litellm.ai/docs/providers

# 推理LLM - 用于复杂逻辑和决策
REASONING_MODEL:
  model: "qwen/qwen-max"  # 或其他高性能模型
  api_key: $REASONING_API_KEY
  api_base: $REASONING_BASE_URL
  temperature: 0.1  # 低温度确保推理准确性

# 基础LLM - 用于标准任务
BASIC_MODEL:
  model: "azure/gpt-4o-2024-08-06"
  api_base: $AZURE_API_BASE
  api_version: $AZURE_API_VERSION
  api_key: $AZURE_API_KEY
  temperature: 0.3

# 视觉LLM - 用于图像处理
VISION_MODEL:
  model: "azure/gpt-4o-2024-08-06"
  api_base: $AZURE_API_BASE
  api_version: $AZURE_API_VERSION
  api_key: $AZURE_API_KEY
  temperature: 0.2

# FreeTop增强配置
FREETOP_CONFIG:
  # 启用智能模型选择
  smart_model_selection: true
  # 启用性能监控
  enable_monitoring: true
  # 测试模式
  test_mode: false
```

您可以在项目根目录创建 .env 文件并配置以下环境变量，您可以复制 .env.example 文件作为模板开始：
```bash
cp .env.example .env
````
```ini
# 工具 API 密钥
TAVILY_API_KEY=your_tavily_api_key
JINA_API_KEY=your_jina_api_key  # 可选

# 浏览器配置
CHROME_INSTANCE_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome  # 可选，Chrome 可执行文件路径
CHROME_HEADLESS=False  # 可选，默认是 False
CHROME_PROXY_SERVER=http://127.0.0.1:10809  # 可选，默认是 None
CHROME_PROXY_USERNAME=  # 可选，默认是 None
CHROME_PROXY_PASSWORD=  # 可选，默认是 None
```


> **注意：**
>
> - 系统对不同类型的任务使用不同的模型：
>     - 推理 LLM 用于复杂的决策和分析
>     - 基础 LLM 用于简单的文本任务
>     - 视觉语言 LLM 用于涉及图像理解的任务
> - 所有 LLM 的配置可以独立自定义
> - Jina API 密钥是可选的，提供自己的密钥可以获得更高的速率限制（你可以在 [jina.ai](https://jina.ai/) 获该密钥）
> - Tavily 搜索默认配置为最多返回 5 个结果（你可以在 [app.tavily.com](https://app.tavily.com/) 获取该密钥）


### 配置预提交钩子

LangManus 包含一个预提交钩子，在每次提交前运行代码检查和格式化。设置步骤：

1. 使预提交脚本可执行：

```bash
chmod +x pre-commit
```

2. 安装预提交钩子：

```bash
ln -s ../../pre-commit .git/hooks/pre-commit
```

预提交钩子将自动：

- 运行代码检查（`make lint`）
- 运行代码格式化（`make format`）
- 将任何重新格式化的文件添加回暂存区
- 如果有任何代码检查或格式化错误，阻止提交

## 使用方法

### 基本执行

使用默认设置运行 LangManus：

```bash
uv run main.py
```

### API 服务器

LangManus 提供基于 FastAPI 的 API 服务器，支持流式响应：

```bash
# 启动 API 服务器
make serve

# 或直接运行
uv run server.py
```

API 服务器提供以下端点：

- `POST /api/chat/stream`：用于 LangGraph 调用的聊天端点，流式响应
    - 请求体：
  ```json
  {
    "messages": [{ "role": "user", "content": "在此输入您的查询" }],
    "debug": false
  }
  ```
    - 返回包含智能体响应的服务器发送事件（SSE）流

### 高级配置

LangManus 可以通过 `src/config` 目录中的各种配置文件进行自定义：

- `env.py`：配置 LLM 模型、API 密钥和基础 URL
- `tools.py`：调整工具特定设置（如 Tavily 搜索结果限制）
- `agents.py`：修改团队组成和智能体系统提示

### 智能体提示系统

LangManus 在 `src/prompts` 目录中使用复杂的提示系统来定义智能体的行为和职责：

#### 核心智能体角色

- **主管（[`src/prompts/supervisor.md`](src/prompts/supervisor.md)）**：通过分析请求并确定由哪个专家处理来协调团队并分配任务。负责决定任务完成情况和工作流转换。

- **研究员（[`src/prompts/researcher.md`](src/prompts/researcher.md)）**：专门通过网络搜索和数据收集来收集信息。使用 Tavily 搜索和网络爬取功能，避免数学计算或文件操作。

- **程序员（[`src/prompts/coder.md`](src/prompts/coder.md)）**：专业软件工程师角色，专注于 Python 和 bash 脚本。处理：

    - Python 代码执行和分析
    - Shell 命令执行
    - 技术问题解决和实现

- **文件管理员（[`src/prompts/file_manager.md`](src/prompts/file_manager.md)）**：处理所有文件系统操作，重点是正确格式化和保存 markdown 格式的内容。

- **浏览器（[`src/prompts/browser.md`](src/prompts/browser.md)）**：网络交互专家，处理：
    - 网站导航
    - 页面交互（点击、输入、滚动）
    - 从网页提取内容

#### 提示系统架构

提示系统使用模板引擎（[`src/prompts/template.py`](src/prompts/template.py)）来：

- 加载特定角色的 markdown 模板
- 处理变量替换（如当前时间、团队成员信息）
- 为每个智能体格式化系统提示

每个智能体的提示都在单独的 markdown 文件中定义，这样无需更改底层代码就可以轻松修改行为和职责。

## Docker

LangManus 可以运行在 Docker 容器中。默认情况下，API 服务器在端口 8000 上运行。

```bash
docker build -t langmanus .
docker run --name langmanus -d --env-file .env -e CHROME_HEADLESS=True -p 8000:8000 langmanus
```

你也可以直接用 Docker 运行 CLI：

```bash
docker build -t langmanus .
docker run --rm -it --env-file .env -e CHROME_HEADLESS=True langmanus uv run python main.py
```

## 网页界面

LangManus 提供一个默认的网页界面。

请参考 [langmanus/langmanus-web](https://github.com/langmanus/langmanus-web) 项目了解更多信息。

## Docker Compose (包括前后端)

LangManus 提供了 docker-compose 设置，可以轻松地同时运行后端和前端：

```bash
# 启动后端和前端
docker-compose up -d

# 后端将在 http://localhost:8000 可用
# 前端将在 http://localhost:3000 可用，可以通过浏览器访问
```

这将：
1. 构建并启动 LangManus 后端容器
2. 构建并启动 LangManus Web UI 容器
3. 使用共享网络连接它们

在启动服务之前，请确保已准备好包含必要 API 密钥的 `.env` 文件。

## 开发

### 测试

运行测试套件：

```bash
# 运行所有测试
make test

# 运行特定测试文件
pytest tests/integration/test_workflow.py

# 运行覆盖率测试
make coverage
```

### 代码质量

```bash
# 运行代码检查
make lint

# 格式化代码
make format
```

## FAQ

请参考 [FAQ.md](docs/FAQ_zh.md) 了解更多信息。

## 贡献

我们欢迎各种形式的贡献！无论是修复错别字、改进文档，还是添加新功能，您的帮助都将备受感激。请查看我们的[贡献指南](CONTRIBUTING.md)了解如何开始。

## 许可证

本项目是开源的，基于 [MIT 许可证](LICENSE)。

## Star 趋势

[![Star History Chart](https://api.star-history.com/svg?repos=langmanus/langmanus&type=Date)](https://www.star-history.com/#langmanus/langmanus&Date)

## 致谢

特别感谢所有让 LangManus 成为可能的开源项目和贡献者。我们站在巨人的肩膀上。

我们特别要感谢以下项目：
- [LangChain](https://github.com/langchain-ai/langchain)：为我们提供了出色的框架，支撑着我们的 LLM 交互和链式操作
- [LangGraph](https://github.com/langchain-ai/langgraph)：为我们的复杂多智能体编排提供支持
- [Browser-use](https://pypi.org/project/browser-use/)：提供浏览器控制能力

这些优秀的项目构成了 LangManus 的基石，展现了开源协作的力量。

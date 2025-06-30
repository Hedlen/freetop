# 🦜🤖 FreeTop

[![Python 3.12+](https://img.shields.io/badge/python-3.12+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![WeChat](https://img.shields.io/badge/WeChat-FreeTop-brightgreen?logo=wechat&logoColor=white)](./assets/wechat_community.jpg)
[![Discord Follow](https://dcbadge.vercel.app/api/server/m3MszDcn?style=flat)](https://discord.gg/m3MszDcn)

[English](./README.md) | [简体中文](./README_zh.md)

> Inspired by LangManus, Built for Freedom

**FreeTop** is an enhanced AI automation framework inspired by the excellent work of [LangManus](https://github.com/langmanus/langmanus). Building upon LangManus's solid foundation, we've developed FreeTop with significant improvements in architecture, testing, and development experience. Our goal is to provide a more robust, maintainable, and developer-friendly multi-agent system for complex AI automation tasks.

## 🙏 Acknowledgments to LangManus

FreeTop is built upon the incredible foundation provided by [LangManus](https://github.com/langmanus/langmanus). We deeply appreciate the LangManus team's pioneering work in multi-agent AI automation. Their innovative approach to combining language models with specialized tools has inspired our development of FreeTop.

**Key inspirations from LangManus:**
- Multi-agent orchestration architecture
- LLM integration patterns
- Tool-based automation approach
- Open source collaboration spirit

## Demo

**Task**: Calculate the influence index of DeepSeek R1 on HuggingFace. This index can be designed using a weighted sum of factors such as followers, downloads, and likes.

**FreeTop's Fully Automated Plan and Solution**:
1. Gather the latest information about "DeepSeek R1", "HuggingFace", and related topics through online searches.
2. Interact with a Chromium instance to visit the HuggingFace official website, search for "DeepSeek R1" and retrieve the latest data, including followers, likes, downloads, and other relevant metrics.
3. Find formulas for calculating model influence using search engines and web scraping.
4. Use Python to compute the influence index of DeepSeek R1 based on the collected data.
5. Present a comprehensive report to the user.

![Demo](./assets/demo.gif)

- [View on YouTube](https://youtu.be/sZCHqrQBUGk)

## Table of Contents

- [🦜🤖 FreeTop](#-freetop)
  - [🙏 Acknowledgments to LangManus](#-acknowledgments-to-langmanus)
  - [Demo](#demo)
  - [Table of Contents](#table-of-contents)
  - [Quick Start](#quick-start)
  - [Project Statement](#project-statement)
  - [项目声明](#项目声明)
  - [Architecture](#architecture)
    - [Enhanced Multi-Agent System](#enhanced-multi-agent-system)
    - [Key Architectural Improvements](#key-architectural-improvements)
  - [Features](#features)
    - [🚀 Enhanced Core Capabilities](#-enhanced-core-capabilities)
    - [🔧 Enhanced Tools and Integrations](#-enhanced-tools-and-integrations)
    - [🛠️ Enhanced Development Features](#️-enhanced-development-features)
    - [📊 Enhanced Workflow Management](#-enhanced-workflow-management)
    - [⚙️ Improved Configuration and Deployment](#️-improved-configuration-and-deployment)
  - [Why Choose FreeTop?](#why-choose-freetop)
    - [🌟 Built on LangManus Excellence, Enhanced for Production](#-built-on-langmanus-excellence-enhanced-for-production)
    - [🚀 Key Advantages Over LangManus](#-key-advantages-over-langmanus)
    - [🤝 Standing on the Shoulders of Giants](#-standing-on-the-shoulders-of-giants)
    - [🎯 Our Mission](#-our-mission)
  - [Setup](#setup)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
    - [Configuration](#configuration)
    - [Configure Pre-commit Hook](#configure-pre-commit-hook)
  - [Usage](#usage)
    - [Basic Execution](#basic-execution)
    - [API Server](#api-server)
    - [Advanced Configuration](#advanced-configuration)
    - [Agent Prompts System](#agent-prompts-system)
      - [Core Agent Roles](#core-agent-roles)
      - [Prompt System Architecture](#prompt-system-architecture)
  - [Docker](#docker)
  - [Web UI](#web-ui)
  - [Docker Compose (include both backend and frontend)](#docker-compose-include-both-backend-and-frontend)
  - [Development](#development)
    - [🧪 Comprehensive Testing System](#-comprehensive-testing-system)
      - [Test Structure](#test-structure)
    - [🔧 Code Quality](#-code-quality)
    - [📊 Development Tools](#-development-tools)
  - [FAQ](#faq)
  - [Contributing](#contributing)
  - [License](#license)
  - [Star History](#star-history)
  - [Acknowledgments](#acknowledgments)
    - [🙏 Deep Gratitude to LangManus](#-deep-gratitude-to-langmanus)
    - [🌟 Standing on the Shoulders of Giants](#-standing-on-the-shoulders-of-giants-1)
    - [🚀 Our Contribution](#-our-contribution)

## Quick Start

```bash
# Clone the repository
git clone https://github.com/Hedlen/freetop.git
cd freetop

# Install dependencies, uv will take care of the python interpreter and venv creation
uv sync

# Playwright install to use Chromium for browser-use by default
uv run playwright install

# Configure environment
# Windows: copy .env.example .env
cp .env.example .env
# Edit .env with your API keys

# Run the project
uv run main.py
```

## Project Statement

This is an academically driven open-source project, developed by a group of former colleagues in our spare time. It aims to explore and exchange ideas in the fields of Multi-Agent and DeepResearch.

- **Purpose**: The primary purpose of this project is academic research, participation in the GAIA leaderboard, and the future publication of related papers.
- **Independence Statement**: This project is entirely independent and unrelated to our primary job responsibilities. It does not represent the views or positions of our employers or any organizations.
- **No Association**: This project has no association with Manus (whether it refers to a company, organization, or any other entity).
- **Clarification Statement**: We have not promoted this project on any social media platforms. Any inaccurate reports related to this project are not aligned with its academic spirit.
- **Contribution Management**: Issues and PRs will be addressed during our free time and may experience delays. We appreciate your understanding.
- **Disclaimer**: This project is open-sourced under the MIT License. Users assume all risks associated with its use. We disclaim any responsibility for any direct or indirect consequences arising from the use of this project.

## 项目声明

本项目是一个学术驱动的开源项目，由一群前同事在业余时间开发，旨在探索和交流 Multi-Agent 和 DeepResearch 相关领域的技术。

- **项目目的**：本项目的主要目的是学术研究、参与 GAIA 排行榜，并计划在未来发表相关论文。
- **独立性声明**：本项目完全独立，与我们的本职工作无关，不代表我们所在公司或任何组织的立场或观点。
- **无关联声明**：本项目与 Manus（无论是公司、组织还是其他实体）无任何关联。
- **澄清声明**：我们未在任何社交媒体平台上宣传过本项目，任何与本项目相关的不实报道均与本项目的学术精神无关。
- **贡献管理**：Issue 和 PR 将在我们空闲时间处理，可能存在延迟，敬请谅解。
- **免责声明**：本项目基于 MIT 协议开源，使用者需自行承担使用风险。我们对因使用本项目产生的任何直接或间接后果不承担责任。

## Architecture

FreeTop implements an enhanced hierarchical multi-agent system inspired by LangManus, with significant improvements in agent coordination, task delegation, and system reliability:

![FreeTop Architecture](./assets/architecture.png)

### Enhanced Multi-Agent System

Building upon LangManus's foundation, FreeTop features a refined agent architecture:

1. **Coordinator** - Enhanced entry point with improved task routing and context management
2. **Planner** - Advanced task analysis with better strategy formulation capabilities
3. **Supervisor** - Intelligent oversight with improved error handling and recovery mechanisms
4. **Researcher** - Enhanced information gathering with better source validation
5. **Coder** - Improved code generation with better error detection and debugging
6. **Browser** - Advanced web interaction with enhanced reliability and error recovery
7. **Reporter** - Comprehensive reporting with better formatting and analysis

### Key Architectural Improvements

- **🔄 Enhanced Agent Communication**: Improved message passing and state management
- **🛡️ Robust Error Handling**: Better error recovery and graceful degradation
- **📊 Advanced Monitoring**: Comprehensive logging and performance tracking
- **🧪 Comprehensive Testing**: Full test coverage with unit, integration, functional, and E2E tests
- **⚙️ Flexible Configuration**: Enhanced configuration management with YAML support

## Features

### 🚀 Enhanced Core Capabilities

- 🤖 **Advanced LLM Integration**
    - Support for most models through [litellm](https://docs.litellm.ai/docs/providers)
    - Enhanced support for open source models like Qwen
    - OpenAI-compatible API interface
    - **NEW**: Three-tier LLM system (reasoning, basic, vision) for optimal task allocation
    - **NEW**: Intelligent model selection based on task complexity

### 🔧 Enhanced Tools and Integrations

- 🔍 **Advanced Search and Retrieval**
    - Web search via Tavily API with enhanced error handling
    - Neural search with Jina and improved content processing
    - **NEW**: Advanced content extraction with better parsing
    - **NEW**: Enhanced web crawling with retry mechanisms

- 🌐 **Improved Browser Automation**
    - Enhanced Playwright integration with better error recovery
    - **NEW**: Smart browser session management
    - **NEW**: Advanced interaction patterns and element detection

### 🛠️ Enhanced Development Features

- 🐍 **Advanced Python Integration**
    - Enhanced Python REPL with better error handling
    - Improved code execution environment with sandboxing
    - **NEW**: Advanced package management with uv
    - **NEW**: Code quality checks and formatting integration

- 🧪 **Comprehensive Testing System**
    - **NEW**: Complete test suite with 4-tier testing (unit, integration, functional, E2E)
    - **NEW**: Automated test discovery and execution
    - **NEW**: Coverage reporting and quality metrics
    - **NEW**: CI/CD integration ready

### 📊 Enhanced Workflow Management

- 📈 **Advanced Visualization and Control**
    - Enhanced workflow graph visualization
    - Improved multi-agent orchestration with better coordination
    - **NEW**: Advanced task delegation with priority management
    - **NEW**: Real-time monitoring and performance tracking
    - **NEW**: Enhanced debugging and troubleshooting tools

### ⚙️ Improved Configuration and Deployment

- 🔧 **Enhanced Configuration Management**
    - **NEW**: YAML-based configuration with environment variable support
    - **NEW**: Flexible agent-LLM mapping configuration
    - **NEW**: Enhanced environment management

- 🐳 **Improved Deployment Options**
    - Enhanced Docker support with better optimization
    - **NEW**: Docker Compose setup for full-stack deployment
    - **NEW**: Production-ready configurations

## Why Choose FreeTop?

### 🌟 Built on LangManus Excellence, Enhanced for Production

While [LangManus](https://github.com/langmanus/langmanus) provided an excellent foundation for multi-agent AI automation, FreeTop takes it to the next level with production-ready enhancements:

### 🚀 Key Advantages Over LangManus

- **🧪 Production-Ready Testing**: Complete test coverage with 4-tier testing system (unit, integration, functional, E2E)
- **⚙️ Enhanced Configuration**: YAML-based configuration with better flexibility and environment management
- **🛡️ Improved Reliability**: Better error handling, recovery mechanisms, and system stability
- **📊 Advanced Monitoring**: Comprehensive logging, performance tracking, and debugging tools
- **🔧 Developer Experience**: Enhanced development tools, code quality checks, and documentation
- **🐳 Better Deployment**: Optimized Docker support and production-ready configurations

### 🤝 Standing on the Shoulders of Giants

FreeTop builds upon the incredible work of the open source community:

- **[LangManus](https://github.com/langmanus/langmanus)** - Our primary inspiration and foundation
- **[LangChain](https://github.com/langchain-ai/langchain)** - Powering our LLM interactions
- **[LangGraph](https://github.com/langchain-ai/langgraph)** - Enabling sophisticated multi-agent orchestration
- **[Qwen](https://github.com/QwenLM/Qwen)** - Providing excellent open source LLMs
- **[Tavily](https://tavily.com/)** - Delivering powerful search capabilities
- **[Jina](https://jina.ai/)** - Enabling advanced content processing
- **[Browser-use](https://pypi.org/project/browser-use/)** - Providing browser automation
- And countless other open source contributors

### 🎯 Our Mission

We're committed to:
- **Advancing AI automation** with production-ready, reliable solutions
- **Giving back to the community** through open source contributions
- **Maintaining high quality** through comprehensive testing and documentation
- **Supporting developers** with excellent tooling and developer experience

We welcome contributions of all kinds - code, documentation, bug reports, feature suggestions, and community support.

## Setup

### Prerequisites

- [uv](https://github.com/astral-sh/uv) package manager

### Installation

FreeTop leverages [uv](https://github.com/astral-sh/uv) as its package manager to streamline dependency management.
Follow the steps below to set up a virtual environment and install the necessary dependencies:

```bash
# Step 1: Create and activate a virtual environment through uv
uv python install 3.12
uv venv --python 3.12

source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Step 2: Install project dependencies
uv sync

# Step 3: Install Playwright for browser automation
uv run playwright install
```

By completing these steps, you'll ensure your environment is properly configured and ready for development.

### Configuration

FreeTop uses an enhanced three-layer LLM system for optimal task allocation:
- **Reasoning LLM**: For complex decision-making and analysis
- **Basic LLM**: For standard text processing tasks
- **Vision LLM**: For image understanding and visual tasks

Configuration is done using the `conf.yaml` file in the root directory. You can copy `conf.yaml.example` to `conf.yaml` to start:
```bash
cp conf.yaml.example conf.yaml
```

```yaml
# Setting it to true will read the conf.yaml configuration, and setting it to false will use the original .env configuration. The default is false (compatible with existing configurations)
USE_CONF: true

# LLM Config
## Follow the litellm configuration parameters: https://docs.litellm.ai/docs/providers. You can click on the specific provider document to view the completion parameter examples
REASONING_MODEL:
  model: "volcengine/ep-xxxx"
  api_key: $REASONING_API_KEY # Supports referencing the environment variable ENV_KEY in the.env file through $ENV_KEY
  api_base: $REASONING_BASE_URL

BASIC_MODEL:
  model: "azure/gpt-4o-2024-08-06"
  api_base: $AZURE_API_BASE
  api_version: $AZURE_API_VERSION
  api_key: $AZURE_API_KEY

VISION_MODEL:
  model: "azure/gpt-4o-2024-08-06"
  api_base: $AZURE_API_BASE
  api_version: $AZURE_API_VERSION
  api_key: $AZURE_API_KEY
```

You can create a .env file in the root directory of the project and configure the following environment variables. You can copy the.env.example file as a template to start:
```bash
cp .env.example .env
```
```ini
# Tool API Key
TAVILY_API_KEY=your_tavily_api_key
JINA_API_KEY=your_jina_api_key  # Optional

# Browser Configuration
CHROME_INSTANCE_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome  # Optional, the path to the Chrome executable file
CHROME_HEADLESS=False  # Optional, the default is False
CHROME_PROXY_SERVER=http://127.0.0.1:10809  # Optional, the default is None
CHROME_PROXY_USERNAME=  # Optional, the default is None
CHROME_PROXY_PASSWORD=  # Optional, the default is None
```


> **Note:**
>
> - The system uses different models for different types of tasks:
>     - The reasoning LLM is used for complex decision-making and analysis.
>     - The basic LLM is used for simple text tasks.
>     - The vision-language LLM is used for tasks involving image understanding.
> - The configuration of all LLMs can be customized independently.
> - The Jina API key is optional. Providing your own key can obtain a higher rate limit (you can obtain this key at [jina.ai](https://jina.ai/)).
> - The default configuration for Tavily search is to return up to 5 results (you can obtain this key at [app.tavily.com](https://app.tavily.com/)). 

### Configure Pre-commit Hook

LangManus includes a pre-commit hook that runs linting and formatting checks before each commit. To set it up:

1. Make the pre-commit script executable:

```bash
chmod +x pre-commit
```

2. Install the pre-commit hook:

```bash
ln -s ../../pre-commit .git/hooks/pre-commit
```

The pre-commit hook will automatically:

- Run linting checks (`make lint`)
- Run code formatting (`make format`)
- Add any reformatted files back to staging
- Prevent commits if there are any linting or formatting errors

## Usage

### Basic Execution

To run LangManus with default settings:

```bash
uv run main.py
```

### API Server

LangManus provides a FastAPI-based API server with streaming support:

```bash
# Start the API server
make serve

# Or run directly
uv run server.py
```

The API server exposes the following endpoints:

- `POST /api/chat/stream`: Chat endpoint for LangGraph invoke with streaming support
    - Request body:
  ```json
  {
    "messages": [{ "role": "user", "content": "Your query here" }],
    "debug": false
  }
  ```
    - Returns a Server-Sent Events (SSE) stream with the agent's responses

### Advanced Configuration

LangManus can be customized through various configuration files in the `src/config` directory:

- `env.py`: Configure LLM models, API keys, and base URLs
- `tools.py`: Adjust tool-specific settings (e.g., Tavily search results limit)
- `agents.py`: Modify team composition and agent system prompts

### Agent Prompts System

LangManus uses a sophisticated prompting system in the `src/prompts` directory to define agent behaviors and responsibilities:

#### Core Agent Roles

- **Supervisor ([`src/prompts/supervisor.md`](src/prompts/supervisor.md))**: Coordinates the team and delegates tasks by analyzing requests and determining which specialist should handle them. Makes decisions about task completion and workflow transitions.

- **Researcher ([`src/prompts/researcher.md`](src/prompts/researcher.md))**: Specializes in information gathering through web searches and data collection. Uses Tavily search and web crawling capabilities while avoiding mathematical computations or file operations.

- **Coder ([`src/prompts/coder.md`](src/prompts/coder.md))**: Professional software engineer role focused on Python and bash scripting. Handles:

    - Python code execution and analysis
    - Shell command execution
    - Technical problem-solving and implementation

- **File Manager ([`src/prompts/file_manager.md`](src/prompts/file_manager.md))**: Handles all file system operations with a focus on properly formatting and saving content in markdown format.

- **Browser ([`src/prompts/browser.md`](src/prompts/browser.md))**: Web interaction specialist that handles:
    - Website navigation
    - Page interaction (clicking, typing, scrolling)
    - Content extraction from web pages

#### Prompt System Architecture

The prompts system uses a template engine ([`src/prompts/template.py`](src/prompts/template.py)) that:

- Loads role-specific markdown templates
- Handles variable substitution (e.g., current time, team member information)
- Formats system prompts for each agent

Each agent's prompt is defined in a separate markdown file, making it easy to modify behavior and responsibilities without changing the underlying code.

## Docker

LangManus can be run in a Docker container. default serve api on port 8000.

Before run docker, you need to prepare environment variables in `.env` file.

```bash
docker build -t langmanus .
docker run --name langmanus -d --env-file .env -e CHROME_HEADLESS=True -p 8000:8000 langmanus
```

You can also just run the cli with docker.

```bash
docker build -t langmanus .
docker run --rm -it --env-file .env -e CHROME_HEADLESS=True langmanus uv run python main.py
```

## Web UI

LangManus provides a default web UI.

Please refer to the [langmanus/langmanus-web-ui](https://github.com/langmanus/langmanus-web) project for more details.

## Docker Compose (include both backend and frontend)

LangManus provides a docker-compose setup to easily run both the backend and frontend together:

```bash
# Start both backend and frontend
docker-compose up -d

# The backend will be available at http://localhost:8000
# The frontend will be available at http://localhost:3000, which could be accessed through web browser
```

This will:
1. Build and start the LangManus backend container
2. Build and start the LangManus web UI container
3. Connect them using a shared network

** Make sure you have your `.env` file prepared with the necessary API keys before starting the services. **

## Development

### 🧪 Comprehensive Testing System

FreeTop features a production-ready 4-tier testing system:

```bash
# Quick test execution
python run_tests.py                    # Run all tests
python run_tests.py --type unit        # Run unit tests only
python run_tests.py --type integration # Run integration tests
python run_tests.py --type functional  # Run functional tests
python run_tests.py --type e2e         # Run end-to-end tests

# With coverage reporting
python run_tests.py --coverage         # Generate coverage report
python run_tests.py --coverage --html  # Generate HTML coverage report

# Using Makefile (if available)
make test                              # Run all tests
make test-unit                         # Run unit tests
make test-integration                  # Run integration tests
make test-functional                   # Run functional tests
make test-e2e                         # Run E2E tests
make coverage                          # Generate coverage report

# Traditional pytest commands
pytest tests/                          # Run all tests
pytest tests/unit/                     # Run unit tests
pytest tests/integration/test_workflow.py  # Run specific test
pytest --cov=src --cov-report=html    # Coverage with HTML report
```

#### Test Structure

- **Unit Tests** (`tests/unit/`): Test individual modules and functions
- **Integration Tests** (`tests/integration/`): Test module interactions
- **Functional Tests** (`tests/functional/`): Test complete business features
- **E2E Tests** (`tests/e2e/`): Test complete user scenarios

For detailed testing information, see [TESTING.md](TESTING.md).

### 🔧 Code Quality

```bash
# Run linting
make lint

# Format code
make format

# Run pre-commit checks
pre-commit run --all-files
```

### 📊 Development Tools

```bash
# Install development dependencies
python run_tests.py --install-deps

# Clean test artifacts
make clean-test

# View test help
python run_tests.py --help
```

## FAQ

Please refer to the [FAQ.md](docs/FAQ.md) for more details.

## Contributing

We welcome contributions of all kinds! Whether you're fixing a typo, improving documentation, or adding a new feature, your help is appreciated. Please see our [Contributing Guide](CONTRIBUTING.md) for details on how to get started.

## License

This project is open source and available under the [MIT License](LICENSE).

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=Hedlen/freetop&type=Date)](https://www.star-history.com/#Hedlen/freetop&Date)

## Acknowledgments

### 🙏 Deep Gratitude to LangManus

FreeTop exists because of the exceptional foundation provided by [LangManus](https://github.com/langmanus/langmanus). We are deeply grateful to the LangManus team for:

- **Pioneering Vision**: Creating an innovative multi-agent AI automation framework
- **Open Source Spirit**: Sharing their work with the community under MIT license
- **Technical Excellence**: Providing a solid, well-architected foundation to build upon
- **Community Building**: Fostering collaboration and knowledge sharing

### 🌟 Standing on the Shoulders of Giants

FreeTop builds upon the incredible work of the entire open source ecosystem:

**Core Framework:**
- **[LangManus](https://github.com/langmanus/langmanus)** - Our primary inspiration and foundation
- **[LangChain](https://github.com/langchain-ai/langchain)** - Exceptional framework powering LLM interactions
- **[LangGraph](https://github.com/langchain-ai/langgraph)** - Enabling sophisticated multi-agent orchestration

**AI and ML:**
- **[Qwen](https://github.com/QwenLM/Qwen)** - Outstanding open source language models
- **[OpenAI](https://openai.com/)** - Advancing the field of artificial intelligence

**Tools and Services:**
- **[Tavily](https://tavily.com/)** - Powerful search capabilities
- **[Jina](https://jina.ai/)** - Advanced content processing and neural search
- **[Browser-use](https://pypi.org/project/browser-use/)** - Reliable browser automation
- **[Playwright](https://playwright.dev/)** - Modern web automation framework

**Development Tools:**
- **[uv](https://github.com/astral-sh/uv)** - Fast Python package manager
- **[pytest](https://pytest.org/)** - Comprehensive testing framework
- **[Docker](https://docker.com/)** - Containerization platform

### 🚀 Our Contribution

While building upon LangManus's excellent foundation, FreeTop contributes back to the community with:

- **Enhanced Testing**: Production-ready 4-tier testing system
- **Improved Reliability**: Better error handling and recovery mechanisms
- **Developer Experience**: Enhanced tooling and documentation
- **Configuration Management**: Flexible YAML-based configuration
- **Deployment Ready**: Optimized Docker and production configurations

We believe in the power of open source collaboration and are committed to giving back to the community that makes innovation possible.

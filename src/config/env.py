import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Reasoning LLM configuration (for complex reasoning tasks)
REASONING_MODEL = os.getenv("REASONING_MODEL", "o1-mini")
REASONING_BASE_URL = os.getenv("REASONING_BASE_URL")
REASONING_API_KEY = os.getenv("REASONING_API_KEY")

# Non-reasoning LLM configuration (for straightforward tasks)
BASIC_MODEL = os.getenv("BASIC_MODEL", "gpt-4o")
BASIC_BASE_URL = os.getenv("BASIC_BASE_URL")
BASIC_API_KEY = os.getenv("BASIC_API_KEY")

# Azure OpenAI配置（按LLM类型区分）
AZURE_API_BASE = os.getenv("AZURE_API_BASE")
AZURE_API_KEY = os.getenv("AZURE_API_KEY")
AZURE_API_VERSION = os.getenv("AZURE_API_VERSION")
# 各类型专用部署名称
BASIC_AZURE_DEPLOYMENT = os.getenv("BASIC_AZURE_DEPLOYMENT")
VL_AZURE_DEPLOYMENT = os.getenv("VL_AZURE_DEPLOYMENT")
REASONING_AZURE_DEPLOYMENT = os.getenv("REASONING_AZURE_DEPLOYMENT")

# Vision-language LLM configuration (for tasks requiring visual understanding)
VL_MODEL = os.getenv("VL_MODEL", "gpt-4o")
VL_BASE_URL = os.getenv("VL_BASE_URL")
VL_API_KEY = os.getenv("VL_API_KEY")

# Browser Instance configuration
# 默认使用 Playwright 内置的 Chromium，避免与用户本地 Chrome 冲突
# 如果设置了 CHROME_INSTANCE_PATH，则使用指定的浏览器路径
CHROME_INSTANCE_PATH = os.getenv("CHROME_INSTANCE_PATH")
CHROME_HEADLESS = os.getenv("CHROME_HEADLESS", "False") == "True"

# Proxy configuration
CHROME_PROXY_STRATEGY = os.getenv("CHROME_PROXY_STRATEGY", "smart")  # auto, manual, direct, smart
CHROME_PROXY_SERVER = os.getenv("CHROME_PROXY_SERVER")
CHROME_PROXY_USERNAME = os.getenv("CHROME_PROXY_USERNAME")
CHROME_PROXY_PASSWORD = os.getenv("CHROME_PROXY_PASSWORD")
CHROME_PROXY_TYPE = os.getenv("CHROME_PROXY_TYPE", "http")  # http, https, socks4, socks5
CHROME_AUTO_DETECT_PROXY = os.getenv("CHROME_AUTO_DETECT_PROXY", "True") == "True"
CHROME_DOMESTIC_DIRECT = os.getenv("CHROME_DOMESTIC_DIRECT", "True") == "True"
CHROME_PROXY_WHITELIST = os.getenv("CHROME_PROXY_WHITELIST", "").split(",") if os.getenv("CHROME_PROXY_WHITELIST") else []
CHROME_PROXY_BLACKLIST = os.getenv("CHROME_PROXY_BLACKLIST", "").split(",") if os.getenv("CHROME_PROXY_BLACKLIST") else []

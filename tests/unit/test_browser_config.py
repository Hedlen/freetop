#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.tools.browser import create_browser_config
from src.config import CHROME_INSTANCE_PATH, CHROME_HEADLESS, BROWSER_HISTORY_DIR

def test_browser_config():
    print("=== 浏览器配置测试 ===")
    
    # 测试默认配置
    config = create_browser_config()
    print(f"Chrome实例路径: {config.chrome_instance_path}")
    print(f"无头模式: {config.headless}")
    
    # 测试环境变量
    print(f"\n=== 环境变量配置 ===")
    print(f"CHROME_INSTANCE_PATH: {CHROME_INSTANCE_PATH}")
    print(f"CHROME_HEADLESS: {CHROME_HEADLESS}")
    print(f"BROWSER_HISTORY_DIR: {BROWSER_HISTORY_DIR}")
    
    # 检查浏览器历史目录
    print(f"\n=== 浏览器历史目录检查 ===")
    if os.path.exists(BROWSER_HISTORY_DIR):
        print(f"目录存在: {BROWSER_HISTORY_DIR}")
        files = os.listdir(BROWSER_HISTORY_DIR)
        print(f"目录中的文件数量: {len(files)}")
        if files:
            print(f"最近的文件: {files[:5]}")
    else:
        print(f"目录不存在: {BROWSER_HISTORY_DIR}")
        try:
            os.makedirs(BROWSER_HISTORY_DIR, exist_ok=True)
            print(f"已创建目录: {BROWSER_HISTORY_DIR}")
        except Exception as e:
            print(f"创建目录失败: {e}")
    
    print("\n=== 配置验证完成 ===")
    if config.chrome_instance_path is None:
        print("✅ 正确配置：使用Playwright内置Chromium，不会启动本地Chrome")
    else:
        print(f"⚠️  注意：配置了自定义Chrome路径: {config.chrome_instance_path}")

if __name__ == "__main__":
    test_browser_config()
#!/usr/bin/env python3

import sys
import os
import asyncio
import json
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.tools.browser import BrowserTool
from src.tools.smart_browser import SmartBrowserTool
from src.config import BROWSER_HISTORY_DIR

async def test_browser_tool():
    """测试基础浏览器工具"""
    print("=== 测试基础浏览器工具 ===")
    
    browser_tool = BrowserTool()
    
    try:
        # 测试浏览器工具调用
        result = await browser_tool._arun(
            instruction="访问 https://example.com 并截图",
            target_url="https://example.com"
        )
        
        print(f"浏览器工具执行结果: {result}")
        
        # 检查是否生成了GIF文件
        if isinstance(result, str):
            try:
                result_data = json.loads(result)
                gif_path = result_data.get('generated_gif_path')
                if gif_path:
                    full_path = os.path.join(os.getcwd(), gif_path)
                    if os.path.exists(full_path):
                        print(f"✅ GIF文件已生成: {full_path}")
                        print(f"文件大小: {os.path.getsize(full_path)} bytes")
                    else:
                        print(f"❌ GIF文件不存在: {full_path}")
                else:
                    print("❌ 结果中没有GIF路径")
            except json.JSONDecodeError:
                print(f"❌ 无法解析结果JSON: {result}")
        
    except Exception as e:
        print(f"❌ 浏览器工具执行失败: {e}")
    finally:
        await browser_tool.terminate()

async def test_smart_browser_tool():
    """测试智能浏览器工具"""
    print("\n=== 测试智能浏览器工具 ===")
    
    smart_browser_tool = SmartBrowserTool()
    
    try:
        # 测试智能浏览器工具调用
        result = await smart_browser_tool._arun(
            instruction="访问 https://httpbin.org/get 并查看响应内容"
        )
        
        print(f"智能浏览器工具执行结果: {result}")
        
        # 检查是否生成了GIF文件
        if isinstance(result, str):
            try:
                result_data = json.loads(result)
                gif_path = result_data.get('generated_gif_path')
                if gif_path:
                    full_path = os.path.join(os.getcwd(), gif_path)
                    if os.path.exists(full_path):
                        print(f"✅ GIF文件已生成: {full_path}")
                        print(f"文件大小: {os.path.getsize(full_path)} bytes")
                    else:
                        print(f"❌ GIF文件不存在: {full_path}")
                else:
                    print("❌ 结果中没有GIF路径")
            except json.JSONDecodeError:
                print(f"❌ 无法解析结果JSON: {result}")
        
    except Exception as e:
        print(f"❌ 智能浏览器工具执行失败: {e}")
    finally:
        await smart_browser_tool.terminate()

async def check_browser_history_dir():
    """检查浏览器历史目录"""
    print("\n=== 检查浏览器历史目录 ===")
    
    if os.path.exists(BROWSER_HISTORY_DIR):
        files = [f for f in os.listdir(BROWSER_HISTORY_DIR) if f.endswith('.gif')]
        print(f"目录存在: {BROWSER_HISTORY_DIR}")
        print(f"GIF文件数量: {len(files)}")
        if files:
            print(f"最新的5个文件: {files[-5:]}")
            # 检查最新文件的大小
            latest_file = os.path.join(BROWSER_HISTORY_DIR, files[-1])
            size = os.path.getsize(latest_file)
            print(f"最新文件大小: {size} bytes")
    else:
        print(f"❌ 目录不存在: {BROWSER_HISTORY_DIR}")
        try:
            os.makedirs(BROWSER_HISTORY_DIR, exist_ok=True)
            print(f"✅ 已创建目录: {BROWSER_HISTORY_DIR}")
        except Exception as e:
            print(f"❌ 创建目录失败: {e}")

async def main():
    """主测试函数"""
    print("开始浏览器工具集成测试...")
    
    # 检查目录
    await check_browser_history_dir()
    
    # 测试基础浏览器工具
    await test_browser_tool()
    
    # 测试智能浏览器工具
    await test_smart_browser_tool()
    
    # 再次检查目录
    await check_browser_history_dir()
    
    print("\n=== 测试完成 ===")
    print("如果测试成功，应该能看到:")
    print("1. GIF文件已生成")
    print("2. 文件大小大于0")
    print("3. 浏览器历史目录中有新文件")
    print("\n前端应该能够:")
    print("1. 接收到 browser-tool-call 事件")
    print("2. 接收到 browser-tool-result 事件")
    print("3. 显示浏览器操作的GIF录制")

if __name__ == "__main__":
    asyncio.run(main())
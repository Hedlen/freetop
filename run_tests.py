#!/usr/bin/env python3
"""
测试运行脚本
提供便捷的测试执行命令
"""

import os
import sys
import argparse
import subprocess
from pathlib import Path


def run_command(cmd, description):
    """运行命令并显示结果"""
    print(f"\n🔄 {description}...")
    print(f"执行命令: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=Path(__file__).parent)
        
        if result.returncode == 0:
            print(f"✅ {description}成功")
            if result.stdout:
                print(result.stdout)
        else:
            print(f"❌ {description}失败")
            if result.stderr:
                print(f"错误信息: {result.stderr}")
            if result.stdout:
                print(f"输出信息: {result.stdout}")
        
        return result.returncode == 0
    
    except Exception as e:
        print(f"❌ 执行{description}时发生异常: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description='FreeTOP项目测试运行器')
    parser.add_argument('--type', '-t', 
                       choices=['all', 'unit', 'integration', 'functional', 'e2e'],
                       default='all',
                       help='测试类型 (默认: all)')
    parser.add_argument('--coverage', '-c', 
                       action='store_true',
                       help='生成覆盖率报告')
    parser.add_argument('--html-coverage', 
                       action='store_true',
                       help='生成HTML覆盖率报告')
    parser.add_argument('--verbose', '-v', 
                       action='store_true',
                       help='详细输出')
    parser.add_argument('--markers', '-m',
                       help='按标记过滤测试 (例如: "not slow")')
    parser.add_argument('--file', '-f',
                       help='运行特定测试文件')
    parser.add_argument('--install-deps', 
                       action='store_true',
                       help='安装测试依赖')
    
    args = parser.parse_args()
    
    # 检查pytest是否安装
    try:
        import pytest
    except ImportError:
        print("❌ pytest未安装，请先安装测试依赖")
        print("运行: pip install pytest pytest-cov")
        return 1
    
    # 安装依赖
    if args.install_deps:
        deps = ['pytest', 'pytest-cov', 'pytest-html', 'pytest-xdist']
        cmd = [sys.executable, '-m', 'pip', 'install'] + deps
        if not run_command(cmd, "安装测试依赖"):
            return 1
    
    # 构建pytest命令
    cmd = [sys.executable, '-m', 'pytest']
    
    # 添加详细输出
    if args.verbose:
        cmd.append('-v')
    
    # 添加覆盖率选项
    if args.coverage or args.html_coverage:
        cmd.extend(['--cov=src', '--cov-report=term-missing'])
        
        if args.html_coverage:
            cmd.extend(['--cov-report=html:htmlcov'])
    
    # 添加标记过滤
    if args.markers:
        cmd.extend(['-m', args.markers])
    
    # 选择测试类型或文件
    if args.file:
        cmd.append(args.file)
    elif args.type == 'all':
        cmd.append('tests/')
    else:
        cmd.append(f'tests/{args.type}/')
    
    # 运行测试
    print(f"\n🧪 开始运行{args.type}测试...")
    success = run_command(cmd, f"{args.type}测试")
    
    if args.html_coverage and success:
        print("\n📊 HTML覆盖率报告已生成: htmlcov/index.html")
    
    # 显示测试结果总结
    if success:
        print("\n🎉 测试运行完成！")
        print("\n📋 可用的测试命令:")
        print("  python run_tests.py --type unit          # 运行单元测试")
        print("  python run_tests.py --type integration   # 运行集成测试")
        print("  python run_tests.py --type functional    # 运行功能测试")
        print("  python run_tests.py --type e2e           # 运行端到端测试")
        print("  python run_tests.py --coverage           # 运行测试并生成覆盖率")
        print("  python run_tests.py --html-coverage      # 生成HTML覆盖率报告")
        print("  python run_tests.py -m 'not slow'        # 跳过慢速测试")
        print("  python run_tests.py -f tests/unit/test_user_service.py  # 运行特定文件")
        return 0
    else:
        print("\n❌ 测试运行失败，请检查错误信息")
        return 1


if __name__ == '__main__':
    sys.exit(main())
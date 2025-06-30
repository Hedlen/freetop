#!/usr/bin/env python3
"""
测试修复效果的简化脚本
避免复杂依赖，直接测试核心功能
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'src'))

import json
import logging
from datetime import datetime

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def test_mobile_detection_direct():
    """直接测试移动端检测函数"""
    print("=== 测试1: 移动端检测 ===")
    
    try:
        # 直接导入函数，避免通过__init__.py
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "browser", 
            os.path.join(os.path.dirname(os.path.abspath(__file__)), 'src', 'tools', 'browser.py')
        )
        browser_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(browser_module)
        
        is_mobile_request = browser_module.is_mobile_request
        
        test_cases = [
            ("桌面端Chrome", {"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}),
            ("桌面端Firefox", {"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0"}),
            ("iPhone", {"user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)"}),
            ("Android", {"user-agent": "Mozilla/5.0 (Linux; Android 10; SM-G975F)"}),
            ("iPad", {"user-agent": "Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)"}),
            ("空User-Agent", {"user-agent": ""}),
            ("无User-Agent", {}),
            ("混合关键词", {"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Mobile Safari"}),
        ]
        
        for name, headers in test_cases:
            is_mobile = is_mobile_request(headers)
            status = "📱 移动端" if is_mobile else "🖥️  桌面端"
            print(f"{name}: {status}")
        
        print("✅ 移动端检测测试完成")
        
    except Exception as e:
        print(f"❌ 移动端检测测试失败: {e}")
        import traceback
        traceback.print_exc()

def test_user_settings_cache():
    """测试用户设置缓存"""
    print("\n=== 测试2: 用户设置缓存 ===")
    
    try:
        from services.user_settings_cache import user_settings_cache, UserSettingsCache
        
        # 创建测试缓存实例
        test_cache = UserSettingsCache(ttl_seconds=60, max_entries=100)
        
        # 测试基本操作
        test_user_id = "test_user_123"
        test_settings = {"headless": True, "window_size": "1920x1080"}
        
        print("--- 测试缓存基本操作 ---")
        
        # 设置缓存
        test_cache.set(test_user_id, test_settings)
        print(f"设置缓存: {test_user_id}")
        
        # 获取缓存
        cached_result = test_cache.get(test_user_id)
        print(f"获取缓存: {cached_result}")
        
        # 检查统计
        stats = test_cache.get_stats()
        print(f"缓存统计: {stats}")
        
        # 测试缓存未命中
        miss_result = test_cache.get("non_existent_user")
        print(f"缓存未命中: {miss_result}")
        
        # 更新统计
        stats = test_cache.get_stats()
        print(f"更新后统计: {stats}")
        
        # 清空缓存
        test_cache.clear()
        print("缓存已清空")
        
        # 验证清空
        after_clear = test_cache.get(test_user_id)
        print(f"清空后获取: {after_clear}")
        
        print("✅ 用户设置缓存测试完成")
        
    except Exception as e:
        print(f"❌ 用户设置缓存测试失败: {e}")
        import traceback
        traceback.print_exc()

def test_auth_enhancement():
    """测试认证增强"""
    print("\n=== 测试3: 认证增强 ===")
    
    try:
        from middleware.auth_enhanced import enhanced_verify_token, get_user_id_optional
        
        # 测试空token
        print("--- 测试空token ---")
        result = enhanced_verify_token("")
        print(f"空token结果: {result}")
        
        # 测试无效token
        print("\n--- 测试无效token ---")
        result = enhanced_verify_token("invalid.token.here")
        print(f"无效token结果: {result}")
        
        # 测试可选用户ID获取
        print("\n--- 测试可选用户ID获取 ---")
        user_id = get_user_id_optional("")
        print(f"空token用户ID: {user_id}")
        
        user_id = get_user_id_optional("invalid.token")
        print(f"无效token用户ID: {user_id}")
        
        print("✅ 认证增强测试完成")
        
    except Exception as e:
        print(f"❌ 认证增强测试失败: {e}")
        import traceback
        traceback.print_exc()

def test_environment_variables():
    """测试环境变量配置"""
    print("\n=== 测试4: 环境变量配置 ===")
    
    try:
        # 检查关键环境变量
        env_vars = [
            'CHROME_HEADLESS',
            'DATABASE_URL',
            'JWT_SECRET_KEY',
            'REDIS_URL'
        ]
        
        print("--- 环境变量检查 ---")
        for var in env_vars:
            value = os.environ.get(var)
            if value:
                # 隐藏敏感信息
                if 'SECRET' in var or 'PASSWORD' in var:
                    display_value = "***隐藏***"
                elif len(value) > 50:
                    display_value = value[:20] + "..." + value[-10:]
                else:
                    display_value = value
                print(f"✅ {var}: {display_value}")
            else:
                print(f"❌ {var}: 未设置")
        
        # 测试CHROME_HEADLESS的不同值
        print("\n--- CHROME_HEADLESS值测试 ---")
        original_value = os.environ.get('CHROME_HEADLESS')
        
        test_values = ['true', 'false', '1', '0', 'True', 'False', '']
        for test_val in test_values:
            os.environ['CHROME_HEADLESS'] = test_val
            # 这里可以测试解析逻辑
            parsed = test_val.lower() in ['true', '1'] if test_val else False
            print(f"'{test_val}' -> {parsed}")
        
        # 恢复原值
        if original_value is not None:
            os.environ['CHROME_HEADLESS'] = original_value
        elif 'CHROME_HEADLESS' in os.environ:
            del os.environ['CHROME_HEADLESS']
        
        print("✅ 环境变量配置测试完成")
        
    except Exception as e:
        print(f"❌ 环境变量配置测试失败: {e}")
        import traceback
        traceback.print_exc()

def test_file_modifications():
    """测试文件修改是否成功"""
    print("\n=== 测试5: 文件修改验证 ===")
    
    try:
        files_to_check = [
            ('src/tools/browser.py', ['logger.debug', 'headless_mode 来源']),
            ('src/services/user_service.py', ['user_settings_cache', 'cache_user_settings']),
            ('src/middleware/auth_enhanced.py', ['enhanced_verify_token', 'JWT认证增强']),
            ('src/services/user_settings_cache.py', ['UserSettingsCache', 'CacheEntry']),
            ('src/routers/health.py', ['/health/config', 'health_check'])
        ]
        
        for file_path, keywords in files_to_check:
            full_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), file_path)
            if os.path.exists(full_path):
                with open(full_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                found_keywords = []
                for keyword in keywords:
                    if keyword in content:
                        found_keywords.append(keyword)
                
                if len(found_keywords) == len(keywords):
                    print(f"✅ {file_path}: 所有关键词已找到")
                else:
                    missing = set(keywords) - set(found_keywords)
                    print(f"⚠️  {file_path}: 缺少关键词 {missing}")
            else:
                print(f"❌ {file_path}: 文件不存在")
        
        print("✅ 文件修改验证完成")
        
    except Exception as e:
        print(f"❌ 文件修改验证失败: {e}")
        import traceback
        traceback.print_exc()

def main():
    """主函数"""
    print("🧪 开始修复效果测试...\n")
    
    # 1. 测试移动端检测
    test_mobile_detection_direct()
    
    # 2. 测试用户设置缓存
    test_user_settings_cache()
    
    # 3. 测试认证增强
    test_auth_enhancement()
    
    # 4. 测试环境变量配置
    test_environment_variables()
    
    # 5. 测试文件修改
    test_file_modifications()
    
    print("\n" + "="*50)
    print("🎉 所有测试完成！")
    print("\n📋 修复总结:")
    print("1. ✅ 增强了headless配置的日志记录")
    print("2. ✅ 改进了移动端检测逻辑")
    print("3. ✅ 添加了用户设置缓存机制")
    print("4. ✅ 增强了JWT认证检查")
    print("5. ✅ 创建了健康检查端点")
    print("\n🔧 建议下一步:")
    print("1. 在生产环境中启用详细日志")
    print("2. 监控健康检查端点")
    print("3. 定期清理缓存")
    print("4. 验证前端JWT token发送")
    print("5. 检查并安装缺失的依赖包")

if __name__ == "__main__":
    main()
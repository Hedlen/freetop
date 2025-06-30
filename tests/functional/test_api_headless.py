#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.tools.browser import create_browser_config
from src.models.user import UserSettings
from src.database.connection import get_db
import json

def test_api_flow():
    """测试API流程中的headless设置"""
    print("=== Testing API Flow for Headless Setting ===")
    
    # 1. 模拟从数据库获取用户
    db = next(get_db())
    user_settings = db.query(UserSettings).first()
    
    if not user_settings:
        print("No user settings found in database")
        return
    
    user_id = user_settings.user_id
    print(f"Found user_id: {user_id}")
    
    # 2. 解析设置数据
    settings_data = json.loads(user_settings.settings_data)
    browser_settings = settings_data.get('browser', {})
    print(f"Browser settings from DB: {browser_settings}")
    
    # 3. 模拟API调用 - 无token情况
    print("\n--- Testing without token (user_id=None) ---")
    config_no_user = create_browser_config(user_id=None)
    print(f"Config headless (no user): {config_no_user.headless}")
    
    # 4. 模拟API调用 - 有token情况
    print(f"\n--- Testing with token (user_id={user_id}) ---")
    config_with_user = create_browser_config(user_id=user_id)
    print(f"Config headless (with user): {config_with_user.headless}")
    
    # 5. 测试移动端检测
    print("\n--- Testing mobile detection ---")
    mobile_headers = {'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'}
    config_mobile = create_browser_config(user_id=user_id, request_headers=mobile_headers)
    print(f"Config headless (mobile): {config_mobile.headless}")
    
    # 6. 检查环境变量
    print("\n--- Environment Variables ---")
    print(f"CHROME_HEADLESS: {os.getenv('CHROME_HEADLESS', 'Not set')}")
    
if __name__ == "__main__":
    test_api_flow()
#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.models.user import UserSettings
from src.database.connection import get_db
import json

def test_user_service():
    """测试UserService的get_user_settings方法"""
    print("=== Testing UserService.get_user_settings ===")
    
    # 1. 获取用户ID
    db = next(get_db())
    user_settings = db.query(UserSettings).first()
    
    if not user_settings:
        print("No user settings found in database")
        return
    
    user_id = user_settings.user_id
    print(f"Testing with user_id: {user_id}")
    
    # 2. 测试UserService.get_user_settings
    try:
        from src.services.user_service import UserService
        result = UserService.get_user_settings(user_id)
        print(f"UserService result: {result}")
        
        if result.get('success') and result.get('settings'):
            browser_settings = result['settings'].get('browser', {})
            print(f"Browser settings from UserService: {browser_settings}")
            headless_value = browser_settings.get('headless')
            print(f"Headless value: {headless_value} (type: {type(headless_value)})")
        else:
            print("UserService failed to get settings or settings is empty")
            
    except Exception as e:
        print(f"Error calling UserService.get_user_settings: {e}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
    
    # 3. 直接从数据库读取作为对比
    print("\n--- Direct database comparison ---")
    settings_data = json.loads(user_settings.settings_data)
    browser_settings_direct = settings_data.get('browser', {})
    print(f"Direct DB browser settings: {browser_settings_direct}")
    headless_direct = browser_settings_direct.get('headless')
    print(f"Direct DB headless: {headless_direct} (type: {type(headless_direct)})")

if __name__ == "__main__":
    test_user_service()
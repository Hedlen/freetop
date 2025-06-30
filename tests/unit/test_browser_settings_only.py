#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.models.user import UserSettings
from src.database.connection import get_db
import json

def test_browser_settings_only():
    """专门测试browser设置的获取"""
    print("=== Testing Browser Settings Only ===")
    
    # 1. 获取用户ID
    db = next(get_db())
    user_settings = db.query(UserSettings).first()
    
    if not user_settings:
        print("No user settings found")
        return
    
    user_id = user_settings.user_id
    print(f"User ID: {user_id}")
    
    # 2. 测试UserService
    try:
        from src.services.user_service import UserService
        result = UserService.get_user_settings(user_id)
        
        print(f"UserService success: {result.get('success')}")
        
        if result.get('success') and result.get('settings'):
            browser_settings = result['settings'].get('browser', {})
            print(f"Browser settings found: {bool(browser_settings)}")
            if browser_settings:
                headless_value = browser_settings.get('headless')
                print(f"Headless from UserService: {headless_value} (type: {type(headless_value)})")
            else:
                print("Browser settings is empty dict")
        else:
            print("UserService failed or no settings")
            
    except Exception as e:
        print(f"UserService error: {e}")
    
    # 3. 直接数据库对比
    print("\n--- Direct DB ---")
    settings_data = json.loads(user_settings.settings_data)
    browser_settings_direct = settings_data.get('browser', {})
    headless_direct = browser_settings_direct.get('headless')
    print(f"Direct DB headless: {headless_direct} (type: {type(headless_direct)})")

if __name__ == "__main__":
    test_browser_settings_only()
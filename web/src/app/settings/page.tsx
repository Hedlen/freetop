'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState({
    theme: 'auto',
    language: 'zh-CN',
  });

  // Define loadSettings function BEFORE useEffect to avoid temporal dead zone
  const loadSettings = useCallback(async () => {
    try {
      const savedSettings = localStorage.getItem('user_settings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }, []);

  // Check authentication and load settings
  useEffect(() => {
    // Check user login status
    const userInfo = localStorage.getItem('user_info');
    if (!userInfo) {
      router.push('/chat');
      return;
    }
    
    // Load saved settings
    void loadSettings();
  }, [router, loadSettings]);

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">设置</h1>
        <div className="space-y-6">
          <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">外观设置</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">主题</label>
                <select
                  value={settings.theme}
                  onChange={(e) => setSettings({...settings, theme: e.target.value})}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="light">浅色</option>
                  <option value="dark">深色</option>
                  <option value="auto">自动</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">语言</label>
                <select
                  value={settings.language}
                  onChange={(e) => setSettings({...settings, language: e.target.value})}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="zh-CN">简体中文</option>
                  <option value="en-US">English</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
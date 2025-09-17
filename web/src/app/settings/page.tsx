'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeftIcon, 
  CpuChipIcon, 
  GlobeAltIcon, 
  CommandLineIcon,
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface LLMConfig {
  provider: string;
  model: string;
  api_key: string;
  base_url?: string;
  temperature: number;
  max_tokens: number;
}

interface MultiLLMConfig {
  reasoning: LLMConfig;  // 推理模型
  basic: LLMConfig;      // 基础模型
  vision: LLMConfig;     // 视觉模型
}

interface CrawlerConfig {
  max_pages: number;
  timeout: number;
  delay: number;
  user_agent: string;
  enable_javascript: boolean;
  tavily_api_key: string;
  jina_api_key: string;
  max_search_results: number;
}

interface BrowserConfig {
  headless: boolean;
  chrome_path?: string;
  proxy_strategy: 'auto' | 'manual' | 'direct' | 'smart';
  proxy_server?: string;
  proxy_username?: string;
  proxy_password?: string;
  proxy_type: 'http' | 'https' | 'socks4' | 'socks5';
  auto_detect_proxy: boolean;
  domestic_direct: boolean;
  proxy_whitelist: string[];
  proxy_blacklist: string[];
  window_size: string;
}

interface SystemSettings {
  llm: MultiLLMConfig;
  crawler: CrawlerConfig;
  browser: BrowserConfig;
}

const defaultSettings: SystemSettings = {
  llm: {
    reasoning: {
      provider: 'deepseek',
      model: 'deepseek-reasoner',
      api_key: 'sk-1042f04ed2ed47029fabfe407d475ec3',
      base_url: 'https://api.deepseek.com/v1',
      temperature: 0.7,
      max_tokens: 4096
    },
    basic: {
      provider: 'deepseek',
      model: 'deepseek-chat',
      api_key: 'sk-1042f04ed2ed47029fabfe407d475ec3',
      base_url: 'https://api.deepseek.com/v1',
      temperature: 0.7,
      max_tokens: 4096
    },
    vision: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      api_key: 'sk-WQsbHTIxAIWSTrCI82C6E0054e88469685Fd276276B6B309',
      base_url: 'https://api.wisdomier.com/v1',
      temperature: 0.7,
      max_tokens: 4096
    }
  },
  crawler: {
    max_pages: 10,
    timeout: 30,
    delay: 1,
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    enable_javascript: true,
    tavily_api_key: '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',
    jina_api_key: 'jina_78ffa5fa9a9944e285884fed1bcafccaeKqwjvhhS5EZApXe3ImM6Pt83Hd1',
    max_search_results: 5
  },
  browser: {
    headless: false,
    chrome_path: '',
    proxy_strategy: 'smart',
    proxy_server: '',
    proxy_username: '',
    proxy_password: '',
    proxy_type: 'http',
    auto_detect_proxy: true,
    domestic_direct: true,
    proxy_whitelist: [],
    proxy_blacklist: [],
    window_size: '1920x1080'
  }
};

const llmProviders = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google' },
  { value: 'azure', label: 'Azure OpenAI' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'local', label: '本地模型' }
];

const modelOptions: Record<string, string[]> = {
  openai: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-4o', 'gpt-4o-mini'],
  anthropic: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
  google: ['gemini-pro', 'gemini-pro-vision'],
  azure: ['gpt-4', 'gpt-35-turbo'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
  local: ['llama2', 'codellama', 'mistral']
};

// 刷新Token
async function refreshToken(): Promise<boolean> {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    return false;
  }

  try {
    const response = await fetch('http://localhost:8000/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('auth_token', data.token);
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error('Token refresh error:', error);
    return false;
  }
}

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('llm');
  const [activeLLMTab, setActiveLLMTab] = useState('reasoning');
  const [syncStatus, setSyncStatus] = useState<'synced' | 'local' | 'syncing' | 'error'>('local');

  useEffect(() => {
    // 检查用户登录状态
    const userInfo = localStorage.getItem('user_info');
    if (!userInfo) {
      router.push('/chat');
      return;
    }

    // 加载保存的设置
    loadSettings();
  }, [router]);

  const loadSettings = async () => {
    try {
      // 首先尝试从后端加载设置
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          const response = await fetch('http://localhost:8000/api/settings', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result.success && Object.keys(result.settings).length > 0) {
               // 如果后端有设置，合并默认设置以确保完整性
               const mergedSettings = {
                 ...defaultSettings,
                 ...result.settings,
                 llm: {
                   ...defaultSettings.llm,
                   ...result.settings.llm,
                   reasoning: {
                     ...defaultSettings.llm.reasoning,
                     ...result.settings.llm?.reasoning
                   },
                   basic: {
                     ...defaultSettings.llm.basic,
                     ...result.settings.llm?.basic
                   },
                   vision: {
                     ...defaultSettings.llm.vision,
                     ...result.settings.llm?.vision
                   }
                 }
               };
               setSettings(mergedSettings);
               localStorage.setItem('system_settings', JSON.stringify(mergedSettings));
               setSyncStatus('synced');
               return;
             }
          } else if (response.status === 401) {
            const errorData = await response.json();
            if (errorData.detail?.includes('已过期')) {
              // Token过期，尝试刷新
              const refreshed = await refreshToken();
              if (refreshed) {
                // 刷新成功，重新加载设置
                return loadSettings();
              }
            }
            // Token无效或刷新失败，清除token
            localStorage.removeItem('auth_token');
            setSyncStatus('error');
          }
        } catch (syncError) {
          console.error('从云端加载设置失败:', syncError);
        }
      }
      
      // 如果后端加载失败或没有设置，从本地存储加载
      const savedSettings = localStorage.getItem('system_settings');
      if (savedSettings) {
        try {
          const parsedSettings = JSON.parse(savedSettings);
          // 合并默认设置以确保完整性
          const mergedSettings = {
            ...defaultSettings,
            ...parsedSettings,
            llm: {
              ...defaultSettings.llm,
              ...parsedSettings.llm,
              reasoning: {
                ...defaultSettings.llm.reasoning,
                ...parsedSettings.llm?.reasoning
              },
              basic: {
                ...defaultSettings.llm.basic,
                ...parsedSettings.llm?.basic
              },
              vision: {
                ...defaultSettings.llm.vision,
                ...parsedSettings.llm?.vision
              }
            }
          };
          setSettings(mergedSettings);
        } catch (parseError) {
          console.error('解析本地设置失败:', parseError);
          setSettings(defaultSettings);
        }
      }
    } catch (error) {
      console.error('加载设置失败:', error);
      setSettings(defaultSettings);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    setMessage('');

    try {
      // 保存到本地存储
      localStorage.setItem('system_settings', JSON.stringify(settings));
      
      // 保存到后端
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          const response = await fetch('http://localhost:8000/api/settings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(settings)
          });
          
          if (response.ok) {
             const result = await response.json();
             if (result.success) {
               setSyncStatus('synced');
               setMessage('设置保存成功！（已同步到云端）');
             } else {
               setSyncStatus('local');
               setMessage('设置已保存到本地，但云端同步失败');
             }
           } else if (response.status === 401) {
             const errorData = await response.json();
             if (errorData.detail?.includes('已过期')) {
               // Token过期，尝试刷新
               const refreshed = await refreshToken();
               if (refreshed) {
                 // 刷新成功，重新保存设置
                 return saveSettings();
               }
             }
             // Token无效或刷新失败
             localStorage.removeItem('auth_token');
             setSyncStatus('local');
             setMessage('登录已过期，设置已保存到本地');
           } else {
             setSyncStatus('local');
             setMessage('设置已保存到本地，但云端同步失败');
           }
         } catch (syncError) {
           console.error('云端同步失败:', syncError);
           setSyncStatus('local');
           setMessage('设置已保存到本地，但云端同步失败');
         }
       } else {
         setSyncStatus('local');
         setMessage('设置保存成功！（仅本地存储）');
       }
    } catch (error) {
      console.error('保存设置失败:', error);
      setMessage('保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const loadFromEnv = () => {
    setSettings(defaultSettings);
    setMessage('已从环境变量加载默认配置');
    setSyncStatus('local');
  };

  const syncToCloud = async () => {
    if (!localStorage.getItem('auth_token')) {
      setMessage('请先登录以同步设置到云端');
      return;
    }

    setSyncStatus('syncing');
    setMessage('正在同步到云端...');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:8000/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSyncStatus('synced');
          setMessage('设置已成功同步到云端');
        } else {
          setSyncStatus('error');
          setMessage('同步失败：' + result.message);
        }
      } else if (response.status === 401) {
        const errorData = await response.json();
        if (errorData.detail?.includes('已过期')) {
          // Token过期，尝试刷新
          const refreshed = await refreshToken();
          if (refreshed) {
            // 刷新成功，重新同步
            return syncToCloud();
          }
        }
        // Token无效或刷新失败
        localStorage.removeItem('auth_token');
        setSyncStatus('error');
        setMessage('登录已过期，请重新登录后同步');
      } else {
        setSyncStatus('error');
        setMessage('同步失败，请稍后重试');
      }
    } catch (error) {
      console.error('同步失败:', error);
      setSyncStatus('error');
      setMessage('同步失败，请稍后重试');
    }
  };

  const testProxyConnectivity = async () => {
    const urlInput = document.getElementById('proxy-test-url') as HTMLInputElement;
    const resultDiv = document.getElementById('proxy-test-result');
    
    if (!urlInput || !resultDiv) return;
    
    const testUrl = urlInput.value.trim();
    if (!testUrl) {
      resultDiv.innerHTML = '<span class="text-red-600">请输入测试URL</span>';
      return;
    }
    
    resultDiv.innerHTML = '<span class="text-blue-600">正在测试连接...</span>';
    
    try {
      const response = await fetch('http://localhost:8000/api/proxy/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_url: testUrl,
          proxy_strategy: settings.browser.proxy_strategy,
          proxy_server: settings.browser.proxy_server,
          proxy_username: settings.browser.proxy_username,
          proxy_password: settings.browser.proxy_password,
          proxy_type: settings.browser.proxy_type,
          auto_detect_proxy: settings.browser.auto_detect_proxy,
          domestic_direct: settings.browser.domestic_direct,
          proxy_whitelist: settings.browser.proxy_whitelist,
          proxy_blacklist: settings.browser.proxy_blacklist
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        const proxyInfo = result.proxy_config ? `使用代理: ${result.proxy_config.server}` : '直连';
        resultDiv.innerHTML = `
          <div class="text-green-600">
            <div>✓ 连接成功 (${result.response_time?.toFixed(2)}s)</div>
            <div class="text-sm text-gray-600">${proxyInfo}</div>
          </div>
        `;
      } else {
        resultDiv.innerHTML = `<span class="text-red-600">✗ ${result.message}</span>`;
      }
    } catch (error) {
      resultDiv.innerHTML = `<span class="text-red-600">✗ 测试失败: ${error}</span>`;
    }
  };
  
  const autoDetectProxy = async () => {
    const resultDiv = document.getElementById('proxy-test-result');
    if (!resultDiv) return;
    
    resultDiv.innerHTML = '<span class="text-blue-600">正在自动检测代理...</span>';
    
    try {
      const response = await fetch('http://localhost:8000/api/proxy/auto-detect');
      const result = await response.json();
      
      if (result.success) {
        updateBrowserConfig('proxy_server', result.proxy_server);
        updateBrowserConfig('proxy_strategy', 'auto');
        resultDiv.innerHTML = `
          <div class="text-green-600">
            <div>✓ 检测到系统代理: ${result.proxy_server}</div>
            <div class="text-sm text-gray-600">已自动填入代理服务器地址</div>
          </div>
        `;
      } else {
        resultDiv.innerHTML = `<span class="text-yellow-600">⚠ ${result.message}</span>`;
      }
    } catch (error) {
      resultDiv.innerHTML = `<span class="text-red-600">✗ 自动检测失败: ${error}</span>`;
    }
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    setMessage('设置已重置为默认值');
  };

  const validateApiKey = (apiKey: string): boolean => {
    if (!apiKey || apiKey.trim() === '') return false;
    // 检查是否为占位符
    if (apiKey.includes('your-key-here') || apiKey.includes('sk-xxx')) return false;
    // 基本长度检查
    return apiKey.length >= 10;
  };

  const validateUrl = (url: string): boolean => {
    if (!url || url.trim() === '') return true; // URL可以为空
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validateTemperature = (temp: number): boolean => {
    return temp >= 0 && temp <= 2;
  };

  const validateMaxTokens = (tokens: number): boolean => {
    return tokens > 0 && tokens <= 100000;
  };

  const updateLLMConfig = (type: keyof MultiLLMConfig, field: keyof LLMConfig, value: any) => {
    // 验证输入值
    let isValid = true;
    let errorMessage = '';

    if (field === 'api_key' && !validateApiKey(value)) {
      isValid = false;
      errorMessage = 'API Key格式无效或为占位符';
    } else if (field === 'base_url' && !validateUrl(value)) {
      isValid = false;
      errorMessage = 'Base URL格式无效';
    } else if (field === 'temperature' && !validateTemperature(value)) {
      isValid = false;
      errorMessage = 'Temperature必须在0-2之间';
    } else if (field === 'max_tokens' && !validateMaxTokens(value)) {
      isValid = false;
      errorMessage = 'Max Tokens必须在1-100000之间';
    }

    if (!isValid) {
      setMessage(errorMessage);
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setSettings(prev => ({
      ...prev,
      llm: {
        ...defaultSettings.llm,
        ...prev.llm,
        [type]: { 
          ...defaultSettings.llm[type],
          ...(prev.llm?.[type] || {}), 
          [field]: value 
        }
      }
    }));
    
    // 清除之前的错误消息
    if (message && !message.includes('成功')) {
      setMessage('');
    }
  };

  const validateCrawlerConfig = (field: keyof CrawlerConfig, value: any): { isValid: boolean; errorMessage: string } => {
    switch (field) {
      case 'max_pages':
        if (typeof value !== 'number' || value < 1 || value > 1000) {
          return { isValid: false, errorMessage: '最大页面数必须在1-1000之间' };
        }
        break;
      case 'timeout':
        if (typeof value !== 'number' || value < 1 || value > 300) {
          return { isValid: false, errorMessage: '超时时间必须在1-300秒之间' };
        }
        break;
      case 'delay':
        if (typeof value !== 'number' || value < 0 || value > 10) {
          return { isValid: false, errorMessage: '请求延迟必须在0-10秒之间' };
        }
        break;
      case 'user_agent':
        if (typeof value === 'string' && value.length > 500) {
          return { isValid: false, errorMessage: 'User Agent长度不能超过500字符' };
        }
        break;
      case 'tavily_api_key':
        if (typeof value === 'string' && value.trim() !== '' && !validateApiKey(value)) {
          return { isValid: false, errorMessage: 'Tavily API Key格式无效' };
        }
        break;
    }
    return { isValid: true, errorMessage: '' };
  };

  const updateCrawlerConfig = (field: keyof CrawlerConfig, value: any) => {
    const validation = validateCrawlerConfig(field, value);
    if (!validation.isValid) {
      setMessage(validation.errorMessage);
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setSettings(prev => ({
      ...prev,
      crawler: { ...prev.crawler, [field]: value }
    }));
    
    // 清除之前的错误消息
    if (message && !message.includes('成功')) {
      setMessage('');
    }
  };

  const validateBrowserConfig = (field: keyof BrowserConfig, value: any): { isValid: boolean; errorMessage: string } => {
    switch (field) {
      case 'proxy_url':
        if (typeof value === 'string' && value.trim() !== '' && !validateUrl(value)) {
          return { isValid: false, errorMessage: '代理URL格式无效' };
        }
        break;
      case 'proxy_username':
      case 'proxy_password':
        if (typeof value === 'string' && value.length > 100) {
          return { isValid: false, errorMessage: '代理用户名/密码长度不能超过100字符' };
        }
        break;
    }
    return { isValid: true, errorMessage: '' };
  };

  const updateBrowserConfig = (field: keyof BrowserConfig, value: any) => {
    const validation = validateBrowserConfig(field, value);
    if (!validation.isValid) {
      setMessage(validation.errorMessage);
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setSettings(prev => ({
      ...prev,
      browser: { ...prev.browser, [field]: value }
    }));
    
    // 清除之前的错误消息
    if (message && !message.includes('成功')) {
      setMessage('');
    }
  };

  const tabs = [
    { id: 'llm', label: '大模型设置', icon: CpuChipIcon },
    { id: 'crawler', label: '爬虫设置', icon: GlobeAltIcon },
    { id: 'browser', label: '浏览器设置', icon: CommandLineIcon }
  ];

  const llmTabs = [
    { id: 'reasoning', label: '推理模型', description: '用于复杂推理任务' },
    { id: 'basic', label: '基础模型', description: '用于一般任务' },
    { id: 'vision', label: '视觉模型', description: '用于图像理解任务' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部导航 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900">系统设置</h1>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 说明区域 */}
        <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-blue-800 mb-1">配置说明</h3>
              <div className="text-sm text-blue-700">
                <p className="mb-2"><strong>配置优先级</strong>：前端页面设置 > 云端同步设置 > 本地存储 > 环境变量默认值</p>
                <p className="mb-2">• 在此页面的所有设置都具有<strong>最高优先级</strong>，将覆盖所有其他配置源</p>
                <p className="mb-2">• 开源版本无需配置.env文件，所有参数都可通过此界面完成设置</p>
                <p className="mb-2">• 设置会自动保存到本地存储，登录用户还可同步到云端</p>
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <p className="font-medium mb-1">模型类型说明：</p>
                  <p>• <strong>推理模型</strong>：用于复杂推理任务（如数学、逻辑推理）</p>
                  <p>• <strong>基础模型</strong>：用于一般对话和文本生成任务</p>
                  <p>• <strong>视觉模型</strong>：用于图像理解和多模态任务</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-8">
          {/* 侧边栏 */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4">
                <h2 className="font-medium text-gray-900 mb-4">设置分类</h2>
                <nav className="space-y-2">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                          activeTab === tab.id
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-sm font-medium">{tab.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>
          </div>

          {/* 主要内容 */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6">
                {/* 同步状态指示器 */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${
                        syncStatus === 'synced' ? 'bg-green-500' :
                        syncStatus === 'syncing' ? 'bg-yellow-500 animate-pulse' :
                        syncStatus === 'error' ? 'bg-red-500' :
                        'bg-gray-400'
                      }`}></div>
                      <span className="text-sm text-gray-600">
                        {syncStatus === 'synced' ? '已同步到云端' :
                         syncStatus === 'syncing' ? '正在同步...' :
                         syncStatus === 'error' ? '同步失败' :
                         '仅本地存储'}
                      </span>
                    </div>
                    {syncStatus !== 'syncing' && syncStatus !== 'synced' && (
                      <button
                        onClick={syncToCloud}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        同步到云端
                      </button>
                    )}
                  </div>
                </div>

                {message && (
                  <div className={`mb-6 p-4 rounded-lg flex items-center space-x-2 ${
                    message.includes('成功') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {message.includes('成功') ? (
                      <CheckIcon className="w-5 h-5" />
                    ) : (
                      <ExclamationTriangleIcon className="w-5 h-5" />
                    )}
                    <span>{message}</span>
                  </div>
                )}

                {/* 大模型设置 */}
                {activeTab === 'llm' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">大模型配置</h3>
                      
                      {/* LLM子标签页 */}
                      <div className="mb-6">
                        <div className="border-b border-gray-200">
                          <nav className="-mb-px flex space-x-8">
                            {llmTabs.map((tab) => (
                              <button
                                key={tab.id}
                                onClick={() => setActiveLLMTab(tab.id)}
                                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                  activeLLMTab === tab.id
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                              >
                                <div className="text-center">
                                  <div>{tab.label}</div>
                                  <div className="text-xs text-gray-400 mt-1">{tab.description}</div>
                                </div>
                              </button>
                            ))}
                          </nav>
                        </div>
                      </div>

                      {/* 当前选中的LLM配置 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            服务提供商
                          </label>
                          <select
                            value={settings.llm?.[activeLLMTab as keyof MultiLLMConfig]?.provider || defaultSettings.llm[activeLLMTab as keyof MultiLLMConfig].provider}
                            onChange={(e) => updateLLMConfig(activeLLMTab as keyof MultiLLMConfig, 'provider', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            {llmProviders.map((provider) => (
                              <option key={provider.value} value={provider.value}>
                                {provider.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            模型
                          </label>
                          <select
                            value={settings.llm?.[activeLLMTab as keyof MultiLLMConfig]?.model || defaultSettings.llm[activeLLMTab as keyof MultiLLMConfig].model}
                            onChange={(e) => updateLLMConfig(activeLLMTab as keyof MultiLLMConfig, 'model', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            {modelOptions[settings.llm?.[activeLLMTab as keyof MultiLLMConfig]?.provider || defaultSettings.llm[activeLLMTab as keyof MultiLLMConfig].provider]?.map((model) => (
                              <option key={model} value={model}>
                                {model}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            API Key
                          </label>
                          <input
                            type="password"
                            value={settings.llm?.[activeLLMTab as keyof MultiLLMConfig]?.api_key || defaultSettings.llm[activeLLMTab as keyof MultiLLMConfig].api_key}
                            onChange={(e) => updateLLMConfig(activeLLMTab as keyof MultiLLMConfig, 'api_key', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="请输入API Key"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Base URL
                          </label>
                          <input
                            type="url"
                            value={settings.llm?.[activeLLMTab as keyof MultiLLMConfig]?.base_url || defaultSettings.llm[activeLLMTab as keyof MultiLLMConfig].base_url}
                            onChange={(e) => updateLLMConfig(activeLLMTab as keyof MultiLLMConfig, 'base_url', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="API基础URL"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Temperature ({settings.llm?.[activeLLMTab as keyof MultiLLMConfig]?.temperature ?? defaultSettings.llm[activeLLMTab as keyof MultiLLMConfig].temperature})
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.1"
                            value={settings.llm?.[activeLLMTab as keyof MultiLLMConfig]?.temperature ?? defaultSettings.llm[activeLLMTab as keyof MultiLLMConfig].temperature}
                            onChange={(e) => updateLLMConfig(activeLLMTab as keyof MultiLLMConfig, 'temperature', parseFloat(e.target.value))}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>保守</span>
                            <span>创造性</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            最大Token数
                          </label>
                          <input
                            type="number"
                            value={settings.llm?.[activeLLMTab as keyof MultiLLMConfig]?.max_tokens ?? defaultSettings.llm[activeLLMTab as keyof MultiLLMConfig].max_tokens}
                            onChange={(e) => updateLLMConfig(activeLLMTab as keyof MultiLLMConfig, 'max_tokens', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            min="1"
                            max="32768"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 爬虫设置 */}
                {activeTab === 'crawler' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">爬虫配置</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            最大页面数
                          </label>
                          <input
                            type="number"
                            value={settings.crawler.max_pages}
                            onChange={(e) => updateCrawlerConfig('max_pages', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            min="1"
                            max="100"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            超时时间（秒）
                          </label>
                          <input
                            type="number"
                            value={settings.crawler.timeout}
                            onChange={(e) => updateCrawlerConfig('timeout', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            min="5"
                            max="300"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            请求延迟（秒）
                          </label>
                          <input
                            type="number"
                            value={settings.crawler.delay}
                            onChange={(e) => updateCrawlerConfig('delay', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            min="0"
                            max="10"
                          />
                        </div>

                        <div>
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={settings.crawler.enable_javascript}
                              onChange={(e) => updateCrawlerConfig('enable_javascript', e.target.checked)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-700">启用JavaScript</span>
                          </label>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            User Agent
                          </label>
                          <input
                            type="text"
                            value={settings.crawler.user_agent}
                            onChange={(e) => updateCrawlerConfig('user_agent', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="浏览器标识"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tavily API Key
                          </label>
                          <input
                            type="password"
                            value={settings.crawler.tavily_api_key}
                            onChange={(e) => updateCrawlerConfig('tavily_api_key', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="用于搜索功能"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Jina API Key
                          </label>
                          <input
                            type="password"
                            value={settings.crawler.jina_api_key}
                            onChange={(e) => updateCrawlerConfig('jina_api_key', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="用于内容提取（可选）"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            搜索结果数量
                          </label>
                          <input
                            type="number"
                            value={settings.crawler.max_search_results}
                            onChange={(e) => updateCrawlerConfig('max_search_results', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            min="1"
                            max="20"
                            placeholder="每次搜索返回的结果数量"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 浏览器设置 */}
                {activeTab === 'browser' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">浏览器配置</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={settings.browser.headless}
                              onChange={(e) => updateBrowserConfig('headless', e.target.checked)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-700">无头模式</span>
                          </label>
                          <p className="text-xs text-gray-500 mt-1">启用后浏览器将在后台运行</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            窗口大小
                          </label>
                          <select
                            value={settings.browser.window_size}
                            onChange={(e) => updateBrowserConfig('window_size', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="1920x1080">1920x1080</option>
                            <option value="1366x768">1366x768</option>
                            <option value="1280x720">1280x720</option>
                            <option value="800x600">800x600</option>
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            浏览器路径
                          </label>
                          <div className="space-y-2">
                            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                              <div className="flex items-start space-x-2">
                                <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                <div>
                                  <p className="font-medium text-blue-800">默认使用 Playwright 内置 Chromium</p>
                                  <p className="text-blue-700">为避免与本地Chrome冲突，系统默认使用独立的Chromium实例。如需使用特定浏览器，请在下方输入路径。</p>
                                </div>
                              </div>
                            </div>
                            <input
                              type="text"
                              value={settings.browser.chrome_path}
                              onChange={(e) => updateBrowserConfig('chrome_path', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="自定义浏览器路径（留空使用默认Chromium）"
                            />
                          </div>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            代理策略
                          </label>
                          <select
                            value={settings.browser.proxy_strategy}
                            onChange={(e) => updateBrowserConfig('proxy_strategy', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="smart">智能代理（推荐）</option>
                            <option value="auto">自动检测</option>
                            <option value="manual">手动配置</option>
                            <option value="direct">直连</option>
                          </select>
                          <p className="text-sm text-gray-500 mt-1">
                            智能代理：国外网站使用代理，国内网站直连；自动检测：系统自动检测代理设置
                          </p>
                        </div>

                        {settings.browser.proxy_strategy !== 'direct' && (
                          <>
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                代理类型
                              </label>
                              <select
                                value={settings.browser.proxy_type}
                                onChange={(e) => updateBrowserConfig('proxy_type', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value="http">HTTP</option>
                                <option value="https">HTTPS</option>
                                <option value="socks4">SOCKS4</option>
                                <option value="socks5">SOCKS5</option>
                              </select>
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                代理服务器
                              </label>
                              <input
                                type="text"
                                value={settings.browser.proxy_server}
                                onChange={(e) => updateBrowserConfig('proxy_server', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="127.0.0.1:8080"
                                disabled={settings.browser.proxy_strategy === 'auto' && settings.browser.auto_detect_proxy}
                              />
                              {settings.browser.proxy_strategy === 'auto' && (
                                <div className="mt-2">
                                  <label className="flex items-center">
                                    <input
                                      type="checkbox"
                                      checked={settings.browser.auto_detect_proxy}
                                      onChange={(e) => updateBrowserConfig('auto_detect_proxy', e.target.checked)}
                                      className="mr-2"
                                    />
                                    <span className="text-sm text-gray-600">自动检测系统代理设置</span>
                                  </label>
                                </div>
                              )}
                            </div>
                          </>
                        )}

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            代理用户名
                          </label>
                          <input
                            type="text"
                            value={settings.browser.proxy_username}
                            onChange={(e) => updateBrowserConfig('proxy_username', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="代理用户名（可选）"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            代理密码
                          </label>
                          <input
                            type="password"
                            value={settings.browser.proxy_password}
                            onChange={(e) => updateBrowserConfig('proxy_password', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="代理密码（可选）"
                          />
                        </div>

                        {/* 智能代理高级配置 */}
                         {settings.browser.proxy_strategy === 'smart' && (
                           <div className="md:col-span-2 bg-blue-50 p-4 rounded-lg">
                             <h4 className="font-medium text-gray-800 mb-3">智能代理配置</h4>
                             
                             <div className="space-y-3">
                               <label className="flex items-center">
                                 <input
                                   type="checkbox"
                                   checked={settings.browser.domestic_direct}
                                   onChange={(e) => updateBrowserConfig('domestic_direct', e.target.checked)}
                                   className="mr-2"
                                 />
                                 <span className="text-sm text-gray-700">国内网站直连（推荐）</span>
                               </label>
                               
                               <div>
                                 <label className="block text-sm font-medium text-gray-700 mb-1">
                                   代理白名单（强制使用代理的域名）
                                 </label>
                                 <textarea
                                   value={settings.browser.proxy_whitelist.join('\n')}
                                   onChange={(e) => updateBrowserConfig('proxy_whitelist', e.target.value.split('\n').filter(line => line.trim()))}
                                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                   placeholder="每行一个域名，例如：\ngoogle.com\nyoutube.com\ntwitter.com"
                                   rows={3}
                                 />
                               </div>
                               
                               <div>
                                 <label className="block text-sm font-medium text-gray-700 mb-1">
                                   代理黑名单（强制直连的域名）
                                 </label>
                                 <textarea
                                   value={settings.browser.proxy_blacklist.join('\n')}
                                   onChange={(e) => updateBrowserConfig('proxy_blacklist', e.target.value.split('\n').filter(line => line.trim()))}
                                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                   placeholder="每行一个域名，例如：\nbaidu.com\ntaobao.com\nweibo.com"
                                   rows={3}
                                 />
                               </div>
                             </div>
                           </div>
                         )}

                         {/* 代理测试功能 */}
                         {settings.browser.proxy_strategy !== 'direct' && (
                           <div className="md:col-span-2">
                             <div className="bg-gray-50 p-4 rounded-lg">
                               <h4 className="font-medium text-gray-800 mb-3">代理测试</h4>
                               <div className="flex space-x-2">
                                 <input
                                   type="text"
                                   placeholder="输入测试URL，例如：https://www.google.com"
                                   className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                   id="proxy-test-url"
                                 />
                                 <button
                                   onClick={() => testProxyConnectivity()}
                                   className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                 >
                                   测试连接
                                 </button>
                                 <button
                                   onClick={() => autoDetectProxy()}
                                   className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                 >
                                   自动检测
                                 </button>
                               </div>
                               <div id="proxy-test-result" className="mt-3 text-sm"></div>
                             </div>
                           </div>
                         )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="flex justify-between pt-6 border-t border-gray-200">
                  <div className="flex space-x-3">
                    <button
                      onClick={resetSettings}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      重置为默认
                    </button>
                    <button
                      onClick={loadFromEnv}
                      className="px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      从环境变量加载
                    </button>
                  </div>
                  <button
                    onClick={saveSettings}
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? '保存中...' : '保存设置'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
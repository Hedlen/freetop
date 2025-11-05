/**
 * 配置工具函数
 * 用于统一管理和读取用户配置，支持本地存储和云端同步
 */

export interface InputConfig {
  deepThinkingMode: boolean;
  searchBeforePlanning: boolean;
}

/**
 * 从localStorage读取本地配置
 * @returns 本地配置对象
 */
export function getLocalConfig(): InputConfig {
  const defaultConfig: InputConfig = {
    deepThinkingMode: false,
    searchBeforePlanning: false,
  };

  if (typeof window === 'undefined') {
    return defaultConfig;
  }

  try {
    const config = localStorage.getItem('langmanus.config.inputbox');
    if (!config) {
      return defaultConfig;
    }

    const parsedConfig = JSON.parse(config);
    return {
      deepThinkingMode: parsedConfig.deepThinkingMode ?? false,
      searchBeforePlanning: parsedConfig.searchBeforePlanning ?? false,
    };
  } catch (error) {
    console.error('Failed to parse local input config:', error);
    return defaultConfig;
  }
}

// 缓存相关变量
let configCache: { config: InputConfig | null; timestamp: number; token: string } | null = null;
const CACHE_DURATION = 30000; // 30秒缓存

/**
 * 从云端获取用户配置
 * @returns 云端配置对象或null（如果获取失败）
 */
export async function getCloudConfig(): Promise<InputConfig | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  const token = localStorage.getItem('auth_token');
  if (!token) {
    return null;
  }

  // 检查缓存
  const now = Date.now();
  if (configCache && 
      configCache.token === token && 
      (now - configCache.timestamp) < CACHE_DURATION) {
    return configCache.config;
  }

  try {
    const response = await fetch('/api/settings', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      const config = data.settings?.inputConfig ?? null;
      // 更新缓存
      configCache = {
        config,
        timestamp: now,
        token
      };
      return config;
    } else if (response.status === 401) {
      const errorData = await response.json();
      if (errorData.detail?.includes('已过期')) {
        // Token过期，尝试刷新
        const refreshed = await refreshToken();
        if (refreshed) {
          // 刷新成功，重新获取配置
          const newToken = localStorage.getItem('auth_token');
          if (newToken) {
            const retryResponse = await fetch('/api/settings', {
              headers: {
                'Authorization': `Bearer ${newToken}`,
                'Content-Type': 'application/json'
              }
            });
            if (retryResponse.ok) {
              const retryData = await retryResponse.json();
              const retryConfig = retryData.settings?.inputConfig ?? null;
              // 更新缓存
              configCache = {
                config: retryConfig,
                timestamp: Date.now(),
                token: newToken
              };
              return retryConfig;
            }
          }
        }
      }
      // Token无效或刷新失败
      localStorage.removeItem('auth_token');
      // 清除缓存
      configCache = null;
      return null;
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    console.warn('Failed to fetch cloud config:', error);
    // 清除缓存
    configCache = null;
    return null;
  }
}

// 刷新Token
async function refreshToken(): Promise<boolean> {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    return false;
  }

  try {
    const response = await fetch('/api/auth/refresh', {
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

/**
 * 获取输入框配置（优先级：云端配置 > 本地配置 > 默认配置）
 * @returns 配置对象
 */
export async function getInputConfig(): Promise<InputConfig> {
  // 对于已登录用户，优先使用云端配置
  const cloudConfig = await getCloudConfig();
  if (cloudConfig) {
    return cloudConfig;
  }

  // 降级到本地配置
  return getLocalConfig();
}

/**
 * 获取输入框配置（同步版本，仅使用本地配置）
 * @returns 本地配置对象
 */
export function getInputConfigSync(): InputConfig {
  return getLocalConfig();
}

/**
 * 保存配置到云端
 * @param config 要保存的配置
 * @returns 是否保存成功
 */
export async function saveCloudConfig(config: InputConfig): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  const token = localStorage.getItem('auth_token');
  if (!token) {
    return false;
  }

  try {
    const response = await fetch('/api/settings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputConfig: config
      })
    });

    if (response.ok) {
      // 保存成功后清除缓存，强制下次重新获取
      configCache = null;
      return true;
    } else if (response.status === 401) {
      const errorData = await response.json();
      if (errorData.detail?.includes('已过期')) {
        // Token过期，尝试刷新
        const refreshed = await refreshToken();
        if (refreshed) {
          // 刷新成功，重新保存配置
          return saveCloudConfig(config);
        }
      }
      // Token无效或刷新失败
      localStorage.removeItem('auth_token');
      // 清除缓存
      configCache = null;
      return false;
    } else {
      return false;
    }
  } catch (error) {
    console.warn('Failed to save config to cloud:', error);
    return false;
  }
}

/**
 * 保存输入框配置（本地 + 云端同步）
 * @param config 要保存的配置
 */
export async function saveInputConfig(config: InputConfig): Promise<void> {
  // 始终保存到本地存储
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('langmanus.config.inputbox', JSON.stringify(config));
    } catch (error) {
      console.error('Failed to save local input config:', error);
    }
  }

  // 如果用户已登录，同步到云端
  const cloudSaved = await saveCloudConfig(config);
  if (cloudSaved) {
    console.log('Config synced to cloud successfully');
  }
}

/**
 * 保存输入框配置（同步版本，仅保存到本地）
 * @param config 要保存的配置
 */
export function saveInputConfigSync(config: InputConfig): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem('langmanus.config.inputbox', JSON.stringify(config));
  } catch (error) {
    console.error('Failed to save local input config:', error);
  }
}

/**
 * 将本地配置迁移到云端（用户登录后调用）
 * @returns 是否迁移成功
 */
export async function migrateLocalConfigToCloud(): Promise<boolean> {
  const localConfig = getLocalConfig();
  const defaultConfig: InputConfig = {
    deepThinkingMode: false,
    searchBeforePlanning: false,
  };

  // 如果本地配置与默认配置不同，则进行迁移
  const hasCustomConfig = 
    localConfig.deepThinkingMode !== defaultConfig.deepThinkingMode ||
    localConfig.searchBeforePlanning !== defaultConfig.searchBeforePlanning;

  if (hasCustomConfig) {
    const success = await saveCloudConfig(localConfig);
    if (success) {
      console.log('Local config migrated to cloud successfully');
      return true;
    }
  }

  return false;
}

/**
 * 检查用户是否已登录
 * @returns 是否已登录
 */
export function isUserLoggedIn(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return !!localStorage.getItem('auth_token');
}
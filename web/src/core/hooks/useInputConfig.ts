/**
 * 输入配置管理Hook
 * 提供配置的读取、保存和同步功能
 */

import { useState, useEffect, useCallback } from 'react';

import {
  type InputConfig,
  getInputConfig,
  saveInputConfig,
  getInputConfigSync,
  saveInputConfigSync
} from '../utils/config';

import { useIsLoggedIn } from './useAuth';

export function useInputConfig() {
  const [config, setConfig] = useState<InputConfig>({
    deepThinkingMode: false,
    searchBeforePlanning: false
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const isLoggedIn = useIsLoggedIn();

  // 加载配置
  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const loadedConfig = await getInputConfig();
      setConfig(loadedConfig);
    } catch (error) {
      console.error('Failed to load config:', error);
      // 降级到同步版本
      const fallbackConfig = getInputConfigSync();
      setConfig(fallbackConfig);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始化加载配置
  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  // 登录状态/加载状态变化时重新加载配置
  useEffect(() => {
    if (!loading) {
      void loadConfig();
    }
  }, [isLoggedIn, loading, loadConfig]);

  // 保存配置
  const updateConfig = useCallback(async (newConfig: Partial<InputConfig>) => {
    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);

    if (isLoggedIn) {
      setSyncing(true);
      try {
        await saveInputConfig(updatedConfig);
      } catch (error) {
        console.error('Failed to save config:', error);
        // 降级到本地保存
        saveInputConfigSync(updatedConfig);
      } finally {
        setSyncing(false);
      }
    } else {
      // 未登录用户只保存到本地
      saveInputConfigSync(updatedConfig);
    }
  }, [config, isLoggedIn]);

  // 切换深度思考模式
  const toggleDeepThinking = useCallback(() => {
    void updateConfig({ deepThinkingMode: !config.deepThinkingMode });
  }, [config.deepThinkingMode, updateConfig]);

  // 切换搜索规划模式
  const toggleSearchPlanning = useCallback(() => {
    void updateConfig({ searchBeforePlanning: !config.searchBeforePlanning });
  }, [config.searchBeforePlanning, updateConfig]);

  // 重置配置
  const resetConfig = useCallback(() => {
    void updateConfig({
      deepThinkingMode: false,
      searchBeforePlanning: false
    });
  }, [updateConfig]);

  return {
    config,
    loading,
    syncing,
    updateConfig,
    toggleDeepThinking,
    toggleSearchPlanning,
    resetConfig,
    reload: loadConfig
  };
}

/**
 * 简化版配置Hook，仅提供当前配置值
 */
export function useInputConfigValue(): InputConfig {
  const [config, setConfig] = useState<InputConfig>({
    deepThinkingMode: false,
    searchBeforePlanning: false
  });
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (hasLoaded) return; // 避免重复加载
    
    const loadConfig = async () => {
      try {
        const loadedConfig = await getInputConfig();
        setConfig(loadedConfig);
      } catch (error) {
        console.error('Failed to load config:', error);
        const fallbackConfig = getInputConfigSync();
        setConfig(fallbackConfig);
      } finally {
        setHasLoaded(true);
      }
    };

    void loadConfig();
  }, [hasLoaded]);

  return config;
}
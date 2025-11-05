/**
 * 用户认证相关的React Hook
 * 提供登录状态检查、登录/登出处理等功能
 */

import { useState, useEffect, useCallback } from 'react';

import { migrateLocalConfigToCloud, getLocalConfig, getCloudConfig } from '../utils/config';

// 模拟用户数据接口
interface User {
  id: string;
  email: string;
  name?: string;
}

// 配置迁移状态
interface MigrationState {
  needed: boolean;
  localConfig: any;
  cloudConfig: any;
  completed: boolean;
}

// 检查认证状态
async function checkAuthStatus(): Promise<User | null> {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    return null;
  }

  try {
    const response = await fetch('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      return data.user;
    } else if (response.status === 401) {
      const errorData = await response.json();
      if (errorData.detail?.includes('已过期')) {
        // Token过期，尝试刷新
        const refreshed = await refreshToken();
        if (refreshed) {
          // 刷新成功，重新获取用户信息
          return checkAuthStatus();
        }
      }
      // Token无效或刷新失败，清除本地token
      localStorage.removeItem('auth_token');
      return null;
    } else {
      console.error('Failed to check auth status: HTTP', response.status);
      return null;
    }
  } catch (error) {
    console.error('Auth status check failed:', error);
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
      console.log('Token refreshed successfully');
      return true;
    } else {
      console.error('Token refresh failed:', response.status);
      return false;
    }
  } catch (error) {
    console.error('Token refresh error:', error);
    return false;
  }
}

// 用户登录
async function loginUser(email: string, password: string): Promise<User> {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.token) {
        localStorage.setItem('auth_token', data.token);
        return data.user;
      } else {
        throw new Error(data.message ?? 'Login failed');
      }
    } else {
      const errorData = await response.json();
      throw new Error(errorData.message ?? 'Login failed');
    }
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

// 用户登出
async function logoutUser(): Promise<void> {
  try {
    const token = localStorage.getItem('auth_token');
    if (token) {
      // 调用后端登出API（如果有的话）
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).catch(() => {
        // 忽略登出API错误，继续清除本地token
      });
    }
    localStorage.removeItem('auth_token');
  } catch (error) {
    console.error('Logout error:', error);
    // 即使出错也要清除本地token
    localStorage.removeItem('auth_token');
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [migrationState, setMigrationState] = useState<MigrationState>({
    needed: false,
    localConfig: null,
    cloudConfig: null,
    completed: false
  });

  // 检查是否需要配置迁移
  const checkMigrationNeeded = useCallback(async (): Promise<MigrationState> => {
    try {
      const localConfig = getLocalConfig();
      const cloudConfig = await getCloudConfig();
      
      const hasLocalConfig = (localConfig.deepThinkingMode ?? false) || (localConfig.searchBeforePlanning ?? false);
      const hasCloudConfig = (cloudConfig?.deepThinkingMode ?? false) || (cloudConfig?.searchBeforePlanning ?? false);
      const configsDiffer = 
        (localConfig.deepThinkingMode ?? false) !== (cloudConfig?.deepThinkingMode ?? false) ||
        (localConfig.searchBeforePlanning ?? false) !== (cloudConfig?.searchBeforePlanning ?? false);

      const needed = hasLocalConfig && (!hasCloudConfig || configsDiffer);
      
      return {
        needed,
        localConfig,
        cloudConfig,
        completed: false
      };
    } catch (error) {
      console.error('Failed to check migration status:', error);
      return {
        needed: false,
        localConfig: null,
        cloudConfig: null,
        completed: false
      };
    }
  }, []);

  // 执行配置迁移
  const performMigration = useCallback(async () => {
    try {
      await migrateLocalConfigToCloud();
      setMigrationState(prev => ({ ...prev, needed: false, completed: true }));
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }, []);

  // 跳过配置迁移
  const skipMigration = useCallback(() => {
    setMigrationState(prev => ({ ...prev, needed: false, completed: true }));
  }, []);

  // 检查认证状态
  const checkAuth = useCallback(async () => {
    setLoading(true);
    try {
      const currentUser = await checkAuthStatus();
      setUser(currentUser);
      const newIsLoggedIn = !!currentUser;
      
      // 如果用户刚登录，检查是否需要配置迁移
      if (currentUser && !isLoggedIn && newIsLoggedIn) {
        const migration = await checkMigrationNeeded();
        setMigrationState(migration);
      }
      
      setIsLoggedIn(newIsLoggedIn);
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setIsLoggedIn(false);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, checkMigrationNeeded]);

  // 登录
  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const user = await loginUser(email, password);
      setUser(user);
      setIsLoggedIn(true);
      
      // 登录成功后检查配置迁移
      const migration = await checkMigrationNeeded();
      setMigrationState(migration);
      
      await checkAuth();
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [checkMigrationNeeded, checkAuth]);

  // 登出
  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await logoutUser();
      setUser(null);
      setIsLoggedIn(false);
      
      await checkAuth();
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [checkAuth]);

  // 初始化检查认证状态
  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  return {
    user,
    isLoggedIn,
    loading,
    migrationState,
    performMigration,
    skipMigration,
    refresh: checkAuth,
    login,
    logout,
  };
}

/**
 * 简化版登录状态Hook
 */
export function useIsLoggedIn(): boolean {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const checkStatus = useCallback(async () => {
    const user = await checkAuthStatus();
    setIsLoggedIn(!!user);
  }, []);

  useEffect(() => {
    void checkStatus();
  }, [checkStatus]);

  return isLoggedIn;
}
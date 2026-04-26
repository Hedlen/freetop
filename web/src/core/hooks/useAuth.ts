/**
 * 用户认证相关的React Hook
 * 提供登录状态检查、登录/登出处理、邮箱验证等功能
 */

import { useState, useEffect, useCallback } from 'react';
import { authService, User, AuthResponse } from '@/core/services/authService';
import { migrateLocalConfigToCloud, getLocalConfig, getCloudConfig } from '../utils/config';

// 配置迁移状态
interface MigrationState {
  needed: boolean;
  localConfig: any;
  cloudConfig: any;
  completed: boolean;
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
      const isAuthenticated = authService.isAuthenticated();
      const currentUser = authService.getCurrentUser();
      
      setUser(currentUser);
      const newIsLoggedIn = isAuthenticated;
      
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
  const login = useCallback(async (username: string, password: string): Promise<AuthResponse> => {
    setLoading(true);
    try {
      const result = await authService.login(username, password);
      
      if (result.success && result.user) {
        setUser(result.user);
        setIsLoggedIn(true);
        
        // 登录成功后检查配置迁移
        const migration = await checkMigrationNeeded();
        setMigrationState(migration);
      }
      
      return result;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [checkMigrationNeeded]);

  // 注册
  const register = useCallback(async (username: string, email: string, password: string): Promise<AuthResponse> => {
    setLoading(true);
    try {
      const result = await authService.register(username, email, password);
      return result;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // 邮箱验证
  const verifyEmail = useCallback(async (email: string, verificationCode: string): Promise<AuthResponse> => {
    try {
      const result = await authService.verifyEmail(email, verificationCode);
      
      if (result.success && result.user) {
        setUser(result.user);
        setIsLoggedIn(true);
      }
      
      return result;
    } catch (error) {
      console.error('Email verification failed:', error);
      throw error;
    }
  }, []);

  // 重新发送验证邮件
  const resendVerificationEmail = useCallback(async (email: string): Promise<AuthResponse> => {
    try {
      return await authService.resendVerificationEmail(email);
    } catch (error) {
      console.error('Resend verification email failed:', error);
      throw error;
    }
  }, []);

  // 请求密码重置
  const requestPasswordReset = useCallback(async (email: string): Promise<AuthResponse> => {
    try {
      return await authService.requestPasswordReset(email);
    } catch (error) {
      console.error('Password reset request failed:', error);
      throw error;
    }
  }, []);

  // 确认密码重置
  const confirmPasswordReset = useCallback(async (resetToken: string, newPassword: string): Promise<AuthResponse> => {
    try {
      return await authService.confirmPasswordReset(resetToken, newPassword);
    } catch (error) {
      console.error('Password reset confirmation failed:', error);
      throw error;
    }
  }, []);

  // 登出
  const logout = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      await authService.logout();
      setUser(null);
      setIsLoggedIn(false);
      setMigrationState({ needed: false, localConfig: null, cloudConfig: null, completed: false });
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // 检查订阅状态
  const hasActiveSubscription = useCallback(async (): Promise<boolean> => {
    return await authService.hasActiveSubscription();
  }, []);

  const hasActiveTrial = useCallback(async (): Promise<boolean> => {
    return await authService.hasActiveTrial();
  }, []);

  const canAccessService = useCallback(async (): Promise<{ canAccess: boolean; reason: string }> => {
    return await authService.canAccessService();
  }, []);

  // 初始化检查认证状态
  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  // 监听认证状态变化
  useEffect(() => {
    const handleAuthChange = () => {
      void checkAuth();
    };

    authService.addAuthListener(handleAuthChange);

    return () => {
      authService.removeAuthListener(handleAuthChange);
    };
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
    register,
    verifyEmail,
    resendVerificationEmail,
    requestPasswordReset,
    confirmPasswordReset,
    logout,
    hasActiveSubscription,
    hasActiveTrial,
    canAccessService,
  };
}

/**
 * 简化版登录状态Hook
 */
export function useIsLoggedIn(): boolean {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  const checkStatus = useCallback(() => {
    const authenticated = authService.isAuthenticated();
    setIsLoggedIn(authenticated);
  }, []);

  useEffect(() => {
    checkStatus();
    
    const handleAuthChange = () => {
      checkStatus();
    };

    authService.addAuthListener(handleAuthChange);

    return () => {
      authService.removeAuthListener(handleAuthChange);
    };
  }, [checkStatus]);

  return isLoggedIn;
}
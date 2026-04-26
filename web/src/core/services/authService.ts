// 认证服务
// 提供安全的用户认证、会话管理、权限验证等功能

// 通用JWT解析（无需外部依赖）
function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '==='.slice((base64.length + 3) % 4);
  try {
    if (typeof window === 'undefined') {
      // Node/SSR 环境
      return Buffer.from(padded, 'base64').toString('utf-8');
    }
    // 浏览器环境
    return atob(padded);
  } catch (e) {
    return '';
  }
}

function decodeJwt<T>(token: string): T {
  const parts = token.split('.');
  if (parts.length < 2) throw new Error('Invalid JWT');
  const json = base64UrlDecode(parts[1]);
  return JSON.parse(json) as T;
}
import { useState, useEffect } from 'react';

// JWT令牌接口
interface JWTPayload {
  user_id: number;
  username: string;
  token_type: 'access' | 'refresh';
  exp: number;
  iat: number;
}

// 认证响应接口
interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
  token?: string;
  refresh_token?: string;
}

// 用户接口
interface User {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

// 会话状态接口
interface SessionState {
  isAuthenticated: boolean;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
}

// 认证服务类
class AuthService {
  private static instance: AuthService;
  private sessionState: SessionState;
  private refreshTimeout: NodeJS.Timeout | null = null;
  private sessionCheckInterval: NodeJS.Timeout | null = null;
  
  private constructor() {
    this.sessionState = this.loadSessionFromStorage();
    this.setupSessionMonitoring();
  }
  
  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }
  
  /**
   * 从本地存储加载会话
   */
  private loadSessionFromStorage(): SessionState {
    try {
      if (typeof window === 'undefined') {
        return {
          isAuthenticated: false,
          user: null,
          accessToken: null,
          refreshToken: null,
          expiresAt: null
        };
      }
      const accessToken = localStorage.getItem('auth_token');
      const refreshToken = localStorage.getItem('refresh_token');
      const userStr = localStorage.getItem('user_info');
      
      if (!accessToken || !userStr) {
        return {
          isAuthenticated: false,
          user: null,
          accessToken: null,
          refreshToken: null,
          expiresAt: null
        };
      }
      
      const user = JSON.parse(userStr);
      const decoded = decodeJwt<JWTPayload>(accessToken);
      const expiresAt = decoded.exp * 1000; // 转换为毫秒
      
      return {
        isAuthenticated: true,
        user,
        accessToken,
        refreshToken,
        expiresAt
      };
    } catch (error) {
      console.error('Failed to load session from storage:', error);
      this.clearSession();
      return {
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        expiresAt: null
      };
    }
  }
  
  /**
   * 保存会话到本地存储
   */
  private saveSessionToStorage(): void {
    try {
      if (typeof window === 'undefined') return;
      if (this.sessionState.accessToken) {
        localStorage.setItem('auth_token', this.sessionState.accessToken);
      } else {
        localStorage.removeItem('auth_token');
      }
      
      if (this.sessionState.refreshToken) {
        localStorage.setItem('refresh_token', this.sessionState.refreshToken);
      } else {
        localStorage.removeItem('refresh_token');
      }
      
      if (this.sessionState.user) {
        localStorage.setItem('user_info', JSON.stringify(this.sessionState.user));
      } else {
        localStorage.removeItem('user_info');
      }
    } catch (error) {
      console.error('Failed to save session to storage:', error);
    }
  }
  
  /**
   * 清除会话
   */
  private clearSession(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_info');
    }
    
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
    
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
  }
  
  /**
   * 设置会话监控
   */
  private setupSessionMonitoring(): void {
    if (typeof window === 'undefined') return;
    // 每分钟检查一次会话状态
    this.sessionCheckInterval = setInterval(() => {
      this.checkSessionValidity();
    }, 60000); // 60秒
    
    // 设置令牌刷新定时器
    this.scheduleTokenRefresh();
  }
  
  /**
   * 检查会话有效性
   */
  private checkSessionValidity(): void {
    if (!this.sessionState.isAuthenticated || !this.sessionState.expiresAt) {
      return;
    }
    
    const now = Date.now();
    const timeUntilExpiry = this.sessionState.expiresAt - now;
    
    // 如果令牌已过期，尝试刷新
    if (timeUntilExpiry <= 0) {
      this.refreshAccessToken();
    } else if (timeUntilExpiry < 300000) { // 5分钟内过期，提前刷新
      this.refreshAccessToken();
    }
  }
  
  /**
   * 设置令牌刷新定时器
   */
  private scheduleTokenRefresh(): void {
    if (!this.sessionState.isAuthenticated || !this.sessionState.expiresAt) {
      return;
    }
    
    const now = Date.now();
    const timeUntilExpiry = this.sessionState.expiresAt - now;
    const refreshTime = Math.max(0, timeUntilExpiry - 300000); // 提前5分钟刷新
    
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }
    
    this.refreshTimeout = setTimeout(() => {
      this.refreshAccessToken();
    }, refreshTime);
  }
  
  /**
   * 检查是否已登录
   */
  public isAuthenticated(): boolean {
    return this.sessionState.isAuthenticated && this.isTokenValid();
  }
  
  /**
   * 检查令牌是否有效
   */
  private isTokenValid(): boolean {
    if (!this.sessionState.accessToken || !this.sessionState.expiresAt) {
      return false;
    }
    
    const now = Date.now();
    return now < this.sessionState.expiresAt;
  }
  
  /**
   * 获取当前用户
   */
  public getCurrentUser(): User | null {
    return this.sessionState.user;
  }
  
   /**
   * 获取访问令牌
   */
  public getAccessToken(): string | null {
    if (!this.isTokenValid()) {
      this.refreshAccessToken();
    }
    return this.sessionState.accessToken;
  }
  
  /**
   * 用户登录
   */
  public async login(username: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      
      const result = await response.json();
      
      if (result.success && result.token) {
        // 解析令牌
        const decoded = decodeJwt<JWTPayload>(result.token);
        const expiresAt = decoded.exp * 1000;
        
        // 更新会话状态
        this.sessionState = {
          isAuthenticated: true,
          user: result.user,
          accessToken: result.token,
          refreshToken: result.refresh_token || null,
          expiresAt
        };
        
        // 保存到本地存储
        this.saveSessionToStorage();
        
        // 设置令牌刷新
        this.scheduleTokenRefresh();
        
        // 触发登录事件
        this.dispatchAuthEvent('login', result.user);
        
        return {
          success: true,
          message: '登录成功',
          user: result.user,
          token: result.token,
          refresh_token: result.refresh_token
        };
      } else {
        return {
          success: false,
          message: result.message || '登录失败'
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: '网络错误，请检查连接'
      };
    }
  }
  
  /**
   * 用户注册
   */
  public async register(username: string, email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        // 注册成功后自动登录（不接邮箱验证流程）
        return await this.login(username, password);
      } else if (result.email_verification_required) {
        // 需要邮箱验证的情况
        return {
          success: true,
          message: result.message || '注册成功，请查看邮箱完成验证',
          email_verification_required: true
        };
      } else {
        return {
          success: false,
          message: result.message || '注册失败'
        };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: '网络错误，请检查连接'
      };
    }
  }

  /**
   * 验证邮箱
   */
  public async verifyEmail(email: string, verificationCode: string): Promise<AuthResponse> {
    try {
      const response = await fetch('/api/auth/email/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, verification_code: verificationCode }),
      });
      
      const result = await response.json();
      
      if (result.success && result.user) {
        // 验证成功后自动登录
        return await this.login(email, ''); // 这里需要重新登录获取令牌
      } else {
        return {
          success: result.success,
          message: result.message || '邮箱验证失败'
        };
      }
    } catch (error) {
      console.error('Email verification error:', error);
      return {
        success: false,
        message: '网络错误，请检查连接'
      };
    }
  }

  /**
   * 重新发送验证邮件
   */
  public async resendVerificationEmail(email: string): Promise<AuthResponse> {
    try {
      const response = await fetch('/api/auth/email/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      const result = await response.json();
      
      return {
        success: result.success,
        message: result.message || '操作失败'
      };
    } catch (error) {
      console.error('Resend verification email error:', error);
      return {
        success: false,
        message: '网络错误，请检查连接'
      };
    }
  }

  /**
   * 请求密码重置
   */
  public async requestPasswordReset(email: string): Promise<AuthResponse> {
    try {
      const response = await fetch('/api/auth/password/reset-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      const result = await response.json();
      
      return {
        success: result.success,
        message: result.message || '操作失败'
      };
    } catch (error) {
      console.error('Password reset request error:', error);
      return {
        success: false,
        message: '网络错误，请检查连接'
      };
    }
  }

  /**
   * 确认密码重置
   */
  public async confirmPasswordReset(resetToken: string, newPassword: string): Promise<AuthResponse> {
    try {
      const response = await fetch('/api/auth/password/reset-confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reset_token: resetToken, new_password: newPassword }),
      });
      
      const result = await response.json();
      
      return {
        success: result.success,
        message: result.message || '操作失败'
      };
    } catch (error) {
      console.error('Password reset confirm error:', error);
      return {
        success: false,
        message: '网络错误，请检查连接'
      };
    }
  }
  
  /**
   * 刷新访问令牌
   */
  public async refreshAccessToken(): Promise<boolean> {
    if (!this.sessionState.refreshToken) {
      this.logout();
      return false;
    }
    
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.sessionState.refreshToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.token) {
          // 解析新令牌
          const decoded = decodeJwt<JWTPayload>(result.token);
          const expiresAt = decoded.exp * 1000;
          
          // 更新会话状态
          this.sessionState.accessToken = result.token;
          this.sessionState.expiresAt = expiresAt;
          
          // 保存到本地存储
          this.saveSessionToStorage();
          
          // 重新设置刷新定时器
          this.scheduleTokenRefresh();
          
          return true;
        }
      }
      
      // 刷新失败，登出用户
      this.logout();
      return false;
      
    } catch (error) {
      console.error('Token refresh error:', error);
      this.logout();
      return false;
    }
  }
  
  /**
   * 用户登出
   */
  public async logout(): Promise<void> {
    try {
      if (this.sessionState.accessToken) {
        // 调用后端登出API
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.sessionState.accessToken}`,
            'Content-Type': 'application/json',
          },
        }).catch(() => {
          // 忽略登出API错误
        });
      }
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // 清除本地会话
      this.clearSession();
      
      // 重置会话状态
      this.sessionState = {
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        expiresAt: null
      };
      
      // 触发登出事件
      this.dispatchAuthEvent('logout', null);
    }
  }
  
  /**
   * 获取认证请求头
   */
  public getAuthHeaders(): Record<string, string> {
    const token = this.getAccessToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }
  
  /**
   * 检查用户是否有特定权限
   */
  public hasPermission(permission: string): boolean {
    if (!this.sessionState.user) {
      return false;
    }
    
    // 这里可以添加更复杂的权限逻辑
    // 例如检查用户角色、订阅等级等
    return true;
  }
  
  /**
   * 检查用户是否有有效订阅
   */
  public async hasActiveSubscription(): Promise<boolean> {
    if (!this.isAuthenticated()) {
      return false;
    }
    
    try {
      const response = await fetch('/api/subscription/status', {
        headers: this.getAuthHeaders(),
      });
      
      if (response.ok) {
        const result = await response.json();
        return result.is_active;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to check subscription status:', error);
      return false;
    }
  }
  
  /**
   * 检查用户是否有有效试用
   */
  public async hasActiveTrial(): Promise<boolean> {
    if (!this.isAuthenticated()) {
      return false;
    }
    
    try {
      const response = await fetch('/api/subscription/trial/status', {
        headers: this.getAuthHeaders(),
      });
      
      if (response.ok) {
        const result = await response.json();
        return result.is_active;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to check trial status:', error);
      return false;
    }
  }
  
  /**
   * 检查用户是否可以访问服务
   */
  public async canAccessService(): Promise<{ canAccess: boolean; reason: string }> {
    if (!this.isAuthenticated()) {
      return { canAccess: false, reason: 'not_authenticated' };
    }
    
    try {
      const response = await fetch('/api/subscription/check-access', {
        headers: this.getAuthHeaders(),
      });
      
      if (response.ok) {
        const result = await response.json();
        return {
          canAccess: result.can_access,
          reason: result.reason
        };
      }
      
      return { canAccess: false, reason: 'service_error' };
    } catch (error) {
      console.error('Failed to check service access:', error);
      return { canAccess: false, reason: 'network_error' };
    }
  }
  
  /**
   * 触发认证事件
   */
  private dispatchAuthEvent(eventType: string, user: User | null): void {
    if (typeof window === 'undefined') return;
    const event = new CustomEvent('authStateChanged', {
      detail: { eventType, user }
    });
    window.dispatchEvent(event);
  }
  
  /**
   * 添加认证事件监听器
   */
  public addAuthListener(callback: (event: CustomEvent) => void): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('authStateChanged', callback as EventListener);
  }
  
  /**
   * 移除认证事件监听器
   */
  public removeAuthListener(callback: (event: CustomEvent) => void): void {
    if (typeof window === 'undefined') return;
    window.removeEventListener('authStateChanged', callback as EventListener);
  }
}

// 导出单例实例
export const authService = AuthService.getInstance();

// 导出类型定义
export type { User, AuthResponse, SessionState };

// 导出Hook（供React组件使用）
export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
  const [user, setUser] = useState(authService.getCurrentUser());
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const handleAuthChange = (event: CustomEvent) => {
      setIsAuthenticated(authService.isAuthenticated());
      setUser(authService.getCurrentUser());
    };
    
    authService.addAuthListener(handleAuthChange);
    setLoading(false);
    
    return () => {
      authService.removeAuthListener(handleAuthChange);
    };
  }, []);
  
  return {
    isAuthenticated,
    user,
    loading,
    login: authService.login.bind(authService),
    logout: authService.logout.bind(authService),
    register: authService.register.bind(authService),
    verifyEmail: authService.verifyEmail.bind(authService),
    resendVerificationEmail: authService.resendVerificationEmail.bind(authService),
    requestPasswordReset: authService.requestPasswordReset.bind(authService),
    confirmPasswordReset: authService.confirmPasswordReset.bind(authService),
    hasActiveSubscription: authService.hasActiveSubscription.bind(authService),
    hasActiveTrial: authService.hasActiveTrial.bind(authService),
    canAccessService: authService.canAccessService.bind(authService),
  };
};

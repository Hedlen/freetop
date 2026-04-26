'use client';

import { useState } from 'react';
import { useAuth } from '@/core/hooks/useAuth';

import { cn } from '~/core/utils';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin?: (username: string, password: string) => boolean;
  onLoginSuccess?: (userData: any) => void;
}

export function LoginModal({ isOpen, onClose, onLogin, onLoginSuccess }: LoginModalProps) {
  const { login, register } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setInfo('');

    try {
      if (isLoginMode) {
        // 登录逻辑 - 基础验证
        if (!username || !password) {
          setError('请填写用户名和密码');
          return;
        }
        
        const result = await login(username, password);
        
        if (result.success && result.user) {
          onLogin?.(username, password);
          onLoginSuccess?.(result.user);
          onClose();
        } else {
          setError(result.message ?? '登录失败');
        }
      } else {
        // 注册逻辑 - 增强验证
        if (!username || !password || !email) {
          setError('请填写所有必填字段');
          return;
        }
        
        if (password !== confirmPassword) {
          setError('两次输入的密码不一致');
          return;
        }
        
        // 密码强度验证
        if (password.length < 8) {
          setError('密码长度至少为8位');
          return;
        }
        
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
          setError('密码必须包含大小写字母和数字');
          return;
        }
        
        // 邮箱格式验证
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          setError('请输入有效的邮箱地址');
          return;
        }
        
        // 用户名验证
        if (username.length < 3) {
          setError('用户名长度至少为3位');
          return;
        }
        
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
          setError('用户名只能包含字母、数字和下划线');
          return;
        }
        
        const result = await register(username, email, password);
        if (result.success) {
          if ((result as any).email_verification_required) {
            setInfo(result.message || '注册成功，请先完成邮箱验证再登录');
            setIsLoginMode(true);
          } else if (result.user) {
            onLoginSuccess?.(result.user);
            onClose();
          } else {
            setInfo('注册成功，请登录');
            setIsLoginMode(true);
          }
        } else {
          setError(result.message ?? '注册失败');
        }
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setError(isLoginMode ? '登录失败，请检查网络连接' : '注册失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLoginMode(!isLoginMode);
    setError('');
    setInfo('');
    // 清空表单
    if (!isLoginMode) {
      setEmail('');
      setConfirmPassword('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white border border-gray-200 rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">
            {isLoginMode ? '登录' : '注册'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              用户名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="请输入用户名"
              required
            />
          </div>

          {!isLoginMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                邮箱地址
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="请输入邮箱地址"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="请输入密码"
              required
            />
          </div>

          {!isLoginMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                确认密码
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="请再次输入密码"
                required
              />
            </div>
          )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
        {info && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {info}
          </div>
        )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {isLoginMode ? '登录中...' : '注册中...'}
              </div>
            ) : (
              isLoginMode ? '登录' : '注册'
            )}
          </button>
        </form>

        {/* Toggle */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            {isLoginMode ? '还没有账户？' : '已经有账户？'}
            <button
              onClick={switchMode}
              className="ml-1 text-blue-600 hover:text-blue-500 font-medium transition-colors"
            >
              {isLoginMode ? '立即注册' : '立即登录'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

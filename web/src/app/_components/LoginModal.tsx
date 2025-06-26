'use client';

import { useState } from 'react';
import { cn } from '~/core/utils';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin?: (username: string, password: string) => boolean;
  onLoginSuccess?: (userData: any) => void;
}

export function LoginModal({ isOpen, onClose, onLogin, onLoginSuccess }: LoginModalProps) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLoginMode) {
        // 登录逻辑
        if (!username || !password) {
          setError('请填写用户名和密码');
          return;
        }
        
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username,
            password,
          }),
        });
        
        const result = await response.json();
        
        if (result.success) {
          // 保存token到localStorage
          localStorage.setItem('auth_token', result.token);
          localStorage.setItem('user_info', JSON.stringify(result.user));
          
          // 调用父组件的登录回调
          if (onLogin) {
            onLogin(username, password);
          }
          if (onLoginSuccess) {
            onLoginSuccess(result.user);
          }
          onClose();
        } else {
          setError(result.message || '登录失败');
        }
      } else {
        // 注册逻辑
        if (!username || !password || !email) {
          setError('请填写所有必填字段');
          return;
        }
        
        if (password !== confirmPassword) {
          setError('两次输入的密码不一致');
          return;
        }
        
        if (password.length < 6) {
          setError('密码长度至少6位');
          return;
        }
        
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username,
            email,
            password,
          }),
        });
        
        const result = await response.json();
        
        if (result.success) {
          // 注册成功，自动登录
          localStorage.setItem('auth_token', result.token);
          localStorage.setItem('user_info', JSON.stringify(result.user));
          
          // 调用父组件的登录回调
          if (onLogin) {
            onLogin(username, password);
          }
          if (onLoginSuccess) {
            onLoginSuccess(result.user);
          }
          onClose();
        } else {
          setError(result.message || '注册失败');
        }
      }
    } catch (err) {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setEmail('');
    setError('');
  };

  const switchMode = () => {
    setIsLoginMode(!isLoginMode);
    resetForm();
  };

  if (!isOpen) return null;

  return (
    <div className={`modal-overlay ${isOpen ? 'opacity-100' : 'opacity-0'} p-2 sm:p-4`}>
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 模态框内容 */}
      <div className="relative w-full max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl mx-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl z-10">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/20">
          <h2 className="text-lg sm:text-xl font-semibold text-white">
            {isLoginMode ? '登录' : '注册'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* 表单内容 */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6">
          <div className="space-y-4">
            {/* 用户名 */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                用户名
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-all duration-200"
                placeholder="请输入用户名"
                required
              />
            </div>
            
            {/* 邮箱（仅注册时显示） */}
            {!isLoginMode && (
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  邮箱
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-all duration-200"
                  placeholder="请输入邮箱"
                  required
                />
              </div>
            )}
            
            {/* 密码 */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-all duration-200"
                placeholder="请输入密码"
                required
              />
            </div>
            
            {/* 确认密码（仅注册时显示） */}
            {!isLoginMode && (
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  确认密码
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-all duration-200"
                  placeholder="请再次输入密码"
                  required
                />
              </div>
            )}
            
            {/* 错误信息 */}
            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}
          </div>
          
          {/* 按钮组 */}
          <div className="mt-6 space-y-3">
            <button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full py-3 px-4 rounded-lg font-medium transition-all duration-200",
                loading
                  ? "bg-gray-500/50 text-gray-300 cursor-not-allowed"
                  : "bg-blue-500/80 hover:bg-blue-600/80 text-white shadow-lg hover:shadow-blue-500/25"
              )}
            >
              {loading ? '处理中...' : (isLoginMode ? '登录' : '注册')}
            </button>
            
            <button
              type="button"
              onClick={switchMode}
              className="w-full py-2 px-4 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors border border-white/20"
            >
              {isLoginMode ? '没有账号？立即注册' : '已有账号？立即登录'}
            </button>
          </div>
        </form>
        
        {/* 演示提示 */}
        <div className="px-6 pb-6">
          <div className="p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-200 text-xs text-center">
              演示版本：任意用户名和密码都可以登录
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
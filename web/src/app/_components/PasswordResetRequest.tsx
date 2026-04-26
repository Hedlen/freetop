'use client';

import { useState } from 'react';
import { useAuth } from '@/core/hooks/useAuth';
import { toast } from 'sonner';

interface PasswordResetRequestProps {
  onSuccess?: () => void;
}

export default function PasswordResetRequest({ onSuccess }: PasswordResetRequestProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { requestPasswordReset } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast.error('请输入有效的邮箱地址');
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await requestPasswordReset(email);
      
      if (result.success) {
        toast.success('密码重置邮件已发送，请查看您的邮箱');
        onSuccess?.();
      } else {
        toast.error(result.message || '发送失败');
      }
    } catch (error) {
      toast.error('发送失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">重置密码</h2>
        <p className="text-gray-600">
          输入您的邮箱地址，我们将发送密码重置链接给您
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            邮箱地址
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="请输入您的邮箱地址"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !email}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '发送中...' : '发送重置邮件'}
        </button>
      </form>

      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          重置链接有效期为1小时，请及时操作
        </p>
      </div>
    </div>
  );
}
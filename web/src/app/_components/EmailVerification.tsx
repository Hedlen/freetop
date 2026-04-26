'use client';

import { useState } from 'react';
import { useAuth } from '@/core/hooks/useAuth';
import { toast } from 'sonner';

interface EmailVerificationProps {
  email: string;
  onSuccess?: () => void;
  onResend?: () => void;
}

export default function EmailVerification({ email, onSuccess, onResend }: EmailVerificationProps) {
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { verifyEmail, resendVerificationEmail } = useAuth();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('请输入6位验证码');
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await verifyEmail(email, verificationCode);
      
      if (result.success) {
        toast.success('邮箱验证成功！');
        onSuccess?.();
      } else {
        toast.error(result.message || '验证码错误');
      }
    } catch (error) {
      toast.error('验证失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    
    try {
      const result = await resendVerificationEmail(email);
      
      if (result.success) {
        toast.success('验证邮件已重新发送');
        onResend?.();
      } else {
        toast.error(result.message || '重新发送失败');
      }
    } catch (error) {
      toast.error('重新发送失败，请重试');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">邮箱验证</h2>
        <p className="text-gray-600">
          我们已向 <span className="font-semibold text-blue-600">{email}</span> 发送了验证码
        </p>
        <p className="text-sm text-gray-500 mt-2">
          请输入6位验证码完成邮箱验证
        </p>
      </div>

      <form onSubmit={handleVerify} className="space-y-4">
        <div>
          <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 mb-2">
            验证码
          </label>
          <input
            id="verificationCode"
            type="text"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
            placeholder="请输入6位数字验证码"
            maxLength={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-lg font-mono tracking-widest"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || verificationCode.length !== 6}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '验证中...' : '验证邮箱'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600 mb-2">
          没有收到验证码？
        </p>
        <button
          onClick={handleResend}
          disabled={isResending}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isResending ? '发送中...' : '重新发送验证码'}
        </button>
      </div>

      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          验证码有效期为30分钟，请及时验证
        </p>
      </div>
    </div>
  );
}
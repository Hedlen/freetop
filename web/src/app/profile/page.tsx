'use client';

import { ArrowLeftIcon, CameraIcon, EnvelopeIcon, UserIcon, CreditCardIcon, CalendarIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getUserSubscription, UserSubscription } from '@/core/api/subscription';

interface User {
  id: number;
  username: string;
  email: string;
  avatar_url?: string;
  created_at: string;
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

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    avatar_url: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  useEffect(() => {
    // 检查用户登录状态
    const userInfo = localStorage.getItem('user_info');
    if (!userInfo) {
      router.push('/chat');
      return;
    }

    try {
      const parsedUser = JSON.parse(userInfo);
      setUser(parsedUser);
      setFormData({
        username: parsedUser.username ?? '',
        email: parsedUser.email ?? '',
        avatar_url: parsedUser.avatar_url ?? ''
      });
    } catch (error) {
      console.error('解析用户信息失败:', error);
      router.push('/chat');
    }
  }, [router]);

  // 获取用户订阅信息
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const subscriptionData = await getUserSubscription();
        setSubscription(subscriptionData);
      } catch (error) {
        console.error('获取订阅信息失败:', error);
      } finally {
        setSubscriptionLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getSubscriptionStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return { text: '活跃', color: 'bg-green-100 text-green-800' };
      case 'inactive':
        return { text: '未激活', color: 'bg-gray-100 text-gray-800' };
      case 'cancelled':
        return { text: '已取消', color: 'bg-red-100 text-red-800' };
      case 'expired':
        return { text: '已过期', color: 'bg-orange-100 text-orange-800' };
      default:
        return { text: '未知', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // 更新本地存储的用户信息
          const updatedUser = { ...user, ...formData };
          localStorage.setItem('user_info', JSON.stringify(updatedUser));
          setUser(updatedUser);
          setIsEditing(false);
          setMessage('个人信息更新成功！');
        } else {
          setMessage(result.message ?? '更新失败，请重试');
        }
      } else if (response.status === 401) {
        const errorData = await response.json();
        if (errorData.detail?.includes('已过期')) {
          // Token过期，尝试刷新
          const refreshed = await refreshToken();
          if (refreshed) {
            // 刷新成功，重新提交
            return handleSave();
          } else {
            setMessage('登录已过期，请重新登录');
            localStorage.removeItem('auth_token');
            window.location.href = '/login';
          }
        } else {
          setMessage('认证失败，请重新登录');
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
      } else {
        const result = await response.json();
        setMessage(result.message ?? '更新失败，请重试');
      }
    } catch (error) {
      console.error('更新个人信息失败:', error);
      setMessage('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        username: user.username ?? '',
        email: user.email ?? '',
        avatar_url: user.avatar_url ?? ''
      });
    }
    setIsEditing(false);
    setMessage('');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部导航 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900">个人中心</h1>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border">
          {/* 头像区域 */}
          <div className="px-6 py-8 border-b border-gray-200">
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-medium overflow-hidden">
                  {user.avatar_url ? (
                    <Image 
                      src={user.avatar_url} 
                      alt={user.username ?? 'avatar'}
                      width={96}
                      height={96}
                      unoptimized
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    user.username.charAt(0).toUpperCase()
                  )}
                </div>
                {isEditing && (
                  <button className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors">
                    <CameraIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{user.username}</h2>
                <p className="text-gray-600">{user.email}</p>
                <p className="text-sm text-gray-500 mt-1">
                  注册时间：{formatDate(user.created_at)}
                </p>
              </div>
            </div>
          </div>

          {/* 个人信息表单 */}
          <div className="px-6 py-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">个人信息</h3>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  编辑资料
                </button>
              ) : (
                <div className="flex space-x-3">
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? '保存中...' : '保存'}
                  </button>
                </div>
              )}
            </div>

            {message && (
              <div className={`mb-4 p-3 rounded-lg ${
                message.includes('成功') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {message}
              </div>
            )}

            <div className="space-y-6">
              {/* 用户名 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <UserIcon className="w-4 h-4 inline mr-2" />
                  用户名
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="请输入用户名"
                  />
                ) : (
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                    {user.username}
                  </div>
                )}
              </div>

              {/* 邮箱 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <EnvelopeIcon className="w-4 h-4 inline mr-2" />
                  邮箱地址
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="请输入邮箱地址"
                  />
                ) : (
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                    {user.email}
                  </div>
                )}
              </div>

              {/* 头像URL */}
              {isEditing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    头像链接
                  </label>
                  <input
                    type="url"
                    value={formData.avatar_url}
                    onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="请输入头像图片链接（可选）"
                  />
                </div>
              )}
            </div>

            {/* 订阅信息 */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">订阅信息</h3>
                <button
                  onClick={() => router.push('/subscription')}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                >
                  管理订阅
                </button>
              </div>

              {subscriptionLoading ? (
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="text-gray-600">加载订阅信息中...</span>
                </div>
              ) : subscription ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CreditCardIcon className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-gray-900">{subscription.plan.name}</p>
                        <p className="text-sm text-gray-600">{subscription.plan.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        getSubscriptionStatusBadge(subscription.status).color
                      }`}>
                        {getSubscriptionStatusBadge(subscription.status).text}
                      </span>
                      <p className="text-sm text-gray-600 mt-1">
                        ¥{subscription.plan.price}/{subscription.plan.period === 'monthly' ? '月' : '年'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <CalendarIcon className="w-4 h-4" />
                      <span>开始时间: {formatDate(subscription.start_date)}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <CalendarIcon className="w-4 h-4" />
                      <span>结束时间: {formatDate(subscription.end_date)}</span>
                    </div>
                  </div>

                  {subscription.plan.features && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">包含功能</h4>
                      <ul className="space-y-1">
                        {subscription.plan.features.map((feature, index) => (
                          <li key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <CreditCardIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 mb-3">您还没有订阅任何计划</p>
                  <button
                    onClick={() => router.push('/subscription')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    选择订阅计划
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
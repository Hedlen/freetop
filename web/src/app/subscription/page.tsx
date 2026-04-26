"use client";

import { useState, useEffect } from "react";
import { CheckIcon, StarIcon, ClockIcon, ExclamationTriangleIcon } from "@heroicons/react/24/solid";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "~/core/hooks/useAuth";
import { 
  subscriptionService,
  type SubscriptionPlan,
  type SubscriptionStatus,
  type TrialStatus,
  type PaymentIntentResponse
} from "~/core/services/subscriptionService";

interface PricingCardProps {
  plan: SubscriptionPlan;
  isPopular?: boolean;
  onSelect: (plan: SubscriptionPlan, channel: 'wechat' | 'alipay') => void;
  loading?: boolean;
}

function PricingCard({ plan, isPopular, onSelect, loading }: PricingCardProps) {
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);

  const handlePlanClick = () => {
    if (plan.price === 0) {
      onSelect(plan, 'wechat'); // 免费计划直接选择
    } else {
      setShowPaymentMethods(true);
    }
  };

  const handlePaymentMethod = (channel: 'wechat' | 'alipay') => {
    onSelect(plan, channel);
    setShowPaymentMethods(false);
  };

  return (
    <div className={`relative rounded-2xl p-8 ${isPopular ? 'bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white shadow-2xl' : 'bg-white border border-gray-200 shadow-lg'} transform transition-all duration-300 hover:scale-105 hover:shadow-2xl group`}>
      {isPopular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center shadow-lg">
            <StarIcon className="w-4 h-4 mr-1 animate-pulse" />
            最受欢迎
          </div>
        </div>
      )}
      
      <div className="text-center mb-8">
        <h3 className={`text-3xl font-bold mb-3 ${isPopular ? 'text-white' : 'text-gray-900'}`}>
          {plan.name}
        </h3>
        <p className={`mb-6 text-lg ${isPopular ? 'text-blue-100' : 'text-gray-600'}`}>
          {plan.description}
        </p>
        <div className="flex items-baseline justify-center mb-2">
          <span className={`text-5xl font-bold ${isPopular ? 'text-white' : 'text-gray-900'}`}>
            ¥{plan.price}
          </span>
          <span className={`ml-2 text-lg ${isPopular ? 'text-blue-100' : 'text-gray-500'}`}>
            /月
          </span>
        </div>
        {plan.price > 0 && (
          <div className="text-sm text-gray-500 line-through">
            原价 ¥{Math.round(plan.price * 1.2)}
          </div>
        )}
      </div>

      <ul className="space-y-4 mb-8">
        {plan.features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 mt-0.5 ${isPopular ? 'bg-green-300' : 'bg-green-100'}`}>
              <CheckIcon className={`w-4 h-4 ${isPopular ? 'text-blue-600' : 'text-green-600'}`} />
            </div>
            <span className={`text-base ${isPopular ? 'text-blue-50' : 'text-gray-700'}`}>{feature}</span>
          </li>
        ))}
      </ul>

      {showPaymentMethods && plan.price > 0 ? (
        <div className="space-y-4">
          <button
            onClick={() => handlePaymentMethod('wechat')}
            disabled={loading}
            className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-300 bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
          >
            {loading ? '处理中...' : '微信支付'}
          </button>
          <button
            onClick={() => handlePaymentMethod('alipay')}
            disabled={loading}
            className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-300 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
          >
            {loading ? '处理中...' : '支付宝支付'}
          </button>
          <button
            onClick={() => setShowPaymentMethods(false)}
            className="w-full py-2 px-4 text-gray-600 hover:text-gray-800 text-sm"
          >
            返回
          </button>
        </div>
      ) : (
        <button
          onClick={handlePlanClick}
          disabled={loading}
          className={`w-full py-4 px-6 rounded-xl font-bold transition-all duration-300 ${
            isPopular
              ? 'bg-white text-blue-600 hover:bg-blue-50 shadow-lg hover:shadow-xl'
              : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
          } ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
        >
          <div className="flex items-center justify-center">
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-2"></div>
                处理中...
              </>
            ) : (
              <>
                <span className="mr-2">{plan.price === 0 ? '🎉' : '✨'}</span>
                {plan.price === 0 ? '免费使用' : '选择计划'}
              </>
            )}
          </div>
        </button>
      )}
    </div>
  );
}

export default function SubscriptionPage() {
  const router = useRouter();
  const { user, isLoggedIn, loading: authLoading } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      // 等待认证状态加载完成
      return;
    }
    
    if (isLoggedIn) {
      loadSubscriptionData();
    } else {
      setLoading(false);
    }
  }, [isLoggedIn, authLoading]);

  useEffect(() => {
    // 只有在认证状态加载完成、用户未登录且数据加载完成后才考虑重定向
    if (!authLoading && !loading && !isLoggedIn) {
      // 检查是否刚从登录页面过来，避免重定向循环
      const justFromLogin = sessionStorage.getItem('login_page_visited');
      if (!justFromLogin) {
        toast.error('请先登录后再订阅服务');
        sessionStorage.setItem('redirect_after_login', '/subscription');
        router.push('/login');
      } else {
        // 清除标记，允许后续重定向
        sessionStorage.removeItem('login_page_visited');
      }
    }
  }, [isLoggedIn, loading, router, authLoading]);

  const loadSubscriptionData = async () => {
    try {
      // 获取订阅计划、订阅状态和试用状态
      const [plansData, subscriptionData, trialData] = await Promise.all([
        subscriptionService.getSubscriptionPlans(),
        subscriptionService.getSubscriptionStatus(),
        subscriptionService.getTrialStatus()
      ]);
      
      setPlans(plansData);
      setSubscriptionStatus(subscriptionData);
      setTrialStatus(trialData);
    } catch (error: any) {
      console.error('加载订阅数据失败:', error);
      // 只有在用户未登录的情况下才重定向到登录页面
      if (!isLoggedIn && (error?.message?.includes('未登录') || error?.message?.includes('未登录或会话已过期'))) {
        toast.error('请先登录后再订阅服务');
        router.push('/login');
        return;
      }
      // 对于已登录用户，只显示错误信息但不重定向
      toast.error('加载订阅数据失败，请刷新页面重试');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelect = async (plan: SubscriptionPlan, channel: 'wechat' | 'alipay') => {
    if (!user) {
      toast.error('请先登录');
      router.push('/login');
      return;
    }

    // 检查用户是否已经有有效订阅
    if (subscriptionStatus?.is_active) {
      toast.error('您已有有效订阅，无需重复购买');
      return;
    }

    if (plan.price === 0) {
      // 免费计划：创建试用
      try {
        setProcessingPlan(plan.id);
        await subscriptionService.createTrial();
        toast.success('免费试用已激活！');
        router.push('/chat');
      } catch (error) {
        console.error('激活试用失败:', error);
        toast.error('激活试用失败，请重试');
      } finally {
        setProcessingPlan(null);
      }
      return;
    }

    setProcessingPlan(plan.id);

    try {
      // 创建支付意图
      const paymentIntent: PaymentIntentResponse = await subscriptionService.createPaymentIntent({
        amount: plan.price,
        currency: plan.currency,
        channel: channel,
        idempotency_key: subscriptionService.generateIdempotencyKey(),
        description: `${plan.name}订阅 - ${user.email}`,
        user_id: parseInt(user.id)
      });

      // 跳转到支付页面
      router.push(`/payment?order_id=${paymentIntent.order_id}&plan_id=${plan.id}`);
    } catch (error) {
      console.error('创建支付意图失败:', error);
      toast.error('创建支付失败，请重试');
    } finally {
      setProcessingPlan(null);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">F</span>
              </div>
              <span className="ml-3 text-xl font-bold text-gray-900">FreeTop</span>
            </div>
            <button
              onClick={() => router.push('/chat')}
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              返回应用
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            选择适合您的
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent"> 订阅计划</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            解锁 FreeTop 的全部功能，体验更智能的 AI 自动化服务
          </p>
          
          {/* 订阅状态显示 */}
          {subscriptionStatus && (
            <div className="mt-8 max-w-2xl mx-auto">
              {subscriptionStatus.is_active ? (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-center">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                      <CheckIcon className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="text-green-800 font-semibold text-lg">
                      当前订阅：{subscriptionStatus.plan_name} 
                      {subscriptionStatus.days_remaining > 0 && (
                        <span className="ml-2 text-base font-medium">
                          （剩余 {subscriptionStatus.days_remaining} 天）
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              ) : trialStatus?.is_active ? (
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <ClockIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-blue-800 font-semibold text-lg">
                      试用期剩余：{trialStatus.days_remaining} 天，
                      {trialStatus.daily_chats_remaining} 次聊天机会
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-center">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                      <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
                    </div>
                    <span className="text-yellow-800 font-semibold text-lg">
                      您当前没有有效订阅，请选择适合的计划
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mt-12">
          {plans.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              isPopular={plan.popular}
              onSelect={(plan, channel) => handlePlanSelect(plan, channel)}
              loading={processingPlan === plan.id}
            />
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-20 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">常见问题</h2>
          <div className="max-w-3xl mx-auto space-y-6 text-left">
            <div className="bg-white rounded-lg p-6 shadow-md">
              <h3 className="font-semibold text-gray-900 mb-2">如何付款？</h3>
              <p className="text-gray-600">我们支持微信支付和支付宝支付，安全便捷。</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md">
              <h3 className="font-semibold text-gray-900 mb-2">可以随时取消订阅吗？</h3>
              <p className="text-gray-600">是的，您可以随时取消订阅，取消后将在当前周期结束后停止服务。</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md">
              <h3 className="font-semibold text-gray-900 mb-2">支持退款吗？</h3>
              <p className="text-gray-600">我们提供 7 天无理由退款保证，让您无风险体验。</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

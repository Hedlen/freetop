/**
 * 订阅和支付相关的API接口
 */

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  period: 'monthly' | 'yearly';
  features: string[];
  popular?: boolean;
}

export interface PaymentIntentRequest {
  amount: number;
  currency: string;
  channel: 'wechat' | 'alipay';
  idempotency_key: string;
  description: string;
  user_id?: number;
}

export interface PaymentIntentResponse {
  order_id: number;
  gateway_order_id: string;
  channel: string;
  method: string;
  status: string;
  pay_url?: string;
  qrcode?: string;
  prepaid_id?: string;
  expire_at: string;
  amount: number;
  currency: string;
}

export interface PaymentStatusResponse {
  order_id: number;
  gateway_order_id: string;
  status: string;
  amount: number;
  currency: string;
  channel: string;
  expire_at: string;
  is_expired: boolean;
  created_at: string;
  updated_at: string;
  payment: {
    payment_id: number;
    gateway_payment_id: string;
    status: string;
    method: string;
    paid_at?: string;
    error_code?: string;
    error_message?: string;
  };
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'inactive' | 'cancelled' | 'expired';
  start_date: string;
  end_date: string;
  auto_renew: boolean;
  created_at: string;
  updated_at: string;
  plan: SubscriptionPlan;
}

/**
 * 获取订阅计划列表
 */
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  // 模拟订阅计划数据
  return [
    {
      id: 'free',
      name: '免费版',
      description: '适合个人用户的基础功能',
      price: 0,
      currency: 'CNY',
      period: 'monthly',
      features: [
        '每日 10 次 AI 对话',
        '基础搜索功能',
        '标准响应速度',
        '社区支持'
      ]
    },
    {
      id: 'pro',
      name: '专业版',
      description: '适合重度用户的高级功能',
      price: 29,
      currency: 'CNY',
      period: 'monthly',
      popular: true,
      features: [
        '无限 AI 对话次数',
        '高级搜索和分析',
        '快速响应速度',
        '优先技术支持',
        '高级工作流',
        '数据导出功能'
      ]
    },
    {
      id: 'enterprise',
      name: '企业版',
      description: '适合团队的完整解决方案',
      price: 99,
      currency: 'CNY',
      period: 'monthly',
      features: [
        '无限 AI 对话次数',
        '团队协作功能',
        'API 访问权限',
        '专属客服支持',
        '高级安全功能',
        '定制化服务'
      ]
    }
  ];
}

/**
 * 创建支付意图
 */
export async function createPaymentIntent(
  request: PaymentIntentRequest
): Promise<PaymentIntentResponse> {
  const response = await fetch('http://localhost:8000/api/payments/intent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || '创建支付意图失败');
  }

  return response.json();
}

/**
 * 查询支付状态
 */
export async function getPaymentStatus(orderId: number): Promise<PaymentStatusResponse> {
  const response = await fetch(`http://localhost:8000/api/payments/status/${orderId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || '查询支付状态失败');
  }

  return response.json();
}

/**
 * 获取用户订阅信息
 */
export async function getUserSubscription(): Promise<UserSubscription | null> {
  try {
    const response = await fetch('/api/subscription', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // 用户没有订阅
      }
      throw new Error('获取订阅信息失败');
    }

    return response.json();
  } catch (error) {
    console.error('获取用户订阅信息失败:', error);
    return null;
  }
}

/**
 * 生成唯一ID（用于幂等键）
 */
export function generateIdempotencyKey(): string {
  return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
import { authService } from './authService';

// 订阅计划接口
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  period: 'monthly' | 'yearly';
  features: string[];
  max_chats_per_day?: number;
  max_searches_per_day?: number;
  api_access: boolean;
  team_features: boolean;
  priority_support: boolean;
  is_active: boolean;
  popular?: boolean;
}

// 订阅状态接口
export interface SubscriptionStatus {
  has_subscription: boolean;
  is_active: boolean;
  plan_name?: string;
  plan_id?: number;
  start_date?: string;
  end_date?: string;
  days_remaining: number;
  auto_renew?: boolean;
}

// 试用状态接口
export interface TrialStatus {
  has_trial: boolean;
  is_active: boolean;
  days_remaining: number;
  chats_remaining: number;
  daily_chats_remaining: number;
  start_date?: string;
  end_date?: string;
  used_chats: number;
  max_chats: number;
}

// 服务访问检查接口
export interface ServiceAccessResponse {
  can_access: boolean;
  reason: string;
  subscription_status: SubscriptionStatus;
  trial_status: TrialStatus;
}

// 支付意图请求接口
export interface PaymentIntentRequest {
  amount: number;
  currency: string;
  channel: 'wechat' | 'alipay';
  idempotency_key: string;
  description: string;
  user_id?: number;
}

// 支付意图响应接口
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

// 支付状态响应接口
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

// 订阅服务类
class SubscriptionService {
  private static instance: SubscriptionService;
  
  private constructor() {}
  
  public static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService();
    }
    return SubscriptionService.instance;
  }
  
  /**
   * 获取所有订阅计划
   */
  public async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    try {
      const headers = authService.getAuthHeaders();
      const response = await fetch('/api/subscription/plans', {
        headers,
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // 未授权，返回默认计划数据
          console.log('User not authenticated, returning default subscription plans');
          return this.getDefaultSubscriptionPlans();
        }
        throw new Error('获取订阅计划失败');
      }
      
      const plans = await response.json();
      return plans.map((plan: any) => ({
        ...plan,
        id: plan.id.toString(),
        popular: plan.name === '专业版' // 标记专业版为热门
      }));
    } catch (error) {
      console.error('Failed to get subscription plans:', error);
      // 返回默认计划数据
      return this.getDefaultSubscriptionPlans();
    }
  }
  
  /**
   * 获取默认订阅计划（用于未认证用户）
   */
  private getDefaultSubscriptionPlans(): SubscriptionPlan[] {
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
        ],
        max_chats_per_day: 10,
        max_searches_per_day: 10,
        api_access: false,
        team_features: false,
        priority_support: false,
        is_active: true,
        popular: false
      },
      {
        id: 'pro',
        name: '专业版',
        description: '适合重度用户的高级功能',
        price: 29,
        currency: 'CNY',
        period: 'monthly',
        features: [
          '无限 AI 对话次数',
          '高级搜索和分析',
          '快速响应速度',
          '优先技术支持',
          '高级工作流',
          '数据导出功能'
        ],
        max_chats_per_day: -1,
        max_searches_per_day: -1,
        api_access: true,
        team_features: false,
        priority_support: true,
        is_active: true,
        popular: true
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
        ],
        max_chats_per_day: -1,
        max_searches_per_day: -1,
        api_access: true,
        team_features: true,
        priority_support: true,
        is_active: true,
        popular: false
      }
    ];
  }
  
  /**
   * 获取用户订阅状态
   */
  public async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    try {
      const headers = authService.getAuthHeaders();
      const response = await fetch('/api/subscription/status', {
        headers,
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // 未授权，返回默认状态
          console.log('User not authenticated, returning default subscription status');
          return this.getDefaultSubscriptionStatus();
        }
        throw new Error('获取订阅状态失败');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to get subscription status:', error);
      // 返回默认状态
      return this.getDefaultSubscriptionStatus();
    }
  }
  
  /**
   * 获取默认订阅状态（用于未认证用户）
   */
  private getDefaultSubscriptionStatus(): SubscriptionStatus {
    return {
      has_subscription: false,
      is_active: false,
      plan_name: '免费版',
      plan_id: undefined,
      start_date: undefined,
      end_date: undefined,
      days_remaining: 0,
      auto_renew: false
    };
  }
  
  /**
   * 获取用户试用状态
   */
  public async getTrialStatus(): Promise<TrialStatus> {
    try {
      const headers = authService.getAuthHeaders();
      const response = await fetch('/api/subscription/trial/status', {
        headers,
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // 未授权，返回默认试用状态
          console.log('User not authenticated, returning default trial status');
          return this.getDefaultTrialStatus();
        }
        throw new Error('获取试用状态失败');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to get trial status:', error);
      // 返回默认试用状态
      return this.getDefaultTrialStatus();
    }
  }
  
  /**
   * 获取默认试用状态（用于未认证用户）
   */
  private getDefaultTrialStatus(): TrialStatus {
    return {
      has_trial: false,
      is_active: false,
      days_remaining: 0,
      chats_remaining: 0,
      daily_chats_remaining: 10,
      start_date: undefined,
      end_date: undefined,
      used_chats: 0,
      max_chats: 0
    };
  }
  
  /**
   * 检查服务访问权限
   */
  public async checkServiceAccess(): Promise<ServiceAccessResponse> {
    try {
      const headers = authService.getAuthHeaders();
      const response = await fetch('/api/subscription/check-access', {
        headers,
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // 未授权，返回默认访问状态（允许访问）
          console.log('User not authenticated, returning default service access');
          return this.getDefaultServiceAccess();
        }
        throw new Error('检查访问权限失败');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to check service access:', error);
      // 返回默认访问状态（允许访问）
      return this.getDefaultServiceAccess();
    }
  }
  
  /**
   * 获取默认服务访问状态（用于未认证用户）
   */
  private getDefaultServiceAccess(): ServiceAccessResponse {
    return {
      can_access: true,
      reason: 'guest_access',
      subscription_status: this.getDefaultSubscriptionStatus(),
      trial_status: this.getDefaultTrialStatus()
    };
  }
  
  /**
   * 创建支付意图
   */
  public async createPaymentIntent(request: PaymentIntentRequest): Promise<PaymentIntentResponse> {
    try {
      const headers = authService.getAuthHeaders();
      const response = await fetch('/api/payments/intent', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('未登录或会话已过期');
        }
        if (response.status === 403) {
          throw new Error('没有权限创建支付意图');
        }
        
        const error = await response.json();
        throw new Error(error.detail || '创建支付意图失败');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to create payment intent:', error);
      throw error;
    }
  }
  
  /**
   * 获取支付状态
   */
  public async getPaymentStatus(orderId: number): Promise<PaymentStatusResponse> {
    try {
      const headers = authService.getAuthHeaders();
      const response = await fetch(`/api/payments/status/${orderId}`, {
        headers,
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('未登录或会话已过期');
        }
        if (response.status === 403) {
          throw new Error('没有权限查看此订单状态');
        }
        if (response.status === 404) {
          throw new Error('订单不存在');
        }
        
        const error = await response.json();
        throw new Error(error.detail || '获取支付状态失败');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to get payment status:', error);
      throw error;
    }
  }
  
  /**
   * 创建用户试用
   */
  public async createTrial(): Promise<TrialStatus> {
    try {
      const headers = authService.getAuthHeaders();
      const response = await fetch('/api/subscription/trial/create', {
        method: 'POST',
        headers,
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('未登录或会话已过期');
        }
        if (response.status === 400) {
          const error = await response.json();
          throw new Error(error.detail || '无法创建试用');
        }
        
        throw new Error('创建试用失败');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to create trial:', error);
      throw error;
    }
  }
  
  /**
   * 增加使用次数（用于试用限制）
   */
  public async incrementUsage(usageType: 'chat' | 'search' = 'chat'): Promise<boolean> {
    try {
      const headers = authService.getAuthHeaders();
      const response = await fetch('/api/subscription/usage/increment', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ usage_type: usageType }),
      });
      
      if (!response.ok) {
        if (response.status === 403) {
          // 试用或订阅限制已达到
          return false;
        }
        if (response.status === 401) {
          throw new Error('未登录或会话已过期');
        }
        
        throw new Error('增加使用次数失败');
      }
      
      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Failed to increment usage:', error);
      return false;
    }
  }
  
  /**
   * 生成唯一ID（用于幂等键）
   */
  public generateIdempotencyKey(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * 获取用户完整的订阅信息
   */
  public async getUserSubscriptionInfo(): Promise<{
    plans: SubscriptionPlan[];
    subscription: SubscriptionStatus;
    trial: TrialStatus;
    access: ServiceAccessResponse;
  }> {
    try {
      const [plans, subscription, trial, access] = await Promise.all([
        this.getSubscriptionPlans(),
        this.getSubscriptionStatus(),
        this.getTrialStatus(),
        this.checkServiceAccess()
      ]);
      
      return {
        plans,
        subscription,
        trial,
        access
      };
    } catch (error) {
      console.error('Failed to get user subscription info:', error);
      throw error;
    }
  }
}

// 导出单例实例
export const subscriptionService = SubscriptionService.getInstance();

// 导出类型定义
export type {
  SubscriptionPlan,
  SubscriptionStatus,
  TrialStatus,
  ServiceAccessResponse,
  PaymentIntentRequest,
  PaymentIntentResponse,
  PaymentStatusResponse
};

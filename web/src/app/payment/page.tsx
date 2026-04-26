"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "~/core/hooks/useAuth";
import { getPaymentStatus } from "~/core/api/subscription";

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const orderId = searchParams.get('order_id');
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId || !user) {
      router.push('/subscription');
      return;
    }

    const checkStatus = async () => {
      try {
        const status = await getPaymentStatus(parseInt(orderId));
        setPaymentStatus(status);
      } catch (error) {
        console.error('查询支付状态失败:', error);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
  }, [orderId, user, router]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">加载中...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-center mb-8">完成支付</h1>
          
          {paymentStatus && (
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>订单号:</span>
                <span className="font-mono">{paymentStatus.gateway_order_id}</span>
              </div>
              <div className="flex justify-between">
                <span>金额:</span>
                <span className="font-semibold">¥{paymentStatus.amount}</span>
              </div>
              <div className="flex justify-between">
                <span>状态:</span>
                <span className={`px-2 py-1 rounded ${
                  paymentStatus.status === 'succeeded' ? 'bg-green-100 text-green-800' :
                  paymentStatus.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {paymentStatus.status === 'succeeded' ? '支付成功' :
                   paymentStatus.status === 'pending' ? '等待支付' : '支付失败'}
                </span>
              </div>
            </div>
          )}

          <div className="mt-8 text-center">
            <button
              onClick={() => router.push('/subscription')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              返回订阅页面
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
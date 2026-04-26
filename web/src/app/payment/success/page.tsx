"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircleIcon } from "@heroicons/react/24/solid";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const orderId = searchParams.get('order_id');
  const planId = searchParams.get('plan_id');

  useEffect(() => {
    // 3秒后自动跳转到聊天页面
    const timer = setTimeout(() => {
      router.push('/chat');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          {/* Success Icon */}
          <div className="mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircleIcon className="w-12 h-12 text-green-500" />
            </div>
          </div>

          {/* Success Message */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            支付成功！
          </h1>
          
          <p className="text-gray-600 mb-6">
            恭喜您成功订阅 FreeTop 高级服务，现在可以享受所有高级功能了。
          </p>

          {/* Order Details */}
          {orderId && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="text-sm text-gray-600">
                <span>订单号: </span>
                <span className="font-mono">{orderId}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => router.push('/chat')}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              开始使用
            </button>
            
            <button
              onClick={() => router.push('/profile')}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-xl transition-colors"
            >
              查看订阅详情
            </button>
          </div>

          {/* Auto-redirect Message */}
          <p className="text-sm text-gray-500 mt-6">
            3秒后自动跳转到聊天页面...
          </p>
        </div>
      </div>
    </div>
  );
}
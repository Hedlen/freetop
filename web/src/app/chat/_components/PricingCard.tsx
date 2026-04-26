import { useState } from "react";
import { CheckIcon, StarIcon } from "@heroicons/react/24/solid";
import { type SubscriptionPlan } from "~/core/services/subscriptionService";

interface PricingCardProps {
  plan: SubscriptionPlan;
  isPopular?: boolean;
  onSelect: (plan: SubscriptionPlan) => void;
  loading?: boolean;
}

export function PricingCard({ plan, isPopular, onSelect, loading }: PricingCardProps) {
  return (
    <div className={`relative rounded-2xl p-6 ${isPopular ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-2xl' : 'bg-white border border-gray-200 shadow-lg'} transform transition-all duration-300 hover:scale-105 hover:shadow-2xl`}>
      {isPopular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center">
            <StarIcon className="w-4 h-4 mr-1" />
            最受欢迎
          </div>
        </div>
      )}
      
      <div className="text-center mb-6">
        <h3 className={`text-xl font-bold mb-2 ${isPopular ? 'text-white' : 'text-gray-900'}`}>
          {plan.name}
        </h3>
        <p className={`mb-4 text-sm ${isPopular ? 'text-blue-100' : 'text-gray-600'}`}>
          {plan.description}
        </p>
        <div className="flex items-baseline justify-center">
          <span className={`text-3xl font-bold ${isPopular ? 'text-white' : 'text-gray-900'}`}>
            ¥{plan.price}
          </span>
          <span className={`ml-2 ${isPopular ? 'text-blue-100' : 'text-gray-500'}`}>
            /月
          </span>
        </div>
      </div>

      <ul className="space-y-2 mb-6">
        {plan.features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <CheckIcon className={`w-4 h-4 mr-2 mt-0.5 ${isPopular ? 'text-green-300' : 'text-green-500'}`} />
            <span className={`text-sm ${isPopular ? 'text-blue-50' : 'text-gray-700'}`}>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => onSelect(plan)}
        disabled={loading}
        className={`w-full py-2 px-4 rounded-xl font-semibold transition-all duration-300 ${
          isPopular
            ? 'bg-white text-blue-600 hover:bg-blue-50 shadow-lg hover:shadow-xl'
            : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
        } ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
      >
        {loading ? '处理中...' : plan.price === 0 ? '免费使用' : '选择计划'}
      </button>
    </div>
  );
}
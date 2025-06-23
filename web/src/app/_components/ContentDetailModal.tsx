"use client";

import { useState, useEffect } from "react";
import { cn } from "~/core/utils";
import { Markdown } from "./Markdown";
import { HotelInfoDisplay } from "./HotelInfoDisplay";
import { ProductInfoDisplay } from "./ProductInfoDisplay";

interface ContentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  content: string;
  url?: string;
  type?: "general" | "flight" | "hotel" | "product" | "image" | "video";
}

export function ContentDetailModal({
  isOpen,
  onClose,
  title,
  content,
  url,
  type = "general",
}: ContentDetailModalProps) {
  const [imageError, setImageError] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // 添加ESC键关闭功能
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // 防止背景滚动
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // 使用 Tailwind CSS 类来控制模态框的显示/隐藏，而不是直接返回 null
  // 这样可以保持 DOM 结构，避免在组件卸载时出现 removeChild 错误
  const modalClasses = cn(
    "modal-overlay",
    isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
  );

  const renderContent = () => {
    if (type === "image") {
      if (imageError) {
        return (
          <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-2">🖼️</div>
              <p>图片加载失败</p>
            </div>
          </div>
        );
      }
      return (
        <div className="max-w-full max-h-[70vh] overflow-auto">
          <img
            src={content}
            alt={title || "图片"}
            className="w-full h-auto rounded-lg"
            onError={() => setImageError(true)}
          />
        </div>
      );
    }

    if (type === "video") {
      if (videoError) {
        return (
          <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-2">🎥</div>
              <p>视频加载失败</p>
            </div>
          </div>
        );
      }
      return (
        <div className="max-w-full max-h-[70vh]">
          <video
            src={content}
            controls
            className="w-full h-auto rounded-lg"
            onError={() => setVideoError(true)}
          />
        </div>
      );
    }

    if (type === "flight") {
      return <FlightInfoDisplay content={content} />;
    }
    if (type === "hotel") {
      return <HotelInfoDisplay content={content} />;
    }
    if (type === "product") {
      return <ProductInfoDisplay content={content} />;
    }
    return (
      <div className="prose max-w-none">
        <Markdown>{content}</Markdown>
      </div>
    );
  };

  return (
    <div 
      className={cn(modalClasses, "bg-gray-100/50 backdrop-blur-sm")}
      onClick={onClose}
    >
      <div 
        className="modal-content w-[90vw] max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900">
              {title || (type === "image" ? "图片详情" : type === "video" ? "视频详情" : "内容详情")}
            </h2>
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {url}
              </a>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[calc(90vh-120px)] overflow-y-auto p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

// 机票信息专用显示组件
function FlightInfoDisplay({ content }: { content: string }) {
  // 尝试解析机票信息
  const parseFlightInfo = (text: string) => {
    // 这里可以根据实际的机票信息格式进行解析
    // 暂时使用简单的正则表达式匹配
    const flightPattern = /航班号?[：:]?\s*([A-Z]{2}\d+)/gi;
    const pricePattern = /价格[：:]?\s*[￥¥$]?([\d,]+)/gi;
    const timePattern = /(\d{1,2}[：:]\d{2})\s*[-~]\s*(\d{1,2}[：:]\d{2})/gi;
    const datePattern = /(\d{1,2}月\d{1,2}日|\d{4}-\d{1,2}-\d{1,2})/gi;
    
    const flights = [];
    let match;
    
    while ((match = flightPattern.exec(text)) !== null) {
      flights.push(match[1]);
    }
    
    const prices = [];
    while ((match = pricePattern.exec(text)) !== null) {
      prices.push(match[1]);
    }
    
    const times = [];
    while ((match = timePattern.exec(text)) !== null) {
      times.push({ departure: match[1], arrival: match[2] });
    }
    
    const dates = [];
    while ((match = datePattern.exec(text)) !== null) {
      dates.push(match[1]);
    }
    
    return { flights, prices, times, dates };
  };

  const flightInfo = parseFlightInfo(content);
  const hasFlightData = flightInfo.flights.length > 0 || flightInfo.prices.length > 0;

  if (!hasFlightData) {
    return (
      <div className="prose max-w-none">
        <Markdown>{content}</Markdown>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 机票卡片展示 */}
      <div className="grid gap-4">
        {flightInfo.flights.map((flight, index) => (
          <div key={index} className="rounded-lg border border-gray-200/60 bg-gradient-to-r from-purple-50/60 to-indigo-50/60 p-3 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="rounded-full bg-purple-100/80 p-2">
                  <svg className="h-4 w-4 text-purple-600/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">航班 {flight}</h3>
                  {flightInfo.dates[index] && (
                    <p className="text-xs text-gray-600">{flightInfo.dates[index]}</p>
                  )}
                </div>
              </div>
              {flightInfo.prices[index] && (
                <div className="text-right">
                  <p className="text-lg font-bold text-purple-600/90">¥{flightInfo.prices[index]}</p>
                  <p className="text-xs text-gray-500">起</p>
                </div>
              )}
            </div>
            
            {flightInfo.times[index] && (
              <div className="mt-2 flex items-center justify-between">
                <div className="text-center">
                  <p className="text-base font-semibold text-gray-900">{flightInfo.times[index].departure}</p>
                  <p className="text-xs text-gray-500">出发</p>
                </div>
                <div className="flex-1 px-4">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-white px-2 text-sm text-gray-500">✈️</span>
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-base font-semibold text-gray-900">{flightInfo.times[index].arrival}</p>
                  <p className="text-xs text-gray-500">到达</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* 原始内容 */}
      <div className="rounded-lg bg-gray-50/60 p-2 backdrop-blur-sm border border-gray-200/40">
        <h4 className="mb-2 font-medium text-gray-900">详细信息</h4>
        <div className="prose max-w-none text-sm">
          <Markdown>{content}</Markdown>
        </div>
      </div>
    </div>
  );
}
"use client";


import { useState, useEffect, useRef, useCallback } from "react";

import { cn } from "~/core/utils";

import { useGifCache } from "../_hooks/useGifCache";
import { trackGifView, trackGifError, trackModalOpen, trackModalClose, trackRetryAttempt } from "../_utils/analytics";

import { HotelInfoDisplay } from "./HotelInfoDisplay";
import { Markdown } from "./Markdown";
import { ProductInfoDisplay } from "./ProductInfoDisplay";

/* eslint-disable @next/next/no-img-element */
// 保留 <img> 用于动态图(GIF)与手动重载控制；next/image 不适用此场景

// 配置常量
const MODAL_CONFIG = {
  MAX_RETRY_COUNT: 3,
  RETRY_DELAY_BASE: 1000,
  PRELOAD_ENABLED: true,
} as const;

// 更严格的类型定义
type ContentType = "general" | "flight" | "hotel" | "product" | "image" | "video" | "gif";

interface ContentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  content: string;
  url?: string;
  type?: ContentType;
}

interface MediaError {
  type: 'image' | 'video';
  message: string;
  retryCount: number;
  timestamp: number;
}

export function ContentDetailModal({
  isOpen,
  onClose,
  title,
  content,
  url,
  type = "general",
}: ContentDetailModalProps) {
  const [mediaErrors, setMediaErrors] = useState<Map<string, MediaError>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set());
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const modalOpenTimeRef = useRef<number>(0);
  const loadStartTimeRef = useRef<number>(0);
  
  // GIF缓存Hook
  const { getCachedUrl, preloadGif } = useGifCache();
  
  // 获取实际显示的URL（优先使用缓存）
  const getDisplayUrl = useCallback((originalUrl: string) => {
    if (type === 'gif') {
      const cachedUrl = getCachedUrl(originalUrl);
      return cachedUrl ?? originalUrl;
    }
    return originalUrl;
  }, [type, getCachedUrl]);

  // 重试机制（增强版）
  const handleMediaError = useCallback((mediaType: 'image' | 'video', src: string, error?: Event) => {
    setMediaErrors(prev => {
      const currentError = prev.get(src);
      const retryCount = currentError ? currentError.retryCount + 1 : 1;

      // 跟踪错误
      trackGifError({
        url: src,
        error: error?.type ?? 'load_error',
        retryCount,
        userAgent: navigator.userAgent,
      });

      const newMap = new Map(prev);

      if (retryCount <= MODAL_CONFIG.MAX_RETRY_COUNT) {
        const delay = MODAL_CONFIG.RETRY_DELAY_BASE * Math.pow(2, retryCount - 1);
        retryTimeoutRef.current = setTimeout(() => {
          const element = document.querySelector<HTMLImageElement | HTMLVideoElement>(`[data-src="${src}"]`);
          if (element) {
            element.src = src;
          }
        }, delay);
        trackRetryAttempt({ url: src, retryCount });
        // Store intermediate retry count so next call can read it
        newMap.set(src, {
          type: mediaType,
          message: '加载中…',
          retryCount,
          timestamp: Date.now(),
        });
        return newMap;
      }

      // Max retries exhausted — show error UI
      newMap.set(src, {
        type: mediaType,
        message: '加载失败，请稍后重试',
        retryCount,
        timestamp: Date.now(),
      });
      return newMap;
    });
  }, []);

  // 预加载图片（支持GIF缓存）
  const preloadImage = useCallback(async (src: string) => {
    if (!MODAL_CONFIG.PRELOAD_ENABLED || preloadedImages.has(src)) return;
    
    try {
      if (type === 'gif') {
        // 使用GIF缓存预加载
        await preloadGif(src);
        setPreloadedImages(prev => new Set(prev.add(src)));
      } else {
        // 普通图片预加载
        const img = new Image();
        img.onload = () => {
          setPreloadedImages(prev => new Set(prev.add(src)));
        };
        img.onerror = () => {
          handleMediaError('image', src);
        };
        img.src = src;
      }
    } catch (error) {
      console.warn('Preload failed:', src, error);
      handleMediaError('image', src);
    }
  }, [preloadedImages, type, preloadGif, handleMediaError]);

  // 清理错误状态
  const clearMediaError = (src: string) => {
    setMediaErrors(prev => {
      const newMap = new Map(prev);
      newMap.delete(src);
      return newMap;
    });
  };

  // 预加载媒体内容和分析跟踪
  useEffect(() => {
    if (isOpen) {
      modalOpenTimeRef.current = Date.now();
      
      // 跟踪模态框打开
      void trackModalOpen({
        type: type ?? 'general',
        url: content,
      });
      
      // 预加载媒体内容
      if ((type === 'image' || type === 'gif') && content) {
        void preloadImage(content);
      }
    } else if (modalOpenTimeRef.current > 0) {
      // 跟踪模态框关闭
      const duration = Date.now() - modalOpenTimeRef.current;
      void trackModalClose({
        type: type ?? 'general',
        duration,
      });
      modalOpenTimeRef.current = 0;
    }
  }, [isOpen, type, content, preloadImage]);

  // 添加ESC键关闭功能和可访问性改进
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      console.log('ContentDetailModal handleClickOutside triggered', target);
      
      // 检查是否点击了 UserDropdown 或其子元素
      if (target.closest('[data-dropdown="user-dropdown"]') || 
          target.closest('.user-dropdown') || 
          target.closest('[data-user-dropdown]')) {
        console.log('点击了 UserDropdown，不处理');
        return; // 不处理 UserDropdown 的点击
      }
      
      // 检查是否点击了任何下拉菜单项
      if (target.closest('[role="menuitem"]') || 
          target.closest('[role="menu"]') || 
          target.closest('.dropdown-menu')) {
        console.log('点击了下拉菜单项，不处理');
        return; // 不处理下拉菜单的点击
      }
      
      // 检查是否点击了具有 tabIndex 的可交互元素（我们的新菜单项）
      if (target.closest('[tabIndex="0"]')) {
        console.log('点击了可交互元素，不处理');
        return;
      }
      
      // 检查是否点击了按钮
      if (target.closest('button')) {
        console.log('点击了按钮，不处理');
        return; // 不处理按钮点击
      }
      
      // 检查是否点击了模态框内容区域
      if (target.closest('.modal-content')) {
        console.log('点击了模态框内容，不处理');
        return;
      }
      
      console.log('点击了模态框外部，关闭模态框');
      // 如果点击了模态框外部，关闭模态框
      onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
      // 防止背景滚动
      document.body.style.overflow = 'hidden';
      // 焦点管理
      modalRef.current?.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
      // 清理重试定时器
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [isOpen, onClose]);

  // 使用 Tailwind CSS 类来控制模态框的显示/隐藏，而不是直接返回 null
  // 这样可以保持 DOM 结构，避免在组件卸载时出现 removeChild 错误
  const modalClasses = cn(
    "modal-overlay",
    isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
  );

  const renderContent = () => {
    const currentError = mediaErrors.get(content);
    
    if (type === "image" || type === "gif") {
      if (currentError && currentError.retryCount >= MODAL_CONFIG.MAX_RETRY_COUNT) {
        return (
          <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-2">{type === "gif" ? "🎬" : "🖼️"}</div>
              <p className="mb-2">{currentError.message}</p>
              <button
                onClick={() => {
                  clearMediaError(content);
                  void preloadImage(content);
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                aria-label={`重新加载${type === "gif" ? "GIF动画" : "图片"}`}
              >
                重新加载
              </button>
            </div>
          </div>
        );
      }
      
      return (
        <div className="max-w-full max-h-[70vh] overflow-auto flex items-center justify-center bg-gray-50 rounded-lg">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-75">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {/* 使用 <img> 以支持动态图(GIF)与手动重载控制；next/image不适用此场景 */}
            <img
            src={getDisplayUrl(content)}
            alt={title ?? (type === "gif" ? "GIF动画" : "图片")}
            className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
            data-src={content}
            onLoad={() => {
              setIsLoading(false);
              clearMediaError(content);
              
              // 计算加载时间并跟踪
              const loadTime = loadStartTimeRef.current > 0 
                ? Date.now() - loadStartTimeRef.current 
                : undefined;
              
              const fromCache = !!getCachedUrl(content);
              
              trackGifView({
                url: content,
                loadTime,
                fromCache,
                retryCount: mediaErrors.get(content)?.retryCount ?? 0,
              });
              
              // 如果是重试成功，更新重试跟踪
              const currentError = mediaErrors.get(content);
              if (currentError && currentError.retryCount > 0) {
                trackRetryAttempt({
                  url: content,
                  attempt: currentError.retryCount,
                  success: true,
                });
              }
            }}
            onLoadStart={() => {
              setIsLoading(true);
              loadStartTimeRef.current = Date.now();
            }}
            onError={(e) => handleMediaError('image', content, e.nativeEvent)}
            aria-describedby={currentError ? 'media-error-description' : undefined}
          />
          {currentError && currentError.retryCount < MODAL_CONFIG.MAX_RETRY_COUNT && (
            <div id="media-error-description" className="sr-only">
              {currentError.message}
            </div>
          )}
        </div>
      );
    }

    if (type === "video") {
      if (currentError && currentError.retryCount >= MODAL_CONFIG.MAX_RETRY_COUNT) {
        return (
          <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-2">🎥</div>
              <p className="mb-2">{currentError.message}</p>
              <button
                onClick={() => {
                  clearMediaError(content);
                  setIsLoading(false);
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                aria-label="重新加载视频"
              >
                重新加载
              </button>
            </div>
          </div>
        );
      }
      
      return (
        <div className="max-w-full max-h-[70vh] relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-75 z-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}
          <video
            src={content}
            controls
            className="w-full h-auto rounded-lg"
            data-src={content}
            onLoadStart={() => setIsLoading(true)}
            onLoadedData={() => {
              setIsLoading(false);
              clearMediaError(content);
            }}
            onError={(e) => handleMediaError('video', content, e.nativeEvent)}
            aria-describedby={currentError ? 'video-error-description' : undefined}
          />
          {currentError && currentError.retryCount < MODAL_CONFIG.MAX_RETRY_COUNT && (
            <div id="video-error-description" className="sr-only">
              {currentError.message}
            </div>
          )}
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
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-content"
      onClick={onClose}
    >
      <div 
        ref={modalRef}
        className="modal-content w-[90vw] max-w-2xl"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
        role="document"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4">
          <div className="flex-1">
            <h2 
              id="modal-title"
              className="text-xl font-semibold text-gray-900"
            >
              {title ?? (type === "image" ? "图片详情" : type === "gif" ? "GIF动画详情" : type === "video" ? "视频详情" : "内容详情")}
            </h2>
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                aria-label={`在新窗口中打开链接: ${url}`}
              >
                {url}
              </a>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="关闭模态框"
            type="button"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div 
          id="modal-content"
          className="max-h-[calc(90vh-120px)] overflow-y-auto p-6"
          role="main"
        >
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
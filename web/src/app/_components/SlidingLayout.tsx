"use client";

import { useState, useEffect, ReactNode, useCallback, useRef } from "react";
import { cn } from "~/core/utils";
import { BrowserEmbedView } from "./BrowserEmbedView";

// 防抖工具函数
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

interface SlidingLayoutProps {
  children: ReactNode;
  sidePanel?: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  browserMode?: boolean;
  onBrowserModeChange?: (enabled: boolean) => void;
}

export function SlidingLayout({ 
  children, 
  sidePanel, 
  isOpen, 
  onClose, 
  browserMode = false,
  onBrowserModeChange 
}: SlidingLayoutProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isBrowserActive, setIsBrowserActive] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isWindowVisible, setIsWindowVisible] = useState(true);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // 窗口可见性检测
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsWindowVisible(!document.hidden);
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  // resize事件防抖处理
  const handleResize = useCallback(
    debounce(() => {
      setIsResizing(false);
    }, 300),
    []
  );
  
  useEffect(() => {
    const handleResizeStart = () => {
      setIsResizing(true);
      handleResize();
    };
    
    window.addEventListener('resize', handleResizeStart);
    return () => {
      window.removeEventListener('resize', handleResizeStart);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [handleResize]);

  useEffect(() => {
    if ((isOpen || isBrowserActive) && isWindowVisible && !isResizing) {
      setIsAnimating(true);
    }
  }, [isOpen, isBrowserActive, isWindowVisible, isResizing]);

  // 移除自动弹出浏览器的逻辑，改为手动点击查看详情
  // useEffect(() => {
  //   const handleBrowserToolCall = (event: CustomEvent) => {
  //     console.log('SlidingLayout: 接收到 browser-tool-call 事件', event.detail);
  //     const { toolName } = event.detail;
  //     if (toolName === 'browser' || toolName === 'smart_browser') {
  //       console.log('SlidingLayout: 激活浏览器模式');
  //       setIsBrowserActive(true);
  //       onBrowserModeChange?.(true);
  //     }
  //   };

  //   const handleBrowserToolResult = (event: CustomEvent) => {
  //     console.log('SlidingLayout: 接收到 browser-tool-result 事件', event.detail);
  //     // 浏览器工具完成后保持显示状态，让用户可以查看结果
  //   };

  //   console.log('SlidingLayout: 添加浏览器事件监听器');
  //   window.addEventListener('browser-tool-call', handleBrowserToolCall as EventListener);
  //   window.addEventListener('browser-tool-result', handleBrowserToolResult as EventListener);

  //   return () => {
  //     console.log('SlidingLayout: 移除浏览器事件监听器');
  //     window.removeEventListener('browser-tool-call', handleBrowserToolCall as EventListener);
  //     window.removeEventListener('browser-tool-result', handleBrowserToolResult as EventListener);
  //   };
  // }, [onBrowserModeChange]);

  const handleTransitionEnd = useCallback(() => {
    if (!isResizing && !isOpen && !isBrowserActive) {
      setIsAnimating(false);
    }
  }, [isResizing, isOpen, isBrowserActive]);

  const handleCloseBrowser = useCallback(() => {
    if (!isResizing && isWindowVisible) {
      setIsBrowserActive(false);
      onBrowserModeChange?.(false);
    }
  }, [isResizing, isWindowVisible, onBrowserModeChange]);

  const isRightPanelOpen = isOpen || isBrowserActive;

  return (
    <div 
      className="relative w-full viewport-constrained"
      style={{
        transform: 'translateZ(0)', // 强制GPU加速
      }}
    >
      {/* 主内容区域 */}
      <div
        className={cn(
            "ease-in-out will-change-transform", // GPU加速
            "no-horizontal-scroll", // 防止水平滚动
            isRightPanelOpen ? "transform -translate-x-[min(600px,80vw)]" : "transform translate-x-0",
            // 根据状态调整动画
            isResizing ? "transition-none" : "transition-transform duration-500",
            isResizing && "pointer-events-none" // resize时禁用交互
          )}
        onTransitionEnd={handleTransitionEnd}
        style={{
          transform: isRightPanelOpen ? `translate3d(-${Math.min(600, window.innerWidth * 0.8)}px, 0, 0)` : 'translate3d(0, 0, 0)', // 响应式3D变换
        }}
      >
        {children}
      </div>

      {/* 右侧嵌入窗口 */}
      {(isRightPanelOpen || isAnimating) && (
        <div
          className={cn(
            "fixed right-0 top-0 h-full w-[min(600px,80vw)] bg-white/95 backdrop-blur-md border-l border-gray-200 shadow-2xl z-50",
            "ease-in-out will-change-transform", // GPU加速
            "no-horizontal-scroll", // 防止水平滚动
            isRightPanelOpen ? "transform translate-x-0" : "transform translate-x-full",
            isResizing ? "transition-none" : "transition-transform duration-500",
            isResizing && "pointer-events-none" // resize时禁用交互
          )}
          style={{
            transform: 'translate3d(0, 0, 0)', // 强制GPU加速
            width: `${Math.min(600, window.innerWidth * 0.8)}px`, // 响应式宽度
          }}
        >
          {/* 头部标题栏 */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {isBrowserActive ? "浏览器" : "详细结果"}
            </h3>
            <div className="flex items-center space-x-2">
              {isBrowserActive && (
                <button
                  onClick={handleCloseBrowser}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  title="关闭浏览器"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9V3" />
                  </svg>
                </button>
              )}
              <button
                onClick={isBrowserActive ? handleCloseBrowser : onClose}
                className={cn(
                  "p-2 hover:bg-gray-100 rounded-full transition-colors",
                  isResizing && "pointer-events-none"
                )}
                disabled={isResizing}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* 内容区域 */}
          <div className="flex-1 overflow-hidden">
            {isBrowserActive ? (
              <BrowserEmbedView 
                className="h-full" 
                style={{
                  pointerEvents: isResizing ? 'none' : 'auto', // resize时禁用交互
                }}
              />
            ) : (
              <div className="h-full overflow-y-auto p-4 hide-scrollbar message-scroll-container">
                {sidePanel}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 遮罩层 */}
      {isRightPanelOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-20 z-40"
          onClick={() => {
            if (isBrowserActive) {
              handleCloseBrowser();
            } else {
              onClose();
            }
          }}
        />
      )}
    </div>
  );
}
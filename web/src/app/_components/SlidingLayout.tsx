"use client";

import { useState, useEffect, ReactNode } from "react";
import { cn } from "~/core/utils";
import { BrowserEmbedView } from "./BrowserEmbedView";

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

  useEffect(() => {
    if (isOpen || isBrowserActive) {
      setIsAnimating(true);
    }
  }, [isOpen, isBrowserActive]);

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

  const handleTransitionEnd = () => {
    if (!isOpen && !isBrowserActive) {
      setIsAnimating(false);
    }
  };

  const handleCloseBrowser = () => {
    setIsBrowserActive(false);
    onBrowserModeChange?.(false);
  };

  const isRightPanelOpen = isOpen || isBrowserActive;

  return (
    <div className="relative w-full overflow-hidden">
      {/* 主内容区域 */}
      <div
        className={cn(
            "transition-transform duration-500 ease-in-out",
            isRightPanelOpen ? "transform -translate-x-[600px]" : "transform translate-x-0"
          )}
        onTransitionEnd={handleTransitionEnd}
      >
        {children}
      </div>

      {/* 右侧嵌入窗口 */}
      {(isRightPanelOpen || isAnimating) && (
        <div
          className={cn(
            "fixed right-0 top-0 h-full w-[600px] bg-white/95 backdrop-blur-md border-l border-gray-200 shadow-2xl z-50",
            "transition-transform duration-500 ease-in-out",
            isRightPanelOpen ? "transform translate-x-0" : "transform translate-x-full"
          )}
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
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
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
              <BrowserEmbedView className="h-full" />
            ) : (
              <div className="h-full overflow-auto p-4">
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
          onClick={isBrowserActive ? handleCloseBrowser : onClose}
        />
      )}
    </div>
  );
}
"use client";

import { useState, useEffect, ReactNode } from "react";
import { cn } from "~/core/utils";

interface SlidingLayoutProps {
  children: ReactNode;
  sidePanel?: ReactNode;
  isOpen: boolean;
  onClose: () => void;
}

export function SlidingLayout({ children, sidePanel, isOpen, onClose }: SlidingLayoutProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    }
  }, [isOpen]);

  const handleTransitionEnd = () => {
    if (!isOpen) {
      setIsAnimating(false);
    }
  };

  return (
    <div className="relative w-full overflow-hidden">
      {/* 主内容区域 */}
      <div
        className={cn(
          "transition-transform duration-500 ease-in-out",
          isOpen ? "transform -translate-x-80" : "transform translate-x-0"
        )}
        onTransitionEnd={handleTransitionEnd}
      >
        {children}
      </div>

      {/* 右侧嵌入窗口 */}
      {(isOpen || isAnimating) && (
        <div
          className={cn(
            "fixed right-0 top-0 h-full w-80 bg-white/95 backdrop-blur-md border-l border-blue-200 shadow-2xl z-50",
            "transition-transform duration-500 ease-in-out",
            isOpen ? "transform translate-x-0" : "transform translate-x-full"
          )}
        >
          {/* 关闭按钮 */}
          <div className="flex items-center justify-between p-4 border-b border-blue-200">
            <h3 className="text-lg font-semibold text-gray-900">详细结果</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 侧边面板内容 */}
          <div className="flex-1 overflow-auto p-4">
            {sidePanel}
          </div>
        </div>
      )}

      {/* 遮罩层 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-20 z-40"
          onClick={onClose}
        />
      )}
    </div>
  );
}
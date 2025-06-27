"use client";

import { useState } from "react";
import { cn } from "~/core/utils";

interface MobileSidebarProps {
  onNewSession: () => void;
  onShowHistory: () => void;
}

export function MobileSidebar({ onNewSession, onShowHistory }: MobileSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* 移动端汉堡菜单按钮 */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed left-4 top-20 z-40 md:hidden lg:hidden xl:hidden w-12 h-12 bg-gradient-to-br from-blue-500/90 to-purple-600/90 backdrop-blur-md rounded-full border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 active:shadow-md touch-manipulation"
      >
        <div className="flex items-center justify-center w-full h-full">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </div>
      </button>

      {/* 侧边栏遮罩 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 侧边栏内容 */}
      <div
        className={cn(
          "fixed left-0 top-0 h-full w-64 bg-white/95 backdrop-blur-md border-r border-gray-200/50 shadow-2xl z-40 md:hidden",
          "transition-transform duration-300 ease-in-out",
          isOpen ? "transform translate-x-0" : "transform -translate-x-full"
        )}
      >
        {/* 侧边栏头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50">
          <h2 className="text-xl font-semibold text-gray-800">菜单</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-full transition-colors active:scale-95 touch-manipulation"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 侧边栏菜单项 */}
        <div className="p-6 space-y-4">
          <button
            onClick={() => {
              onNewSession();
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-cyan-50 to-blue-50 hover:from-cyan-100 hover:to-blue-100 active:from-cyan-200 active:to-blue-200 rounded-xl border border-cyan-200/50 transition-all duration-200 group active:scale-98 touch-manipulation"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div className="text-left">
              <div className="font-semibold text-gray-800">新建会话</div>
              <div className="text-sm text-gray-600">开始新的对话</div>
            </div>
          </button>

          <button
            onClick={() => {
              onShowHistory();
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 active:from-purple-200 active:to-pink-200 rounded-xl border border-purple-200/50 transition-all duration-200 group active:scale-98 touch-manipulation"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-left">
              <div className="font-semibold text-gray-800">历史记录</div>
              <div className="text-sm text-gray-600">查看过往对话</div>
            </div>
          </button>
        </div>
      </div>
    </>
  );
}
'use client';

import React from 'react';
import { X } from 'lucide-react';
import { cn } from '~/core/utils';
import { type Message } from '~/core/messaging';

interface SessionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: Message[][];
  onSelectSession: (session: Message[]) => void;
  onDeleteSession: (index: number) => void;
}

export function SessionHistoryModal({
  isOpen,
  onClose,
  sessions,
  onSelectSession,
  onDeleteSession,
}: SessionHistoryModalProps) {
  const handleSessionClick = (session: Message[]) => {
    onSelectSession(session);
  };

  const handleDeleteSession = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteSession(index);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 模态框内容 */}
      <div className="relative w-full max-w-sm sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-4 bg-white rounded-lg shadow-xl border border-gray-200">
        {/* 头部 */}
        <div className="flex items-center justify-between p-3 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">会话历史</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
          </button>
        </div>
        
        {/* 内容区域 */}
        <div className="p-3 sm:p-6">
          <div className="max-h-80 sm:max-h-96 md:max-h-[500px] lg:max-h-[600px] overflow-y-auto space-y-2 sm:space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
          {sessions.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-white/60">暂无历史会话</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              {sessions.map((session, index) => {
                const firstMessage = session[0];
                const title = firstMessage?.content || `会话 ${index + 1}`;
                const timestamp = firstMessage?.id ? new Date(parseInt(firstMessage.id.substring(0, 8), 16) * 1000).toLocaleString() : '未知时间';
                const messageCount = session.length;

                return (
                  <div
                    key={index}
                    onClick={() => handleSessionClick(session)}
                    className="group p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 hover:border-white/20 cursor-pointer transition-all duration-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-white font-medium mb-1 group-hover:text-blue-200 transition-colors">
                          {title}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-white/60">
                          <span>{timestamp}</span>
                          <span>{messageCount} 条消息</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteSession(index, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded transition-all duration-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </div>
        
        {/* 底部 */}
        <div className="p-6 border-t border-white/20">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/20"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
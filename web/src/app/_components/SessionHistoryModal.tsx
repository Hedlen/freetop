'use client';

import { X } from 'lucide-react'
import React from 'react'

import { type Message } from '~/core/messaging'

type SessionData = Message[] | { messages: Message[]; createdAt: number };

interface SessionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: SessionData[];
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
  const handleSessionClick = (sessionData: SessionData) => {
    const messages = Array.isArray(sessionData) ? sessionData : sessionData.messages;
    onSelectSession(messages);
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
      <div className="relative w-full max-w-sm sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-4 bg-white rounded-xl shadow-2xl border border-gray-200">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">会话历史</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 hover:text-gray-700" />
          </button>
        </div>
        
        {/* 内容区域 */}
        <div className="p-4 sm:p-6">
          <div className="max-h-80 sm:max-h-96 md:max-h-[500px] lg:max-h-[600px] overflow-y-auto">
          {sessions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-gray-500 text-lg">暂无历史会话</p>
              <p className="text-gray-400 text-sm mt-2">开始新的对话来创建历史记录</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {sessions
                .map((sessionData, originalIndex) => ({ sessionData, originalIndex }))
                .sort((a, b) => {
                  // 获取会话的创建时间进行排序
                  const aTime = Array.isArray(a.sessionData) ? 0 : a.sessionData.createdAt;
                  const bTime = Array.isArray(b.sessionData) ? 0 : b.sessionData.createdAt;
                  return bTime - aTime; // 最新的在前面
                })
                .map(({ sessionData, originalIndex }, _index) => {
                const messages = Array.isArray(sessionData) ? sessionData : sessionData.messages;
                const firstMessage = messages[0];
                const title = typeof firstMessage?.content === 'string' 
                  ? firstMessage.content.slice(0, 50) + (firstMessage.content.length > 50 ? '...' : '')
                  : `会话 ${originalIndex + 1}`;
                // 使用会话的实际创建时间，如果是旧格式则使用当前时间
                const createdAt = Array.isArray(sessionData) ? Date.now() : sessionData.createdAt;
                const timestamp = new Date(createdAt).toLocaleString();
                const messageCount = messages.length;

                return (
                  <div
                    key={originalIndex}
                    onClick={() => handleSessionClick(sessionData)}
                    className="group p-5 bg-gray-50 hover:bg-blue-50 rounded-xl border border-gray-200 hover:border-blue-300 cursor-pointer transition-all duration-200 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-gray-800 font-semibold mb-2 group-hover:text-blue-700 transition-colors leading-tight">
                          {title}
                        </h3>
                        <div className="flex items-center space-x-3 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{timestamp}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span>{messageCount} 条</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteSession(originalIndex, e)}
                        className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all duration-200 ml-2"
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
        <div className="p-4 sm:p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
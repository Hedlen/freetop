import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';

import { generateAIResponse } from '@/core/api/chat';
import { LoadingAnimation } from '@/core/components/LoadingAnimation';
import { Markdown } from '@/core/components/Markdown';
import { useMessageStore } from '@/core/store/messageStore';
import { useSessionStore } from '@/core/store/sessionStore';
import type { Message } from '@/core/types/message';
import { useSettingsStore } from '~/core/store/settingsStore';
import { cn } from '~/core/utils';

import { MediaCard } from './MediaCard';
import { ToolCallView } from './ToolCallView';
import { WorkflowProgressView } from './WorkflowProgressView';

// 防抖工具函数
function debounce(func: (...args: any[]) => void, wait: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: any[]) => {
    const later = () => {
      if (timeout) clearTimeout(timeout);
      func(...args);
    };
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 节流工具函数
function throttle(func: (...args: any[]) => void, limit: number) {
  let inThrottle = false;
  return (...args: any[]) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => { inThrottle = false; }, limit);
    }
  };
}

interface MessageHistoryViewProps {
  messages: Message[];
  responding: boolean;
  abortController?: AbortController;
  className?: string;
}

export function MessageHistoryView({ messages, responding, abortController, className }: MessageHistoryViewProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [isWindowVisible, setIsWindowVisible] = useState(true);
  const [isResizing, setIsResizing] = useState(false);
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);

  // 防抖处理滚动事件
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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
  const debouncedResize = useMemo(() => debounce(() => {
    setIsResizing(false);
  }, 300), [setIsResizing]);
  
  useEffect(() => {
    const handleResizeStart = () => {
      setIsResizing(true);
      debouncedResize();
    };
    
    window.addEventListener('resize', handleResizeStart);
    return () => {
      window.removeEventListener('resize', handleResizeStart);
    };
  }, [debouncedResize]);
  
  // 优化的防抖滚动处理
  const throttledScroll = useMemo(() => throttle(() => {
    if (isResizing || !isWindowVisible) return; // resize或窗口不可见时跳过
    
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;
      
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      
      if (!isAtBottom) {
        setIsUserScrolling(true);
        
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        
        scrollTimeoutRef.current = setTimeout(() => {
          setIsUserScrolling(false);
        }, 5000);
      } else {
        setIsUserScrolling(false);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
          scrollTimeoutRef.current = null;
        }
      }
    }, 100);
  }, 16), [isResizing, isWindowVisible]);

  // 处理滚动条区域的鼠标滚轮事件
  const handleWheelEvent = useCallback((e: WheelEvent) => {
    const container = containerRef.current;
    if (!container) return;

    // 检查是否在容器内部滚动
    const rect = container.getBoundingClientRect();
    const isInContainer = e.clientX >= rect.left && e.clientX <= rect.right && 
                         e.clientY >= rect.top && e.clientY <= rect.bottom;

    if (isInContainer) {
      // 检查容器是否可以滚动
      const canScrollDown = container.scrollTop < container.scrollHeight - container.clientHeight;
      const canScrollUp = container.scrollTop > 0;
      const isScrollingDown = e.deltaY > 0;
      const isScrollingUp = e.deltaY < 0;
      
      // 只有当容器内部滚动到边界时才允许页面滚动
      if ((isScrollingDown && canScrollDown) || (isScrollingUp && canScrollUp)) {
        // 阻止页面滚动，让容器内部滚动
        e.preventDefault();
        e.stopPropagation();
        container.scrollTop += e.deltaY;
      }
      // 如果容器已经滚动到边界，不阻止事件，让页面正常滚动
    }
  }, []);

  // 使用IntersectionObserver优化滚动检测
  useEffect(() => {
    const container = containerRef.current;
    const endElement = endRef.current;
    if (!container || !endElement) return;

    // 创建IntersectionObserver来检测是否在底部
    intersectionObserverRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setIsUserScrolling(false);
          if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
            scrollTimeoutRef.current = null;
          }
        }
      },
      {
        root: container,
        threshold: 0.1,
      }
    );
    
    intersectionObserverRef.current.observe(endElement);
    
    // 只在窗口可见且非resize状态时添加事件监听
    if (isWindowVisible && !isResizing) {
      container.addEventListener('scroll', throttledScroll, { passive: true });
      container.addEventListener('wheel', handleWheelEvent, { passive: false });
    }
    
    return () => {
      intersectionObserverRef.current?.disconnect();
      container.removeEventListener('scroll', throttledScroll);
      container.removeEventListener('wheel', handleWheelEvent);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [throttledScroll, handleWheelEvent, isWindowVisible, isResizing]);

  // 优化的自动滚动逻辑
  useEffect(() => {
    if (!isUserScrolling && isWindowVisible && !isResizing) {
      // 使用requestAnimationFrame确保DOM更新完成后再滚动
      const scrollToBottom = () => {
        requestAnimationFrame(() => {
          const container = containerRef.current;
          if (container) {
            const { scrollTop, scrollHeight, clientHeight } = container;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
            
            if (isNearBottom || responding) {
              endRef.current?.scrollIntoView({ 
                behavior: isResizing ? 'auto' : 'smooth' // resize时使用auto避免动画卡顿
              });
            }
          }
        });
      };
      
      // 如果正在resize，延迟滚动
      if (isResizing) {
        setTimeout(scrollToBottom, 100);
      } else {
        scrollToBottom();
      }
    }
  }, [messages, responding, isUserScrolling, isWindowVisible, isResizing]);

  return (
    <div 
      ref={containerRef}
      className={`
        w-full h-full
        ${className ?? ''}
      `}
      style={{
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div className="flex-1" />
      <div className="flex-shrink-0">
        {messages.map((message) => (
          <MessageView 
            key={message.id} 
            message={message} 
            abortController={abortController} 
            messages={messages}
            isWindowVisible={isWindowVisible}
            isResizing={isResizing}
          />
        ))}
        {responding && (
          <div className="flex justify-start mb-8">
            <div className="flex-shrink-0 mr-3 mt-1">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                AI
              </div>
            </div>
            <div className="bg-[#fefefe] border border-gray-100 rounded-lg px-4 py-3 shadow-sm">
              <LoadingAnimation />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}

const MessageView = React.memo(({ message, abortController, messages, isWindowVisible: _isWindowVisible, isResizing: _isResizing }: { 
  message: Message; 
  abortController?: AbortController; 
  messages: Message[];
  isWindowVisible?: boolean;
  isResizing?: boolean;
}) => {
  const [copySuccess, setCopySuccess] = useState(false);
  const { deleteMessage } = useMessageStore();
  const { currentSessionId } = useSessionStore();
  const { settings } = useSettingsStore();
  const handleCopy = useCallback(async () => {
    if (message.content && typeof message.content === 'string') {
      try {
        await navigator.clipboard.writeText(message.content);
        setCopySuccess(true);
        toast.success('已复制到剪贴板');
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.error('复制失败:', err);
        toast.error('复制失败');
      }
    }
  }, [message.content]);
  
  const handleRetry = useCallback(async () => {
    if (message.role === "assistant" && currentSessionId && abortController) {
      try {
        // 删除当前AI回复
        deleteMessage(message.id);
        
        // 重新生成回复
        await generateAIResponse({
          messages: messages.slice(0, -1), // 排除当前消息
          sessionId: currentSessionId,
          abortController,
          settings
        });
      } catch (error) {
        console.error('重新生成失败:', error);
        toast.error('重新生成失败');
      }
    }
  }, [message.id, message.role, currentSessionId, deleteMessage, abortController, messages, settings]);
  
  const handleDelete = useCallback(() => {
    if (message.role === "assistant") {
      deleteMessage(message.id);
      toast.success('消息已删除');
    }
  }, [message.id, message.role, deleteMessage]);
  
  // 渲染多模态消息内容的函数
  const renderContent = useMemo(() => {
    if (typeof message.content === "string" && message.content.trim()) {
      return (
        <Markdown
          content={message.content}
          className={cn(
            "prose prose-sm max-w-none break-words text-sm",
            message.role === "user" && "prose-invert",
            message.role === "assistant" && "prose-gray"
          )}
        />
      );
    }
    
    if (Array.isArray(message.content)) {
      return (
        <div className="space-y-2">
          {message.content.map((item, index) => {
            if (item.type === 'text' && item.text) {
              return (
                <Markdown 
                  key={index} 
                  content={item.text}
                  className="prose prose-sm max-w-none break-words text-sm"
                />
              );
            }
            if (item.type === 'image_url') {
              return (
                <MediaCard
                  key={index}
                  type="image"
                  src={item.image_url.url}
                  className="max-w-sm"
                />
              );
            }
            if (item.type === 'tool_call') {
              return (
                <ToolCallView
                  key={index}
                  toolCall={item}
                />
              );
            }
            return null;
          })}
        </div>
      );
    }
    
    return null;
  }, [message.content, message.role]);

  if ((message.type === "text" && message.content) || (message.type === "multimodal" && Array.isArray(message.content))) {
    return (
      <div 
        className={cn("flex mb-8 group", message.role === "user" ? "justify-end" : "justify-start")}
      >
        {message.role === "assistant" && (
          <div className="flex-shrink-0 mr-3 mt-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
              AI
            </div>
          </div>
        )}
        <div className="relative">
          <div
            className={cn(
              "relative w-full rounded-lg px-4 py-3 leading-relaxed",
              message.role === "user" && "bg-blue-600 text-white ml-auto",
              message.role === "assistant" && "bg-[#fefefe] border border-gray-100 text-gray-800 shadow-sm md:max-w-[85%] lg:max-w-[80%] xl:max-w-[75%]",
            )}
          >
            {renderContent}
          </div>
          
          {/* 操作按钮 - 根据角色显示不同按钮 */}
          <div className={cn(
            "flex gap-2 mt-2 pt-2 border-t border-gray-100",
            message.role === "user" ? "justify-end" : "justify-start"
          )}>
            <button
              onClick={handleCopy}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md transition-colors text-xs font-medium",
                message.role === "user" 
                  ? "bg-blue-100 hover:bg-blue-200 text-blue-700" 
                  : "bg-gray-100 hover:bg-gray-200 text-gray-600"
              )}
              title="复制消息"
            >
              {copySuccess ? (
                <>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>已复制</span>
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>复制</span>
                </>
              )}
            </button>
            
            {/* 只在AI回复显示重新生成和删除按钮 */}
            {message.role === "assistant" && (
              <>
                <button
                  onClick={handleRetry}
                  className="flex items-center gap-1 px-2 py-1 rounded-md transition-colors text-xs font-medium bg-green-100 hover:bg-green-200 text-green-700"
                  title="重新生成"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>重新生成</span>
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-1 px-2 py-1 rounded-md transition-colors text-xs font-medium bg-red-100 hover:bg-red-200 text-red-700"
                  title="删除回答"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>删除</span>
                </button>
              </>
            )}
          </div>
        </div>
        
        {message.role === "user" && (
          <div className="flex-shrink-0 ml-3 mt-1">
            <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white text-sm font-medium">
              U
            </div>
          </div>
        )}
      </div>
    );
  } else if (message.type === "workflow") {
    return (
      <div className="mb-8">
        <div className="flex justify-start">
          <div className="flex-shrink-0 mr-3 mt-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center text-white text-sm font-medium">
              ⚡
            </div>
          </div>
          <div className="flex-1 max-w-[90%]">
            <WorkflowProgressView workflow={message.content.workflow} />
          </div>
        </div>
      </div>
    );
  }
  return null;
});

MessageView.displayName = 'MessageView';

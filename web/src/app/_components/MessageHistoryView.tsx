import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';

import { sendMessage, useStore } from '~/core/store';
import { LoadingAnimation } from '@/core/components/LoadingAnimation';
import { Markdown } from '@/core/components/Markdown';
import { useMessageStore } from '@/core/store/messageStore';
import { useSessionStore } from '@/core/store/sessionStore';
import type { Message } from '@/core/types/message';
import { useSettingsStore } from '~/core/store/settingsStore';
import { getInputConfigSync } from '~/core/utils/config';
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
  const scrollElRef = useRef<HTMLDivElement | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [isWindowVisible, setIsWindowVisible] = useState(true);
  const [isResizing, setIsResizing] = useState(false);
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);
  const [isLockedByUser, setIsLockedByUser] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const rafScrollPendingRef = useRef(false);
  const SCROLL_MEMORY_KEY = 'chat_scrollTop';
  const lastScrollHeightRef = useRef(0);
  const lastScrollSetTsRef = useRef(0);
  const hasAssistantContent = useMemo(() => {
    return messages.some(
      (m) => m.role === "assistant" && m.type === "text" && typeof m.content === "string" && m.content.trim().length > 0,
    );
  }, [messages]);
  const showInlineSpinner = responding && !hasAssistantContent;

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
      const container = scrollElRef.current ?? containerRef.current;
      if (!container) return;
      
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceToBottom = scrollHeight - scrollTop - clientHeight;
      const isAtBottom = distanceToBottom < 50;
      setIsNearBottom(distanceToBottom < 100);
      
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
        setIsLockedByUser(false);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
          scrollTimeoutRef.current = null;
        }
      }
    }, 100);
  }, 16), [isResizing, isWindowVisible]);

  // 处理滚动条区域的鼠标滚轮事件
  const handleWheelEvent = useCallback((e: WheelEvent) => {
    const container = scrollElRef.current ?? containerRef.current;
    if (!container) return;

    const canScrollDown = container.scrollTop < container.scrollHeight - container.clientHeight;
    const canScrollUp = container.scrollTop > 0;
    const isScrollingDown = e.deltaY > 0;
    const isScrollingUp = e.deltaY < 0;

    if ((isScrollingDown && canScrollDown) || (isScrollingUp && canScrollUp)) {
      e.preventDefault();
      e.stopPropagation();
      const applyScroll = () => {
        container.scrollTop += e.deltaY;
        const { scrollTop, scrollHeight, clientHeight } = container;
        const distanceToBottom = scrollHeight - scrollTop - clientHeight;
        setIsNearBottom(distanceToBottom < 100);
        if (distanceToBottom >= 100) {
          setIsLockedByUser(true);
        }
      };
      if (!rafScrollPendingRef.current) {
        rafScrollPendingRef.current = true;
        requestAnimationFrame(() => {
          applyScroll();
          rafScrollPendingRef.current = false;
        });
      }
    }
  }, []);

  // 使用IntersectionObserver优化滚动检测
  useEffect(() => {
    const container = (containerRef.current?.closest('.message-scroll-container') as HTMLDivElement) ?? containerRef.current ?? null;
    scrollElRef.current = container;
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
      try {
        const top = container.scrollTop;
        localStorage.setItem(SCROLL_MEMORY_KEY, String(top));
      } catch {}
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [throttledScroll, handleWheelEvent, isWindowVisible, isResizing]);

  // 初次挂载恢复滚动位置
  useEffect(() => {
    const container = (containerRef.current?.closest('.message-scroll-container') as HTMLDivElement) ?? containerRef.current ?? null;
    scrollElRef.current = container;
    if (!container) return;
    try {
      const saved = localStorage.getItem(SCROLL_MEMORY_KEY);
      if (saved) {
        const savedTop = Number(saved);
        if (!Number.isNaN(savedTop) && savedTop > 0) {
          requestAnimationFrame(() => {
            container.scrollTop = savedTop;
            setIsLockedByUser(true);
          });
        }
      }
    } catch {}
  }, []);

  // 优化的自动滚动逻辑
  useEffect(() => {
    if (!isUserScrolling && isWindowVisible && !isResizing) {
      const scrollToBottom = () => {
        if (rafScrollPendingRef.current) return;
        rafScrollPendingRef.current = true;
        requestAnimationFrame(() => {
          const container = scrollElRef.current ?? containerRef.current;
          if (container) {
            const { scrollTop, scrollHeight, clientHeight } = container;
            const nearBottom = scrollHeight - scrollTop - clientHeight < 100;
            if (nearBottom && !isLockedByUser) {
              const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
              const changed = scrollHeight > (lastScrollHeightRef.current + 8);
              const enoughTime = now - lastScrollSetTsRef.current > 50;
              if (changed && enoughTime) {
                container.scrollTop = scrollHeight;
                lastScrollHeightRef.current = scrollHeight;
                lastScrollSetTsRef.current = now;
              }
            }
          }
          rafScrollPendingRef.current = false;
        });
      };
      if (isResizing) {
        setTimeout(scrollToBottom, 100);
      } else {
        scrollToBottom();
      }
    }
  }, [messages, responding, isUserScrolling, isWindowVisible, isResizing, isLockedByUser]);

  return (
    <div 
      ref={containerRef}
      className={`
        w-full h-full
        ${className ?? ''}
      `}
      style={{
        WebkitOverflowScrolling: 'touch',
        overflowAnchor: 'none' as any,
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
        {showInlineSpinner && (
          <div className="flex justify-start mb-4 px-2">
            <div className="inline-flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" role="status" aria-label="Loading">
                <span className="sr-only">Loading...</span>
              </div>
              <span className="text-[11px] sm:text-xs text-gray-500">正在生成…</span>
            </div>
          </div>
        )}
        
        <div ref={endRef} />
        {isLockedByUser && (
          <div className="fixed bottom-6 right-6 z-40">
            <button
              onClick={() => {
                setIsLockedByUser(false);
                requestAnimationFrame(() => {
                  endRef.current?.scrollIntoView({ behavior: 'smooth' });
                });
              }}
              className="px-3 py-2 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors text-sm"
              title="跳至最新"
            >
              跳至最新
            </button>
          </div>
        )}
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
  const [mounted, setMounted] = useState(false);
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
  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);
  
  const handleRetry = useCallback(async () => {
    if (message.role !== "assistant") return;
    try {
      const storeMessages = useStore.getState().messages;
      // 找到当前assistant消息的索引
      const idx = storeMessages.findIndex((m) => m.id === message.id);
      // 找到其之前最近的用户消息对象
      let userMsg: any = null;
      for (let i = idx - 1; i >= 0; i--) {
        const m = storeMessages[i];
        if (m.role === 'user' && typeof m.content === 'string') {
          userMsg = m;
          break;
        }
      }
      if (!userMsg) {
        toast.error('未找到可重试的用户消息');
        return;
      }
      // 删除当前assistant消息
      useStore.setState({ messages: storeMessages.filter((m) => m.id !== message.id) });
      // 读取当前配置并使用原始用户消息（保留其 id）重新发送，避免产生第二条用户输入
      const config = getInputConfigSync();
      await sendMessage(userMsg, {
        deepThinkingMode: config.deepThinkingMode ?? false,
        searchBeforePlanning: config.searchBeforePlanning ?? false,
      });
    } catch (error) {
      console.error('重新生成失败:', error);
      toast.error('重新生成失败');
    }
  }, [message.id, message.role]);
  
  const handleDelete = useCallback(() => {
    if (message.role !== "assistant") return;
    const storeMessages = useStore.getState().messages;
    useStore.setState({ messages: storeMessages.filter((m) => m.id !== message.id) });
    toast.success('消息已删除');
  }, [message.id, message.role]);
  
  // 渲染多模态消息内容的函数
  const renderContent = useMemo(() => {
    if (typeof message.content === "string" && message.content.trim()) {
      return (
        <Markdown
          content={message.content}
          className={cn(
            message.role === "assistant" 
              ? "agent-prose break-words text-sm" 
              : "break-words text-sm text-gray-800"
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
                  className={cn(
                    message.role === "assistant" 
                      ? "agent-prose break-words text-sm" 
                      : "break-words text-sm text-gray-800"
                  )}
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
        style={{ contentVisibility: 'auto' as any, containIntrinsicSize: '300px 1000px', willChange: 'transform, opacity' }}
      >
        {/* 设计方案中使用卡片内的标题徽标替代侧边头像 */}
        {message.role === "assistant" && null}
        <div className="relative w-full">
          {message.role === "assistant" ? (
            <div className="flex items-start gap-3">
              <div className="agent-avatar" aria-hidden="true">🤖</div>
              <div
                className={cn(
                  "agent-reply-card",
                  mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1",
                  "transition-opacity transition-transform duration-150 ease-out"
                )}
              >
                <div className="agent-reply-content">{renderContent}</div>
                <div className="agent-reply-toolbar justify-start">
                  <button
                    onClick={handleCopy}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-md transition-colors text-xs font-medium",
                      "bg-gray-100 hover:bg-gray-200 text-gray-600"
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
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 justify-end">
              <div
                className={cn(
                  "relative inline-block max-w-[85%] rounded-2xl px-4 py-3 leading-relaxed bg-gray-100 text-gray-800 border border-gray-200 shadow-sm ml-auto",
                  mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1",
                  "transition-opacity transition-transform duration-150 ease-out"
                )}
              >
                {renderContent}
                <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100 justify-end">
                  <button
                    onClick={handleCopy}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-md transition-colors text-xs font-medium",
                      "bg-gray-100 hover:bg-gray-200 text-gray-700"
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
                </div>
              </div>
              <div className="user-avatar" aria-hidden="true">👤</div>
            </div>
          )}
          
        </div>
        
        {null}
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

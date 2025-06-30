"use client";

import { nanoid } from "nanoid";
import { useCallback, useRef, useState, useEffect } from "react";

import { sendMessage, useStore, clearMessages, abortCurrentTask } from "~/core/store";
import { abortAllUserTasks } from "~/core/api";
import { cn } from "~/core/utils";


import { AppHeader } from "../_components/AppHeader";
import { InputBox } from "../_components/InputBox";
import { MessageHistoryView } from "../_components/MessageHistoryView";
import { SlidingLayout } from "../_components/SlidingLayout";
import { ResultSidePanel } from "../_components/ResultSidePanel";
import { sidePanelEventManager } from "../_components/ToolCallView";

import { SessionHistoryModal } from "../_components/SessionHistoryModal";
import { LoginModal } from "../_components/LoginModal";
import { MobileSidebar } from "../_components/MobileSidebar";
// LoginModal现在在AppHeader中管理
import { type ToolCallTask } from "~/core/workflow";

export default function HomePage() {
  const abortControllerRef = useRef<AbortController | null>(null);
  const messages = useStore((state) => state.messages);
  const responding = useStore((state) => state.responding);
  const currentTaskId = useStore((state) => state.currentTaskId);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ToolCallTask | undefined>();
  const [isClient, setIsClient] = useState(false);
  const [showSessionHistory, setShowSessionHistory] = useState(false);
  const [sessionHistory, setSessionHistory] = useState<(Message[] | { messages: Message[]; createdAt: number })[]>([]);
  const [user, setUser] = useState<any>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [browserMode, setBrowserMode] = useState(false);

  // 确保客户端渲染
  useEffect(() => {
    setIsClient(true);
    
    // 检查用户登录状态
    const checkLoginStatus = () => {
      const token = localStorage.getItem('auth_token');
      const userInfo = localStorage.getItem('user_info');
      
      if (token && userInfo) {
        try {
          const parsedUser = JSON.parse(userInfo);
          setUser(parsedUser);
        } catch (error) {
          console.error('Failed to parse user info:', error);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_info');
          setUser(null);
        }
      } else {
        setUser(null);
      }
    };
    
    checkLoginStatus();
    
    // 监听storage变化，当其他标签页登录时同步状态
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token' || e.key === 'user_info') {
        checkLoginStatus();
      }
    };
    
    // 监听自定义事件，用于同一页面内的状态同步
    const handleLoginStateChange = () => {
      checkLoginStatus();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('loginStateChanged', handleLoginStateChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('loginStateChanged', handleLoginStateChange);
    };

    // 加载历史记录
    const storedHistory = localStorage.getItem('freetop_session_history');
    if (storedHistory) {
      try {
        setSessionHistory(JSON.parse(storedHistory));
      } catch (e) {
        console.error("Failed to parse session history from localStorage", e);
        setSessionHistory([]);
      }
    }

    const handleAbortAllUserTasks = async () => {
       try {
         const result = await abortAllUserTasks();
         console.log('User tasks aborted:', result);
       } catch (error) {
         console.warn('Failed to abort user tasks:', error);
       }
     };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
       // Abort all user tasks when page is about to unload
       handleAbortAllUserTasks();
       // Also abort local controller if exists
       if (abortControllerRef.current) {
         abortControllerRef.current.abort();
         abortControllerRef.current = null;
       }
     };

     const handleVisibilityChange = () => {
       // 注释掉自动中止逻辑，避免页面切换时误杀任务
       // When page becomes hidden, abort all user tasks to save resources
       // if (document.hidden) {
       //   handleAbortAllUserTasks();
       //   if (abortControllerRef.current) {
       //     abortControllerRef.current.abort();
       //     abortControllerRef.current = null;
       //   }
       // }
     };

    window.addEventListener('beforeunload', handleBeforeUnload);
    // 注释掉页面可见性变化监听，避免切换标签页时自动中止任务
    // document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentTaskId]);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem('freetop_session_history', JSON.stringify(sessionHistory));
    }
  }, [sessionHistory, isClient]);

  // 登录相关功能已移至AppHeader组件

  const handleNewSession = () => {
    if (messages.length > 0) {
      const sessionWithTimestamp = {
        messages: messages,
        createdAt: Date.now()
      };
      setSessionHistory((prevHistory) => [...prevHistory, sessionWithTimestamp]);
    }
    clearMessages();
  };

  const handleSelectSession = (session: Message[]) => {
    useStore.setState({ messages: session });
    setShowSessionHistory(false);
  };

  const handleDeleteSession = (index: number) => {
    setSessionHistory((prevHistory) => prevHistory.filter((_, i) => i !== index));
  };

  // 监听侧边面板事件
  useEffect(() => {
    const unsubscribe = sidePanelEventManager.subscribe((event) => {
      if (event.type === 'open') {
        setSelectedTask(event.task);
        setSidePanelOpen(true);
      }
    });
    return unsubscribe;
  }, []);

  const handleSendMessage = useCallback(
    async (
      content: string,
      config: { deepThinkingMode: boolean; searchBeforePlanning: boolean },
    ) => {
      // 登录检查已移至AppHeader组件
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      
      const message = {
        id: nanoid(),
        role: "user" as const,
        type: "text" as const,
        content,
      };
      
      await sendMessage(
        message,
        config,
        { abortSignal: abortController.signal },
      );
      abortControllerRef.current = null;
    },
    [],
  );

  const handleAbortTask = useCallback(async () => {
    try {
      // 首先尝试通过API中止任务
      const success = await abortCurrentTask();
      
      // 同时中止本地的AbortController
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      
      if (success) {
        console.log('Task aborted successfully');
      } else {
        console.log('No active task to abort');
      }
    } catch (error) {
      console.error('Failed to abort task:', error);
    }
  }, []);
  return (
    <div className="min-h-screen w-full bg-[#faf9f6] relative">
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-purple-50/30"></div>
      
      {/* 桌面端左侧科幻按钮 - 只在中大屏幕显示 */}
      <div className="hidden md:flex fixed left-6 top-1/2 -translate-y-1/2 z-50 flex-col gap-6">
        <button
          onClick={handleNewSession}
          className="group relative w-14 h-14 bg-gradient-to-br from-cyan-400/80 to-blue-500/80 backdrop-blur-md rounded-full border border-cyan-300/50 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-300 hover:scale-110"
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent"></div>
          <div className="flex items-center justify-center w-full h-full">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div className="absolute left-16 top-1/2 transform -translate-y-1/2 bg-black/80 text-white text-sm px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
            新建会话
          </div>
        </button>
        
        <button
          onClick={() => setShowSessionHistory(true)}
          className="group relative w-14 h-14 bg-gradient-to-br from-purple-400/80 to-pink-500/80 backdrop-blur-md rounded-full border border-purple-300/50 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300 hover:scale-110"
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent"></div>
          <div className="flex items-center justify-center w-full h-full">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="absolute left-16 top-1/2 transform -translate-y-1/2 bg-black/80 text-white text-sm px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-20">
            历史记录
          </div>
        </button>
      </div>
      
      {/* 移动端侧边栏 */}
      <MobileSidebar 
        onNewSession={handleNewSession}
        onShowHistory={() => setShowSessionHistory(true)}
      />

      <SlidingLayout
        isOpen={sidePanelOpen}
        onClose={() => setSidePanelOpen(false)}
        sidePanel={<ResultSidePanel task={selectedTask} />}
        browserMode={browserMode}
        onBrowserModeChange={setBrowserMode}
      >
        <div className="flex h-screen w-full flex-col relative z-10">
          {/* Header - 使用AppHeader组件 */}
          <AppHeader />
        
          {/* Main Chat Area */}
          <div className="flex flex-1 justify-center overflow-hidden bg-[#faf9f6]">
            <div className="flex w-full max-w-full flex-col px-4">
              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto pb-[120px]">
                {isClient && messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center px-4">
                    <div className="text-center max-w-2xl">
                      <div className="mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-6 shadow-lg">
                          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <h1 className="text-3xl font-semibold text-gray-800 mb-3">
                          How can I help you today?
                        </h1>
                        <p className="text-gray-600 text-lg leading-relaxed">
                          I'm your AI assistant. Ask me anything or start a conversation.
                        </p>
                      </div>
                    
                      {/* Quick Start Examples */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                        <div className="p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-300 cursor-pointer">
                          <div className="text-sm font-medium text-gray-800 mb-1">💡 Get Ideas</div>
                          <div className="text-xs text-gray-600">Brainstorm creative solutions</div>
                        </div>
                        <div className="p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-300 cursor-pointer">
                          <div className="text-sm font-medium text-gray-800 mb-1">📝 Write Content</div>
                          <div className="text-xs text-gray-600">Create articles, emails, and more</div>
                        </div>
                        <div className="p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-300 cursor-pointer">
                          <div className="text-sm font-medium text-gray-800 mb-1">🔍 Research</div>
                          <div className="text-xs text-gray-600">Find information and insights</div>
                        </div>
                        <div className="p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-300 cursor-pointer">
                          <div className="text-sm font-medium text-gray-800 mb-1">💻 Code Help</div>
                          <div className="text-xs text-gray-600">Debug and write code</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <main className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-6">
                    <div className="mx-auto w-full max-w-4xl xl:max-w-5xl 2xl:max-w-6xl h-full px-2 sm:px-4 md:px-6 lg:px-8">
                      <MessageHistoryView messages={messages} loading={responding} className="h-full" />
                    </div>
                  </main>
                )}
            </div>
            
              {/* Input Area */}
        <div className="fixed bottom-0 left-0 right-0 p-2 sm:p-3 bg-[#faf9f6]/80 backdrop-blur-md border-t border-gray-200/50">
          <div className="mx-auto w-full max-w-4xl xl:max-w-5xl 2xl:max-w-6xl px-2 sm:px-4 md:px-6 lg:px-8">
                  <div className="relative">
                    {user ? (
                      <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md shadow-2xl hover:shadow-3xl transition-all duration-300 hover:bg-white/15">
                        <InputBox
                          onSend={handleSendMessage}
                          onCancel={handleAbortTask}
                          responding={responding}
                          size="normal"
                        />
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-2xl border border-orange-200 bg-orange-50/90 backdrop-blur-md shadow-lg">
                        <div className="p-6 text-center">
                          <div className="mb-4">
                            <svg className="w-12 h-12 text-orange-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">需要登录才能使用</h3>
                            <p className="text-gray-600 mb-4">请先登录您的账户以开始对话</p>
                          </div>
                          <button
                            onClick={() => setShowLoginModal(true)}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                          >
                            立即登录
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SlidingLayout>
      
      {/* 模态框 */}
      {showSessionHistory && (
        <SessionHistoryModal
          isOpen={showSessionHistory}
          onClose={() => setShowSessionHistory(false)}
          sessions={sessionHistory}
          onSelectSession={handleSelectSession}
          onDeleteSession={handleDeleteSession}
        />
      )}
      
      {/* LoginModal */}
      {showLoginModal && (
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={(userData) => {
            setUser(userData);
            setShowLoginModal(false);
            // 强制重新检查登录状态
            setTimeout(() => {
              const token = localStorage.getItem('auth_token');
              const userInfo = localStorage.getItem('user_info');
              if (token && userInfo) {
                try {
                  const parsedUser = JSON.parse(userInfo);
                  setUser(parsedUser);
                } catch (error) {
                  console.error('Failed to parse user info after login:', error);
                }
              }
            }, 100);
          }}
        />
      )}
    </div>
   );
}

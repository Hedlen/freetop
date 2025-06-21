"use client";

import { nanoid } from "nanoid";
import { useCallback, useRef, useState, useEffect } from "react";

import { sendMessage, useStore, clearMessages } from "~/core/store";
import { cn } from "~/core/utils";

import { AppHeader } from "./_components/AppHeader";
import { InputBox } from "./_components/InputBox";
import { MessageHistoryView } from "./_components/MessageHistoryView";
import { SlidingLayout } from "./_components/SlidingLayout";
import { ResultSidePanel } from "./_components/ResultSidePanel";
import { sidePanelEventManager } from "./_components/ToolCallView";
import { SessionHistoryModal } from "./_components/SessionHistoryModal";
import { LoginModal } from "./_components/LoginModal";
import { type ToolCallTask } from "~/core/workflow";

export default function HomePage() {
  const abortControllerRef = useRef<AbortController | null>(null);
  const messages = useStore((state) => state.messages);
  const responding = useStore((state) => state.responding);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ToolCallTask | undefined>();
  const [isClient, setIsClient] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSessionHistory, setShowSessionHistory] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [sessionHistory, setSessionHistory] = useState<Message[][]>([]);

  // 确保客户端渲染
  useEffect(() => {
    setIsClient(true);
    // 检查登录状态
    const loginStatus = localStorage.getItem('freetop_logged_in');
    setIsLoggedIn(loginStatus === 'true');

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
  }, []);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem('freetop_session_history', JSON.stringify(sessionHistory));
    }
  }, [sessionHistory, isClient]);

  const handleLogin = (username: string, password: string) => {
    if (username && password) {
      localStorage.setItem('freetop_logged_in', 'true');
      localStorage.setItem('freetop_username', username);
      setIsLoggedIn(true);
      setShowLoginModal(false);
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    localStorage.removeItem('freetop_logged_in');
    localStorage.removeItem('freetop_username');
    setIsLoggedIn(false);
    setSessionHistory([]); // 登出时清空历史记录
    clearMessages(); // 清空当前消息
  };

  const handleNewSession = () => {
    if (messages.length > 0) {
      setSessionHistory((prevHistory) => [...prevHistory, messages]);
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
      if (!isLoggedIn) {
        setShowLoginModal(true);
        return;
      }
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      await sendMessage(
        {
          id: nanoid(),
          role: "user",
          type: "text",
          content,
        },
        config,
        { abortSignal: abortController.signal },
      );
      abortControllerRef.current = null;
    },
    [isLoggedIn],
  );
  return (
    <div className="min-h-screen w-full bg-[#faf9f6] relative">
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-purple-50/30"></div>
      
      {/* 左侧科幻按钮 */}
      <div className="fixed left-6 top-20 z-50" style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
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

      <SlidingLayout
        isOpen={sidePanelOpen}
        onClose={() => setSidePanelOpen(false)}
        sidePanel={<ResultSidePanel task={selectedTask} />}
      >
        <div className="flex h-screen w-full flex-col relative z-10">
          {/* Header */}
          <header className="flex-shrink-0 border-b border-gray-200 bg-white/80 backdrop-blur-md px-6 py-4">
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-sm">F</span>
                </div>
                <h1 className="text-xl font-semibold text-gray-800">FreeTop</h1>
              </div>
              <div className="flex items-center space-x-3">
                {isLoggedIn ? (
                  <>
                    <span className="text-gray-600 text-sm">
                      欢迎, {localStorage.getItem('freetop_username') || '用户'}
                    </span>
                    <button 
                      onClick={handleLogout}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200 border border-gray-200"
                    >
                      退出
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => setShowLoginModal(true)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200 border border-gray-200"
                    >
                      登录
                    </button>
                    <button 
                      onClick={() => setShowLoginModal(true)}
                      className="px-4 py-2 text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-all duration-200 border border-blue-400"
                    >
                      注册
                    </button>
                  </>
                )}
              </div>
            </div>
          </header>
        
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
                  <main className="flex-1 overflow-y-auto p-6 flex flex-col">
                    <div className="mx-auto w-full max-w-4xl flex-1 flex flex-col justify-end">
                      <MessageHistoryView messages={messages} loading={responding} className="flex-1" />
                    </div>
                  </main>
                )}
            </div>
            
              {/* Input Area */}
              <div className="p-4">
                <div className="mx-auto max-w-4xl">
                  <div className="relative">
                    {!isLoggedIn && (
                      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm rounded-2xl z-10 flex items-center justify-center">
                        <div className="text-white text-center">
                          <p className="mb-2">请先登录以使用AI助手</p>
                          <button 
                            onClick={() => setShowLoginModal(true)}
                            className="px-4 py-2 bg-blue-500/80 hover:bg-blue-600/80 text-white rounded-lg transition-all duration-200"
                          >
                            立即登录
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md shadow-2xl hover:shadow-3xl transition-all duration-300 hover:bg-white/15">
                      <InputBox
                        onSend={handleSendMessage}
                        responding={responding}
                        size="normal"
                      />
                    </div>
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
      
      {showLoginModal && (
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onLogin={handleLogin}
        />
      )}
    </div>
   );
}

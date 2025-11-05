"use client";

import { useState, useEffect } from "react";

import { cn } from "~/core/utils";

import { ContentDetailModal } from "./ContentDetailModal";


/* eslint-disable @next/next/no-img-element */
interface BrowserSession {
  id: string;
  url: string;
  title: string;
  gifPath?: string;
  timestamp: number;
  instruction: string;
}

interface BrowserEmbedViewProps {
  className?: string;
}

export function BrowserEmbedView({ className }: BrowserEmbedViewProps) {
  const [sessions, setSessions] = useState<BrowserSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGifModalOpen, setIsGifModalOpen] = useState(false);
  const [selectedGifData, setSelectedGifData] = useState<{
    gifPath: string;
    instruction: string;
    title: string;
  } | null>(null);

  // 监听浏览器工具调用事件
  useEffect(() => {
    const handleBrowserToolCall = (event: CustomEvent) => {
      console.log('🚀 接收到浏览器工具调用:', event.detail.toolName);
      const { toolCallId, toolName, toolInput } = event.detail;
      
      if (toolName === 'browser' || toolName === 'smart_browser') {
        // 创建新的浏览器会话
        const newSession: BrowserSession = {
          id: toolCallId,
          url: toolInput.target_url ?? extractUrlFromInstruction(toolInput.instruction) ?? 'about:blank',
          title: `浏览器会话 ${sessions.length + 1}`,
          instruction: toolInput.instruction ?? '浏览器操作',
          timestamp: Date.now(),
        };
        
        console.log('📝 创建新会话:', { id: newSession.id, url: newSession.url });
        setSessions(prev => {
          const updated = [...prev, newSession];
          console.log('📋 会话列表更新，总数:', updated.length);
          return updated;
        });
        setActiveSessionId(newSession.id);
        setIsLoading(true);
      }
    };

    const handleBrowserToolResult = (event: CustomEvent) => {
      console.log('🎯 接收到浏览器工具结果');
      const { toolCallId, toolResult } = event.detail;
      
      // 更新会话结果
      setSessions(prev => prev.map(session => {
        if (session.id === toolCallId) {
          let gifPath = '';
          console.log('🔍 开始解析工具结果:', { toolCallId, toolResultType: typeof toolResult });
          try {
            const result = typeof toolResult === 'string' ? JSON.parse(toolResult) : toolResult;
            console.log('📋 解析后的结果对象:', result);
            gifPath = result.generated_gif_path ?? '';
            console.log('🎬 解析到GIF路径:', gifPath);
            if (gifPath) {
              const filename = gifPath.split('/').pop();
              const apiUrl = `/api/browser_history/${filename}`;
              console.log('📁 GIF文件名:', filename);
              console.log('🌐 API URL:', apiUrl);
              
              // 测试API端点是否可访问
              void fetch(apiUrl, { method: 'HEAD' })
                .then(response => {
                  console.log('✅ GIF文件可访问:', { status: response.status, url: apiUrl });
                })
                .catch(error => {
                  console.error('❌ GIF文件访问失败:', { error, url: apiUrl });
                });
            } else {
              console.warn('⚠️ 未找到generated_gif_path字段');
            }
          } catch (e) {
            console.warn('⚠️ 解析浏览器工具结果失败:', e);
            console.warn('📄 原始结果:', toolResult);
          }
          
          const updatedSession = {
            ...session,
            gifPath,
            title: extractTitleFromResult(toolResult) ?? session.title,
          };
          console.log('✅ 会话更新完成:', { id: session.id, hasGif: !!gifPath, gifPath });
          return updatedSession;
        }
        return session;
      }));
      
      setIsLoading(false);
    };

    // 添加事件监听器
    console.log('🔗 注册浏览器事件监听器');
    window.addEventListener('browser-tool-call', handleBrowserToolCall as EventListener);
    window.addEventListener('browser-tool-result', handleBrowserToolResult as EventListener);

    return () => {
      console.log('🔌 移除浏览器事件监听器');
      window.removeEventListener('browser-tool-call', handleBrowserToolCall as EventListener);
      window.removeEventListener('browser-tool-result', handleBrowserToolResult as EventListener);
    };
  }, [sessions.length]);

  const extractUrlFromInstruction = (instruction: string): string | null => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const match = instruction.match(urlRegex);
    return match ? match[0] : null;
  };

  const handleGifClick = (session: BrowserSession) => {
    if (session.gifPath) {
      const url = extractUrlFromInstruction(session.instruction);
      setSelectedGifData({
        gifPath: session.gifPath,
        instruction: session.instruction,
        title: url ? `浏览器操作 - ${new URL(url).hostname}` : '浏览器操作录制'
      });
      setIsGifModalOpen(true);
    }
  };

  const handleCloseGifModal = () => {
    setIsGifModalOpen(false);
    setSelectedGifData(null);
  };

  const extractTitleFromResult = (result: any): string | null => {
    try {
      const parsed = typeof result === 'string' ? JSON.parse(result) : result;
      const content = parsed.result_content ?? '';
      
      // 尝试从内容中提取标题
      const titleExec = /<title[^>]*>([^<]+)<\/title>/i.exec(content);
      if (titleExec) {
        return titleExec[1].trim();
      }
      
      // 使用内容的前50个字符作为标题
      const firstLine = content.split('\n')[0];
      return firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;
    } catch {
      return null;
    }
  };

  const activeSession = sessions.find(s => s.id === activeSessionId) ?? sessions[sessions.length - 1];
  
  // 当前活跃会话状态
  console.log('🔍 当前会话状态:', {
    activeSessionId,
    hasActiveSession: !!activeSession,
    sessionsCount: sessions.length,
    hasGifPath: !!activeSession?.gifPath
  });

  if (sessions.length === 0) {
    console.log('📭 暂无浏览器会话');
    return (
      <div className={cn("flex flex-col h-full bg-gray-50", className)}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9V3" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">浏览器未启动</h3>
            <p className="text-sm text-gray-600">当使用浏览器工具时，页面将在这里显示</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full bg-white", className)}>
      {/* 会话标签栏 */}
      {sessions.length > 1 && (
        <div className="flex border-b border-gray-200 bg-gray-50">
          <div className="flex overflow-x-auto">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => setActiveSessionId(session.id)}
                className={cn(
                  "flex items-center px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap",
                  activeSessionId === session.id
                    ? "border-blue-500 text-blue-600 bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9V3" />
                </svg>
                <span className="truncate max-w-32">{session.title}</span>
                {sessions.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSessions(prev => prev.filter(s => s.id !== session.id));
                      if (activeSessionId === session.id) {
                        const remainingSessions = sessions.filter(s => s.id !== session.id);
                        setActiveSessionId(remainingSessions.length > 0 ? remainingSessions[0].id : null);
                      }
                    }}
                    className="ml-2 p-1 hover:bg-gray-200 rounded"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 浏览器内容区域 */}
      <div className="flex-1 flex flex-col">
        {activeSession && (
          <>
            {/* 地址栏 */}
            <div className="flex items-center px-4 py-2 bg-gray-100 border-b border-gray-200">
              <div className="flex items-center space-x-2 flex-1">
                <div className="flex space-x-1">
                  <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-white border border-gray-300 rounded px-3 py-1 text-sm text-gray-700">
                    {activeSession.url}
                  </div>
                </div>
                <button className="p-1 hover:bg-gray-200 rounded">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 浏览器操作显示区域 */}
            <div className="flex-1 relative bg-gray-50">
              {isLoading && activeSessionId === activeSession.id ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-gray-600">正在执行浏览器操作...</span>
                    <span className="text-xs text-gray-500">操作将在服务器端完成</span>
                  </div>
                </div>
              ) : (
                  <div className="h-full flex items-center justify-center bg-gray-50">
                    <div className="text-center text-gray-500">
                      <div className="w-12 h-12 mx-auto mb-4 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <div className="text-lg font-medium mb-2">GIF生成中...</div>
                      <div className="text-sm">浏览器操作录制完成后将显示在这里</div>
                    </div>
                  </div>
                )}
              {activeSession.gifPath ? (
                <div className="h-full flex flex-col">
                  <div className="flex-1 flex items-center justify-center bg-gray-50">
                    <div className="max-w-full max-h-full relative group cursor-pointer" onClick={() => handleGifClick(activeSession)}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {/* 使用 <img> 显示动态GIF以保留原始帧与手动重载 */}
                      <img
                        src={`/api/browser_history/${activeSession.gifPath.split('/').pop()}`}
                        alt="浏览器操作录制"
                        className="max-w-full max-h-full object-contain rounded-lg shadow-lg transition-transform group-hover:scale-105"
                        onLoad={() => {
                          console.log('✅ GIF加载成功:', {
                            originalPath: activeSession.gifPath,
                            filename: activeSession.gifPath.split('/').pop(),
                            url: `/api/browser_history/${activeSession.gifPath.split('/').pop()}`
                          });
                        }}
                        onError={(e) => {
                          console.error('❌ GIF加载失败:', {
                            gifPath: activeSession.gifPath,
                            filename: activeSession.gifPath.split('/').pop(),
                            url: `/api/browser_history/${activeSession.gifPath.split('/').pop()}`,
                            actualSrc: e.currentTarget.src,
                            naturalWidth: e.currentTarget.naturalWidth,
                            naturalHeight: e.currentTarget.naturalHeight
                          });
                          // 尝试重新加载
                          setTimeout(() => {
                            e.currentTarget.src = e.currentTarget.src + '?t=' + Date.now();
                          }, 1000);
                        }}
                      />
                      {/* 悬停时显示的放大图标 */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white rounded-full p-3 shadow-lg">
                          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 border-t border-gray-200">
                    <div className="text-sm text-gray-600">
                      <div className="font-medium mb-1">执行的操作:</div>
                      <div>{activeSession.instruction}</div>
                      <div className="mt-2 text-xs text-gray-500">
                        GIF路径: {activeSession.gifPath}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center text-gray-500 max-w-md">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                      <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9V3" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">服务器端浏览器</h3>
                    <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                      浏览器操作将在服务器端的 Playwright 环境中执行，
                      <br />操作过程会被录制为 GIF 并在完成后显示结果。
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-xs text-blue-700">
                        <strong>当前指令：</strong>{activeSession.instruction}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      
      {/* GIF详情模态框 */}
      {selectedGifData && (
        <ContentDetailModal
           isOpen={isGifModalOpen}
           onClose={handleCloseGifModal}
           title={selectedGifData.title}
           content={`/api/browser_history/${selectedGifData.gifPath.split('/').pop()}`}
           type="gif"
           url={extractUrlFromInstruction(selectedGifData.instruction) ?? undefined}
         />
      )}
    </div>
  );
}
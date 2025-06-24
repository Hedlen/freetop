import { useEffect, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { type Message, type ContentItem } from "~/core/messaging";
import { cn } from "~/core/utils";
import { sendMessage, useStore, setResponding, addMessage, updateMessage } from "~/core/store";

import { LoadingAnimation } from "./LoadingAnimation";
import { Markdown } from "./Markdown";
import { WorkflowProgressView } from "./WorkflowProgressView";

export function MessageHistoryView({
  className,
  messages,
  loading,
}: {
  className?: string;
  messages: Message[];
  loading?: boolean;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [scrollTimeout, setScrollTimeout] = useState<NodeJS.Timeout | null>(null);

  // 检测用户是否在手动滚动
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50; // 50px容差
      
      if (!isAtBottom) {
        setIsUserScrolling(true);
        
        // 清除之前的定时器
        if (scrollTimeout) {
          clearTimeout(scrollTimeout);
        }
        
        // 设置新的定时器，3秒后重置滚动状态
        const timeout = setTimeout(() => {
          setIsUserScrolling(false);
        }, 3000);
        setScrollTimeout(timeout);
      } else {
        setIsUserScrolling(false);
        if (scrollTimeout) {
          clearTimeout(scrollTimeout);
          setScrollTimeout(null);
        }
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  }, [scrollTimeout]);

  // 只在用户没有手动滚动时才自动滚动到底部
  useEffect(() => {
    if (!isUserScrolling) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, isUserScrolling]);

  return (
    <div ref={containerRef} className={cn(className, "overflow-y-auto flex flex-col")}>
      <div className="flex-1" />
      <div className="flex-shrink-0">
        {messages.map((message) => (
          <MessageView key={message.id} message={message} />
        ))}
        {loading && <LoadingAnimation className="mt-8" />}
        <div ref={endRef} />
      </div>
    </div>
  );
}

function MessageView({ message }: { message: Message }) {
  const [isHovered, setIsHovered] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  
  const handleCopy = async () => {
    if (message.type === "text" && message.content) {
      try {
        await navigator.clipboard.writeText(message.content);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.error('复制失败:', err);
      }
    }
  };
  
  const handleRetry = async () => {
    if (message.type === "text" && message.role === "assistant") {
      const messages = useStore.getState().messages;
      const currentIndex = messages.findIndex(m => m.id === message.id);
      
      if (currentIndex > 0) {
        // 找到前一条用户消息
        const userMessage = messages[currentIndex - 1];
        if (userMessage && userMessage.role === "user") {
          // 删除当前AI回复
          const newMessages = messages.filter(m => m.id !== message.id);
          useStore.setState({ messages: newMessages });
          
          // 直接使用现有的用户消息重新生成回复，不添加新的用户消息
           const { chatStream } = await import('~/core/api');
          const stream = chatStream(userMessage, useStore.getState().state, {
            deepThinkingMode: false,
            searchBeforePlanning: false
          });
          
          setResponding(true);
          
          let textMessage: any = null;
          try {
            for await (const event of stream) {
              // 捕获任务ID
              if (event.taskId) {
                useStore.setState({ currentTaskId: event.taskId });
              }
              
              switch (event.type) {
                case "start_of_agent":
                  textMessage = {
                    id: event.data.agent_id,
                    role: "assistant",
                    type: "text",
                    content: "",
                  };
                  addMessage(textMessage);
                  break;
                case "message":
                  if (textMessage) {
                    textMessage.content += event.data.delta.content;
                    updateMessage({
                      id: textMessage.id,
                      content: textMessage.content,
                    });
                  }
                  break;
                case "end_of_agent":
                  textMessage = null;
                  break;
                case "start_of_workflow":
                   const { WorkflowEngine } = await import('~/core/workflow/WorkflowEngine');
                  const workflowEngine = new WorkflowEngine();
                  const workflow = workflowEngine.start(event);
                  const workflowMessage = {
                    id: event.data.workflow_id,
                    role: "assistant",
                    type: "workflow",
                    content: { workflow: workflow },
                  };
                  addMessage(workflowMessage);
                  for await (const updatedWorkflow of workflowEngine.run(stream)) {
                    updateMessage({
                      id: workflowMessage.id,
                      content: { workflow: updatedWorkflow },
                    });
                  }
                  break;
                case "end_of_workflow":
                  break;
                default:
                  console.log("Unknown event type:", event.type);
              }
            }
          } catch (error) {
            console.error("Error during retry:", error);
          } finally {
            setResponding(false);
            useStore.setState({ currentTaskId: null });
          }
        }
      }
    }
  };
  
  const handleDelete = () => {
    if (message.role === "assistant") {
      const messages = useStore.getState().messages;
      const newMessages = messages.filter(m => m.id !== message.id);
      useStore.setState({ messages: newMessages });
    }
  };
  
  console.log("Rendering message:", message);
  
  // 渲染多模态消息内容的函数
  const renderContent = () => {
    if (message.type === "multimodal" && Array.isArray(message.content)) {
      return (
        <div className="space-y-3">
          {message.content.map((item: ContentItem, index: number) => {
            if (item.type === "text" && item.text) {
              return (
                <Markdown
                  key={index}
                  className={cn(
                    "prose prose-sm max-w-none break-words text-sm",
                    message.role === "user" && "prose-invert",
                    message.role === "assistant" && "prose-gray"
                  )}
                  components={{
                    a: ({ href, children }) => (
                      <a 
                        href={href} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className={cn(
                          "underline transition-colors",
                          message.role === "user" ? "text-blue-200 hover:text-white" : "text-blue-600 hover:text-blue-800"
                        )}
                      >
                        {children}
                      </a>
                    ),
                    p: ({ children }) => (
                      <p className="mb-1.5 last:mb-0 text-sm leading-relaxed">{children}</p>
                    ),
                    code: ({ children, className }) => {
                      const isInline = !className;
                      return isInline ? (
                        <code className={cn(
                          "px-1 py-0.5 rounded text-xs font-mono whitespace-pre-wrap",
                          message.role === "user" ? "bg-blue-700 text-blue-100" : "bg-gray-100 text-gray-800"
                        )}>
                          {children}
                        </code>
                      ) : (
                        <code className={cn(className, "whitespace-pre-wrap")} >{children}</code>
                      );
                    },
                  }}
                >
                  {item.text}
                </Markdown>
              );
            } else if (item.type === "image" && item.image_url) {
              return (
                <div key={index} className="mt-2">
                  <img 
                    src={item.image_url} 
                    alt="用户上传的图片" 
                    className="max-w-full h-auto rounded-lg shadow-sm border border-gray-200"
                    style={{ maxHeight: '300px' }}
                  />
                </div>
              );
            }
            return null;
          })}
        </div>
      );
    } else if (message.type === "text" && typeof message.content === "string") {
      return (
        <Markdown
          className={cn(
            "prose prose-sm max-w-none break-words text-sm",
            message.role === "user" && "prose-invert",
            message.role === "assistant" && "prose-gray"
          )}
          components={{
            a: ({ href, children }) => (
              <a 
                href={href} 
                target="_blank" 
                rel="noopener noreferrer" 
                className={cn(
                  "underline transition-colors",
                  message.role === "user" ? "text-blue-200 hover:text-white" : "text-blue-600 hover:text-blue-800"
                )}
              >
                {children}
              </a>
            ),
            p: ({ children }) => (
              <p className="mb-1.5 last:mb-0 text-sm leading-relaxed">{children}</p>
            ),
            code: ({ children, className }) => {
              const isInline = !className;
              return isInline ? (
                <code className={cn(
                  "px-1 py-0.5 rounded text-xs font-mono whitespace-pre-wrap",
                  message.role === "user" ? "bg-blue-700 text-blue-100" : "bg-gray-100 text-gray-800"
                )}>
                  {children}
                </code>
              ) : (
                <code className={cn(className, "whitespace-pre-wrap")} >{children}</code>
              );
            },
          }}
        >
          {message.content}
        </Markdown>
      );
    }
    return null;
  };

  if ((message.type === "text" && message.content) || (message.type === "multimodal" && Array.isArray(message.content))) {
    return (
      <div 
        className={cn("flex mb-8 group", message.role === "user" ? "justify-end" : "justify-start")}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
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
            {renderContent()}
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
}

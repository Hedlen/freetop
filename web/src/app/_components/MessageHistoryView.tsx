import { useEffect, useRef, useState } from "react";
import { type Message } from "~/core/messaging";
import { cn } from "~/core/utils";
import { sendMessage } from "~/core/store";

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

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className={cn(className)}>
      {messages.map((message) => (
        <MessageView key={message.id} message={message} />
      ))}
      {loading && <LoadingAnimation className="mt-8" />}
      <div ref={endRef} />
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
    if (message.type === "text" && message.role === "user") {
      const newMessage: Message = {
        id: `retry-${Date.now()}`,
        role: "user",
        type: "text",
        content: message.content
      };
      await sendMessage(newMessage, {
        deepThinkingMode: false,
        searchBeforePlanning: false
      });
    }
  };
  
  console.log("Rendering message:", message);
  if (message.type === "text" && message.content) {
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
              "relative w-full md:max-w-[75%] lg:max-w-[60%] xl:max-w-[50%] rounded-lg px-4 py-3 leading-relaxed",
              message.role === "user" && "bg-blue-600 text-white ml-auto",
              message.role === "assistant" && "bg-[#fefefe] border border-gray-100 text-gray-800 shadow-sm",
            )}
          >
          <Markdown
            className={cn(
              "prose max-w-none break-words", // Added break-words
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
                <p className="mb-2 last:mb-0">{children}</p>
              ),
              code: ({ children, className }) => {
                const isInline = !className;
                return isInline ? (
                  <code className={cn(
                    "px-1.5 py-0.5 rounded text-sm font-mono whitespace-pre-wrap", // Added whitespace-pre-wrap
                    message.role === "user" ? "bg-blue-700 text-blue-100" : "bg-gray-100 text-gray-800"
                  )}>
                    {children}
                  </code>
                ) : (
                  <code className={cn(className, "whitespace-pre-wrap")} >{children}</code> // Added whitespace-pre-wrap
                );
              },
            }}
          >
            {message.content}
          </Markdown>
          </div>
          
          {/* 操作按钮 */}
          {isHovered && (
            <div className={cn(
              "absolute flex gap-1 transition-opacity duration-200",
              message.role === "user" 
                ? "right-0 top-2 -translate-x-2" 
                : "left-0 top-2 translate-x-2"
            )}>
              <button
                onClick={handleCopy}
                className={cn(
                  "p-1.5 rounded-md transition-colors text-xs",
                  message.role === "user" 
                    ? "bg-blue-700 hover:bg-blue-800 text-white" 
                    : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                )}
                title="复制消息"
              >
                {copySuccess ? (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
              
              {message.role === "user" && (
                <button
                  onClick={handleRetry}
                  className="p-1.5 rounded-md bg-blue-700 hover:bg-blue-800 text-white transition-colors text-xs"
                  title="重试消息"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              )}
            </div>
          )}
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

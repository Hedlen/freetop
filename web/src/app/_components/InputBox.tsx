// 移除Ant Design图标导入
import { type KeyboardEvent, useCallback, useEffect, useState, useRef } from "react";

import { Atom } from "~/core/icons";
import { cn } from "~/core/utils";


export function InputBox({
  className,
  size,
  responding,
  onSend,
  onCancel,
}: {
  className?: string;
  size?: "large" | "normal";
  responding?: boolean;
  onSend?: (
    content: string,
    options: { deepThinkingMode: boolean; searchBeforePlanning: boolean },
  ) => void;
  onCancel?: () => void;
}) {
  const [message, setMessage] = useState("");

  const [deepThinkingMode, setDeepThinkMode] = useState(false);
  const [searchBeforePlanning, setSearchBeforePlanning] = useState(false);
  const [imeStatus, setImeStatus] = useState<"active" | "inactive">("inactive");
  const [isClient, setIsClient] = useState(false);

  
  const saveConfig = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        "langmanus.config.inputbox",
        JSON.stringify({ deepThinkingMode, searchBeforePlanning }),
      );
    }
  }, [deepThinkingMode, searchBeforePlanning]);
  
  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const config = localStorage.getItem("langmanus.config.inputbox");
      if (config) {
        try {
          const { deepThinkingMode, searchBeforePlanning } = JSON.parse(config);
          setDeepThinkMode(deepThinkingMode);
          setSearchBeforePlanning(searchBeforePlanning);
        } catch (error) {
          console.warn('Failed to parse config from localStorage:', error);
        }
      }
    }
  }, []);
  
  useEffect(() => {
    if (isClient) {
      saveConfig();
    }
  }, [deepThinkingMode, searchBeforePlanning, saveConfig, isClient]);


  const handleSendMessage = useCallback(() => {
    if (responding) {
      onCancel?.();
    } else {
      if (message.trim() === "") {
        return;
      }
      if (onSend) {
        onSend(message, { deepThinkingMode, searchBeforePlanning });
        setMessage("");
      }
    }
  }, [
    responding,
    onCancel,
    message,
    onSend,
    deepThinkingMode,
    searchBeforePlanning,
  ]);
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (responding) {
        return;
      }
      if (
        event.key === "Enter" &&
        !event.shiftKey &&
        !event.metaKey &&
        !event.ctrlKey &&
        imeStatus === "inactive"
      ) {
        event.preventDefault();
        handleSendMessage();
      }
    },
    [responding, imeStatus, handleSendMessage],
  );
  return (
    <div className={cn(className)}>

      <div className="w-full">
        <textarea
          className={cn(
            "m-0 w-full resize-none border-none px-2 sm:px-3 lg:px-4 xl:px-5 py-1 sm:py-1.5 lg:py-2 xl:py-2.5 text-xs sm:text-sm lg:text-base xl:text-lg bg-transparent text-gray-800 placeholder-gray-400",
            size === "large" ? "min-h-12 sm:min-h-16 lg:min-h-20 xl:min-h-24" : "min-h-2",
          )}
          placeholder="What can I do for you?"
          value={message}
          onCompositionStart={() => setImeStatus("active")}
          onCompositionEnd={() => setImeStatus("inactive")}
          onKeyDown={handleKeyDown}
          onChange={(event) => {
            setMessage(event.target.value);
          }}
        />
      </div>
      <div className="flex items-center px-2 sm:px-3 py-1 sm:py-1.5">
        <div className="flex flex-grow items-center gap-1 sm:gap-2 lg:gap-3 xl:gap-4">

          <button
            className={cn(
              "flex h-6 sm:h-8 lg:h-9 xl:h-10 items-center gap-1 sm:gap-2 rounded-xl sm:rounded-2xl border px-2 sm:px-4 lg:px-5 xl:px-6 text-xs sm:text-sm lg:text-base transition-all duration-300 hover:shadow-lg",
              deepThinkingMode
                ? "border-blue-400 bg-blue-100 text-blue-700 shadow-lg shadow-blue-500/20"
                : "border-gray-300 bg-white text-gray-600 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700",
            )}
            onClick={() => {
              setDeepThinkMode(!deepThinkingMode);
            }}
          >
            <Atom className={cn("h-4 w-4", deepThinkingMode ? "text-blue-600" : "text-gray-600")} />
            <span>Deep Think</span>
          </button>
          <button
            className={cn(
              "flex h-6 sm:h-8 lg:h-9 xl:h-10 items-center gap-1 rounded-lg border px-2 sm:px-3 lg:px-4 xl:px-5 text-xs sm:text-sm lg:text-base transition-all duration-200",
              searchBeforePlanning
                ? "border-blue-400 bg-blue-100 text-blue-700 shadow-lg shadow-blue-500/20"
                : "border-gray-300 bg-white text-gray-700 hover:bg-blue-100 hover:border-blue-400",
            )}
            onClick={() => {
              setSearchBeforePlanning(!searchBeforePlanning);
            }}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9m0 9c-5 0-9-4-9-9s4-9 9-9" />
            </svg>
            <span>Search</span>
          </button>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2 lg:gap-3">
          <button
            className={cn(
              "h-8 w-8 sm:h-10 sm:w-10 lg:h-11 lg:w-11 xl:h-12 xl:w-12 rounded-full transition-all duration-300 hover:shadow-lg flex items-center justify-center",
              responding 
                ? "bg-red-600/80 text-red-200 hover:bg-red-500/90 shadow-red-500/30" 
                : "bg-blue-500 text-white hover:bg-blue-600 hover:shadow-blue-500/30 disabled:bg-gray-400 disabled:text-gray-300",
            )}
            title={responding ? "Cancel" : "Send"}
            onClick={handleSendMessage}
          >
            {responding ? (
              <div className="h-4 w-4 rounded bg-red-300" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

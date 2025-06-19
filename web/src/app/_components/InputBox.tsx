import { ArrowUpOutlined, GlobalOutlined } from "@ant-design/icons";
import { type KeyboardEvent, useCallback, useEffect, useState } from "react";

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
    message: string,
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
            "m-0 w-full resize-none border-none px-4 py-3 text-lg",
            size === "large" ? "min-h-32" : "min-h-4",
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
      <div className="flex items-center px-4 py-2">
        <div className="flex flex-grow items-center gap-2">
          <button
            className={cn(
              "flex h-8 items-center gap-2 rounded-2xl border px-4 text-sm transition-shadow hover:shadow",
              deepThinkingMode
                ? "border-primary bg-primary/15 text-primary"
                : "text-button hover:bg-button-hover hover:text-button-hover",
            )}
            onClick={() => {
              setDeepThinkMode(!deepThinkingMode);
            }}
          >
            <Atom className="h-4 w-4" />
            <span>Deep Think</span>
          </button>
          <button
            className={cn(
              "flex h-8 items-center rounded-2xl border px-4 text-sm transition-shadow hover:shadow",
              searchBeforePlanning
                ? "border-primary bg-primary/15 text-primary"
                : "text-button hover:bg-button-hover hover:text-button-hover",
            )}
            onClick={() => {
              setSearchBeforePlanning(!searchBeforePlanning);
            }}
          >
            <GlobalOutlined className="h-6 w-6" />
            <span>Search</span>
          </button>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <button
            className={cn(
              "h-10 w-10 rounded-full text-button transition-shadow hover:bg-button-hover hover:text-button-hover hover:shadow",
              responding ? "bg-button-hover" : "bg-button",
            )}
            title={responding ? "Cancel" : "Send"}
            onClick={handleSendMessage}
          >
            {responding ? (
              <div className="flex h-10 w-10 items-center justify-center">
                <div className="h-4 w-4 rounded bg-red-300" />
              </div>
            ) : (
              <ArrowUpOutlined />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

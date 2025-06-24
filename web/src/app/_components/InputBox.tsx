// 移除Ant Design图标导入
import { type KeyboardEvent, useCallback, useEffect, useState, useRef } from "react";

import { Atom } from "~/core/icons";
import { cn } from "~/core/utils";
import { type ContentItem } from "~/core/messaging";

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
    content: string | ContentItem[],
    options: { deepThinkingMode: boolean; searchBeforePlanning: boolean },
  ) => void;
  onCancel?: () => void;
}) {
  const [message, setMessage] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [deepThinkingMode, setDeepThinkMode] = useState(false);
  const [searchBeforePlanning, setSearchBeforePlanning] = useState(false);
  const [imeStatus, setImeStatus] = useState<"active" | "inactive">("inactive");
  const [isClient, setIsClient] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          setImages(prev => [...prev, result]);
        };
        reader.readAsDataURL(file);
      }
    });
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const removeImage = useCallback((index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSendMessage = useCallback(() => {
    if (responding) {
      onCancel?.();
    } else {
      if (message.trim() === "" && images.length === 0) {
        return;
      }
      if (onSend) {
        // 构建多模态内容
        if (images.length > 0) {
          const content: ContentItem[] = [];
          if (message.trim()) {
            content.push({ type: "text", text: message.trim() });
          }
          images.forEach(imageUrl => {
            content.push({ type: "image", image_url: imageUrl });
          });
          onSend(content, { deepThinkingMode, searchBeforePlanning });
        } else {
          onSend(message, { deepThinkingMode, searchBeforePlanning });
        }
        setMessage("");
        setImages([]);
      }
    }
  }, [
    responding,
    onCancel,
    message,
    images,
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
      {/* 图片预览区域 */}
      {images.length > 0 && (
        <div className="mb-2 p-2 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            {images.map((image, index) => (
              <div key={index} className="relative group">
                <img
                  src={image}
                  alt={`Upload ${index + 1}`}
                  className="w-16 h-16 object-cover rounded-lg border border-gray-300"
                />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
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
          {/* 图片上传按钮 */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex h-6 sm:h-8 lg:h-9 xl:h-10 items-center gap-1 rounded-lg border px-2 sm:px-3 lg:px-4 xl:px-5 text-xs sm:text-sm lg:text-base transition-all duration-200 border-gray-300 bg-white text-gray-700 hover:bg-blue-100 hover:border-blue-400"
            title="Upload Image"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="hidden sm:inline">Image</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
          />
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

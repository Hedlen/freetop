"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "~/core/utils";

interface MediaCardProps {
  src: string;
  type: "image" | "video";
  title?: string;
  description?: string;
  className?: string;
  onClick?: () => void;
}

export function MediaCard({ src, type, title, description, className, onClick }: MediaCardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  if (hasError) {
    return (
      <div className={cn(
        "bg-gray-100 border border-gray-200 rounded-lg p-4 text-center",
        "hover:shadow-md transition-shadow cursor-pointer",
        className
      )} onClick={onClick}>
        <div className="text-gray-400 text-2xl mb-2">
          {type === "image" ? "🖼️" : "🎥"}
        </div>
        <p className="text-sm text-gray-500">媒体加载失败</p>
        {title && <p className="text-xs text-gray-400 mt-1">{title}</p>}
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm",
      "hover:shadow-md transition-shadow cursor-pointer",
      className
    )} onClick={onClick}>
      {/* 媒体内容 */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {type === "image" ? (
          <Image
            src={src}
            alt={title ?? "图片"}
            width={768}
            height={288}
            unoptimized
            className="w-full h-48 object-cover"
            onLoad={handleLoad as any}
            onError={handleError as any}
          />
        ) : (
          <video
            src={src}
            className="w-full h-48 object-cover"
            controls
            preload="metadata"
            onLoadedData={handleLoad}
            onError={handleError}
          />
        )}
        
        {/* 媒体类型标识 */}
        <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
          {type === "image" ? "图片" : "视频"}
        </div>
      </div>
      
      {/* 媒体信息 */}
      {(title ?? description) && (
        <div className="p-3">
          {title && (
            <h4 className="font-medium text-gray-900 text-sm mb-1 line-clamp-2">
              {title}
            </h4>
          )}
          {description && (
            <p className="text-xs text-gray-600 line-clamp-3">
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// 媒体网格组件
interface MediaGridProps {
  mediaItems: Array<{
    src: string;
    type: "image" | "video";
    title?: string;
    description?: string;
  }>;
  onMediaClick?: (item: any) => void;
  className?: string;
}

export function MediaGrid({ mediaItems, onMediaClick, className }: MediaGridProps) {
  if (!mediaItems || mediaItems.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-4", className)}>
      <h4 className="font-medium text-gray-900 flex items-center gap-2">
        <span className="text-lg">🎬</span>
        媒体内容 ({mediaItems.length})
      </h4>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {mediaItems.map((item, index) => (
          <MediaCard
            key={index}
            src={item.src}
            type={item.type}
            title={item.title}
            description={item.description}
            onClick={() => onMediaClick?.(item)}
          />
        ))}
      </div>
    </div>
  );
}
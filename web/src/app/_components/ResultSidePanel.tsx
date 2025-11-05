"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "~/core/utils";
import type { ToolCallTask } from "~/core/workflow";

import { ContentDetailModal } from "./ContentDetailModal";
import { EnhancedBrowserView } from "./EnhancedBrowserView";
import { EnhancedSearchResults } from "./EnhancedSearchResults";
import { MediaGrid } from "./MediaCard";

interface ResultSidePanelProps {
  task?: ToolCallTask;
  className?: string;
}

export function ResultSidePanel({ task, className }: ResultSidePanelProps) {
  const [selectedContent, setSelectedContent] = useState<{
    content: string;
    type: string;
  } | null>(null);

  // 解析内容中的媒体文件
  const extractMediaFromContent = (content: string) => {
    const mediaItems: Array<{
      src: string;
      type: "image" | "video";
      title?: string;
      description?: string;
    }> = [];

    // 图片URL正则
    const imageRegex = /https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg)(\?[^\s]*)?/gi;
    // 视频URL正则
    const videoRegex = /https?:\/\/[^\s]+\.(mp4|webm|ogg|avi|mov)(\?[^\s]*)?/gi;
    
    // HTML img标签正则
    const imgTagRegex = /<img[^>]+src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?[^>]*>/gi;
    // HTML video标签正则
    const videoTagRegex = /<video[^>]+src=["']([^"']+)["'][^>]*(?:title=["']([^"']*)["'])?[^>]*>/gi;

    // 提取直接的图片URL
    let match;
    while ((match = imageRegex.exec(content)) !== null) {
      mediaItems.push({
        src: match[0],
        type: "image",
        title: `图片 ${mediaItems.filter(item => item.type === "image").length + 1}`
      });
    }

    // 提取直接的视频URL
    while ((match = videoRegex.exec(content)) !== null) {
      mediaItems.push({
        src: match[0],
        type: "video",
        title: `视频 ${mediaItems.filter(item => item.type === "video").length + 1}`
      });
    }

    // 提取HTML img标签
    while ((match = imgTagRegex.exec(content)) !== null) {
      mediaItems.push({
        src: match[1],
        type: "image",
        title: match[2] ?? `图片 ${mediaItems.filter(item => item.type === "image").length + 1}`
      });
    }

    // 提取HTML video标签
    while ((match = videoTagRegex.exec(content)) !== null) {
      mediaItems.push({
        src: match[1],
        type: "video",
        title: match[2] ?? `视频 ${mediaItems.filter(item => item.type === "video").length + 1}`
      });
    }

    // 去重
    const uniqueMedia = mediaItems.filter((item, index, self) => 
      index === self.findIndex(t => t.src === item.src)
    );

    return uniqueMedia;
  };

  if (!task) {
    return (
      <div className={cn("flex items-center justify-center h-full text-gray-500", className)}>
        <div className="text-center">
          <div className="text-4xl mb-4">🔍</div>
          <p>选择一个工具调用查看详细结果</p>
        </div>
      </div>
    );
  }

  const renderTaskContent = () => {
    // 获取所有输出内容用于媒体提取
    const getAllContent = () => {
      let allContent = "";
      if (task.payload.output?.results) {
        allContent += task.payload.output.results.map((r: any) => r.content ?? r.raw_content ?? "").join(" ");
      }
      if (task.payload.output?.content) {
        allContent += task.payload.output.content;
      }
      if (task.payload.output?.result) {
        allContent += task.payload.output.result;
      }
      return allContent;
    };

    const mediaItems = extractMediaFromContent(getAllContent());

    switch (task.payload.toolName) {
      case "tavily_search":
        if (task.payload.output?.results) {
          const results = task.payload.output.results.map((result: any) => ({
            title: result.title ?? "搜索结果",
            url: result.url ?? "#",
            content: result.content ?? result.raw_content ?? "",
            score: result.score ?? 0
          }));
          return (
            <div className="space-y-6">
              <EnhancedSearchResults
                results={results}
                onResultClick={(content, type) => setSelectedContent({ content, type })}
              />
              {mediaItems.length > 0 && (
                <MediaGrid
                  mediaItems={mediaItems}
                  onMediaClick={(item) => setSelectedContent({ content: item.src, type: item.type })}
                />
              )}
            </div>
          );
        }
        break;

      case "browser":
        if (task.payload.output) {
          // 尝试解析GIF路径
          let gifPath = '';
          try {
            const result = typeof task.payload.output === 'string' ? JSON.parse(task.payload.output) : task.payload.output;
            gifPath = result.generated_gif_path ?? '';
          } catch (e) {
            console.warn('解析浏览器工具结果失败:', e);
          }

          return (
            <div className="space-y-6">
              {/* 如果有GIF路径，显示GIF */}
              {gifPath && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">浏览器操作录制</h4>
                  <div className="relative group cursor-pointer" onClick={() => {
                    const filename = gifPath.split('/').pop();
                    setSelectedContent({ 
                      content: `/api/browser_history/${filename}`, 
                      type: 'gif' 
                    });
                  }}>
                    <Image
                      src={`/api/browser_history/${gifPath.split('/').pop()}`}
                      alt="浏览器操作录制"
                      width={800}
                      height={600}
                      unoptimized
                      className="max-w-full h-auto rounded-lg shadow-lg transition-transform group-hover:scale-105"
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
                  <div className="mt-3 text-sm text-gray-600">
                    <div className="font-medium mb-1">执行的操作:</div>
                    <div>{task.payload.input?.instruction ?? '浏览器操作'}</div>
                    {task.payload.input?.url && (
                      <div className="mt-1">
                        <span className="font-medium">目标URL:</span> {task.payload.input.url}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* 如果有文本内容，也显示 */}
              {task.payload.output?.content && (
                <EnhancedBrowserView
                  url={task.payload.input?.url ?? ""}
                  content={task.payload.output.content}
                  onContentClick={(content, type) => setSelectedContent({ content, type })}
                />
              )}
              
              {mediaItems.length > 0 && (
                <MediaGrid
                  mediaItems={mediaItems}
                  onMediaClick={(item) => setSelectedContent({ content: item.src, type: item.type })}
                />
              )}
            </div>
          );
        }
        break;

      case "crawl_tool":
        if (task.payload.output?.content) {
          return (
            <div className="space-y-6">
              <EnhancedBrowserView
                url={task.payload.input?.url ?? ""}
                content={task.payload.output.content}
                onContentClick={(content, type) => setSelectedContent({ content, type })}
              />
              {mediaItems.length > 0 && (
                <MediaGrid
                  mediaItems={mediaItems}
                  onMediaClick={(item) => setSelectedContent({ content: item.src, type: item.type })}
                />
              )}
            </div>
          );
        }
        break;

      case "python_repl_tool":
        return (
          <div className="space-y-6">
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-400 ml-2">Python REPL</span>
              </div>
              <div className="border-t border-gray-700 pt-2">
                <div className="text-blue-400">&gt;&gt;&gt; {task.payload.input?.code}</div>
                {task.payload.output?.result && (
                  <div className="mt-2 text白 whitespace-pre-wrap">
                    {task.payload.output.result}
                  </div>
                )}
                {task.payload.output?.error && (
                  <div className="mt-2 text-red-400">
                    Error: {task.payload.output.error}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
    }

    return null;
  };

  return (
    <div className={cn("h-full", className)}>
      {renderTaskContent()}
      {selectedContent && (
        <ContentDetailModal
          isOpen={!!selectedContent}
          onClose={() => setSelectedContent(null)}
          title={selectedContent.type === 'gif' ? '浏览器操作录制' : '媒体内容'}
          content={selectedContent.content}
          type={selectedContent.type}
        />
      )}
    </div>
  );
}
"use client";

import { useState } from "react";
import { cn } from "~/core/utils";
import { ContentDetailModal } from "./ContentDetailModal";
import { Markdown } from "./Markdown";

interface BrowserResult {
  url: string;
  title?: string;
  content?: string;
  summary?: string;
  type?: "general" | "flight" | "hotel" | "product" | "news" | "article";
}

interface EnhancedBrowserViewProps {
  url: string;
  instruction: string;
  result?: string;
  className?: string;
}

export function EnhancedBrowserView({
  url,
  instruction,
  result,
  className,
}: EnhancedBrowserViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [browserResult, setBrowserResult] = useState<BrowserResult | null>(null);

  const detectContentType = (url: string, content?: string): BrowserResult["type"] => {
    const text = (url + " " + (content || "")).toLowerCase();
    
    if (text.includes("flight") || text.includes("航班") || text.includes("机票")) {
      return "flight";
    }
    if (text.includes("hotel") || text.includes("酒店") || text.includes("住宿")) {
      return "hotel";
    }
    if (text.includes("news") || text.includes("新闻") || text.includes("资讯")) {
      return "news";
    }
    if (text.includes("article") || text.includes("文章") || text.includes("blog")) {
      return "article";
    }
    if (text.includes("shop") || text.includes("商品") || text.includes("购买")) {
      return "product";
    }
    return "general";
  };

  const getContentIcon = (type: BrowserResult["type"]) => {
    switch (type) {
      case "flight":
        return (
          <div className="rounded-full bg-blue-100 p-2">
            <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </div>
        );
      case "hotel":
        return (
          <div className="rounded-full bg-green-100 p-2">
            <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        );
      case "news":
        return (
          <div className="rounded-full bg-red-100 p-2">
            <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          </div>
        );
      case "article":
        return (
          <div className="rounded-full bg-indigo-100 p-2">
            <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        );
      case "product":
        return (
          <div className="rounded-full bg-purple-100 p-2">
            <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="rounded-full bg-gray-100 p-2">
            <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9V3" />
            </svg>
          </div>
        );
    }
  };

  const getContentBadge = (type: BrowserResult["type"]) => {
    switch (type) {
      case "flight":
        return <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">机票信息</span>;
      case "hotel":
        return <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">酒店信息</span>;
      case "news":
        return <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">新闻资讯</span>;
      case "article":
        return <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-800">文章内容</span>;
      case "product":
        return <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800">商品信息</span>;
      default:
        return <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">网页内容</span>;
    }
  };

  const handleViewDetails = () => {
    const type = detectContentType(url, result);
    const title = extractTitle(result) || new URL(url).hostname;
    
    setBrowserResult({
      url,
      title,
      content: result || "无法获取页面内容",
      type,
    });
    setIsModalOpen(true);
  };

  const extractTitle = (content?: string): string | undefined => {
    if (!content) return undefined;
    
    // 尝试从内容中提取标题
    const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      return titleMatch[1].trim();
    }
    
    // 尝试从markdown标题中提取
    const h1Match = content.match(/^#\s+(.+)$/m);
    if (h1Match) {
      return h1Match[1].trim();
    }
    
    // 使用内容的前50个字符作为标题
    const firstLine = content.split('\n')[0];
    return firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;
  };

  const getSummary = (content?: string): string => {
    if (!content) return "正在浏览网页内容...";
    
    // 移除HTML标签和多余空白
    const cleanContent = content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    
    // 返回前200个字符作为摘要
    return cleanContent.length > 200 ? cleanContent.substring(0, 200) + '...' : cleanContent;
  };

  const type = detectContentType(url, result);
  const title = extractTitle(result) || new URL(url).hostname;
  const summary = getSummary(result);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <div>
          <svg className="h-4 w-4 text-sm text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9V3" />
          </svg>
        </div>
        <div>
          <span className="text-sm">{instruction}</span>
        </div>
      </div>
      
      {result && (
        <div className="enhanced-card group cursor-pointer p-4"
             onClick={handleViewDetails}>
          <div className="flex items-start space-x-3">
            {getContentIcon(type)}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <img
                    className="h-4 w-4 rounded-full bg-slate-100 shadow"
                    src={new URL(url).origin + "/favicon.ico"}
                    alt={title}
                    onError={(e) => {
                      e.currentTarget.src =
                        "https://perishablepress.com/wp/wp-content/images/2021/favicon-standard.png";
                    }}
                  />
                  {getContentBadge(type)}
                </div>
                
                <button className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 hover:text-blue-800 text-sm font-medium">
                  查看完整内容 →
                </button>
              </div>
              
              <h3 className="mt-1 font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                {title}
              </h3>
              
              <p className="mt-1 text-sm text-gray-600 line-clamp-3">
                {summary}
              </p>
              
              <div className="mt-2 flex items-center justify-between">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-500 hover:text-gray-700 truncate"
                  onClick={(e) => e.stopPropagation()}
                >
                  {url}
                </a>
                
                <div className="flex items-center space-x-2 text-xs text-gray-400">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  <span>浏览结果</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {browserResult && (
        <ContentDetailModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setBrowserResult(null);
          }}
          title={browserResult.title || "网页内容"}
          content={browserResult.content || ""}
          url={browserResult.url}
          type={browserResult.type}
        />
      )}
    </div>
  );
}
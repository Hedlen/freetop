"use client";

import { useState } from "react";
import { cn } from "~/core/utils";
import { ContentDetailModal } from "./ContentDetailModal";

interface SearchResult {
  url: string;
  title: string;
  content?: string;
  snippet?: string;
  type?: "general" | "flight" | "hotel" | "product";
}

interface EnhancedSearchResultsProps {
  results: SearchResult[];
  query: string;
  className?: string;
}

export function EnhancedSearchResults({
  results,
  query,
  className,
}: EnhancedSearchResultsProps) {
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const detectResultType = (title: string, content?: string): SearchResult["type"] => {
    const text = (title + " " + (content || "")).toLowerCase();
    
    if (text.includes("航班") || text.includes("机票") || text.includes("flight")) {
      return "flight";
    }
    if (text.includes("酒店") || text.includes("hotel") || text.includes("住宿")) {
      return "hotel";
    }
    if (text.includes("商品") || text.includes("购买") || text.includes("价格")) {
      return "product";
    }
    return "general";
  };

  const handleResultClick = async (result: SearchResult) => {
    // 如果没有内容，尝试获取页面内容
    if (!result.content) {
      try {
        // 这里可以调用爬虫API获取页面内容
        // 暂时使用模拟数据
        result.content = result.snippet || "正在加载内容...";
      } catch (error) {
        result.content = "无法加载页面内容";
      }
    }
    
    result.type = detectResultType(result.title, result.content);
    setSelectedResult(result);
    setIsModalOpen(true);
  };

  const getResultIcon = (type: SearchResult["type"]) => {
    switch (type) {
      case "flight":
        return (
          <div className="rounded-full bg-blue-100 p-2">
            <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </div>
        );
      case "hotel":
        return (
          <div className="rounded-full bg-green-100 p-2">
            <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        );
      case "product":
        return (
          <div className="rounded-full bg-purple-100 p-2">
            <svg className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="rounded-full bg-gray-100 p-2">
            <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9V3" />
            </svg>
          </div>
        );
    }
  };

  const getResultBadge = (type: SearchResult["type"]) => {
    switch (type) {
      case "flight":
        return <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">机票</span>;
      case "hotel":
        return <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">酒店</span>;
      case "product":
        return <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800">商品</span>;
      default:
        return null;
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {results.map((result, index) => {
        const type = detectResultType(result.title, result.content || result.snippet);
        
        return (
          <div
            key={`${result.url}-${index}`}
            className="enhanced-card group cursor-pointer p-4"
            onClick={() => handleResultClick({ ...result, type })}
          >
            <div className="flex items-start space-x-3">
              {getResultIcon(type)}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <img
                      className="h-4 w-4 rounded-full bg-slate-100 shadow"
                      src={new URL(result.url).origin + "/favicon.ico"}
                      alt={result.title}
                      onError={(e) => {
                        e.currentTarget.src =
                          "https://perishablepress.com/wp/wp-content/images/2021/favicon-standard.png";
                      }}
                    />
                    {getResultBadge(type)}
                  </div>
                  
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 hover:text-blue-800 text-sm font-medium">
                    查看详情 →
                  </button>
                </div>
                
                <h3 className="mt-1 font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                  {result.title}
                </h3>
                
                <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                  {result.snippet || "点击查看完整内容"}
                </p>
                
                <div className="mt-2 flex items-center justify-between">
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-500 hover:text-gray-700 truncate"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {result.url}
                  </a>
                  
                  <div className="flex items-center space-x-2 text-xs text-gray-400">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    <span>外部链接</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      
      {selectedResult && (
        <ContentDetailModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedResult(null);
          }}
          title={selectedResult.title}
          content={selectedResult.content || selectedResult.snippet || ""}
          url={selectedResult.url}
          type={selectedResult.type}
        />
      )}
    </div>
  );
}
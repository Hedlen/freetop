"use client";

import Image from "next/image";
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
  query: _query,
  className,
}: EnhancedSearchResultsProps) {
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const detectResultType = (title: string, content?: string): SearchResult["type"] => {
    const text = (title + " " + (content ?? "")).toLowerCase();
    
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

  const handleResultClick = (result: SearchResult) => {
    window.open(result.url, "_blank");
  };

  const getResultIcon = (type: SearchResult["type"]) => {
    switch (type) {
      case "flight":
        return (
          <div className="rounded-full bg-blue-100 p-1">
            <svg className="h-3 w-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </div>
        );
      case "hotel":
        return (
          <div className="rounded-full bg-green-100 p-1">
            <svg className="h-3 w-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        );
      case "product":
        return (
          <div className="rounded-full bg-purple-100 p-1">
            <svg className="h-3 w-3 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="rounded-full bg-gray-100 p-1">
            <svg className="h-3 w-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9V3" />
            </svg>
          </div>
        );
    }
  };

  const getResultBadge = (type: SearchResult["type"]) => {
    switch (type) {
      case "flight":
        return <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800">机票</span>;
      case "hotel":
        return <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-800">酒店</span>;
      case "product":
        return <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-800">商品</span>;
      default:
        return null;
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {results.map((result, index) => {
        const type = detectResultType(result.title, result.content ?? result.snippet);
        
        return (
          <div
            key={`${result.url}-${index}`}
            className="enhanced-card group cursor-pointer p-1 sm:p-1.5"
            onClick={() => handleResultClick({ ...result, type })}
          >
            <div className="flex items-start space-x-1.5 sm:space-x-2">
              {getResultIcon(type)}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Image
                      className="h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full bg-slate-100 shadow"
                      src={new URL(result.url).origin + "/favicon.ico"}
                      alt={result.title}
                      width={14}
                      height={14}
                      unoptimized
                    />
                    {getResultBadge(type)}
                  </div>
                  
                  <button className="hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 hover:text-blue-800 text-[10px] sm:text-[11px] font-medium">
                    查看详情 →
                  </button>
                </div>
                
                <h3 className="mt-0.5 text-[12px] sm:text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                  {result.title}
                </h3>
                
              </div>
            </div>
          </div>
        );
      })}
      
      
    </div>
  );
}

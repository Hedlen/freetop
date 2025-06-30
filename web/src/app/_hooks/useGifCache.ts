import { useState, useEffect, useCallback } from 'react';

// GIF缓存配置
const CACHE_CONFIG = {
  MAX_CACHE_SIZE: 50, // 最大缓存数量
  CACHE_EXPIRY: 30 * 60 * 1000, // 30分钟过期
  PRELOAD_THRESHOLD: 3, // 预加载阈值
} as const;

interface CacheItem {
  url: string;
  blob: Blob;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

interface GifCacheHook {
  getCachedUrl: (originalUrl: string) => string | null;
  preloadGif: (url: string) => Promise<void>;
  clearCache: () => void;
  getCacheStats: () => {
    size: number;
    totalSize: number;
    hitRate: number;
  };
}

// 全局缓存存储
const gifCache = new Map<string, CacheItem>();
let cacheHits = 0;
let cacheRequests = 0;

export function useGifCache(): GifCacheHook {
  const [, forceUpdate] = useState({});

  // 清理过期缓存
  const cleanupExpiredCache = useCallback(() => {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    gifCache.forEach((item, key) => {
      if (now - item.timestamp > CACHE_CONFIG.CACHE_EXPIRY) {
        expiredKeys.push(key);
      }
    });
    
    expiredKeys.forEach(key => {
      const item = gifCache.get(key);
      if (item) {
        URL.revokeObjectURL(item.url);
        gifCache.delete(key);
      }
    });
    
    if (expiredKeys.length > 0) {
      forceUpdate({});
    }
  }, []);

  // LRU缓存清理
  const cleanupLRUCache = useCallback(() => {
    if (gifCache.size <= CACHE_CONFIG.MAX_CACHE_SIZE) return;
    
    const sortedEntries = Array.from(gifCache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
    
    const itemsToRemove = sortedEntries.slice(0, gifCache.size - CACHE_CONFIG.MAX_CACHE_SIZE);
    
    itemsToRemove.forEach(([key, item]) => {
      URL.revokeObjectURL(item.url);
      gifCache.delete(key);
    });
    
    if (itemsToRemove.length > 0) {
      forceUpdate({});
    }
  }, []);

  // 获取缓存的URL
  const getCachedUrl = useCallback((originalUrl: string): string | null => {
    cacheRequests++;
    
    const cached = gifCache.get(originalUrl);
    if (cached) {
      cacheHits++;
      cached.accessCount++;
      cached.lastAccessed = Date.now();
      return cached.url;
    }
    
    return null;
  }, []);

  // 预加载GIF
  const preloadGif = useCallback(async (url: string): Promise<void> => {
    // 检查是否已缓存
    if (gifCache.has(url)) {
      return;
    }
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      
      // 验证是否为有效的图片
      if (!blob.type.startsWith('image/')) {
        throw new Error('Invalid image format');
      }
      
      const objectUrl = URL.createObjectURL(blob);
      const now = Date.now();
      
      gifCache.set(url, {
        url: objectUrl,
        blob,
        timestamp: now,
        accessCount: 0,
        lastAccessed: now,
      });
      
      // 清理缓存
      cleanupLRUCache();
      forceUpdate({});
      
    } catch (error) {
      console.warn('Failed to preload GIF:', url, error);
      throw error;
    }
  }, [cleanupLRUCache]);

  // 清空缓存
  const clearCache = useCallback(() => {
    gifCache.forEach(item => {
      URL.revokeObjectURL(item.url);
    });
    gifCache.clear();
    cacheHits = 0;
    cacheRequests = 0;
    forceUpdate({});
  }, []);

  // 获取缓存统计
  const getCacheStats = useCallback(() => {
    const totalSize = Array.from(gifCache.values())
      .reduce((sum, item) => sum + item.blob.size, 0);
    
    return {
      size: gifCache.size,
      totalSize,
      hitRate: cacheRequests > 0 ? (cacheHits / cacheRequests) * 100 : 0,
    };
  }, []);

  // 定期清理过期缓存
  useEffect(() => {
    const interval = setInterval(cleanupExpiredCache, 5 * 60 * 1000); // 每5分钟清理一次
    return () => clearInterval(interval);
  }, [cleanupExpiredCache]);

  // 页面卸载时清理所有缓存
  useEffect(() => {
    const handleBeforeUnload = () => {
      clearCache();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [clearCache]);

  return {
    getCachedUrl,
    preloadGif,
    clearCache,
    getCacheStats,
  };
}

// 导出缓存统计工具函数
export const getCacheInfo = () => {
  const totalSize = Array.from(gifCache.values())
    .reduce((sum, item) => sum + item.blob.size, 0);
  
  return {
    size: gifCache.size,
    totalSize: Math.round(totalSize / 1024 / 1024 * 100) / 100, // MB
    hitRate: cacheRequests > 0 ? Math.round((cacheHits / cacheRequests) * 100) : 0,
    items: Array.from(gifCache.entries()).map(([url, item]) => ({
      url,
      size: Math.round(item.blob.size / 1024), // KB
      accessCount: item.accessCount,
      age: Math.round((Date.now() - item.timestamp) / 1000 / 60), // minutes
    })),
  };
};
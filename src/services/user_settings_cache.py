#!/usr/bin/env python3
"""
用户设置缓存服务
提供高效的用户设置缓存机制
"""

import time
import json
import logging
from typing import Dict, Optional, Any
from threading import Lock
from dataclasses import dataclass
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

@dataclass
class CacheEntry:
    """缓存条目"""
    data: Dict[str, Any]
    timestamp: float
    ttl: int
    
    def is_expired(self) -> bool:
        """检查是否过期"""
        return time.time() - self.timestamp > self.ttl
    
    def remaining_ttl(self) -> int:
        """剩余TTL（秒）"""
        remaining = self.ttl - (time.time() - self.timestamp)
        return max(0, int(remaining))

class UserSettingsCache:
    """用户设置缓存类"""
    
    def __init__(self, default_ttl: int = 300, max_size: int = 1000):
        """
        初始化缓存
        
        Args:
            default_ttl: 默认TTL（秒），默认5分钟
            max_size: 最大缓存条目数
        """
        self.cache: Dict[int, CacheEntry] = {}
        self.default_ttl = default_ttl
        self.max_size = max_size
        self.lock = Lock()
        self.stats = {
            'hits': 0,
            'misses': 0,
            'evictions': 0,
            'errors': 0
        }
        
        logger.info(f"用户设置缓存初始化: TTL={default_ttl}s, 最大条目数={max_size}")
    
    def get(self, user_id: int) -> Optional[Dict[str, Any]]:
        """获取缓存的用户设置"""
        with self.lock:
            try:
                if user_id not in self.cache:
                    self.stats['misses'] += 1
                    logger.debug(f"缓存未命中: user_id={user_id}")
                    return None
                
                entry = self.cache[user_id]
                
                # 检查是否过期
                if entry.is_expired():
                    self._remove_entry(user_id)
                    self.stats['misses'] += 1
                    logger.debug(f"缓存过期: user_id={user_id}")
                    return None
                
                self.stats['hits'] += 1
                logger.debug(f"缓存命中: user_id={user_id}, 剩余TTL={entry.remaining_ttl()}s")
                return entry.data.copy()  # 返回副本避免外部修改
                
            except Exception as e:
                self.stats['errors'] += 1
                logger.error(f"获取缓存时发生错误: user_id={user_id}, error={e}")
                return None
    
    def set(self, user_id: int, settings: Dict[str, Any], ttl: Optional[int] = None):
        """设置缓存"""
        with self.lock:
            try:
                # 检查缓存大小限制
                if len(self.cache) >= self.max_size and user_id not in self.cache:
                    self._evict_oldest()
                
                actual_ttl = ttl or self.default_ttl
                entry = CacheEntry(
                    data=settings.copy(),  # 存储副本避免外部修改
                    timestamp=time.time(),
                    ttl=actual_ttl
                )
                
                self.cache[user_id] = entry
                logger.debug(f"缓存设置: user_id={user_id}, TTL={actual_ttl}s")
                
            except Exception as e:
                self.stats['errors'] += 1
                logger.error(f"设置缓存时发生错误: user_id={user_id}, error={e}")
    
    def invalidate(self, user_id: int):
        """清除指定用户的缓存"""
        with self.lock:
            try:
                if user_id in self.cache:
                    self._remove_entry(user_id)
                    logger.debug(f"缓存失效: user_id={user_id}")
                
            except Exception as e:
                self.stats['errors'] += 1
                logger.error(f"清除缓存时发生错误: user_id={user_id}, error={e}")
    
    def clear(self):
        """清空所有缓存"""
        with self.lock:
            try:
                count = len(self.cache)
                self.cache.clear()
                logger.info(f"清空所有缓存: 清除了{count}个条目")
                
            except Exception as e:
                self.stats['errors'] += 1
                logger.error(f"清空缓存时发生错误: {e}")
    
    def cleanup_expired(self):
        """清理过期的缓存条目"""
        with self.lock:
            try:
                expired_keys = []
                for user_id, entry in self.cache.items():
                    if entry.is_expired():
                        expired_keys.append(user_id)
                
                for user_id in expired_keys:
                    self._remove_entry(user_id)
                
                if expired_keys:
                    logger.debug(f"清理过期缓存: 清除了{len(expired_keys)}个条目")
                
            except Exception as e:
                self.stats['errors'] += 1
                logger.error(f"清理过期缓存时发生错误: {e}")
    
    def get_stats(self) -> Dict[str, Any]:
        """获取缓存统计信息"""
        with self.lock:
            total_requests = self.stats['hits'] + self.stats['misses']
            hit_rate = (self.stats['hits'] / total_requests * 100) if total_requests > 0 else 0
            
            return {
                'cache_size': len(self.cache),
                'max_size': self.max_size,
                'hits': self.stats['hits'],
                'misses': self.stats['misses'],
                'hit_rate': f"{hit_rate:.2f}%",
                'evictions': self.stats['evictions'],
                'errors': self.stats['errors'],
                'default_ttl': self.default_ttl
            }
    
    def _remove_entry(self, user_id: int):
        """移除缓存条目（内部方法）"""
        if user_id in self.cache:
            del self.cache[user_id]
    
    def _evict_oldest(self):
        """驱逐最旧的缓存条目"""
        if not self.cache:
            return
        
        # 找到最旧的条目
        oldest_user_id = min(self.cache.keys(), key=lambda k: self.cache[k].timestamp)
        self._remove_entry(oldest_user_id)
        self.stats['evictions'] += 1
        logger.debug(f"驱逐最旧缓存条目: user_id={oldest_user_id}")

# 全局缓存实例
user_settings_cache = UserSettingsCache()

# 定期清理任务（可以通过定时任务调用）
def periodic_cleanup():
    """定期清理过期缓存"""
    try:
        user_settings_cache.cleanup_expired()
        stats = user_settings_cache.get_stats()
        logger.info(f"缓存状态: {stats}")
    except Exception as e:
        logger.error(f"定期清理任务失败: {e}")

# 缓存装饰器
def cache_user_settings(ttl: Optional[int] = None):
    """用户设置缓存装饰器"""
    def decorator(func):
        def wrapper(user_id: int, *args, **kwargs):
            # 尝试从缓存获取
            cached_result = user_settings_cache.get(user_id)
            if cached_result is not None:
                return cached_result
            
            # 缓存未命中，调用原函数
            result = func(user_id, *args, **kwargs)
            
            # 如果结果成功，缓存它
            if isinstance(result, dict) and result.get('success'):
                user_settings_cache.set(user_id, result, ttl)
            
            return result
        
        return wrapper
    return decorator
// 分析和监控工具

interface AnalyticsEvent {
  type: 'gif_view' | 'gif_error' | 'modal_open' | 'modal_close' | 'retry_attempt';
  data: Record<string, any>;
  timestamp: number;
  sessionId: string;
}

interface GifViewEvent {
  url: string;
  loadTime?: number;
  fromCache: boolean;
  retryCount?: number;
}

interface GifErrorEvent {
  url: string;
  error: string;
  retryCount: number;
  userAgent: string;
}

class Analytics {
  private events: AnalyticsEvent[] = [];
  private sessionId: string;
  private maxEvents = 1000;

  constructor() {
    this.sessionId = this.generateSessionId();
    // Only setup error tracking in browser environment
    if (typeof window !== 'undefined') {
      this.setupErrorTracking();
    }
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupErrorTracking() {
    // Only setup in browser environment
    if (typeof window === 'undefined') return;
    
    // 全局错误监听
    window.addEventListener('error', (event) => {
      if (event.target instanceof HTMLImageElement || event.target instanceof HTMLVideoElement) {
        this.trackGifError({
          url: event.target.src,
          error: event.message ?? 'Media load error',
          retryCount: 0,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
        });
      }
    }, true);
  }

  private addEvent(type: AnalyticsEvent['type'], data: Record<string, any>) {
    const event: AnalyticsEvent = {
      type,
      data,
      timestamp: Date.now(),
      sessionId: this.sessionId,
    };

    this.events.push(event);

    // 限制事件数量
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // 在开发环境下输出日志
    if (process.env.NODE_ENV === 'development') {
      console.log('Analytics Event:', event);
    }
  }

  // 跟踪GIF查看
  trackGifView(data: GifViewEvent) {
    this.addEvent('gif_view', {
      url: data.url,
      loadTime: data.loadTime,
      fromCache: data.fromCache,
      retryCount: data.retryCount ?? 0,
      viewport: typeof window !== 'undefined' ? {
        width: window.innerWidth,
        height: window.innerHeight,
      } : null,
      connection: this.getConnectionInfo(),
    });
  }

  // 跟踪GIF错误
  trackGifError(data: GifErrorEvent) {
    this.addEvent('gif_error', {
      url: data.url,
      error: data.error,
      retryCount: data.retryCount,
      userAgent: data.userAgent,
      timestamp: Date.now(),
      connection: this.getConnectionInfo(),
    });
  }

  // 跟踪模态框打开
  trackModalOpen(data: { type: string; url?: string }) {
    this.addEvent('modal_open', {
      contentType: data.type,
      url: data.url,
      timestamp: Date.now(),
    });
  }

  // 跟踪模态框关闭
  trackModalClose(data: { type: string; duration: number }) {
    this.addEvent('modal_close', {
      contentType: data.type,
      viewDuration: data.duration,
      timestamp: Date.now(),
    });
  }

  // 跟踪重试尝试
  trackRetryAttempt(data: { url: string; attempt: number; success: boolean }) {
    this.addEvent('retry_attempt', {
      url: data.url,
      attemptNumber: data.attempt,
      success: data.success,
      timestamp: Date.now(),
    });
  }

  // 获取连接信息
  private getConnectionInfo() {
    if (typeof navigator === 'undefined') return null;
    
    const connection = (navigator as any).connection ?? (navigator as any).mozConnection ?? (navigator as any).webkitConnection;
    
    if (connection) {
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      };
    }
    
    return null;
  }

  // 获取性能统计
  getPerformanceStats() {
    const gifViews = this.events.filter(e => e.type === 'gif_view');
    const gifErrors = this.events.filter(e => e.type === 'gif_error');
    
    const loadTimes = gifViews
      .map(e => e.data.loadTime)
      .filter(time => typeof time === 'number');
    
    const cacheHits = gifViews.filter(e => e.data.fromCache).length;
    
    return {
      totalGifViews: gifViews.length,
      totalGifErrors: gifErrors.length,
      errorRate: gifViews.length > 0 ? (gifErrors.length / gifViews.length) * 100 : 0,
      cacheHitRate: gifViews.length > 0 ? (cacheHits / gifViews.length) * 100 : 0,
      averageLoadTime: loadTimes.length > 0 ? loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length : 0,
      medianLoadTime: this.calculateMedian(loadTimes),
      retryStats: this.getRetryStats(),
    };
  }

  // 获取重试统计
  private getRetryStats() {
    const retries = this.events.filter(e => e.type === 'retry_attempt');
    const successfulRetries = retries.filter(e => e.data.success);
    
    return {
      totalRetries: retries.length,
      successfulRetries: successfulRetries.length,
      retrySuccessRate: retries.length > 0 ? (successfulRetries.length / retries.length) * 100 : 0,
    };
  }

  // 计算中位数
  private calculateMedian(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  // 获取错误报告
  getErrorReport() {
    const errors = this.events.filter(e => e.type === 'gif_error');
    const errorsByUrl = new Map<string, number>();
    const errorsByType = new Map<string, number>();
    
    errors.forEach(event => {
      const url = event.data.url;
      const error = event.data.error;
      
      errorsByUrl.set(url, (errorsByUrl.get(url) ?? 0) + 1);
      errorsByType.set(error, (errorsByType.get(error) ?? 0) + 1);
    });
    
    return {
      totalErrors: errors.length,
      uniqueUrls: errorsByUrl.size,
      mostFailedUrls: Array.from(errorsByUrl.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10),
      errorTypes: Array.from(errorsByType.entries())
        .sort(([, a], [, b]) => b - a),
    };
  }

  // 导出数据（用于调试）
  exportData() {
    return {
      sessionId: this.sessionId,
      events: this.events,
      performance: this.getPerformanceStats(),
      errors: this.getErrorReport(),
      timestamp: Date.now(),
    };
  }

  // 清除数据
  clearData() {
    this.events = [];
    this.sessionId = this.generateSessionId();
  }
}

// 单例实例
export const analytics = new Analytics();

// 便捷函数
export const trackGifView = (data: GifViewEvent) => analytics.trackGifView(data);
export const trackGifError = (data: GifErrorEvent) => analytics.trackGifError(data);
export const trackModalOpen = (data: { type: string; url?: string }) => analytics.trackModalOpen(data);
export const trackModalClose = (data: { type: string; duration: number }) => analytics.trackModalClose(data);
export const trackRetryAttempt = (data: { url: string; attempt: number; success: boolean }) => analytics.trackRetryAttempt(data);

// 开发工具（仅在开发环境可用）
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  (window as any).gifAnalytics = {
    getStats: () => analytics.getPerformanceStats(),
    getErrors: () => analytics.getErrorReport(),
    exportData: () => analytics.exportData(),
    clearData: () => analytics.clearData(),
  };
}
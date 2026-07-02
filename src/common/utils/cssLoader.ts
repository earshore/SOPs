const nativeLoggerConsole = globalThis.console;
/**
 * CSS懒加载工具 - 增强版
 * 用于按需加载非关键CSS，提升首屏性能
 *
 * 新增功能:
 * - 优先级队列加载
 * - 错误降级策略
 * - 性能监控埋点
 * - 加载状态管理
 */

interface CSSLoadOptions {
  priority?: 'critical' | 'high' | 'normal' | 'low';
  preload?: boolean;
  timeout?: number;
  fallback?: string;
  onProgress?: (loaded: number, total: number) => void;
}

interface CSSLoadResult {
  success: boolean;
  href: string;
  loadTime: number;
  fromCache: boolean;
  error?: Error;
}

class CSSLoader {
  private loadedStyles = new Set<string>();
  private loadingPromises = new Map<string, Promise<CSSLoadResult>>();
  private loadQueue: Array<{ href: string; options: CSSLoadOptions }> = [];
  private isProcessingQueue = false;

  /**
   * 加载CSS文件（增强版）
   */
  async loadCSS(href: string, options: CSSLoadOptions = {}): Promise<CSSLoadResult> {
    const startTime = performance.now();

    // 检查缓存
    if (this.loadedStyles.has(href)) {
      return {
        success: true,
        href,
        loadTime: 0,
        fromCache: true,
      };
    }

    // 检查是否正在加载
    const pendingLoad = this.loadingPromises.get(href);
    if (pendingLoad) {
      return pendingLoad;
    }

    // 创建加载Promise
    const loadPromise = this.loadCSSImpl(href, options, startTime);
    this.loadingPromises.set(href, loadPromise);

    try {
      const result = await loadPromise;
      if (result.success) {
        this.loadedStyles.add(href);
      }
      return result;
    } finally {
      this.loadingPromises.delete(href);
    }
  }

  /**
   * 实际加载实现
   */
  private async loadCSSImpl(
    href: string,
    options: CSSLoadOptions,
    startTime: number
  ): Promise<CSSLoadResult> {
    const { timeout = 10000, fallback } = options;

    return new Promise(resolve => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;

      // 超时处理
      const timeoutId = setTimeout(() => {
        link.remove();

        if (fallback) {
          nativeLoggerConsole.warn(`CSS加载超时，使用降级方案: ${href}`);
          this.loadCSS(fallback, { ...options, fallback: undefined })
            .then(resolve)
            .catch(() => {
              resolve({
                success: false,
                href,
                loadTime: performance.now() - startTime,
                fromCache: false,
                error: new Error(`CSS加载超时: ${href}`),
              });
            });
        } else {
          resolve({
            success: false,
            href,
            loadTime: performance.now() - startTime,
            fromCache: false,
            error: new Error(`CSS加载超时: ${href}`),
          });
        }
      }, timeout);

      link.onload = () => {
        clearTimeout(timeoutId);
        const loadTime = performance.now() - startTime;

        // 性能监控
        const windowWithPerf = window as unknown as {
          __CSS_PERF__?: { trackCSSLoad: (href: string, startTime: number) => void };
        };
        if (windowWithPerf.__CSS_PERF__) {
          windowWithPerf.__CSS_PERF__.trackCSSLoad(href, startTime);
        }

        resolve({
          success: true,
          href,
          loadTime,
          fromCache: false,
        });
      };

      link.onerror = () => {
        clearTimeout(timeoutId);
        link.remove();

        if (fallback) {
          nativeLoggerConsole.warn(`CSS加载失败，使用降级方案: ${href}`);
          this.loadCSS(fallback, { ...options, fallback: undefined })
            .then(resolve)
            .catch(() => {
              const error = new Error(`CSS加载失败: ${href}`);
              resolve({
                success: false,
                href,
                loadTime: performance.now() - startTime,
                fromCache: false,
                error,
              });
            });
        } else {
          const error = new Error(`CSS加载失败: ${href}`);
          resolve({
            success: false,
            href,
            loadTime: performance.now() - startTime,
            fromCache: false,
            error,
          });
        }
      };

      document.head.appendChild(link);
    });
  }

  /**
   * 批量加载CSS
   */
  async loadCSSBatch(hrefs: string[], options: CSSLoadOptions = {}): Promise<CSSLoadResult[]> {
    const { onProgress } = options;
    const results: CSSLoadResult[] = [];

    for (let i = 0; i < hrefs.length; i++) {
      const href = hrefs[i];
      if (!href) continue; // 跳过空值

      const result = await this.loadCSS(href, options);
      results.push(result);

      if (onProgress) {
        onProgress(i + 1, hrefs.length);
      }
    }

    return results;
  }

  /**
   * 预加载CSS（不阻塞）
   */
  preloadCSS(href: string): void {
    if (this.loadedStyles.has(href)) return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'style';
    link.href = href;

    link.onload = () => {
      link.rel = 'stylesheet';
      this.loadedStyles.add(href);
    };

    document.head.appendChild(link);
  }

  /**
   * 优先级队列加载
   */
  async loadWithPriority(
    href: string,
    priority: 'critical' | 'high' | 'normal' | 'low'
  ): Promise<CSSLoadResult> {
    this.loadQueue.push({ href, options: { priority } });
    this.loadQueue.sort((a, b) => {
      const priorityMap = { critical: 0, high: 1, normal: 2, low: 3 };
      return (
        priorityMap[a.options.priority ?? 'normal'] - priorityMap[b.options.priority ?? 'normal']
      );
    });

    if (!this.isProcessingQueue) {
      this.processQueue();
    }

    return this.loadCSS(href, { priority });
  }

  /**
   * 处理加载队列
   */
  private async processQueue(): Promise<void> {
    this.isProcessingQueue = true;

    while (this.loadQueue.length > 0) {
      const next = this.loadQueue.shift();
      if (!next) continue;
      const { href, options } = next;
      await this.loadCSS(href, options);
    }

    this.isProcessingQueue = false;
  }

  /**
   * 检查CSS是否已加载
   */
  isCSSLoaded(href: string): boolean {
    return this.loadedStyles.has(href);
  }

  /**
   * 卸载CSS（用于主题切换）
   */
  unloadCSS(href: string): void {
    const links = document.querySelectorAll(`link[href="${href}"]`);
    links.forEach(link => link.remove());
    this.loadedStyles.delete(href);
  }

  /**
   * 获取加载统计
   */
  getStats(): { loaded: number; loading: number } {
    return {
      loaded: this.loadedStyles.size,
      loading: this.loadingPromises.size,
    };
  }
}

// 导出单例
export const cssLoader = new CSSLoader();

// 向后兼容的导出
export const loadCSS = (href: string) => cssLoader.loadCSS(href);
export const preloadCSS = (href: string) => cssLoader.preloadCSS(href);
export const loadCSSBatch = (hrefs: string[]) => cssLoader.loadCSSBatch(hrefs);
export const isCSSLoaded = (href: string) => cssLoader.isCSSLoaded(href);

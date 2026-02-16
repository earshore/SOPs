// src/services/httpService.ts
// ================================================================
// 🎯 统一 HTTP 请求服务（TypeScript版本）
// 替代分散的 fetch 调用
// 🎯 P1-9: 集成请求去重和取消管理
// ================================================================

import { Logger } from './loggerService';
import { configCenter } from '../common/config/ConfigCenter';
import { priorityRequestPool, REQUEST_PRIORITY } from './PriorityRequestPool';
import { requestManager } from './RequestManager';

/**
 * 请求优先级类型
 */
export type RequestPriority = 0 | 1 | 2 | 3 | 4;

/**
 * HTTP 请求配置
 */
export interface HttpOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  json?: boolean;
  signal?: AbortSignal;
  usePool?: boolean;
  priority?: RequestPriority;
  measurePerformance?: boolean;
  // 🎯 P1-9: 新增请求管理选项
  deduplicate?: boolean; // 是否去重
  deduplicateKey?: string; // 自定义去重key
  cancelPrevious?: boolean; // 是否取消之前的同类请求
}

/**
 * HTTP 错误类
 */
export class HttpError extends Error {
  status: number;
  response: Response | null;

  constructor(status: number, message: string, response: Response | null = null) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.response = response;
  }
}

/**
 * 并发控制池（已废弃，使用PriorityRequestPool代替）
 */
// class RequestPool {
//   private max: number;
//   private running: number;
//   private queue: Array<() => void>;

//   constructor(maxConcurrent = 6) {
//     this.max = maxConcurrent;
//     this.running = 0;
//     this.queue = [];
//   }

//   async add<T>(fn: () => Promise<T>): Promise<T> {
//     if (this.running >= this.max) {
//       await new Promise<void>(resolve => this.queue.push(resolve));
//     }
//     this.running++;
//     try {
//       return await fn();
//     } finally {
//       this.running--;
//       if (this.queue.length > 0) {
//         const resolve = this.queue.shift();
//         resolve?.();
//       }
//     }
//   }
// }

// 全局请求池（向后兼容，但不再使用）
// const globalRequestPool = new RequestPool(6);

/**
 * HTTP 客户端接口
 */
export interface HttpClient {
  get<T = any>(path: string, options?: HttpOptions): Promise<T>;
  post<T = any>(path: string, body?: any, options?: HttpOptions): Promise<T>;
}

/**
 * 统一 HTTP 请求服务
 */
class HttpServiceClass {
  /**
   * 默认配置
   */
  defaults: {
    timeout: number;
    retries: number;
    retryDelay: number;
    headers: Record<string, string>;
  };

  constructor() {
    this.defaults = {
      timeout: configCenter.get<number>('api.timeout') || 30000,
      retries: configCenter.get<number>('api.retryAttempts') || 0,
      retryDelay: configCenter.get<number>('api.retryDelay') || 1000,
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }

  /**
   * 发送 HTTP 请求
   */
  async request<T = any>(url: string, options: HttpOptions = {}): Promise<T> {
    const {
      method = 'GET',
      headers = {},
      body = null,
      timeout = this.defaults.timeout,
      retries = this.defaults.retries,
      retryDelay = this.defaults.retryDelay,
      json = true,
      signal = null,
      usePool = false,
      priority = REQUEST_PRIORITY.NORMAL,
      measurePerformance = true,
      // 🎯 P1-9: 请求管理选项
      deduplicate = false,
      deduplicateKey = null,
      cancelPrevious = false,
    } = options;

    // 生成请求key(用于去重和取消)
    const requestKey = deduplicateKey || `${method}:${url}`;

    // 合并请求头
    const finalHeaders = { ...this.defaults.headers, ...headers };

    // 执行请求的函数
    const executeRequest = async (abortSignal?: AbortSignal): Promise<T> => {
      let lastError: Error | null = null;
      
      for (let attempt = 0; attempt <= retries; attempt++) {
        // 创建独立的 AbortController
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        // 如果提供了外部signal,监听其abort事件
        if (signal) {
          signal.addEventListener('abort', () => controller.abort(), { once: true });
        }
        
        // 🎯 P1-9: 如果提供了RequestManager的signal,也监听它
        if (abortSignal) {
          abortSignal.addEventListener('abort', () => controller.abort(), { once: true });
        }

        try {
          // 构建请求配置
          const fetchOptions: RequestInit = {
            method,
            headers: finalHeaders,
            signal: controller.signal,
          };

          // 处理请求体
          if (body) {
            fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
          }

          const response = await fetch(url, fetchOptions);
          clearTimeout(timeoutId);

          // 检查响应状态
          if (!response.ok) {
            const errorText = await response.text();
            throw new HttpError(response.status, errorText, response);
          }

          // 解析响应
          if (json) {
            return await response.json();
          }
          return await response.text() as T;

        } catch (error) {
          clearTimeout(timeoutId);
          lastError = error as Error;

          // 如果是最后一次尝试，抛出错误
          if (attempt === retries) {
            throw error;
          }

          // 等待后重试
          await this._delay(retryDelay * (attempt + 1));
          console.log(`[HttpService] Retry ${attempt + 1}/${retries}: ${url}`);
        }
      }

      throw lastError;
    };

    // 🎯 P1-9: 如果启用去重或取消管理,使用RequestManager
    if (deduplicate || cancelPrevious) {
      return await requestManager.execute(
        requestKey,
        (signal) => {
          // 性能监控
          if (measurePerformance) {
            return this._executeWithPerformance(url, method, usePool, priority, () => executeRequest(signal));
          }
          
          // 使用优先级请求池
          if (usePool) {
            return priorityRequestPool.add(() => executeRequest(signal), priority, { url, method });
          }
          
          return executeRequest(signal);
        },
        { deduplicate, cancelPrevious }
      );
    }

    // 性能监控
    if (measurePerformance) {
      return await this._executeWithPerformance(url, method, usePool, priority, executeRequest);
    }

    // 使用优先级请求池
    if (usePool) {
      return await priorityRequestPool.add(executeRequest, priority, { url, method });
    }
    
    return await executeRequest();
  }

  /**
   * 执行请求并进行性能监控
   */
  private async _executeWithPerformance<T>(
    url: string,
    method: string,
    usePool: boolean,
    priority: RequestPriority,
    fn: () => Promise<T>
  ): Promise<T> {
    try {
      const { performanceService } = await import('./performanceService');
      const apiName = this._extractApiName(url);
      
      if (usePool) {
        return await performanceService.measureApiCall(apiName, () => 
          priorityRequestPool.add(fn, priority, { url, method })
        );
      }
      
      return await performanceService.measureApiCall(apiName, fn);
    } catch (e) {
      Logger.debug('性能监控不可用，直接执行请求', {}, 'HttpService');
      return await fn();
    }
  }

  /**
   * 从URL提取API名称
   */
  private _extractApiName(url: string): string {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      const segments = path.split('/').filter(s => s);
      return segments.slice(-2).join('/') || 'unknown';
    } catch (e) {
      return 'unknown';
    }
  }

  /**
   * GET 请求快捷方法
   */
  async get<T = any>(url: string, options: HttpOptions = {}): Promise<T> {
    return this.request<T>(url, { ...options, method: 'GET' });
  }

  /**
   * POST 请求快捷方法
   */
  async post<T = any>(url: string, body?: any, options: HttpOptions = {}): Promise<T> {
    return this.request<T>(url, { ...options, method: 'POST', body });
  }

  /**
   * 加载 HTML 模板
   */
  async loadTemplate(url: string): Promise<string> {
    return this.request<string>(url, { json: false });
  }

  /**
   * 带授权的 API 请求
   */
  async apiRequest<T = any>(url: string, token: string, options: HttpOptions = {}): Promise<T> {
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    };
    return this.request<T>(url, { ...options, headers });
  }

  /**
   * 延迟函数
   */
  private _delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 创建带基础 URL 的客户端
   */
  createClient(baseUrl: string, defaultHeaders: Record<string, string> = {}): HttpClient {
    return {
      get: <T = any>(path: string, options: HttpOptions = {}) =>
        this.request<T>(`${baseUrl}${path}`, {
          ...options,
          method: 'GET',
          headers: { ...defaultHeaders, ...options.headers }
        }),
      post: <T = any>(path: string, body?: any, options: HttpOptions = {}) =>
        this.request<T>(`${baseUrl}${path}`, {
          ...options,
          method: 'POST',
          body,
          headers: { ...defaultHeaders, ...options.headers }
        }),
    };
  }
}

// 创建单例
export const HttpService = new HttpServiceClass();

// 默认导出
export default HttpService;

// 导出优先级常量
export { REQUEST_PRIORITY } from './PriorityRequestPool';

// 向后兼容：暴露到 window
if (typeof window !== 'undefined') {
  (window as any).HttpService = HttpService;
  (window as any).HttpError = HttpError;
  (window as any).REQUEST_PRIORITY = REQUEST_PRIORITY;
}

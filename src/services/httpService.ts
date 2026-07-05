// src/services/httpService.ts
// ================================================================
// 🎯 统一 HTTP 请求服务（TypeScript版本）
// 替代分散的 fetch 调用
// 🎯 P1-9: 集成请求去重和取消管理
// 🎯 DI改造：支持依赖注入Logger和Config
// 🎯 P0-4.1.8: 在数据边界使用类型守卫
// ================================================================

import { configCenter } from '../common/config/ConfigCenter';
import { priorityRequestPool, REQUEST_PRIORITY } from './PriorityRequestPool';
import { requestManager } from './RequestManager';
import { httpCacheService, type CacheStrategy } from './HttpCacheService';
import type { ILoggerService, IConfigService, IHttpService } from '../types/services';
import type { ApiResponse } from '../types/api';
import { isApiResponse } from '../common/guards/typeGuards';

/**
 * 请求优先级类型
 */
export type RequestPriority = 0 | 1 | 2 | 3 | 4;

/**
 * HTTP 请求配置
 */
export interface HttpOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  headers?: Record<string, string>;
  body?: unknown;
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
  // 🎯 优化C: HTTP缓存选项
  cache?: CacheStrategy; // 缓存策略
  cacheTTL?: number; // 缓存时长(毫秒)
  cacheKey?: string; // 自定义缓存key
  forceRefresh?: boolean; // 强制刷新(跳过缓存)
}

interface CacheLookup<T> {
  hit: boolean;
  value?: T;
}

interface HttpRequestExecutionOptions {
  method: NonNullable<HttpOptions['method']>;
  headers: Record<string, string>;
  body: unknown;
  timeout: number;
  retries: number;
  retryDelay: number;
  json: boolean;
  signal: AbortSignal | null;
}

interface HttpCacheContext {
  method: string;
  cache: CacheStrategy | undefined;
  cacheKey: string;
  cacheTTL: number;
  forceRefresh?: boolean;
  url?: string;
}

interface HttpRunContext<T> {
  url: string;
  method: string;
  usePool: boolean;
  priority: RequestPriority;
  measurePerformance: boolean;
  executeRequest: (signal?: AbortSignal) => Promise<T>;
  signal?: AbortSignal;
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
  get<T = unknown>(path: string, options?: HttpOptions): Promise<T>;
  post<T = unknown>(path: string, body?: unknown, options?: HttpOptions): Promise<T>;
}

/**
 * 统一 HTTP 请求服务
 * 🎯 DI改造：支持依赖注入Logger和Config
 */
class HttpServiceClass implements IHttpService {
  /**
   * 默认配置
   */
  defaults: {
    timeout: number;
    retries: number;
    retryDelay: number;
    headers: Record<string, string>;
  };

  private logger: ILoggerService | null;
  private configService: IConfigService | null;

  /**
   * 构造函数
   * @param logger - LoggerService实例（可选）
   * @param config - ConfigService实例（可选）
   */
  constructor(logger?: ILoggerService, config?: IConfigService) {
    this.logger = logger || null;
    this.configService = config || null;

    // 尝试从config服务或configCenter获取配置
    const getConfig = <T>(key: string, defaultValue: T): T => {
      if (this.configService) {
        try {
          return this.configService.get<T>(key, defaultValue);
        } catch {
          return defaultValue;
        }
      }
      try {
        return configCenter.get<T>(key, defaultValue);
      } catch {
        return defaultValue;
      }
    };

    this.defaults = {
      timeout: getConfig<number>('api.timeout', 30000),
      retries: getConfig<number>('api.retryAttempts', 0),
      retryDelay: getConfig<number>('api.retryDelay', 1000),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }

  /**
   * 设置LoggerService（延迟注入）
   * @param logger - LoggerService实例
   */
  setLoggerService(logger: ILoggerService): void {
    this.logger = logger;
  }

  /**
   * 记录日志（使用注入的Logger或console）
   */
  private _log(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    data: Record<string, unknown> = {}
  ): void {
    if (this.logger) {
      this.logger[level](message, data, 'HttpService');
    } else {
      console[level](`[HttpService] ${message}`, data);
    }
  }

  private async _getCachedResponse<T>(context: HttpCacheContext): Promise<CacheLookup<T>> {
    if (context.method !== 'GET' || !context.cache || context.forceRefresh) {
      return { hit: false };
    }

    const cached = await httpCacheService.get(context.cacheKey, {
      strategy: context.cache,
      ttl: context.cacheTTL,
    });

    if (cached === null) {
      return { hit: false };
    }

    this._log('debug', '使用缓存响应', { url: context.url, cacheKey: context.cacheKey });
    return { hit: true, value: cached as T };
  }

  private async _cacheResponse<T>(context: HttpCacheContext, result: T): Promise<void> {
    if (context.method !== 'GET' || !context.cache) {
      return;
    }

    await httpCacheService.set(context.cacheKey, result, {
      strategy: context.cache,
      ttl: context.cacheTTL,
    });
  }

  private _attachAbortSignal(
    signal: AbortSignal | null | undefined,
    controller: AbortController
  ): void {
    if (signal) {
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  private _createFetchOptions(
    options: HttpRequestExecutionOptions,
    controller: AbortController
  ): RequestInit {
    const fetchOptions: RequestInit = {
      method: options.method,
      headers: options.headers,
      signal: controller.signal,
    };

    if (options.body) {
      fetchOptions.body =
        typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
    }

    return fetchOptions;
  }

  private async _parseResponse<T>(response: Response, json: boolean): Promise<T> {
    if (!response.ok) {
      const errorText = await response.text();
      throw new HttpError(response.status, errorText, response);
    }

    if (!json) {
      return (await response.text()) as T;
    }

    const data = await response.json();
    if (data === undefined) {
      throw new HttpError(response.status, 'API 返回空响应', response);
    }

    return data;
  }

  private async _executeRequestAttempt<T>(
    url: string,
    options: HttpRequestExecutionOptions,
    abortSignal?: AbortSignal
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout);

    this._attachAbortSignal(options.signal, controller);
    this._attachAbortSignal(abortSignal, controller);

    try {
      const response = await fetch(url, this._createFetchOptions(options, controller));
      clearTimeout(timeoutId);
      return await this._parseResponse<T>(response, options.json);
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async _executeRequestWithRetries<T>(
    url: string,
    options: HttpRequestExecutionOptions,
    abortSignal?: AbortSignal
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= options.retries; attempt++) {
      try {
        return await this._executeRequestAttempt<T>(url, options, abortSignal);
      } catch (error) {
        lastError = error as Error;

        if (attempt === options.retries) {
          throw error;
        }

        await this._delay(options.retryDelay * (attempt + 1));
        this._log('debug', 'Retry request', {
          attempt: attempt + 1,
          retries: options.retries,
          url,
        });
      }
    }

    throw lastError;
  }

  private _runRequest<T>(context: HttpRunContext<T>): Promise<T> {
    const run = () => context.executeRequest(context.signal);

    if (context.measurePerformance) {
      return this._executeWithPerformance(
        context.url,
        context.method,
        context.usePool,
        context.priority,
        run
      );
    }

    if (context.usePool) {
      return priorityRequestPool.add(run, context.priority, {
        url: context.url,
        method: context.method,
      });
    }

    return run();
  }

  /**
   * 发送 HTTP 请求
   */
  async request<T = unknown>(url: string, options: HttpOptions = {}): Promise<T> {
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
      // 🎯 优化C: 缓存选项
      cache = undefined,
      cacheTTL = 5 * 60 * 1000, // 默认5分钟
      cacheKey = null,
      forceRefresh = false,
    } = options;

    const requestKey = deduplicateKey || `${method}:${url}`;
    const finalCacheKey = cacheKey || requestKey;
    const cacheContext: HttpCacheContext = {
      method,
      cache,
      cacheKey: finalCacheKey,
      cacheTTL,
      forceRefresh,
      url,
    };
    const cached = await this._getCachedResponse<T>(cacheContext);
    if (cached.hit) {
      return cached.value as T;
    }

    const requestOptions: HttpRequestExecutionOptions = {
      method,
      headers: { ...this.defaults.headers, ...headers },
      body,
      timeout,
      retries,
      retryDelay,
      json,
      signal,
    };
    const executeRequest = (abortSignal?: AbortSignal) =>
      this._executeRequestWithRetries<T>(url, requestOptions, abortSignal);

    let result: T;
    if (deduplicate || cancelPrevious) {
      result = await requestManager.execute(
        requestKey,
        signal =>
          this._runRequest({
            url,
            method,
            usePool,
            priority,
            measurePerformance,
            executeRequest,
            signal,
          }),
        { deduplicate, cancelPrevious }
      );
    } else {
      result = await this._runRequest({
        url,
        method,
        usePool,
        priority,
        measurePerformance,
        executeRequest,
      });
    }

    await this._cacheResponse(cacheContext, result);
    return result;
  }

  /**
   * 执行请求并进行性能监控
   * 🎯 DI改造：移除Logger依赖
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
      this._log('debug', '性能监控不可用，直接执行请求', {});
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
  async get<T = unknown>(url: string, options: HttpOptions = {}): Promise<T> {
    return this.request<T>(url, { ...options, method: 'GET' });
  }

  /**
   * POST 请求快捷方法
   */
  async post<T = unknown>(url: string, body?: unknown, options: HttpOptions = {}): Promise<T> {
    return this.request<T>(url, { ...options, method: 'POST', body });
  }

  /**
   * 发送 API 请求并验证响应格式
   * 🎯 P0-4.1.8: 在数据边界使用类型守卫
   *
   * @param url - 请求 URL
   * @param options - 请求选项
   * @param dataGuard - 可选的数据类型守卫函数
   * @returns 验证后的 API 响应
   */
  async apiRequest<T = unknown>(
    url: string,
    options?: HttpOptions | string,
    dataGuard?: (data: unknown) => data is T
  ): Promise<ApiResponse<T>> {
    if (typeof options === 'string') {
      return this.apiRequestWithAuth<T>(url, options) as Promise<ApiResponse<T>>;
    }

    const response = await this.request<unknown>(url, options || {});

    // 🎯 数据边界验证：验证 API 响应格式
    if (!isApiResponse(response, dataGuard)) {
      this._log('error', 'API 响应格式无效', { url, response });
      throw new HttpError(500, 'API 响应格式无效');
    }

    return response as ApiResponse<T>;
  }

  /**
   * 加载 HTML 模板
   */
  async loadTemplate(url: string): Promise<string> {
    return this.request<string>(url, { json: false });
  }

  /**
   * 带授权的 API 请求（已废弃，使用 apiRequest 代替）
   * @deprecated 使用 apiRequest 方法代替
   */
  async apiRequestWithAuth<T = unknown>(
    url: string,
    token: string,
    options: HttpOptions = {}
  ): Promise<T> {
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
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
      get: <T = unknown>(path: string, options: HttpOptions = {}) =>
        this.request<T>(`${baseUrl}${path}`, {
          ...options,
          method: 'GET',
          headers: { ...defaultHeaders, ...options.headers },
        }),
      post: <T = unknown>(path: string, body?: unknown, options: HttpOptions = {}) =>
        this.request<T>(`${baseUrl}${path}`, {
          ...options,
          method: 'POST',
          body,
          headers: { ...defaultHeaders, ...options.headers },
        }),
    };
  }
}

// 创建单例（向后兼容）
/** @deprecated 请使用 container.resolveAsync('http') 获取HttpService实例 */
export const HttpService = new HttpServiceClass();

// 默认导出
export default HttpService;

// 导出优先级常量
export { REQUEST_PRIORITY } from './PriorityRequestPool';

// ================================================================
// 🎯 DI容器工厂函数
// ================================================================

/**
 * 创建HttpService实例的工厂函数
 * @param logger - LoggerService实例（可选）
 * @param config - ConfigService实例（可选）
 * @returns HttpService实例
 */
export function createHttpService(
  logger?: ILoggerService,
  config?: IConfigService
): HttpServiceClass {
  return new HttpServiceClass(logger, config);
}

// ================================================================
// 向后兼容：保留旧的单例导出
// @deprecated 请使用DI容器获取服务实例
// ================================================================

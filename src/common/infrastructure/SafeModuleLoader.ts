// src/common/infrastructure/SafeModuleLoader.ts
// ================================================================
// 🎯 P0: 系统稳定性优化 - 安全模板加载器
// 当前生产链路主要使用模板加载能力；子模块加载由 ModuleLoader 负责。
// ================================================================

import { createErrorTracker } from '@/services/errorTracker';
import { AppError, NetworkError, SystemError } from '@/common/errors/AppError';
import { setSafeHtml } from '@/common/utils/security';
import { randomBetween } from '@/common/utils/random';

/**
 * 模块加载选项
 */
export interface ModuleLoadOptions {
  /** 重试次数，默认 3 */
  retryCount?: number;
  /** 超时时间（ms），默认 5000 */
  timeout?: number;
  /** 降级 UI 模板 */
  fallbackUI?: string;
  /** 错误回调 */
  onError?: (error: Error) => void;
  /** 是否显示加载指示器 */
  showLoading?: boolean;
  /** 加载指示器文本 */
  loadingText?: string;
}

/**
 * 模块加载结果
 */
export interface ModuleLoadResult {
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: Error;
  /** 加载时间（ms） */
  loadTime?: number;
  /** 实际重试次数 */
  retryAttempts?: number;
  /** 模块数据 */
  data?: unknown;
}

/**
 * 重试加载结果（内部使用）
 */
interface RetryLoadResult<T> {
  /** 加载结果 */
  data: T;
  /** 实际重试次数 */
  retryAttempts: number;
}

interface ResolvedModuleLoadOptions {
  retryCount: number;
  timeout: number;
  fallbackUI?: string;
  onError?: (error: Error) => void;
  showLoading: boolean;
  loadingText: string;
}

/**
 * 错误类型枚举
 */
export enum ModuleErrorType {
  /** 网络错误 */
  NETWORK = 'network',
  /** 解析错误 */
  PARSE = 'parse',
  /** 渲染错误 */
  RENDER = 'render',
  /** 超时错误 */
  TIMEOUT = 'timeout',
  /** 未知错误 */
  UNKNOWN = 'unknown',
}

interface ErrorClassificationDetails {
  message: string;
  code: string;
  errorType?: ModuleErrorType;
}

type ModuleRenderFunction = (container: HTMLElement) => void;

interface ErrorUIAction {
  label: string;
  action: string;
  primary: boolean;
}

const HOME_ERROR_ACTION: ErrorUIAction = { label: '返回首页', action: 'home', primary: false };

const RETRY_ERROR_ACTIONS: ErrorUIAction[] = [
  { label: '重试', action: 'retry', primary: true },
  HOME_ERROR_ACTION,
];

const RELOAD_ERROR_ACTIONS: ErrorUIAction[] = [
  { label: '刷新页面', action: 'reload', primary: true },
  HOME_ERROR_ACTION,
];

const NETWORK_ERROR_KEYWORDS = [
  'network',
  'fetch',
  'connection',
  'dns',
  'cors',
  'http',
  'xhr',
  'ajax',
  'socket',
  'offline',
  'unreachable',
] as const;

const RENDER_ERROR_KEYWORDS = [
  'render',
  'rendering',
  'dom',
  'element',
  'node',
  'document',
  'queryselector',
  'getelementby',
  'appendchild',
  'insertbefore',
  'removechild',
  'innerhtml',
  'textcontent',
] as const;

const ELEMENT_NOT_FOUND_STACK_KEYWORDS = [
  'queryselector',
  'getelementby',
  'appendchild',
  'innerhtml',
] as const;

/**
 * 安全模板加载器
 * 提供模板加载、错误处理和降级机制。
 *
 * @deprecated 旧名保留用于兼容。新代码请使用 SafeTemplateLoader/safeTemplateLoader。
 */
export class SafeModuleLoader {
  private static instance: SafeModuleLoader;
  private loadedModules: Map<string, unknown>;
  private loadingModules: Map<string, Promise<unknown>>;
  private errorTrackerInstance: ReturnType<typeof createErrorTracker>;

  /**
   * 私有构造函数（单例模式）
   */
  private constructor() {
    this.loadedModules = new Map();
    this.loadingModules = new Map();

    // 使用错误追踪器（不再需要 logger 参数）
    this.errorTrackerInstance = createErrorTracker();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): SafeModuleLoader {
    if (!SafeModuleLoader.instance) {
      SafeModuleLoader.instance = new SafeModuleLoader();
    }
    return SafeModuleLoader.instance;
  }

  private resolveModuleLoadOptions(options: ModuleLoadOptions): ResolvedModuleLoadOptions {
    const {
      retryCount = 3,
      timeout = 5000,
      fallbackUI,
      onError,
      showLoading = true,
      loadingText = '加载中...',
    } = options;

    return {
      retryCount,
      timeout,
      fallbackUI,
      onError,
      showLoading,
      loadingText,
    };
  }

  private showModuleLoadingIndicator(
    container: HTMLElement,
    options: ResolvedModuleLoadOptions
  ): void {
    if (options.showLoading) {
      this.showLoadingIndicator(container, options.loadingText);
    }
  }

  private async waitForExistingModuleLoad(modulePath: string): Promise<void> {
    const existingLoad = this.loadingModules.get(modulePath);
    if (existingLoad) {
      await existingLoad;
    }
  }

  private renderCachedModuleIfAvailable(
    container: HTMLElement,
    modulePath: string,
    startTime: number
  ): ModuleLoadResult | null {
    if (!this.loadedModules.has(modulePath)) {
      return null;
    }

    const cachedModule = this.loadedModules.get(modulePath);
    this.renderModule(container, cachedModule);

    return this.createModuleLoadSuccessResult(cachedModule, startTime, 0);
  }

  private async loadAndCacheModule(
    modulePath: string,
    timeout: number,
    retryCount: number
  ): Promise<RetryLoadResult<unknown>> {
    const loadResult = await this.retryLoad(
      () => this.loadModuleWithTimeout(modulePath, timeout),
      retryCount
    );

    this.loadingModules.set(modulePath, Promise.resolve(loadResult.data));
    this.loadedModules.set(modulePath, loadResult.data);
    this.loadingModules.delete(modulePath);

    return loadResult;
  }

  private createModuleLoadSuccessResult(
    data: unknown,
    startTime: number,
    retryAttempts: number
  ): ModuleLoadResult {
    return {
      success: true,
      loadTime: performance.now() - startTime,
      retryAttempts,
      data,
    };
  }

  private handleErrorCallback(
    onError: ((error: Error) => void) | undefined,
    classifiedError: AppError,
    modulePath: string
  ): void {
    if (!onError) {
      return;
    }

    try {
      onError(classifiedError);
    } catch (callbackError) {
      this.errorTrackerInstance.captureAppError(
        new SystemError(
          '错误回调执行失败',
          'ERROR_CALLBACK_FAILED',
          { modulePath },
          callbackError as Error
        )
      );
    }
  }

  private handleModuleLoadFailure(
    container: HTMLElement,
    modulePath: string,
    error: unknown,
    startTime: number,
    options: ResolvedModuleLoadOptions
  ): ModuleLoadResult {
    this.loadingModules.delete(modulePath);

    const classifiedError = this.classifyError(error as Error, modulePath);
    this.errorTrackerInstance.captureAppError(classifiedError);
    this.handleErrorCallback(options.onError, classifiedError, modulePath);
    this.renderErrorUI(container, classifiedError, modulePath, options.fallbackUI);

    return {
      success: false,
      error: classifiedError,
      loadTime: performance.now() - startTime,
      retryAttempts: options.retryCount,
    };
  }

  /**
   * 加载模块到容器
   * @param container - 目标容器元素
   * @param modulePath - 模块路径
   * @param options - 加载选项
   * @returns 加载结果
   * @deprecated 该方法未接入主路由模块加载链。生产子模块加载请使用 ModuleLoader。
   */
  async loadModule(
    container: HTMLElement,
    modulePath: string,
    options: ModuleLoadOptions = {}
  ): Promise<ModuleLoadResult> {
    const startTime = performance.now();
    const loadOptions = this.resolveModuleLoadOptions(options);
    this.showModuleLoadingIndicator(container, loadOptions);

    try {
      await this.waitForExistingModuleLoad(modulePath);

      const cachedResult = this.renderCachedModuleIfAvailable(container, modulePath, startTime);
      if (cachedResult) {
        return cachedResult;
      }

      const loadResult = await this.loadAndCacheModule(
        modulePath,
        loadOptions.timeout,
        loadOptions.retryCount
      );
      this.renderModule(container, loadResult.data);
      return this.createModuleLoadSuccessResult(
        loadResult.data,
        startTime,
        loadResult.retryAttempts
      );
    } catch (error) {
      return this.handleModuleLoadFailure(container, modulePath, error, startTime, loadOptions);
    }
  }

  /**
   * 加载模板
   * @param templatePath - 模板路径
   * @param options - 加载选项
   * @returns 模板内容
   */
  async loadTemplate(templatePath: string, options: ModuleLoadOptions = {}): Promise<string> {
    const { retryCount = 3, timeout = 5000 } = options;

    try {
      // 开发环境下禁用缓存，确保模板修改后能立即生效
      const isDevelopment = import.meta.env.DEV;

      // 检查缓存（生产环境）
      if (!isDevelopment && this.loadedModules.has(templatePath)) {
        const cached = this.loadedModules.get(templatePath);
        if (typeof cached === 'string') {
          return cached;
        }
        throw new SystemError(`缓存的模板类型错误: ${templatePath}`, 'INVALID_CACHE_TYPE', {
          templatePath,
          cachedType: typeof cached,
        });
      }

      // 加载模板（带重试）
      const loadResult = await this.retryLoad(
        () => this.loadTemplateWithTimeout(templatePath, timeout),
        retryCount
      );

      const template = loadResult.data;

      // 缓存模板（仅生产环境）
      if (!isDevelopment) {
        this.loadedModules.set(templatePath, template);
      }

      return template;
    } catch (error) {
      const classifiedError = this.classifyError(error as Error, templatePath);

      this.errorTrackerInstance.captureAppError(classifiedError);

      throw classifiedError;
    }
  }

  /**
   * 带超时的模块加载
   * @param modulePath - 模块路径
   * @param timeout - 超时时间
   * @returns 模块数据
   */
  private async loadModuleWithTimeout(modulePath: string, timeout: number): Promise<unknown> {
    return Promise.race([
      this.loadModuleInternal(modulePath),
      this.createTimeoutPromise(timeout, modulePath),
    ]);
  }

  /**
   * 带超时的模板加载
   * @param templatePath - 模板路径
   * @param timeout - 超时时间
   * @returns 模板内容
   */
  private async loadTemplateWithTimeout(templatePath: string, timeout: number): Promise<string> {
    return Promise.race([
      this.loadTemplateInternal(templatePath),
      this.createTimeoutPromise<string>(timeout, templatePath),
    ]);
  }

  /**
   * 内部模块加载逻辑
   * @param modulePath - 模块路径
   * @returns 模块数据
   */
  private async loadModuleInternal(modulePath: string): Promise<unknown> {
    try {
      // 动态导入模块
      const module = await import(/* @vite-ignore */ modulePath);
      return module.default || module;
    } catch (error) {
      throw new NetworkError(
        `无法加载模块: ${modulePath}`,
        'MODULE_LOAD_FAILED',
        { modulePath },
        error as Error
      );
    }
  }

  /**
   * 内部模板加载逻辑
   * @param templatePath - 模板路径
   * @returns 模板内容
   */
  private async loadTemplateInternal(templatePath: string): Promise<string> {
    try {
      // 🎯 修复: 使用 viewLoader 的 loadTemplate 函数，它使用 Vite glob 导入
      // 避免在生产环境中使用 fetch 导致返回整个 index.html
      const { loadTemplate: viewLoaderLoadTemplate } = await import('@/common/utils/viewLoader');

      // 标准化路径：确保以 / 开头
      let normalizedPath = templatePath;
      if (!normalizedPath.startsWith('/')) {
        normalizedPath = '/' + normalizedPath;
      }

      // 使用 viewLoader 的 loadTemplate，禁用淡入动画（SafeRenderer 会处理）
      const html = await viewLoaderLoadTemplate(normalizedPath, { disableFadeIn: true });

      return html;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new NetworkError(
        `无法加载模板: ${templatePath}`,
        'TEMPLATE_LOAD_FAILED',
        { templatePath },
        error as Error
      );
    }
  }

  /**
   * 创建超时 Promise
   * @param timeout - 超时时间
   * @param resourcePath - 资源路径
   * @returns 超时 Promise
   */
  private createTimeoutPromise<T>(timeout: number, resourcePath: string): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new SystemError(`加载超时: ${resourcePath}`, 'LOAD_TIMEOUT', { resourcePath, timeout })
        );
      }, timeout);
    });
  }

  /**
   * 重试加载
   * @param fn - 加载函数
   * @param retries - 重试次数
   * @returns 加载结果
   */
  /**
   * 带重试的加载函数（指数退避策略）
   * @param fn - 要执行的加载函数
   * @param retries - 最大重试次数
   * @returns 加载结果和实际重试次数
   *
   * 重试策略：
   * - 第1次重试：100ms + 抖动
   * - 第2次重试：200ms + 抖动
   * - 第3次重试：400ms + 抖动
   * - 抖动范围：±20% 随机值，防止惊群效应
   */
  private async retryLoad<T>(fn: () => Promise<T>, retries: number): Promise<RetryLoadResult<T>> {
    let lastError: Error | null = null;
    let actualRetries = 0;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        if (attempt > 0) {
          actualRetries++;

          // 指数退避：2^(attempt-1) * 100ms
          const baseDelay = Math.pow(2, attempt - 1) * 100;

          // 添加 ±20% 的随机抖动，防止惊群效应
          const jitter = baseDelay * 0.2 * randomBetween(-1, 1);
          const delay = Math.round(baseDelay + jitter);

          await this.sleep(delay);
        }

        // 执行加载函数
        const result = await fn();

        return {
          data: result,
          retryAttempts: actualRetries,
        };
      } catch (error) {
        lastError = error as Error;

        // 判断是否应该重试
        const shouldRetry = this.shouldRetryError(error as Error, attempt, retries);

        if (!shouldRetry) {
          throw error;
        }
      }
    }

    // 所有重试都失败
    throw lastError;
  }

  /**
   * 判断错误是否应该重试
   * @param error - 错误对象
   * @param attempt - 当前尝试次数
   * @param maxRetries - 最大重试次数
   * @returns 是否应该重试
   */
  private shouldRetryError(error: Error, attempt: number, maxRetries: number): boolean {
    // 已达到最大重试次数
    if (attempt >= maxRetries) {
      return false;
    }

    // 网络错误应该重试
    if (error instanceof NetworkError) {
      return true;
    }

    // 超时错误应该重试
    if (error.message.includes('timeout') || error.message.includes('超时')) {
      return true;
    }

    // 系统错误（如 500、502、503）应该重试
    if (error instanceof SystemError) {
      return true;
    }

    // 解析错误通常不应该重试（代码问题）
    if (error instanceof SyntaxError) {
      return false;
    }

    // 其他错误默认重试
    return true;
  }

  /**
   * 睡眠函数
   * @param ms - 毫秒数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private hasAnyKeyword(text: string, keywords: readonly string[]): boolean {
    return keywords.some(keyword => text.includes(keyword));
  }

  private createNetworkClassificationError(
    details: ErrorClassificationDetails,
    resourcePath: string,
    error: Error
  ): NetworkError {
    return new NetworkError(
      details.message,
      details.code,
      { resourcePath, originalMessage: error.message },
      error
    );
  }

  private createSystemClassificationError(
    details: ErrorClassificationDetails,
    resourcePath: string,
    error: Error
  ): SystemError {
    return new SystemError(
      details.message,
      details.code,
      {
        resourcePath,
        originalMessage: error.message,
        errorType: details.errorType,
      },
      error
    );
  }

  private isTimeoutError(error: Error, errorMessage: string): boolean {
    return (
      errorMessage.includes('timeout') ||
      errorMessage.includes('超时') ||
      errorMessage.includes('timed out') ||
      error.name === 'TimeoutError'
    );
  }

  private isModuleResolutionError(errorMessage: string): boolean {
    return (
      errorMessage.includes('cannot find module') ||
      errorMessage.includes('module not found') ||
      errorMessage.includes('failed to resolve') ||
      (errorMessage.includes('import') && errorMessage.includes('failed')) ||
      (errorMessage.includes('require') && errorMessage.includes('failed'))
    );
  }

  private isJsonParseError(errorMessage: string): boolean {
    return (
      (errorMessage.includes('json') && errorMessage.includes('parse')) ||
      errorMessage.includes('unexpected token') ||
      errorMessage.includes('unexpected end of json') ||
      errorMessage.includes('invalid json')
    );
  }

  private isGenericParseError(errorMessage: string): boolean {
    return (
      errorMessage.includes('parse') ||
      errorMessage.includes('parsing') ||
      errorMessage.includes('unexpected') ||
      errorMessage.includes('invalid syntax')
    );
  }

  private isHttpStatusError(errorMessage: string): boolean {
    return (
      errorMessage.includes('404') ||
      errorMessage.includes('500') ||
      errorMessage.includes('502') ||
      errorMessage.includes('503') ||
      /\b[45]\d{2}\b/.test(errorMessage)
    );
  }

  private isMissingElementReference(
    error: Error,
    errorMessage: string,
    errorStack: string
  ): boolean {
    return (
      error instanceof TypeError &&
      (errorMessage.includes('null') ||
        errorMessage.includes('undefined') ||
        errorMessage.includes('cannot read property') ||
        errorMessage.includes('cannot read properties')) &&
      this.hasAnyKeyword(errorStack, ELEMENT_NOT_FOUND_STACK_KEYWORDS)
    );
  }

  private classifyNetworkError(
    error: Error,
    resourcePath: string,
    errorMessage: string
  ): AppError | null {
    if (
      error instanceof TypeError &&
      (errorMessage.includes('failed to fetch') || errorMessage.includes('network request failed'))
    ) {
      return this.createNetworkClassificationError(
        {
          message: `网络请求失败: ${resourcePath}`,
          code: 'NETWORK_REQUEST_FAILED',
        },
        resourcePath,
        error
      );
    }

    if (this.isTimeoutError(error, errorMessage)) {
      return this.createNetworkClassificationError(
        {
          message: `加载超时: ${resourcePath}`,
          code: 'LOAD_TIMEOUT',
        },
        resourcePath,
        error
      );
    }

    if (this.hasAnyKeyword(errorMessage, NETWORK_ERROR_KEYWORDS)) {
      return this.createNetworkClassificationError(
        {
          message: `网络错误: ${error.message}`,
          code: 'NETWORK_ERROR',
        },
        resourcePath,
        error
      );
    }

    if (this.isHttpStatusError(errorMessage)) {
      return this.createNetworkClassificationError(
        {
          message: `HTTP 错误: ${error.message}`,
          code: 'HTTP_ERROR',
        },
        resourcePath,
        error
      );
    }

    return null;
  }

  private classifyParseError(
    error: Error,
    resourcePath: string,
    errorMessage: string,
    errorName: string
  ): AppError | null {
    if (error instanceof SyntaxError || errorName === 'syntaxerror') {
      return this.createSystemClassificationError(
        {
          message: `JavaScript 语法错误: ${error.message}`,
          code: 'SYNTAX_ERROR',
          errorType: ModuleErrorType.PARSE,
        },
        resourcePath,
        error
      );
    }

    if (this.isModuleResolutionError(errorMessage)) {
      return this.createSystemClassificationError(
        {
          message: `模块解析失败: ${error.message}`,
          code: 'MODULE_RESOLUTION_ERROR',
          errorType: ModuleErrorType.PARSE,
        },
        resourcePath,
        error
      );
    }

    if (this.isJsonParseError(errorMessage)) {
      return this.createSystemClassificationError(
        {
          message: `JSON 解析错误: ${error.message}`,
          code: 'JSON_PARSE_ERROR',
          errorType: ModuleErrorType.PARSE,
        },
        resourcePath,
        error
      );
    }

    if (this.isGenericParseError(errorMessage)) {
      return this.createSystemClassificationError(
        {
          message: `解析错误: ${error.message}`,
          code: 'PARSE_ERROR',
          errorType: ModuleErrorType.PARSE,
        },
        resourcePath,
        error
      );
    }

    return null;
  }

  private classifyRenderError(
    error: Error,
    resourcePath: string,
    errorMessage: string,
    errorName: string,
    errorStack: string
  ): AppError | null {
    if (error instanceof DOMException || errorName === 'domexception') {
      return this.createSystemClassificationError(
        {
          message: `DOM 操作错误: ${error.message}`,
          code: 'DOM_ERROR',
          errorType: ModuleErrorType.RENDER,
        },
        resourcePath,
        error
      );
    }

    if (this.hasAnyKeyword(errorMessage, RENDER_ERROR_KEYWORDS)) {
      return this.createSystemClassificationError(
        {
          message: `渲染错误: ${error.message}`,
          code: 'RENDER_ERROR',
          errorType: ModuleErrorType.RENDER,
        },
        resourcePath,
        error
      );
    }

    if (this.isMissingElementReference(error, errorMessage, errorStack)) {
      return this.createSystemClassificationError(
        {
          message: `渲染错误（元素不存在）: ${error.message}`,
          code: 'ELEMENT_NOT_FOUND',
          errorType: ModuleErrorType.RENDER,
        },
        resourcePath,
        error
      );
    }

    return null;
  }

  private createUnknownClassificationError(error: Error, resourcePath: string): SystemError {
    return new SystemError(
      `未知错误: ${error.message}`,
      'UNKNOWN_ERROR',
      {
        resourcePath,
        originalMessage: error.message,
        errorName: error.name,
        errorType: ModuleErrorType.UNKNOWN,
      },
      error
    );
  }

  /**
   * 分类错误
   * @param error - 原始错误
   * @param resourcePath - 资源路径
   * @returns 分类后的错误
   *
   * 错误分类策略：
   * 1. 网络错误：连接失败、超时、DNS解析失败、HTTP错误等
   * 2. 解析错误：JavaScript语法错误、JSON解析错误、模块解析失败等
   * 3. 渲染错误：DOM操作失败、元素不存在、样式错误等
   */
  private classifyError(error: Error, resourcePath: string): AppError {
    // 如果已经是 AppError，直接返回
    if (error instanceof AppError) {
      return error;
    }

    const errorMessage = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();
    const errorStack = error.stack?.toLowerCase() || '';

    return (
      this.classifyNetworkError(error, resourcePath, errorMessage) ||
      this.classifyParseError(error, resourcePath, errorMessage, errorName) ||
      this.classifyRenderError(error, resourcePath, errorMessage, errorName, errorStack) ||
      this.createUnknownClassificationError(error, resourcePath)
    );
  }

  private getModuleRenderFunction(moduleData: unknown): ModuleRenderFunction | null {
    if (!moduleData || typeof moduleData !== 'object') {
      return null;
    }

    const mod = moduleData as {
      render?: ModuleRenderFunction;
      mount?: ModuleRenderFunction;
    };

    if (typeof mod.render === 'function') {
      return mod.render;
    }

    if (typeof mod.mount === 'function') {
      return mod.mount;
    }

    return null;
  }

  /**
   * 渲染模块
   * @param container - 容器元素
   * @param moduleData - 模块数据
   */
  private renderModule(container: HTMLElement, moduleData: unknown): void {
    try {
      const renderFn = this.getModuleRenderFunction(moduleData);
      if (renderFn) {
        renderFn(container);
        return;
      }

      // 如果模块是字符串，直接设置为 innerHTML
      if (typeof moduleData === 'string') {
        setSafeHtml(container, moduleData);
        return;
      }
    } catch (error) {
      throw new SystemError('渲染模块失败', 'RENDER_ERROR', {}, error as Error);
    }
  }

  /**
   * 显示加载指示器
   * @param container - 容器元素
   * @param text - 加载文本
   */
  private showLoadingIndicator(container: HTMLElement, text: string): void {
    // ✅ 安全: 静态HTML模板，text参数已通过escapeHtml转义
    setSafeHtml(
      container,
      `
      <div class="flex items-center justify-center p-8">
        <div class="text-center">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
          <p class="text-gray-600">${this.escapeHtml(text)}</p>
        </div>
      </div>
    `
    );
  }

  /**
   * 渲染错误 UI
   * @param container - 容器元素
   * @param error - 错误对象
   * @param modulePath - 模块路径
   * @param customFallback - 自定义降级 UI
   */
  /**
   * 渲染错误 UI（降级 UI）
   * @param container - 目标容器
   * @param error - 错误对象
   * @param modulePath - 模块路径
   * @param customFallback - 自定义降级模板
   */
  private renderErrorUI(
    container: HTMLElement,
    error: AppError,
    modulePath: string,
    customFallback?: string
  ): void {
    // 清空容器
    container.replaceChildren();

    // 如果提供了自定义降级模板，使用自定义模板
    if (customFallback) {
      // ✅ 安全: interpolateFallbackTemplate会转义错误信息
      setSafeHtml(container, this.interpolateFallbackTemplate(customFallback, error, modulePath));
      this.attachErrorUIEventHandlers(container, modulePath);
      return;
    }

    // 根据错误类型选择合适的降级 UI
    const errorUI = this.selectFallbackUI(error, modulePath);
    // ✅ 安全: selectFallbackUI返回的HTML使用已转义的错误信息
    setSafeHtml(container, errorUI);
    this.attachErrorUIEventHandlers(container, modulePath);
  }

  /**
   * 选择合适的降级 UI
   * @param error - 错误对象
   * @param modulePath - 模块路径
   * @returns HTML 字符串
   */
  private selectFallbackUI(error: AppError, modulePath: string): string {
    // 根据错误码和类别选择合适的 UI
    if (error.code.includes('TIMEOUT') || error.message.includes('timeout')) {
      return this.getTimeoutErrorUI(error, modulePath);
    }

    if (error.code.includes('PARSE') || error.message.includes('parse')) {
      return this.getParseErrorUI(error, modulePath);
    }

    if (error.code.includes('RENDER') || error.message.includes('render')) {
      return this.getRenderErrorUI(error, modulePath);
    }

    // 根据 ErrorCategory 判断
    switch (error.category) {
      case 'network':
        return this.getNetworkErrorUI(error, modulePath);
      default:
        return this.getDefaultFallbackUI(error, modulePath);
    }
  }

  /**
   * 网络错误 UI
   */
  private getNetworkErrorUI(error: AppError, modulePath: string): string {
    return this.createErrorUITemplate({
      icon: this.getNetworkErrorIcon(),
      iconColor: 'text-orange-500',
      title: '网络连接问题',
      message: '无法加载模块，请检查您的网络连接',
      suggestion: '请确保您的网络连接正常，然后点击重试按钮',
      actions: RETRY_ERROR_ACTIONS,
      error,
      modulePath,
    });
  }

  /**
   * 解析错误 UI
   */
  private getParseErrorUI(error: AppError, modulePath: string): string {
    return this.createErrorUITemplate({
      icon: this.getParseErrorIcon(),
      iconColor: 'text-red-500',
      title: '模块解析失败',
      message: '模块内容格式错误，无法正常加载',
      suggestion: '这可能是系统更新导致的问题，请刷新页面或联系技术支持',
      actions: RELOAD_ERROR_ACTIONS,
      error,
      modulePath,
    });
  }

  /**
   * 渲染错误 UI
   */
  private getRenderErrorUI(error: AppError, modulePath: string): string {
    return this.createErrorUITemplate({
      icon: this.getRenderErrorIcon(),
      iconColor: 'text-purple-500',
      title: '模块渲染失败',
      message: '模块加载成功，但渲染时出现问题',
      suggestion: '请尝试刷新页面，如果问题持续存在，请联系技术支持',
      actions: RELOAD_ERROR_ACTIONS,
      error,
      modulePath,
    });
  }

  /**
   * 超时错误 UI
   */
  private getTimeoutErrorUI(error: AppError, modulePath: string): string {
    return this.createErrorUITemplate({
      icon: this.getTimeoutErrorIcon(),
      iconColor: 'text-yellow-500',
      title: '加载超时',
      message: '模块加载时间过长，已自动取消',
      suggestion: '这可能是网络较慢或服务器响应缓慢导致的，请重试',
      actions: RETRY_ERROR_ACTIONS,
      error,
      modulePath,
    });
  }

  /**
   * 获取默认降级 UI
   * @param error - 错误对象
   * @param modulePath - 模块路径
   * @returns HTML 字符串
   */
  private getDefaultFallbackUI(error: AppError, modulePath: string): string {
    return this.createErrorUITemplate({
      icon: this.getDefaultErrorIcon(),
      iconColor: 'text-red-500',
      title: '模块加载失败',
      message: error.toUserMessage(),
      suggestion: '请尝试刷新页面，如果问题持续存在，请联系技术支持',
      actions: RELOAD_ERROR_ACTIONS,
      error,
      modulePath,
    });
  }

  /**
   * 创建错误 UI 模板
   */
  private createErrorUITemplate(config: {
    icon: string;
    iconColor: string;
    title: string;
    message: string;
    suggestion: string;
    actions: ErrorUIAction[];
    error: AppError;
    modulePath: string;
  }): string {
    const isDev = import.meta.env.DEV;
    const errorDetails = isDev ? this.getErrorDetailsSection(config.error, config.modulePath) : '';
    const actionsHTML = this.getActionsHTML(config.actions, config.modulePath);

    return `
      <div class="flex items-center justify-center p-8 min-h-[400px]">
        <div class="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <div class="mb-4">
            <div class="${config.iconColor}">
              ${config.icon}
            </div>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">
            ${this.escapeHtml(config.title)}
          </h3>
          <p class="text-gray-600 mb-2">
            ${this.escapeHtml(config.message)}
          </p>
          <p class="text-sm text-gray-500 mb-4">
            ${this.escapeHtml(config.suggestion)}
          </p>
          <div class="flex gap-2 justify-center mb-4">
            ${actionsHTML}
          </div>
          <div class="text-xs text-gray-400">
            <p>错误码: ${this.escapeHtml(config.error.code)}</p>
          </div>
          ${errorDetails}
        </div>
      </div>
    `;
  }

  /**
   * 获取操作按钮 HTML
   */
  private getActionsHTML(actions: ErrorUIAction[], modulePath: string): string {
    return actions
      .map(action => {
        const baseClass = 'px-4 py-2 rounded transition-colors';
        const colorClass = action.primary
          ? 'bg-blue-500 text-white hover:bg-blue-600'
          : 'bg-gray-200 text-gray-700 hover:bg-gray-300';

        return `
        <button 
          data-error-action="${this.escapeHtml(action.action)}"
          data-module-path="${this.escapeHtml(modulePath)}"
          class="${baseClass} ${colorClass}"
        >
          ${this.escapeHtml(action.label)}
        </button>
      `;
      })
      .join('');
  }

  /**
   * 获取错误详情区域
   */
  private getErrorDetailsSection(error: AppError, modulePath: string): string {
    return `
      <details class="mt-4 text-left">
        <summary class="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
          技术详情（开发模式）
        </summary>
        <div class="mt-2 p-3 bg-gray-50 rounded text-xs font-mono">
          <p><strong>错误码:</strong> ${this.escapeHtml(error.code)}</p>
          <p><strong>模块:</strong> ${this.escapeHtml(modulePath)}</p>
          <p><strong>类别:</strong> ${this.escapeHtml(error.category)}</p>
          <p><strong>消息:</strong> ${this.escapeHtml(error.message)}</p>
          ${error.stack ? `<p class="mt-2"><strong>堆栈:</strong></p><pre class="text-xs overflow-auto max-h-40">${this.escapeHtml(error.stack)}</pre>` : ''}
        </div>
      </details>
    `;
  }

  /**
   * 插值降级模板
   */
  private interpolateFallbackTemplate(
    template: string,
    error: AppError,
    modulePath: string
  ): string {
    return template
      .replace(/\{\{errorMessage\}\}/g, this.escapeHtml(error.toUserMessage()))
      .replace(/\{\{errorCode\}\}/g, this.escapeHtml(error.code))
      .replace(/\{\{modulePath\}\}/g, this.escapeHtml(modulePath))
      .replace(/\{\{errorCategory\}\}/g, this.escapeHtml(error.category));
  }

  /**
   * 附加错误 UI 事件处理器
   */
  private attachErrorUIEventHandlers(container: HTMLElement, modulePath: string): void {
    // 为所有操作按钮添加事件监听
    const actionButtons = container.querySelectorAll('[data-error-action]');
    actionButtons.forEach(button => {
      button.addEventListener('click', e => {
        const target = e.currentTarget as HTMLElement;
        const action = target.getAttribute('data-error-action');
        this.handleErrorUIAction(action, modulePath, container);
      });
    });
  }

  /**
   * 处理错误 UI 操作
   */
  private handleErrorUIAction(
    action: string | null,
    modulePath: string,
    container: HTMLElement
  ): void {
    if (!action) return;

    switch (action) {
      case 'retry':
        // 重新加载模块
        this.showLoadingIndicator(container, '正在重试...');
        this.loadModule(container, modulePath);
        break;
      case 'reload':
        // 刷新页面
        window.location.reload();
        break;
      case 'home':
        // 返回首页
        window.location.assign('/');
        break;
      default:
        break;
    }
  }

  /**
   * 获取网络错误图标
   */
  private getNetworkErrorIcon(): string {
    return `
      <svg class="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
      </svg>
    `;
  }

  /**
   * 获取解析错误图标
   */
  private getParseErrorIcon(): string {
    return `
      <svg class="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    `;
  }

  /**
   * 获取渲染错误图标
   */
  private getRenderErrorIcon(): string {
    return `
      <svg class="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    `;
  }

  /**
   * 获取超时错误图标
   */
  private getTimeoutErrorIcon(): string {
    return `
      <svg class="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    `;
  }

  /**
   * 获取默认错误图标
   */
  private getDefaultErrorIcon(): string {
    return `
      <svg class="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    `;
  }

  /**
   * HTML 转义
   * @param text - 原始文本
   * @returns 转义后的文本
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
    };
    return text.replace(/[&<>"'/]/g, char => map[char] || char);
  }

  /**
   * 清除缓存
   * @param modulePath - 模块路径（可选，不传则清除所有）
   */
  clearCache(modulePath?: string): void {
    if (modulePath) {
      this.loadedModules.delete(modulePath);
    } else {
      this.loadedModules.clear();
    }
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): {
    cachedModules: number;
    loadingModules: number;
    moduleList: string[];
  } {
    return {
      cachedModules: this.loadedModules.size,
      loadingModules: this.loadingModules.size,
      moduleList: Array.from(this.loadedModules.keys()),
    };
  }

  /**
   * 预加载模块
   * @param modulePaths - 模块路径数组
   */
  async preloadModules(modulePaths: string[]): Promise<void> {
    const results = await Promise.allSettled(
      modulePaths.map(path => this.loadModuleInternal(path))
    );

    results.forEach((result, index) => {
      const modulePath = modulePaths[index];
      if (!modulePath) return;

      if (result.status === 'fulfilled') {
        this.loadedModules.set(modulePath, result.value);
      }
    });
  }
}

// 新命名反映当前生产职责：安全模板加载。
export const SafeTemplateLoader = SafeModuleLoader;

// 创建并导出单例实例
export const safeTemplateLoader = SafeModuleLoader.getInstance();

/**
 * @deprecated 旧名保留用于兼容。新代码请使用 safeTemplateLoader。
 */
export const safeModuleLoader = safeTemplateLoader;

// 默认导出
export default safeTemplateLoader;

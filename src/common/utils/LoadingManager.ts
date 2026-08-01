// src/common/utils/LoadingManager.ts
// ================================================================
// 🎯 统一加载状态管理器 (TypeScript版本)
// 解决多个模块同时显示 loading、状态不一致的问题
// ================================================================

import { APP_EVENTS, emitAppEvent } from '../constants/eventConstants';

// ==================== 类型定义 ====================

/**
 * 加载任务配置
 */
export interface LoadingTask {
  /** 任务唯一标识 */
  id: string;
  /** 加载提示信息 */
  message: string;
  /** 优先级（数字越大优先级越高） */
  priority: number;
  /** 开始时间戳 */
  startTime: number;
}

/**
 * 加载任务选项
 */
export interface LoadingTaskOptions {
  /** 加载提示信息 */
  message?: string;
  /** 优先级 */
  priority?: number;
}

/**
 * 作用域加载管理器
 */
export interface ScopedLoadingManager {
  start: (taskId: string, options?: LoadingTaskOptions) => void;
  stop: (taskId: string) => boolean;
  wrap: <T>(taskId: string, asyncFn: () => Promise<T>, options?: LoadingTaskOptions) => Promise<T>;
}

// ==================== 加载管理器类 ====================

/**
 * 统一加载状态管理器
 * 管理全局加载状态，避免多个 loading 同时显示
 */
export class LoadingManager {
  private tasks: Map<string, LoadingTask>;
  private globalLoadingElement: HTMLElement | null;
  private defaultMessage: string;

  constructor() {
    this.tasks = new Map();
    this.globalLoadingElement = null;
    this.defaultMessage = '加载中...';
  }

  /**
   * 开始一个加载任务
   * @param taskId - 任务ID
   * @param options - 配置选项
   */
  start(taskId: string, options: LoadingTaskOptions = {}): void {
    const task: LoadingTask = {
      id: taskId,
      message: options.message ?? this.defaultMessage,
      priority: options.priority ?? 0,
      startTime: Date.now(),
    };

    this.tasks.set(taskId, task);
    this.updateUI();

    // 触发事件
    emitAppEvent(APP_EVENTS.LOADING_START, { taskId, task });
  }

  /**
   * 结束一个加载任务
   * @param taskId - 任务ID
   * @returns 是否找到并停止了任务
   */
  stop(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    const duration = Date.now() - task.startTime;
    this.tasks.delete(taskId);
    this.updateUI();

    // 触发事件
    emitAppEvent(APP_EVENTS.LOADING_STOP, { taskId, duration });

    return true;
  }

  /**
   * 检查是否有加载任务
   */
  get isLoading(): boolean {
    return this.tasks.size > 0;
  }

  /**
   * 获取当前加载任务数量
   */
  get taskCount(): number {
    return this.tasks.size;
  }

  /**
   * 获取当前显示的加载信息
   */
  get currentMessage(): string {
    if (this.tasks.size === 0) return '';

    // 返回优先级最高的任务消息
    const tasks = Array.from(this.tasks.values());
    tasks.sort((a, b) => b.priority - a.priority);
    return tasks[0]?.message ?? '';
  }

  /**
   * 获取所有任务列表
   */
  getAllTasks(): LoadingTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * 清空所有任务
   * @returns 清空的任务数量
   */
  clearAll(): number {
    const taskIds = Array.from(this.tasks.keys());
    this.tasks.clear();
    this.updateUI();

    return taskIds.length;
  }

  /**
   * 设置全局 Loading 元素
   * @param element - Loading 元素
   */
  setGlobalLoadingElement(element: HTMLElement): void {
    this.globalLoadingElement = element;
    element.setAttribute('role', 'status');
    element.setAttribute('aria-live', 'polite');
    element.setAttribute('aria-atomic', 'true');
    element.setAttribute('aria-busy', this.isLoading ? 'true' : 'false');
    element.setAttribute('aria-hidden', this.isLoading ? 'false' : 'true');
  }

  /**
   * 更新 UI 显示
   * @private
   */
  private updateUI(): void {
    if (!this.globalLoadingElement) return;

    if (this.isLoading) {
      // 显示Loading
      this.globalLoadingElement.classList.remove('hidden');
      this.globalLoadingElement.classList.add('flex');
      this.globalLoadingElement.setAttribute('aria-busy', 'true');
      this.globalLoadingElement.setAttribute('aria-hidden', 'false');

      // 更新消息
      const messageEl = this.globalLoadingElement.querySelector('[data-loading-message]');
      if (messageEl) {
        messageEl.textContent = this.currentMessage;
      }
    } else {
      // 隐藏Loading
      this.globalLoadingElement.classList.add('hidden');
      this.globalLoadingElement.classList.remove('flex');
      this.globalLoadingElement.setAttribute('aria-busy', 'false');
      this.globalLoadingElement.setAttribute('aria-hidden', 'true');
    }
  }

  /**
   * 包装异步函数，自动管理加载状态
   * @param taskId - 任务ID
   * @param asyncFn - 异步函数
   * @param options - 配置选项
   * @returns 异步函数的返回值
   *
   * @example
   * const result = await loadingManager.wrap('fetch-data', async () => {
   *   return await fetchData();
   * }, { message: '正在获取数据...' });
   */
  async wrap<T>(
    taskId: string,
    asyncFn: () => Promise<T>,
    options: LoadingTaskOptions = {}
  ): Promise<T> {
    this.start(taskId, options);
    try {
      const result = await asyncFn();
      return result;
    } finally {
      this.stop(taskId);
    }
  }

  /**
   * 创建带作用域的加载管理器
   * @param scope - 作用域名称
   * @returns 作用域加载管理器
   *
   * @example
   * const scraperLoading = loadingManager.createScope('scraper');
   * scraperLoading.start('fetch'); // 实际任务ID: scraper:fetch
   * scraperLoading.stop('fetch');
   */
  createScope(scope: string): ScopedLoadingManager {
    return {
      start: (taskId: string, options?: LoadingTaskOptions) =>
        this.start(`${scope}:${taskId}`, options),
      stop: (taskId: string) => this.stop(`${scope}:${taskId}`),
      wrap: <T>(taskId: string, asyncFn: () => Promise<T>, options?: LoadingTaskOptions) =>
        this.wrap(`${scope}:${taskId}`, asyncFn, options),
    };
  }
}

// ==================== 全局实例 ====================

/**
 * 全局加载管理器实例
 */
export const loadingManager = new LoadingManager();
// 默认导出
export default loadingManager;

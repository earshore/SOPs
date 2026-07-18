// src/services/RequestManager.ts
// ================================================================
// 🎯 P1-9: HTTP请求优化
// 提供请求去重、取消管理、优先级控制
// ================================================================

/**
 * 请求去重器
 * 防止相同请求重复发送
 */
export class RequestDeduplicator {
  private pending: Map<string, Promise<unknown>> = new Map();

  /**
   * 去重执行请求
   * @param key 请求唯一标识
   * @param fn 请求函数
   * @returns Promise结果
   */
  async deduplicate<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // 如果已有相同请求在进行中,直接返回该Promise
    const pending = this.pending.get(key);
    if (pending) {
      return pending as Promise<T>;
    }

    // 执行新请求
    const promise = fn().finally(() => {
      // 请求完成后清理
      if (this.pending.get(key) === promise) {
        this.pending.delete(key);
      }
    });

    this.pending.set(key, promise);
    return promise;
  }

  /**
   * 取消指定请求
   * @param key 请求唯一标识
   */
  cancel(key: string): void {
    this.pending.delete(key);
  }

  /**
   * 取消所有请求
   */
  cancelAll(): void {
    this.pending.clear();
  }

  /**
   * 获取待处理请求数量
   */
  get pendingCount(): number {
    return this.pending.size;
  }
}

/**
 * 请求取消管理器
 * 管理AbortController,支持请求取消
 */
export class RequestCanceller {
  private controllers: Map<string, AbortController> = new Map();

  /**
   * 创建新的AbortController
   * @param key 请求唯一标识
   * @returns AbortSignal
   */
  create(key: string): AbortSignal {
    // 如果已存在,先取消旧的
    this.cancel(key);

    const controller = new AbortController();
    this.controllers.set(key, controller);
    return controller.signal;
  }

  /**
   * 取消指定请求
   * @param key 请求唯一标识
   */
  cancel(key: string): void {
    const controller = this.controllers.get(key);
    if (controller) {
      controller.abort();
      this.controllers.delete(key);
    }
  }

  /**
   * 取消所有请求
   */
  cancelAll(): void {
    this.controllers.forEach(controller => controller.abort());
    this.controllers.clear();
  }

  /**
   * 清理已完成的请求
   * @param key 请求唯一标识
   * @param signal 当前请求的取消信号
   */
  cleanup(key: string, signal: AbortSignal): void {
    const controller = this.controllers.get(key);
    if (controller?.signal === signal) {
      this.controllers.delete(key);
    }
  }

  /**
   * 获取活跃请求数量
   */
  get activeCount(): number {
    return this.controllers.size;
  }
}

/**
 * 请求管理器
 * 整合去重、取消、优先级控制
 */
export class RequestManager {
  private deduplicator = new RequestDeduplicator();
  private canceller = new RequestCanceller();

  private getAbortReason(signal: AbortSignal): unknown {
    if (signal.reason !== undefined) {
      return signal.reason;
    }

    if (typeof DOMException !== 'undefined') {
      return new DOMException('Aborted', 'AbortError');
    }

    const error = new Error('Aborted');
    error.name = 'AbortError';
    return error;
  }

  private waitForCaller<T>(request: Promise<T>, signal?: AbortSignal | null): Promise<T> {
    if (!signal) {
      return request;
    }

    return new Promise<T>((resolve, reject) => {
      const onAbort = () => {
        signal.removeEventListener('abort', onAbort);
        reject(this.getAbortReason(signal));
      };

      request.then(
        value => {
          signal.removeEventListener('abort', onAbort);
          resolve(value);
        },
        error => {
          signal.removeEventListener('abort', onAbort);
          reject(error);
        }
      );

      if (signal.aborted) {
        onAbort();
        return;
      }

      signal.addEventListener('abort', onAbort, { once: true });
    });
  }

  /**
   * 执行请求(带去重和取消支持)
   * @param key 请求唯一标识
   * @param fn 请求函数
   * @param options 选项
   * @returns Promise结果
   */
  async execute<T>(
    key: string,
    fn: (signal: AbortSignal) => Promise<T>,
    options: {
      deduplicate?: boolean;
      cancelPrevious?: boolean;
      signal?: AbortSignal | null;
    } = {}
  ): Promise<T> {
    const { deduplicate = true, cancelPrevious = false, signal: callerSignal } = options;

    if (cancelPrevious) {
      this.cancel(key);
    }

    // 包装请求函数
    const executeWithController = async () => {
      const signal = this.canceller.create(key);

      try {
        const result = await fn(signal);
        this.canceller.cleanup(key, signal);
        return result;
      } catch (error) {
        this.canceller.cleanup(key, signal);
        throw error;
      }
    };

    // 如果需要去重
    if (deduplicate) {
      const request = this.deduplicator.deduplicate(key, executeWithController);
      return this.waitForCaller(request, callerSignal);
    }

    return this.waitForCaller(executeWithController(), callerSignal);
  }

  /**
   * 取消指定请求
   * @param key 请求唯一标识
   */
  cancel(key: string): void {
    this.deduplicator.cancel(key);
    this.canceller.cancel(key);
  }

  /**
   * 取消所有请求
   */
  cancelAll(): void {
    this.deduplicator.cancelAll();
    this.canceller.cancelAll();
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    pending: number;
    active: number;
  } {
    return {
      pending: this.deduplicator.pendingCount,
      active: this.canceller.activeCount,
    };
  }
}

// 创建全局实例
export const requestManager = new RequestManager();

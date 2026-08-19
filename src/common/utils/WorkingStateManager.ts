// src/common/utils/WorkingStateManager.ts
// ================================================================
// 🎯 P0优化: 工作状态超时自动重试机制
// 自动检测超时并重试，提升系统鲁棒性
// ================================================================

import { SystemError } from '@/common/errors/AppError';

import { APP_EVENTS } from '../constants/eventConstants';
import eventBus from '../EventBus';

/**
 * 工作状态配置
 */
export interface WorkingStateOptions {
  /** 超时时间（毫秒），默认30秒 */
  timeout?: number;
  /** 最大重试次数，默认3次 */
  maxRetries?: number;
  /** 超时后的重试回调 */
  onTimeout: () => Promise<void>;
  /** 成功回调（可选） */
  onSuccess?: () => void;
  /** 最终失败回调（可选） */
  onFinalFailure?: (error: Error) => void;
  /** 重试延迟（毫秒），默认1000ms */
  retryDelay?: number;
}

/**
 * 工作状态信息
 */
interface WorkingState {
  /** 任务ID */
  id: string;
  /** 开始时间 */
  startTime: number;
  /** 超时时间 */
  timeout: number;
  /** 当前重试次数 */
  retryCount: number;
  /** 最大重试次数 */
  maxRetries: number;
  /** 超时回调 */
  onTimeout: () => Promise<void>;
  /** 成功回调 */
  onSuccess?: () => void;
  /** 最终失败回调 */
  onFinalFailure?: (error: Error) => void;
  /** 重试延迟 */
  retryDelay: number;
  /** 定时器ID */
  timerId: number | null;
  /** 任务描述 */
  description?: string;
}

/**
 * 工作状态统计
 */
export interface WorkingStateStats {
  /** 活跃任务数 */
  activeCount: number;
  /** 总任务数 */
  totalCount: number;
  /** 成功任务数 */
  successCount: number;
  /** 失败任务数 */
  failureCount: number;
  /** 超时任务数 */
  timeoutCount: number;
}

/**
 * 工作状态管理器
 *
 * 功能：
 * - 自动检测工作状态超时
 * - 指数退避重试
 * - 最大重试次数控制
 * - 状态追踪和清理
 */
export class WorkingStateManager {
  private states: Map<string, WorkingState> = new Map();
  private stats: WorkingStateStats = {
    activeCount: 0,
    totalCount: 0,
    successCount: 0,
    failureCount: 0,
    timeoutCount: 0,
  };

  /**
   * 设置工作状态
   * @param id - 任务唯一标识
   * @param options - 配置选项
   */
  setWorking(id: string, options: WorkingStateOptions): void {
    const {
      timeout = 30000,
      maxRetries = 3,
      onTimeout,
      onSuccess,
      onFinalFailure,
      retryDelay = 1000,
    } = options;

    // 如果任务已存在，先清除
    if (this.states.has(id)) {
      this.clearWorking(id);
    }

    // 创建新状态
    const state: WorkingState = {
      id,
      startTime: Date.now(),
      timeout,
      retryCount: 0,
      maxRetries,
      onTimeout,
      onSuccess,
      onFinalFailure,
      retryDelay,
      timerId: null,
    };

    this.states.set(id, state);
    this.stats.activeCount++;
    this.stats.totalCount++;

    // 启动超时检查
    this.startTimeoutCheck(id);

    // 触发事件
    eventBus.emit(APP_EVENTS.WORKING_STATE_START, { id, timeout });
  }

  /**
   * 标记任务成功
   * @param id - 任务ID
   */
  setSuccess(id: string): void {
    const state = this.states.get(id);
    if (!state) {
      return;
    }

    const duration = Date.now() - state.startTime;

    // 执行成功回调
    if (state.onSuccess) {
      try {
        state.onSuccess();
      } catch (error) {
        console.error(`成功回调执行失败: ${id}`, error as Error, 'WorkingStateManager');
      }
    }

    // 更新统计
    this.stats.successCount++;
    this.stats.activeCount--;

    // 清除状态
    this.clearWorking(id);

    // 触发事件
    eventBus.emit(APP_EVENTS.WORKING_STATE_SUCCESS, { id, duration });
  }

  /**
   * 标记任务失败
   * @param id - 任务ID
   * @param error - 错误对象
   */
  setFailure(id: string, error: Error): void {
    const state = this.states.get(id);
    if (!state) {
      return;
    }

    const duration = Date.now() - state.startTime;
    console.error(`任务失败: ${id}`, error, 'WorkingStateManager');

    // 执行失败回调
    if (state.onFinalFailure) {
      try {
        state.onFinalFailure(error);
      } catch (callbackError) {
        console.error(`失败回调执行失败: ${id}`, callbackError as Error, 'WorkingStateManager');
      }
    }

    // 更新统计
    this.stats.failureCount++;
    this.stats.activeCount--;

    // 清除状态
    this.clearWorking(id);

    // 触发事件
    eventBus.emit(APP_EVENTS.WORKING_STATE_FAILURE, { id, error, duration });
  }

  /**
   * 清除工作状态
   * @param id - 任务ID
   */
  clearWorking(id: string): void {
    const state = this.states.get(id);
    if (!state) return;

    // 清除定时器
    if (state.timerId !== null) {
      clearTimeout(state.timerId);
    }

    // 删除状态
    this.states.delete(id);
  }

  /**
   * 启动超时检查
   * @param id - 任务ID
   * @private
   */
  private startTimeoutCheck(id: string): void {
    const state = this.states.get(id);
    if (!state) return;

    // 清除旧定时器
    if (state.timerId !== null) {
      clearTimeout(state.timerId);
    }

    // 设置新定时器
    state.timerId = window.setTimeout(() => {
      this.handleTimeout(id);
    }, state.timeout);
  }

  /**
   * 处理超时
   * @param id - 任务ID
   * @private
   */
  private async handleTimeout(id: string): Promise<void> {
    const state = this.states.get(id);
    if (!state) return;

    const elapsed = Date.now() - state.startTime;
    this.stats.timeoutCount++;

    // 触发超时事件
    eventBus.emit(APP_EVENTS.WORKING_STATE_TIMEOUT, {
      id,
      elapsed,
      retryCount: state.retryCount,
    });

    // 检查是否还能重试
    if (state.retryCount < state.maxRetries) {
      state.retryCount++;

      // 计算重试延迟（指数退避）
      const delay = state.retryDelay * Math.pow(2, state.retryCount - 1);

      // 使用setTimeout延迟后重试（可被测试控制）
      state.timerId = window.setTimeout(async () => {
        const currentState = this.states.get(id);
        if (!currentState) return;

        try {
          // 重置开始时间
          currentState.startTime = Date.now();

          // 执行重试
          await currentState.onTimeout();

          // 重新启动超时检查
          this.startTimeoutCheck(id);

          // 触发重试事件
          eventBus.emit(APP_EVENTS.WORKING_STATE_RETRY, {
            id,
            retryCount: currentState.retryCount,
          });
        } catch (error) {
          console.error(`重试失败: ${id}`, error as Error, 'WorkingStateManager');

          // 如果还有重试次数，继续重试
          if (currentState.retryCount < currentState.maxRetries) {
            setTimeout(() => this.handleTimeout(id), 1000);
          } else {
            // 重试耗尽，标记为失败
            const systemError = new SystemError(
              `任务超时，已重试${currentState.maxRetries}次仍失败`,
              'ERR_TASK_RETRY_EXHAUSTED',
              { taskId: id, maxRetries: currentState.maxRetries },
              error as Error
            );
            this.setFailure(id, systemError);
          }
        }
      }, delay);
    } else {
      // 重试耗尽
      const error = new SystemError(
        `任务超时，已达到最大重试次数`,
        'ERR_TASK_TIMEOUT_MAX_RETRIES',
        { taskId: id, maxRetries: state.maxRetries, elapsed }
      );
      this.setFailure(id, error);
    }
  }

  /**
   * 获取工作状态
   * @param id - 任务ID
   * @returns 状态信息或null
   */
  getWorkingState(id: string): {
    isWorking: boolean;
    elapsed: number;
    remaining: number;
    retryCount: number;
    maxRetries: number;
    progress: number;
  } | null {
    const state = this.states.get(id);
    if (!state) return null;

    const elapsed = Date.now() - state.startTime;
    const remaining = Math.max(0, state.timeout - elapsed);
    const progress = Math.min(100, (elapsed / state.timeout) * 100);

    return {
      isWorking: true,
      elapsed,
      remaining,
      retryCount: state.retryCount,
      maxRetries: state.maxRetries,
      progress,
    };
  }

  /**
   * 获取所有活跃任务
   * @returns 任务ID列表
   */
  getActiveTasks(): string[] {
    return Array.from(this.states.keys());
  }

  /**
   * 获取统计信息
   * @returns 统计数据
   */
  getStats(): WorkingStateStats {
    return { ...this.stats };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      activeCount: this.states.size,
      totalCount: 0,
      successCount: 0,
      failureCount: 0,
      timeoutCount: 0,
    };
  }

  /**
   * 清除所有任务
   */
  clearAll(): void {
    this.states.forEach((_, id) => this.clearWorking(id));
  }

  /**
   * 调试信息
   */
  debug(): void {
    console.group('[WorkingStateManager] 调试信息');
    console.table(
      Array.from(this.states.entries()).map(([id, state]) => ({
        任务ID: id,
        已用时: `${Date.now() - state.startTime}ms`,
        超时时间: `${state.timeout}ms`,
        重试次数: `${state.retryCount}/${state.maxRetries}`,
      }))
    );
    console.groupEnd();
  }
}

// 创建全局实例
export const workingStateManager = new WorkingStateManager();

// 默认导出
export default workingStateManager;

// 向后兼容：暴露到 window (开发调试用)
if (
  typeof window !== 'undefined' &&
  (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV
) {
  (window as unknown as Record<string, unknown>).__WorkingStateManager = workingStateManager;
}

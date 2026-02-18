// src/services/PriorityRequestPool.ts
// ================================================================
// 🎯 优先级请求池 (TypeScript版本)
// 确保用户操作优先执行，后台任务不阻塞交互
// ================================================================

/**
 * 请求优先级枚举
 */
export const REQUEST_PRIORITY = {
  CRITICAL: 0, // 关键操作（用户点击、表单提交）
  HIGH: 1, // 高优先级（数据加载、路由切换）
  NORMAL: 2, // 普通优先级（默认）
  LOW: 3, // 低优先级（预加载、缓存更新）
  IDLE: 4, // 空闲时执行（分析、日志上报）
} as const;

export type RequestPriority = typeof REQUEST_PRIORITY[keyof typeof REQUEST_PRIORITY];

/**
 * 任务元数据
 */
export interface TaskMeta {
  name?: string;
  module?: string;
  [key: string]: any;
}

/**
 * 任务对象
 */
interface Task<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: any) => void;
  priority: RequestPriority;
  meta: TaskMeta;
  createdAt: number;
}

/**
 * 优先级统计
 */
interface PriorityStats {
  completed: number;
  failed: number;
  totalDuration: number;
}

/**
 * 统计数据
 */
interface Stats {
  total: number;
  completed: number;
  failed: number;
  byPriority: Record<RequestPriority, PriorityStats>;
}

/**
 * 队列状态
 */
export interface PoolStatus {
  running: number;
  max: number;
  queues: Record<RequestPriority, number>;
  stats: Stats;
}

/**
 * 统计报告
 */
export interface PoolReport {
  summary: {
    total: number;
    completed: number;
    failed: number;
    successRate: number;
  };
  byPriority: Record<
    RequestPriority,
    PriorityStats & {
      avgDuration: number;
      successRate: number;
    }
  >;
}

/**
 * 优先级请求池
 * 按优先级管理并发请求，确保高优先级任务优先执行
 */
export class PriorityRequestPool {
  private max: number;
  private running: number = 0;
  private queues: Record<RequestPriority, Task<any>[]>;
  private stats: Stats;

  constructor(maxConcurrent: number = 6) {
    this.max = maxConcurrent;
    this.queues = {
      [REQUEST_PRIORITY.CRITICAL]: [],
      [REQUEST_PRIORITY.HIGH]: [],
      [REQUEST_PRIORITY.NORMAL]: [],
      [REQUEST_PRIORITY.LOW]: [],
      [REQUEST_PRIORITY.IDLE]: [],
    };
    this.stats = {
      total: 0,
      completed: 0,
      failed: 0,
      byPriority: {} as Record<RequestPriority, PriorityStats>,
    };
  }

  /**
   * 添加请求到队列
   */
  async add<T>(
    fn: () => Promise<T>,
    priority: RequestPriority = REQUEST_PRIORITY.NORMAL,
    meta: TaskMeta = {}
  ): Promise<T> {
    this.stats.total++;

    return new Promise<T>((resolve, reject) => {
      const task: Task<T> = {
        fn,
        resolve,
        reject,
        priority,
        meta,
        createdAt: Date.now(),
      };

      // 加入对应优先级队列
      this.queues[priority].push(task);

      // 尝试执行
      this._tryExecute();
    });
  }

  /**
   * 尝试执行队列中的任务
   */
  private _tryExecute(): void {
    if (this.running >= this.max) {
      return;
    }

    // 按优先级顺序查找任务
    const priorities: RequestPriority[] = [
      REQUEST_PRIORITY.CRITICAL,
      REQUEST_PRIORITY.HIGH,
      REQUEST_PRIORITY.NORMAL,
      REQUEST_PRIORITY.LOW,
      REQUEST_PRIORITY.IDLE,
    ];

    for (const priority of priorities) {
      const queue = this.queues[priority];
      if (queue.length > 0) {
        const task = queue.shift()!;
        this._execute(task);
        return;
      }
    }
  }

  /**
   * 执行单个任务
   */
  private async _execute<T>(task: Task<T>): Promise<void> {
    this.running++;
    const startTime = performance.now();

    try {
      const result = await task.fn();
      const duration = Math.round(performance.now() - startTime);

      // 记录统计
      this.stats.completed++;
      if (!this.stats.byPriority[task.priority]) {
        this.stats.byPriority[task.priority] = { completed: 0, failed: 0, totalDuration: 0 };
      }
      this.stats.byPriority[task.priority].completed++;
      this.stats.byPriority[task.priority].totalDuration += duration;

      // 调试日志
      if (duration > 1000) {
        console.warn(`[RequestPool] 慢请求 (${duration}ms):`, task.meta);
      }

      task.resolve(result);
    } catch (error) {
      this.stats.failed++;
      if (!this.stats.byPriority[task.priority]) {
        this.stats.byPriority[task.priority] = { completed: 0, failed: 0, totalDuration: 0 };
      }
      this.stats.byPriority[task.priority].failed++;

      console.error('[RequestPool] 请求失败:', task.meta, error);
      task.reject(error);
    } finally {
      this.running--;
      this._tryExecute();
    }
  }

  /**
   * 获取当前状态
   */
  getStatus(): PoolStatus {
    const queueLengths: Record<RequestPriority, number> = {} as Record<RequestPriority, number>;
    (Object.entries(this.queues) as [string, Task<any>[]][]).forEach(([priority, queue]) => {
      queueLengths[parseInt(priority) as RequestPriority] = queue.length;
    });

    return {
      running: this.running,
      max: this.max,
      queues: queueLengths,
      stats: this.stats,
    };
  }

  /**
   * 获取统计报告
   */
  getReport(): PoolReport {
    const report: PoolReport = {
      summary: {
        total: this.stats.total,
        completed: this.stats.completed,
        failed: this.stats.failed,
        successRate:
          this.stats.total > 0 ? Math.round((this.stats.completed / this.stats.total) * 100) : 0,
      },
      byPriority: {} as any,
    };

    (Object.entries(this.stats.byPriority) as [string, PriorityStats][]).forEach(
      ([priority, stats]) => {
        const total = stats.completed + stats.failed;
        const priorityNum = parseInt(priority) as RequestPriority;
        report.byPriority[priorityNum] = {
          ...stats,
          avgDuration: stats.completed > 0 ? Math.round(stats.totalDuration / stats.completed) : 0,
          successRate: total > 0 ? Math.round((stats.completed / total) * 100) : 0,
        };
      }
    );

    return report;
  }

  /**
   * 清空所有队列（用于测试）
   */
  clear(): void {
    Object.values(this.queues).forEach((queue) => {
      queue.forEach((task) => {
        task.reject(new Error('Request pool cleared'));
      });
      queue.length = 0;
    });
    console.log('[RequestPool] 已清空所有队列');
  }

  /**
   * 重置统计数据
   */
  resetStats(): void {
    this.stats = {
      total: 0,
      completed: 0,
      failed: 0,
      byPriority: {} as Record<RequestPriority, PriorityStats>,
    };
    console.log('[RequestPool] 统计数据已重置');
  }
}

/**
 * 全局实例
 */
export const priorityRequestPool = new PriorityRequestPool(6);

// 默认导出
export default priorityRequestPool;

// ================================================================
// 🔄 向后兼容：暴露到 window
// ================================================================
if (typeof window !== 'undefined') {
  (window as any).PriorityRequestPool = PriorityRequestPool;
  (window as any).REQUEST_PRIORITY = REQUEST_PRIORITY;
  (window as any).priorityRequestPool = priorityRequestPool;
}

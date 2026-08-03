/**
 * PriorityRequestPool 单元测试
 * 覆盖优先级调度、并发限制、统计与清空逻辑
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { PriorityRequestPool, REQUEST_PRIORITY } from '@/services/PriorityRequestPool';

describe('PriorityRequestPool', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('默认并发数为 6', () => {
    expect(new PriorityRequestPool().getStatus().max).toBe(6);
  });

  it('支持自定义并发数', () => {
    expect(new PriorityRequestPool(3).getStatus().max).toBe(3);
  });

  it('按优先级顺序执行排队任务', async () => {
    const pool = new PriorityRequestPool(1);
    const order: string[] = [];
    let release: () => void = () => {};
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });

    const first = pool.add(async () => {
      await gate;
    }, REQUEST_PRIORITY.NORMAL);
    const low = pool.add(async () => {
      order.push('low');
    }, REQUEST_PRIORITY.LOW);
    const high = pool.add(async () => {
      order.push('high');
    }, REQUEST_PRIORITY.HIGH);
    const critical = pool.add(async () => {
      order.push('critical');
    }, REQUEST_PRIORITY.CRITICAL);

    release();
    await Promise.all([first, low, high, critical]);
    expect(order).toEqual(['critical', 'high', 'low']);
  });

  it('限制并发数，任务完成后继续执行队列', async () => {
    const pool = new PriorityRequestPool(2);
    let running = 0;
    let maxRunning = 0;

    const tasks = Array.from({ length: 5 }, () =>
      pool.add(async () => {
        running++;
        maxRunning = Math.max(maxRunning, running);
        await new Promise(resolve => setTimeout(resolve, 5));
        running--;
      })
    );

    await Promise.all(tasks);
    expect(maxRunning).toBe(2);
  });

  it('成功任务返回结果并更新统计', async () => {
    const pool = new PriorityRequestPool(2);
    const result = await pool.add(async () => 42);

    expect(result).toBe(42);
    const report = pool.getReport();
    expect(report.summary.total).toBe(1);
    expect(report.summary.completed).toBe(1);
    expect(report.summary.failed).toBe(0);
    expect(report.summary.successRate).toBe(100);
    expect(report.byPriority[REQUEST_PRIORITY.NORMAL].completed).toBe(1);
    expect(report.byPriority[REQUEST_PRIORITY.NORMAL].successRate).toBe(100);
  });

  it('失败任务 reject 并计入 failed 统计', async () => {
    const pool = new PriorityRequestPool(2);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      pool.add(async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');

    const report = pool.getReport();
    expect(report.summary.failed).toBe(1);
    expect(report.summary.successRate).toBe(0);
    expect(report.byPriority[REQUEST_PRIORITY.NORMAL].failed).toBe(1);
    expect(report.byPriority[REQUEST_PRIORITY.NORMAL].successRate).toBe(0);
  });

  it('慢请求（>1000ms）输出警告日志', async () => {
    const pool = new PriorityRequestPool(1);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const perfSpy = vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValueOnce(1500);

    await pool.add(async () => {}, REQUEST_PRIORITY.NORMAL, { name: 'slow-task' });
    expect(warnSpy).toHaveBeenCalled();
    perfSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('getStatus 返回运行数与队列长度', async () => {
    const pool = new PriorityRequestPool(1);
    const task = pool.add(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    const status = pool.getStatus();
    expect(status.running).toBe(1);
    expect(status.queues[REQUEST_PRIORITY.NORMAL]).toBe(0);
    expect(status.queues[REQUEST_PRIORITY.LOW]).toBe(0);

    const queued = pool.add(async () => {}, REQUEST_PRIORITY.LOW);
    const queuedStatus = pool.getStatus();
    expect(queuedStatus.queues[REQUEST_PRIORITY.LOW]).toBe(1);

    await Promise.all([task, queued]);
  });

  it('clear 拒绝队列中的所有等待任务', async () => {
    const pool = new PriorityRequestPool(1);
    const busy = pool.add(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    const queued = pool.add(async () => 1, REQUEST_PRIORITY.LOW);

    const rejection = expect(queued).rejects.toThrow('Request pool cleared');
    pool.clear();
    await Promise.all([busy, rejection]);
  });

  it('resetStats 重置统计数据', async () => {
    const pool = new PriorityRequestPool(2);
    await pool.add(async () => {});

    pool.resetStats();
    const report = pool.getReport();
    expect(report.summary.total).toBe(0);
    expect(report.summary.completed).toBe(0);
  });

  it('getReport 汇总多优先级统计', async () => {
    const pool = new PriorityRequestPool(2);
    await pool.add(async () => {}, REQUEST_PRIORITY.CRITICAL);
    await pool.add(async () => {}, REQUEST_PRIORITY.HIGH);

    const report = pool.getReport();
    expect(report.summary.total).toBe(2);
    expect(report.summary.successRate).toBe(100);
    expect(report.byPriority[REQUEST_PRIORITY.CRITICAL].avgDuration).toBeGreaterThanOrEqual(0);
    expect(report.byPriority[REQUEST_PRIORITY.HIGH].successRate).toBe(100);
    expect(report.byPriority[REQUEST_PRIORITY.LOW]).toBeUndefined();
  });
});

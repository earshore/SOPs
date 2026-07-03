// tests/unit/WorkingStateManager.test.ts
// ================================================================
// WorkingStateManager 单元测试
// ================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorkingStateManager } from '@/common/utils/WorkingStateManager';
import eventBus from '@/common/EventBus';
import { APP_EVENTS } from '@/common/constants/eventConstants';

  let manager: WorkingStateManager;

  beforeEach(() => {
    manager = new WorkingStateManager();
    vi.useFakeTimers();
  });

  afterEach(() => {
    manager.clearAll();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('基础功能', () => {
    it('应该成功设置工作状态', () => {
      const onTimeout = vi.fn().mockResolvedValue(undefined);

      manager.setWorking('task-1', {
        timeout: 5000,
        maxRetries: 3,
        onTimeout
      });

      const state = manager.getWorkingState('task-1');
      expect(state).not.toBeNull();
      expect(state?.isWorking).toBe(true);
      expect(state?.retryCount).toBe(0);
      expect(state?.maxRetries).toBe(3);
    });

    it('应该返回正确的状态信息', () => {
      const onTimeout = vi.fn().mockResolvedValue(undefined);

      manager.setWorking('task-1', {
        timeout: 10000,
        maxRetries: 2,
        onTimeout
      });

      // 前进5秒
      vi.advanceTimersByTime(5000);

      const state = manager.getWorkingState('task-1');
      expect(state).not.toBeNull();
      expect(state?.elapsed).toBeGreaterThanOrEqual(5000);
      expect(state?.remaining).toBeLessThanOrEqual(5000);
      expect(state?.progress).toBeGreaterThanOrEqual(50);
    });

    it('应该成功标记任务成功', () => {
      const onTimeout = vi.fn().mockResolvedValue(undefined);
      const onSuccess = vi.fn();

      manager.setWorking('task-1', {
        timeout: 5000,
        maxRetries: 3,
        onTimeout,
        onSuccess
      });

      manager.setSuccess('task-1');

      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(manager.getWorkingState('task-1')).toBeNull();
    });

    it('应该成功标记任务失败', () => {
      const onTimeout = vi.fn().mockResolvedValue(undefined);
      const onFinalFailure = vi.fn();
      const error = new Error('测试错误');

      manager.setWorking('task-1', {
        timeout: 5000,
        maxRetries: 3,
        onTimeout,
        onFinalFailure
      });

      manager.setFailure('task-1', error);

      expect(onFinalFailure).toHaveBeenCalledWith(error);
      expect(manager.getWorkingState('task-1')).toBeNull();
    });

    it('应该成功清除工作状态', () => {
      const onTimeout = vi.fn().mockResolvedValue(undefined);

      manager.setWorking('task-1', {
        timeout: 5000,
        maxRetries: 3,
        onTimeout
      });

      expect(manager.getWorkingState('task-1')).not.toBeNull();

      manager.clearWorking('task-1');

      expect(manager.getWorkingState('task-1')).toBeNull();
    });
  });

    it('应该在超时后触发重试', async () => {
      const onTimeout = vi.fn().mockResolvedValue(undefined);

      manager.setWorking('task-1', {
        timeout: 5000,
        maxRetries: 3,
        onTimeout
      });

      // 前进到超时
      await vi.advanceTimersByTimeAsync(5000);
      
      // 等待重试延迟 (1000ms * 2^0 = 1000ms)
      await vi.advanceTimersByTimeAsync(1000);

      expect(onTimeout).toHaveBeenCalledTimes(1);

      const state = manager.getWorkingState('task-1');
      expect(state?.retryCount).toBe(1);
    });

    it('应该使用指数退避策略', async () => {
      const onTimeout = vi.fn().mockResolvedValue(undefined);

      manager.setWorking('task-1', {
        timeout: 1000,
        maxRetries: 3,
        onTimeout,
        retryDelay: 1000
      });

      // 第一次超时
      await vi.advanceTimersByTimeAsync(1000);
      // 等待第一次重试延迟 (1000ms * 2^0 = 1000ms)
      await vi.advanceTimersByTimeAsync(1000);
      expect(onTimeout).toHaveBeenCalledTimes(1);

      // 第二次超时
      await vi.advanceTimersByTimeAsync(1000);
      // 等待第二次重试延迟 (1000ms * 2^1 = 2000ms)
      await vi.advanceTimersByTimeAsync(2000);
      expect(onTimeout).toHaveBeenCalledTimes(2);

      // 第三次超时
      await vi.advanceTimersByTimeAsync(1000);
      // 等待第三次重试延迟 (1000ms * 2^2 = 4000ms)
      await vi.advanceTimersByTimeAsync(4000);
      expect(onTimeout).toHaveBeenCalledTimes(3);
    });

    it('应该在达到最大重试次数后停止', async () => {
      const onTimeout = vi.fn().mockResolvedValue(undefined);
      const onFinalFailure = vi.fn();

      manager.setWorking('task-1', {
        timeout: 1000,
        maxRetries: 2,
        onTimeout,
        onFinalFailure,
        retryDelay: 100
      });

      // 第一次超时
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(100);

      // 第二次超时
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(200);

      // 第三次超时（达到最大重试次数）
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(400);

      expect(onTimeout).toHaveBeenCalledTimes(2);
      expect(onFinalFailure).toHaveBeenCalledTimes(1);
      expect(manager.getWorkingState('task-1')).toBeNull();
    });

    it('应该在重试失败后继续重试', async () => {
      let callCount = 0;
      const onTimeout = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount < 2) {
          throw new Error('重试失败');
        }
      });

      manager.setWorking('task-1', {
        timeout: 1000,
        maxRetries: 3,
        onTimeout,
        retryDelay: 100
      });

      // 第一次超时
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(100);

      // 重试失败，等待1秒后再次重试
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(200);

      expect(onTimeout).toHaveBeenCalledTimes(2);
    });

    it('应该触发开始事件', () => {
      const listener = vi.fn();
      eventBus.on(APP_EVENTS.WORKING_STATE_START, listener);

      const onTimeout = vi.fn().mockResolvedValue(undefined);
      manager.setWorking('task-1', {
        timeout: 5000,
        maxRetries: 3,
        onTimeout
      });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'task-1',
          timeout: 5000
        })
      );

      eventBus.off(APP_EVENTS.WORKING_STATE_START, listener);
    });

    it('应该触发成功事件', () => {
      const listener = vi.fn();
      eventBus.on(APP_EVENTS.WORKING_STATE_SUCCESS, listener);

      const onTimeout = vi.fn().mockResolvedValue(undefined);
      manager.setWorking('task-1', {
        timeout: 5000,
        maxRetries: 3,
        onTimeout
      });

      manager.setSuccess('task-1');

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'task-1'
        })
      );

      eventBus.off(APP_EVENTS.WORKING_STATE_SUCCESS, listener);
    });

    it('应该触发失败事件', () => {
      const listener = vi.fn();
      eventBus.on(APP_EVENTS.WORKING_STATE_FAILURE, listener);

      const onTimeout = vi.fn().mockResolvedValue(undefined);
      manager.setWorking('task-1', {
        timeout: 5000,
        maxRetries: 3,
        onTimeout
      });

      const error = new Error('测试错误');
      manager.setFailure('task-1', error);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'task-1',
          error
        })
      );

      eventBus.off(APP_EVENTS.WORKING_STATE_FAILURE, listener);
    });

    it('应该触发超时事件', async () => {
      const listener = vi.fn();
      eventBus.on(APP_EVENTS.WORKING_STATE_TIMEOUT, listener);

      const onTimeout = vi.fn().mockResolvedValue(undefined);
      manager.setWorking('task-1', {
        timeout: 1000,
        maxRetries: 3,
        onTimeout
      });

      await vi.advanceTimersByTimeAsync(1000);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'task-1',
          retryCount: 0
        })
      );

      eventBus.off(APP_EVENTS.WORKING_STATE_TIMEOUT, listener);
    });

    it('应该触发重试事件', async () => {
      const listener = vi.fn();
      eventBus.on(APP_EVENTS.WORKING_STATE_RETRY, listener);

      const onTimeout = vi.fn().mockResolvedValue(undefined);
      manager.setWorking('task-1', {
        timeout: 1000,
        maxRetries: 3,
        onTimeout,
        retryDelay: 100
      });

      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(100);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'task-1',
          retryCount: 1
        })
      );

      eventBus.off(APP_EVENTS.WORKING_STATE_RETRY, listener);
    });

  describe('统计信息', () => {
    it('应该正确统计活跃任务数', () => {
      const onTimeout = vi.fn().mockResolvedValue(undefined);

      manager.setWorking('task-1', { timeout: 5000, maxRetries: 3, onTimeout });
      manager.setWorking('task-2', { timeout: 5000, maxRetries: 3, onTimeout });

      const stats = manager.getStats();
      expect(stats.activeCount).toBe(2);
      expect(stats.totalCount).toBe(2);
    });

    it('应该正确统计成功任务数', () => {
      const onTimeout = vi.fn().mockResolvedValue(undefined);

      manager.setWorking('task-1', { timeout: 5000, maxRetries: 3, onTimeout });
      manager.setSuccess('task-1');

      const stats = manager.getStats();
      expect(stats.successCount).toBe(1);
      expect(stats.activeCount).toBe(0);
    });

    it('应该正确统计失败任务数', () => {
      const onTimeout = vi.fn().mockResolvedValue(undefined);

      manager.setWorking('task-1', { timeout: 5000, maxRetries: 3, onTimeout });
      manager.setFailure('task-1', new Error('测试'));

      const stats = manager.getStats();
      expect(stats.failureCount).toBe(1);
      expect(stats.activeCount).toBe(0);
    });

    it('应该正确统计超时次数', async () => {
      const onTimeout = vi.fn().mockResolvedValue(undefined);

      manager.setWorking('task-1', { timeout: 1000, maxRetries: 3, onTimeout });

      await vi.advanceTimersByTimeAsync(1000);

      const stats = manager.getStats();
      expect(stats.timeoutCount).toBe(1);
    });

    it('应该支持重置统计信息', () => {
      const onTimeout = vi.fn().mockResolvedValue(undefined);

      manager.setWorking('task-1', { timeout: 5000, maxRetries: 3, onTimeout });
      manager.setSuccess('task-1');

      manager.resetStats();

      const stats = manager.getStats();
      expect(stats.successCount).toBe(0);
      expect(stats.failureCount).toBe(0);
      expect(stats.timeoutCount).toBe(0);
    });
  });

  describe('多任务管理', () => {
    it('应该支持多个并发任务', () => {
      const onTimeout = vi.fn().mockResolvedValue(undefined);

      manager.setWorking('task-1', { timeout: 5000, maxRetries: 3, onTimeout });
      manager.setWorking('task-2', { timeout: 5000, maxRetries: 3, onTimeout });
      manager.setWorking('task-3', { timeout: 5000, maxRetries: 3, onTimeout });

      const activeTasks = manager.getActiveTasks();
      expect(activeTasks).toHaveLength(3);
      expect(activeTasks).toContain('task-1');
      expect(activeTasks).toContain('task-2');
      expect(activeTasks).toContain('task-3');
    });

    it('应该支持清除所有任务', () => {
      const onTimeout = vi.fn().mockResolvedValue(undefined);

      manager.setWorking('task-1', { timeout: 5000, maxRetries: 3, onTimeout });
      manager.setWorking('task-2', { timeout: 5000, maxRetries: 3, onTimeout });

      manager.clearAll();

      expect(manager.getActiveTasks()).toHaveLength(0);
    });

    it('应该支持覆盖已存在的任务', () => {
      const onTimeout1 = vi.fn().mockResolvedValue(undefined);
      const onTimeout2 = vi.fn().mockResolvedValue(undefined);

      manager.setWorking('task-1', { timeout: 5000, maxRetries: 3, onTimeout: onTimeout1 });
      manager.setWorking('task-1', { timeout: 10000, maxRetries: 5, onTimeout: onTimeout2 });

      const state = manager.getWorkingState('task-1');
      expect(state?.maxRetries).toBe(5);
    });
  });

  describe('边界情况', () => {
    it('应该处理不存在的任务', () => {
      expect(manager.getWorkingState('non-existent')).toBeNull();
      
      // 不应该抛出错误
      expect(() => manager.setSuccess('non-existent')).not.toThrow();
      expect(() => manager.setFailure('non-existent', new Error())).not.toThrow();
      expect(() => manager.clearWorking('non-existent')).not.toThrow();
    });

    it('应该处理回调函数抛出的错误', () => {
      const onSuccess = vi.fn().mockImplementation(() => {
        throw new Error('回调错误');
      });

      manager.setWorking('task-1', {
        timeout: 5000,
        maxRetries: 3,
        onTimeout: vi.fn().mockResolvedValue(undefined),
        onSuccess
      });

      // 不应该抛出错误
      expect(() => manager.setSuccess('task-1')).not.toThrow();
    });

    it('应该处理零重试次数', async () => {
      const onTimeout = vi.fn().mockResolvedValue(undefined);
      const onFinalFailure = vi.fn();

      manager.setWorking('task-1', {
        timeout: 1000,
        maxRetries: 0,
        onTimeout,
        onFinalFailure
      });

      await vi.advanceTimersByTimeAsync(1000);

      expect(onTimeout).not.toHaveBeenCalled();
      expect(onFinalFailure).toHaveBeenCalledTimes(1);
    });
  });

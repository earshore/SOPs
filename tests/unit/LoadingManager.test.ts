// tests/unit/LoadingManager.test.ts
// ================================================================
// LoadingManager 单元测试
// ================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LoadingManager } from '@/common/utils/LoadingManager';

  let manager: LoadingManager;

  beforeEach(() => {
    manager = new LoadingManager();
  });

  // ================================================================
  // 基础功能
  // ================================================================

  describe('基础功能', () => {
    it('应该开始加载任务', () => {
      manager.start('task1', { message: '加载中...' });

      expect(manager.isLoading).toBe(true);
      expect(manager.taskCount).toBe(1);
      expect(manager.currentMessage).toBe('加载中...');
    });

    it('应该停止加载任务', () => {
      manager.start('task1');
      manager.stop('task1');

      expect(manager.isLoading).toBe(false);
      expect(manager.taskCount).toBe(0);
    });

    it('应该使用默认消息', () => {
      manager.start('task1');

      expect(manager.currentMessage).toBe('加载中...');
    });

    it('应该记录任务开始时间', () => {
      const before = Date.now();
      manager.start('task1');
      const after = Date.now();

      const tasks = manager.getAllTasks();
      expect(tasks[0].startTime).toBeGreaterThanOrEqual(before);
      expect(tasks[0].startTime).toBeLessThanOrEqual(after);
    });
  });

  // ================================================================
  // 多任务管理
  // ================================================================

  describe('多任务管理', () => {
    it('应该支持多个并发任务', () => {
      manager.start('task1', { message: '任务1' });
      manager.start('task2', { message: '任务2' });
      manager.start('task3', { message: '任务3' });

      expect(manager.taskCount).toBe(3);
      expect(manager.isLoading).toBe(true);
    });

    it('应该按优先级显示消息', () => {
      manager.start('task1', { message: '低优先级', priority: 1 });
      manager.start('task2', { message: '高优先级', priority: 10 });
      manager.start('task3', { message: '中优先级', priority: 5 });

      expect(manager.currentMessage).toBe('高优先级');
    });

    it('应该在停止任务后更新消息', () => {
      manager.start('task1', { message: '任务1', priority: 10 });
      manager.start('task2', { message: '任务2', priority: 5 });

      expect(manager.currentMessage).toBe('任务1');

      manager.stop('task1');

      expect(manager.currentMessage).toBe('任务2');
    });

    it('应该获取所有任务列表', () => {
      manager.start('task1', { message: '任务1' });
      manager.start('task2', { message: '任务2' });

      const tasks = manager.getAllTasks();

      expect(tasks).toHaveLength(2);
      expect(tasks[0].id).toBe('task1');
      expect(tasks[1].id).toBe('task2');
    });

    it('应该清空所有任务', () => {
      manager.start('task1');
      manager.start('task2');
      manager.start('task3');

      const clearedCount = manager.clearAll();

      expect(clearedCount).toBe(3);
      expect(manager.taskCount).toBe(0);
      expect(manager.isLoading).toBe(false);
    });
  });

  // ================================================================
  // 优先级处理
  // ================================================================

  describe('优先级处理', () => {
    it('应该使用默认优先级0', () => {
      manager.start('task1', { message: '任务1' });

      const tasks = manager.getAllTasks();
      expect(tasks[0].priority).toBe(0);
    });

    it('应该支持负优先级', () => {
      manager.start('task1', { message: '任务1', priority: -1 });
      manager.start('task2', { message: '任务2', priority: 0 });

      expect(manager.currentMessage).toBe('任务2');
    });

    it('应该在优先级相同时保持顺序', () => {
      manager.start('task1', { message: '任务1', priority: 5 });
      manager.start('task2', { message: '任务2', priority: 5 });

      // 优先级相同时,应该显示第一个添加的
      expect(manager.currentMessage).toBe('任务1');
    });
  });

  // ================================================================
  // 异步包装
  // ================================================================

  describe('异步包装', () => {
    it('应该包装异步函数并自动管理加载状态', async () => {
      const asyncFn = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'result';
      });

      expect(manager.isLoading).toBe(false);

      const promise = manager.wrap('task1', asyncFn, { message: '处理中...' });

      expect(manager.isLoading).toBe(true);
      expect(manager.currentMessage).toBe('处理中...');

      const result = await promise;

      expect(result).toBe('result');
      expect(manager.isLoading).toBe(false);
      expect(asyncFn).toHaveBeenCalled();
    });

    it('应该在异步函数抛出错误时停止加载', async () => {
      const asyncFn = async () => {
        throw new Error('Test error');
      };

      await expect(
        manager.wrap('task1', asyncFn)
      ).rejects.toThrow('Test error');

      expect(manager.isLoading).toBe(false);
    });

    it('应该返回异步函数的结果', async () => {
      const result = await manager.wrap('task1', async () => {
        return { data: 'test' };
      });

      expect(result).toEqual({ data: 'test' });
    });
  });

  // ================================================================
  // 作用域管理
  // ================================================================

  describe('作用域管理', () => {
    it('应该创建带作用域的管理器', () => {
      const scopedManager = manager.createScope('scraper');

      scopedManager.start('fetch', { message: '获取数据' });

      expect(manager.taskCount).toBe(1);
      expect(manager.getAllTasks()[0].id).toBe('scraper:fetch');
    });

    it('作用域管理器应该支持stop', () => {
      const scopedManager = manager.createScope('scraper');

      scopedManager.start('fetch');
      scopedManager.stop('fetch');

      expect(manager.taskCount).toBe(0);
    });

    it('作用域管理器应该支持wrap', async () => {
      const scopedManager = manager.createScope('scraper');

      const result = await scopedManager.wrap('fetch', async () => {
        return 'data';
      });

      expect(result).toBe('data');
      expect(manager.isLoading).toBe(false);
    });

    it('应该支持多个作用域', () => {
      const scraper = manager.createScope('scraper');
      const analysis = manager.createScope('analysis');

      scraper.start('fetch', { message: '采集中' });
      analysis.start('process', { message: '分析中' });

      expect(manager.taskCount).toBe(2);
    });
  });

  // ================================================================
  // UI更新
  // ================================================================

  describe('UI更新', () => {
    it('应该设置全局Loading元素', () => {
      const element = document.createElement('div');
      manager.setGlobalLoadingElement(element);

      // 不应该抛出错误
      expect(() => {
        manager.start('task1');
      }).not.toThrow();
    });

    it('应该在开始任务时显示Loading', () => {
      const element = document.createElement('div');
      element.classList.add('hidden');
      manager.setGlobalLoadingElement(element);

      manager.start('task1');

      expect(element.classList.contains('hidden')).toBe(false);
      expect(element.classList.contains('flex')).toBe(true);
    });

    it('应该在停止任务时隐藏Loading', () => {
      const element = document.createElement('div');
      manager.setGlobalLoadingElement(element);

      manager.start('task1');
      manager.stop('task1');

      expect(element.classList.contains('hidden')).toBe(true);
      expect(element.classList.contains('flex')).toBe(false);
    });

    it('应该更新Loading消息', () => {
      const element = document.createElement('div');
      const messageEl = document.createElement('span');
      messageEl.setAttribute('data-loading-message', '');
      element.appendChild(messageEl);
      manager.setGlobalLoadingElement(element);

      manager.start('task1', { message: '自定义消息' });

      expect(messageEl.textContent).toBe('自定义消息');
    });

    it('应该在没有Loading元素时正常工作', () => {
      expect(() => {
        manager.start('task1');
        manager.stop('task1');
      }).not.toThrow();
    });
  });

  // ================================================================
  // 错误处理
  // ================================================================

  describe('错误处理', () => {
    it('应该处理停止不存在的任务', () => {
      const stopped = manager.stop('non-existent');

      expect(stopped).toBe(false);
      expect(manager.taskCount).toBe(0);
    });

    it('应该处理重复开始同一任务', () => {
      manager.start('task1', { message: '消息1' });
      manager.start('task1', { message: '消息2' });

      // 应该覆盖之前的任务
      expect(manager.taskCount).toBe(1);
      expect(manager.currentMessage).toBe('消息2');
    });

    it('应该处理空任务ID', () => {
      expect(() => {
        manager.start('', { message: '空ID' });
      }).not.toThrow();
    });
  });

  // ================================================================
  // 边界条件
  // ================================================================

  describe('边界条件', () => {
    it('应该处理空消息', () => {
      manager.start('task1', { message: '' });

      expect(manager.currentMessage).toBe('');
    });

    it('应该处理极大的优先级', () => {
      manager.start('task1', { message: '任务1', priority: Number.MAX_SAFE_INTEGER });
      manager.start('task2', { message: '任务2', priority: 0 });

      expect(manager.currentMessage).toBe('任务1');
    });

    it('应该处理极小的优先级', () => {
      manager.start('task1', { message: '任务1', priority: Number.MIN_SAFE_INTEGER });
      manager.start('task2', { message: '任务2', priority: 0 });

      expect(manager.currentMessage).toBe('任务2');
    });

    it('应该在没有任务时返回空消息', () => {
      expect(manager.currentMessage).toBe('');
    });

    it('应该处理特殊字符的任务ID', () => {
      const specialId = 'task:with:colons';

      expect(() => {
        manager.start(specialId);
        manager.stop(specialId);
      }).not.toThrow();
    });

    it('应该处理长时间运行的任务', async () => {
      manager.start('long-task');

      await new Promise(resolve => setTimeout(resolve, 100));

      const tasks = manager.getAllTasks();
      expect(tasks[0].startTime).toBeLessThan(Date.now());
    });
  });

  // ================================================================
  // 性能测试
  // ================================================================

  describe('性能测试', () => {
    it('应该高效处理大量任务', () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        manager.start(`task${i}`, { message: `任务${i}` });
      }

      const elapsed = Date.now() - startTime;

      expect(manager.taskCount).toBe(1000);
      expect(elapsed).toBeLessThan(250);
    });

    it('应该高效清空大量任务', () => {
      for (let i = 0; i < 1000; i++) {
        manager.start(`task${i}`);
      }

      const startTime = Date.now();
      const clearedCount = manager.clearAll();
      const elapsed = Date.now() - startTime;

      expect(clearedCount).toBe(1000);
      expect(manager.taskCount).toBe(0);
      expect(elapsed).toBeLessThan(50);
    });
  });

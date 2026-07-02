// tests/unit/RouteMiddleware.test.ts
// ================================================================
// RouteMiddleware 单元测试
// ================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RouteMiddlewareManager } from '@/common/router/RouteMiddleware';
import type { Route, RouteMiddlewareFunction } from '@/types/config';

  let manager: RouteMiddlewareManager;
  let mockToRoute: Route;
  let mockFromRoute: Route;

  beforeEach(() => {
    manager = new RouteMiddlewareManager();
    
    mockToRoute = {
      path: 'target_route',
      config: {
        moduleId: 'test',
        label: 'Test Route',
        icon: 'test-icon',
        panelId: 'panel-test',
        viewPath: '/test.html'
      },
      state: {}
    };

    mockFromRoute = {
      path: 'source_route',
      config: {
        moduleId: 'source',
        label: 'Source Route',
        icon: 'source-icon',
        panelId: 'panel-source',
        viewPath: '/source.html'
      },
      state: {}
    };
  });

  // ================================================================
  // 前置中间件
  // ================================================================

  describe('前置中间件', () => {
    it('应该添加前置中间件', () => {
      const middleware = vi.fn();
      
      manager.addBeforeEach(middleware);
      
      const count = manager.getMiddlewareCount();
      expect(count.beforeEach).toBe(1);
    });

    it('应该执行前置中间件', async () => {
      const middleware = vi.fn();
      
      manager.addBeforeEach(middleware);
      await manager.runBeforeEach(mockToRoute, mockFromRoute);
      
      expect(middleware).toHaveBeenCalledWith(mockToRoute, mockFromRoute);
    });

    it('应该按顺序执行多个前置中间件', async () => {
      const order: number[] = [];
      
      manager.addBeforeEach(async () => { order.push(1); });
      manager.addBeforeEach(async () => { order.push(2); });
      manager.addBeforeEach(async () => { order.push(3); });
      
      await manager.runBeforeEach(mockToRoute, mockFromRoute);
      
      expect(order).toEqual([1, 2, 3]);
    });

    it('应该支持异步前置中间件', async () => {
      const middleware = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });
      
      manager.addBeforeEach(middleware);
      await manager.runBeforeEach(mockToRoute, mockFromRoute);
      
      expect(middleware).toHaveBeenCalled();
    });

    it('应该在中间件错误时返回false', async () => {
      manager.addBeforeEach(async () => {
        throw new Error('Middleware error');
      });
      
      const result = await manager.runBeforeEach(mockToRoute, mockFromRoute);
      
      expect(result).toBe(false);
    });

    it('应该在中间件成功时返回true', async () => {
      manager.addBeforeEach(async () => {
        // 正常执行
      });
      
      const result = await manager.runBeforeEach(mockToRoute, mockFromRoute);
      
      expect(result).toBe(true);
    });

    it('应该移除指定的前置中间件', () => {
      const middleware1 = vi.fn();
      const middleware2 = vi.fn();
      
      manager.addBeforeEach(middleware1);
      manager.addBeforeEach(middleware2);
      
      expect(manager.getMiddlewareCount().beforeEach).toBe(2);
      
      manager.removeBeforeEach(middleware1);
      
      expect(manager.getMiddlewareCount().beforeEach).toBe(1);
    });

    it('应该通过返回的取消函数移除中间件', () => {
      const middleware = vi.fn();
      
      const cancel = manager.addBeforeEach(middleware);
      expect(manager.getMiddlewareCount().beforeEach).toBe(1);
      
      cancel();
      expect(manager.getMiddlewareCount().beforeEach).toBe(0);
    });
  });

  // ================================================================
  // 后置中间件
  // ================================================================

  describe('后置中间件', () => {
    it('应该添加后置中间件', () => {
      const middleware = vi.fn();
      
      manager.addAfterEach(middleware);
      
      const count = manager.getMiddlewareCount();
      expect(count.afterEach).toBe(1);
    });

    it('应该执行后置中间件', async () => {
      const middleware = vi.fn();
      
      manager.addAfterEach(middleware);
      await manager.runAfterEach(mockToRoute, mockFromRoute);
      
      expect(middleware).toHaveBeenCalledWith(mockToRoute, mockFromRoute);
    });

    it('应该按顺序执行多个后置中间件', async () => {
      const order: number[] = [];
      
      manager.addAfterEach(async () => { order.push(1); });
      manager.addAfterEach(async () => { order.push(2); });
      manager.addAfterEach(async () => { order.push(3); });
      
      await manager.runAfterEach(mockToRoute, mockFromRoute);
      
      expect(order).toEqual([1, 2, 3]);
    });

    it('应该支持异步后置中间件', async () => {
      const middleware = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });
      
      manager.addAfterEach(middleware);
      await manager.runAfterEach(mockToRoute, mockFromRoute);
      
      expect(middleware).toHaveBeenCalled();
    });

    it('应该捕获后置中间件错误但不中断执行', async () => {
      const middleware1 = vi.fn(async () => {
        throw new Error('Error in middleware 1');
      });
      const middleware2 = vi.fn();
      
      manager.addAfterEach(middleware1);
      manager.addAfterEach(middleware2);
      
      await manager.runAfterEach(mockToRoute, mockFromRoute);
      
      // 即使middleware1抛出错误,middleware2仍应执行
      expect(middleware2).toHaveBeenCalled();
    });
  });

  // ================================================================
  // 中间件管理
  // ================================================================

  describe('中间件管理', () => {
    it('应该清空所有中间件', () => {
      manager.addBeforeEach(vi.fn());
      manager.addBeforeEach(vi.fn());
      manager.addAfterEach(vi.fn());
      
      expect(manager.getMiddlewareCount().beforeEach).toBe(2);
      expect(manager.getMiddlewareCount().afterEach).toBe(1);
      
      manager.clearMiddleware();
      
      expect(manager.getMiddlewareCount().beforeEach).toBe(0);
      expect(manager.getMiddlewareCount().afterEach).toBe(0);
    });

    it('应该正确统计中间件数量', () => {
      manager.addBeforeEach(vi.fn());
      manager.addBeforeEach(vi.fn());
      manager.addAfterEach(vi.fn());
      manager.addAfterEach(vi.fn());
      manager.addAfterEach(vi.fn());
      
      const count = manager.getMiddlewareCount();
      
      expect(count.beforeEach).toBe(2);
      expect(count.afterEach).toBe(3);
    });
  });

  // ================================================================
  // 边界条件
  // ================================================================

  describe('边界条件', () => {
    it('应该处理from为null的情况', async () => {
      const middleware = vi.fn();
      
      manager.addBeforeEach(middleware);
      await manager.runBeforeEach(mockToRoute, null);
      
      expect(middleware).toHaveBeenCalledWith(mockToRoute, null);
    });

    it('应该处理空中间件列表', async () => {
      const result = await manager.runBeforeEach(mockToRoute, mockFromRoute);
      expect(result).toBe(true);
      
      await expect(
        manager.runAfterEach(mockToRoute, mockFromRoute)
      ).resolves.not.toThrow();
    });

    it('应该处理移除不存在的中间件', () => {
      const middleware = vi.fn();
      
      expect(() => {
        manager.removeBeforeEach(middleware);
      }).not.toThrow();
    });

    it('应该处理重复添加同一中间件', () => {
      const middleware = vi.fn();
      
      manager.addBeforeEach(middleware);
      manager.addBeforeEach(middleware);
      
      expect(manager.getMiddlewareCount().beforeEach).toBe(2);
    });

    it('应该处理中间件抛出非Error对象', async () => {
      manager.addBeforeEach(async () => {
        throw 'String error';
      });
      
      const result = await manager.runBeforeEach(mockToRoute, mockFromRoute);
      expect(result).toBe(false);
    });
  });

  // ================================================================
  // 中间件执行上下文
  // ================================================================

  describe('中间件执行上下文', () => {
    it('应该传递完整的路由对象', async () => {
      let receivedTo: Route | null = null;
      let receivedFrom: Route | null = null;
      
      manager.addBeforeEach(async (to, from) => {
        receivedTo = to;
        receivedFrom = from;
      });
      
      await manager.runBeforeEach(mockToRoute, mockFromRoute);
      
      expect(receivedTo).toEqual(mockToRoute);
      expect(receivedFrom).toEqual(mockFromRoute);
    });

    it('应该允许中间件修改路由状态', async () => {
      manager.addBeforeEach(async (to) => {
        to.state = { ...to.state, modified: true };
      });
      
      await manager.runBeforeEach(mockToRoute, mockFromRoute);
      
      expect(mockToRoute.state.modified).toBe(true);
    });
  });

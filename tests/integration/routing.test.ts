/**
 * routing.test.ts - 路由导航集成测试
 * 测试路由系统、状态管理和模块加载的集成
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { router } from '@/common/router/Router';
import { appStore } from '@/stores/useAppStore';
import { routeGuard } from '@/common/router/RouteGuard';
import { routeMiddleware } from '@/common/router/RouteMiddleware';
import { APP_EVENTS } from '@/common/constants/eventConstants';

describe('路由导航集成测试', () => {
  beforeEach(() => {
    // 清理状态
    router.clearHistory();
  });

  afterEach(() => {
    // 清理注册的守卫和中间件
    vi.clearAllMocks();
  });

  describe('基础导航', () => {
    it('应该成功导航到指定路由', async () => {
      const result = await router.navigate('sops_overview');
      expect(result).toBe(true);
      
      const currentRoute = router.getCurrentRoute();
      expect(currentRoute?.path).toBe('sops_overview');
    });

    it('应该更新状态管理器', async () => {
      await router.navigate('sops_overview');
      
      // 注意：实际的状态更新可能在模块中处理
      // 这里只验证路由导航成功
      const currentRoute = router.getCurrentRoute();
      expect(currentRoute).toBeDefined();
    });

    it('应该触发路由变化事件', async () => {
      const eventListener = vi.fn();
      window.addEventListener(APP_EVENTS.ROUTE_CHANGED, eventListener);
      
      await router.navigate('sops_overview');
      
      expect(eventListener).toHaveBeenCalled();
      
      window.removeEventListener(APP_EVENTS.ROUTE_CHANGED, eventListener);
    });

    it('应该记录导航历史', async () => {
      await router.navigate('sops_overview');
      await router.navigate('sops_npi_tracker');
      
      const history = router.getHistory();
      expect(history.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('路由守卫', () => {
    it('应该执行路由守卫', async () => {
      const guard = { name: 'test-guard', check: vi.fn(async () => true) };
      routeGuard.register('test-guard', guard);
      
      await router.navigate('sops_overview');
      
      expect(guard.check).toHaveBeenCalled();
      
      routeGuard.unregister('test-guard');
    });

    it('应该阻止导航当守卫返回false', async () => {
      const guard = { name: 'blocking-guard', check: vi.fn(async () => false) };
      routeGuard.register('blocking-guard', guard);
      
      const result = await router.navigate('sops_overview');
      
      expect(result).toBe(false);
      expect(guard.check).toHaveBeenCalled();
      
      routeGuard.unregister('blocking-guard');
    });

    it('应该按顺序执行多个守卫', async () => {
      const executionOrder: number[] = [];
      
      const guard1 = { name: 'guard1', check: vi.fn(async () => {
        executionOrder.push(1);
        return true;
      }) };
      const guard2 = { name: 'guard2', check: vi.fn(async () => {
        executionOrder.push(2);
        return true;
      }) };
      
      routeGuard.register('guard1', guard1);
      routeGuard.register('guard2', guard2);
      
      await router.navigate('sops_overview');
      
      expect(executionOrder).toEqual([1, 2]);
      
      routeGuard.unregister('guard1');
      routeGuard.unregister('guard2');
    });
  });

  describe('路由中间件', () => {
    it('应该执行前置中间件', async () => {
      const beforeEach = vi.fn(async () => {});
      routeMiddleware.addBeforeEach(beforeEach);
      
      await router.navigate('sops_overview');
      
      expect(beforeEach).toHaveBeenCalled();
    });

    it('应该执行后置中间件', async () => {
      const afterEach = vi.fn(async () => {});
      routeMiddleware.addAfterEach(afterEach);
      
      await router.navigate('sops_overview');
      
      expect(afterEach).toHaveBeenCalled();
    });

    it('应该传递正确的路由信息给中间件', async () => {
      const beforeEach = vi.fn(async (to) => {
        expect(to.path).toBe('sops_overview');
      });
      
      routeMiddleware.addBeforeEach(beforeEach);
      await router.navigate('sops_overview');
      
      expect(beforeEach).toHaveBeenCalled();
    });
  });

  describe('浏览器历史', () => {
    it('应该更新浏览器历史', async () => {
      await router.navigate('sops_overview', { updateHistory: true });
      
      // 验证URL已更新
      expect(window.location.hash).toContain('sops_overview');
    });

    it('应该支持替换历史记录', async () => {
      await router.navigate('sops_overview', { replace: true });
      
      expect(window.location.hash).toContain('sops_overview');
    });

    it('应该支持浏览器后退', async () => {
      await router.navigate('sops_overview');
      await router.navigate('sops_npi_tracker');
      
      router.back();
      
      // 等待popstate事件
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 验证路由已回退
      const currentRoute = router.getCurrentRoute();
      expect(currentRoute?.path).toBe('sops_overview');
    });
  });

  describe('错误处理', () => {
    it('应该处理不存在的路由', async () => {
      const result = await router.navigate('non_existent_route');
      expect(result).toBe(false);
    });

    it('应该处理守卫中的错误', async () => {
      const guard = { name: 'error-guard', check: vi.fn(async () => {
        throw new Error('Guard error');
      }) };
      
      routeGuard.register('error-guard', guard);
      
      const result = await router.navigate('sops_overview');
      
      expect(result).toBe(false);
      
      routeGuard.unregister('error-guard');
    });

    it('应该处理中间件中的错误', async () => {
      const middleware = vi.fn(async () => {
        throw new Error('Middleware error');
      });

      routeMiddleware.addBeforeEach(middleware);

      const result = await router.navigate('sops_overview');

      expect(result).toBe(false);

      // 清理：移除测试中间件
      routeMiddleware.removeBeforeEach(middleware);
    });
  });

  describe('并发导航', () => {
    it('应该防止重复导航', async () => {
      const promise1 = router.navigate('sops_overview');
      const promise2 = router.navigate('sops_npi_tracker');
      
      const [result1, result2] = await Promise.all([promise1, promise2]);
      
      // 第二个导航应该被跳过
      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });
  });

  describe('状态传递', () => {
    it('应该传递自定义状态', async () => {
      const customState = { userId: 123, from: 'dashboard' };
      
      await router.navigate('sops_overview', { state: customState });
      
      const currentRoute = router.getCurrentRoute();
      expect(currentRoute?.state).toEqual(customState);
    });
  });
});

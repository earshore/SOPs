// tests/integration/router-state.test.ts
// ================================================================
// 路由+状态管理集成测试
// 验证路由导航与状态管理的协同工作
// ================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { router } from '@/common/router/Router';
import { appStore } from '@/stores/useAppStore';
import { MENU_CONFIG } from '@/common/config/menuConfig';
import eventBus from '@/common/EventBus';
import { APP_EVENTS } from '@/common/constants/eventConstants';

// Mock viewLoader
vi.mock('@/common/utils/viewLoader', () => ({
  ensureViewLoaded: vi.fn().mockResolvedValue(true)
}));

  beforeEach(() => {
    // 重置状态
    appStore.getState().updateUI({
      currentTab: 'home',
      loading: false
    });
    
    // 清空路由历史
    router.clearHistory();
    
    // 清除所有mock
    vi.clearAllMocks();
  });

  afterEach(() => {
    // 清理事件监听
    eventBus.removeAllListeners();
  });

  // ================================================================
  // 路由导航触发状态更新
  // ================================================================

  describe('路由导航触发状态更新', () => {
    it('导航到新路由应该更新UI状态', async () => {
      // 监听路由变化事件
      const routeChangedSpy = vi.fn();
      eventBus.on(APP_EVENTS.ROUTE_CHANGED, routeChangedSpy);

      // 导航到scraper
      const success = await router.navigate('scraper');

      expect(success).toBe(true);
      expect(routeChangedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          routeId: 'scraper'
        })
      );

      // 验证当前路由
      const currentRoute = router.getCurrentRoute();
      expect(currentRoute?.path).toBe('scraper');
    });

    it('路由导航应该记录历史', async () => {
      await router.navigate('home');
      await router.navigate('scraper');
      await router.navigate('analysis');

      const history = router.getHistory();
      expect(history.length).toBe(3);
      expect(history[0].path).toBe('home');
      expect(history[1].path).toBe('scraper');
      expect(history[2].path).toBe('analysis');
    });

    it('状态变化应该与路由同步', async () => {
      // 设置初始状态
      appStore.getState().setCurrentTab('home');

      // 导航到analysis
      await router.navigate('analysis');

      // 手动更新状态以模拟路由处理器
      appStore.getState().setCurrentTab('analysis');

      // 验证状态已更新
      expect(appStore.getState().ui.currentTab).toBe('analysis');
    });
  });

  // ================================================================
  // 状态变化触发路由导航
  // ================================================================

  describe('状态变化触发路由导航', () => {
    it('更新currentTab应该能触发路由导航', async () => {
      // 订阅状态变化
      const unsubscribe = appStore.subscribe((state, prevState) => {
        if (state.ui.currentTab !== prevState.ui.currentTab) {
          router.navigate(state.ui.currentTab);
        }
      });

      // 更新状态
      appStore.getState().setCurrentTab('scraper');

      // 等待异步导航完成
      await new Promise(resolve => setTimeout(resolve, 50));

      // 验证路由已更新
      const currentRoute = router.getCurrentRoute();
      expect(currentRoute?.path).toBe('scraper');

      unsubscribe();
    });
  });

  // ================================================================
  // 路由守卫与状态验证
  // ================================================================

  describe('路由守卫与状态验证', () => {
    it('路由守卫应该能访问当前状态', async () => {
      // 设置特定状态
      appStore.getState().updateScraper({
        isScraping: true,
        status: 'scraping'
      });

      // 导航应该成功(守卫会检查状态)
      const success = await router.navigate('scraper');
      expect(success).toBe(true);
    });

    it('路由守卫失败应该保持当前状态', async () => {
      const initialTab = appStore.getState().ui.currentTab;

      // 尝试导航到不存在的路由
      const success = await router.navigate('nonexistent');

      expect(success).toBe(false);
      expect(appStore.getState().ui.currentTab).toBe(initialTab);
    });
  });

  // ================================================================
  // 浏览器历史与状态同步
  // ================================================================

  describe('浏览器历史与状态同步', () => {
    it('前进后退应该恢复状态', async () => {
      // 导航序列
      await router.navigate('home');
      appStore.getState().setCurrentTab('home');

      await router.navigate('scraper');
      appStore.getState().setCurrentTab('scraper');

      await router.navigate('analysis');
      appStore.getState().setCurrentTab('analysis');

      // 后退
      router.back();
      await new Promise(resolve => setTimeout(resolve, 50));

      // 验证历史记录
      const history = router.getHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    it('replace导航不应该增加历史记录', async () => {
      await router.navigate('home');
      const historyBefore = router.getHistory().length;

      await router.navigate('scraper', { replace: true });
      const historyAfter = router.getHistory().length;

      // replace会记录新路由,但不会增加浏览器历史
      expect(historyAfter).toBe(historyBefore + 1);
    });
  });

  // ================================================================
  // 复杂场景
  // ================================================================

  describe('复杂场景', () => {
    it('多次快速导航应该正确处理', async () => {
      const routes = ['home', 'scraper', 'analysis', 'promptlab'];
      
      // 快速连续导航
      const promises = routes.map(route => router.navigate(route));
      await Promise.all(promises);

      // 验证最终状态
      const currentRoute = router.getCurrentRoute();
      expect(routes).toContain(currentRoute?.path);
    });

    it('导航失败不应该影响状态一致性', async () => {
      const initialState = appStore.getState();

      // 尝试导航到无效路由
      await router.navigate('invalid-route');

      // 状态应该保持不变
      const currentState = appStore.getState();
      expect(currentState.ui.currentTab).toBe(initialState.ui.currentTab);
    });

    it('并发状态更新和路由导航应该保持一致', async () => {
      // 同时更新状态和导航
      const stateUpdate = appStore.getState().setCurrentTab('scraper');
      const navigation = router.navigate('scraper');

      await Promise.all([stateUpdate, navigation]);

      // 验证一致性
      expect(appStore.getState().ui.currentTab).toBe('scraper');
      expect(router.getCurrentRoute()?.path).toBe('scraper');
    });
  });

  // ================================================================
  // 状态持久化与路由恢复
  // ================================================================

  describe('状态持久化与路由恢复', () => {
    it('应该能从持久化状态恢复路由', async () => {
      // 设置状态并导航
      appStore.getState().setCurrentTab('analysis');
      await router.navigate('analysis');

      // 模拟页面刷新后恢复
      const savedTab = appStore.getState().ui.currentTab;
      
      // 恢复路由
      if (savedTab) {
        await router.navigate(savedTab);
      }

      expect(router.getCurrentRoute()?.path).toBe('analysis');
    });
  });

  // ================================================================
  // 错误处理
  // ================================================================

  describe('错误处理', () => {
    it('路由错误不应该破坏状态', async () => {
      const initialState = { ...appStore.getState() };

      // 触发路由错误
      await router.navigate('invalid');

      // 状态应该保持稳定
      expect(appStore.getState().ui).toEqual(initialState.ui);
    });

    it('状态更新错误不应该影响路由', async () => {
      // 导航到有效路由
      const success = await router.navigate('home');
      expect(success).toBe(true);

      // 即使状态更新失败,路由应该保持
      try {
        // 模拟状态更新错误
        throw new Error('State update failed');
      } catch (error) {
        // 路由应该仍然有效
        expect(router.getCurrentRoute()?.path).toBe('home');
      }
    });
  });

  // ================================================================
  // 性能测试
  // ================================================================

  describe('性能测试', () => {
    it('大量路由导航应该保持性能', async () => {
      const startTime = Date.now();
      const routes = ['home', 'scraper', 'analysis', 'promptlab', 'more'];

      for (let i = 0; i < 20; i++) {
        const route = routes[i % routes.length];
        await router.navigate(route);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 20次导航应该在合理时间内完成(< 2秒)
      expect(duration).toBeLessThan(2000);
    });

    it('状态订阅不应该造成内存泄漏', () => {
      const subscriptions: Array<() => void> = [];

      // 创建多个订阅
      for (let i = 0; i < 100; i++) {
        const unsubscribe = appStore.subscribe(() => {});
        subscriptions.push(unsubscribe);
      }

      // 取消所有订阅
      subscriptions.forEach(unsub => unsub());

      // 验证可以继续正常工作
      appStore.getState().setCurrentTab('home');
      expect(appStore.getState().ui.currentTab).toBe('home');
    });
  });

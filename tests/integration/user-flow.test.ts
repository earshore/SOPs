// tests/integration/user-flow.test.ts
// ================================================================
// 完整用户流程集成测试
// 验证从用户操作到数据处理的完整流程
// ================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { router } from '@/common/router/Router';
import { appStore } from '@/stores/useAppStore';
import { httpService } from '@/services/httpService';
import { HttpCacheService } from '@/services/HttpCacheService';
import eventBus from '@/common/EventBus';
import { APP_EVENTS } from '@/common/constants/eventConstants';

// Mock依赖
vi.mock('@/common/utils/viewLoader', () => ({
  ensureViewLoaded: vi.fn().mockResolvedValue(true)
}));

global.fetch = vi.fn();

  let cacheService: HttpCacheService;

  beforeEach(() => {
    cacheService = new HttpCacheService();
    
    // 重置状态
    appStore.getState().updateUI({
      currentTab: 'home',
      loading: false
    });
    appStore.getState().resetScraper();
    appStore.getState().resetAnalysis();
    
    // 清空路由历史
    router.clearHistory();
    
    // 清除缓存
    cacheService.clear();
    
    // 清除mock
    vi.clearAllMocks();
    
    // Mock fetch成功响应
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: 'test' }),
      headers: new Headers({ 'content-type': 'application/json' })
    });
  });

  afterEach(() => {
    eventBus.removeAllListeners();
  });

  // ================================================================
  // 场景1: 用户浏览应用
  // ================================================================

  describe('场景1: 用户浏览应用', () => {
    it('应该完成基本导航流程', async () => {
      // 1. 用户打开应用,默认在home页
      expect(appStore.getState().ui.currentTab).toBe('home');

      // 2. 用户导航到scraper页
      await router.navigate('scraper');
      appStore.getState().setCurrentTab('scraper');
      
      expect(router.getCurrentRoute()?.path).toBe('scraper');
      expect(appStore.getState().ui.currentTab).toBe('scraper');

      // 3. 用户导航到analysis页
      await router.navigate('analysis');
      appStore.getState().setCurrentTab('analysis');
      
      expect(router.getCurrentRoute()?.path).toBe('analysis');
      expect(appStore.getState().ui.currentTab).toBe('analysis');

      // 4. 用户点击后退
      router.back();
      await new Promise(resolve => setTimeout(resolve, 50));

      // 5. 验证历史记录
      const history = router.getHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    it('应该保持导航状态一致性', async () => {
      const tabs = ['home', 'scraper', 'analysis', 'promptlab'];

      for (const tab of tabs) {
        await router.navigate(tab);
        appStore.getState().setCurrentTab(tab);

        expect(router.getCurrentRoute()?.path).toBe(tab);
        expect(appStore.getState().ui.currentTab).toBe(tab);
      }
    });
  });

  // ================================================================
  // 场景2: 数据抓取流程
  // ================================================================

  describe('场景2: 数据抓取流程', () => {
    it('应该完成完整的抓取流程', async () => {
      // 1. 导航到scraper页
      await router.navigate('scraper');
      appStore.getState().setCurrentTab('scraper');

      // 2. 用户选择站点
      appStore.getState().setSelectedSite('amazon.com');
      expect(appStore.getState().scraper.selectedSite).toBe('amazon.com');

      // 3. 开始抓取
      appStore.getState().setIsScraping(true);
      appStore.getState().setScraperStatus('scraping');
      appStore.getState().setLoading(true);

      expect(appStore.getState().scraper.isScraping).toBe(true);
      expect(appStore.getState().scraper.status).toBe('scraping');
      expect(appStore.getState().ui.loading).toBe(true);

      // 4. 模拟API请求
      const mockData = [
        { asin: 'B001', title: 'Product 1' },
        { asin: 'B002', title: 'Product 2' }
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockData,
        headers: new Headers({ 'content-type': 'application/json' })
      });

      const response = await httpService.get('https://api.example.com/scrape');

      // 5. 保存抓取结果
      appStore.getState().setScrapedData(mockData);
      appStore.getState().setIsScraping(false);
      appStore.getState().setScraperStatus('completed');
      appStore.getState().setLoading(false);

      expect(appStore.getState().scraper.scrapedData).toEqual(mockData);
      expect(appStore.getState().scraper.isScraping).toBe(false);
      expect(appStore.getState().scraper.status).toBe('completed');
      expect(appStore.getState().ui.loading).toBe(false);
    });

    it('应该处理抓取失败', async () => {
      // 1. 开始抓取
      appStore.getState().setIsScraping(true);
      appStore.getState().setScraperStatus('scraping');

      // 2. 模拟API失败
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      try {
        await httpService.get('https://api.example.com/scrape');
      } catch (error) {
        // 3. 处理错误
        appStore.getState().setIsScraping(false);
        appStore.getState().setScraperStatus('error');
        appStore.getState().setLoading(false);
      }

      expect(appStore.getState().scraper.isScraping).toBe(false);
      expect(appStore.getState().scraper.status).toBe('error');
    });
  });

  // ================================================================
  // 场景3: 数据分析流程
  // ================================================================

  describe('场景3: 数据分析流程', () => {
    it('应该完成完整的分析流程', async () => {
      // 1. 准备数据
      const scrapedData = [
        { asin: 'B001', title: 'Product 1' },
        { asin: 'B002', title: 'Product 2' },
        { asin: 'B003', title: 'Product 3' }
      ];
      appStore.getState().setScrapedData(scrapedData);

      // 2. 导航到analysis页
      await router.navigate('analysis');
      appStore.getState().setCurrentTab('analysis');

      // 3. 用户选择要分析的ASIN
      appStore.getState().setSelectedAsins(['B001', 'B002']);
      expect(appStore.getState().analysis.selectedAsins).toEqual(['B001', 'B002']);

      // 4. 开始分析
      appStore.getState().updateAnalysis({ isAnalyzing: true });
      appStore.getState().setLoading(true);

      // 5. 模拟分析API请求
      const mockReport = {
        summary: 'Analysis complete',
        details: { B001: 'Good', B002: 'Excellent' }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockReport,
        headers: new Headers({ 'content-type': 'application/json' })
      });

      const report = await httpService.post('https://api.example.com/analyze', {
        asins: ['B001', 'B002']
      });

      // 6. 保存分析结果
      appStore.getState().setAnalysisReport(mockReport);
      appStore.getState().updateAnalysis({ isAnalyzing: false });
      appStore.getState().setLoading(false);

      expect(appStore.getState().analysis.analysisReport).toEqual(mockReport);
      expect(appStore.getState().analysis.isAnalyzing).toBe(false);
    });

    it('应该支持报告编辑', async () => {
      // 1. 设置初始报告
      const initialReport = { summary: 'Initial' };
      appStore.getState().setAnalysisReport(initialReport);

      // 2. 进入编辑模式
      appStore.getState().setIsEditing(true);
      expect(appStore.getState().analysis.isEditing).toBe(true);

      // 3. 修改报告
      const updatedReport = { summary: 'Updated' };
      appStore.getState().setAnalysisReport(updatedReport);

      // 4. 退出编辑模式
      appStore.getState().setIsEditing(false);

      expect(appStore.getState().analysis.analysisReport).toEqual(updatedReport);
      expect(appStore.getState().analysis.isEditing).toBe(false);
    });
  });

  // ================================================================
  // 场景4: 缓存优化流程
  // ================================================================

  describe('场景4: 缓存优化流程', () => {
    it('应该利用缓存提升性能', async () => {
      const url = 'https://api.example.com/data';

      // 1. 首次请求(无缓存)
      const response1 = await httpService.get(url);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // 2. 缓存数据
      cacheService.set(url, response1, 60000);

      // 3. 第二次请求(使用缓存)
      const cached = cacheService.get(url);
      expect(cached).toBeDefined();
      expect(global.fetch).toHaveBeenCalledTimes(1); // 仍然是1次

      // 4. 缓存失效后重新请求
      cacheService.delete(url);
      await httpService.get(url);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('应该处理多个并发请求', async () => {
      const urls = [
        'https://api.example.com/data1',
        'https://api.example.com/data2',
        'https://api.example.com/data3'
      ];

      // 并发请求
      const promises = urls.map(url => httpService.get(url));
      await Promise.all(promises);

      // 验证所有请求都完成
      expect(global.fetch).toHaveBeenCalledTimes(3);

      // 验证缓存
      urls.forEach(url => {
        const cached = cacheService.get(url);
        expect(cached).toBeDefined();
      });
    });
  });

  // ================================================================
  // 场景5: 错误恢复流程
  // ================================================================

  describe('场景5: 错误恢复流程', () => {
    it('应该从网络错误中恢复', async () => {
      const url = 'https://api.example.com/data';

      // 1. 第一次请求失败
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      try {
        await httpService.get(url);
      } catch (error) {
        expect(error).toBeDefined();
      }

      // 2. 重试请求成功
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'success' }),
        headers: new Headers({ 'content-type': 'application/json' })
      });

      const response = await httpService.get(url);
      expect(response).toBeDefined();
    });

    it('应该处理状态不一致', async () => {
      // 1. 设置不一致的状态
      appStore.getState().setCurrentTab('scraper');
      await router.navigate('analysis');

      // 2. 同步状态
      const currentRoute = router.getCurrentRoute();
      if (currentRoute) {
        appStore.getState().setCurrentTab(currentRoute.path);
      }

      // 3. 验证一致性
      expect(appStore.getState().ui.currentTab).toBe(router.getCurrentRoute()?.path);
    });
  });

  // ================================================================
  // 场景6: 完整工作流
  // ================================================================

  describe('场景6: 完整工作流', () => {
    it('应该完成从抓取到分析的完整流程', async () => {
      // 1. 导航到scraper
      await router.navigate('scraper');
      appStore.getState().setCurrentTab('scraper');

      // 2. 抓取数据
      appStore.getState().setSelectedSite('amazon.com');
      appStore.getState().setIsScraping(true);

      const scrapedData = [
        { asin: 'B001', title: 'Product 1' },
        { asin: 'B002', title: 'Product 2' }
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => scrapedData,
        headers: new Headers({ 'content-type': 'application/json' })
      });

      await httpService.get('https://api.example.com/scrape');
      appStore.getState().setScrapedData(scrapedData);
      appStore.getState().setIsScraping(false);

      // 3. 导航到analysis
      await router.navigate('analysis');
      appStore.getState().setCurrentTab('analysis');

      // 4. 选择ASIN并分析
      appStore.getState().setSelectedAsins(['B001', 'B002']);
      appStore.getState().updateAnalysis({ isAnalyzing: true });

      const analysisReport = {
        summary: 'Complete',
        details: { B001: 'Good', B002: 'Excellent' }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => analysisReport,
        headers: new Headers({ 'content-type': 'application/json' })
      });

      await httpService.post('https://api.example.com/analyze', {
        asins: ['B001', 'B002']
      });

      appStore.getState().setAnalysisReport(analysisReport);
      appStore.getState().updateAnalysis({ isAnalyzing: false });

      // 5. 验证最终状态
      expect(appStore.getState().scraper.scrapedData).toEqual(scrapedData);
      expect(appStore.getState().analysis.selectedAsins).toEqual(['B001', 'B002']);
      expect(appStore.getState().analysis.analysisReport).toEqual(analysisReport);
      expect(router.getCurrentRoute()?.path).toBe('analysis');
    });

    it('应该处理复杂的用户交互序列', async () => {
      const interactions = [
        { action: 'navigate', target: 'home' },
        { action: 'navigate', target: 'scraper' },
        { action: 'setSite', value: 'amazon.com' },
        { action: 'navigate', target: 'analysis' },
        { action: 'selectAsins', value: ['B001'] },
        { action: 'navigate', target: 'promptlab' },
        { action: 'navigate', target: 'home' }
      ];

      for (const interaction of interactions) {
        switch (interaction.action) {
          case 'navigate':
            await router.navigate(interaction.target);
            appStore.getState().setCurrentTab(interaction.target);
            break;
          case 'setSite':
            appStore.getState().setSelectedSite(interaction.value);
            break;
          case 'selectAsins':
            appStore.getState().setSelectedAsins(interaction.value);
            break;
        }

        // 短暂延迟模拟真实用户操作
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // 验证最终状态
      expect(router.getCurrentRoute()?.path).toBe('home');
      expect(appStore.getState().ui.currentTab).toBe('home');
    });
  });

  // ================================================================
  // 场景7: 性能优化场景
  // ================================================================

  describe('场景7: 性能优化场景', () => {
    it('应该高效处理大量数据', async () => {
      // 生成大量数据
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        asin: `B${String(i).padStart(3, '0')}`,
        title: `Product ${i}`
      }));

      const startTime = Date.now();

      // 保存到状态
      appStore.getState().setScrapedData(largeDataset);

      // 选择部分ASIN
      const selectedAsins = largeDataset.slice(0, 100).map(item => item.asin);
      appStore.getState().setSelectedAsins(selectedAsins);

      const endTime = Date.now();

      // 操作应该快速完成
      expect(endTime - startTime).toBeLessThan(100);
      expect(appStore.getState().scraper.scrapedData?.length).toBe(1000);
      expect(appStore.getState().analysis.selectedAsins.length).toBe(100);
    });

    it('应该优化频繁的状态更新', async () => {
      const startTime = Date.now();

      // 频繁更新状态
      for (let i = 0; i < 100; i++) {
        appStore.getState().setLoading(i % 2 === 0);
        appStore.getState().setCurrentTab(i % 2 === 0 ? 'home' : 'scraper');
      }

      const endTime = Date.now();

      // 应该在合理时间内完成
      expect(endTime - startTime).toBeLessThan(200);
    });
  });

  // ================================================================
  // 场景8: 事件驱动流程
  // ================================================================

  describe('场景8: 事件驱动流程', () => {
    it('应该通过事件协调多个模块', async () => {
      const events: string[] = [];

      // 监听各种事件
      eventBus.on(APP_EVENTS.ROUTE_CHANGED, () => events.push('route_changed'));
      eventBus.on(APP_EVENTS.MODULE_LOADED, () => events.push('module_loaded'));
      eventBus.on(APP_EVENTS.ERROR_OCCURRED, () => events.push('error_occurred'));

      // 触发一系列操作
      await router.navigate('scraper');
      eventBus.emit(APP_EVENTS.MODULE_LOADED, { moduleName: 'Scraper' });

      // 验证事件序列
      expect(events).toContain('route_changed');
      expect(events).toContain('module_loaded');
    });
  });

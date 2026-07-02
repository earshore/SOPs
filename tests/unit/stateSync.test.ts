/**
 * stateSync 单元测试
 * 测试状态同步工具的功能
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  createStateSync, 
  createMultipleStateSyncs,
  createTwoWayBinding,
  createComputedSync,
  cleanupSubscriptions
} from '@/common/utils/stateSync';
import { appStore } from '@/stores/useAppStore';

  beforeEach(() => {
    // 重置状态
    appStore.getState().resetAnalysis();
    appStore.getState().resetScraper();
  });

  describe('createStateSync', () => {
    it('应该在状态变化时触发回调', () => {
      const callback = vi.fn();
      
      const unsubscribe = createStateSync({
        selector: (state) => state.analysis.selectedAsins,
        onChange: callback
      });
      
      // 修改状态
      appStore.getState().setSelectedAsins(['ASIN1', 'ASIN2']);
      
      expect(callback).toHaveBeenCalledWith(['ASIN1', 'ASIN2'], []);
      
      unsubscribe();
    });

    it('应该支持立即执行', () => {
      const callback = vi.fn();
      
      appStore.getState().setSelectedAsins(['ASIN1']);
      
      const unsubscribe = createStateSync({
        selector: (state) => state.analysis.selectedAsins,
        onChange: callback,
        immediate: true
      });
      
      expect(callback).toHaveBeenCalledWith(['ASIN1'], ['ASIN1']);
      
      unsubscribe();
    });

    it('应该只在值真正改变时触发', () => {
      const callback = vi.fn();
      
      const unsubscribe = createStateSync({
        selector: (state) => state.analysis.selectedAsins,
        onChange: callback
      });
      
      // 设置相同的值
      const asins = ['ASIN1'];
      appStore.getState().setSelectedAsins(asins);
      appStore.getState().setSelectedAsins(asins);
      
      // 应该只触发一次
      expect(callback).toHaveBeenCalledTimes(1);
      
      unsubscribe();
    });
  });

  describe('createMultipleStateSyncs', () => {
    it('应该创建多个状态同步器', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      const unsubscribes = createMultipleStateSyncs([
        {
          selector: (state) => state.analysis.selectedAsins,
          onChange: callback1
        },
        {
          selector: (state) => state.scraper.isScraping,
          onChange: callback2
        }
      ]);
      
      appStore.getState().setSelectedAsins(['ASIN1']);
      appStore.getState().setIsScraping(true);
      
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
      
      unsubscribes.forEach(fn => fn());
    });
  });

  describe('createTwoWayBinding', () => {
    it('应该创建双向绑定', () => {
      const callback = vi.fn();
      
      const unsubscribe = createTwoWayBinding({
        get: () => appStore.getState().analysis.selectedAsins,
        set: (value) => appStore.getState().setSelectedAsins(value),
        onChange: callback
      });
      
      // 初始值
      expect(callback).toHaveBeenCalledWith([]);
      
      // 修改状态
      appStore.getState().setSelectedAsins(['ASIN1']);
      
      expect(callback).toHaveBeenCalledWith(['ASIN1']);
      
      unsubscribe();
    });
  });

  describe('createComputedSync', () => {
    it('应该在依赖变化时重新计算', () => {
      const callback = vi.fn();
      
      const unsubscribe = createComputedSync({
        deps: [
          (state) => state.analysis.selectedAsins,
          (state) => state.scraper.scrapedData
        ],
        compute: (selectedAsins, scrapedData) => {
          return selectedAsins.length > 0 && scrapedData !== null;
        },
        onChange: callback
      });
      
      // 初始值
      expect(callback).toHaveBeenCalledWith(false);
      
      // 修改依赖
      appStore.getState().setSelectedAsins(['ASIN1']);
      appStore.getState().setScrapedData({ items: [] });
      
      expect(callback).toHaveBeenCalledWith(true);
      
      unsubscribe();
    });

    it('应该只在计算结果变化时触发', () => {
      const callback = vi.fn();
      
      const unsubscribe = createComputedSync({
        deps: [
          (state) => state.analysis.selectedAsins
        ],
        compute: (selectedAsins) => selectedAsins.length > 0,
        onChange: callback
      });
      
      callback.mockClear();
      
      // 修改依赖但结果不变
      appStore.getState().setSelectedAsins(['ASIN1']);
      appStore.getState().setSelectedAsins(['ASIN2']);
      
      // 结果都是 true，应该只触发一次
      expect(callback).toHaveBeenCalledTimes(1);
      
      unsubscribe();
    });
  });

  describe('cleanupSubscriptions', () => {
    it('应该清理所有订阅', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      const unsubscribe1 = createStateSync({
        selector: (state) => state.analysis.selectedAsins,
        onChange: callback1
      });
      
      const unsubscribe2 = createStateSync({
        selector: (state) => state.scraper.isScraping,
        onChange: callback2
      });
      
      cleanupSubscriptions([unsubscribe1, unsubscribe2]);
      
      // 修改状态不应该触发回调
      appStore.getState().setSelectedAsins(['ASIN1']);
      appStore.getState().setIsScraping(true);
      
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });

    it('应该处理 null 和 undefined', () => {
      expect(() => {
        cleanupSubscriptions([null, undefined, () => {}]);
      }).not.toThrow();
    });
  });

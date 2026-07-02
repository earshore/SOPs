// tests/integration/zustand-migration.test.ts
// ================================================================
// 🎯 P1-8: Zustand迁移集成测试
// 验证appStore、stateAdapter、storeCompat是否正常工作
// ================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { appStore } from '../../src/stores/useAppStore';
import { storeCompat } from '../../src/stores/storeCompat';

  beforeEach(() => {
    // 重置store到初始状态
    appStore.getState().updateUI({
      currentTab: 'home',
      currentDataTab: 'preview',
      currentReportTab: 'report',
      sidebarCollapsed: false,
      theme: 'light',
      loading: false
    });
    appStore.getState().resetScraper();
    appStore.getState().resetAnalysis();
    appStore.getState().resetPromptLab();
    appStore.getState().resetKeywordTracker();
  });

  describe('appStore基本功能', () => {
    it('应该能够读取初始状态', () => {
      const state = appStore.getState();
      
      expect(state.ui.currentTab).toBe('home');
      expect(state.scraper.isScraping).toBe(false);
      expect(state.analysis.selectedAsins).toEqual([]);
      expect(state.promptlab.currentPrompt).toBe('');
      expect(state.keywordTracker.keywords).toEqual([]);
    });

    it('应该能够更新UI状态', () => {
      const state = appStore.getState();
      
      state.setCurrentTab('scraper');
      expect(appStore.getState().ui.currentTab).toBe('scraper');
      
      state.setTheme('dark');
      expect(appStore.getState().ui.theme).toBe('dark');
      
      state.setLoading(true);
      expect(appStore.getState().ui.loading).toBe(true);
    });

    it('应该能够更新Scraper状态', () => {
      const state = appStore.getState();
      
      state.setIsScraping(true);
      expect(appStore.getState().scraper.isScraping).toBe(true);
      
      state.setScraperStatus('scraping');
      expect(appStore.getState().scraper.status).toBe('scraping');
      
      state.setSelectedSite('amazon.com');
      expect(appStore.getState().scraper.selectedSite).toBe('amazon.com');
    });

    it('应该能够更新Analysis状态', () => {
      const state = appStore.getState();
      
      state.setSelectedAsins(['B001', 'B002']);
      expect(appStore.getState().analysis.selectedAsins).toEqual(['B001', 'B002']);
      
      state.setIsEditing(true);
      expect(appStore.getState().analysis.isEditing).toBe(true);
      
      state.setShowTranslation(true);
      expect(appStore.getState().analysis.showTranslation).toBe(true);
    });

    it('应该能够更新PromptLab状态', () => {
      const state = appStore.getState();
      
      state.setCurrentPrompt('test prompt');
      expect(appStore.getState().promptlab.currentPrompt).toBe('test prompt');
      
      state.setSelectedModel('gpt-4');
      expect(appStore.getState().promptlab.selectedModel).toBe('gpt-4');
    });

    it('应该能够更新KeywordTracker状态', () => {
      const state = appStore.getState();
      
      state.setKeywords(['keyword1', 'keyword2']);
      expect(appStore.getState().keywordTracker.keywords).toEqual(['keyword1', 'keyword2']);
      
      state.setTranslationMode(true);
      expect(appStore.getState().keywordTracker.translationMode).toBe(true);
    });

    it('应该能够重置模块状态', () => {
      const state = appStore.getState();
      
      // 修改状态
      state.setIsScraping(true);
      state.setSelectedSite('amazon.com');
      
      // 重置
      state.resetScraper();
      
      // 验证已重置
      expect(appStore.getState().scraper.isScraping).toBe(false);
      expect(appStore.getState().scraper.selectedSite).toBe('');
    });
  });

  describe('appStore订阅功能', () => {
    it('应该能够订阅状态变化', () => {
      const callback = vi.fn();
      
      const unsubscribe = appStore.subscribe(callback);
      
      appStore.getState().setCurrentTab('analysis');
      
      expect(callback).toHaveBeenCalled();
      
      unsubscribe();
    });

    it('取消订阅后不应该收到通知', () => {
      const callback = vi.fn();
      
      const unsubscribe = appStore.subscribe(callback);
      unsubscribe();
      
      appStore.getState().setCurrentTab('analysis');
      
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('storeCompat兼容层', () => {
    it('应该能够通过get方法读取状态', () => {
      expect(storeCompat.get('ui.currentTab')).toBe('home');
      expect(storeCompat.get('scraper.isScraping')).toBe(false);
      expect(storeCompat.get('analysis.selectedAsins')).toEqual([]);
    });

    it('应该能够通过set方法更新状态', () => {
      storeCompat.set('ui.currentTab', 'scraper');
      expect(appStore.getState().ui.currentTab).toBe('scraper');
      
      storeCompat.set('scraper.isScraping', true);
      expect(appStore.getState().scraper.isScraping).toBe(true);
      
      storeCompat.set('analysis.selectedAsins', ['B001']);
      expect(appStore.getState().analysis.selectedAsins).toEqual(['B001']);
    });

    it('应该能够订阅特定路径的变化', () => {
      const callback = vi.fn();
      
      const unsubscribe = storeCompat.subscribe('ui.currentTab', callback);
      
      storeCompat.set('ui.currentTab', 'analysis');
      
      // 等待订阅触发
      expect(callback).toHaveBeenCalledWith('analysis', 'home');
      
      unsubscribe();
    });

    it('应该能够批量更新状态', () => {
      storeCompat.batchUpdate({
        'ui.currentTab': 'scraper',
        'ui.loading': true,
        'scraper.isScraping': true
      });
      
      const state = appStore.getState();
      expect(state.ui.currentTab).toBe('scraper');
      expect(state.ui.loading).toBe(true);
      expect(state.scraper.isScraping).toBe(true);
    });

    it('应该能够获取完整状态快照', () => {
      const snapshot = storeCompat.snapshot();
      
      expect(snapshot).toHaveProperty('ui');
      expect(snapshot).toHaveProperty('scraper');
      expect(snapshot).toHaveProperty('analysis');
      expect(snapshot).toHaveProperty('promptlab');
      expect(snapshot).toHaveProperty('keywordTracker');
    });

    it('应该能够重置模块', () => {
      // 修改状态
      storeCompat.set('scraper.isScraping', true);
      storeCompat.set('scraper.selectedSite', 'amazon.com');
      
      // 重置
      storeCompat.reset('scraper');
      
      // 验证已重置
      expect(storeCompat.get('scraper.isScraping')).toBe(false);
      expect(storeCompat.get('scraper.selectedSite')).toBe('');
    });
  });

  describe('状态一致性', () => {
    it('通过appStore和storeCompat修改应该保持一致', () => {
      // 通过appStore修改
      appStore.getState().setCurrentTab('scraper');
      expect(storeCompat.get('ui.currentTab')).toBe('scraper');
      
      // 通过storeCompat修改
      storeCompat.set('ui.currentTab', 'analysis');
      expect(appStore.getState().ui.currentTab).toBe('analysis');
    });

    it('复杂对象更新应该保持一致', () => {
      const testData = [
        { id: '1', title: 'Test 1' },
        { id: '2', title: 'Test 2' }
      ];
      
      appStore.getState().setScrapedData(testData);
      expect(storeCompat.get('scraper.scrapedData')).toEqual(testData);
      
      storeCompat.set('scraper.scrapedData', null);
      expect(appStore.getState().scraper.scrapedData).toBeNull();
    });
  });

  describe('边界情况', () => {
    it('应该处理undefined路径', () => {
      expect(storeCompat.get('nonexistent.path')).toBeUndefined();
    });

    it('应该处理空路径', () => {
      const result = storeCompat.get('');
      expect(result).toBeDefined();
      expect(result).toHaveProperty('ui');
    });

    it('应该处理无效的模块名', () => {
      // 不应该抛出错误
      expect(() => {
        storeCompat.set('invalid.property', 'value');
      }).not.toThrow();
    });
  });

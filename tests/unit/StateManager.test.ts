// tests/unit/StateManager.test.ts
// ================================================================
// StateManager 单元测试
// 测试覆盖率目标：≥ 85%
// ================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StateManager } from '@/common/infrastructure/StateManager';
import { appStore } from '@/stores/useAppStore';
import type { Middleware } from '@/common/infrastructure/StateManager';
import {
  createTestAnalysisState,
  createTestScraperState,
  createTestPromptLabState,
  createTestUIState
} from '../helpers/testFactory';

describe('StateManager', () => {
  let stateManager: StateManager;

  beforeEach(() => {
    // 重置 store 状态
    appStore.getState().resetScraper();
    appStore.getState().resetAnalysis();
    appStore.getState().resetPromptLab();
    appStore.getState().resetKeywordTracker();
    
    // 创建新的 StateManager 实例
    stateManager = StateManager.getInstance();
  });

  afterEach(() => {
    // 清理
    vi.clearAllMocks();
  });

  describe('单例模式', () => {
    it('应该返回同一个实例', () => {
      const instance1 = StateManager.getInstance();
      const instance2 = StateManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Analysis 状态管理', () => {
    describe('getAnalysisReport / setAnalysisReport', () => {
      it('应该能够设置和获取分析报告', () => {
        const report = { summary: 'Test Report', data: [] };
        
        stateManager.setAnalysisReport(report);
        
        const retrieved = stateManager.getAnalysisReport();
        expect(retrieved).toEqual(report);
      });

      it('应该在没有报告时返回 null', () => {
        const report = stateManager.getAnalysisReport();
        expect(report).toBeNull();
      });

      it('应该支持字符串类型的报告', () => {
        const stringReport = 'String report content';
        
        stateManager.setAnalysisReport(stringReport);
        
        const retrieved = stateManager.getAnalysisReport();
        expect(retrieved).toBe(stringReport);
      });
    });

    describe('getSelectedAsins / setSelectedAsins', () => {
      it('应该能够设置和获取选中的 ASINs', () => {
        const asins = ['B001', 'B002', 'B003'];
        
        stateManager.setSelectedAsins(asins);
        
        const retrieved = stateManager.getSelectedAsins();
        expect(retrieved).toEqual(asins);
      });

      it('应该在没有选中时返回空数组', () => {
        const asins = stateManager.getSelectedAsins();
        expect(asins).toEqual([]);
      });
    });

    describe('getTranslatedReport / setTranslatedReport', () => {
      it('应该能够设置和获取翻译后的报告', () => {
        const report = { summary: 'Translated Report', data: [] };
        
        stateManager.setTranslatedReport(report);
        
        const retrieved = stateManager.getTranslatedReport();
        expect(retrieved).toEqual(report);
      });
    });

    describe('getIsAnalyzing / setIsAnalyzing', () => {
      it('应该能够设置和获取分析状态', () => {
        stateManager.setIsAnalyzing(true);
        expect(stateManager.getIsAnalyzing()).toBe(true);
        
        stateManager.setIsAnalyzing(false);
        expect(stateManager.getIsAnalyzing()).toBe(false);
      });
    });


    describe('getReportData / setReportData', () => {
      it('应该能够设置和获取报告数据', () => {
        const data = { key: 'value', items: [1, 2, 3] };
        
        stateManager.setReportData(data);
        
        const retrieved = stateManager.getReportData();
        expect(retrieved).toEqual(data);
      });
    });

    describe('getExpandedAsin / setExpandedAsin', () => {
      it('应该能够设置和获取展开的 ASIN', () => {
        stateManager.setExpandedAsin('B001');
        expect(stateManager.getExpandedAsin()).toBe('B001');
        
        stateManager.setExpandedAsin(null);
        expect(stateManager.getExpandedAsin()).toBeNull();
      });
    });

    describe('getIsEditing / setIsEditing', () => {
      it('应该能够设置和获取编辑状态', () => {
        stateManager.setIsEditing(true);
        expect(stateManager.getIsEditing()).toBe(true);
      });
    });

    describe('getShowTranslation / setShowTranslation', () => {
      it('应该能够设置和获取翻译显示状态', () => {
        stateManager.setShowTranslation(true);
        expect(stateManager.getShowTranslation()).toBe(true);
      });
    });

    describe('编辑历史管理', () => {
      it('应该能够添加编辑历史', () => {
        const report1 = { summary: 'Report 1' };
        const report2 = { summary: 'Report 2' };
        
        stateManager.addEditHistory(report1);
        stateManager.addEditHistory(report2);
        
        const history = stateManager.getEditHistory();
        expect(history).toHaveLength(2);
        expect(history[0]).toEqual(report1);
        expect(history[1]).toEqual(report2);
      });

      it('应该能够清空编辑历史', () => {
        stateManager.addEditHistory({ summary: 'Report' });
        stateManager.clearEditHistory();
        
        const history = stateManager.getEditHistory();
        expect(history).toHaveLength(0);
      });
    });

    describe('getLastTranslationModel / setLastTranslationModel', () => {
      it('应该能够设置和获取最后使用的翻译模型', () => {
        stateManager.setLastTranslationModel('gpt-4');
        expect(stateManager.getLastTranslationModel()).toBe('gpt-4');
      });
    });


    describe('getAnalysisFilters / setAnalysisFilters', () => {
      it('应该能够设置和获取分析过滤器', () => {
        const filters = { category: 'electronics', minPrice: 10 };
        
        stateManager.setAnalysisFilters(filters);
        
        const retrieved = stateManager.getAnalysisFilters();
        expect(retrieved).toEqual(filters);
      });
    });

    describe('待处理报告管理', () => {
      it('应该能够设置和获取待处理的报告', () => {
        const pending = { id: '123', status: 'pending' };
        
        stateManager.setPendingReport(pending);
        
        const retrieved = stateManager.getPendingReport();
        expect(retrieved).toEqual(pending);
      });

      it('应该能够清除待处理的报告', () => {
        stateManager.setPendingReport({ id: '123' });
        stateManager.clearPendingReport();
        
        const retrieved = stateManager.getPendingReport();
        expect(retrieved).toBeUndefined();
      });
    });
  });

  describe('Scraper 状态管理', () => {
    describe('getScrapedData / setScrapedData', () => {
      it('应该能够设置和获取抓取的数据', () => {
        const data = { asin: 'B001', title: 'Product 1' };
        
        stateManager.setScrapedData(data);
        
        const retrieved = stateManager.getScrapedData();
        expect(retrieved).toEqual(data);
      });
    });

    describe('getIsScraping / setIsScraping', () => {
      it('应该能够设置和获取抓取状态', () => {
        stateManager.setIsScraping(true);
        expect(stateManager.getIsScraping()).toBe(true);
      });
    });

    describe('getScraperStatus / setScraperStatus', () => {
      it('应该能够设置和获取 Scraper 状态', () => {
        stateManager.setScraperStatus('scraping');
        expect(stateManager.getScraperStatus()).toBe('scraping');
      });
    });

    describe('getSelectedSite / setSelectedSite', () => {
      it('应该能够设置和获取选中的站点', () => {
        stateManager.setSelectedSite('amazon.com');
        expect(stateManager.getSelectedSite()).toBe('amazon.com');
      });
    });


    describe('getCurrentHistoryId / setCurrentHistoryId', () => {
      it('应该能够设置和获取当前历史记录 ID', () => {
        stateManager.setCurrentHistoryId('hist-001');
        expect(stateManager.getCurrentHistoryId()).toBe('hist-001');
      });
    });

    describe('getInputAsins / setInputAsins', () => {
      it('应该能够设置和获取输入的 ASINs', () => {
        stateManager.setInputAsins('B001,B002,B003');
        expect(stateManager.getInputAsins()).toBe('B001,B002,B003');
      });
    });

    describe('getScraperProgress / setScraperProgress', () => {
      it('应该能够设置和获取抓取进度', () => {
        stateManager.setScraperProgress(50);
        expect(stateManager.getScraperProgress()).toBe(50);
      });
    });

    describe('getScraperError / setScraperError', () => {
      it('应该能够设置和获取错误信息', () => {
        stateManager.setScraperError('Network error');
        expect(stateManager.getScraperError()).toBe('Network error');
      });
    });

    describe('getScraperExpandedAsin / setScraperExpandedAsin', () => {
      it('应该能够设置和获取展开的 ASIN', () => {
        stateManager.setScraperExpandedAsin('B001');
        expect(stateManager.getScraperExpandedAsin()).toBe('B001');
      });
    });

    describe('getCurrentDataTab / setCurrentDataTab', () => {
      it('应该能够设置和获取当前数据标签页', () => {
        stateManager.setCurrentDataTab('json');
        expect(stateManager.getCurrentDataTab()).toBe('json');
      });
    });

    describe('updateScraper', () => {
      it('应该能够批量更新 Scraper 状态', () => {
        stateManager.updateScraper({
          isScraping: true,
          progress: 75,
          error: 'Test error'
        });
        
        expect(stateManager.getIsScraping()).toBe(true);
        expect(stateManager.getScraperProgress()).toBe(75);
        expect(stateManager.getScraperError()).toBe('Test error');
      });
    });

    describe('resetScraper', () => {
      it('应该能够重置 Scraper 状态', () => {
        stateManager.setIsScraping(true);
        stateManager.setScrapedData({ test: 'data' });
        
        stateManager.resetScraper();
        
        expect(stateManager.getIsScraping()).toBe(false);
        expect(stateManager.getScrapedData()).toBeNull();
      });
    });
  });


  describe('PromptLab 状态管理', () => {
    describe('getUserProductProfile / setUserProductProfile', () => {
      it('应该能够设置和获取用户产品配置', () => {
        const profile = {
          targetMarket: 'US',
          keywords: ['keyword1', 'keyword2']
        };
        
        stateManager.setUserProductProfile(profile);
        
        const retrieved = stateManager.getUserProductProfile();
        expect(retrieved).toEqual(profile);
      });
    });

    describe('getCurrentPrompt / setCurrentPrompt', () => {
      it('应该能够设置和获取当前 Prompt', () => {
        const prompt = 'Test prompt content';
        
        stateManager.setCurrentPrompt(prompt);
        
        expect(stateManager.getCurrentPrompt()).toBe(prompt);
      });
    });

    describe('getPromptHistory / addPromptHistory', () => {
      it('应该能够添加 Prompt 历史记录', () => {
        const item1 = { id: '1', prompt: 'Prompt 1', timestamp: Date.now() };
        const item2 = { id: '2', prompt: 'Prompt 2', timestamp: Date.now() };
        
        stateManager.addPromptHistory(item1);
        stateManager.addPromptHistory(item2);
        
        const history = stateManager.getPromptHistory();
        expect(history).toHaveLength(2);
        expect(history[0]).toEqual(item1);
      });
    });

    describe('getSelectedModel / setSelectedModel', () => {
      it('应该能够设置和获取选中的模型', () => {
        stateManager.setSelectedModel('gpt-4');
        expect(stateManager.getSelectedModel()).toBe('gpt-4');
      });
    });

    describe('getTemperature / setTemperature', () => {
      it('应该能够设置和获取温度参数', () => {
        stateManager.setTemperature(0.9);
        expect(stateManager.getTemperature()).toBe(0.9);
      });
    });

    describe('getMaxTokens / setMaxTokens', () => {
      it('应该能够设置和获取最大 Token 数', () => {
        stateManager.setMaxTokens(4000);
        expect(stateManager.getMaxTokens()).toBe(4000);
      });
    });

    describe('updatePromptLab', () => {
      it('应该能够批量更新 PromptLab 状态', () => {
        stateManager.updatePromptLab({
          selectedModel: 'gpt-4',
          temperature: 0.8,
          maxTokens: 3000
        });
        
        expect(stateManager.getSelectedModel()).toBe('gpt-4');
        expect(stateManager.getTemperature()).toBe(0.8);
        expect(stateManager.getMaxTokens()).toBe(3000);
      });
    });


    describe('resetPromptLab', () => {
      it('应该能够重置 PromptLab 状态', () => {
        stateManager.setCurrentPrompt('Test prompt');
        stateManager.setSelectedModel('gpt-4');
        
        stateManager.resetPromptLab();
        
        expect(stateManager.getCurrentPrompt()).toBe('');
        expect(stateManager.getSelectedModel()).toBe('');
      });
    });
  });

  describe('KeywordTracker 状态管理', () => {
    describe('getKeywords / setKeywords', () => {
      it('应该能够设置和获取关键词列表', () => {
        const keywords = ['keyword1', 'keyword2', 'keyword3'];
        
        stateManager.setKeywords(keywords);
        
        const retrieved = stateManager.getKeywords();
        expect(retrieved).toEqual(keywords);
      });
    });

    describe('getProcessedCopy / setProcessedCopy', () => {
      it('应该能够设置和获取处理后的文案', () => {
        const copy = 'Processed copy content';
        
        stateManager.setProcessedCopy(copy);
        
        expect(stateManager.getProcessedCopy()).toBe(copy);
      });
    });
  });

  describe('UI 状态管理', () => {
    describe('getCurrentTab / setCurrentTab', () => {
      it('应该能够设置和获取当前标签页', () => {
        stateManager.setCurrentTab('settings');
        expect(stateManager.getCurrentTab()).toBe('settings');
      });
    });

    describe('getTheme / setTheme', () => {
      it('应该能够设置和获取主题', () => {
        stateManager.setTheme('dark');
        expect(stateManager.getTheme()).toBe('dark');
      });
    });

    describe('getLoading / setLoading', () => {
      it('应该能够设置和获取加载状态', () => {
        stateManager.setLoading(true);
        expect(stateManager.getLoading()).toBe(true);
      });
    });
  });

  describe('通用方法', () => {
    describe('subscribe', () => {
      it('应该能够订阅状态变化', () => {
        const callback = vi.fn();
        
        const unsubscribe = stateManager.subscribe(
          (state) => state.analysis.analysisReport,
          callback
        );
        
        const report = { summary: 'New Report' };
        stateManager.setAnalysisReport(report);
        
        expect(callback).toHaveBeenCalledWith(report);
        
        unsubscribe();
      });

      it('应该在取消订阅后不再触发回调', () => {
        const callback = vi.fn();
        
        const unsubscribe = stateManager.subscribe(
          (state) => state.analysis.analysisReport,
          callback
        );
        
        unsubscribe();
        
        stateManager.setAnalysisReport({ summary: 'Report' });
        
        expect(callback).not.toHaveBeenCalled();
      });

      it('应该只在值变化时触发回调', () => {
        const callback = vi.fn();
        
        // 先设置一个初始值
        stateManager.setCurrentTab('home');
        
        // 然后订阅
        stateManager.subscribe(
          (state) => state.ui.currentTab,
          callback
        );
        
        // 设置相同值，不应该触发回调
        stateManager.setCurrentTab('home');
        expect(callback).toHaveBeenCalledTimes(0);
        
        // 设置不同值，应该触发回调
        stateManager.setCurrentTab('settings');
        expect(callback).toHaveBeenCalledTimes(1);
        
        // 再次设置相同值，不应该再次触发
        stateManager.setCurrentTab('settings');
        expect(callback).toHaveBeenCalledTimes(1);
      });
    });


    describe('getSnapshot', () => {
      it('应该返回完整的状态快照', () => {
        stateManager.setCurrentTab('settings');
        stateManager.setAnalysisReport({ summary: 'Test' });
        
        const snapshot = stateManager.getSnapshot();
        
        expect(snapshot.ui.currentTab).toBe('settings');
        expect(snapshot.analysis.analysisReport).toEqual({ summary: 'Test' });
      });
    });

    describe('restoreSnapshot', () => {
      it('应该能够恢复状态快照', () => {
        const snapshot = stateManager.getSnapshot();
        
        stateManager.setCurrentTab('settings');
        stateManager.setAnalysisReport({ summary: 'Modified' });
        
        stateManager.restoreSnapshot(snapshot);
        
        expect(stateManager.getCurrentTab()).toBe(snapshot.ui.currentTab);
        expect(stateManager.getAnalysisReport()).toEqual(snapshot.analysis.analysisReport);
      });

      it('应该支持部分状态恢复', () => {
        stateManager.setCurrentTab('home');
        
        stateManager.restoreSnapshot({
          ui: { currentTab: 'settings', theme: 'dark', loading: false, sidebarCollapsed: false, currentDataTab: 'preview', currentReportTab: 'report' }
        });
        
        expect(stateManager.getCurrentTab()).toBe('settings');
      });
    });

    describe('clear', () => {
      it('应该能够清空所有状态', () => {
        stateManager.setAnalysisReport({ summary: 'Test' });
        stateManager.setScrapedData({ test: 'data' });
        stateManager.setCurrentPrompt('Test prompt');
        
        stateManager.clear();
        
        expect(stateManager.getAnalysisReport()).toBeNull();
        expect(stateManager.getScrapedData()).toBeNull();
        expect(stateManager.getCurrentPrompt()).toBe('');
      });
    });
  });

  describe('中间件系统', () => {
    describe('use', () => {
      it('应该能够添加中间件', () => {
        const middleware: Middleware = vi.fn();
        
        stateManager.use(middleware);
        stateManager.setCurrentTab('settings');
        
        expect(middleware).toHaveBeenCalled();
      });

      it('应该按顺序执行多个中间件', () => {
        const order: number[] = [];
        
        const middleware1: Middleware = () => order.push(1);
        const middleware2: Middleware = () => order.push(2);
        const middleware3: Middleware = () => order.push(3);
        
        stateManager.use(middleware1);
        stateManager.use(middleware2);
        stateManager.use(middleware3);
        
        stateManager.setCurrentTab('settings');
        
        expect(order).toEqual([1, 2, 3]);
      });

      it('中间件应该接收正确的参数', () => {
        const middleware: Middleware = vi.fn();
        
        stateManager.use(middleware);
        
        const report = { summary: 'Test' };
        stateManager.setAnalysisReport(report);
        
        expect(middleware).toHaveBeenCalledWith(
          expect.anything(),
          'setAnalysisReport',
          report
        );
      });
    });


    describe('removeMiddleware', () => {
      it('应该能够移除中间件', () => {
        const middleware: Middleware = vi.fn();
        
        stateManager.use(middleware);
        stateManager.removeMiddleware(middleware);
        
        stateManager.setCurrentTab('settings');
        
        expect(middleware).not.toHaveBeenCalled();
      });
    });

    it('中间件错误不应该影响状态更新', () => {
      const errorMiddleware: Middleware = () => {
        throw new Error('Middleware error');
      };
      
      stateManager.use(errorMiddleware);
      
      expect(() => {
        stateManager.setCurrentTab('settings');
      }).not.toThrow();
      
      expect(stateManager.getCurrentTab()).toBe('settings');
    });
  });

  describe('时间旅行功能', () => {
    let timeTravelManager: StateManager;

    beforeEach(() => {
      // 重置单例实例
      (StateManager as any).resetInstance();
      
      // 创建启用时间旅行的实例
      timeTravelManager = StateManager.getInstance({
        enableTimeTravel: true,
        maxSnapshots: 5
      });
    });

    afterEach(() => {
      // 清理：重置回默认实例
      (StateManager as any).resetInstance();
    });

    describe('createSnapshot', () => {
      it('应该能够创建快照', () => {
        timeTravelManager.setCurrentTab('settings');
        
        const snapshotId = timeTravelManager.createSnapshot('Test snapshot');
        
        expect(snapshotId).toBeTruthy();
        expect(snapshotId).toMatch(/^snapshot_/);
      });

      it('应该限制快照数量', () => {
        for (let i = 0; i < 10; i++) {
          timeTravelManager.createSnapshot(`Snapshot ${i}`);
        }
        
        const snapshots = timeTravelManager.getSnapshotList();
        expect(snapshots.length).toBeLessThanOrEqual(5);
      });

      it('未启用时间旅行时应该返回空字符串', () => {
        // 重置实例以创建未启用时间旅行的实例
        (StateManager as any).resetInstance();
        const normalManager = StateManager.getInstance({ enableTimeTravel: false });
        const snapshotId = normalManager.createSnapshot();
        
        expect(snapshotId).toBe('');
      });
    });

    describe('restoreSnapshotById', () => {
      it('应该能够根据 ID 恢复快照', () => {
        timeTravelManager.setCurrentTab('home');
        const snapshotId = timeTravelManager.createSnapshot();
        
        timeTravelManager.setCurrentTab('settings');
        
        const restored = timeTravelManager.restoreSnapshotById(snapshotId);
        
        expect(restored).toBe(true);
        expect(timeTravelManager.getCurrentTab()).toBe('home');
      });

      it('快照不存在时应该返回 false', () => {
        const restored = timeTravelManager.restoreSnapshotById('non-existent');
        
        expect(restored).toBe(false);
      });
    });

    describe('undo / redo', () => {
      it('应该能够撤销操作', () => {
        timeTravelManager.setCurrentTab('home');
        timeTravelManager.createSnapshot('Initial');
        
        timeTravelManager.setCurrentTab('settings');
        timeTravelManager.createSnapshot('After change');
        
        const undone = timeTravelManager.undo();
        
        expect(undone).toBe(true);
        expect(timeTravelManager.getCurrentTab()).toBe('home');
      });

      it('应该能够重做操作', () => {
        timeTravelManager.setCurrentTab('home');
        timeTravelManager.createSnapshot('Initial');
        
        timeTravelManager.setCurrentTab('settings');
        timeTravelManager.createSnapshot('After change');
        
        timeTravelManager.undo();
        const redone = timeTravelManager.redo();
        
        expect(redone).toBe(true);
        expect(timeTravelManager.getCurrentTab()).toBe('settings');
      });

      it('没有历史时撤销应该返回 false', () => {
        const undone = timeTravelManager.undo();
        expect(undone).toBe(false);
      });

      it('在历史末尾时重做应该返回 false', () => {
        timeTravelManager.createSnapshot();
        const redone = timeTravelManager.redo();
        expect(redone).toBe(false);
      });
    });


    describe('canUndo / canRedo', () => {
      it('应该正确判断是否可以撤销', () => {
        expect(timeTravelManager.canUndo()).toBe(false);
        
        timeTravelManager.createSnapshot();
        timeTravelManager.createSnapshot();
        
        expect(timeTravelManager.canUndo()).toBe(true);
      });

      it('应该正确判断是否可以重做', () => {
        timeTravelManager.createSnapshot();
        timeTravelManager.createSnapshot();
        
        expect(timeTravelManager.canRedo()).toBe(false);
        
        timeTravelManager.undo();
        
        expect(timeTravelManager.canRedo()).toBe(true);
      });
    });

    describe('getSnapshotList', () => {
      it('应该返回快照列表（不包含状态数据）', () => {
        timeTravelManager.createSnapshot('Snapshot 1');
        timeTravelManager.createSnapshot('Snapshot 2');
        
        const list = timeTravelManager.getSnapshotList();
        
        expect(list).toHaveLength(2);
        expect(list[0]).toHaveProperty('id');
        expect(list[0]).toHaveProperty('timestamp');
        expect(list[0]).toHaveProperty('description');
        expect(list[0]).not.toHaveProperty('state');
      });
    });

    describe('getCurrentSnapshotIndex', () => {
      it('应该返回当前快照索引', () => {
        expect(timeTravelManager.getCurrentSnapshotIndex()).toBe(-1);
        
        timeTravelManager.createSnapshot();
        expect(timeTravelManager.getCurrentSnapshotIndex()).toBe(0);
        
        timeTravelManager.createSnapshot();
        expect(timeTravelManager.getCurrentSnapshotIndex()).toBe(1);
      });
    });

    describe('clearSnapshotHistory', () => {
      it('应该能够清空快照历史', () => {
        timeTravelManager.createSnapshot();
        timeTravelManager.createSnapshot();
        
        timeTravelManager.clearSnapshotHistory();
        
        expect(timeTravelManager.getSnapshotList()).toHaveLength(0);
        expect(timeTravelManager.getCurrentSnapshotIndex()).toBe(-1);
      });
    });

    describe('deleteSnapshot', () => {
      it('应该能够删除指定快照', () => {
        const id1 = timeTravelManager.createSnapshot('Snapshot 1');
        timeTravelManager.createSnapshot('Snapshot 2');
        
        const deleted = timeTravelManager.deleteSnapshot(id1);
        
        expect(deleted).toBe(true);
        expect(timeTravelManager.getSnapshotList()).toHaveLength(1);
      });

      it('删除不存在的快照应该返回 false', () => {
        const deleted = timeTravelManager.deleteSnapshot('non-existent');
        expect(deleted).toBe(false);
      });
    });

    describe('exportSnapshot / importSnapshot', () => {
      it('应该能够导出快照为 JSON', () => {
        timeTravelManager.setCurrentTab('settings');
        const snapshotId = timeTravelManager.createSnapshot('Test export');
        
        const json = timeTravelManager.exportSnapshot(snapshotId);
        
        expect(json).toBeTruthy();
        expect(() => JSON.parse(json)).not.toThrow();
        
        const parsed = JSON.parse(json);
        expect(parsed).toHaveProperty('id');
        expect(parsed).toHaveProperty('state');
      });

      it('应该能够导出当前状态', () => {
        timeTravelManager.setCurrentTab('settings');
        
        const json = timeTravelManager.exportSnapshot();
        const parsed = JSON.parse(json);
        
        expect(parsed.state.ui.currentTab).toBe('settings');
      });

      it('应该能够导入快照', () => {
        timeTravelManager.setCurrentTab('home');
        const json = timeTravelManager.exportSnapshot();
        
        timeTravelManager.setCurrentTab('settings');
        
        const importedId = timeTravelManager.importSnapshot(json, true);
        
        expect(importedId).toBeTruthy();
        expect(timeTravelManager.getCurrentTab()).toBe('home');
      });

      it('导入无效 JSON 应该抛出错误', () => {
        expect(() => {
          timeTravelManager.importSnapshot('invalid json');
        }).toThrow();
      });

      it('导入格式错误的快照应该抛出错误', () => {
        expect(() => {
          timeTravelManager.importSnapshot('{"invalid": "snapshot"}');
        }).toThrow('Invalid snapshot format');
      });
    });
  });


  describe('边界情况和错误处理', () => {
    it('应该处理 null 值', () => {
      stateManager.setAnalysisReport(null as any);
      expect(stateManager.getAnalysisReport()).toBeNull();
    });

    it('应该处理 undefined 值', () => {
      stateManager.setScraperError(undefined);
      expect(stateManager.getScraperError()).toBeUndefined();
    });

    it('应该处理空数组', () => {
      stateManager.setSelectedAsins([]);
      expect(stateManager.getSelectedAsins()).toEqual([]);
    });

    it('应该处理空字符串', () => {
      stateManager.setCurrentPrompt('');
      expect(stateManager.getCurrentPrompt()).toBe('');
    });

    it('应该处理复杂嵌套对象', () => {
      const complexData = {
        level1: {
          level2: {
            level3: {
              value: 'deep value',
              array: [1, 2, 3]
            }
          }
        }
      };
      
      stateManager.setScrapedData(complexData);
      
      const retrieved = stateManager.getScrapedData();
      expect(retrieved).toEqual(complexData);
    });

    it('应该处理大数组', () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => `item-${i}`);
      
      stateManager.setKeywords(largeArray);
      
      const retrieved = stateManager.getKeywords();
      expect(retrieved).toHaveLength(1000);
    });
  });

  describe('性能测试', () => {
    it('批量更新应该比单独更新更快', () => {
      const startBatch = performance.now();
      stateManager.updateScraper({
        isScraping: true,
        progress: 50,
        error: 'test',
        inputAsins: 'B001,B002'
      });
      const endBatch = performance.now();
      const batchTime = endBatch - startBatch;
      
      stateManager.resetScraper();
      
      const startIndividual = performance.now();
      stateManager.setIsScraping(true);
      stateManager.setScraperProgress(50);
      stateManager.setScraperError('test');
      stateManager.setInputAsins('B001,B002');
      const endIndividual = performance.now();
      const individualTime = endIndividual - startIndividual;
      
      // 批量更新应该更快或相近
      expect(batchTime).toBeLessThanOrEqual(individualTime * 1.5);
    });

    it('订阅大量状态变化应该保持性能', () => {
      const callbacks = Array.from({ length: 100 }, () => vi.fn());
      
      callbacks.forEach(callback => {
        stateManager.subscribe(
          (state) => state.ui.currentTab,
          callback
        );
      });
      
      const start = performance.now();
      stateManager.setCurrentTab('settings');
      const end = performance.now();
      
      expect(end - start).toBeLessThan(100); // 应该在 100ms 内完成
      callbacks.forEach(callback => {
        expect(callback).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('集成测试', () => {
    it('应该支持完整的工作流程', () => {
      // 1. 设置初始状态
      stateManager.setCurrentTab('analysis');
      stateManager.setSelectedAsins(['B001', 'B002']);
      
      // 2. 开始分析
      stateManager.setIsAnalyzing(true);
      
      // 3. 设置分析结果
      const report = { summary: 'Analysis complete', data: [] };
      stateManager.setAnalysisReport(report);
      
      // 4. 结束分析
      stateManager.setIsAnalyzing(false);
      
      // 5. 验证状态
      expect(stateManager.getCurrentTab()).toBe('analysis');
      expect(stateManager.getSelectedAsins()).toEqual(['B001', 'B002']);
      expect(stateManager.getAnalysisReport()).toEqual(report);
      expect(stateManager.getIsAnalyzing()).toBe(false);
    });

    it('应该支持跨模块状态协调', () => {
      // Scraper 模块抓取数据
      stateManager.setIsScraping(true);
      stateManager.setScrapedData({ asin: 'B001', title: 'Product' });
      stateManager.setIsScraping(false);
      
      // Analysis 模块使用抓取的数据
      const scrapedData = stateManager.getScrapedData();
      stateManager.setSelectedAsins([scrapedData.asin]);
      stateManager.setIsAnalyzing(true);
      
      // 验证状态协调
      expect(stateManager.getSelectedAsins()).toEqual(['B001']);
      expect(stateManager.getIsAnalyzing()).toBe(true);
    });
  });
});

// src/modules/app_center/views/master_analysis/ai_analysis/components/AlpinePanelOptimized.ts
/**
 * AI 分析 Alpine 组件 - 优化版
 * 直接使用 Zustand，消除手动状态同步
 */

import { appStore } from '@/stores/useAppStore';
import { analysisTargets } from '../config/analysisTargets';
import { createComputedProperties } from './computedProperties';

import { Logger } from '../../../../../../services/loggerService';
/**
 * 创建 AI 分析面板组件（优化版）
 * 使用 Zustand 订阅自动同步状态
 */
export function createAiAnalysisPanelOptimized(): Record<string, unknown> {
  return {
    // ========== 响应式状态 ==========
    // 这些状态直接从 Zustand 读取，不需要本地副本
    get selectedAsins() {
      return appStore.getState().analysis.selectedAsins;
    },
    set selectedAsins(value: string[]) {
      appStore.getState().setSelectedAsins(value);
    },

    get selectedTargets(): string[] {
      return this._selectedTargets as string[];
    },
    set selectedTargets(value: string[]) {
      this._selectedTargets = value;
    },
    _selectedTargets: [] as string[],

    get isAnalyzing() {
      return appStore.getState().analysis.isAnalyzing || false;
    },
    set isAnalyzing(value: boolean) {
      appStore.getState().updateAnalysis({ isAnalyzing: value });
    },

    progress: 0,
    currentStep: '',

    get analysisReport() {
      return appStore.getState().analysis.analysisReport;
    },
    set analysisReport(value: unknown) {
      appStore.getState().setAnalysisReport(value);
    },

    get hasReport() {
      return !!appStore.getState().analysis.analysisReport;
    },

    // UI 状态
    expandedPromptIndex: null as number | null,
    showPromptPanel: false,
    showJsonViewer: false,

    // 数据源
    useRealData: true,
    dataSource: 'scraper' as 'sample' | 'scraper',
    showDataSourceBanner: true,

    // Zustand 订阅清理函数
    _unsubscribe: null as (() => void) | null | undefined,

    // ========== 生命周期 ==========
    init() {
      Logger.debug('[Alpine 组件] 🚀 初始化 AI 分析面板（优化版）');

      // 从 Zustand 初始化状态
      const scrapedData = appStore.getState().scraper.scrapedData;
      if (scrapedData?.products && scrapedData.products.length > 0) {
        const asins = scrapedData.products
          .map((p: unknown) => p.asin)
          .filter((asin: string) => !!asin);
        appStore.getState().setSelectedAsins(asins);
        this.dataSource = 'scraper';
      }

      // 订阅 Zustand 状态变化
      this._unsubscribe = appStore.subscribe(() => {
        // Alpine 会自动检测 getter 的变化并重新渲染
        // 不需要手动同步
        if (typeof (this as any).$nextTick === 'function') {
          (this as any).$nextTick(() => {
            // 强制更新计算属性
            if (typeof (this as any).$refresh === 'function') {
              (this as any).$refresh();
            }
          });
        }
      });

      Logger.debug('[Alpine 组件] ✅ 初始化完成');
    },

    destroy() {
      Logger.debug('[Alpine 组件] 🔄 销毁组件');
      // 清理订阅
      if (typeof this._unsubscribe === 'function') {
        this._unsubscribe();
      }
    },

    // ========== Actions ==========
    toggleAsin(asin: string) {
      const current = this.selectedAsins as string[];
      const index = current.indexOf(asin);
      if (index > -1) {
        appStore.getState().setSelectedAsins(current.filter((a: string) => a !== asin));
      } else {
        appStore.getState().setSelectedAsins([...current, asin]);
      }
    },

    selectAllAsins() {
      const scrapedData = appStore.getState().scraper.scrapedData;
      if (scrapedData?.products) {
        const asins = scrapedData.products
          .map((p: unknown) => p.asin)
          .filter((asin: string) => !!asin);
        appStore.getState().setSelectedAsins(asins);
      }
    },

    clearAllAsins() {
      appStore.getState().setSelectedAsins([]);
    },

    toggleTarget(targetId: string) {
      const targets = this._selectedTargets as string[];
      const index = targets.indexOf(targetId);
      if (index > -1) {
        targets.splice(index, 1);
      } else {
        targets.push(targetId);
      }
    },

    selectAllTargets() {
      this._selectedTargets = analysisTargets.map(t => t.id);
    },

    clearAllTargets() {
      this._selectedTargets = [];
    },

    togglePromptPanel() {
      this.showPromptPanel = !this.showPromptPanel;
    },

    togglePromptItem(index: number) {
      this.expandedPromptIndex = this.expandedPromptIndex === index ? null : index;
    },

    toggleJsonViewer() {
      this.showJsonViewer = !this.showJsonViewer;
    },

    // ========== 计算属性 ==========
    get currentProducts() {
      return createComputedProperties(this as any).currentProducts;
    },
    get availableAsins() {
      return createComputedProperties(this as any).availableAsins;
    },
    get hasData() {
      return createComputedProperties(this as any).hasData;
    },
    get canAnalyze() {
      return createComputedProperties(this as any).canAnalyze;
    },
    get analysisTargets() {
      return createComputedProperties(this as any).analysisTargets;
    },
    get results() {
      return createComputedProperties(this as any).results;
    },
    get listingsResults() {
      return createComputedProperties(this as any).listingsResults;
    },
    get reviewsResults() {
      return createComputedProperties(this as any).reviewsResults;
    },
    get totalHighlights() {
      return createComputedProperties(this as any).totalHighlights;
    },
    get totalDetails() {
      return createComputedProperties(this as any).totalDetails;
    },
    get hasScraperData() {
      return createComputedProperties(this as any).hasScraperData;
    },
    get dataSourceLabel() {
      return createComputedProperties(this as any).dataSourceLabel;
    },
    get dataSourceMarketplace() {
      return createComputedProperties(this as any).dataSourceMarketplace;
    },
    get dataSourceTimestamp() {
      return createComputedProperties(this as any).dataSourceTimestamp;
    },
    get fullReportData() {
      return createComputedProperties(this as any).fullReportData;
    },
    get totalTokenCount() {
      return createComputedProperties(this as any).totalTokenCount;
    },
    get formattedTotalTokenCount() {
      return createComputedProperties(this as any).formattedTotalTokenCount;
    },

    // ========== 数据加载 ==========
    async startAnalysis() {
      if ((this.selectedAsins as string[]).length === 0) {
        Logger.warn('[Alpine 组件] ⚠️ 未选择任何 ASIN');
        return;
      }

      if ((this._selectedTargets as string[]).length === 0) {
        Logger.warn('[Alpine 组件] ⚠️ 未选择任何分析目标');
        return;
      }

      this.isAnalyzing = true;
      this.progress = 0;
      this.currentStep = '准备分析...';

      try {
        // 调用分析服务
        // ... 分析逻辑

        this.progress = 100;
        this.currentStep = '分析完成';
      } catch (error) {
        Logger.error('[Alpine 组件] ❌ 分析失败:', error);
      } finally {
        this.isAnalyzing = false;
      }
    }
  };
}

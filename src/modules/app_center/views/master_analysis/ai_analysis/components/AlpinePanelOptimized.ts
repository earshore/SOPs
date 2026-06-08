// src/modules/app_center/views/master_analysis/ai_analysis/components/AlpinePanelOptimized.ts
/**
 * AI 分析 Alpine 组件 - 优化版
 * 直接使用 Zustand，消除手动状态同步
 */

import { appStore } from '@/stores/useAppStore';
import { analysisTargets } from '../config/analysisTargets';
import { createComputedProperties } from './computedProperties';
import type { AnalysisReport } from '@/types/modules-business';
import type { AlpineContext } from '../types';

type ConfidencePanel = {
  getTargetConfidence: (targetId: string) => number;
  getConfidenceLevel: (percent: number) => string;
};

type AlpineRefreshContext = {
  $nextTick?: (callback: () => void) => void;
  $refresh?: () => void;
};

function getPanelComputedProperties(panel: unknown) {
  return createComputedProperties(panel as AlpineContext);
}

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
      // 类型守卫：确保 value 是有效的分析报告对象
      if (value && typeof value === 'object') {
        appStore.getState().setAnalysisReport(value as AnalysisReport);
      } else {
        appStore.getState().setAnalysisReport(null);
      }
    },

    get hasReport() {
      return !!appStore.getState().analysis.analysisReport;
    },

    // 置信度相关
    get reportConfidence() {
      const report = appStore.getState().analysis.analysisReport;
      if (!report || typeof report === 'string') {
        console.log('[置信度] reportConfidence: 报告不存在或为字符串');
        return null;
      }
      if (!report._metadata) {
        console.warn('[置信度] reportConfidence: 报告缺少 _metadata 字段');
        return null;
      }
      const confidence = report._metadata.confidence || null;
      console.log('[置信度] reportConfidence:', confidence);
      return confidence;
    },

    get overallConfidence() {
      const report = appStore.getState().analysis.analysisReport;
      if (!report || typeof report === 'string') {
        console.log('[置信度] overallConfidence: 报告不存在或为字符串');
        return 0;
      }
      if (!report._metadata) {
        console.warn('[置信度] overallConfidence: 报告缺少 _metadata 字段');
        return 0;
      }
      const overall = report._metadata.overallConfidence || 0;
      console.log('[置信度] overallConfidence:', overall);
      return overall;
    },

    get overallConfidencePercent() {
      const percent = Math.round((this.overallConfidence as number) * 100);
      console.log('[置信度] overallConfidencePercent:', percent + '%');
      return percent;
    },

    get hasConfidenceData() {
      const hasData = !!this.reportConfidence;
      console.log('[置信度] hasConfidenceData:', hasData);
      return hasData;
    },

    // 获取特定目标的置信度
    getTargetConfidence(targetId: string): number {
      const confidence = this.reportConfidence as Record<string, number> | null;
      if (!confidence || !confidence[targetId]) return 0;
      return Math.round(confidence[targetId] * 100);
    },

    // 获取置信度颜色类（使用设计令牌）
    getConfidenceColorClass(targetId: string): string {
      const percent = (this as ConfidencePanel).getTargetConfidence(targetId);
      if (percent >= 70) return 'confidence-high-bg confidence-high-text confidence-high-border';
      if (percent >= 50) return 'confidence-medium-bg confidence-medium-text confidence-medium-border';
      return 'confidence-low-bg confidence-low-text confidence-low-border';
    },

    // 获取置信度背景颜色类（带透明度）
    getConfidenceBgAlphaClass(percent: number): string {
      if (percent >= 70) return 'confidence-high-bg-alpha';
      if (percent >= 50) return 'confidence-medium-bg-alpha';
      return 'confidence-low-bg-alpha';
    },

    // 获取置信度文本颜色类（浅色版本）
    getConfidenceTextLightClass(percent: number): string {
      if (percent >= 70) return 'confidence-high-text-light';
      if (percent >= 50) return 'confidence-medium-text-light';
      return 'confidence-low-text-light';
    },

    // 获取置信度文本和边框颜色类（用于徽章）
    getConfidenceTextBorderClass(percent: number): string {
      if (percent >= 70) return 'confidence-high-text confidence-high-border';
      if (percent >= 50) return 'confidence-medium-text confidence-medium-border';
      return 'confidence-low-text confidence-low-border';
    },

    // 获取置信度等级文本（用于可访问性）
    getConfidenceLevel(percent: number): string {
      if (percent >= 70) return '高';
      if (percent >= 50) return '中';
      return '低';
    },

    // 获取置信度 ARIA 标签
    getConfidenceAriaLabel(percent: number): string {
      const level = (this as ConfidencePanel).getConfidenceLevel(percent);
      return `置信度: ${percent}%, 等级: ${level}`;
    },

    // UI 状态
    expandedPromptIndex: null as number | null,
    showPromptPanel: false,
    showJsonViewer: false,

    // 数据源
    dataSource: 'scraper' as const,

    // Zustand 订阅清理函数
    _unsubscribe: null as (() => void) | null | undefined,

    // ========== 生命周期 ==========
    init() {
      console.log('[Alpine 组件] 🚀 初始化 AI 分析面板（优化版）');

      // 从 Zustand 初始化状态
      const scrapedData = appStore.getState().scraper.scrapedData;
      if (scrapedData?.products && scrapedData.products.length > 0) {
        const asins = scrapedData.products
          .map((p: unknown) => {
            // 类型守卫：确保 p 是对象且有 asin 属性
            if (p && typeof p === 'object' && 'asin' in p) {
              return (p as { asin: string }).asin;
            }
            return '';
          })
          .filter((asin: string) => !!asin);
        appStore.getState().setSelectedAsins(asins);
        this.dataSource = 'scraper';
      }

      // 订阅 Zustand 状态变化
      this._unsubscribe = appStore.subscribe(() => {
        // Alpine 会自动检测 getter 的变化并重新渲染
        // 不需要手动同步
        const alpine = this as AlpineRefreshContext;
        if (typeof alpine.$nextTick === 'function') {
          alpine.$nextTick(() => {
            // 强制更新计算属性
            if (typeof alpine.$refresh === 'function') {
              alpine.$refresh();
            }
          });
        }
      });

      console.log('[Alpine 组件] ✅ 初始化完成');
    },

    destroy() {
      console.log('[Alpine 组件] 🔄 销毁组件');
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
          .map((p: unknown) => {
            // 类型守卫：确保 p 是对象且有 asin 属性
            if (p && typeof p === 'object' && 'asin' in p) {
              return (p as { asin: string }).asin;
            }
            return '';
          })
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
      return getPanelComputedProperties(this).currentProducts;
    },
    get availableAsins() {
      return getPanelComputedProperties(this).availableAsins;
    },
    get hasData() {
      return getPanelComputedProperties(this).hasData;
    },
    get canAnalyze() {
      return getPanelComputedProperties(this).canAnalyze;
    },
    get analysisTargets() {
      return getPanelComputedProperties(this).analysisTargets;
    },
    get results() {
      return getPanelComputedProperties(this).results;
    },
    get listingsResults() {
      return getPanelComputedProperties(this).listingsResults;
    },
    get reviewsResults() {
      return getPanelComputedProperties(this).reviewsResults;
    },
    get totalHighlights() {
      return getPanelComputedProperties(this).totalHighlights;
    },
    get totalDetails() {
      return getPanelComputedProperties(this).totalDetails;
    },
    get hasScraperData() {
      return getPanelComputedProperties(this).hasScraperData;
    },
    get dataSourceLabel() {
      return getPanelComputedProperties(this).dataSourceLabel;
    },
    get dataSourceMarketplace() {
      return getPanelComputedProperties(this).dataSourceMarketplace;
    },
    get dataSourceTimestamp() {
      return getPanelComputedProperties(this).dataSourceTimestamp;
    },
    get fullReportData() {
      return getPanelComputedProperties(this).fullReportData;
    },
    get totalTokenCount() {
      return getPanelComputedProperties(this).totalTokenCount;
    },
    get formattedTotalTokenCount() {
      return getPanelComputedProperties(this).formattedTotalTokenCount;
    },

    // ========== 数据加载 ==========
    async startAnalysis() {
      if ((this.selectedAsins as string[]).length === 0) {
        console.warn('[Alpine 组件] ⚠️ 未选择任何 ASIN');
        return;
      }

      if ((this._selectedTargets as string[]).length === 0) {
        console.warn('[Alpine 组件] ⚠️ 未选择任何分析目标');
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
        console.error('[Alpine 组件] ❌ 分析失败:', error);
      } finally {
        this.isAnalyzing = false;
      }
    }
  };
}

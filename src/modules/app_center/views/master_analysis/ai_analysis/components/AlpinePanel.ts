/**
 * Alpine.js 组件主入口
 * 整合所有子模块，创建完整的 AI 分析面板组件
 */

import state from '@common/state';
import { analysisTargets } from '../config/analysisTargets';
import { checkAndLoadScraperData, checkLoadedReport, loadHistoricalReport } from './dataLoaders';
import { formatHistoryDate } from '../services/reportGenerator';
import { getTargetColor, getPromptText } from './helpers';
import { highlightJson } from '../services/reportGenerator';
import { convertScraperDataToProduct } from '../utils/dataTransformers';
import { getProductByAsin, Product } from '../config/sampleData';
import * as actions from './actions';

/**
 * 创建 Alpine 面板组件
 */
export function createAiAnalysisPanel(moduleState: any) {
  const panel: any = {
    // ========== State ==========
    selectedAsins: moduleState.selectedAsins,
    selectedTargets: moduleState.selectedTargets,
    isAnalyzing: moduleState.isAnalyzing,
    progress: moduleState.progress,
    currentStep: moduleState.currentStep,
    results: moduleState.results,
    analysisReport: moduleState.analysisReport,
    expandedPromptIndex: moduleState.expandedPromptIndex,
    showPromptPanel: moduleState.showPromptPanel,
    showJsonViewer: moduleState.showJsonViewer,
    useRealData: moduleState.useRealData,
    dataSource: moduleState.dataSource,
    showDataSourceBanner: moduleState.showDataSourceBanner,

    // ========== Lifecycle ==========
    init(this: any) {
      console.log('[Alpine 组件] 🚀 组件初始化');
      
      // 默认全选所有分析目标（如果当前没有选中任何目标）
      // 必须在 syncFromModuleState 之前设置，确保初始状态正确
      if (moduleState.selectedTargets.length === 0) {
        moduleState.selectedTargets = analysisTargets.map(t => t.id);
        console.log('[Alpine 组件] ✅ 已默认全选所有分析目标:', moduleState.selectedTargets.length);
      }
      
      this.syncFromModuleState();
      
      // 强制触发响应式更新
      // 使用 $nextTick 确保在 DOM 更新后执行
      this.$nextTick(() => {
        // 通过重新赋值触发响应式
        const targets = [...this.selectedTargets];
        this.selectedTargets = targets;
        console.log('[Alpine 组件] 🔄 响应式更新完成, selectedTargets:', this.selectedTargets.length);
        console.log('[Alpine 组件] 🔍 this.selectedTargets 数组:', this.selectedTargets);
        console.log('[Alpine 组件] 🔍 canAnalyze 状态:', this.canAnalyze);
        
        // 再次尝试强制更新
        setTimeout(() => {
          console.log('[Alpine 组件] ⏰ 延迟检查 canAnalyze:', this.canAnalyze);
          console.log('[Alpine 组件] ⏰ 延迟检查 selectedTargets:', this.selectedTargets.length);
        }, 100);
      });
      
      // 检查是否有新的 Scraper 数据
      checkAndLoadScraperData(this, moduleState);

      // 检查是否有已加载的历史报告
      checkLoadedReport(this, moduleState);

      // 3秒后自动隐藏数据源横幅
      setTimeout(() => {
        this.showDataSourceBanner = false;
        moduleState.showDataSourceBanner = false;
        console.log('[Alpine 组件] 🎯 数据源横幅已自动隐藏');
      }, 3000);
    },

    // ========== State Sync ==========
    syncFromModuleState() {
      // 直接赋值新数组，触发 Alpine.js 响应式
      this.selectedAsins = [...moduleState.selectedAsins];
      this.selectedTargets = [...moduleState.selectedTargets];
      this.isAnalyzing = moduleState.isAnalyzing;
      this.progress = moduleState.progress;
      this.currentStep = moduleState.currentStep;
      this.results = [...moduleState.results];
      this.analysisReport = moduleState.analysisReport;
      
      console.log('[Alpine 组件] 📊 状态同步完成:', {
        selectedAsins: this.selectedAsins.length,
        selectedTargets: this.selectedTargets.length
      });
    },

    syncToModuleState() {
      moduleState.selectedAsins = this.selectedAsins;
      moduleState.selectedTargets = this.selectedTargets;
      moduleState.isAnalyzing = this.isAnalyzing;
      moduleState.progress = this.progress;
      moduleState.currentStep = this.currentStep;
      moduleState.results = this.results;
      moduleState.analysisReport = this.analysisReport;
    },

    // ========== Data Loading ==========
    loadHistoricalReport(detail: { report: any; timestamp: string }) {
      loadHistoricalReport(this, moduleState, detail);
    },

    formatHistoryDate(timestamp: string): string {
      return formatHistoryDate(timestamp);
    },

    // ========== Actions ==========
    toggleAsin(asin: string) {
      actions.toggleAsin(this, moduleState, asin);
    },

    selectAllAsins() {
      actions.selectAllAsins(this, moduleState, this.availableAsins);
    },

    clearAllAsins() {
      actions.clearAllAsins(this, moduleState);
    },

    toggleTarget(targetId: string) {
      actions.toggleTarget(this, moduleState, targetId);
    },

    selectAllTargets() {
      actions.selectAllTargets(this, moduleState);
    },

    clearAllTargets() {
      actions.clearAllTargets(this, moduleState);
    },

    togglePromptPanel() {
      actions.togglePromptPanel(this, moduleState);
    },

    togglePromptItem(index: number) {
      actions.togglePromptItem(this, moduleState, index);
    },

    toggleJsonViewer() {
      actions.toggleJsonViewer(this, moduleState);
    },

    toggleDataSource() {
      actions.toggleDataSource(this, moduleState);
    },

    copyPrompt(index: number) {
      actions.copyPrompt(this, this.currentProducts, index);
    },

    copyJson() {
      actions.copyJson(this, this.dataSourceMarketplace);
    },

    copyMarkdown() {
      actions.copyMarkdown(this, this.dataSourceMarketplace, this.dataSourceLabel);
    },

    downloadJson() {
      actions.downloadJson(this, this.dataSourceMarketplace);
    },

    async runAnalysis() {
      await actions.runAnalysisAction(this, moduleState, this.currentProducts);
    },

    // ========== Helpers ==========
    getTargetColor(color: string): string {
      return getTargetColor(color);
    },

    getPromptText(targetId: string): string {
      return getPromptText(targetId, this.currentProducts);
    },

    highlightJson(json: string): string {
      return highlightJson(json);
    },

    // ========== Computed Properties ==========
    /**
     * 获取当前选中的产品列表
     */
    get currentProducts(): Product[] {
      const products: Product[] = [];
      
      // 优先从 Scraper 数据获取
      const scrapedData = state.scraper?.scrapedData;
      if (scrapedData && scrapedData.products && scrapedData.products.length > 0) {
        console.log('[计算属性] 开始从 Scraper 数据获取产品, selectedAsins:', this.selectedAsins);
        for (const asin of this.selectedAsins) {
          const matchedProduct = scrapedData.products.find((p: any) => p.asin === asin);
          if (matchedProduct) {
            console.log('[计算属性] 找到匹配产品:', asin, matchedProduct);
            const product = convertScraperDataToProduct(matchedProduct);
            if (product) {
              console.log('[计算属性] 产品转换成功:', asin);
              products.push(product);
            } else {
              console.warn('[计算属性] 产品转换失败:', asin, matchedProduct);
            }
          } else {
            console.warn('[计算属性] 未找到匹配产品:', asin);
          }
        }
      } else {
        console.warn('[计算属性] Scraper 数据不可用:', {
          hasScrapedData: !!scrapedData,
          hasProducts: !!(scrapedData && scrapedData.products),
          productsLength: scrapedData?.products?.length
        });
      }
      
      // 如果没有从 Scraper 获取到，从示例数据获取
      if (products.length === 0) {
        console.log('[计算属性] 尝试从示例数据获取产品');
        for (const asin of this.selectedAsins) {
          const product = getProductByAsin(asin);
          if (product) {
            console.log('[计算属性] 从示例数据获取到产品:', asin);
            products.push(product);
          }
        }
      }
      
      console.log('[计算属性] currentProducts 最终结果:', products.length, '个产品');
      return products;
    },

    /**
     * 获取可用的 ASIN 列表
     */
    get availableAsins(): string[] {
      // 优先从 Scraper 获取 ASIN 列表
      const scrapedData = state.scraper?.scrapedData;
      if (scrapedData && scrapedData.products && scrapedData.products.length > 0) {
        return scrapedData.products.map((p: any) => p.asin).filter((asin: string) => asin);
      }
      // 没有真实数据时返回空数组
      return [];
    },

    /**
     * 是否有数据
     */
    get hasData(): boolean {
      return this.currentProducts.length > 0;
    },

    /**
     * 是否可以开始分析
     */
    get canAnalyze(): boolean {
      const hasTargets = this.selectedTargets && this.selectedTargets.length > 0;
      const result = hasTargets && this.hasData && !this.isAnalyzing;
      console.log('[计算属性] canAnalyze 检查:', {
        selectedTargets: this.selectedTargets?.length || 0,
        hasData: this.hasData,
        currentProducts: this.currentProducts.length,
        isAnalyzing: this.isAnalyzing,
        canAnalyze: result
      });
      return result;
    },

    /**
     * 分析目标配置
     */
    get analysisTargets() {
      return analysisTargets;
    },

    /**
     * Listings 分析结果
     */
    get listingsResults(): any[] {
      const filtered = this.results.filter((r: any) => r.source === 'Listings');
      console.log('[计算属性] listingsResults:', {
        totalResults: this.results.length,
        listingsCount: filtered.length,
        results: this.results
      });
      return filtered;
    },

    /**
     * Reviews 分析结果
     */
    get reviewsResults(): any[] {
      const filtered = this.results.filter((r: any) => r.source === 'Reviews');
      console.log('[计算属性] reviewsResults:', {
        totalResults: this.results.length,
        reviewsCount: filtered.length
      });
      return filtered;
    },

    /**
     * 总高亮数量
     */
    get totalHighlights(): number {
      return this.results.reduce((acc: number, r: any) => acc + r.highlights.length, 0);
    },

    /**
     * 总详情数量
     */
    get totalDetails(): number {
      return this.results.reduce((acc: number, r: any) => acc + r.details.length, 0);
    },

    /**
     * 是否有 Scraper 数据
     */
    get hasScraperData(): boolean {
      const scrapedData = state.scraper?.scrapedData;
      return !!(scrapedData && scrapedData.products && scrapedData.products.length > 0);
    },

    /**
     * 数据源标签
     */
    get dataSourceLabel(): string {
      switch (this.dataSource) {
        case 'scraper': return '数据采集';
        case 'sample': return '示例数据';
        default: return '未知';
      }
    },

    /**
     * 数据源市场
     */
    get dataSourceMarketplace(): string {
      const scrapedData = state.scraper?.scrapedData;
      if (scrapedData && scrapedData.metadata) {
        return scrapedData.metadata.marketplace || '未知';
      }
      return '未知';
    },

    /**
     * 数据源时间戳
     */
    get dataSourceTimestamp(): string {
      const scrapedData = state.scraper?.scrapedData;
      if (scrapedData && scrapedData.metadata && scrapedData.metadata.scrape_timestamp) {
        return scrapedData.metadata.scrape_timestamp;
      }
      return '未知';
    },

    /**
     * 完整报告数据
     */
    get fullReportData() {
      if (!this.analysisReport) return null;
      
      return {
        metadata: {
          asins: this.selectedAsins,
          targets: this.selectedTargets,
          timestamp: new Date().toISOString(),
          dataSource: this.dataSource,
          marketplace: this.dataSourceMarketplace
        },
        results: this.results,
        analysisReport: this.analysisReport
      };
    }
  };
  
  return panel;
}

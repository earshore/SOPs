/**
 * AI智能分析模块
 * 集成到 Master Prompt 的子页面
 */

import { loadTemplate } from '../../../../../common/utils/viewLoader';
import state from '../../../../../common/state';
import { analysisTargets } from './analysisTargets';
import { runAnalysis, getSampleReport } from './analysisService';
import { runAIAnalysis } from './aiAnalysisService';
import { generateAnalysisPrompt } from './analysisPrompts';
import { LANGUAGE_HEADERS } from '../../../../../common/constants/constants';
import { getProductByAsin, getAvailableAsins, Product } from './sampleData';
import { AnalysisResult } from './types';
import type { FullAnalysisReport } from './analysisReportData';
import { showToast } from '../../../../../common/ui';

import '../master_prompt_style.css';
import './ai_analysis_style.css';

// 模块状态
interface ModuleState {
  selectedAsins: string[]; // 改为数组，支持多选
  selectedTargets: string[];
  isAnalyzing: boolean;
  progress: number;
  currentStep: string;
  results: AnalysisResult[];
  analysisReport: FullAnalysisReport | null;
  expandedPromptIndex: number | null;
  showPromptPanel: boolean;
  showJsonViewer: boolean;
  useRealData: boolean; // 是否使用真实数据
  dataSource: 'sample' | 'scraper' | 'rawdata'; // 数据来源
}

let moduleState: ModuleState = {
  selectedAsins: [],
  selectedTargets: [],
  isAnalyzing: false,
  progress: 0,
  currentStep: '',
  results: [],
  analysisReport: null,
  expandedPromptIndex: null,
  showPromptPanel: false,
  showJsonViewer: false,
  useRealData: false,
  dataSource: 'sample'
};

/**
 * 挂载模块
 */
export async function mount(container: HTMLElement): Promise<void> {
  console.log('[AI智能分析] 🔧 开始挂载模块');

  try {
    // 1. 初始化状态 - 从 scraper 数据加载
    initializeFromScraperData();

    // 2. 加载模板
    const html = await loadTemplate('src/modules/app_center/views/master_prompt/ai_analysis/template.html');
    container.innerHTML = html;

    // 3. 初始化 Alpine.js 组件
    if (window.Alpine) {
      window.Alpine.data('aiAnalysisPanel', createAiAnalysisPanel);
    }

    console.log('[AI智能分析] ✅ 模块挂载成功');
  } catch (error) {
    console.error('[AI智能分析] ❌ 模块挂载失败:', error);
    throw error;
  }
}

/**
 * 卸载模块
 */
export function unmount(): void {
  console.log('[AI智能分析] 🔄 开始卸载模块');
  // 清理状态
  moduleState = {
    selectedAsins: [],
    selectedTargets: [],
    isAnalyzing: false,
    progress: 0,
    currentStep: '',
    results: [],
    analysisReport: null,
    expandedPromptIndex: null,
    showPromptPanel: false,
    showJsonViewer: false,
    useRealData: false,
    dataSource: 'sample'
  };
  console.log('[AI智能分析] ✅ 模块卸载成功');
}

/**
 * 从 Scraper 数据初始化
 */
function initializeFromScraperData(): void {
  // 从全局 state 获取已采集的数据
  const scrapedData = state.scraper?.scrapedData;
  
  if (scrapedData && scrapedData.products && scrapedData.products.length > 0) {
    // 自动选中所有产品的 ASIN
    moduleState.selectedAsins = scrapedData.products
      .map((p: any) => p.asin)
      .filter((asin: string) => asin);
    moduleState.dataSource = 'scraper';
    console.log('[AI智能分析] 📦 已从 Scraper 加载数据:', moduleState.selectedAsins);
  } else {
    // 使用示例数据
    const availableAsins = getAvailableAsins();
    moduleState.selectedAsins = availableAsins.length > 0 ? [availableAsins[0]!] : ['B0DNMZ2MLG'];
    moduleState.dataSource = 'sample';
    console.log('[AI智能分析] 📦 使用示例数据:', moduleState.selectedAsins);
  }
}

/**
 * 从 Scraper 单个产品数据转换为 Product 格式
 */
function convertScraperDataToProduct(productData: unknown): Product | null {
  try {
    if (!productData || typeof productData !== 'object') {
      return null;
    }

    const product = productData as Record<string, unknown>;
    
    return {
      asin: (product.asin as string) || '',
      productTitle: (product.productTitle as string) || (product.title as string) || '',
      feature_bullets: (product.feature_bullets as string[]) || (product.bulletPoints as string[]) || (product.bullet_points as string[]) || [],
      customer_reviews: ((product.customer_reviews as unknown[]) || (product.reviews as unknown[]) || []).map((r: unknown) => {
        const review = r as Record<string, unknown>;
        return {
          star_rating: (review.star_rating as number) || (review.rating as number) || 5,
          headline: (review.headline as string) || (review.review_title as string) || (review.title as string) || '',
          body: (review.body as string) || (review.review_text as string) || (review.text as string) || (review.content as string) || '',
          origin_country: (review.origin_country as string) || '',
          review_date: (review.review_date as string) || '',
          _origin_site: (review._origin_site as string) || ''
        };
      }),
      scrape_status: 'success',
      metadata: {}
    };
  } catch (error) {
    console.error('[AI智能分析] 转换产品数据失败:', error);
    return null;
  }
}

/**
 * Alpine.js 组件工厂
 */
function createAiAnalysisPanel() {
  return {
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

    // ========== Computed ==========
    get currentProducts(): Product[] {
      const products: Product[] = [];
      
      // 优先从 Scraper 数据获取
      const scrapedData = state.scraper?.scrapedData;
      if (scrapedData && scrapedData.products && scrapedData.products.length > 0) {
        for (const asin of this.selectedAsins) {
          const matchedProduct = scrapedData.products.find((p: any) => p.asin === asin);
          if (matchedProduct) {
            const product = convertScraperDataToProduct(matchedProduct);
            if (product) {
              products.push(product);
            }
          }
        }
      }
      
      // 如果没有从 Scraper 获取到，从示例数据获取
      if (products.length === 0) {
        for (const asin of this.selectedAsins) {
          const product = getProductByAsin(asin);
          if (product) {
            products.push(product);
          }
        }
      }
      
      return products;
    },

    get availableAsins(): string[] {
      // 优先从 Scraper 获取 ASIN 列表
      const scrapedData = state.scraper?.scrapedData;
      if (scrapedData && scrapedData.products && scrapedData.products.length > 0) {
        return scrapedData.products.map((p: any) => p.asin).filter((asin: string) => asin);
      }
      // 否则返回示例数据的 ASIN
      return getAvailableAsins();
    },

    get hasData(): boolean {
      return this.currentProducts.length > 0;
    },

    get canAnalyze(): boolean {
      return this.selectedTargets.length > 0 && this.hasData && !this.isAnalyzing;
    },

    get analysisTargets() {
      return analysisTargets;
    },

    get listingsResults() {
      return this.results.filter(r => r.source === 'Listings');
    },

    get reviewsResults() {
      return this.results.filter(r => r.source === 'Reviews');
    },

    get totalHighlights() {
      return this.results.reduce((acc, r) => acc + r.highlights.length, 0);
    },

    get totalDetails() {
      return this.results.reduce((acc, r) => acc + r.details.length, 0);
    },

    get hasScraperData(): boolean {
      const scrapedData = state.scraper?.scrapedData;
      return !!(scrapedData && scrapedData.products && scrapedData.products.length > 0);
    },

    get dataSourceLabel(): string {
      switch (this.dataSource) {
        case 'scraper': return '数据采集';
        case 'rawdata': return '数据管理';
        case 'sample': return '示例数据';
        default: return '未知';
      }
    },

    get dataSourceMarketplace(): string {
      const scrapedData = state.scraper?.scrapedData;
      if (scrapedData && scrapedData.metadata) {
        return scrapedData.metadata.marketplace || '未知';
      }
      return '未知';
    },

    get dataSourceTimestamp(): string {
      const scrapedData = state.scraper?.scrapedData;
      if (scrapedData && scrapedData.metadata && scrapedData.metadata.scrape_timestamp) {
        return this.formatHistoryDate(scrapedData.metadata.scrape_timestamp);
      }
      return '未知';
    },

    // ========== Lifecycle ==========
    init() {
      console.log('[AI智能分析] 🚀 Alpine 组件初始化');
      this.syncFromModuleState();
      
      // 检查是否有新的 Scraper 数据
      this.checkAndLoadScraperData();

      // ✅ 检查是否有待加载的历史报告
      this.checkPendingReport();
    },

    // ========== State Sync ==========
    syncFromModuleState() {
      this.selectedAsins = moduleState.selectedAsins;
      this.selectedTargets = moduleState.selectedTargets;
      this.isAnalyzing = moduleState.isAnalyzing;
      this.progress = moduleState.progress;
      this.currentStep = moduleState.currentStep;
      this.results = moduleState.results;
      this.analysisReport = moduleState.analysisReport;
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
    checkAndLoadScraperData() {
      const scrapedData = state.scraper?.scrapedData;
      
      if (scrapedData && scrapedData.products && scrapedData.products.length > 0) {
        // 如果有 Scraper 数据，自动选中所有产品的 ASIN
        const asins = scrapedData.products
          .map((p: any) => p.asin)
          .filter((asin: string) => asin);
        
        if (asins.length > 0 && JSON.stringify(asins) !== JSON.stringify(this.selectedAsins)) {
          this.selectedAsins = asins;
          this.dataSource = 'scraper';
          moduleState.selectedAsins = this.selectedAsins;
          moduleState.dataSource = 'scraper';
          console.log('[AI智能分析] 📦 自动加载 Scraper 数据:', this.selectedAsins);
          showToast(`已自动加载 ${asins.length} 个产品 ASIN`, 'success');
        }
        
        // 自动启用真实数据分析模式
        if (!this.useRealData) {
          this.useRealData = true;
          moduleState.useRealData = true;
          console.log('[AI智能分析] 🤖 已自动启用真实数据分析模式');
        }
      }
    },

    /**
     * ✅ 检查是否有待加载的历史报告
     */
    checkPendingReport() {
      if (state.analysis?.pendingReport) {
        const { report, timestamp } = state.analysis.pendingReport;
        
        console.log('[AI智能分析] 📊 检测到待加载的历史报告:', timestamp);
        
        // 加载报告
        this.loadHistoricalReport({ report, timestamp });
        
        // 清除待加载标记
        delete state.analysis.pendingReport;
      }
    },

    /**
     * ✅ 新增：加载历史分析报告
     */
    loadHistoricalReport(detail: { report: any; timestamp: string }) {
      try {
        if (!detail || !detail.report) {
          showToast('历史报告数据无效', 'error');
          return;
        }

        // 加载历史报告数据
        this.results = detail.report.results || [];
        this.selectedTargets = detail.report.targets || [];
        this.analysisReport = detail.report;
        
        // 同步到模块状态
        this.syncToModuleState();

        console.log('[AI智能分析] 📊 已加载历史分析报告:', detail.timestamp);
        showToast(`已加载历史分析报告 (${this.formatHistoryDate(detail.timestamp)})`, 'success');
      } catch (error) {
        console.error('[AI智能分析] 加载历史报告失败:', error);
        showToast('加载历史报告失败', 'error');
      }
    },

    /**
     * ✅ 新增：格式化历史日期
     */
    formatHistoryDate(timestamp: string): string {
      try {
        const date = new Date(timestamp);
        const now = new Date();
        
        // 如果是今天
        if (date.toDateString() === now.toDateString()) {
          return `今天 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        }
        
        // 如果是昨天
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) {
          return `昨天 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        }
        
        // 其他日期
        return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
      } catch (error) {
        return timestamp;
      }
    },

    // ========== Actions ==========
    toggleAsin(asin: string) {
      const index = this.selectedAsins.indexOf(asin);
      if (index > -1) {
        this.selectedAsins.splice(index, 1);
      } else {
        this.selectedAsins.push(asin);
      }
      this.syncToModuleState();
    },

    selectAllAsins() {
      this.selectedAsins = [...this.availableAsins];
      this.syncToModuleState();
    },

    clearAllAsins() {
      this.selectedAsins = [];
      this.syncToModuleState();
    },

    toggleTarget(targetId: string) {
      const index = this.selectedTargets.indexOf(targetId);
      if (index > -1) {
        this.selectedTargets.splice(index, 1);
      } else {
        this.selectedTargets.push(targetId);
      }
      this.syncToModuleState();
    },

    selectAllTargets() {
      this.selectedTargets = analysisTargets.map(t => t.id);
      this.syncToModuleState();
    },

    clearAllTargets() {
      this.selectedTargets = [];
      this.syncToModuleState();
    },

    togglePromptPanel() {
      this.showPromptPanel = !this.showPromptPanel;
      moduleState.showPromptPanel = this.showPromptPanel;
    },

    togglePromptItem(index: number) {
      this.expandedPromptIndex = this.expandedPromptIndex === index ? null : index;
      moduleState.expandedPromptIndex = this.expandedPromptIndex;
    },

    toggleJsonViewer() {
      this.showJsonViewer = !this.showJsonViewer;
      moduleState.showJsonViewer = this.showJsonViewer;
    },

    toggleDataSource() {
      this.useRealData = !this.useRealData;
      moduleState.useRealData = this.useRealData;
      
      // 清空之前的结果
      this.results = [];
      this.analysisReport = null;
      moduleState.results = [];
      moduleState.analysisReport = null;
      
      showToast(
        this.useRealData ? '已切换到真实数据分析模式' : '已切换到示例数据模式',
        'info'
      );
    },

    copyPrompt(index: number) {
      const products = this.currentProducts;
      if (products.length === 0) return;

      const targetId = this.selectedTargets[index];
      if (!targetId) return;
      
      // 如果有多个产品，合并后生成提示词
      const mergedProduct = products.length > 1 ? this.mergeProducts(products) : products[0];
      if (!mergedProduct) return;
      
      // 获取正确的语言代码
      const language = this.getMarketLanguage();
      const prompt = generateAnalysisPrompt(targetId, mergedProduct, language);
      
      navigator.clipboard.writeText(prompt).then(() => {
        showToast('提示词已复制', 'success');
      }).catch(() => {
        showToast('复制失败', 'error');
      });
    },

    copyJson() {
      if (!this.analysisReport) return;

      const json = JSON.stringify(this.analysisReport, null, 2);
      navigator.clipboard.writeText(json).then(() => {
        showToast('JSON 已复制', 'success');
      }).catch(() => {
        showToast('复制失败', 'error');
      });
    },

    /**
     * 复制 Markdown 格式报告
     */
    copyMarkdown() {
      if (this.results.length === 0) {
        showToast('没有可复制的报告', 'warning');
        return;
      }

      const markdown = this.generateMarkdownReport();
      navigator.clipboard.writeText(markdown).then(() => {
        showToast('Markdown 报告已复制', 'success');
      }).catch(() => {
        showToast('复制失败', 'error');
      });
    },

    /**
     * 下载 JSON 格式报告
     */
    downloadJson() {
      if (this.results.length === 0) {
        showToast('没有可下载的报告', 'warning');
        return;
      }

      const reportData = {
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

      const json = JSON.stringify(reportData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analysis-report-${this.selectedAsins.join('-')}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showToast('JSON 报告已下载', 'success');
    },

    /**
     * 生成 Markdown 格式报告
     */
    generateMarkdownReport(): string {
      const lines: string[] = [];
      
      // 标题
      lines.push('# AI 智能分析报告\n');
      lines.push(`**产品 ASIN**: ${this.selectedAsins.join(', ')}\n`);
      lines.push(`**分析时间**: ${new Date().toLocaleString('zh-CN')}\n`);
      lines.push(`**市场**: ${this.dataSourceMarketplace}\n`);
      lines.push(`**数据源**: ${this.dataSourceLabel}\n`);
      lines.push('\n---\n');
      
      // Listings 分析结果
      const listingsResults = this.listingsResults;
      if (listingsResults.length > 0) {
        lines.push('\n## 📦 Listings 分析\n');
        for (const result of listingsResults) {
          lines.push(`\n### ${result.title}\n`);
          
          // 统计数据
          if (result.stats && result.stats.length > 0) {
            lines.push('\n**统计数据**:\n');
            for (const stat of result.stats) {
              lines.push(`- ${stat.label}: ${stat.value}`);
            }
            lines.push('');
          }
          
          // 核心发现
          if (result.highlights && result.highlights.length > 0) {
            lines.push('\n**核心发现**:\n');
            for (const highlight of result.highlights) {
              lines.push(`- ${highlight.text}`);
            }
            lines.push('');
          }
          
          // 详细分析
          if (result.details && result.details.length > 0) {
            lines.push('\n**详细分析**:\n');
            for (const detail of result.details) {
              lines.push(`\n#### ${detail.category}\n`);
              for (const item of detail.items) {
                lines.push(`- ${item}`);
              }
            }
            lines.push('');
          }
        }
      }
      
      // Reviews 分析结果
      const reviewsResults = this.reviewsResults;
      if (reviewsResults.length > 0) {
        lines.push('\n## ⭐ Reviews 分析\n');
        for (const result of reviewsResults) {
          lines.push(`\n### ${result.title}\n`);
          
          // 统计数据
          if (result.stats && result.stats.length > 0) {
            lines.push('\n**统计数据**:\n');
            for (const stat of result.stats) {
              lines.push(`- ${stat.label}: ${stat.value}`);
            }
            lines.push('');
          }
          
          // 核心发现
          if (result.highlights && result.highlights.length > 0) {
            lines.push('\n**核心发现**:\n');
            for (const highlight of result.highlights) {
              lines.push(`- ${highlight.text}`);
            }
            lines.push('');
          }
          
          // 详细分析
          if (result.details && result.details.length > 0) {
            lines.push('\n**详细分析**:\n');
            for (const detail of result.details) {
              lines.push(`\n#### ${detail.category}\n`);
              for (const item of detail.items) {
                lines.push(`- ${item}`);
              }
            }
            lines.push('');
          }
        }
      }
      
      lines.push('\n---\n');
      lines.push(`\n*报告生成于 ${new Date().toLocaleString('zh-CN')}*\n`);
      
      return lines.join('\n');
    },

    async runAnalysis() {
      if (!this.canAnalyze) return;

      this.isAnalyzing = true;
      this.progress = 0;
      this.results = [];
      this.syncToModuleState();

      try {
        let results: AnalysisResult[];

        if (this.useRealData) {
          // 使用真实数据进行 AI 分析
          const products = this.getRealProducts();
          
          if (products.length === 0) {
            throw new Error('无法获取产品数据,请确保已从数据采集或数据管理导入数据');
          }

          showToast(`正在调用 AI 分析 ${products.length} 个产品...`, 'info');

          // 合并多个产品的数据
          const mergedProduct = this.mergeProducts(products);

          // 获取正确的语言代码
          const language = this.getMarketLanguage();

          results = await runAIAnalysis(
            this.selectedTargets,
            mergedProduct,
            (progress: number, step: string) => {
              this.progress = progress;
              this.currentStep = step;
              this.syncToModuleState();
            },
            language
          );

          // AI 分析不返回完整报告,只返回结果
          this.analysisReport = null;
        } else {
          // 使用示例数据进行模拟分析
          results = await runAnalysis(
            this.selectedTargets,
            this.selectedAsins[0] || 'B0DNMZ2MLG',
            (progress: number, step: string) => {
              this.progress = progress;
              this.currentStep = step;
              this.syncToModuleState();
            }
          );

          this.analysisReport = getSampleReport();
        }

        this.results = results;
        this.syncToModuleState();

        // ✅ 新增：分析成功后自动更新历史快照的分析状态
        if (results.length > 0 && state.scraper?.currentHistoryId) {
          const { HistoryService } = await import('../services/historyService');
          const success = HistoryService.updateAnalysisStatus(
            state.scraper.currentHistoryId,
            {
              results: results,
              targets: this.selectedTargets,
              timestamp: new Date().toISOString(),
              dataSource: this.dataSource
            }
          );
          
          if (success) {
            console.log('[AI智能分析] ✅ 已自动标记历史快照为"已分析"');
            // 触发历史记录更新事件，通知 Scraper 页面刷新
            window.dispatchEvent(new CustomEvent('history-updated'));
          }
        }

        showToast(`分析完成！生成了 ${results.length} 个洞察报告`, 'success');
      } catch (error) {
        console.error('[AI智能分析] 分析失败:', error);
        showToast(`分析失败: ${(error as Error).message}`, 'error');
      } finally {
        this.isAnalyzing = false;
        this.syncToModuleState();
      }
    },

    getRealProducts(): Product[] {
      const products: Product[] = [];
      
      // 根据选中的 ASIN 从 Scraper 获取对应的产品数据
      const scrapedData = state.scraper?.scrapedData;
      if (scrapedData && scrapedData.products && scrapedData.products.length > 0) {
        for (const asin of this.selectedAsins) {
          const matchedProduct = scrapedData.products.find((p: any) => p.asin === asin);
          if (matchedProduct) {
            const product = convertScraperDataToProduct(matchedProduct);
            if (product) {
              products.push(product);
            }
          }
        }
      }

      // TODO: 从 RawData 获取数据
      // const rawData = state.rawdata?.data;
      // if (rawData) {
      //   return convertRawDataToProduct(rawData);
      // }

      return products;
    },

    mergeProducts(products: Product[]): Product {
      if (products.length === 0) {
        throw new Error('没有可合并的产品数据');
      }

      // 合并多个产品的数据
      const mergedProduct: Product = {
        asin: products.map(p => p.asin).join(', '),
        productTitle: products.map(p => p.productTitle).join(' | '),
        feature_bullets: products.flatMap(p => p.feature_bullets),
        customer_reviews: products.flatMap(p => p.customer_reviews),
        scrape_status: 'success',
        metadata: {
          merged: true,
          product_count: products.length,
          asins: products.map(p => p.asin)
        }
      };

      console.log('[AI智能分析] 📊 已合并 ' + products.length + ' 个产品的数据');
      console.log('[AI智能分析] 📊 合并后数据: ' + mergedProduct.feature_bullets.length + ' 个卖点, ' + mergedProduct.customer_reviews.length + ' 条评论');

      return mergedProduct;
    },

    // ========== Helpers ==========
    getTargetColor(color: string): string {
      const colorMap: Record<string, string> = {
        blue: 'blue', cyan: 'cyan', red: 'red', amber: 'amber',
        orange: 'orange', purple: 'purple', teal: 'teal', rose: 'rose'
      };
      return colorMap[color] || 'blue';
    },

    /**
     * 获取市场对应的语言代码
     */
    getMarketLanguage(): string {
      const scrapedData = state.scraper?.scrapedData;
      if (scrapedData && scrapedData.metadata && scrapedData.metadata.marketplace) {
        const marketplace = scrapedData.metadata.marketplace;
        
        // 从 LANGUAGE_HEADERS 获取语言配置
        const langConfig = LANGUAGE_HEADERS[marketplace];
        
        if (langConfig && langConfig.locale) {
          // 从 locale (如 "de_DE") 提取语言代码 (如 "de")
          const language = langConfig.locale.split('_')[0];
          console.log(`[AI智能分析] 市场 ${marketplace} 对应语言: ${language}`);
          return language || 'en';
        }
      }
      
      // 默认返回英语
      return 'en';
    },

    getPromptText(targetId: string): string {
      const products = this.currentProducts;
      if (products.length === 0) return '无产品数据';
      
      try {
        // 如果有多个产品，合并后生成提示词
        const mergedProduct = products.length > 1 ? this.mergeProducts(products) : products[0];
        
        // 确保 mergedProduct 存在
        if (!mergedProduct) {
          return '无产品数据';
        }
        
        // 获取正确的语言代码
        const language = this.getMarketLanguage();
        return generateAnalysisPrompt(targetId, mergedProduct, language);
      } catch (error) {
        console.error('[AI智能分析] 生成提示词失败:', error);
        return '提示词生成失败';
      }
    },

    highlightJson(json: string): string {
      return json
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"([^"]+)":/g, '<span class="text-purple-400">"$1"</span>:')
        .replace(/: "([^"]*)"/g, ': <span class="text-emerald-400">"$1"</span>')
        .replace(/: (\d+)/g, ': <span class="text-amber-400">$1</span>')
        .replace(/: (true|false)/g, ': <span class="text-blue-400">$1</span>')
        .replace(/: (null)/g, ': <span class="text-slate-500">$1</span>');
    }
  };
}

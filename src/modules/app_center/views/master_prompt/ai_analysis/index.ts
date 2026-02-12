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
import { getProductByAsin, getAvailableAsins, Product } from './sampleData';
import { AnalysisResult } from './types';
import type { FullAnalysisReport } from './analysisReportData';
import { showToast } from '../../../../../common/ui';

import '../master_prompt_style.css';
import './ai_analysis_style.css';

// 模块状态
interface ModuleState {
  asin: string;
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
  asin: '',
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
    asin: '',
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
    // 使用第一个产品的 ASIN
    const firstProduct = scrapedData.products[0];
    moduleState.asin = firstProduct.asin || '';
    moduleState.dataSource = 'scraper';
    console.log('[AI智能分析] 📦 已从 Scraper 加载数据:', moduleState.asin);
  } else {
    // 使用示例数据
    const availableAsins = getAvailableAsins();
    moduleState.asin = availableAsins[0] || 'B0DNMZ2MLG';
    moduleState.dataSource = 'sample';
    console.log('[AI智能分析] 📦 使用示例数据:', moduleState.asin);
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
    asin: moduleState.asin,
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
    get currentProduct(): Product | undefined {
      // 优先从 Scraper 数据获取
      const scrapedData = state.scraper?.scrapedData;
      if (scrapedData && scrapedData.products && scrapedData.products.length > 0) {
        const matchedProduct = scrapedData.products.find((p: any) => p.asin === this.asin);
        if (matchedProduct) {
          const product = convertScraperDataToProduct(matchedProduct);
          if (product) {
            return product;
          }
        }
      }
      
      // 否则从示例数据获取
      return getProductByAsin(this.asin);
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
      return !!this.currentProduct;
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

    // ========== Lifecycle ==========
    init() {
      console.log('[AI智能分析] 🚀 Alpine 组件初始化');
      this.syncFromModuleState();
      
      // 检查是否有新的 Scraper 数据
      this.checkAndLoadScraperData();
    },

    // ========== State Sync ==========
    syncFromModuleState() {
      this.asin = moduleState.asin;
      this.selectedTargets = moduleState.selectedTargets;
      this.isAnalyzing = moduleState.isAnalyzing;
      this.progress = moduleState.progress;
      this.currentStep = moduleState.currentStep;
      this.results = moduleState.results;
      this.analysisReport = moduleState.analysisReport;
    },

    syncToModuleState() {
      moduleState.asin = this.asin;
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
        // 如果有 Scraper 数据，自动加载第一个产品的 ASIN
        const firstProduct = scrapedData.products[0];
        if (firstProduct.asin && firstProduct.asin !== this.asin) {
          this.asin = firstProduct.asin;
          this.dataSource = 'scraper';
          moduleState.asin = this.asin;
          moduleState.dataSource = 'scraper';
          console.log('[AI智能分析] 📦 自动加载 Scraper 数据:', this.asin);
          showToast(`已自动加载产品 ASIN: ${this.asin}`, 'success');
        }
      }
    },

    // ========== Actions ==========
    selectAsin(asin: string) {
      this.asin = asin;
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
      const product = this.currentProduct;
      if (!product) return;

      const targetId = this.selectedTargets[index];
      if (!targetId) return;
      
      const prompt = generateAnalysisPrompt(targetId, product, 'en');
      
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
          const product = this.getRealProduct();
          
          if (!product) {
            throw new Error('无法获取产品数据,请确保已从数据采集或数据管理导入数据');
          }

          showToast('正在调用 AI 进行分析...', 'info');

          results = await runAIAnalysis(
            this.selectedTargets,
            product,
            (progress: number, step: string) => {
              this.progress = progress;
              this.currentStep = step;
              this.syncToModuleState();
            }
          );

          // AI 分析不返回完整报告,只返回结果
          this.analysisReport = null;
        } else {
          // 使用示例数据进行模拟分析
          results = await runAnalysis(
            this.selectedTargets,
            this.asin,
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

        showToast(`分析完成！生成了 ${results.length} 个洞察报告`, 'success');
      } catch (error) {
        console.error('[AI智能分析] 分析失败:', error);
        showToast(`分析失败: ${(error as Error).message}`, 'error');
      } finally {
        this.isAnalyzing = false;
        this.syncToModuleState();
      }
    },

    getRealProduct(): Product | null {
      // 根据当前选中的 ASIN 从 Scraper 获取对应的产品数据
      const scrapedData = state.scraper?.scrapedData;
      if (scrapedData && scrapedData.products && scrapedData.products.length > 0) {
        // 查找匹配当前 ASIN 的产品
        const matchedProduct = scrapedData.products.find((p: any) => p.asin === this.asin);
        if (matchedProduct) {
          const product = convertScraperDataToProduct(matchedProduct);
          if (product) {
            return product;
          }
        }
      }

      // TODO: 从 RawData 获取数据
      // const rawData = state.rawdata?.data;
      // if (rawData) {
      //   return convertRawDataToProduct(rawData);
      // }

      return null;
    },

    // ========== Helpers ==========
    getTargetColor(color: string): string {
      const colorMap: Record<string, string> = {
        blue: 'blue', cyan: 'cyan', red: 'red', amber: 'amber',
        orange: 'orange', purple: 'purple', teal: 'teal', rose: 'rose'
      };
      return colorMap[color] || 'blue';
    },

    getPromptText(targetId: string): string {
      const product = this.currentProduct;
      if (!product) return '无产品数据';
      
      try {
        return generateAnalysisPrompt(targetId, product, 'en');
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

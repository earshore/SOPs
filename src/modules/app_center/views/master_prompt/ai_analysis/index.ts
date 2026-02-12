/**
 * AI智能分析模块
 * 集成到 Master Prompt 的子页面
 */

import { loadTemplate } from '../../../../../common/utils/viewLoader';
import state from '../../../../../common/state';
import { analysisTargets } from './analysisTargets';
import { runAnalysis, getSampleReport } from './analysisService';
import { generateAnalysisPrompt } from './analysisPrompts';
import { getProductByAsin, getAvailableAsins, Product } from './sampleData';
import { AnalysisResult } from './types';
import { FullAnalysisReport } from './analysisReportData';
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
  showJsonViewer: false
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
    showJsonViewer: false
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
    console.log('[AI智能分析] 📦 已从 Scraper 加载数据:', moduleState.asin);
  } else {
    // 使用示例数据
    const availableAsins = getAvailableAsins();
    moduleState.asin = availableAsins[0] || 'B0DNMZ2MLG';
    console.log('[AI智能分析] 📦 使用示例数据:', moduleState.asin);
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

    // ========== Computed ==========
    get currentProduct(): Product | undefined {
      return getProductByAsin(this.asin);
    },

    get availableAsins(): string[] {
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

    // ========== Lifecycle ==========
    init() {
      console.log('[AI智能分析] 🚀 Alpine 组件初始化');
      this.syncFromModuleState();
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
        const results = await runAnalysis(
          this.selectedTargets,
          this.asin,
          (progress: number, step: string) => {
            this.progress = progress;
            this.currentStep = step;
            this.syncToModuleState();
          }
        );

        this.results = results;
        this.analysisReport = getSampleReport();
        this.syncToModuleState();

        showToast(`分析完成！生成了 ${results.length} 个洞察报告`, 'success');
      } catch (error) {
        console.error('[AI智能分析] 分析失败:', error);
        showToast('分析失败，请重试', 'error');
      } finally {
        this.isAnalyzing = false;
        this.syncToModuleState();
      }
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

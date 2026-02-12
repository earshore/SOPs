/**
 * InsightAI - 亚马逊产品智能分析平台
 * 纯 HTML + TypeScript 实现
 */

import './index.css';
import { sampleProductData, getProductByAsin, getAvailableAsins, Product } from './data/sampleData';
import { analysisTargets, AnalysisTarget } from './data/analysisTargets';
import { runAnalysis, getSampleReport } from './services/analysisService';
import { generateAnalysisPrompt, getTaskDefinition } from './prompts/analysisPrompts';
import { AnalysisResult } from './types/analysis';
import { FullAnalysisReport } from './data/analysisReportData';

// 应用状态
interface AppState {
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

const state: AppState = {
  asin: getAvailableAsins()[0] || 'B0DNMZ2MLG',
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

// DOM 辅助函数
function $(selector: string): HTMLElement | null {
  return document.querySelector(selector);
}

function $$(selector: string): NodeListOf<HTMLElement> {
  return document.querySelectorAll(selector);
}

function html(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.reduce((acc, str, i) => acc + str + (values[i] ?? ''), '');
}

// 渲染函数
function render(): void {
  const app = $('#app');
  if (!app) return;
  
  const currentProduct = getProductByAsin(state.asin);
  
  app.innerHTML = html`
    ${renderHeader()}
    <main class="max-w-7xl mx-auto px-6 py-8">
      ${renderDataSourceBanner()}
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        <div class="lg:col-span-4">
          ${renderASINInput(currentProduct)}
        </div>
        <div class="lg:col-span-8">
          ${renderTargetSelector()}
        </div>
      </div>
      ${state.selectedTargets.length > 0 && currentProduct ? renderPromptPreview(currentProduct) : ''}
      <div class="mb-10">
        ${renderAnalysisButton(currentProduct)}
      </div>
      ${state.analysisReport && state.results.length > 0 ? renderJsonViewer() : ''}
      ${renderResultsGrid()}
      ${state.results.length === 0 && !state.isAnalyzing ? renderEmptyState() : ''}
    </main>
    ${renderFooter()}
  `;
  
  bindEvents();
}

function renderHeader(): string {
  return html`
    <header class="relative overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900"></div>
      <div class="absolute inset-0 overflow-hidden">
        <div class="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/30 rounded-full filter blur-[120px] animate-pulse"></div>
        <div class="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-500/20 rounded-full filter blur-[100px]"></div>
      </div>
      <div class="absolute inset-0 opacity-5" style="background-image: linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px); background-size: 50px 50px;"></div>
      <div class="relative max-w-7xl mx-auto px-6 py-10">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-6">
            <div class="relative group">
              <div class="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur-xl opacity-60"></div>
              <div class="relative bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-5 rounded-2xl shadow-2xl border border-white/10">
                <i class="fa-solid fa-brain w-10 h-10 text-white text-3xl"></i>
              </div>
            </div>
            <div>
              <h1 class="text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
                Insight<span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">AI</span>
                <span class="text-xs bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-2 py-1 rounded-full font-semibold tracking-wider">PRO</span>
              </h1>
              <p class="text-slate-400 text-sm mt-2 flex items-center gap-3">
                <span class="flex items-center gap-1.5">
                  <i class="fa-solid fa-rocket w-3.5 h-3.5 text-indigo-400"></i>
                  亚马逊产品智能分析平台
                </span>
                <span class="w-1 h-1 bg-slate-600 rounded-full"></span>
                <span class="flex items-center gap-1.5">
                  <i class="fa-solid fa-chart-line w-3.5 h-3.5 text-purple-400"></i>
                  Listings & Reviews 深度洞察
                </span>
              </p>
            </div>
          </div>
          <div class="flex items-center gap-6">
            <div class="hidden lg:flex items-center gap-6 text-sm">
              <div class="flex items-center gap-2 text-slate-400 bg-slate-800/50 px-4 py-2 rounded-full border border-slate-700/50">
                <i class="fa-solid fa-microchip w-4 h-4 text-cyan-400"></i>
                <span>GPT-4 Turbo</span>
              </div>
            </div>
            <div class="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-5 py-2.5 rounded-full text-sm font-semibold backdrop-blur-sm">
              <span class="relative flex h-2.5 w-2.5">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
              </span>
              AI 引擎就绪
            </div>
          </div>
        </div>
      </div>
    </header>
  `;
}

function renderDataSourceBanner(): string {
  const totalReviews = sampleProductData.products.reduce((acc, p) => acc + p.customer_reviews.length, 0);
  return html`
    <div class="mb-6 flex items-center gap-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
      <div class="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
        <i class="fa-solid fa-database w-5 h-5 text-indigo-600"></i>
      </div>
      <div class="flex-1">
        <p class="text-sm text-slate-700">
          <span class="font-semibold">数据源已加载：</span>
          包含 ${sampleProductData.products.length} 个产品，共 ${totalReviews} 条评论
        </p>
        <p class="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
          <i class="fa-solid fa-globe w-3 h-3"></i>
          市场: ${sampleProductData.metadata.marketplace} · 
          抓取时间: ${new Date(sampleProductData.metadata.scrape_timestamp).toLocaleString('zh-CN')}
        </p>
      </div>
    </div>
  `;
}

function renderASINInput(currentProduct: Product | undefined): string {
  const availableAsins = getAvailableAsins();
  const hasData = !!currentProduct;
  const isValid = state.asin.length === 10;
  
  const avgRating = currentProduct 
    ? (currentProduct.customer_reviews.reduce((acc, r) => acc + r.star_rating, 0) / currentProduct.customer_reviews.length).toFixed(1)
    : '0';
  
  return html`
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 h-full">
      <div class="flex items-center gap-4 mb-5">
        <div class="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
          <i class="fa-solid fa-barcode w-5 h-5 text-white"></i>
        </div>
        <div>
          <h2 class="text-lg font-semibold text-slate-800">产品 ASIN</h2>
          <p class="text-sm text-slate-500">选择或输入产品标识符</p>
        </div>
      </div>
      <div class="relative">
        <input
          type="text"
          id="asin-input"
          value="${state.asin}"
          placeholder="例如：B0DNMZ2MLG"
          ${state.isAnalyzing ? 'disabled' : ''}
          class="w-full px-5 py-4 bg-slate-50 border-2 rounded-xl text-slate-800 placeholder-slate-400 font-mono text-lg tracking-widest transition-all duration-200 focus:outline-none focus:bg-white ${hasData ? 'border-emerald-300 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50' : isValid ? 'border-amber-300 focus:border-amber-400 focus:ring-4 focus:ring-amber-50' : 'border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50'} ${state.isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}"
          maxlength="10"
        />
        ${hasData ? html`
          <div class="absolute right-4 top-1/2 -translate-y-1/2">
            <span class="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 text-xs px-3 py-1.5 rounded-full font-medium border border-emerald-100">
              <i class="fa-solid fa-circle-check w-3 h-3"></i>
              数据已加载
            </span>
          </div>
        ` : isValid ? html`
          <div class="absolute right-4 top-1/2 -translate-y-1/2">
            <span class="flex items-center gap-1.5 bg-amber-50 text-amber-600 text-xs px-3 py-1.5 rounded-full font-medium border border-amber-100">
              <i class="fa-solid fa-circle-info w-3 h-3"></i>
              无数据
            </span>
          </div>
        ` : ''}
      </div>
      ${currentProduct ? html`
        <div class="mt-4 p-4 bg-gradient-to-r from-slate-50 to-indigo-50/50 rounded-xl border border-slate-100">
          <h4 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <i class="fa-solid fa-box-open w-3 h-3"></i>
            产品信息
          </h4>
          <p class="text-sm text-slate-700 font-medium line-clamp-2 leading-relaxed">
            ${currentProduct.productTitle}
          </p>
          <div class="flex items-center gap-4 mt-3 text-xs text-slate-500">
            <span class="flex items-center gap-1">
              <i class="fa-solid fa-comments w-3 h-3 text-amber-500"></i>
              ${currentProduct.customer_reviews.length} 条评论
            </span>
            <span class="flex items-center gap-1">
              <i class="fa-solid fa-star w-3 h-3 text-amber-500"></i>
              ${avgRating} 平均分
            </span>
          </div>
        </div>
      ` : ''}
      <div class="mt-4 flex items-center gap-2 text-xs text-slate-400">
        <i class="fa-solid fa-circle-info w-3.5 h-3.5"></i>
        <span>选择已加载数据中的 ASIN 进行分析</span>
      </div>
      ${availableAsins.length > 0 ? html`
        <div class="mt-4 pt-4 border-t border-slate-100">
          <p class="text-xs text-slate-500 mb-2 font-medium">已加载的产品：</p>
          <div class="flex flex-wrap gap-2">
            ${availableAsins.map(asinItem => html`
              <button
                data-asin="${asinItem}"
                class="asin-select-btn px-3 py-2 text-xs font-mono rounded-lg transition-all ${asinItem === state.asin ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-300 shadow-sm' : 'bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 border-2 border-transparent'} ${state.isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}"
                ${state.isAnalyzing ? 'disabled' : ''}
              >
                ${asinItem}
              </button>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

function renderTargetSelector(): string {
  const listingsTargets = analysisTargets.filter(t => t.source === 'Listings');
  const reviewsTargets = analysisTargets.filter(t => t.source === 'Reviews');
  
  return html`
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 h-full">
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200">
            <i class="fa-solid fa-check-double w-5 h-5 text-white"></i>
          </div>
          <div>
            <h2 class="text-lg font-semibold text-slate-800">选择分析目标</h2>
            <p class="text-sm text-slate-500">选择需要执行的 AI 分析维度</p>
          </div>
        </div>
        <div class="flex gap-3">
          <button id="select-all-btn" class="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors ${state.isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}" ${state.isAnalyzing ? 'disabled' : ''}>
            <i class="fa-solid fa-check-double w-3.5 h-3.5"></i>
            全选
          </button>
          <span class="text-slate-300">|</span>
          <button id="clear-all-btn" class="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors ${state.isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}" ${state.isAnalyzing ? 'disabled' : ''}>
            <i class="fa-solid fa-xmark w-3.5 h-3.5"></i>
            清空
          </button>
        </div>
      </div>
      
      <!-- Listings Section -->
      <div class="mb-6">
        <div class="flex items-center gap-2 mb-4">
          <div class="flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-blue-100">
            <i class="fa-solid fa-box-open w-3 h-3"></i>
            Listings 分析
          </div>
          <span class="text-xs text-slate-400">基于标题与五点描述</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          ${listingsTargets.map(target => renderTargetCard(target)).join('')}
        </div>
      </div>
      
      <!-- Reviews Section -->
      <div>
        <div class="flex items-center gap-2 mb-4">
          <div class="flex items-center gap-2 bg-amber-50 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-amber-100">
            <i class="fa-solid fa-star w-3 h-3"></i>
            Reviews 分析
          </div>
          <span class="text-xs text-slate-400">基于用户评论数据</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          ${reviewsTargets.map(target => renderTargetCard(target)).join('')}
        </div>
      </div>
      
      <!-- Selection Summary -->
      <div class="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-sm text-slate-500">
            已选择 <span class="font-bold text-indigo-600 text-base">${state.selectedTargets.length}</span> / ${analysisTargets.length} 个分析目标
          </span>
        </div>
        ${state.selectedTargets.length > 0 ? html`
          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-400">已选：</span>
            <div class="flex -space-x-2">
              ${state.selectedTargets.slice(0, 5).map(id => {
                const target = analysisTargets.find(t => t.id === id);
                if (!target) return '';
                return html`
                  <div class="w-8 h-8 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                    <i class="${target.icon} w-3 h-3 text-indigo-600"></i>
                  </div>
                `;
              }).join('')}
              ${state.selectedTargets.length > 5 ? html`
                <div class="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center border-2 border-white text-xs font-medium text-slate-600">
                  +${state.selectedTargets.length - 5}
                </div>
              ` : ''}
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function renderTargetCard(target: AnalysisTarget): string {
  const selected = state.selectedTargets.includes(target.id);
  const colorClasses: Record<string, { bg: string; icon: string; selectedBg: string; border: string }> = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600', selectedBg: 'bg-blue-50', border: 'border-blue-300' },
    cyan: { bg: 'bg-cyan-50', icon: 'text-cyan-600', selectedBg: 'bg-cyan-50', border: 'border-cyan-300' },
    red: { bg: 'bg-red-50', icon: 'text-red-600', selectedBg: 'bg-red-50', border: 'border-red-300' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-600', selectedBg: 'bg-amber-50', border: 'border-amber-300' },
    orange: { bg: 'bg-orange-50', icon: 'text-orange-600', selectedBg: 'bg-orange-50', border: 'border-orange-300' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600', selectedBg: 'bg-purple-50', border: 'border-purple-300' },
    teal: { bg: 'bg-teal-50', icon: 'text-teal-600', selectedBg: 'bg-teal-50', border: 'border-teal-300' },
    rose: { bg: 'bg-rose-50', icon: 'text-rose-600', selectedBg: 'bg-rose-50', border: 'border-rose-300' },
  };
  const colors = colorClasses[target.color] || colorClasses.blue;
  
  return html`
    <button
      data-target-id="${target.id}"
      class="target-card relative p-4 rounded-xl border-2 text-left transition-all duration-200 group hover:shadow-md ${selected ? `${colors.border} ${colors.selectedBg} shadow-sm` : 'border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-white'} ${state.isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}"
      ${state.isAnalyzing ? 'disabled' : ''}
    >
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${selected ? colors.bg : 'bg-slate-100 group-hover:bg-slate-200'}">
          <i class="${target.icon} w-4 h-4 transition-colors ${selected ? colors.icon : 'text-slate-500'}"></i>
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="font-semibold text-sm ${selected ? 'text-slate-800' : 'text-slate-700'}">
            ${target.name}
          </h3>
          <p class="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
            ${target.description}
          </p>
        </div>
        <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all mt-0.5 ${selected ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300 group-hover:border-slate-400'}">
          ${selected ? html`<i class="fa-solid fa-check w-2.5 h-2.5 text-white text-[10px]"></i>` : ''}
        </div>
      </div>
    </button>
  `;
}

function renderPromptPreview(currentProduct: Product): string {
  const prompts = state.selectedTargets.map(targetId => {
    const taskDef = getTaskDefinition(targetId);
    if (!taskDef) return null;
    try {
      const prompt = generateAnalysisPrompt(targetId, currentProduct, 'en');
      return { taskId: targetId, taskName: taskDef.name, prompt };
    } catch {
      return null;
    }
  }).filter((p): p is { taskId: string; taskName: string; prompt: string } => p !== null);
  
  if (prompts.length === 0) return '';
  
  return html`
    <div class="mb-8">
      <button id="toggle-prompt-panel" class="flex items-center gap-2 text-sm text-slate-600 hover:text-indigo-600 transition-colors mb-4">
        <i class="fa-solid fa-code w-4 h-4"></i>
        <span class="font-medium">${state.showPromptPanel ? '隐藏' : '查看'} AI 提示词模板</span>
        <span class="text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-500">${prompts.length} 个任务</span>
        <i class="fa-solid fa-chevron-${state.showPromptPanel ? 'up' : 'down'} w-3 h-3"></i>
      </button>
      ${state.showPromptPanel ? html`
        <div class="space-y-3 animate-fade-in-up">
          ${prompts.map((item, index) => renderPromptItem(item, index)).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

function renderPromptItem(item: { taskId: string; taskName: string; prompt: string }, index: number): string {
  const isExpanded = state.expandedPromptIndex === index;
  return html`
    <div class="bg-slate-900 rounded-xl overflow-hidden border border-slate-700">
      <button data-prompt-index="${index}" class="prompt-toggle w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
            <i class="fa-solid fa-terminal w-4 h-4 text-emerald-400"></i>
          </div>
          <div class="text-left">
            <h4 class="text-sm font-semibold text-white">AI 分析提示词</h4>
            <p class="text-xs text-slate-400">${item.taskName}</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-xs text-slate-500 font-mono">${item.prompt.length} chars</span>
          <i class="fa-solid fa-chevron-${isExpanded ? 'up' : 'down'} w-4 h-4 text-slate-400"></i>
        </div>
      </button>
      ${isExpanded ? html`
        <div class="border-t border-slate-700">
          <div class="flex items-center justify-between px-4 py-2 bg-slate-800/50">
            <div class="flex items-center gap-2 text-xs text-slate-400">
              <i class="fa-solid fa-file-code w-3 h-3"></i>
              <span>Prompt Template</span>
            </div>
            <button data-copy-prompt="${index}" class="copy-prompt-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all">
              <i class="fa-solid fa-copy w-3 h-3"></i>
              复制
            </button>
          </div>
          <div class="p-4 max-h-96 overflow-auto">
            <pre class="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">${escapeHtml(item.prompt)}</pre>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

function renderAnalysisButton(currentProduct: Product | undefined): string {
  const isButtonDisabled = state.selectedTargets.length === 0 || !currentProduct || state.isAnalyzing;
  const isComplete = state.progress >= 100;
  
  return html`
    <div class="relative overflow-hidden rounded-2xl shadow-xl">
      <div class="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-[length:200%_100%]"></div>
      <div class="absolute inset-0 overflow-hidden">
        <div class="absolute top-0 left-1/4 w-80 h-80 bg-white/20 rounded-full filter blur-[80px] animate-pulse"></div>
        <div class="absolute bottom-0 right-1/4 w-64 h-64 bg-pink-300/20 rounded-full filter blur-[60px]"></div>
      </div>
      <div class="absolute inset-0 opacity-5" style="background-image: linear-gradient(rgba(255,255,255,.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.2) 1px, transparent 1px); background-size: 30px 30px;"></div>
      
      <div class="relative p-8">
        <div class="flex items-center justify-between gap-8">
          <div class="flex items-center gap-5 text-white">
            <div class="relative">
              ${state.isAnalyzing ? html`<div class="absolute inset-0 bg-white/20 rounded-2xl animate-ping" style="animation-duration: 1.5s;"></div>` : ''}
              <div class="w-16 h-16 rounded-2xl flex items-center justify-center border border-white/20 backdrop-blur-sm shadow-lg transition-all ${state.isAnalyzing ? 'bg-white/20' : 'bg-white/10'}">
                <i class="fa-solid fa-${isComplete ? 'circle-check' : state.isAnalyzing ? 'robot' : 'bolt'} w-7 h-7 text-2xl ${state.isAnalyzing ? 'animate-pulse' : ''}"></i>
              </div>
            </div>
            <div>
              <h3 class="font-extrabold text-2xl flex items-center gap-3 tracking-tight">
                ${isComplete ? '分析完成' : state.isAnalyzing ? 'AI 正在分析中' : '执行 AI 分析'}
                ${state.isAnalyzing && !isComplete ? html`<i class="fa-solid fa-cog w-5 h-5 animate-spin opacity-60"></i>` : ''}
              </h3>
              <p class="text-white/70 text-sm mt-1.5 flex items-center gap-2">
                ${state.isAnalyzing ? html`
                  <span class="flex items-center gap-2">
                    <span class="relative flex h-2 w-2">
                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span class="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                    </span>
                    ${state.currentStep}
                  </span>
                ` : state.selectedTargets.length > 0 ? html`
                  <span class="bg-white/20 px-2 py-0.5 rounded-full text-xs font-semibold">${state.selectedTargets.length} 个维度</span>
                  <span>将生成结构化洞察报告</span>
                ` : '请先选择分析目标'}
              </p>
            </div>
          </div>
          
          <button id="run-analysis-btn" ${isButtonDisabled ? 'disabled' : ''} class="relative px-10 py-5 rounded-xl font-bold text-lg transition-all duration-300 flex items-center gap-3 min-w-[200px] justify-center shadow-2xl ${state.isAnalyzing ? 'bg-white/20 text-white cursor-wait backdrop-blur-sm border border-white/30' : isButtonDisabled ? 'bg-white/10 text-white/40 cursor-not-allowed border border-white/10' : 'bg-white text-indigo-600 hover:bg-indigo-50 hover:scale-105 hover:shadow-white/20 border border-white/50'}">
            ${state.isAnalyzing ? html`
              <i class="fa-solid fa-spinner w-5 h-5 animate-spin"></i>
              分析中...
            ` : html`
              <i class="fa-solid fa-play w-5 h-5"></i>
              开始分析
            `}
          </button>
        </div>
        
        ${state.isAnalyzing ? html`
          <div class="mt-8">
            <div class="flex items-center justify-between text-white/80 text-sm mb-3">
              <span class="flex items-center gap-2 font-medium">
                <i class="fa-solid fa-spinner w-3.5 h-3.5 animate-spin"></i>
                分析进度
              </span>
              <span class="font-mono font-bold text-lg">${Math.round(state.progress)}%</span>
            </div>
            <div class="h-3 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm shadow-inner">
              <div class="h-full bg-gradient-to-r from-white via-indigo-200 to-white rounded-full transition-all duration-500 ease-out relative" style="width: ${state.progress}%;">
                <div class="absolute inset-0 shimmer"></div>
                <div class="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg shadow-white/50"></div>
              </div>
            </div>
            <div class="flex justify-between mt-3 text-xs text-white/50">
              <span class="${state.progress >= 0 ? 'text-white/80' : ''}">数据加载</span>
              <span class="${state.progress >= 33 ? 'text-white/80' : ''}">NLP 处理</span>
              <span class="${state.progress >= 66 ? 'text-white/80' : ''}">洞察生成</span>
              <span class="${state.progress >= 100 ? 'text-white/80' : ''}">完成</span>
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function renderJsonViewer(): string {
  if (!state.analysisReport) return '';
  
  const filteredReport: Record<string, unknown> = {
    asin: state.analysisReport.asin,
    product_title: state.analysisReport.product_title,
    analysis_timestamp: state.analysisReport.analysis_timestamp,
    market: state.analysisReport.market,
  };
  
  const keyMap: Record<string, keyof FullAnalysisReport> = {
    'title-keywords': 'title_keywords',
    'selling-points': 'selling_points',
    'fatal-flaws': 'fatal_flaws',
    'wow-moments': 'wow_moments',
    'hesitation-points': 'hesitation_points',
    'buyer-profile': 'buyer_profile',
    'vocab-gap': 'vocab_gap',
    'promise-reality': 'promise_reality'
  };
  
  state.selectedTargets.forEach(targetId => {
    const key = keyMap[targetId];
    if (key && state.analysisReport && state.analysisReport[key]) {
      filteredReport[key] = state.analysisReport[key];
    }
  });
  
  const jsonString = JSON.stringify(filteredReport, null, 2);
  
  return html`
    <div class="mb-8 bg-slate-900 rounded-2xl overflow-hidden border border-slate-700/50 shadow-xl transition-all duration-300">
      <div class="flex items-center justify-between p-4 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700/50">
        <button id="toggle-json-viewer" class="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div class="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
            <i class="fa-solid fa-database w-5 h-5 text-white"></i>
          </div>
          <div class="text-left">
            <h4 class="text-sm font-bold text-white flex items-center gap-2">
              AI 分析报告 JSON
              <span class="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">RAW DATA</span>
            </h4>
            <p class="text-xs text-slate-400">${state.selectedTargets.length} 个分析维度 · ${(jsonString.length / 1024).toFixed(1)} KB</p>
          </div>
        </button>
        <div class="flex items-center gap-2">
          <button id="copy-json-btn" class="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 border border-slate-600/50 transition-all">
            <i class="fa-solid fa-copy w-3.5 h-3.5"></i>
            复制 JSON
          </button>
          <button id="toggle-json-btn" class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 border border-slate-600/50 transition-all">
            <i class="fa-solid fa-chevron-${state.showJsonViewer ? 'up' : 'down'} w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
      ${state.showJsonViewer ? html`
        <div class="animate-fade-in">
          <div class="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-700/30">
            <div class="flex items-center gap-2 text-xs text-slate-400">
              <i class="fa-solid fa-file-code w-3.5 h-3.5"></i>
              <span>analysis_report.json</span>
            </div>
            <div class="flex items-center gap-4 text-xs text-slate-500">
              <span>行数: ${jsonString.split('\n').length}</span>
              <span>字符: ${jsonString.length.toLocaleString()}</span>
            </div>
          </div>
          <div class="overflow-auto p-4 max-h-96">
            <pre class="text-xs font-mono leading-relaxed"><code class="text-slate-300">${highlightJson(jsonString)}</code></pre>
          </div>
        </div>
      ` : html`
        <div class="px-4 py-3 bg-slate-800/30 border-t border-slate-700/30">
          <div class="flex items-center gap-2 text-xs text-slate-500">
            <i class="fa-solid fa-code w-3 h-3"></i>
            <span class="font-mono truncate">{ "asin": "${state.analysisReport.asin}", "analysis_timestamp": "${state.analysisReport.analysis_timestamp}", ... }</span>
          </div>
        </div>
      `}
    </div>
  `;
}

function renderResultsGrid(): string {
  if (state.results.length === 0) return '';
  
  const listingsResults = state.results.filter(r => r.source === 'Listings');
  const reviewsResults = state.results.filter(r => r.source === 'Reviews');
  
  return html`
    <div class="space-y-10">
      <!-- Results Header -->
      <div class="relative overflow-hidden rounded-2xl">
        <div class="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900"></div>
        <div class="absolute inset-0 overflow-hidden">
          <div class="absolute top-0 right-1/4 w-80 h-80 bg-emerald-500/20 rounded-full filter blur-[100px] animate-pulse"></div>
          <div class="absolute bottom-0 left-1/4 w-64 h-64 bg-blue-500/20 rounded-full filter blur-[80px]"></div>
        </div>
        <div class="relative p-8">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-5">
              <div class="relative">
                <div class="absolute inset-0 bg-emerald-400 rounded-2xl blur-lg opacity-40"></div>
                <div class="relative w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-300/30 shadow-xl">
                  <i class="fa-solid fa-circle-check w-7 h-7 text-white text-2xl"></i>
                </div>
              </div>
              <div>
                <h2 class="text-3xl font-extrabold text-white tracking-tight">分析报告</h2>
                <p class="text-slate-400 text-sm mt-1 flex items-center gap-2">
                  <span class="font-mono bg-slate-700/50 px-2 py-0.5 rounded text-slate-300">${state.asin}</span>
                  <span class="w-1 h-1 bg-slate-600 rounded-full"></span>
                  <span>分析完成于 ${new Date().toLocaleTimeString('zh-CN')}</span>
                </p>
              </div>
            </div>
            <div class="flex items-center gap-8">
              <div class="flex items-center gap-6">
                <div class="text-center">
                  <div class="text-4xl font-extrabold text-white">${state.results.length}</div>
                  <div class="text-slate-400 text-xs uppercase tracking-wider mt-1">分析维度</div>
                </div>
                <div class="w-px h-14 bg-slate-700"></div>
                <div class="text-center">
                  <div class="text-4xl font-extrabold text-emerald-400">100%</div>
                  <div class="text-slate-400 text-xs uppercase tracking-wider mt-1">完成度</div>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <button class="flex items-center gap-2 bg-white/5 hover:bg-white/10 backdrop-blur-sm text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all border border-white/10 hover:border-white/20">
                  <i class="fa-solid fa-file-export w-4 h-4"></i>
                  导出 JSON
                </button>
                <button class="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30">
                  <i class="fa-solid fa-download w-4 h-4"></i>
                  下载报告
                </button>
              </div>
            </div>
          </div>
          
          <!-- Summary stats bar -->
          <div class="mt-6 pt-6 border-t border-slate-700/50 grid grid-cols-4 gap-4">
            <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <i class="fa-solid fa-box-open w-5 h-5 text-blue-400"></i>
                </div>
                <div>
                  <div class="text-xl font-bold text-white">${listingsResults.length}</div>
                  <div class="text-xs text-slate-400">Listings 分析</div>
                </div>
              </div>
            </div>
            <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                  <i class="fa-solid fa-star w-5 h-5 text-amber-400"></i>
                </div>
                <div>
                  <div class="text-xl font-bold text-white">${reviewsResults.length}</div>
                  <div class="text-xs text-slate-400">Reviews 分析</div>
                </div>
              </div>
            </div>
            <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <i class="fa-solid fa-chart-pie w-5 h-5 text-purple-400"></i>
                </div>
                <div>
                  <div class="text-xl font-bold text-white">${state.results.reduce((acc, r) => acc + r.highlights.length, 0)}</div>
                  <div class="text-xs text-slate-400">核心发现</div>
                </div>
              </div>
            </div>
            <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                  <i class="fa-solid fa-circle-check w-5 h-5 text-emerald-400"></i>
                </div>
                <div>
                  <div class="text-xl font-bold text-white">${state.results.reduce((acc, r) => acc + r.details.length, 0)}</div>
                  <div class="text-xs text-slate-400">分析维度</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      ${listingsResults.length > 0 ? html`
        <div>
          <div class="flex items-center gap-4 mb-6">
            <div class="flex items-center gap-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-blue-500/20">
              <i class="fa-solid fa-box-open w-4 h-4"></i>
              Listings 分析结果
            </div>
            <div class="flex-1 h-px bg-gradient-to-r from-blue-300 via-blue-200 to-transparent"></div>
            <span class="text-sm text-slate-500 font-semibold bg-slate-100 px-3 py-1 rounded-full">${listingsResults.length} 项</span>
          </div>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            ${listingsResults.map((result, index) => renderResultWidget(result, index)).join('')}
          </div>
        </div>
      ` : ''}
      
      ${reviewsResults.length > 0 ? html`
        <div>
          <div class="flex items-center gap-4 mb-6">
            <div class="flex items-center gap-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-amber-500/20">
              <i class="fa-solid fa-star w-4 h-4"></i>
              Reviews 分析结果
            </div>
            <div class="flex-1 h-px bg-gradient-to-r from-amber-300 via-amber-200 to-transparent"></div>
            <span class="text-sm text-slate-500 font-semibold bg-slate-100 px-3 py-1 rounded-full">${reviewsResults.length} 项</span>
          </div>
          <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            ${reviewsResults.map((result, index) => renderResultWidget(result, index + listingsResults.length)).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

function renderResultWidget(result: AnalysisResult, index: number): string {
  const colorSchemes: Record<string, { gradient: string; light: string; text: string; iconBg: string }> = {
    blue: { gradient: 'from-blue-500 via-blue-600 to-indigo-600', light: 'bg-blue-50', text: 'text-blue-700', iconBg: 'bg-blue-500/20' },
    cyan: { gradient: 'from-cyan-500 via-cyan-600 to-teal-600', light: 'bg-cyan-50', text: 'text-cyan-700', iconBg: 'bg-cyan-500/20' },
    red: { gradient: 'from-red-500 via-red-600 to-rose-600', light: 'bg-red-50', text: 'text-red-700', iconBg: 'bg-red-500/20' },
    amber: { gradient: 'from-amber-500 via-orange-500 to-orange-600', light: 'bg-amber-50', text: 'text-amber-700', iconBg: 'bg-amber-500/20' },
    orange: { gradient: 'from-orange-500 via-orange-600 to-red-500', light: 'bg-orange-50', text: 'text-orange-700', iconBg: 'bg-orange-500/20' },
    purple: { gradient: 'from-purple-500 via-purple-600 to-indigo-600', light: 'bg-purple-50', text: 'text-purple-700', iconBg: 'bg-purple-500/20' },
    teal: { gradient: 'from-teal-500 via-teal-600 to-cyan-600', light: 'bg-teal-50', text: 'text-teal-700', iconBg: 'bg-teal-500/20' },
    rose: { gradient: 'from-rose-500 via-pink-500 to-pink-600', light: 'bg-rose-50', text: 'text-rose-700', iconBg: 'bg-rose-500/20' },
  };
  
  const highlightStyles: Record<string, { bg: string; text: string; border: string; icon: string; iconColor: string }> = {
    danger: { bg: 'bg-gradient-to-r from-red-50 to-rose-50', text: 'text-red-700', border: 'border-red-200', icon: 'fa-circle-exclamation', iconColor: 'text-red-500' },
    success: { bg: 'bg-gradient-to-r from-emerald-50 to-green-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: 'fa-circle-check', iconColor: 'text-emerald-500' },
    warning: { bg: 'bg-gradient-to-r from-amber-50 to-orange-50', text: 'text-amber-700', border: 'border-amber-200', icon: 'fa-triangle-exclamation', iconColor: 'text-amber-500' },
    info: { bg: 'bg-gradient-to-r from-blue-50 to-indigo-50', text: 'text-blue-700', border: 'border-blue-200', icon: 'fa-circle-info', iconColor: 'text-blue-500' },
  };
  
  const colors = colorSchemes[result.color] || colorSchemes.blue;
  
  return html`
    <div class="group bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden hover:shadow-2xl hover:border-slate-300/60 transition-all duration-500 animate-fade-in-up" style="animation-delay: ${index * 100}ms;">
      <!-- Header -->
      <div class="relative overflow-hidden bg-gradient-to-r ${colors.gradient} p-6 text-white">
        <div class="absolute inset-0 opacity-10">
          <div class="absolute top-0 right-0 w-40 h-40 bg-white rounded-full filter blur-3xl translate-x-1/2 -translate-y-1/2"></div>
          <div class="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full filter blur-2xl -translate-x-1/2 translate-y-1/2"></div>
        </div>
        <div class="relative flex items-center gap-4">
          <div class="w-14 h-14 rounded-2xl flex items-center justify-center border border-white/20 backdrop-blur-sm shadow-lg ${colors.iconBg}">
            <i class="${result.icon} w-6 h-6 text-xl"></i>
          </div>
          <div class="flex-1">
            <h3 class="font-bold text-xl tracking-tight">${result.title}</h3>
            <div class="flex items-center gap-2 mt-1">
              <span class="text-xs px-2.5 py-1 rounded-full bg-white/20 border border-white/20 font-medium backdrop-blur-sm">${result.source}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Stats -->
      <div class="p-5 bg-gradient-to-b from-slate-50/80 to-white border-b border-slate-100">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center">
            <i class="fa-solid fa-chart-bar w-3 h-3 text-indigo-600"></i>
          </div>
          <span class="text-xs font-bold text-slate-600 uppercase tracking-wider">数据概览</span>
        </div>
        <div class="grid grid-cols-3 gap-3">
          ${result.stats.map(stat => html`
            <div class="relative bg-white rounded-xl p-4 text-center border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all">
              <div class="text-2xl font-extrabold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">${stat.value}</div>
              <div class="text-xs text-slate-500 mt-1 font-medium">${stat.label}</div>
            </div>
          `).join('')}
        </div>
      </div>
      
      <!-- Highlights -->
      <div class="p-5 border-b border-slate-100">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-6 h-6 bg-amber-100 rounded-lg flex items-center justify-center">
            <i class="fa-solid fa-lightbulb w-3 h-3 text-amber-600"></i>
          </div>
          <span class="text-xs font-bold text-slate-600 uppercase tracking-wider">核心发现</span>
        </div>
        <div class="space-y-2.5">
          ${result.highlights.map(highlight => {
            const style = highlightStyles[highlight.type];
            return html`
              <div class="relative flex items-start gap-3 px-4 py-3 rounded-xl text-sm font-medium border transition-all hover:shadow-md ${style.bg} ${style.text} ${style.border}">
                <i class="fa-solid ${style.icon} w-4 h-4 mt-0.5 flex-shrink-0 ${style.iconColor}"></i>
                <span class="leading-relaxed">${highlight.text}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      
      <!-- Details -->
      <div class="p-5">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center">
            <i class="fa-solid fa-list w-3 h-3 text-slate-600"></i>
          </div>
          <span class="text-xs font-bold text-slate-600 uppercase tracking-wider">详细分析</span>
        </div>
        <div class="space-y-5">
          ${result.details.map(detail => html`
            <div>
              <span class="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full mb-3 ${colors.light} ${colors.text}">
                <i class="fa-solid fa-quote-left w-2.5 h-2.5 opacity-60"></i>
                ${detail.category}
              </span>
              <div class="flex flex-wrap gap-2">
                ${detail.items.map(item => html`
                  <span class="inline-block px-3 py-2 bg-slate-50 text-slate-700 text-xs rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition-colors cursor-default border border-slate-100 hover:border-indigo-200 font-medium">${item}</span>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderEmptyState(): string {
  return html`
    <div class="text-center py-20">
      <div class="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl mb-8 shadow-inner">
        <i class="fa-solid fa-lightbulb w-10 h-10 text-slate-400 text-4xl"></i>
      </div>
      <h3 class="text-2xl font-bold text-slate-700 mb-3">准备开始智能分析</h3>
      <p class="text-slate-500 max-w-lg mx-auto leading-relaxed">
        选择分析目标并确认 ASIN，点击"开始分析"按钮，<br />AI 将自动提取 Listings 和 Reviews 中的关键洞察
      </p>
      <div class="mt-10 flex items-center justify-center gap-8">
        <div class="flex items-center gap-3 text-slate-500">
          <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center border border-blue-200">
            <i class="fa-solid fa-box-open w-5 h-5 text-blue-600"></i>
          </div>
          <div class="text-left">
            <div class="font-semibold text-slate-700">Listings 分析</div>
            <div class="text-xs text-slate-400">标题与卖点洞察</div>
          </div>
        </div>
        <div class="w-px h-10 bg-slate-200"></div>
        <div class="flex items-center gap-3 text-slate-500">
          <div class="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center border border-amber-200">
            <i class="fa-solid fa-star w-5 h-5 text-amber-600"></i>
          </div>
          <div class="text-left">
            <div class="font-semibold text-slate-700">Reviews 分析</div>
            <div class="text-xs text-slate-400">用户评论深度挖掘</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderFooter(): string {
  return html`
    <footer class="border-t border-slate-200/60 mt-16 bg-white/50 backdrop-blur-sm">
      <div class="max-w-7xl mx-auto px-6 py-8">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-xs">AI</span>
            </div>
            <span class="text-sm text-slate-600 font-medium">InsightAI 智能分析平台</span>
          </div>
          <p class="text-sm text-slate-400">基于大语言模型的电商产品洞察工具 · 让数据驱动决策</p>
        </div>
      </div>
    </footer>
  `;
}

// 事件绑定
function bindEvents(): void {
  // ASIN 输入
  const asinInput = $('#asin-input') as HTMLInputElement;
  if (asinInput) {
    asinInput.addEventListener('input', (e) => {
      state.asin = (e.target as HTMLInputElement).value.toUpperCase();
      render();
    });
  }
  
  // ASIN 选择按钮
  $$('.asin-select-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const asin = btn.dataset.asin;
      if (asin && !state.isAnalyzing) {
        state.asin = asin;
        render();
      }
    });
  });
  
  // 目标选择卡片
  $$('.target-card').forEach(card => {
    card.addEventListener('click', () => {
      if (state.isAnalyzing) return;
      const targetId = card.dataset.targetId;
      if (targetId) {
        if (state.selectedTargets.includes(targetId)) {
          state.selectedTargets = state.selectedTargets.filter(id => id !== targetId);
        } else {
          state.selectedTargets.push(targetId);
        }
        render();
      }
    });
  });
  
  // 全选按钮
  const selectAllBtn = $('#select-all-btn');
  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', () => {
      if (!state.isAnalyzing) {
        state.selectedTargets = analysisTargets.map(t => t.id);
        render();
      }
    });
  }
  
  // 清空按钮
  const clearAllBtn = $('#clear-all-btn');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
      if (!state.isAnalyzing) {
        state.selectedTargets = [];
        render();
      }
    });
  }
  
  // 提示词面板切换
  const togglePromptPanel = $('#toggle-prompt-panel');
  if (togglePromptPanel) {
    togglePromptPanel.addEventListener('click', () => {
      state.showPromptPanel = !state.showPromptPanel;
      render();
    });
  }
  
  // 提示词展开/折叠
  $$('.prompt-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.promptIndex || '-1');
      state.expandedPromptIndex = state.expandedPromptIndex === index ? null : index;
      render();
    });
  });
  
  // 复制提示词
  $$('.copy-prompt-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const currentProduct = getProductByAsin(state.asin);
      if (!currentProduct) return;
      
      const index = parseInt(btn.dataset.copyPrompt || '-1');
      const targetId = state.selectedTargets[index];
      if (targetId) {
        try {
          const prompt = generateAnalysisPrompt(targetId, currentProduct, 'en');
          await navigator.clipboard.writeText(prompt);
          btn.innerHTML = '<i class="fa-solid fa-check w-3 h-3"></i> 已复制';
          setTimeout(() => {
            btn.innerHTML = '<i class="fa-solid fa-copy w-3 h-3"></i> 复制';
          }, 2000);
        } catch (err) {
          console.error('Copy failed:', err);
        }
      }
    });
  });
  
  // JSON 查看器切换
  const toggleJsonViewer = $('#toggle-json-viewer');
  const toggleJsonBtn = $('#toggle-json-btn');
  [toggleJsonViewer, toggleJsonBtn].forEach(el => {
    if (el) {
      el.addEventListener('click', () => {
        state.showJsonViewer = !state.showJsonViewer;
        render();
      });
    }
  });
  
  // 复制 JSON
  const copyJsonBtn = $('#copy-json-btn');
  if (copyJsonBtn && state.analysisReport) {
    copyJsonBtn.addEventListener('click', async () => {
      try {
        const jsonString = JSON.stringify(state.analysisReport, null, 2);
        await navigator.clipboard.writeText(jsonString);
        copyJsonBtn.innerHTML = '<i class="fa-solid fa-check w-3.5 h-3.5"></i> 已复制';
        setTimeout(() => {
          copyJsonBtn.innerHTML = '<i class="fa-solid fa-copy w-3.5 h-3.5"></i> 复制 JSON';
        }, 2000);
      } catch (err) {
        console.error('Copy failed:', err);
      }
    });
  }
  
  // 运行分析按钮
  const runAnalysisBtn = $('#run-analysis-btn');
  if (runAnalysisBtn) {
    runAnalysisBtn.addEventListener('click', async () => {
      const currentProduct = getProductByAsin(state.asin);
      if (state.selectedTargets.length === 0 || !currentProduct || state.isAnalyzing) return;
      
      state.isAnalyzing = true;
      state.progress = 0;
      state.results = [];
      state.analysisReport = null;
      render();
      
      try {
        const results = await runAnalysis(
          state.selectedTargets,
          state.asin,
          (progress, step) => {
            state.progress = progress;
            state.currentStep = step;
            render();
          }
        );
        
        state.results = results;
        state.analysisReport = getSampleReport();
      } catch (error) {
        console.error('Analysis failed:', error);
      } finally {
        state.isAnalyzing = false;
        render();
      }
    });
  }
}

// 辅助函数
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function highlightJson(json: string): string {
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

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  render();
});

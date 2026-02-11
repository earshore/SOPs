/**
 * Analysis 子模块
 * 负责 AI 分析功能
 * 
 * 架构说明：
 * - 继承 BaseModule 实现生命周期管理
 * - 状态保存到 state.analysis 命名空间
 * - 通过 EventBus 与其他模块通信
 * - 职责分离：PromptBuilder、GridManager、EditManager
 */

import { escapeHtml } from '@/common/utils/security';
import { loadTemplate } from '../../../../../common/utils/viewLoader';
import BaseModule from "../../../../../common/BaseModule";
import state from "../../../../../common/state";
import { PROVIDERS, LANGUAGE_HEADERS } from '../../../../../common/constants/constants';
import { ANALYSIS_MODULES } from '../constants/prompts.ts';
import { showToast } from '../../../../../common/ui';
import { HistoryService } from '../services/historyService.ts';
import { renderHistory } from '../scraper/index.ts';
import { AnalysisService } from '../services/analysisService.ts';
import { StorageService, STORAGE_KEYS } from '../../../../../services/storageService.ts';
import { ErrorService } from '../../../../../services/errorService';
import { renderWidgetCard, renderViewModeHTML, renderSkeleton } from './renderer.js';
import eventBus from '../../../../../common/EventBus.ts';
import { MODULE_EVENTS } from '../../../../../common/constants/eventConstants';

// 导入管理器
import { PromptBuilder } from './promptBuilder.js';
import { GridManager } from './gridManager.js';
import { EditManager } from './editManager.js';

import '../master_prompt_style.css';

// ========================================== 
// Analysis Module Class
// ========================================== 

class AnalysisModule extends BaseModule {
  constructor(container) {
    super('master_prompt_analysis');
    this.container = container;
    
    // 初始化管理器
    this.promptBuilder = new PromptBuilder(this);
    this.gridManager = new GridManager(this);
    this.editManager = new EditManager(this);
    
    this.registerGlobalActions();
  }

  async render() {
    // render() 方法�?BaseModule 要求实现
    // 但在这个模块中，HTML 已经�?mount() 函数中加�?
  }

  async init() {
    console.log("🚀 Analysis Module Initialized (BaseModule)");

    // 1. UI Initialization
    this.setupUI();

    // 订阅 Scraper 事件
    this.addDisposable(eventBus.on(MODULE_EVENTS.SCRAPER.SCRAPE_SUCCESS, () => {
      console.log("AnalysisModule received SCRAPE_SUCCESS");
      if (state.scraper.scrapedData && state.scraper.scrapedData.products) {
        state.analysis.selectedAsins = state.scraper.scrapedData.products.map((p) => p.asin);
      }
      this.updateAsinSelectList();
    }));

    // 初始加载现有数据
    if (state.scraper.scrapedData) {
      if (!state.analysis.selectedAsins || state.analysis.selectedAsins.length === 0) {
        if (state.scraper.scrapedData.products) {
          state.analysis.selectedAsins = state.scraper.scrapedData.products.map((p) => p.asin);
        }
      }
      this.updateAsinSelectList();
    }

    // 2. 绑定事件
    const analyzeBtn = document.getElementById("analyze-btn");
    if (analyzeBtn) {
      this.addEventListener(analyzeBtn, "click", () => this.analyzeSelectedAsins());
    }

    // 3. 恢复视图（如果报告存在）
    if (state.analysis.analysisReport) {
      this.renderReport();
    }
  }

  onUnmount() {
    console.log("💤 Analysis Module Unmounting...");
    if (this.gridManager) {
      this.gridManager.destroy();
    }
    if (this.editManager) {
      this.editManager.cleanup();
    }
    // BaseModule 自动处理事件监听器清理
  }


  // ================== UI Setup ==================

  setupUI() {
    this.renderModuleSelector();
    this.promptBuilder.renderPromptPreviewArea();
  }

  renderModuleSelector() {
    this.renderModuleCards();
    this.updateSelectionSummary();
    this.setTimeout(() => this.promptBuilder.updatePromptPreview(), 100);
  }

  renderModuleCards() {
    const listingsContainer = document.getElementById("listings-container");
    const reviewsContainer = document.getElementById("reviews-container");
    
    if (!listingsContainer || !reviewsContainer) return;

    // 初始化选中状态
    if (!state.analysis.selectedModules) {
      state.analysis.selectedModules = ANALYSIS_MODULES.map(m => m.id);
    }

    // 渲染 Listings 模块
    const listingsModules = ANALYSIS_MODULES.filter(m => m.category === 'listing');
    listingsContainer.innerHTML = listingsModules.map(mod => {
      const isSelected = state.analysis.selectedModules.includes(mod.id);
      return this.renderModuleCard(mod, isSelected);
    }).join('');

    // 渲染 Reviews 模块
    const reviewsModules = ANALYSIS_MODULES.filter(m => m.category === 'reviews');
    reviewsContainer.innerHTML = reviewsModules.map(mod => {
      const isSelected = state.analysis.selectedModules.includes(mod.id);
      return this.renderModuleCard(mod, isSelected);
    }).join('');

    // 绑定点击事件
    document.querySelectorAll('.module-card').forEach(card => {
      this.addEventListener(card, 'click', (e) => {
        const moduleId = card.dataset.moduleId;
        this.toggleModule(moduleId);
      });
    });
  }

  renderModuleCard(module, isSelected) {
    const colorMap = {
      'blue': { bg: 'bg-blue-50', icon: 'text-blue-600', selectedBg: 'bg-blue-50', border: 'border-blue-300' },
      'cyan': { bg: 'bg-cyan-50', icon: 'text-cyan-600', selectedBg: 'bg-cyan-50', border: 'border-cyan-300' },
      'red': { bg: 'bg-red-50', icon: 'text-red-600', selectedBg: 'bg-red-50', border: 'border-red-300' },
      'amber': { bg: 'bg-amber-50', icon: 'text-amber-600', selectedBg: 'bg-amber-50', border: 'border-amber-300' },
      'orange': { bg: 'bg-orange-50', icon: 'text-orange-600', selectedBg: 'bg-orange-50', border: 'border-orange-300' },
      'purple': { bg: 'bg-purple-50', icon: 'text-purple-600', selectedBg: 'bg-purple-50', border: 'border-purple-300' },
      'teal': { bg: 'bg-teal-50', icon: 'text-teal-600', selectedBg: 'bg-teal-50', border: 'border-teal-300' },
      'rose': { bg: 'bg-rose-50', icon: 'text-rose-600', selectedBg: 'bg-rose-50', border: 'border-rose-300' }
    };

    const iconMap = {
      'title_seo_roots': 'fa-font',
      'selling_proposition_deconstruction': 'fa-layer-group',
      'neg_deal_breakers': 'fa-triangle-exclamation',
      'pos_aha_moments': 'fa-star',
      'buying_hesitations': 'fa-circle-question',
      'user_avatar_context': 'fa-user-group',
      'vocabulary_gap': 'fa-comments',
      'promise_reality_check': 'fa-scale-unbalanced'
    };

    const colors = colorMap[module.color] || colorMap.blue;
    const icon = iconMap[module.id] || 'fa-info-circle';

    return `
      <button
        data-module-id="${module.id}"
        data-category="${module.category}"
        class="module-card relative p-4 rounded-xl border-2 text-left transition-all duration-200 group hover:shadow-md ${
          isSelected
            ? `${colors.border} ${colors.selectedBg} shadow-sm`
            : 'border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-white'
        }"
      >
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
            isSelected ? colors.bg : 'bg-slate-100 group-hover:bg-slate-200'
          }">
            <i class="fas ${icon} w-4 h-4 transition-colors ${
              isSelected ? colors.icon : 'text-slate-500'
            }"></i>
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-semibold text-sm ${
              isSelected ? 'text-slate-800' : 'text-slate-700'
            }" title="${module.label_cn}">
              ${module.label_cn}
            </h3>
            <p class="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed" title="${module.desc_cn}">
              ${module.desc_cn}
            </p>
          </div>
          <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all mt-0.5 ${
            isSelected
              ? 'border-indigo-500 bg-indigo-500'
              : 'border-slate-300 group-hover:border-slate-400'
          }">
            ${isSelected ? '<i class="fas fa-check w-2.5 h-2.5 text-white text-[10px]"></i>' : ''}
          </div>
        </div>
      </button>
    `;
  }

  toggleModule(moduleId) {
    if (!state.analysis.selectedModules) {
      state.analysis.selectedModules = [];
    }

    const index = state.analysis.selectedModules.indexOf(moduleId);
    if (index > -1) {
      state.analysis.selectedModules.splice(index, 1);
    } else {
      state.analysis.selectedModules.push(moduleId);
    }

    this.renderModuleCards();
    this.updateSelectionSummary();
    this.promptBuilder.updatePromptPreview();
  }

  updateSelectionSummary() {
    const selectedCount = state.analysis.selectedModules?.length || 0;
    const totalCount = ANALYSIS_MODULES.length;

    const countEl = document.getElementById('selected-count');
    const totalEl = document.getElementById('total-count');
    const iconsContainer = document.getElementById('selected-icons-container');

    if (countEl) countEl.textContent = selectedCount;
    if (totalEl) totalEl.textContent = totalCount;

    if (iconsContainer) {
      if (selectedCount > 0) {
        const iconMap = {
          'title_seo_roots': 'fa-font',
          'selling_proposition_deconstruction': 'fa-layer-group',
          'neg_deal_breakers': 'fa-triangle-exclamation',
          'pos_aha_moments': 'fa-star',
          'buying_hesitations': 'fa-circle-question',
          'user_avatar_context': 'fa-user-group',
          'vocabulary_gap': 'fa-comments',
          'promise_reality_check': 'fa-scale-unbalanced'
        };

        iconsContainer.innerHTML = `
          <span class="text-xs text-slate-400">已选：</span>
          <div class="flex -space-x-2">
            ${state.analysis.selectedModules.slice(0, 5).map(id => {
              const module = ANALYSIS_MODULES.find(m => m.id === id);
              if (!module) return '';
              const icon = iconMap[id] || 'fa-info-circle';
              return `
                <div class="w-8 h-8 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                  <i class="fas ${icon} w-3 h-3 text-indigo-600"></i>
                </div>
              `;
            }).join('')}
            ${selectedCount > 5 ? `
              <div class="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center border-2 border-white text-xs font-medium text-slate-600">
                +${selectedCount - 5}
              </div>
            ` : ''}
          </div>
        `;
      } else {
        iconsContainer.innerHTML = '';
      }
    }
  }

  toggleAllModules(checked) {
    if (checked) {
      state.analysis.selectedModules = ANALYSIS_MODULES.map(m => m.id);
    } else {
      state.analysis.selectedModules = [];
    }
    this.renderModuleCards();
    this.updateSelectionSummary();
    this.promptBuilder.updatePromptPreview();
  }


  updateAsinSelectList() {
    const container = document.getElementById("asin-select-list");
    if (!container) return;

    if (!state.scraper.scrapedData || !state.scraper.scrapedData.products || state.scraper.scrapedData.products.length === 0) {
      // ✅ 安全: 静态HTML模板，无用户输入
      container.innerHTML = '<p class="text-sm text-slate-400 text-center py-6">暂无数据</p>';
      return;
    }

    if (!state.analysis.selectedAsins) {
      state.analysis.selectedAsins = [];
    }

    // ✅ 安全: 静态HTML模板，无用户输入
    container.innerHTML = state.scraper.scrapedData.products.map((p) => {
      const isSelected = state.analysis.selectedAsins.includes(p.asin);
      return `
        <label class="flex items-center gap-2 p-2 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors group">
          <input type="checkbox" value="${p.asin}" ${isSelected ? 'checked' : ''} 
            class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 asin-checkbox">
          <span class="text-sm font-mono font-medium text-slate-700 group-hover:text-blue-700">${p.asin}</span>
        </label>
      `;
    }).join("");

    // 绑定复选框事件
    container.querySelectorAll('.asin-checkbox').forEach(checkbox => {
      this.addEventListener(checkbox, 'change', (e) => {
        const asin = e.target.value;
        if (e.target.checked) {
          if (!state.analysis.selectedAsins.includes(asin)) {
            state.analysis.selectedAsins.push(asin);
          }
        } else {
          state.analysis.selectedAsins = state.analysis.selectedAsins.filter(a => a !== asin);
        }
      });
    });
  }

  selectAllAsins() {
    if (!state.scraper.scrapedData || !state.scraper.scrapedData.products) return;
    state.analysis.selectedAsins = state.scraper.scrapedData.products.map(p => p.asin);
    this.updateAsinSelectList();
  }

  // ================== Core Analysis Logic ==================

  async analyzeSelectedAsins() {
    if (!state.analysis.selectedAsins || state.analysis.selectedAsins.length === 0) {
      showToast("请先选择要分析的 ASIN", "warning");
      return;
    }

    const currentPrompt = this.promptBuilder.buildDynamicPrompt();
    if (!currentPrompt) {
      showToast("请至少勾选一个分析目标", "warning");
      return;
    }

    const isListingSelected = true;
    const isReviewsSelected = true;

    const provider = StorageService.get(STORAGE_KEYS.LLM_ACTIVE_PROVIDER);
    if (!provider) {
      showToast("请先配置AI模型", "warning");
      return;
    }
    
    // 🔐 P0优化: 使用安全存储读取配置
    const config = await StorageService.getLLMConfigWithKey(provider);
    if (!config || !config.apiKey) {
      showToast("API Key 未配置", "warning");
      return;
    }

    const btn = document.getElementById("analyze-btn");
    btn.disabled = true;
    // ✅ 安全: 静态HTML模板，无用户输入
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i> 分析中..';

    // 渲染骨架屏状态
    const loadingReport = {};
    state.analysis.selectedModules.forEach((moduleId) => {
      loadingReport[moduleId] = '__LOADING__';
    });

    loadingReport.meta = {
      targetMarket: "Analyze...",
      generatedByModel: config.model,
      generatedAt: "Pending...",
      templateUsed: "Dynamic Analysis",
    };

    state.analysis.analysisReport = loadingReport;
    this.renderReport();

    const selectedProducts = state.scraper.scrapedData.products.filter((p) => state.analysis.selectedAsins.includes(p.asin));
    const site = state.scraper.scrapedData.metadata?.marketplace;
    
    // 🔐 防御性检查：确保站点配置存在
    if (!site || !LANGUAGE_HEADERS[site]) {
      showToast(`无效的站点配置: ${site || '未知'}`, "error");
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-brain mr-2"></i> 分析ASIN';
      return;
    }
    
    const language = LANGUAGE_HEADERS[site].name;

    try {
      const llmConfig = {
        provider,
        endpoint: config.endpoint,
        apiKey: config.apiKey,
        model: config.model,
      };

      const dataOptions = {
        includeTitle: isListingSelected,
        includeBullets: isListingSelected,
        includeReviews: isReviewsSelected,
      };

      const report = await AnalysisService.generateReport(
        selectedProducts,
        currentPrompt,
        language,
        llmConfig,
        dataOptions
      );

      report.meta = {
        targetMarket: language,
        analyzedASINs: state.analysis.selectedAsins,
        generatedByModel: config.model,
        generatedAt: new Date().toISOString(),
        templateUsed: "Dynamic Analysis",
        dataScope: [
          isListingSelected ? "Listing" : "",
          isReviewsSelected ? "Reviews" : "",
        ].filter(Boolean),
      };

      state.analysis.analysisReport = report;
      state.analysis.translatedReport = null;
      state.analysis.showTranslation = false;
      state.analysis.editHistory = [JSON.stringify(report)];
      state.analysis.isEditing = false;

      HistoryService.save(state.scraper.scrapedData, report);
      renderHistory();
      this.renderReport();

      showToast("分析完成", "success");
    } catch (e) {
      // 确保错误对象有 message 属性
      const errorMessage = e?.message || e?.toString() || '未知错误';
      const error = new Error(errorMessage);
      
      // 保留原始错误的 status 属性(如果有)
      if (e?.status) {
        error.status = e.status;
      }
      
      console.error('[Analysis] analyzeSelectedAsins 错误详情:', {
        message: errorMessage,
        status: e?.status,
        stack: e?.stack,
        original: e
      });
      
      ErrorService.handle(error, { action: 'analyzeSelectedAsins', module: 'analysis' });
      state.analysis.analysisReport = null;
      const display = document.getElementById("report-display");
      if (display) display.classList.add("hidden");
      const noReportMsg = document.getElementById("no-report-msg");
      if (noReportMsg) noReportMsg.classList.remove("hidden");
    } finally {
      btn.disabled = false;
      // ✅ 安全: 静态HTML模板，无用户输入
      btn.innerHTML = '<i class="fas fa-brain mr-2"></i> 分析ASIN';
    }
  }


  renderReport() {
    const report = state.analysis.analysisReport;
    if (!report) {
      const noReportMsg = document.getElementById("no-report-msg");
      if (noReportMsg) noReportMsg.classList.remove("hidden");
      
      const display = document.getElementById("report-display");
      if (display) display.classList.add("hidden");
      
      return;
    }

    if (!state.analysis.translatedReport) state.analysis.showTranslation = false;

    document.getElementById("no-report-msg").classList.add("hidden");
    const display = document.getElementById("report-display");
    display.classList.remove("hidden");

    if (report.parse_error) {
      display.innerHTML = `<div class="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 font-mono text-sm whitespace-pre-wrap"><i class="fas fa-bug mr-2"></i> ⚠️ 解析错误，原始数据：\n${escapeHtml(report.raw_response)}</div>`;
      return;
    }

    const showTrans = state.analysis.showTranslation && state.analysis.translatedReport;
    
    // 渲染报告头部
    const reportHeaderHtml = this.renderReportHeader(report, showTrans);
    
    // 渲染报告内容区域
    const reportContentHtml = this.renderReportContent(report, showTrans);
    
    display.innerHTML = reportHeaderHtml + reportContentHtml;

    this.populateTranslationModels();
    
    const toggleBtn = document.getElementById("toggle-trans-view-btn");
    if (toggleBtn) this.addEventListener(toggleBtn, "click", () => this.toggleTranslationView());
  }

  renderReportHeader(report, showTrans) {
    const resultCount = Object.keys(report).filter(k => k !== 'meta').length;
    
    // 处理多个ASIN的显示
    const asins = report.meta?.analyzedASINs || [];
    const asinDisplay = asins.length > 0 
      ? asins.length > 1 
        ? `${asins.slice(0, 2).join(', ')}${asins.length > 2 ? ` +${asins.length - 2}` : ''}`
        : asins[0]
      : 'N/A';
    
    // 格式化分析时间
    const analysisTime = report.meta?.generatedAt 
      ? new Date(report.meta.generatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    return `
      <div class="relative overflow-hidden rounded-2xl mb-8">
        <div class="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900"></div>
        <div class="absolute inset-0 opacity-20">
          <div class="absolute top-0 right-1/4 w-64 h-64 bg-emerald-400 rounded-full filter blur-[100px]"></div>
          <div class="absolute bottom-0 left-1/4 w-64 h-64 bg-blue-400 rounded-full filter blur-[100px]"></div>
        </div>
        
        <div class="relative p-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 bg-emerald-500/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-emerald-500/30">
                <i class="fas fa-circle-check text-emerald-400 text-2xl"></i>
              </div>
              <div>
                <h2 class="text-2xl font-bold text-white">分析报告</h2>
                <p class="text-slate-400 text-sm mt-0.5 flex items-center gap-2">
                  <span class="font-mono bg-slate-700/50 px-2 py-0.5 rounded text-slate-300">${asinDisplay}</span>
                  <span class="w-1 h-1 bg-slate-600 rounded-full"></span>
                  <span>分析完成于 ${analysisTime}</span>
                </p>
              </div>
            </div>
            <div class="flex items-center gap-6">
              <div class="text-right">
                <div class="text-3xl font-bold text-white">${resultCount}</div>
                <div class="text-slate-400 text-xs uppercase tracking-wider">分析维度</div>
              </div>
              <div class="w-px h-12 bg-slate-700"></div>
              <div class="text-right">
                <div class="text-3xl font-bold text-emerald-400">100%</div>
                <div class="text-slate-400 text-xs uppercase tracking-wider">完成度</div>
              </div>
              
              <div class="flex items-center gap-2 ml-4">
                ${state.analysis.translatedReport ? `
                  <button id="toggle-trans-view-btn" data-action="toggleTranslationView"
                    class="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${showTrans ? "bg-blue-500 text-white" : "bg-white/10 text-white hover:bg-white/20"} border border-white/10">
                    <i class="fas fa-language text-xs"></i>
                    <span>${showTrans ? '译文' : '原文'}</span>
                  </button>
                ` : ''}
                
                <select id="translation-model-select" class="text-xs border border-white/10 rounded-lg px-2 py-1.5 bg-white/10 text-white focus:outline-none focus:border-white/30 w-32 backdrop-blur-sm">
                  <option value="" disabled selected>Translation Model</option>
                </select>
                <button id="quick-translate-btn" data-action="translateReport" 
                  class="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 ${showTrans ? "bg-white/10 text-slate-400 cursor-not-allowed opacity-60" : "bg-white/10 text-white hover:bg-white/20 cursor-pointer border border-white/10"}" 
                  ${showTrans ? "disabled" : ""}>
                  <i class="fas fa-language"></i> 翻译
                </button>
              </div>
              
              <button data-action="copyReportMarkdown" class="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border border-white/10">
                <i class="fas fa-copy w-4 h-4"></i>
                复制 Markdown
              </button>
              
              <button data-action="exportReport" class="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border border-white/10">
                <i class="fas fa-download w-4 h-4"></i>
                导出报告
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderReportContent(report, showTrans) {
    const keys = Object.keys(report).filter(k => k !== 'meta');
    
    // 分类结果
    const listingsResults = [];
    const reviewsResults = [];
    
    keys.forEach(key => {
      const module = ANALYSIS_MODULES.find(m => m.id === key);
      if (module) {
        if (module.category === 'listing') {
          listingsResults.push({ key, module });
        } else if (module.category === 'reviews') {
          reviewsResults.push({ key, module });
        }
      }
    });

    let html = '<div class="space-y-8">';
    
    // Listings 结果
    if (listingsResults.length > 0) {
      html += `
        <div>
          <div class="flex items-center gap-4 mb-6">
            <div class="flex items-center gap-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-blue-500/20">
              <i class="fas fa-box-open w-4 h-4"></i>
              Listings 分析结果
            </div>
            <div class="flex-1 h-px bg-gradient-to-r from-blue-300 via-blue-200 to-transparent"></div>
            <span class="text-sm text-slate-500 font-semibold bg-slate-100 px-3 py-1 rounded-full">${listingsResults.length} 项</span>
          </div>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            ${listingsResults.map((item, index) => this.renderResultWidget(item.key, item.module, report, showTrans, index)).join('')}
          </div>
        </div>
      `;
    }
    
    // Reviews 结果
    if (reviewsResults.length > 0) {
      html += `
        <div>
          <div class="flex items-center gap-4 mb-6">
            <div class="flex items-center gap-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-amber-500/20">
              <i class="fas fa-star w-4 h-4"></i>
              Reviews 分析结果
            </div>
            <div class="flex-1 h-px bg-gradient-to-r from-amber-300 via-amber-200 to-transparent"></div>
            <span class="text-sm text-slate-500 font-semibold bg-slate-100 px-3 py-1 rounded-full">${reviewsResults.length} 项</span>
          </div>
          <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            ${reviewsResults.map((item, index) => this.renderResultWidget(item.key, item.module, report, showTrans, index + listingsResults.length)).join('')}
          </div>
        </div>
      `;
    }
    
    html += '</div>';
    
    return html;
  }

  renderResultWidget(key, module, report, showTrans, index) {
    const value = showTrans && state.analysis.translatedReport 
      ? state.analysis.translatedReport[key] 
      : report[key];
    
    if (value === '__LOADING__') {
      return this.renderLoadingSkeleton(module, index);
    }

    const colorSchemes = {
      'blue': { gradient: 'from-blue-500 to-blue-600', light: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100' },
      'cyan': { gradient: 'from-cyan-500 to-cyan-600', light: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-100' },
      'red': { gradient: 'from-red-500 to-red-600', light: 'bg-red-50', text: 'text-red-700', border: 'border-red-100' },
      'amber': { gradient: 'from-amber-500 to-amber-600', light: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' },
      'orange': { gradient: 'from-orange-500 to-orange-600', light: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-100' },
      'purple': { gradient: 'from-purple-500 to-purple-600', light: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100' },
      'teal': { gradient: 'from-teal-500 to-teal-600', light: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-100' },
      'rose': { gradient: 'from-rose-500 to-rose-600', light: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-100' }
    };

    const iconMap = {
      'title_seo_roots': 'fa-font',
      'selling_proposition_deconstruction': 'fa-layer-group',
      'neg_deal_breakers': 'fa-triangle-exclamation',
      'pos_aha_moments': 'fa-star',
      'buying_hesitations': 'fa-circle-question',
      'user_avatar_context': 'fa-user-group',
      'vocabulary_gap': 'fa-comments',
      'promise_reality_check': 'fa-scale-unbalanced'
    };

    const colors = colorSchemes[module.color] || colorSchemes.blue;
    const icon = iconMap[key] || 'fa-info-circle';
    const isTranslationMode = showTrans;

    return `
      <div id="widget-card-${key}" class="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden hover:shadow-xl transition-all duration-300 animate-fade-in-up group/card" style="animation-delay: ${index * 80}ms">
        <!-- Header -->
        <div class="bg-gradient-to-r ${colors.gradient} p-5 text-white">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30">
              <i class="fas ${icon} w-5 h-5"></i>
            </div>
            <div class="flex-1">
              <h3 class="font-bold text-lg">${module.label_cn}</h3>
              <span class="text-xs px-2 py-0.5 rounded-full bg-white/20 border border-white/30">
                ${module.category === 'listing' ? 'Listings' : 'Reviews'}
              </span>
            </div>
            
            <!-- Edit Controls -->
            <div class="flex items-center gap-2">
              <div class="view-controls flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-all duration-200">
                <button onclick="${isTranslationMode ? "" : `window.startLocalEdit('${key}')`}" 
                        ${isTranslationMode ? "disabled" : ""}
                        class="btn-edit w-8 h-8 flex items-center justify-center rounded-lg transition-all ${isTranslationMode ? "text-white/30 cursor-not-allowed" : "text-white/70 hover:text-white hover:bg-white/20 cursor-pointer"}" 
                        title="${isTranslationMode ? "翻译模式不可编辑" : "编辑内容"}">
                  <i class="fas fa-pen text-xs"></i>
                </button>
              </div>

              <div class="edit-controls hidden flex items-center gap-2">
                <button onclick="window.undoLocalEdit('${key}')" class="btn-undo w-8 h-8 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition-all" title="撤销">
                  <i class="fas fa-undo text-xs"></i>
                </button>
                <button onclick="window.saveLocalEdit('${key}')" class="btn-save px-3 h-8 flex items-center justify-center gap-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white shadow-sm transition-all text-xs font-medium" title="完成">
                  <i class="fas fa-check"></i> <span>完成</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Content -->
        <div id="widget-content-${key}" class="p-5 widget-content-area">
          ${this.renderSimpleWidgetContent(value, colors)}
        </div>
      </div>
    `;
  }

  renderWidgetContent(value, colors) {
    if (!value || value === '' || (Array.isArray(value) && value.length === 0)) {
      return `
        <div class="h-24 flex flex-col items-center justify-center text-slate-300/60 select-none">
          <div class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center mb-2">
            <i class="fas fa-minus text-xs"></i>
          </div>
          <span class="text-[11px] font-medium tracking-wide">暂无数据</span>
        </div>
      `;
    }

    if (typeof value === 'string') {
      return `<div class="text-[13px] leading-relaxed text-slate-700 font-sans tracking-wide whitespace-pre-wrap">${value}</div>`;
    }

    if (Array.isArray(value)) {
      if (typeof value[0] === 'string') {
        return `
          <div class="flex flex-wrap gap-2 pt-1">
            ${value.map(item => `
              <span class="inline-flex items-center px-2.5 py-1 rounded-md text-[12px] font-medium bg-slate-50 text-slate-700 border border-slate-200/60 hover:bg-white hover:shadow-sm hover:text-blue-600 hover:border-blue-200 transition-all cursor-default">
                ${item}
              </span>
            `).join('')}
          </div>
        `;
      }
      
      if (typeof value[0] === 'object') {
        return `
          <div class="flex flex-col gap-3">
            ${value.map(obj => `
              <div class="relative group/card bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-slate-300 transition-all duration-300">
                <div class="absolute left-0 top-4 bottom-4 w-1 bg-gradient-to-b ${colors.gradient} rounded-r opacity-0 group-hover/card:opacity-100 transition-opacity"></div>
                <div class="grid gap-y-3 gap-x-4">
                  ${Object.keys(obj).map(subKey => `
                    <div class="grid grid-cols-1 sm:grid-cols-[110px_1fr] gap-2 sm:gap-4 items-baseline">
                      <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left sm:text-right select-none pt-0.5">
                        ${getFieldTitle(subKey)}
                      </div>
                      <div class="text-[13px] text-slate-700 leading-6 font-medium break-words">
                        ${typeof obj[subKey] === 'object' ? JSON.stringify(obj[subKey]) : obj[subKey] || '<span class="text-slate-300">-</span>'}
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        `;
      }
    }

    return `<div class="text-xs text-slate-400 font-mono">${JSON.stringify(value)}</div>`;
  }

  renderSimpleWidgetContent(value, colors) {
    if (!value || value === '' || (Array.isArray(value) && value.length === 0)) {
      return `
        <div class="h-24 flex flex-col items-center justify-center text-slate-300/60 select-none">
          <div class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center mb-2">
            <i class="fas fa-minus text-xs"></i>
          </div>
          <span class="text-[11px] font-medium tracking-wide">暂无数据</span>
        </div>
      `;
    }

    if (typeof value === 'string') {
      return `<div class="text-[13px] leading-relaxed text-slate-700 font-sans tracking-wide whitespace-pre-wrap">${value}</div>`;
    }

    if (Array.isArray(value)) {
      if (typeof value[0] === 'string') {
        return `
          <div class="flex flex-wrap gap-2 pt-1">
            ${value.map(item => `
              <span class="inline-flex items-center px-2.5 py-1 rounded-md text-[12px] font-medium bg-slate-50 text-slate-700 border border-slate-200/60 hover:bg-white hover:shadow-sm hover:text-blue-600 hover:border-blue-200 transition-all cursor-default">
                ${item}
              </span>
            `).join('')}
          </div>
        `;
      }
      
      if (typeof value[0] === 'object') {
        return `
          <div class="flex flex-col gap-3">
            ${value.map(obj => `
              <div class="relative group/card bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-slate-300 transition-all duration-300">
                <div class="absolute left-0 top-4 bottom-4 w-1 bg-gradient-to-b ${colors.gradient} rounded-r opacity-0 group-hover/card:opacity-100 transition-opacity"></div>
                <div class="grid gap-y-3 gap-x-4">
                  ${Object.keys(obj).map(subKey => `
                    <div class="grid grid-cols-1 sm:grid-cols-[110px_1fr] gap-2 sm:gap-4 items-baseline">
                      <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left sm:text-right select-none pt-0.5">
                        ${this.getFieldTitle(subKey)}
                      </div>
                      <div class="text-[13px] text-slate-700 leading-6 font-medium break-words">
                        ${typeof obj[subKey] === 'object' ? JSON.stringify(obj[subKey]) : obj[subKey] || '<span class="text-slate-300">-</span>'}
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        `;
      }
    }

    return `<div class="text-xs text-slate-400 font-mono">${JSON.stringify(value)}</div>`;
  }

  getFieldTitle(key) {
    const titleMap = {
      'target_market': '目标市场',
      'keywords_tier1': '一级关键词',
      'keywords_tier2': '二级关键词',
      'product_category': '产品类别',
      'product_features': '产品特点',
      'product_benefits': '产品优势',
      'target_audience': '目标受众',
      'pain_points': '痛点',
      'unique_selling_points': 'USP',
      'competitive_advantages': '竞争优势',
      'product_positioning': '产品定位',
      'brand_tone': '品牌调性',
      'emotional_triggers': '情感触发',
      'call_to_action': '行动号召',
      'seasonal_relevance': '季节相关性'
    };
    return titleMap[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  renderLoadingSkeleton(module, index) {
    const colorSchemes = {
      'blue': { gradient: 'from-blue-500 to-blue-600' },
      'cyan': { gradient: 'from-cyan-500 to-cyan-600' },
      'red': { gradient: 'from-red-500 to-red-600' },
      'amber': { gradient: 'from-amber-500 to-amber-600' },
      'orange': { gradient: 'from-orange-500 to-orange-600' },
      'purple': { gradient: 'from-purple-500 to-purple-600' },
      'teal': { gradient: 'from-teal-500 to-teal-600' },
      'rose': { gradient: 'from-rose-500 to-rose-600' }
    };

    const iconMap = {
      'title_seo_roots': 'fa-font',
      'selling_proposition_deconstruction': 'fa-layer-group',
      'neg_deal_breakers': 'fa-triangle-exclamation',
      'pos_aha_moments': 'fa-star',
      'buying_hesitations': 'fa-circle-question',
      'user_avatar_context': 'fa-user-group',
      'vocabulary_gap': 'fa-comments',
      'promise_reality_check': 'fa-scale-unbalanced'
    };

    const colors = colorSchemes[module.color] || colorSchemes.blue;
    const icon = iconMap[module.id] || 'fa-info-circle';

    return `
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden" style="animation-delay: ${index * 80}ms">
        <div class="bg-gradient-to-r ${colors.gradient} p-5 text-white">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30">
              <i class="fas ${icon} w-5 h-5"></i>
            </div>
            <div class="flex-1">
              <h3 class="font-bold text-lg">${module.label_cn}</h3>
              <span class="text-xs px-2 py-0.5 rounded-full bg-white/20 border border-white/30">
                ${module.category === 'listing' ? 'Listings' : 'Reviews'}
              </span>
            </div>
          </div>
        </div>
        
        <div class="p-5">
          <div class="space-y-4 animate-pulse">
            <div class="h-2.5 bg-slate-100 rounded w-3/4"></div>
            <div class="h-2.5 bg-slate-100 rounded w-full"></div>
            <div class="h-2.5 bg-slate-100 rounded w-5/6"></div>
            <div class="h-2.5 bg-slate-100 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    `;
  }

  populateTranslationModels() {
    const select = document.getElementById("translation-model-select");
    if (!select) return;

    const activeProvider = StorageService.get(STORAGE_KEYS.LLM_ACTIVE_PROVIDER);
    const providerConfig = activeProvider ? PROVIDERS[activeProvider] : null;

    let options = "";

    if (providerConfig && providerConfig.models && providerConfig.models.length > 0) {
      providerConfig.models.forEach(modelObj => {
        const modelId = modelObj.id;
        const isSelected = state.analysis.lastTranslationModel === modelId ? "selected" : "";
        options += `<option value="${modelId}" ${isSelected}>${modelId}</option>`;
      });
    } else {
      options = `<option value="" disabled>No models found for ${activeProvider || 'current provider'}</option>`;
    }

    // ✅ 安全: 静态HTML模板，无用户输入
    select.innerHTML = options;

    if (state.analysis.lastTranslationModel) {
      const exists = Array.from(select.options).some(opt => opt.value === state.analysis.lastTranslationModel);
      if (exists) {
        select.value = state.analysis.lastTranslationModel;
      } else if (select.options.length > 0 && !select.options[0].disabled) {
        select.value = select.options[0].value;
        state.analysis.lastTranslationModel = select.value;
      }
    } else if (select.options.length > 0 && !select.options[0].disabled) {
      select.value = select.options[0].value;
    }

    select.onchange = (e) => {
      state.analysis.lastTranslationModel = e.target.value;
    };
  }


  handleGlobalClick(e) {
    // 如果点击的是调整按钮、调整手柄或拖拽手柄,不处理
    if (e.target.closest(".ui-resizable-handle") || 
        e.target.closest(".btn-resize") ||
        e.target.closest(".drag-handle") ||
        e.target.closest("[data-action='toggleCardResize']")) {
      return;
    }
    
    // 处理调整模式
    const resizingCard = document.querySelector(".grid-stack-item.is-resizing");
    if (resizingCard && !resizingCard.contains(e.target)) {
      // 点击了卡片外部,退出调整模式
      const key = resizingCard.getAttribute("gs-id");
      if (key) {
        this.gridManager.toggleCardResize(key, false);
      }
    }
    
    // 处理编辑模式
    // 查找所有处于编辑模式的卡片
    const editingCards = document.querySelectorAll('.widget-card-container .edit-controls:not(.hidden)');
    editingCards.forEach(editControls => {
      const card = editControls.closest('.widget-card-container');
      if (card && !card.contains(e.target)) {
        // 点击了卡片外部,自动保存并退出编辑
        const cardId = card.id.replace('widget-card-', '');
        if (cardId) {
          this.editManager.saveLocalEdit(cardId);
        }
      }
    });
  }

  renderWidgetContent(key, report, transReport) {
    const origVal = report[key];
    const showTrans = state.analysis.showTranslation;
    const transVal = showTrans && transReport ? transReport[key] : undefined;

    if (origVal === '__LOADING__') {
      return renderSkeleton();
    }

    const displayVal = this.getDisplayValue(origVal, transVal);

    const moduleConfig = ANALYSIS_MODULES.find((m) => m.id === key);
    const title = moduleConfig ? moduleConfig.label_cn : key;

    let style = {
      color: "slate",
      bg: "bg-slate-500",
      lightBg: "bg-slate-100",
      icon: "fa-info-circle",
    };

    if (moduleConfig) {
      if (moduleConfig.category === "listing")
        style = { color: "blue", bg: "bg-blue-600", lightBg: "bg-blue-50", icon: "fa-file-alt" };
      else if (moduleConfig.category === "reviews")
        style = { color: "orange", bg: "bg-orange-500", lightBg: "bg-orange-50", icon: "fa-comments" };
      else if (moduleConfig.category === "cross")
        style = { color: "purple", bg: "bg-purple-600", lightBg: "bg-purple-50", icon: "fa-random" };
    }

    return renderWidgetCard(key, title, style, showTrans, renderViewModeHTML(displayVal, style));
  }

  getDisplayValue(orig, trans) {
    return state.analysis.showTranslation && trans !== undefined && trans !== null ? trans : orig;
  }

  // ================== Actions / Methods ==================

  toggleTranslationView() {
    state.analysis.showTranslation = !state.analysis.showTranslation;
    this.renderReport();
  }

  async translateReport() {
    if (state.analysis.showTranslation && state.analysis.translatedReport) return;
    if (!state.analysis.analysisReport) return;

    const provider = StorageService.get(STORAGE_KEYS.LLM_ACTIVE_PROVIDER);
    if (!provider) {
      showToast("请先配置AI模型", "warning");
      return;
    }
    
    // 🔐 P0优化: 使用安全存储读取配置
    const config = await StorageService.getLLMConfigWithKey(provider);
    if (!config || !config.apiKey) {
      showToast("API Key 未配置", "warning");
      return;
    }

    const select = document.getElementById("translation-model-select");
    const selectedModel = select?.value || config.model;

    const btn = document.getElementById("quick-translate-btn");
    if (btn) {
      btn.disabled = true;
      // ✅ 安全: 静态HTML模板，无用户输入
      btn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-1"></i> 翻译中...';
    }

    try {
      const llmConfig = {
        provider,
        endpoint: config.endpoint,
        apiKey: config.apiKey,
        model: selectedModel,
      };

      // 翻译目标语言默认为中文
      const targetLanguage = "Chinese";

      const translated = await AnalysisService.translateReport(
        state.analysis.analysisReport,
        targetLanguage,
        llmConfig
      );

      state.analysis.translatedReport = translated;
      state.analysis.showTranslation = true;
      this.renderReport();
      showToast("翻译完成", "success");
    } catch (e) {
      ErrorService.handle(e, { action: 'translateReport', module: 'analysis' });
    } finally {
      if (btn) {
        btn.disabled = false;
        // ✅ 安全: 静态HTML模板，无用户输入
        btn.innerHTML = '<i class="fas fa-language"></i> 翻译';
      }
    }
  }

  copyReportMarkdown() {
    if (!state.analysis.analysisReport) {
      showToast("暂无报告", "warning");
      return;
    }

    let md = `# Analysis Report\n\n`;
    md += this.generateDynamicMarkdown(state.analysis.analysisReport);
    navigator.clipboard.writeText(md);
    showToast("Markdown 已复制", "success");
  }

  generateDynamicMarkdown(data, depth = 1) {
    if (!data) return "";
    let md = "";

    Object.keys(data).forEach((key) => {
      if (key === "meta") return;
      const val = data[key];
      const heading = "#".repeat(Math.min(depth + 1, 6));
      md += `${heading} ${key}\n\n`;

      if (typeof val === "string") {
        md += `${val}\n\n`;
      } else if (Array.isArray(val)) {
        val.forEach((item) => {
          if (typeof item === "string") {
            md += `- ${item}\n`;
          } else {
            md += `- ${JSON.stringify(item)}\n`;
          }
        });
        md += "\n";
      }
    });

    return md;
  }

  exportReport() {
    if (!state.analysis.analysisReport) return;
    const blob = new Blob([JSON.stringify(state.analysis.analysisReport, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analysis-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ================== Grid 功能委托 ==================
  
  toggleCardResize(key, forceState) {
    this.gridManager.toggleCardResize(key, forceState);
  }

  // ================== Global Actions Registration ==================

  registerGlobalActions() {
    const actions = {
      toggleAllModules: (params) => {
        const checked = params.checked === 'true';
        this.toggleAllModules(checked);
      },
      selectAllAsins: () => this.selectAllAsins(),
      copyPromptText: () => this.promptBuilder.copyPromptText(),
      translateReport: () => this.translateReport(),
      copyReportMarkdown: () => this.copyReportMarkdown(),
      exportReport: () => this.exportReport(),
      toggleCardResize: (params) => {
        const key = params.key;
        if (key) this.gridManager.toggleCardResize(key, true);
      },
    };

    // 使用 BaseModule 的 registerActions 方法，自动在卸载时清理
    this.registerActions(actions);
    
    // 注册编辑相关的全局函数，并添加到清理列表
    const globalFunctions = {
      startLocalEdit: (key) => this.startLocalEdit(key),
      saveLocalEdit: (key) => this.saveLocalEdit(key),
      undoLocalEdit: (key) => this.undoLocalEdit(key),
      pushEditSnapshot: (key) => this.pushEditSnapshot(key),
      deleteRowItem: (btn, key) => this.deleteRowItem(btn, key),
      addListItem: (key) => this.addListItem(key),
      addObjItem: (key) => this.addObjItem(key),
    };
    
    // 将全局函数挂载到 window，并注册清理函数
    Object.entries(globalFunctions).forEach(([name, fn]) => {
      window[name] = fn;
    });
    
    // 添加清理函数，在卸载时移除全局函数
    this.addDisposable(() => {
      Object.keys(globalFunctions).forEach(name => {
        delete window[name];
      });
    });
  }

  // ================== 编辑功能委托 ==================
  // 这些方法委托给 EditManager 处理
  
  startLocalEdit(key) {
    this.editManager.startLocalEdit(key);
  }

  saveLocalEdit(key) {
    this.editManager.saveLocalEdit(key);
  }

  undoLocalEdit(key) {
    this.editManager.undoLocalEdit(key);
  }

  pushEditSnapshot(key) {
    this.editManager.pushEditSnapshot(key);
  }

  deleteRowItem(btn, key) {
    this.editManager.deleteRowItem(btn, key);
  }

  addListItem(key) {
    this.editManager.addListItem(key);
  }

  addObjItem(key) {
    this.editManager.addObjItem(key);
  }
}

// ========================================== 
// Module Exports (统一架构接口)
// ========================================== 

let moduleInstance = null;

/**
 * 挂载子模�?
 * @param {HTMLElement} container - 容器元素
 */
export async function mount(container) {
  console.log('[Analysis] 🔧 开始挂载子模块');

  try {
    // 1. 加载模板
    const html = await loadTemplate('src/modules/app_center/views/master_prompt/analysis/template.html');
    // ✅ 安全: 静态HTML模板，无用户输入
    container.innerHTML = html;

    // 2. 创建模块实例
    moduleInstance = new AnalysisModule(container);
    
    // 3. 初始化模块
    await moduleInstance.render();
    await moduleInstance.init();

    console.log('[Analysis] ✅ 子模块挂载成功');
  } catch (error) {
    console.error('[Analysis] ❌ 子模块挂载失败', error);
    throw error;
  }
}

/**
 * 卸载子模块
 */
export function unmount() {
  console.log('[Analysis] 🔄 开始卸载子模块');

  try {
    if (moduleInstance) {
      moduleInstance.onUnmount();
      // BaseModule 的 unmount() 方法会自动处理清理
      // 不需要手动调用 cleanup()
      moduleInstance = null;
    }

    console.log('[Analysis] ✅ 子模块卸载成功');
  } catch (error) {
    console.error('[Analysis] ❌ 子模块卸载失败', error);
  }
}
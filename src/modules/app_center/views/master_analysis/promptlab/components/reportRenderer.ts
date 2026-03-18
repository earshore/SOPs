/**
 * Promptlab 报告渲染模块
 *
 * 负责将 appStore 中的分析报告渲染为可交互的复选框列表。
 * 所有函数接收 PromptlabAlpineContext 作为显式参数，避免 this 绑定。
 */

import { escapeHtml } from '@/common/utils/security';
import { appStore } from '@/stores/useAppStore';
import SITE_CONFIGS from '../../../../../../common/constants/constants';
import type { TargetMarket } from '@/types/state';
import { SafeRenderer } from '../../../../../../common/infrastructure/SafeRenderer';
import { Logger } from '../../../../../../services/loggerService';
import { extractPreviewText, getFieldTitle, getPreviewText } from './previewExtractor';
import { getTargetConfidence, getConfidenceColorClass, getConfidenceLevel, getConfidenceAriaLabel, computeHasReport } from './computed';
import type { PromptlabAlpineContext } from './types';

// ==========================================
// 语言选项生成
// ==========================================

/**
 * 向 #lab-target-market select 填充所有站点语言选项
 */
export function generateLanguageOptions(): void {
  const select = document.getElementById('lab-target-market') as HTMLSelectElement | null;
  if (!select) return;

  const renderer = SafeRenderer.getInstance();
  renderer.renderTemplate(select, '<option value="" selected></option>');

  Object.entries(SITE_CONFIGS).forEach(([_code, config]) => {
    const option = document.createElement('option');
    option.value = config.name;
    option.textContent = `${config.name} (${config.domain})`;
    option.dataset.locale = config.locale;
    select.appendChild(option);
  });
}

// ==========================================
// 报告分析渲染入口
// ==========================================

/**
 * 渲染报告分析区域（无报告时显示占位，有报告时渲染模块列表）
 */
export function renderReportAnalysis(ctx: PromptlabAlpineContext): void {
  Logger.debug('[reportRenderer] renderReportAnalysis, hasReport:', computeHasReport());

  const container = document.getElementById('report-sections-container');
  const statusDiv = document.getElementById('lab-analysis-status');
  const marketSelect = document.getElementById('lab-target-market') as HTMLSelectElement | null;

  if (!container) {
    Logger.debug('[reportRenderer] 容器元素未找到');
    return;
  }

  const renderer = SafeRenderer.getInstance();

  if (!computeHasReport()) {
    Logger.debug('[reportRenderer] 没有报告，显示提示');
    if (statusDiv) {
      statusDiv.className = 'px-2 py-1 bg-slate-100 text-slate-500 rounded text-xs flex items-center gap-1';
      renderer.renderTemplate(statusDiv, '<i class="fas fa-exclamation-circle"></i> 未检测到分析报告');
    }
    renderer.renderTemplate(container, '<p class="text-xs text-slate-400 italic p-2">暂无可用数据...</p>');
    container.className = 'mt-3';
    return;
  }

  if (statusDiv) {
    statusDiv.className = 'px-2 py-1 bg-green-100 text-green-700 rounded text-xs flex items-center gap-1';
    renderer.renderTemplate(statusDiv, '<i class="fas fa-check-circle"></i> 分析报告已就绪');
  }

  autoSelectMarket(ctx, marketSelect);
  renderReportModules(ctx, container);
}

// ==========================================
// 智能市场选择
// ==========================================

/**
 * 根据报告元数据自动选中目标市场 select
 */
export function autoSelectMarket(
  ctx: PromptlabAlpineContext,
  marketSelect: HTMLSelectElement | null,
): void {
  if (!marketSelect) return;

  const currentState = appStore.getState();
  const analysisReport = currentState.analysis.analysisReport as Record<string, any> | null;

  let currentMarketplace = '';
  if (analysisReport?.marketplace) {
    currentMarketplace = analysisReport.marketplace;
  } else if (currentState.scraper?.scrapedData?.metadata?.marketplace) {
    currentMarketplace = currentState.scraper.scrapedData.metadata.marketplace;
  } else if (analysisReport) {
    currentMarketplace = analysisReport.targetMarket || analysisReport.language || '';
  }

  const isFirstLoad = !ctx.profile.targetMarket;
  const isMarketplaceChanged = !!currentMarketplace && currentMarketplace !== ctx.lastMarketplace;

  if (currentMarketplace && (isFirstLoad || isMarketplaceChanged)) {
    Logger.debug(`[reportRenderer] 市场变化: ${ctx.lastMarketplace} → ${currentMarketplace}`);
    const siteConfig = SITE_CONFIGS[currentMarketplace];
    if (siteConfig) {
      const match = Array.from(marketSelect.options).find(
        (opt) => opt.value === siteConfig.name,
      );
      if (match) {
        marketSelect.value = match.value;
        ctx.profile.targetMarket = match.value as TargetMarket;
        ctx.saveState();
        ctx.lastMarketplace = currentMarketplace;
        Logger.debug('[reportRenderer] 已自动选择市场:', match.value);
      }
    }
  } else if (currentMarketplace) {
    ctx.lastMarketplace = currentMarketplace;
  }
}

// ==========================================
// 报告模块列表渲染
// ==========================================

/**
 * 根据报告格式分发到新格式/旧格式渲染器
 */
export function renderReportModules(
  ctx: PromptlabAlpineContext,
  container: HTMLElement,
): void {
  const report = appStore.getState().analysis.analysisReport as Record<string, any> | null;

  Logger.debug('[reportRenderer] renderReportModules, keys:', report ? Object.keys(report) : null);

  const renderer = SafeRenderer.getInstance();
  renderer.renderTemplate(container, '');
  container.className = 'mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3';

  const isFirstLoad =
    !ctx.hasRenderedReportOnce && ctx.profile.selectedReportSections.length === 0;

  const hasMetadata = report?.metadata && report?.analysisReport;

  if (hasMetadata) {
    Logger.debug('[reportRenderer] 包装格式报告');
    renderNewFormatModules(ctx, container, report!.analysisReport, isFirstLoad);
  } else if (report && typeof report === 'object') {
    Logger.debug('[reportRenderer] 直接格式报告');
    renderNewFormatModules(ctx, container, report, isFirstLoad);
  } else {
    renderLegacyFormatModules(ctx, container, report, isFirstLoad);
  }
}

// ==========================================
// 新格式报告模块渲染
// ==========================================

const TARGET_CONFIG: Record<string, { title: string; icon: string }> = {
  'title-keywords':    { title: '标题核心词根', icon: '🔑' },
  'selling-points':    { title: '卖点结构拆解', icon: '💎' },
  'fatal-flaws':       { title: '致命缺陷',     icon: '⚠️' },
  'wow-moments':       { title: 'Wow时刻',       icon: '✨' },
  'hesitation-points': { title: '犹豫点',        icon: '🤔' },
  'buyer-profile':     { title: '买家画像',      icon: '👤' },
  'vocab-gap':         { title: '词汇缺口',      icon: '📝' },
  'promise-reality':   { title: '承诺与现实',    icon: '🎯' },
};

/**
 * 渲染新格式报告（直接对象格式 { 'title-keywords': {...}, ... }）
 */
export function renderNewFormatModules(
  ctx: PromptlabAlpineContext,
  container: HTMLElement,
  analysisReport: unknown,
  isFirstLoad: boolean,
): void {
  if (!analysisReport || typeof analysisReport !== 'object') {
    Logger.warn('[reportRenderer] analysisReport 不是有效对象');
    return;
  }

  const reportObj = analysisReport as Record<string, unknown>;
  const renderer = SafeRenderer.getInstance();

  const availableTargets = Object.keys(reportObj).filter(
    (key) => TARGET_CONFIG[key] && reportObj[key],
  );

  Logger.debug('[reportRenderer] 可用目标:', availableTargets);

  if (isFirstLoad) {
    ctx.profile.selectedReportSections = [...availableTargets];
    ctx.saveState();
  }

  ctx.hasRenderedReportOnce = true;

  availableTargets.forEach((targetId) => {
    const config = TARGET_CONFIG[targetId];
    if (!config) return;

    const data = reportObj[targetId];
    const previewText = data ? extractPreviewText(targetId, data) : '';
    const isChecked = ctx.profile.selectedReportSections.includes(targetId);
    const confidencePct = getTargetConfidence(targetId);
    const hasConfidence = !!confidencePct;

    const div = document.createElement('div');
    div.className =
      'relative flex items-start p-3 rounded-lg border border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all';

    const template = `
      <div class="flex h-5 items-center">
        <input type="checkbox"
               name="report-section"
               value="${escapeHtml(targetId)}"
               id="sect-${escapeHtml(targetId)}"
               class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
               ${isChecked ? 'checked' : ''}
               @change="onReportSectionChange">
      </div>
      <div class="ml-3 text-sm flex-1 min-w-0">
        <label for="sect-${escapeHtml(targetId)}" class="cursor-pointer select-none w-full block">
          <div class="flex items-center justify-between gap-2 mb-0.5">
            <span class="font-medium text-slate-700 leading-snug">${config.icon} ${escapeHtml(config.title)}</span>
            ${hasConfidence ? `
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border shrink-0 ${escapeHtml(getConfidenceColorClass(confidencePct))}"
                  role="status"
                  aria-label="${escapeHtml(getConfidenceAriaLabel(confidencePct))}">
              <i class="fa-solid fa-chart-line text-[10px]" aria-hidden="true"></i>
              <span>${confidencePct}%</span>
              <span>${escapeHtml(getConfidenceLevel(confidencePct))}</span>
            </span>` : ''}
          </div>
          <p class="text-xs text-slate-400 truncate font-normal" title="${escapeHtml(previewText)}">${escapeHtml(previewText)}</p>
        </label>
      </div>
    `;

    renderer.renderTemplate(div, template);
    container.appendChild(div);
  });
}

// ==========================================
// 旧格式报告模块渲染
// ==========================================

/**
 * 渲染旧格式报告（扁平 key-value 对象）
 */
export function renderLegacyFormatModules(
  ctx: PromptlabAlpineContext,
  container: HTMLElement,
  report: unknown,
  isFirstLoad: boolean,
): void {
  if (!report || typeof report !== 'object') {
    Logger.warn('[reportRenderer] 旧格式 report 不是有效对象');
    return;
  }

  const reportObj = report as Record<string, unknown>;
  const renderer = SafeRenderer.getInstance();
  const ignoreKeys = ['meta', 'generatedByModel', 'generatedAt', 'templateUsed', 'templateId', 'raw_response'];
  const keys = Object.keys(reportObj).filter((k) => !ignoreKeys.includes(k));

  if (isFirstLoad) {
    ctx.profile.selectedReportSections = [...keys];
    ctx.saveState();
  }

  keys.forEach((key) => {
    // 自动填充 audience 字段（向后兼容）
    if (key === 'target_audience' && !ctx.profile.audience) {
      let val = reportObj[key];
      if (Array.isArray(val)) val = val.join(', ');
      ctx.profile.audience = String(val ?? '');
      ctx.saveState();
    }

    const label = getFieldTitle(key);
    const previewText = getPreviewText(reportObj[key]);
    const isChecked = ctx.profile.selectedReportSections.includes(key);

    const div = document.createElement('div');
    div.className =
      'relative flex items-start p-3 rounded-lg border border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all';

    const template = `
      <div class="flex h-5 items-center">
        <input type="checkbox"
               name="report-section"
               value="${escapeHtml(key)}"
               id="sect-${escapeHtml(key)}"
               class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
               ${isChecked ? 'checked' : ''}
               @change="onReportSectionChange">
      </div>
      <div class="ml-3 text-sm flex-1 min-w-0">
        <label for="sect-${escapeHtml(key)}" class="cursor-pointer select-none w-full block">
          <span class="font-medium text-slate-700 block mb-0.5 leading-snug">${escapeHtml(label)}</span>
          <p class="text-xs text-slate-400 truncate font-normal" title="${escapeHtml(previewText)}">${escapeHtml(previewText)}</p>
        </label>
      </div>
    `;

    renderer.renderTemplate(div, template);
    container.appendChild(div);
  });
}

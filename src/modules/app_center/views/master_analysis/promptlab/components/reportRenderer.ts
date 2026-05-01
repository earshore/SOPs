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
import { getFieldTitle, getPreviewText } from './previewExtractor';
import { getTargetConfidence, getConfidenceColorClass, getConfidenceAriaLabel, computeHasReport } from './computed';
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

// Display-only labels; raw report keys still drive selection and prompt injection.
const SUB_ITEM_LABELS: Record<string, string> = {
  primary_keywords: '核心关键词',
  secondary_keywords: '次级关键词',
  scene_keywords: '场景关键词',
  audience_keywords: '人群关键词',
  removed_modifiers: '已剔除修饰词',
  removed_brand_terms: '已剔除品牌词',
  optimization_suggestions: '优化建议',
  bullet_analysis: '五点描述分析',
  overall_strategy: '整体策略',
  function_scene_matrix: '功能-场景-痛点矩阵',
  critical_issues: '关键问题',
  return_triggers: '退货触发点',
  expectation_gaps: '预期落差',
  actionable_fixes: '可执行修复',
  risk_assessment: '风险评估',
  moments: '惊喜时刻',
  emotional_triggers: '情绪触发点',
  high_conversion_phrases: '高转化表达',
  unexpected_benefits: '意外收益',
  copywriting_angles: '文案角度',
  hesitations: '犹豫点',
  common_doubts: '常见疑虑',
  trust_builders: '信任背书',
  qa_optimization_items: 'Q&A 优化项',
  demographics: '人群特征',
  buyer_types: '买家类型',
  usage_scenes: '使用场景',
  purchase_motivations: '购买动机',
  geographic_insights: '地域洞察',
  seller_terms: '商家用词',
  buyer_terms: '买家用词',
  uncovered_buyer_terms: '未覆盖买家词',
  term_translations: '商家/买家用词转换',
  listing_optimization: 'Listing 优化建议',
  gaps: '承诺/现实落差',
  verified_claims: '已验证卖点',
  unverified_claims: '未验证卖点',
  overall_credibility: '整体可信度',
  listing_revision_suggestions: 'Listing 修改建议',
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

  // 首次加载时初始化 selectedReportItems
  if (isFirstLoad) {
    ctx.profile.selectedReportSections = [...availableTargets];

    // 初始化细粒度选择结构
    if (!ctx.profile.selectedReportItems) {
      ctx.profile.selectedReportItems = {};
    }

    availableTargets.forEach(targetId => {
      ctx.initializeGranularSelections(targetId);
    });

    ctx.saveState();
  }

  ctx.hasRenderedReportOnce = true;


  availableTargets.forEach((targetId) => {
    const config = TARGET_CONFIG[targetId];
    if (!config) return;

    const data = reportObj[targetId];
    const subItemKeys = data && typeof data === 'object' ? Object.keys(data) : [];
    const confidencePct = getTargetConfidence(targetId);
    const hasConfidence = !!confidencePct;

    const div = document.createElement('div');
    div.className = 'dimension-card border border-slate-200 rounded-lg overflow-hidden bg-white';

    const template = `
      <div class="dimension-header p-3 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
           @click="toggleExpansion('${escapeHtml(targetId)}')">
        <div class="flex items-center gap-3">
          <input type="checkbox"
                 class="dimension-checkbox h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                 :checked="isDimensionEnabled('${escapeHtml(targetId)}')"
                 :indeterminate.prop="isPartiallySelected('${escapeHtml(targetId)}')"
                 @change="onDimensionToggle('${escapeHtml(targetId)}')"
                 @click.stop>
          <label class="flex-1 font-medium text-slate-700 cursor-pointer select-none">
            ${config.icon} ${escapeHtml(config.title)}
          </label>
          ${hasConfidence ? `
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border shrink-0 ${escapeHtml(getConfidenceColorClass(confidencePct))}"
                role="status"
                aria-label="${escapeHtml(getConfidenceAriaLabel(confidencePct))}">
            <i class="fa-solid fa-chart-line text-[10px]" aria-hidden="true"></i>
            <span>${confidencePct}%</span>
          </span>` : ''}
          <i class="fas transition-transform text-slate-400"
             :class="isExpanded('${escapeHtml(targetId)}') ? 'fa-chevron-down' : 'fa-chevron-right'"></i>
        </div>
      </div>

      <div class="sub-items"
           x-show="isExpanded('${escapeHtml(targetId)}')"
           x-collapse>
        <div class="sub-items-header flex justify-between px-4 py-2 bg-slate-50 border-t border-slate-200">
          <span class="text-xs text-slate-600 font-medium">子项选择</span>
          <div class="flex gap-3">
            <button @click.stop="selectAllSubItems('${escapeHtml(targetId)}')"
                    class="text-xs text-blue-600 hover:underline font-medium">
              全选
            </button>
            <button @click.stop="deselectAllSubItems('${escapeHtml(targetId)}')"
                    class="text-xs text-slate-600 hover:underline">
              取消全选
            </button>
          </div>
        </div>
        <div class="px-4 py-2">
          ${subItemKeys.map(key => {
            const itemCount = getSubItemCount(data, key);
            const label = formatSubItemLabel(key);
            const subItemData = (data as Record<string, unknown>)[key];
            const hasContent = hasViewableContent(subItemData);

            return `
              <div class="sub-item-wrapper mb-2">
                <div class="sub-item flex items-center gap-2 py-2 hover:bg-slate-50 rounded px-2 transition-colors"
                     ${hasContent ? `@click="toggleSubItemExpansion('${escapeHtml(targetId)}', '${escapeHtml(key)}')"` : ''}>
                  <input type="checkbox"
                         class="sub-item-checkbox h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                         :checked="isSubItemSelected('${escapeHtml(targetId)}', '${escapeHtml(key)}')"
                         :indeterminate.prop="isSubItemPartiallySelected('${escapeHtml(targetId)}', '${escapeHtml(key)}')"
                         @change="onSubItemToggle('${escapeHtml(targetId)}', '${escapeHtml(key)}')"
                         @click.stop>
                  <label class="flex-1 text-sm cursor-pointer select-none text-slate-700">
                    ${escapeHtml(label)} ${itemCount > 0 ? `<span class="text-slate-400 text-xs">(${itemCount} items)</span>` : ''}
                  </label>
                  ${hasContent ? `
                  <i class="fas text-xs text-slate-400 transition-transform"
                     :class="isSubItemExpanded('${escapeHtml(targetId)}', '${escapeHtml(key)}') ? 'fa-chevron-down' : 'fa-chevron-right'"></i>
                  ` : ''}
                </div>

                ${hasContent ? `
                <div class="content-items pl-8"
                     x-show="isSubItemExpanded('${escapeHtml(targetId)}', '${escapeHtml(key)}')"
                     x-collapse>
                  <div class="content-items-header flex justify-between py-1 mb-1">
                    <span class="text-xs text-slate-500">具体内容</span>
                    <div class="flex gap-2">
                      <button @click.stop="selectAllContentItems('${escapeHtml(targetId)}', '${escapeHtml(key)}')"
                              class="text-xs text-blue-600 hover:underline">
                        全选
                      </button>
                      <button @click.stop="deselectAllContentItems('${escapeHtml(targetId)}', '${escapeHtml(key)}')"
                              class="text-xs text-slate-500 hover:underline">
                        取消全选
                      </button>
                    </div>
                  </div>
                  ${renderSelectableContent(subItemData, targetId, key)}
                </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    renderer.renderTemplate(div, template);
    container.appendChild(div);
  });
}

/**
 * 格式化子项键名为可读标签
 */
function formatSubItemLabel(key: string): string {
  if (SUB_ITEM_LABELS[key]) return SUB_ITEM_LABELS[key];

  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * 获取子项数量
 */
function getSubItemCount(data: unknown, key: string): number {
  if (!data || typeof data !== 'object') return 0;
  const dataObj = data as Record<string, unknown>;
  const value = dataObj[key];
  return Array.isArray(value) ? value.length : 0;
}

/**
 * 检查是否有可查看的内容
 */
function hasViewableContent(data: unknown): boolean {
  if (!data) return false;
  if (Array.isArray(data)) return data.length > 0;
  if (typeof data === 'object') return Object.keys(data).length > 0;
  if (typeof data === 'string') return data.length > 0;
  return true;
}

/**
 * 渲染可选择的内容（支持所有数据类型）
 */
function renderSelectableContent(data: unknown, dimensionId: string, subItemKey: string): string {
  if (!data) return '<div class="text-xs text-slate-400 py-2">无内容</div>';

  // 数组类型
  if (Array.isArray(data)) {
    if (data.length === 0) return '<div class="text-xs text-slate-400 py-2">空列表</div>';

    return data.map((item, index) => {
      const displayText = formatContentItem(item);
      return `
        <div class="content-item flex items-start gap-2 py-1.5 px-2 hover:bg-slate-50 rounded text-xs">
          <input type="checkbox"
                 class="content-item-checkbox h-3 w-3 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer mt-0.5 shrink-0"
                 :checked="isContentItemSelected('${escapeHtml(dimensionId)}', '${escapeHtml(subItemKey)}', '${index}')"
                 @change="onContentItemToggle('${escapeHtml(dimensionId)}', '${escapeHtml(subItemKey)}', '${index}')">
          <label class="flex-1 cursor-pointer select-none text-slate-600 leading-relaxed">
            ${escapeHtml(displayText)}
          </label>
        </div>
      `;
    }).join('');
  }

  // 对象类型 - 将每个字段作为可选项
  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const entries = Object.entries(obj);
    if (entries.length === 0) return '<div class="text-xs text-slate-400 py-2">空对象</div>';

    return entries.map(([key, value], index) => {
      const displayText = `${formatSubItemLabel(key)}: ${formatValue(value)}`;
      return `
        <div class="content-item flex items-start gap-2 py-1.5 px-2 hover:bg-slate-50 rounded text-xs">
          <input type="checkbox"
                 class="content-item-checkbox h-3 w-3 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer mt-0.5 shrink-0"
                 :checked="isContentItemSelected('${escapeHtml(dimensionId)}', '${escapeHtml(subItemKey)}', '${index}')"
                 @change="onContentItemToggle('${escapeHtml(dimensionId)}', '${escapeHtml(subItemKey)}', '${index}')">
          <label class="flex-1 cursor-pointer select-none text-slate-600 leading-relaxed">
            ${escapeHtml(displayText)}
          </label>
        </div>
      `;
    }).join('');
  }

  // 基本类型 - 作为单个可选项
  return `
    <div class="content-item flex items-start gap-2 py-1.5 px-2 hover:bg-slate-50 rounded text-xs">
      <input type="checkbox"
             class="content-item-checkbox h-3 w-3 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer mt-0.5 shrink-0"
             :checked="isContentItemSelected('${escapeHtml(dimensionId)}', '${escapeHtml(subItemKey)}', '0')"
             @change="onContentItemToggle('${escapeHtml(dimensionId)}', '${escapeHtml(subItemKey)}', '0')">
      <label class="flex-1 cursor-pointer select-none text-slate-600 leading-relaxed">
        ${escapeHtml(String(data))}
      </label>
    </div>
  `;
}

/**
 * 格式化值为字符串
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    if (value.length <= 3) return value.map(v => formatValue(v)).join(', ');
    return `${value.slice(0, 3).map(v => formatValue(v)).join(', ')}... (${value.length} items)`;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

/**
 * 格式化具体内容项为可读文本
 */
function formatContentItem(item: unknown): string {
  if (typeof item === 'string') return item;
  if (typeof item === 'number') return item.toString();
  if (typeof item === 'boolean') return item ? 'Yes' : 'No';

  if (item && typeof item === 'object') {
    // 尝试提取关键字段
    const obj = item as Record<string, unknown>;

    // 常见的关键字段
    if (obj.keyword) return String(obj.keyword);
    if (obj.issue) return String(obj.issue);
    if (obj.moment_description) return String(obj.moment_description);
    if (obj.pre_purchase_worry) return String(obj.pre_purchase_worry);
    if (obj.type) return String(obj.type);
    if (obj.question) return String(obj.question);

    // 如果有多个字段，组合显示
    const parts: string[] = [];
    if (obj.keyword) parts.push(String(obj.keyword));
    if (obj.weight) parts.push(`[${obj.weight}]`);
    if (obj.importance) parts.push(`[${obj.importance}]`);
    if (obj.search_volume_estimate) parts.push(`(${obj.search_volume_estimate})`);

    if (parts.length > 0) return parts.join(' ');

    // 默认：显示前两个字段
    const keys = Object.keys(obj).slice(0, 2);
    return keys.map(k => `${k}: ${obj[k]}`).join(', ');
  }

  return JSON.stringify(item);
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

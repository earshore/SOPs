/**
 * Promptlab UI 辅助模块
 *
 * 管理所有与纯渲染/交互相关的辅助逻辑：
 * - 输入框高度自适应（initAutoHeightInputs / expandInput / restoreInput）
 * - 控制台模式切换（toggleConsoleMode）
 * - 复制 Prompt（copyPrompt）
 * - 清空输入（clearInputs）
 * - 报告模块全选 / 清空（selectAllReportSections / clearReportSections）
 * - 表单变化事件（onReportSectionChange / onInputChange）
 */

import { appStore } from '@/stores/useAppStore';
import { showToast } from '@/common/ui';
import { navigateToRouteId } from '@/common/router/initRouter';
import type { DnaConfidence, PromptlabAlpineContext, ConsoleMode } from './types';
import type { PromptInputs, UserProductProfile } from '@/types/state';
import type { AnalysisReport } from '@/types/modules-business';
import { confirmWithModal } from '../../utils/confirmModal';
import { promptlabService } from '../../services/promptlabService';

// ==========================================
// 输入框高度自适应
// ==========================================

/**
 * 初始化所有 DNA / Strategy 卡片 textarea 的原始高度记录
 * 需在 DOM 渲染完成后（setTimeout 100ms）调用
 */
export function initAutoHeightInputs(originalHeights: Map<HTMLElement, number>): void {
  setTimeout(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }

    const textareas = document.querySelectorAll(
      '#card-product-dna textarea, #card-strategy textarea'
    );
    textareas.forEach(textarea => {
      const el = textarea as HTMLTextAreaElement;
      if (!originalHeights.has(el)) {
        originalHeights.set(el, el.rows || 1);
      }
    });
  }, 100);
}

/**
 * 输入框获得焦点时自动扩展到内容所需高度（最大 300px）
 */
export function expandInput(originalHeights: Map<HTMLElement, number>, event: FocusEvent): void {
  const target = event.target as HTMLTextAreaElement;

  if (!originalHeights.has(target)) {
    originalHeights.set(target, target.rows || 1);
  }

  const computed = window.getComputedStyle(target);
  const lineHeight = parseFloat(computed.lineHeight) || parseFloat(computed.fontSize) * 1.45 || 20;
  const verticalPadding =
    (parseFloat(computed.paddingTop) || 0) + (parseFloat(computed.paddingBottom) || 0);
  const minRows = originalHeights.get(target) ?? 1;
  const contentRows = Math.ceil(Math.max(0, target.scrollHeight - verticalPadding) / lineHeight);

  target.rows = Math.min(Math.max(contentRows, minRows), 10);
  target.classList.add('promptlab-textarea-expanded');
}

/**
 * 输入框失去焦点时恢复到原始高度
 */
export function restoreInput(originalHeights: Map<HTMLElement, number>, event: FocusEvent): void {
  const target = event.target as HTMLTextAreaElement;
  const originalRows = originalHeights.get(target);

  if (originalRows) {
    target.rows = originalRows;
  }
  target.classList.remove('promptlab-textarea-expanded');
}

// ==========================================
// 控制台模式切换
// ==========================================

/**
 * 在 Listing 模式和 Visual 模式之间切换
 * 控制 3D 翻转卡片、滑块指示器、按钮样式和输出标题
 */
export function toggleConsoleMode(
  ctx: Pick<PromptlabAlpineContext, 'currentConsoleMode'>,
  mode: ConsoleMode
): void {
  if (ctx.currentConsoleMode === mode) return;
  ctx.currentConsoleMode = mode;

  const cardInner = document.getElementById('console-card-inner');
  const toggleContainer = document.getElementById('embed-toggle-container');
  const glider = document.getElementById('mode-toggle-glider');
  const btnListing = document.getElementById('btn-mode-listing');
  const btnVisual = document.getElementById('btn-mode-visual');
  const outputTitle = document.querySelector('#output-preview-title');

  if (!cardInner || !glider) return;

  if (mode === 'visual') {
    cardInner.dataset.consoleMode = 'visual';
    glider.dataset.consoleMode = 'visual';
    glider.classList.add('bg-white');
    glider.classList.remove('bg-pink-500');

    toggleContainer?.classList.add('bg-pink-900/30', 'border-pink-500/30');
    toggleContainer?.classList.remove('bg-white/20', 'border-white/10');

    btnListing?.classList.replace('text-blue-600', 'text-slate-400');
    btnListing?.classList.add('opacity-60');

    btnVisual?.classList.replace('text-slate-400', 'text-pink-500');
    btnVisual?.classList.remove('hover:text-pink-500');

    if (outputTitle) outputTitle.textContent = 'Visual Prompt';
  } else {
    cardInner.dataset.consoleMode = 'listing';
    glider.dataset.consoleMode = 'listing';
    glider.classList.add('bg-white');
    glider.classList.remove('bg-pink-500');

    toggleContainer?.classList.remove('bg-pink-900/30', 'border-pink-500/30');
    toggleContainer?.classList.add('bg-white/20', 'border-white/10');

    btnVisual?.classList.replace('text-pink-500', 'text-slate-400');
    btnVisual?.classList.add('hover:text-pink-500');

    btnListing?.classList.replace('text-slate-400', 'text-blue-600');
    btnListing?.classList.remove('opacity-60');

    if (outputTitle) outputTitle.textContent = 'Listing Prompt';
  }
}

// ==========================================
// 复制 Prompt
// ==========================================

/**
 * 复制 #final-prompt-output textarea 的内容到剪贴板
 */
export function copyPrompt(): void {
  const el = document.getElementById('final-prompt-output') as HTMLTextAreaElement | null;
  if (el && el.value.length > 10) {
    el.select();
    document.execCommand('copy');
    showToast('Prompt 已复制', { type: 'success' });
  }
}

// ==========================================
// 清空输入
// ==========================================

function getPromptAnalysisReport(): AnalysisReport | null {
  const analysisReport = appStore.getState().analysis.analysisReport;
  return analysisReport && typeof analysisReport !== 'string' ? analysisReport : null;
}

function createSeoCopyInputs(ctx: PromptlabAlpineContext): PromptInputs {
  return { ...ctx.profile, useAnalysisData: true };
}

async function writeTextToClipboard(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.className = 'sr-only';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

export async function copySeoKeywords(ctx: PromptlabAlpineContext): Promise<void> {
  const text = promptlabService.buildSeoKeywordCopyText(
    createSeoCopyInputs(ctx),
    getPromptAnalysisReport()
  );

  if (!text.trim()) {
    showToast('暂无可复制的 SEO 关键词', { type: 'warning' });
    return;
  }

  try {
    await writeTextToClipboard(text);
    showToast('SEO 关键词已复制', { type: 'success' });
  } catch (error) {
    console.error('[Promptlab] 复制 SEO 关键词失败:', error);
    showToast('复制失败，请重试', { type: 'error' });
  }
}

function parsePromptlabKeywords(ctx: PromptlabAlpineContext): string[] {
  const seen = new Set<string>();
  return [ctx.profile.keywordsTier1, ctx.profile.keywordsTier2]
    .join('\n')
    .split(/[\n,;，；]+/)
    .map(keyword => keyword.trim())
    .filter(keyword => {
      const normalized = keyword.toLowerCase();
      if (!normalized || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
}

export async function handoffListingPromptToKeywordHunter(
  ctx: PromptlabAlpineContext
): Promise<void> {
  const listingPrompt = ctx.listingPromptCache.trim();
  if (!listingPrompt) {
    showToast('请先生成 Listing Prompt', { type: 'warning' });
    return;
  }

  const keywords = parsePromptlabKeywords(ctx);
  appStore.getState().updateKeywordTracker({
    keywordsInputText: keywords.join('\n'),
    copyInputText: listingPrompt,
    keywords,
    processedCopy: listingPrompt,
    matchedKeywords: [],
    unmatchedKeywords: [],
    wordFrequency: [],
    paragraphs: [],
    llmAnalysisResult: '',
    currentSnapshotId: null,
    keywordLocationIndex: {},
    snapshotSource: { type: 'manual' },
  });

  const didNavigate = await navigateToRouteId('keyword_hunter_input');
  showToast(didNavigate ? '已带入 Keyword Hunter 复核' : '无法打开 Keyword Hunter', {
    type: didNavigate ? 'success' : 'warning',
  });
}

/** 默认空白 profile，用于清空操作 */
const EMPTY_PROFILE: UserProductProfile = {
  targetMarket: '',
  keywordsTier1: '',
  keywordsTier2: '',
  audience: '',
  usps: '',
  specs: '',
  socialHook: '',
  negative: '',
  tone: 'professional',
  customStrategy: '',
  useCosmo: true,
  useRufus: true,
  useEmoji: true,
  selectedReportSections: [],
  charLimit: 5000,
};

const EMPTY_DNA_CONFIDENCE: DnaConfidence = {
  audience: 0,
  usps: 0,
  specs: 0,
  keywords: 0,
  keywordsTier1: 0,
  keywordsTier2: 0,
  negative: 0,
  overall: 0,
};

/**
 * 弹窗确认后清空所有输入字段并保存
 */
export async function clearInputs(ctx: PromptlabAlpineContext): Promise<void> {
  const confirmed = await confirmWithModal(
    '清空 PromptLab 输入',
    '确定要清空所有输入框吗？',
    '',
    '清空输入'
  );
  if (!confirmed) return;

  ctx.profile = { ...EMPTY_PROFILE };
  ctx.dnaConfidence = { ...EMPTY_DNA_CONFIDENCE };
  ctx.saveState();
  showToast('已清空', { type: 'success' });
}

// ==========================================
// 报告模块全选 / 清空
// ==========================================

/**
 * 选中报告中所有可用分析维度（排除 _metadata）
 */
export function selectAllReportSections(ctx: PromptlabAlpineContext): void {
  const report = appStore.getState().analysis.analysisReport;
  if (!report || typeof report === 'string') {
    showToast('暂无可选模块', { type: 'warning' });
    return;
  }

  const reportObj = report as Record<string, unknown>;
  const availableTargets = Object.keys(reportObj).filter(id => id !== '_metadata');

  ctx.profile.selectedReportSections = [...availableTargets];
  ctx.saveState();
  ctx.renderReportAnalysis();

  showToast('已全选模块', { type: 'success' });
}

/**
 * 清空所有已选的报告分析维度
 */
export function clearReportSections(ctx: PromptlabAlpineContext): void {
  ctx.profile.selectedReportSections = [];
  ctx.saveState();
  ctx.renderReportAnalysis();

  showToast('已清空选择', { type: 'success' });
}

// ==========================================
// 表单事件处理
// ==========================================

/**
 * 读取所有已选中的 report-section 复选框，同步到 ctx.profile
 */
export function onReportSectionChange(ctx: PromptlabAlpineContext): void {
  const checked: string[] = [];
  document
    .querySelectorAll<HTMLInputElement>('input[name="report-section"]:checked')
    .forEach(cb => checked.push(cb.value));

  ctx.profile.selectedReportSections = checked;
  ctx.saveState();
}

/**
 * 任意输入变化时保存 profile 到 store
 */
export function onInputChange(ctx: PromptlabAlpineContext): void {
  ctx.saveState();
}

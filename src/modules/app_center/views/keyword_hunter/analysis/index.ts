/**
 * Analysis 子模块
 * 负责关键词分析、统计和 AI 诊断报告功能
 *
 * 架构说明：
 * - 直接 import marked，不依赖 window.marked（生产环境安全）
 * - state 只持久化原始 Markdown 文本，恢复时重新渲染（避免二次 highlightScores）
 * - highlightScores 按内容语义分类行，不再依赖"最后一行=总分"的错误假设
 * - 三阶段加载动画提升体验感
 */

import { marked } from 'marked';

import BaseModule from '@/common/BaseModule';
import { getWorkbenchIconContainerClasses } from '@/common/constants/colorSchemes';
import { ValidationError } from '@/common/errors/AppError';
import { formatLlmFailureUx, showLlmFailureToast } from '@/common/errors/llmFailureUx';
import { SafeTemplateLoader } from '@/common/infrastructure/SafeModuleLoader';
import { SafeRenderer } from '@/common/infrastructure/SafeRenderer';
import { showToast } from '@/common/ui';
import { createSafeFragment, setSafeHtml } from '@/common/utils/security';
import { ErrorService } from '@/services/errorService';
import { resolveToolLlmPublicConfig } from '@/services/llmToolBridge';
import { appStore } from '@/stores/useAppStore';

import { estimateSingleCallTime } from '../../master_analysis/ai_analysis/services/analysisTimeEstimator';
import { getUserReasoningPrefs } from '../../master_analysis/ai_analysis/services/reasoningPolicy';
import * as KeywordHunterService from '../services/keywordHunterService';
import { KeywordHunterSnapshotService } from '../services/snapshotService';
import { confirmWithModal } from '../utils/confirmModal';


import '../styles.css';

// ==========================================
// marked 配置
// ==========================================

marked.use({
  gfm: true, // GitHub Flavored Markdown：支持表格、删除线等
  breaks: false, // LLM 输出使用标准段落，不把单个换行转为 <br>
});

// ==========================================
// Module State
// ==========================================

interface ActiveAnalysisRun {
  processedCopy: string;
  promise: Promise<string>;
  status: 'pending' | 'success' | 'failure';
  response?: string;
  error?: Error;
  successToastShown?: boolean;
  llmStatus?: KeywordHunterService.KeywordHunterLlmStatus;
}

/** 存放当次分析的原始 Markdown 文本（未渲染 HTML） */
let rawMarkdownCache = '';

/** Singleton set in module constructor; routes DOM/timer registration through BaseModule. */
let analysisLifecycle: KeywordHunterAnalysisModule | null = null;

let activeAnalysisRun: ActiveAnalysisRun | null = null;
let analysisViewVersion = 0;

// ==========================================
// Helper Functions
// ==========================================

function addEventListener(
  element: HTMLElement | Document | Window,
  event: string,
  handler: EventListenerOrEventListenerObject
): void {
  analysisLifecycle?.trackDomEvent(element, event, handler);
}

function addTimeout(callback: () => void, delay: number): number {
  return analysisLifecycle?.trackTimeout(callback, delay) ?? 0;
}

function escapeHtml(text: string): string {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function normalizeReportMarkdown(markdown: string): string {
  const structuralEmoji =
    '(?:\\u{1F3C6}|\\u{1F4CA}|\\u{1F50D}|\\u{1F3AF}|\\u{1F916}|\\u270D\\uFE0F?|\\u26A0\\uFE0F?|\\u{1F6A8}|\\u{1F527}|\\u2705|\\u{1F7E2}|\\u{1F7E1}|\\u{1F534}|\\u2728|\\u{1F4A1})';
  return markdown
    .replace(new RegExp(`^(#{1,6}\\s*)${structuralEmoji}\\s*`, 'gmu'), '$1')
    .replace(new RegExp(`^(\\|\\s*)${structuralEmoji}\\s*`, 'gmu'), '$1')
    .replace(new RegExp(`(\\|\\s*)${structuralEmoji}\\s*`, 'gu'), '$1')
    .replace(new RegExp(`^(>\\s*)${structuralEmoji}\\s*`, 'gmu'), '$1');
}

// ==========================================
// Markdown 渲染工具
// ==========================================

/**
 * 将 Markdown 文本解析为 HTML 字符串。
 * marked v5+ 在同步模式下（无 async 扩展）直接返回 string。
 * 若意外返回 Promise 或解析失败，降级为 <pre> 原文展示。
 */
function parseMarkdownToHtml(markdown: string): string {
  if (!markdown || !markdown.trim()) return '';
  const normalizedMarkdown = normalizeReportMarkdown(markdown);
  try {
    const result = marked.parse(normalizedMarkdown);
    if (typeof result === 'string' && result.trim()) {
      return result;
    }
    // result 是 Promise（不应发生，但做保护）
    return `<pre class="whitespace-pre-wrap text-sm text-slate-600 leading-relaxed">${escapeHtml(normalizedMarkdown)}</pre>`;
  } catch (err) {
    ErrorService.handle(err as Error, {
      action: 'parseMarkdownToHtml',
      module: 'keywordAnalysis',
      notify: false,
    });
    return `<pre class="whitespace-pre-wrap text-sm text-slate-600 leading-relaxed">${escapeHtml(normalizedMarkdown)}</pre>`;
  }
}

/**
 * 将原始 Markdown 渲染到指定容器，并运行 highlightScores 增强评分展示。
 * 这是唯一的"写入报告区域"入口，确保流程统一。
 */
function renderReport(container: HTMLElement, markdown: string): void {
  if (!container) return;

  const html = parseMarkdownToHtml(markdown);
  if (!html) {
    return;
  }

  const renderer = SafeRenderer.getInstance();
  renderer.renderUntrustedHtml(container, html);

  // DOM 写入后，下一帧再运行增强逻辑，确保布局已完成
  requestAnimationFrame(() => {
    highlightScores(container);
  });
}

function renderAnalysisSuccess(response: string, resultDiv: HTMLElement | null): void {
  if (resultDiv) {
    renderReport(resultDiv, response);
  }

  // 完成态统一由 updateAnalyzeButtonState 派生（success 样式 + 「重新生成」文案），避免双写矛盾
  updateAnalyzeButtonState();
}

// ==========================================
// State Management
// ==========================================

/**
 * 保存分析状态到 state。
 * 只保存原始 Markdown 文本，不保存渲染后的 HTML，
 * 以避免恢复时 highlightScores 二次处理产生重复徽章。
 */
function resolveListingReviewModelLabel(): string {
  try {
    const model = resolveToolLlmPublicConfig('keyword-hunter-listing-review', {
      module: 'keyword_hunter',
    }).model;
    return typeof model === 'string' ? model.trim() : '';
  } catch {
    return '';
  }
}

function saveAnalysisStateToState(): void {
  if (rawMarkdownCache) {
    const model = resolveListingReviewModelLabel();
    appStore.getState().updateKeywordTracker({
      llmAnalysisResult: rawMarkdownCache,
      ...(model ? { llmAnalysisModel: model } : {}),
    });
  }
}

function getError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function isAnalysisRunForCurrentCopy(run: ActiveAnalysisRun): boolean {
  return getProcessedCopy() === run.processedCopy;
}

function finalizeAnalysisSuccess(run: ActiveAnalysisRun, response: string): string {
  if (!response || !response.trim()) {
    throw new ValidationError('AI 返回内容为空，请重试', 'KH_ANALYSIS_001', 'response', response, {
      module: 'keyword_hunter',
      action: 'finalizeAnalysisSuccess',
    });
  }

  run.status = 'success';
  run.response = response;
  if (!isAnalysisRunForCurrentCopy(run)) {
    return response;
  }

  rawMarkdownCache = response;
  saveAnalysisStateToState();
  void saveAnalysisSnapshot(false);
  return response;
}

function finalizeAnalysisFailure(run: ActiveAnalysisRun, error: unknown): never {
  const normalizedError = getError(error);
  run.status = 'failure';
  run.error = normalizedError;
  throw normalizedError;
}

function appendIconLabel(
  parent: HTMLElement,
  iconClass: string,
  label: string,
  labelClass?: string
): HTMLElement {
  const icon = document.createElement('i');
  icon.className = iconClass;
  icon.setAttribute('aria-hidden', 'true');
  const span = document.createElement('span');
  if (labelClass) span.className = labelClass;
  span.textContent = label;
  parent.append(icon, span);
  return span;
}

/** Lightweight typewriter preview (final pass uses full markdown renderer). */
function renderStreamContentPreview(container: HTMLElement, text: string): void {
  container.replaceChildren();
  const lines = text.split('\n');
  lines.forEach((line, index) => {
    if (line) container.appendChild(document.createTextNode(line));
    if (index < lines.length - 1) container.appendChild(document.createElement('br'));
  });
  const cursor = document.createElement('span');
  cursor.className = 'keyword-hunter-stream-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  container.appendChild(cursor);
  container.scrollTop = container.scrollHeight;
}

/** Ensure stream UI shell exists; return live content + reasoning nodes. */
function ensureAnalysisStreamShell(resultDiv: HTMLElement): {
  contentEl: HTMLElement;
  reasoningBody: HTMLElement;
} {
  let shell = resultDiv.querySelector('.keyword-hunter-stream-shell') as HTMLElement | null;
  if (!shell) {
    resultDiv.replaceChildren();
    shell = document.createElement('div');
    shell.className = 'keyword-hunter-stream-shell';
    shell.setAttribute('role', 'status');
    shell.setAttribute('aria-live', 'polite');

    const reasoning = document.createElement('details');
    reasoning.className = 'keyword-hunter-stream-reasoning';
    reasoning.open = true;
    reasoning.hidden = true;

    const summary = document.createElement('summary');
    summary.className = 'keyword-hunter-stream-reasoning__summary';
    appendIconLabel(summary, 'fas fa-brain', '模型思考过程');
    const hint = document.createElement('span');
    hint.className = 'keyword-hunter-stream-reasoning__hint';
    hint.textContent = '点击收起/展开';
    summary.appendChild(hint);

    const reasoningBody = document.createElement('pre');
    reasoningBody.className = 'keyword-hunter-stream-reasoning__body';
    reasoning.append(summary, reasoningBody);

    const meta = document.createElement('div');
    meta.className = 'keyword-hunter-stream-meta';
    appendIconLabel(
      meta,
      'fas fa-stream',
      '正在流式生成报告…',
      'keyword-hunter-stream-meta__label'
    );
    const metaCursor = document.createElement('span');
    metaCursor.className = 'keyword-hunter-stream-cursor';
    metaCursor.setAttribute('aria-hidden', 'true');
    meta.appendChild(metaCursor);

    const contentEl = document.createElement('div');
    contentEl.className =
      'keyword-hunter-stream-content markdown-content keyword-hunter-report-rendered';

    shell.append(reasoning, meta, contentEl);
    resultDiv.appendChild(shell);
  }

  const contentEl = shell.querySelector('.keyword-hunter-stream-content') as HTMLElement;
  const reasoningBody = shell.querySelector(
    '.keyword-hunter-stream-reasoning__body'
  ) as HTMLElement;
  return { contentEl, reasoningBody };
}

function applyAnalysisStreamUpdate(
  run: ActiveAnalysisRun,
  status: KeywordHunterService.KeywordHunterLlmStatus
): void {
  if (status.stage !== 'stream' || !isAnalysisRunForCurrentCopy(run)) return;

  const resultDiv = document.getElementById('keyword-hunter-llm-analysis-result');
  if (!resultDiv) return;

  // Switch off static loading shell on first content/reasoning chunk.
  const { contentEl, reasoningBody } = ensureAnalysisStreamShell(resultDiv);
  const { update } = status;

  if (update.content) {
    renderStreamContentPreview(contentEl, update.content);
  }

  if (update.reasoningContent?.trim()) {
    const reasoningWrap = reasoningBody.closest(
      '.keyword-hunter-stream-reasoning'
    ) as HTMLElement | null;
    if (reasoningWrap) reasoningWrap.hidden = false;
    reasoningBody.textContent = update.reasoningContent;
    reasoningBody.scrollTop = reasoningBody.scrollHeight;
  }
}

function startAnalysisRun(
  processedCopy: string,
  options: { bypassCache?: boolean } = {}
): ActiveAnalysisRun {
  const run: ActiveAnalysisRun = {
    processedCopy,
    promise: Promise.resolve(''),
    status: 'pending',
  };

  run.promise = fetchListingAnalysis(
    processedCopy,
    status => {
      run.llmStatus = status;
      renderAnalysisLlmStatus(run, status);
      applyAnalysisStreamUpdate(run, status);
    },
    { bypassCache: options.bypassCache }
  )
    .then(response => finalizeAnalysisSuccess(run, response))
    .catch(error => finalizeAnalysisFailure(run, error))
    .finally(() => {
      if (activeAnalysisRun === run) {
        activeAnalysisRun = null;
      }
    });

  activeAnalysisRun = run;
  return run;
}

function getCurrentAnalysisElements(): {
  btn: HTMLButtonElement | null;
  resultDiv: HTMLElement | null;
} {
  return {
    btn: document.getElementById('keyword-hunter-analyze-btn') as HTMLButtonElement | null,
    resultDiv: document.getElementById('keyword-hunter-llm-analysis-result'),
  };
}

function attachAnalysisRunToPage(run: ActiveAnalysisRun): void {
  if (!isAnalysisRunForCurrentCopy(run)) {
    return;
  }

  const viewVersion = analysisViewVersion;
  const { btn, resultDiv } = getCurrentAnalysisElements();
  if (btn) setBtnState(btn, 'loading', '分析中…');

  // Prefer live stream shell if already receiving chunks; else classic loading phases.
  const hasStreamShell = Boolean(resultDiv?.querySelector('.keyword-hunter-stream-shell'));
  const cancelLoading = resultDiv && !hasStreamShell ? showLoadingState(resultDiv) : null;
  if (run.llmStatus) {
    renderAnalysisLlmStatus(run, run.llmStatus);
    applyAnalysisStreamUpdate(run, run.llmStatus);
  }

  run.promise
    .then(response => {
      cancelLoading?.();
      if (viewVersion !== analysisViewVersion || !isAnalysisRunForCurrentCopy(run)) return;

      const current = getCurrentAnalysisElements();
      renderAnalysisSuccess(response, current.resultDiv);
      if (!run.successToastShown) {
        showToast('报告生成成功', { type: 'success' });
        run.successToastShown = true;
      }
    })
    .catch(error => {
      cancelLoading?.();
      if (viewVersion !== analysisViewVersion || !isAnalysisRunForCurrentCopy(run)) return;

      const current = getCurrentAnalysisElements();
      handleAnalysisFailure(getError(error), current.resultDiv, current.btn);
    });
}

async function saveAnalysisSnapshot(showSuccessToast = true): Promise<boolean> {
  saveAnalysisStateToState();
  try {
    await KeywordHunterSnapshotService.saveCurrentAsync({ status: 'reported' });
    if (showSuccessToast) {
      showToast('快照已保存', { type: 'success' });
    }
    return true;
  } catch (error) {
    console.error('[Analysis] 保存快照失败:', error);
    const message = error instanceof Error ? error.message : '保存快照失败';
    if (showSuccessToast) {
      showToast(message, {
        type: 'error',
      });
    } else {
      showToast(`报告已生成，但历史快照自动保存失败：${message}`, {
        type: 'warning',
      });
    }
    return false;
  }
}

/**
 * 从 state 恢复分析状态。
 * 读取原始 Markdown 文本重新渲染，而非直接注入保存的 HTML。
 */
async function restoreAnalysisStateFromState(): Promise<void> {
  if (activeAnalysisRun?.status === 'pending') {
    attachAnalysisRunToPage(activeAnalysisRun);
    if (isAnalysisRunForCurrentCopy(activeAnalysisRun)) {
      return;
    }
  }

  const currentState = appStore.getState();
  const savedMarkdown = currentState.keywordTracker?.llmAnalysisResult;

  if (savedMarkdown && savedMarkdown.trim()) {
    // 判断保存的是原始 Markdown 还是旧版本保存的 HTML
    // 简单启发式：以 '<' 开头的大概率是 HTML（旧版本兼容）
    const isLikelyHtml = savedMarkdown.trimStart().startsWith('<');

    const resultDiv = document.getElementById('keyword-hunter-llm-analysis-result');
    if (!resultDiv) {
      renderAnalysisModule();
      return;
    }

    if (isLikelyHtml) {
      // 旧版本兼容：直接注入 HTML，再运行幂等增强以同步新版报告封面。
      const renderer = SafeRenderer.getInstance();
      renderer.renderUntrustedHtml(resultDiv, savedMarkdown);
      requestAnimationFrame(() => {
        highlightScores(resultDiv);
      });
    } else {
      // 新版本：原始 Markdown，重新完整渲染
      rawMarkdownCache = savedMarkdown;
      renderReport(resultDiv, savedMarkdown);
    }
  } else {
    rawMarkdownCache = '';
  }

  renderAnalysisModule();
}

// ==========================================
// UI Rendering Functions
// ==========================================

function renderAnalysisModule(): void {
  updateAnalyzeButtonState();
}

function getAnalyzeButtonLabel(state: 'active' | 'disabled' | 'loading' | 'success'): string {
  if (state === 'loading') return '分析中…';
  if (state === 'success') return '报告已生成';
  return '重新生成';
}

/**
 * 更新「重新生成」按钮状态（首次生成由 SEO「进入分析」自动触发）。
 */
function updateAnalyzeButtonState(): void {
  const btn = document.getElementById('keyword-hunter-analyze-btn') as HTMLButtonElement | null;
  if (!btn) return;

  if (activeAnalysisRun?.status === 'pending' && isAnalysisRunForCurrentCopy(activeAnalysisRun)) {
    setBtnState(btn, 'loading', getAnalyzeButtonLabel('loading'));
    return;
  }

  const hasContent = Boolean(appStore.getState().keywordTracker?.processedCopy?.trim());
  const hasReport = Boolean(
    rawMarkdownCache.trim() || appStore.getState().keywordTracker?.llmAnalysisResult?.trim()
  );

  if (!hasContent) {
    setBtnState(btn, 'disabled', getAnalyzeButtonLabel('disabled'));
    return;
  }

  setBtnState(btn, hasReport ? 'success' : 'active', getAnalyzeButtonLabel('active'));
  // Keep regeneratable even after success styling
  if (hasReport) {
    btn.disabled = false;
    btn.classList.remove(...BTN_CLASSES.disabled, ...BTN_CLASSES.loading);
    btn.classList.add(...BTN_CLASSES.active);
  }
}

// ==========================================
// Loading State
// ==========================================

/**
 * 在结果区显示三阶段动态加载动画
 */
function showLoadingState(container: HTMLElement): () => void {
  const phases = [
    {
      icon: 'fa-database',
      text: '正在读取文案与关键词数据…',
      color: 'text-slate-500',
    },
    {
      icon: 'fa-brain',
      text: 'AI 正在深度分析 Listing…',
      color: 'text-cyan-600',
    },
    {
      icon: 'fa-file-medical',
      text: '正在生成评审报告…',
      color: 'text-sky-600',
    },
  ] as const;

  let phaseIndex = 0;

  const buildHtml = (phase: (typeof phases)[number]) => `
        <div class="flex flex-col items-center justify-center py-16 text-center" id="keyword-hunter-loading-state"
             role="status" aria-live="polite" aria-atomic="true">
            <div class="relative mb-6">
                <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-50 to-sky-50
                            flex items-center justify-center border border-cyan-100 shadow-inner">
                    <i class="fas ${phase.icon} text-2xl text-cyan-300 animate-pulse"></i>
                </div>
                <div class="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-white border border-slate-100
                            flex items-center justify-center shadow-sm">
                    <i class="fas fa-spinner fa-spin text-cyan-400 text-xs"></i>
                </div>
            </div>
            <p class="font-semibold ${phase.color} text-sm mb-1">${phase.text}</p>
            <p class="text-xs text-slate-400">正在生成评审报告，请稍候…</p>
            <div class="mt-4 flex gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-bounce"></span>
                <span class="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-bounce [animation-delay:150ms]"></span>
                <span class="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-bounce [animation-delay:300ms]"></span>
            </div>
        </div>
    `;

  const renderer = SafeRenderer.getInstance();
  const initialPhase = phases[0];
  if (!initialPhase) return () => {};
  renderer.renderTemplate(container, buildHtml(initialPhase));

  // 阶段切换计时器
  const advancePhase = () => {
    phaseIndex = Math.min(phaseIndex + 1, phases.length - 1);
    const loadingEl = document.getElementById('keyword-hunter-loading-state');
    if (loadingEl) {
      const phase = phases[phaseIndex];
      if (!phase) return;
      // ✅ 安全: buildHtml返回静态模板，phase.icon/text/color来自常量数组
      const fragment = createSafeFragment(buildHtml(phase));
      const nextContent = fragment.firstElementChild;
      if (nextContent) {
        loadingEl.replaceWith(nextContent);
      }
    }
  };

  const t1 = addTimeout(advancePhase, 3500);
  const t2 = addTimeout(advancePhase, 10000);

  // 返回清理函数（调用方在完成/出错时调用）
  return () => {
    clearTimeout(t1);
    clearTimeout(t2);
  };
}

function setAnalysisLoadingCopy(titleText: string, hintText: string, streamLabel?: string): void {
  const loadingEl = document.getElementById('keyword-hunter-loading-state');
  if (loadingEl) {
    const title = loadingEl.querySelector('p.font-semibold');
    const hint = loadingEl.querySelector('p.text-xs');
    if (title) title.textContent = titleText;
    if (hint) hint.textContent = hintText;
  }
  const streamMeta = document.querySelector(
    '.keyword-hunter-stream-meta__label'
  ) as HTMLElement | null;
  if (streamMeta) streamMeta.textContent = streamLabel ?? titleText;
}

function renderAnalysisLlmStatus(
  run: ActiveAnalysisRun,
  status: KeywordHunterService.KeywordHunterLlmStatus
): void {
  if (!isAnalysisRunForCurrentCopy(run)) return;

  // Stream chunks are handled by applyAnalysisStreamUpdate (typewriter shell).
  if (status.stage === 'stream') return;

  if (status.stage === 'cache-hit') {
    setAnalysisLoadingCopy('已命中缓存，正在渲染报告…', '无需重新调用模型');
    return;
  }

  if (status.stage === 'in-flight') {
    setAnalysisLoadingCopy('正在复用进行中的分析请求…', '相同 Listing 不会重复调用模型');
    return;
  }

  if (status.stage === 'first-response') {
    const firstMs = status.metrics.firstChunkMs ?? status.metrics.elapsedMs;
    setAnalysisLoadingCopy(
      `模型已首响 ${(firstMs / 1000).toFixed(1)}s，正在接收报告…`,
      '流式响应已开始'
    );
  }
}

// ==========================================
// Button State Helpers
// ==========================================

const BTN_CLASSES = {
  active: ['keyword-hunter-analysis-action--active', 'cursor-pointer'],
  disabled: ['keyword-hunter-analysis-action--disabled', 'cursor-not-allowed'],
  loading: ['keyword-hunter-analysis-action--loading', 'cursor-wait'],
  success: ['keyword-hunter-analysis-action--success', 'cursor-not-allowed'],
} as const;

function getProcessedCopy(): string {
  return appStore.getState().keywordTracker?.processedCopy ?? '';
}

async function fetchListingAnalysis(
  processedCopy: string,
  onLlmStatus?: (status: KeywordHunterService.KeywordHunterLlmStatus) => void,
  options: { bypassCache?: boolean } = {}
): Promise<string> {
  const keywordTracker = appStore.getState().keywordTracker;

  return KeywordHunterService.fetchListingAnalysis(
    processedCopy,
    keywordTracker?.keywords ?? [],
    keywordTracker?.matchedKeywords ?? [],
    keywordTracker?.unmatchedKeywords ?? [],
    { onLlmStatus, bypassCache: options.bypassCache }
  );
}

function isValidationAnalysisError(error: Error): boolean {
  return error.message.includes('输入内容过短') || error.message.includes('文案内容为空');
}

function createAnalysisUserMessage(errorMessage: string): string {
  if (errorMessage.includes('503')) {
    return '服务暂时不可用 (503)，可能是模型过载，请稍后重试。';
  }

  if (errorMessage.includes('429')) {
    return '请求频率超限 (429)，请稍等片刻后重试。';
  }

  if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
    return '请求超时，请检查网络后重试。';
  }

  return errorMessage;
}

function createAnalysisRetryButton(colorScheme: 'yellow' | 'red'): HTMLButtonElement {
  const retryBtn = document.createElement('button');
  retryBtn.className =
    `inline-flex items-center gap-1.5 px-3 py-1.5 ` +
    `bg-white border border-${colorScheme}-200 text-${colorScheme}-700 ` +
    `text-xs rounded-lg hover:bg-${colorScheme}-50 transition-colors font-medium`;
  // ✅ 安全: 静态HTML模板，无用户输入
  setSafeHtml(retryBtn, '<i class="fas fa-redo text-[10px]"></i> 重试');
  addEventListener(retryBtn, 'click', () => {
    void runLLMAnalysis({ bypassCache: true });
  });

  return retryBtn;
}

function renderAnalysisError(resultDiv: HTMLElement, userMsg: string, isValidation: boolean): void {
  const colorScheme = isValidation ? 'yellow' : 'red';
  const icon = isValidation ? 'fa-exclamation-circle' : 'fa-exclamation-triangle';
  const title = isValidation ? '无法进行分析' : '分析失败';

  const errorDiv = document.createElement('div');
  errorDiv.className = `p-5 bg-${colorScheme}-50 border border-${colorScheme}-200 rounded-xl`;
  errorDiv.setAttribute('role', 'alert');
  errorDiv.setAttribute('aria-live', 'assertive');

  const headerDiv = document.createElement('div');
  headerDiv.className = `flex items-center gap-2 text-${colorScheme}-700 font-bold mb-2`;
  const iconEl = document.createElement('i');
  iconEl.className = `fas ${icon}`;
  headerDiv.appendChild(iconEl);
  headerDiv.appendChild(document.createTextNode(` ${title}`));

  const msgP = document.createElement('p');
  msgP.className = `text-sm text-${colorScheme}-800 mb-3 leading-relaxed`;
  msgP.textContent = userMsg;

  errorDiv.appendChild(headerDiv);
  errorDiv.appendChild(msgP);
  errorDiv.appendChild(createAnalysisRetryButton(colorScheme));

  // ✅ 安全: 清空内容
  resultDiv.replaceChildren();
  resultDiv.appendChild(errorDiv);
}

function handleAnalysisFailure(
  error: Error,
  resultDiv: HTMLElement | null,
  btn: HTMLButtonElement | null
): void {
  const isValidation = isValidationAnalysisError(error);
  const ux = formatLlmFailureUx(error);
  const panelMessage = createAnalysisUserMessage(
    ux.description ? `${ux.title}。${ux.description}` : ux.title
  );

  if (!isValidation) {
    ErrorService.handle(error, {
      action: 'runLLMAnalysis',
      module: 'keywordHunter',
      notify: false,
    });
  }

  // Always surface actionable toast (settings deep-link when applicable).
  showLlmFailureToast(error);

  if (resultDiv) {
    renderAnalysisError(resultDiv, panelMessage, isValidation);
  }

  // 恢复按钮为可点击（统一为「重新生成」）
  if (btn) setBtnState(btn, 'active', getAnalyzeButtonLabel('active'));
  updateAnalyzeButtonState();
}

function setBtnState(
  btn: HTMLButtonElement,
  state: 'active' | 'disabled' | 'loading' | 'success',
  labelText?: string
): void {
  // 先移除所有状态类
  const allClasses = [
    ...BTN_CLASSES.active,
    ...BTN_CLASSES.disabled,
    ...BTN_CLASSES.loading,
    ...BTN_CLASSES.success,
  ];
  btn.classList.remove(...allClasses);
  btn.disabled = state !== 'active';
  btn.classList.add(...BTN_CLASSES[state]);

  const textEl = document.getElementById('keyword-hunter-analyze-btn-text');
  if (textEl && labelText !== undefined) {
    textEl.textContent = labelText;
  }
}

// ==========================================
// Score Table Highlighting
// ==========================================

interface ScoreRatio {
  score: number;
  max: number;
}

interface ScoreBadgeStyle {
  badgeClass: string;
  rowClass?: string;
}

function setScoreBadge(td: HTMLElement, badgeClass: string, text: string): void {
  // ✅ 安全: 清空内容
  td.replaceChildren();
  const span = document.createElement('span');
  span.className = `score-badge ${badgeClass}`;
  span.textContent = text;
  td.appendChild(span);
}

function parseScoreRatio(rawText: string): ScoreRatio | null {
  const match = rawText.match(/(\d+)\s*\/\s*(\d+)/);
  const scoreText = match?.[1];
  const maxText = match?.[2];
  if (!scoreText || !maxText) return null;

  const score = parseInt(scoreText, 10);
  const max = parseInt(maxText, 10);
  return max === 0 ? null : { score, max };
}

function getScoreBadgeStyle(ratio: number): ScoreBadgeStyle {
  if (ratio >= 0.75) {
    return { badgeClass: 'score-badge-high' };
  }

  if (ratio >= 0.5) {
    return { badgeClass: 'score-badge-mid' };
  }

  return { badgeClass: 'score-badge-low', rowClass: 'row-low' };
}

function isRiskScoreText(rawText: string): boolean {
  return rawText.includes('-10') || rawText.includes('\u{1F6A8}');
}

function isPassingScoreText(rawText: string): boolean {
  return (
    rawText.includes('+0') ||
    rawText.includes('\u2705') ||
    rawText.includes('通过') ||
    rawText === '0'
  );
}

function highlightRatioScore(tr: Element, td: HTMLElement, rawText: string): void {
  const scoreRatio = parseScoreRatio(rawText);
  if (!scoreRatio) return;

  const style = getScoreBadgeStyle(scoreRatio.score / scoreRatio.max);
  if (style.rowClass) {
    tr.classList.add(style.rowClass);
  }

  setScoreBadge(td, style.badgeClass, `${scoreRatio.score}/${scoreRatio.max}`);
}

function highlightScoreRow(tr: Element): void {
  const tds = tr.querySelectorAll('td');
  if (tds.length < 2) return;

  const td2 = tds[1] as HTMLElement; // 分数列
  const rawText = td2.textContent?.trim() ?? '';

  // 清除旧状态类，防止重复调用时污染
  tr.classList.remove('row-total', 'row-low', 'row-risk');

  // 违规触发
  if (isRiskScoreText(rawText)) {
    tr.classList.add('row-risk');
    setScoreBadge(td2, 'score-badge-low', '-10');
    return;
  }

  // 违规通过
  if (isPassingScoreText(rawText)) {
    setScoreBadge(td2, 'score-badge-high', '+0');
    return;
  }

  highlightRatioScore(tr, td2, rawText);
}

type TotalScoreTone = 'excellent' | 'good' | 'warning' | 'critical';

function parseTotalScore(rawText: string): number | null {
  const totalMatch = rawText.match(/(\d{1,3})\s*\/\s*100/);
  const totalText = totalMatch?.[1];
  if (!totalText) return null;

  const total = parseInt(totalText, 10);
  return Number.isNaN(total) ? null : total;
}

function getTotalScoreTone(total: number): TotalScoreTone {
  if (total >= 85) {
    return 'excellent';
  }

  if (total >= 75) {
    return 'good';
  }

  if (total >= 70) {
    return 'warning';
  }

  return 'critical';
}

function getTotalScoreVerdict(total: number): string {
  if (total >= 85) return '优秀';
  if (total >= 75) return '良好';
  if (total >= 70) return '待优化';
  return '高风险';
}

function getScoreTitleLabel(rawTitle: string): string {
  const withoutScore = rawTitle
    .replace(/\d{1,3}\s*\/\s*100/g, '')
    .replace(/[—-]\s*.*/, '')
    .trim();

  return withoutScore || 'Listing 评审';
}

function getScoreVerdict(rawTitle: string, total: number): string {
  const explicitVerdict = rawTitle.match(/[—-]\s*([^|]+)/)?.[1]?.trim();
  return explicitVerdict || getTotalScoreVerdict(total);
}

function getPlainText(element: Element | null): string {
  return (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function getExecutiveSummaryQuote(scoreTitle: Element): HTMLElement | null {
  const firstQuote = scoreTitle.nextElementSibling;
  return firstQuote?.tagName === 'BLOCKQUOTE' ? (firstQuote as HTMLElement) : null;
}

function appendCoverSummary(h2: HTMLHeadingElement, summaryText: string): void {
  h2.classList.toggle('keyword-hunter-report-cover--with-summary', Boolean(summaryText));
  if (!summaryText || h2.querySelector('.keyword-hunter-report-cover-summary')) return;

  const summary = document.createElement('span');
  summary.className = 'keyword-hunter-report-cover-summary';

  const body = document.createElement('span');
  body.className = 'keyword-hunter-report-cover-summary-text';
  body.textContent = summaryText;

  const label = document.createElement('span');
  label.className = 'keyword-hunter-report-cover-summary-label';
  label.textContent = '执行摘要';

  summary.append(body, label);
  h2.appendChild(summary);
}

function enhanceScoreCover(h2: HTMLHeadingElement, total: number, summaryText: string): void {
  h2.classList.add('keyword-hunter-report-cover');
  h2.querySelector('.keyword-hunter-report-cover-eyebrow')?.remove();
  if (h2.querySelector('.keyword-hunter-report-cover-main')) {
    appendCoverSummary(h2, summaryText);
    return;
  }

  const rawTitle = h2.textContent?.trim() ?? '';
  const titleLabel = getScoreTitleLabel(rawTitle);
  const verdict = getScoreVerdict(rawTitle, total);
  h2.setAttribute('aria-label', rawTitle);
  h2.textContent = '';

  const main = document.createElement('span');
  main.className = 'keyword-hunter-report-cover-main';

  const title = document.createElement('span');
  title.className = 'keyword-hunter-report-cover-title';
  title.textContent = titleLabel;

  const meta = document.createElement('span');
  meta.className = 'keyword-hunter-report-cover-meta';
  meta.textContent = `综合评级：${verdict}`;

  main.append(title, meta);

  const score = document.createElement('span');
  score.className = 'keyword-hunter-report-cover-score';
  score.textContent = `${total}/100`;

  h2.append(main, score);
  appendCoverSummary(h2, summaryText);
}

function removeTotalScoreProgressBar(h2: HTMLHeadingElement): void {
  // 移除旧进度条（防止重复追加）
  h2.querySelector('.score-progress-bar')?.remove();
}

function highlightTotalScoreTitle(container: HTMLElement): void {
  const h2 = container.querySelector('h2');
  if (!h2) return;

  const total = parseTotalScore(h2.textContent ?? '');
  if (total === null) return;

  h2.removeAttribute('style');
  h2.classList.remove(
    'keyword-hunter-report-score-title--excellent',
    'keyword-hunter-report-score-title--good',
    'keyword-hunter-report-score-title--warning',
    'keyword-hunter-report-score-title--critical'
  );
  h2.classList.add(
    'keyword-hunter-report-score-title',
    `keyword-hunter-report-score-title--${getTotalScoreTone(total)}`
  );
  removeTotalScoreProgressBar(h2);
}

function isReportSectionHeading(element: Element): element is HTMLHeadingElement {
  return ['H2', 'H3'].includes(element.tagName);
}

function isRecommendationHeading(element: Element): boolean {
  return /Top\s*-?\s*3|改写建议|优化建议|行动建议/i.test(element.textContent ?? '');
}

function getNextElementUntilHeading(element: Element | null): Element | null {
  if (!element || isReportSectionHeading(element)) return null;
  return element;
}

function wrapElement(element: Element, className: string): HTMLElement {
  const parent = element.parentElement;
  if (parent?.classList.contains(className)) return parent;

  const wrapper = document.createElement('div');
  wrapper.className = className;
  element.before(wrapper);
  wrapper.appendChild(element);
  return wrapper;
}

function classifyReportSections(container: HTMLElement): void {
  const headings = Array.from(container.querySelectorAll('h2, h3'));
  headings.slice(1).forEach(heading => {
    const text = heading.textContent ?? '';
    heading.classList.add('keyword-hunter-report-section-heading');

    if (/评分|score/i.test(text)) {
      heading.classList.add('keyword-hunter-report-section-heading--score');
      return;
    }

    if (/致命|风险|问题|risk/i.test(text)) {
      heading.classList.add('keyword-hunter-report-section-heading--risk');
      return;
    }

    if (isRecommendationHeading(heading)) {
      heading.classList.add('keyword-hunter-report-section-heading--recommendations');
    }
  });
}

function enhanceReportSummary(container: HTMLElement): void {
  const scoreTitle = container.querySelector('h2');
  if (!scoreTitle) return;

  const firstQuote = getExecutiveSummaryQuote(scoreTitle);
  if (firstQuote) {
    firstQuote.classList.add('keyword-hunter-report-executive-summary');
    if (scoreTitle.querySelector('.keyword-hunter-report-cover-summary')) {
      firstQuote.classList.add('keyword-hunter-report-executive-summary--merged');
    }
  }
}

function enhanceScoreTable(container: HTMLElement): void {
  const table = container.querySelector('table');
  if (!table) return;

  table.classList.add('keyword-hunter-report-score-table');
  table.setAttribute('aria-label', '评分矩阵');
  wrapElement(table, 'keyword-hunter-report-table-shell');
}

function enhanceRiskSummary(container: HTMLElement): void {
  const riskHeading = Array.from(container.querySelectorAll('h2, h3')).find(heading =>
    /致命|风险|问题|risk/i.test(heading.textContent ?? '')
  );
  const riskQuote = getNextElementUntilHeading(riskHeading?.nextElementSibling ?? null);
  if (riskQuote?.tagName === 'BLOCKQUOTE') {
    riskQuote.classList.add('keyword-hunter-report-risk-summary');
  }
}

function isRecommendationTitle(element: Element): element is HTMLParagraphElement {
  return element.tagName === 'P' && element.querySelector(':scope > strong:first-child') !== null;
}

function classifyRecommendationList(card: HTMLElement): void {
  card.querySelectorAll('li').forEach(item => {
    const text = item.textContent ?? '';
    if (/原句|当前|问题|缺陷/.test(text)) {
      item.classList.add('keyword-hunter-report-recommendation-item--current');
      return;
    }

    if (/改写|建议|优化|替换/.test(text)) {
      item.classList.add('keyword-hunter-report-recommendation-item--proposal');
      return;
    }

    if (/位置|原因|收益|目的|影响/.test(text)) {
      item.classList.add('keyword-hunter-report-recommendation-item--context');
    }
  });
}

function enhanceRecommendationCards(container: HTMLElement): void {
  const recommendationHeading = Array.from(container.querySelectorAll('h2, h3')).find(heading =>
    isRecommendationHeading(heading)
  );
  if (!recommendationHeading) return;

  let current = recommendationHeading.nextElementSibling;
  while (current && !isReportSectionHeading(current)) {
    if (!isRecommendationTitle(current)) {
      current = current.nextElementSibling;
      continue;
    }

    const card = wrapElement(current, 'keyword-hunter-report-recommendation-card');
    card.setAttribute('aria-label', current.textContent?.trim() || '改写建议');

    let next = card.nextElementSibling;
    while (next && !isReportSectionHeading(next) && !isRecommendationTitle(next)) {
      const movable = next;
      next = next.nextElementSibling;
      card.appendChild(movable);
    }

    classifyRecommendationList(card);
    current = next;
  }
}

function enhanceReportStructure(container: HTMLElement): void {
  const scoreTitle = container.querySelector('h2');
  if (!(scoreTitle instanceof HTMLHeadingElement)) return;

  const total = parseTotalScore(scoreTitle.textContent ?? '');
  if (total === null) return;

  container.classList.add('keyword-hunter-report-rendered');
  const summaryText = getPlainText(getExecutiveSummaryQuote(scoreTitle));
  enhanceScoreCover(scoreTitle, total, summaryText);
  classifyReportSections(container);
  enhanceReportSummary(container);
  enhanceScoreTable(container);
  enhanceRiskSummary(container);
  enhanceRecommendationCards(container);
}

/**
 * 增强评分表格和总分标题的视觉呈现。
 *
 * 行分类规则（按内容语义，不依赖行位置）：
 *  1. 包含 -10 或风险提示 → 违规触发行（红色）
 *  2. 包含 +0 / 通过，或以 "0" 结尾 → 违规通过行（绿色）
 *  3. 包含 N/M 数字比 → 按得分率显示彩色徽章
 */
function highlightScores(container: HTMLElement): void {
  if (!container) return;

  // ——— 1. 处理评分表格 ———
  const rows = container.querySelectorAll('tbody tr');
  rows.forEach(tr => highlightScoreRow(tr));

  // ——— 2. 报告结构增强：只在真实评分报告上启用 ———
  enhanceReportStructure(container);

  // ——— 3. 处理总分 H2 标题 ———
  highlightTotalScoreTitle(container);
}

// ==========================================
// Action Functions
// ==========================================

/**
 * 运行 LLM 分析
 * @param options.forceConfirm - 用户主动点「重新生成」时，已有报告需确认清空
 * @param options.autoStart - 来自 SEO「进入分析」自动触发；有报告时不自动覆盖
 * @param options.bypassCache - 用户主动触发时绕过 LLM 缓存，强制发起新的模型调用
 */
async function confirmRegenerateListingReportIfNeeded(
  hasExistingReport: boolean,
  options: { forceConfirm?: boolean; autoStart?: boolean }
): Promise<boolean> {
  if (!hasExistingReport || !(options.forceConfirm || !options.autoStart)) return true;
  const confirmed = await confirmWithModal(
    '重新生成评审报告',
    '将清空当前报告并以最新文案与关键词重新生成 AI 评审。此操作无法撤销。',
    'kh_ignore_regenerate_listing_report',
    '重新生成'
  );
  if (!confirmed) return false;
  rawMarkdownCache = '';
  appStore.getState().updateKeywordTracker({
    llmAnalysisResult: '',
    llmAnalysisModel: '',
  });
  return true;
}

async function runLLMAnalysis(
  options: {
    forceConfirm?: boolean;
    autoStart?: boolean;
    bypassCache?: boolean;
  } = {}
): Promise<void> {
  const processedCopy = getProcessedCopy();
  if (!processedCopy.trim()) {
    showToast('文案内容为空，无法进行 AI 分析', { type: 'warning' });
    return;
  }

  if (activeAnalysisRun?.status === 'pending') {
    attachAnalysisRunToPage(activeAnalysisRun);
    if (isAnalysisRunForCurrentCopy(activeAnalysisRun)) return;
  }

  const hasExistingReport = Boolean(
    rawMarkdownCache.trim() || appStore.getState().keywordTracker?.llmAnalysisResult?.trim()
  );

  // Auto path: only start when there is no report yet (avoid silent overwrite).
  if (options.autoStart && hasExistingReport) {
    updateAnalyzeButtonState();
    return;
  }

  if (!(await confirmRegenerateListingReportIfNeeded(hasExistingReport, options))) return;

  const bypassCache = options.bypassCache === true;
  // 启动反馈统一 toast：测算时间与真实调用同源（callLLM 会注入全局推理等级，故读全局偏好而非硬编码 off 档）
  const userPrefs = getUserReasoningPrefs();
  const singleCallEstimate = estimateSingleCallTime(
    userPrefs.enabled && userPrefs.effort
      ? { enabled: true, effort: userPrefs.effort }
      : { enabled: false, effort: 'low' },
    { toolScale: true }
  );
  showToast(`正在生成评审报告 · ${singleCallEstimate.label}`, { type: 'info' });
  attachAnalysisRunToPage(startAnalysisRun(processedCopy, { bypassCache }));
}

// ==========================================
// Event Listeners Setup
// ==========================================

function setupEventListeners(container: HTMLElement): void {
  if (!container) return;

  const btnAnalyze = document.getElementById('keyword-hunter-analyze-btn');
  if (btnAnalyze) {
    addEventListener(
      btnAnalyze as HTMLElement,
      'click',
      (async () =>
        await runLLMAnalysis({
          forceConfirm: true,
          bypassCache: true,
        })) as EventListenerOrEventListenerObject
    );
  }
}

function handleAnalysisMountError(error: unknown): never {
  ErrorService.handle(error as Error, {
    action: 'mountAnalysisModule',
    module: 'keywordAnalysis',
    notify: false,
  });
  throw error;
}

// ==========================================
// Module Exports (统一架构接口)
// ==========================================

class KeywordHunterAnalysisModule extends BaseModule {
  constructor() {
    super('keyword_hunter_analysis');
    // Module helpers need a stable handle for trackDomEvent/trackTimeout bridges.
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- lifecycle registry, not a closure alias
    analysisLifecycle = this;
  }

  trackDomEvent(
    target: HTMLElement | Document | Window | null,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void {
    (
      this as unknown as {
        addEventListener: (
          target: EventTarget | null,
          type: string,
          listener: EventListenerOrEventListenerObject,
          options?: boolean | AddEventListenerOptions
        ) => void;
      }
    ).addEventListener(target, type, listener, options);
  }

  trackTimeout(callback: () => void, delay: number): number {
    return this.setTimeout(callback, delay);
  }

  protected async render(): Promise<void> {
    const container = this.container;
    if (!container) return;
    const mountSignal = this.getAbortSignal();

    try {
      analysisViewVersion += 1;
      const loader = SafeTemplateLoader.getInstance();
      const renderer = SafeRenderer.getInstance();

      const html = await loader.loadTemplate(
        'src/modules/app_center/views/keyword_hunter/analysis/template.html',
        {
          retryCount: 3,
          timeout: 5000,
          onError: error => {
            ErrorService.handle(error as Error, {
              action: 'loadAnalysisTemplate',
              module: 'keywordAnalysis',
              notify: false,
            });
          },
        }
      );
      if (!this.isCurrentMount(mountSignal)) return;

      container.classList.add('fade-in');
      renderer.renderTemplate(container, html);

      // Workbench section icon — no marketing scale-110 (D4).
      const reportIcon = container.querySelector('.keyword-hunter-analysis-report-icon');
      if (reportIcon) {
        reportIcon.className = `keyword-hunter-analysis-report-icon ${getWorkbenchIconContainerClasses('cyan', 'sm')} text-white`;
      }
    } catch (error) {
      if (!this.isCurrentMount(mountSignal)) return;
      handleAnalysisMountError(error);
    }
  }

  protected async init(): Promise<void> {
    const container = this.container;
    if (!container) return;

    try {
      setupEventListeners(container);
      await restoreAnalysisStateFromState();
      updateAnalyzeButtonState();

      // SEO「进入分析」落地：无报告则自动生成；有报告则只展示，需手动「重新生成」。
      const hasContent = Boolean(getProcessedCopy().trim());
      const hasReport = Boolean(
        rawMarkdownCache.trim() || appStore.getState().keywordTracker?.llmAnalysisResult?.trim()
      );
      const pendingSameCopy =
        activeAnalysisRun?.status === 'pending' && isAnalysisRunForCurrentCopy(activeAnalysisRun);
      const hasPendingRun = activeAnalysisRun?.status === 'pending';

      if (hasContent && !hasReport && !hasPendingRun) {
        void runLLMAnalysis({ autoStart: true });
      } else if (pendingSameCopy && activeAnalysisRun) {
        attachAnalysisRunToPage(activeAnalysisRun);
      }
    } catch (error) {
      handleAnalysisMountError(error);
    }
  }

  protected onUnmount(): void {
    try {
      analysisViewVersion += 1;
      saveAnalysisStateToState();
      // Listeners/timers already disposed by BaseModule.unmount
    } catch (error) {
      ErrorService.handle(error as Error, {
        action: 'unmountAnalysisModule',
        module: 'keywordAnalysis',
        notify: false,
      });
    }
  }
}

const keywordHunterAnalysisModule = new KeywordHunterAnalysisModule();

export const mount = (container: HTMLElement): Promise<void> =>
  keywordHunterAnalysisModule.mount(container);
export const unmount = (): void => {
  keywordHunterAnalysisModule.unmount();
};

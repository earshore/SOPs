/**
 * Process 子模块
 * 负责文案处理、翻译和关键词匹配显示功能
 *
 * 架构说明：
 * - 状态保存到 state.keywordTracker 命名空间
 * - 通过 EventBus 与其他模块通信
 * - 使用模块内事件监听管理交互
 * - 管理浮动关键词窗口的显示和交互
 */

import { SafeModuleLoader } from '../../../../../common/infrastructure/SafeModuleLoader';
import { SafeRenderer } from '../../../../../common/infrastructure/SafeRenderer';
import { showToast } from '../../../../../common/ui';
import * as KeywordService from '../services/trackerService';
import { KeywordHunterSnapshotService } from '../services/snapshotService';
import { appStore } from '../../../../../stores/useAppStore';
import { ErrorService } from '../../../../../services/errorService';
import { createSafeFragment } from '../../../../../common/utils/security';
import type { KeywordHunterSnapshot } from '../../../../../types/modules-business';
import '../keyword_hunter_style.css';

// ==========================================
// Module State
// ==========================================

interface EventListenerRecord {
  element: HTMLElement | Document;
  event: string;
  handler: EventListenerOrEventListenerObject;
}

interface FloatWinState {
  isDragging: boolean;
  offsetX: number;
  offsetY: number;
}

interface KeywordItem {
  keyword: string;
  count: number;
  matched: boolean;
}

interface TranslateButtonState {
  hasContent: boolean;
  hasTranslationData: boolean;
}

interface ActiveTranslationRun {
  processedCopy: string;
  promise: ReturnType<typeof KeywordService.fetchImmersionTranslation>;
  status: 'pending' | 'success' | 'failure';
  error?: Error;
}

interface AnalysisStats {
  total: number;
  matched: number;
  unmatched: number;
  rate: number;
}

interface HighlightSegment {
  text: string;
  keywords: Set<string>;
  isHighlight: boolean;
}

interface HighlightedTranslationParagraph {
  original: string;
  translation: string | null;
}

type KeywordTrackerStoreState = ReturnType<typeof appStore.getState>['keywordTracker'];
type MatchedKeywordEntry = KeywordTrackerStoreState['matchedKeywords'][number] | string;

let eventListeners: EventListenerRecord[] = []; // 用于清理事件监听器
let timeouts: number[] = []; // 用于清理定时器
let floatWinState: FloatWinState = {
  isDragging: false,
  offsetX: 0,
  offsetY: 0,
};
let activeTranslationRun: ActiveTranslationRun | null = null;
let processViewVersion = 0;

// ==========================================
// Helper Functions
// ==========================================

/**
 * 添加事件监听器（带自动清理）
 */
function addEventListener(
  element: HTMLElement | Document,
  event: string,
  handler: EventListenerOrEventListenerObject
): void {
  element.addEventListener(event, handler);
  eventListeners.push({ element, event, handler });
}

/**
 * 添加定时器（带自动清理）
 */
function addTimeout(callback: () => void, delay: number): number {
  const id = window.setTimeout(callback, delay);
  timeouts.push(id);
  return id;
}

/**
 * 清理所有事件监听器和定时器
 */
function cleanup(): void {
  // 清理事件监听器
  eventListeners.forEach(({ element, event, handler }) => {
    element.removeEventListener(event, handler);
  });
  eventListeners = [];

  // 清理定时器
  timeouts.forEach(id => clearTimeout(id));
  timeouts = [];

  // 重置浮动窗口状态
  floatWinState = {
    isDragging: false,
    offsetX: 0,
    offsetY: 0,
  };
}

/**
 * HTML 转义
 */
function escapeHtml(text: string): string {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 属性转义（完善版：覆盖所有 HTML 属性危险字符）
 */
function escapeAttr(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getKeywordSet(sets: Set<string>[], index: number): Set<string> {
  return sets[index] ?? new Set<string>();
}

function getDefaultProcessKeywordTrackerState(): KeywordTrackerStoreState {
  return {
    keywords: [],
    processedCopy: '',
    formattedCopy: '',
    matchedKeywords: [],
    unmatchedKeywords: [],
    wordFrequency: [],
    paragraphs: [],
    translationMode: false,
    keywordLocationIndex: {},
    settings: {
      matchPlural: true,
      matchStem: true,
      matchCase: false,
      matchPartial: false,
    },
    isWindowMinimized: false,
  };
}

function ensureKeywordTrackerState(): KeywordTrackerStoreState {
  const currentState = appStore.getState();
  if (!currentState.keywordTracker) {
    currentState.updateKeywordTracker(getDefaultProcessKeywordTrackerState());
  }

  return appStore.getState().keywordTracker;
}

function getLatestSnapshotForProcess(
  snapshots: KeywordHunterSnapshot[]
): KeywordHunterSnapshot | undefined {
  return snapshots.find(
    snapshot =>
      (snapshot.status === 'matched' || snapshot.status === 'reported') &&
      !!(snapshot.result.processedCopy || snapshot.input.copyInputText).trim()
  );
}

async function restoreLatestProcessSnapshotIfNeeded(): Promise<void> {
  const tracker = ensureKeywordTrackerState();
  if (tracker.processedCopy?.trim()) {
    return;
  }

  try {
    const snapshot = getLatestSnapshotForProcess(await KeywordHunterSnapshotService.getAllAsync());
    if (snapshot) {
      KeywordHunterSnapshotService.restore(snapshot);
    }
  } catch (error) {
    ErrorService.handle(error as Error, {
      action: 'restoreLatestProcessSnapshot',
      module: 'keywordTracker',
      notify: false,
    });
  }
}

function getProcessCopyTextFromDisplay(): string {
  const tracker = ensureKeywordTrackerState();
  if (tracker.translationMode && tracker.paragraphs.length > 0) {
    return tracker.processedCopy || getOriginalTextFromTranslationParagraphs(tracker);
  }

  const displayEl = document.getElementById('kt-copy-display');
  return displayEl ? displayEl.innerText : '';
}

function getOriginalTextFromTranslationParagraphs(tracker: KeywordTrackerStoreState): string {
  return tracker.paragraphs
    .map(paragraph =>
      typeof paragraph === 'object' && 'original' in paragraph ? paragraph.original : paragraph
    )
    .filter(text => text && text.trim())
    .join('\n');
}

function saveProcessCopyText(copyText: string): void {
  const tracker = ensureKeywordTrackerState();
  const changed = copyText !== tracker.processedCopy;
  const metrics = KeywordService.computeKeywordTrackerMetrics(
    copyText,
    tracker.keywords,
    tracker.settings
  );

  appStore.getState().updateKeywordTracker({
    processedCopy: copyText,
    copyInputText: copyText,
    matchedKeywords: metrics.matchedKeywords,
    unmatchedKeywords: metrics.unmatchedKeywords,
    wordFrequency: metrics.wordFrequency,
    keywordLocationIndex: {},
    ...(changed
      ? {
          llmAnalysisResult: '',
          paragraphs: [],
          translationMode: false,
          currentSnapshotId: null,
        }
      : {}),
  });
}

// ==========================================
// State Management
// ==========================================

/**
 * 保存处理状态到 state
 */
function saveProcessStateToState(): void {
  ensureKeywordTrackerState();

  const copyText = getProcessCopyTextFromDisplay();
  if (copyText.trim()) {
    saveProcessCopyText(copyText);
  }

  // 保存翻译显示状态
  const showTransCheckbox = document.getElementById(
    'kt-show-translation'
  ) as HTMLInputElement | null;
  if (showTransCheckbox) {
    appStore.getState().updateKeywordTracker({ showTranslation: showTransCheckbox.checked });
  }
}

/**
 * 从 state 恢复处理状态
 */
async function restoreProcessStateFromState(): Promise<void> {
  await restoreLatestProcessSnapshotIfNeeded();

  // 恢复翻译显示状态
  const showTransCheckbox = document.getElementById(
    'kt-show-translation'
  ) as HTMLInputElement | null;
  const currentState = appStore.getState();
  if (showTransCheckbox && currentState.keywordTracker) {
    if (currentState.keywordTracker.showTranslation !== undefined) {
      showTransCheckbox.checked = currentState.keywordTracker.showTranslation;
    }

    // 根据是否有翻译数据启用/禁用复选框
    const hasTranslationData =
      appStore.getState().keywordTracker.paragraphs &&
      appStore.getState().keywordTracker.paragraphs.length > 0;
    showTransCheckbox.disabled = !hasTranslationData;
  }

  // 渲染处理模块
  renderProcessModule();
  if (activeTranslationRun?.status === 'pending') {
    attachTranslationRunToPage(activeTranslationRun);
  }
}

// ==========================================
// UI Rendering Functions
// ==========================================

/**
 * 渲染处理模块
 */
function renderProcessModule(): void {
  updateTranslateButton();
  renderCopyDisplay();
  renderFloatingKeywords();
  updateMinimizedBadge();
  renderAnalysisStats(); // 新增：渲染统计数据
}

/**
 * 渲染分析统计数据（从 analysis 模块移动过来）
 */
function renderAnalysisStats(): void {
  const tracker = ensureKeywordTrackerState();
  const stats = getAnalysisStats(tracker);
  renderCoverageStats(stats);
  renderWordFrequencyStats(tracker);
}

function getAnalysisStats(tracker: KeywordTrackerStoreState): AnalysisStats {
  const total = tracker.keywords ? tracker.keywords.length : 0;
  const matched = tracker.matchedKeywords ? tracker.matchedKeywords.length : 0;
  const unmatched = tracker.unmatchedKeywords ? tracker.unmatchedKeywords.length : 0;
  const rate = total === 0 ? 0 : Math.round((matched / total) * 100);

  return { total, matched, unmatched, rate };
}

function renderCoverageStats(stats: AnalysisStats): void {
  // 更新覆盖率
  const rateEl = document.getElementById('kt-coverage-rate');
  if (rateEl) rateEl.textContent = stats.rate + '%';

  const barEl = document.getElementById('kt-coverage-bar') as HTMLElement | null;
  if (barEl) barEl.style.width = stats.rate + '%';

  // 更新统计数据
  const matchedEl = document.getElementById('kt-stat-matched');
  if (matchedEl) matchedEl.textContent = stats.matched.toString();

  const unmatchedEl = document.getElementById('kt-stat-unmatched');
  if (unmatchedEl) unmatchedEl.textContent = stats.unmatched.toString();

  const totalEl = document.getElementById('kt-stat-total');
  if (totalEl) totalEl.textContent = stats.total.toString();
}

function renderWordFrequencyStats(tracker: KeywordTrackerStoreState): void {
  const freqList = document.getElementById('kt-word-frequency-list');
  if (!freqList || !tracker.wordFrequency) return;

  const matchedKeywordRoots = collectMatchedKeywordRoots(tracker.matchedKeywords);
  const unmatchedKeywordRoots = collectUnmatchedKeywordRoots(tracker);

  freqList.replaceChildren();
  renderWordCloud(freqList, tracker.wordFrequency, matchedKeywordRoots);
  renderUnmatchedRootSection(freqList, unmatchedKeywordRoots);
}

function collectMatchedKeywordRoots(matchedKeywords: readonly MatchedKeywordEntry[]): Set<string> {
  const roots = new Set<string>();
  matchedKeywords.forEach(item => {
    addKeywordRoots(roots, getMatchedKeywordText(item));
  });
  return roots;
}

function collectUnmatchedKeywordRoots(tracker: KeywordTrackerStoreState): Set<string> {
  const roots = new Set<string>();
  const highFreqWordsSet = new Set(tracker.wordFrequency.map(([word]) => word.toLowerCase()));

  tracker.unmatchedKeywords.forEach(keyword => {
    addKeywordRoots(roots, keyword, highFreqWordsSet);
  });

  return roots;
}

function getMatchedKeywordText(item: MatchedKeywordEntry): string {
  return typeof item === 'object' ? item.keyword : item;
}

function addKeywordRoots(roots: Set<string>, keyword: string, excludedRoots?: Set<string>): void {
  if (!keyword) return;

  const words = keyword.toLowerCase().match(/[\p{L}\p{M}]+/gu) || [];
  words.forEach((word: string) => {
    if (word.length > 2 && !excludedRoots?.has(word)) {
      roots.add(word);
    }
  });
}

function renderWordCloud(
  freqList: HTMLElement,
  wordFrequency: Array<[string, number]>,
  matchedKeywordRoots: Set<string>
): void {
  const wordCloudDiv = document.createElement('div');
  wordCloudDiv.className = 'flex flex-wrap gap-3';
  const wordFragment = document.createDocumentFragment();

  wordFrequency.forEach(([word, count]) => {
    wordFragment.appendChild(
      createWordFrequencySpan(word, count, matchedKeywordRoots.has(word.toLowerCase()))
    );
  });

  wordCloudDiv.appendChild(wordFragment);
  freqList.appendChild(wordCloudDiv);
}

function createWordFrequencySpan(word: string, count: number, isMatched: boolean): HTMLElement {
  const span = document.createElement('span');
  const countSpan = document.createElement('span');
  countSpan.textContent = `(${count})`;

  if (isMatched) {
    span.className =
      'px-2 py-1 bg-green-100 text-green-700 text-xs rounded-md flex items-center gap-1';
    const checkIcon = document.createElement('i');
    checkIcon.className = 'fa-solid fa-check text-[10px]';
    checkIcon.setAttribute('aria-hidden', 'true');
    span.appendChild(checkIcon);
    span.appendChild(document.createTextNode(` ${word} `));
    countSpan.className = 'opacity-60';
    span.appendChild(countSpan);
    return span;
  }

  span.className = 'px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md';
  span.textContent = `${word} `;
  countSpan.className = 'text-slate-400';
  span.appendChild(countSpan);
  return span;
}

function renderUnmatchedRootSection(
  freqList: HTMLElement,
  unmatchedKeywordRoots: Set<string>
): void {
  if (unmatchedKeywordRoots.size === 0) {
    return;
  }

  const unmatchedRootsArray = Array.from(unmatchedKeywordRoots).sort();

  const unmatchedSection = document.createElement('div');
  unmatchedSection.className = 'mt-4 pt-4 border-t border-slate-200';
  unmatchedSection.appendChild(createUnmatchedRootsHeader(unmatchedRootsArray.length));
  unmatchedSection.appendChild(createUnmatchedRootsContainer(unmatchedRootsArray));
  freqList.appendChild(unmatchedSection);
}

function createUnmatchedRootsHeader(rootCount: number): HTMLElement {
  const header = document.createElement('div');
  header.className = 'text-xs text-slate-500 mb-2 font-medium flex items-center gap-2';
  const icon = document.createElement('i');
  icon.className = 'fas fa-exclamation-triangle text-red-500';
  header.appendChild(icon);
  const headerText = document.createElement('span');
  headerText.textContent = `未在文案中出现的关键词词根 (${rootCount})`;
  header.appendChild(headerText);
  return header;
}

function createUnmatchedRootsContainer(roots: string[]): HTMLElement {
  const rootsContainer = document.createElement('div');
  rootsContainer.className = 'flex flex-wrap gap-2';
  const rootsFragment = document.createDocumentFragment();

  roots.forEach((root: string) => {
    rootsFragment.appendChild(createUnmatchedRootTag(root));
  });

  rootsContainer.appendChild(rootsFragment);
  return rootsContainer;
}

function createUnmatchedRootTag(root: string): HTMLElement {
  const span = document.createElement('span');
  span.className =
    'px-2 py-1 bg-red-100 text-red-700 text-xs rounded-md inline-flex items-center gap-1 cursor-pointer hover:bg-red-200 transition-colors';
  span.title = '点击在关键词监控中定位';
  span.addEventListener('click', () => locateUnmatchedRootInList(root));

  const icon = document.createElement('i');
  icon.className = 'fa-solid fa-xmark text-[10px]';
  icon.setAttribute('aria-hidden', 'true');
  span.appendChild(icon);

  const text = document.createElement('span');
  text.textContent = root;
  span.appendChild(text);

  return span;
}

/**
 * 更新翻译按钮状态
 */
function updateTranslateButton(): void {
  const transBtn = document.getElementById('kt-translate-btn') as HTMLButtonElement | null;
  const transBtnText = document.getElementById('kt-translate-btn-text');
  const transCheckbox = document.getElementById('kt-show-translation') as HTMLInputElement | null;

  const hasContent = hasProcessedCopy();
  const hasTranslationData = hasTranslationParagraphs();

  // A. 翻译按钮
  if (transBtn && transBtnText) {
    updateTranslateActionButton(transBtn, transBtnText, {
      hasContent,
      hasTranslationData,
    });
  }

  // B. 复选框
  if (transCheckbox) {
    updateTranslationCheckbox(transCheckbox, hasTranslationData);
  }
}

function hasProcessedCopy(): boolean {
  const processedCopy = appStore.getState().keywordTracker.processedCopy;
  return !!processedCopy && processedCopy.trim().length > 0;
}

function getProcessedCopy(): string {
  return appStore.getState().keywordTracker.processedCopy || '';
}

function hasTranslationParagraphs(): boolean {
  return appStore.getState().keywordTracker.paragraphs.length > 0;
}

function updateTranslateActionButton(
  transBtn: HTMLButtonElement,
  transBtnText: HTMLElement,
  state: TranslateButtonState
): void {
  if (state.hasContent && !state.hasTranslationData) {
    transBtn.disabled = false;
    transBtnText.textContent = 'AI 沉浸式翻译';
    transBtn.classList.remove('kt-btn-disabled');
    transBtn.classList.add('kt-btn-active');
    return;
  }

  transBtn.disabled = true;
  transBtnText.textContent = state.hasTranslationData ? '翻译已完成' : 'AI 沉浸式翻译';
  transBtn.classList.add('kt-btn-disabled');
  transBtn.classList.remove('kt-btn-active');
}

function getTranslationElements(): {
  btn: HTMLButtonElement | null;
  progress: HTMLElement | null;
  text: HTMLElement | null;
} {
  return {
    btn: document.getElementById('kt-translate-btn') as HTMLButtonElement | null,
    progress: document.getElementById('kt-translate-progress'),
    text: document.getElementById('kt-translate-btn-text'),
  };
}

function renderTranslationPendingState(): void {
  const { btn, progress, text } = getTranslationElements();

  if (btn) {
    btn.disabled = true;
    btn.classList.add('kt-btn-disabled');
    btn.classList.remove('kt-btn-active');
  }
  if (progress) {
    progress.classList.remove('hidden');
    progress.style.width = '30%';
  }
  if (text) {
    text.textContent = '正在翻译...';
  }
}

function renderTranslationCompletedState(): void {
  const { progress } = getTranslationElements();
  if (progress) {
    progress.style.width = '100%';
    addTimeout(() => progress.classList.add('hidden'), 500);
  }
}

function renderTranslationFailureState(): void {
  const { btn, progress, text } = getTranslationElements();

  if (progress) {
    progress.classList.add('hidden');
  }
  if (text) {
    text.textContent = 'AI 沉浸式翻译';
  }
  if (btn) {
    btn.disabled = false;
    btn.classList.remove('kt-btn-disabled');
    btn.classList.add('kt-btn-active');
  }
}

function updateTranslationCheckbox(
  transCheckbox: HTMLInputElement,
  hasTranslationData: boolean
): void {
  if (!hasTranslationData) {
    transCheckbox.disabled = true;
    transCheckbox.checked = false;
    return;
  }

  transCheckbox.disabled = false;
  if (appStore.getState().keywordTracker.translationMode) {
    transCheckbox.checked = true;
  }
}

/**
 * 渲染文案显示区域
 */
function renderCopyDisplay(): void {
  const display = document.getElementById('kt-copy-display');
  if (!display) return;

  const showTrans = (document.getElementById('kt-show-translation') as HTMLInputElement | null)
    ?.checked;
  const tracker = appStore.getState().keywordTracker;

  if (shouldRenderTranslationParagraphs(tracker)) {
    renderTranslationParagraphs(display, getHighlightedTranslationParagraphs(tracker, showTrans));
    return;
  }

  renderProcessedCopy(display, tracker.processedCopy);
}

function shouldRenderTranslationParagraphs(tracker: KeywordTrackerStoreState): boolean {
  return Boolean(tracker.translationMode && tracker.paragraphs && tracker.paragraphs.length > 0);
}

function getHighlightedTranslationParagraphs(
  tracker: KeywordTrackerStoreState,
  showTranslation: boolean | undefined
): HighlightedTranslationParagraph[] {
  return (tracker.paragraphs || [])
    .filter(p => typeof p === 'object' && 'original' in p)
    .map(p => ({
      original: highlightText(p.original),
      translation: showTranslation && p.translation ? p.translation : null,
    }));
}

function appendSafeHighlightedHtml(container: HTMLElement, html: string): void {
  const tempDiv = document.createElement('div');
  tempDiv.appendChild(createSafeFragment(html));
  while (tempDiv.firstChild) {
    container.appendChild(tempDiv.firstChild);
  }
}

function createTranslationParagraphElement(para: HighlightedTranslationParagraph): HTMLElement {
  const div = document.createElement('div');
  div.className = 'mb-4';

  const originalDiv = document.createElement('div');
  originalDiv.className = 'paragraph-original leading-relaxed';
  // ✅ 安全: para.original来自highlightText()，文本已escapeHtml且属性已escapeAttr
  appendSafeHighlightedHtml(originalDiv, para.original);
  div.appendChild(originalDiv);

  if (para.translation) {
    const transDiv = document.createElement('div');
    transDiv.className = 'sentence-translation';
    transDiv.textContent = para.translation;
    div.appendChild(transDiv);
  }

  return div;
}

function renderTranslationParagraphs(
  display: HTMLElement,
  paragraphs: HighlightedTranslationParagraph[]
): void {
  display.replaceChildren();
  const fragment = document.createDocumentFragment();
  paragraphs.forEach(para => {
    fragment.appendChild(createTranslationParagraphElement(para));
  });
  display.appendChild(fragment);
}

function renderProcessedCopy(display: HTMLElement, processedCopy: string): void {
  if (processedCopy) {
    const renderer = SafeRenderer.getInstance();
    renderer.renderTemplate(display, highlightText(processedCopy));
    return;
  }

  display.replaceChildren();
}

/**
 * 高亮文本中的关键词
 */
function highlightText(text: string): string {
  if (!text) return '';
  const tracker = appStore.getState().keywordTracker;

  if (!tracker.matchedKeywords || tracker.matchedKeywords.length === 0) {
    return renderPlainHighlightedText(text);
  }

  const charKeywords = buildCharacterKeywordMap(text, tracker);
  const segments = createHighlightSegments(text, charKeywords);
  return renderHighlightSegments(segments);
}

function renderPlainHighlightedText(text: string): string {
  return escapeHtml(text).replace(/\n/g, '<br>');
}

function buildEmptyCharacterKeywordMap(length: number): Set<string>[] {
  const charKeywords: Set<string>[] = [];
  for (let i = 0; i < length; i++) {
    charKeywords[i] = new Set();
  }
  return charKeywords;
}

function addKeywordRanges(
  charKeywords: Set<string>[],
  text: string,
  tracker: KeywordTrackerStoreState,
  keyword: string
): void {
  const kwLower = keyword.toLowerCase();
  const ranges = KeywordService.findKeywordMatchRanges(text, keyword, tracker.settings);

  ranges.forEach(({ start, end }) => {
    for (let i = start; i < end; i++) {
      charKeywords[i]?.add(kwLower);
    }
  });
}

function buildCharacterKeywordMap(text: string, tracker: KeywordTrackerStoreState): Set<string>[] {
  const charKeywords = buildEmptyCharacterKeywordMap(text.length);

  tracker.matchedKeywords.forEach(item => {
    addKeywordRanges(charKeywords, text, tracker, item.keyword);
  });

  return charKeywords;
}

function createHighlightSegment(
  text: string,
  start: number,
  end: number,
  keywords: Set<string>
): HighlightSegment {
  return {
    text: text.substring(start, end),
    keywords,
    isHighlight: keywords.size > 0,
  };
}

function createHighlightSegments(text: string, charKeywords: Set<string>[]): HighlightSegment[] {
  const segments: HighlightSegment[] = [];
  let segStart = 0;

  for (let i = 1; i <= text.length; i++) {
    const previousKeywords = getKeywordSet(charKeywords, i - 1);
    if (i === text.length || !setsEqual(getKeywordSet(charKeywords, i), previousKeywords)) {
      segments.push(
        createHighlightSegment(text, segStart, i, getKeywordSet(charKeywords, segStart))
      );
      segStart = i;
    }
  }

  return segments;
}

function getHighlightPositionClass(segments: HighlightSegment[], index: number): string {
  const prevIsHighlight = index > 0 && !!segments[index - 1]?.isHighlight;
  const nextIsHighlight = index < segments.length - 1 && !!segments[index + 1]?.isHighlight;

  if (!prevIsHighlight && !nextIsHighlight) {
    return 'kw-solo';
  }

  if (!prevIsHighlight && nextIsHighlight) {
    return 'kw-start';
  }

  if (prevIsHighlight && nextIsHighlight) {
    return 'kw-mid';
  }

  return 'kw-end';
}

function renderHighlightSegment(
  segment: HighlightSegment,
  segments: HighlightSegment[],
  index: number
): string {
  if (!segment.isHighlight) {
    return escapeHtml(segment.text);
  }

  const allKeywords = Array.from(segment.keywords).join('\x01');
  const positionClass = getHighlightPositionClass(segments, index);

  return `<span class="keyword-bold highlightable ${positionClass}" data-kw-all="${escapeAttr(allKeywords)}">${escapeHtml(segment.text)}</span>`;
}

function renderHighlightSegments(segments: HighlightSegment[]): string {
  return segments
    .map((segment, index) => renderHighlightSegment(segment, segments, index))
    .join('')
    .replace(/\n/g, '<br>');
}

/**
 * 判断两个 Set 是否相等
 */
function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}

/**
 * 渲染浮动关键词窗口（统一展示已匹配和未匹配）
 */
function renderFloatingKeywords(): void {
  const allContainer = document.getElementById('kt-all-keywords');

  if (!allContainer) return;

  const allKeywords = getFloatingKeywordItems();
  renderFloatingKeywordItems(allContainer, allKeywords);
  updateFloatingKeywordCounts();
}

function getFloatingKeywordItems(): KeywordItem[] {
  const tracker = appStore.getState().keywordTracker;
  const matchedItems = tracker.matchedKeywords.map(item => ({
    keyword: item.keyword,
    count: item.count,
    matched: true,
  }));
  const unmatchedItems = tracker.unmatchedKeywords.map(kw => ({
    keyword: kw,
    count: 0,
    matched: false,
  }));

  return [...matchedItems, ...unmatchedItems];
}

function renderFloatingKeywordItems(allContainer: HTMLElement, allKeywords: KeywordItem[]): void {
  allContainer.replaceChildren();

  if (allKeywords.length > 0) {
    const fragment = document.createDocumentFragment();
    allKeywords.forEach(item => {
      fragment.appendChild(createFloatingKeywordElement(item));
    });
    allContainer.appendChild(fragment);
    return;
  }

  allContainer.appendChild(createEmptyKeywordsElement());
}

function createFloatingKeywordElement(item: KeywordItem): HTMLElement {
  return item.matched ? createMatchedKeywordElement(item) : createUnmatchedKeywordElement(item);
}

function createMatchedKeywordElement(item: KeywordItem): HTMLElement {
  const div = document.createElement('div');
  div.className =
    'keyword-item keyword-status-item keyword-status-item--matched bg-green-50 rounded p-2 flex justify-between items-center cursor-pointer hover:bg-green-100 transition-colors shadow-sm';
  div.dataset.keyword = item.keyword.toLowerCase();
  div.addEventListener('click', () => locateKeywordInCopy(item.keyword));

  const span = document.createElement('span');
  span.className = 'text-sm text-green-800 font-medium flex items-center gap-2';
  const icon = document.createElement('i');
  icon.className = 'fas fa-check-circle text-green-600';
  span.appendChild(icon);
  span.appendChild(document.createTextNode(item.keyword));

  const badge = document.createElement('span');
  badge.className = 'text-xs bg-green-600 text-white px-2 py-0.5 rounded-full font-semibold';
  badge.textContent = item.count.toString();

  div.appendChild(span);
  div.appendChild(badge);
  return div;
}

function createUnmatchedKeywordElement(item: KeywordItem): HTMLElement {
  const div = document.createElement('div');
  div.className =
    'keyword-item keyword-status-item keyword-status-item--unmatched keyword-unmatched bg-red-50 rounded p-2 flex items-center gap-2 shadow-sm';
  div.dataset.keyword = item.keyword.toLowerCase();

  const icon = document.createElement('i');
  icon.className = 'fas fa-times-circle text-red-600';

  const span = document.createElement('span');
  span.className = 'text-sm text-red-800 font-medium';
  span.textContent = item.keyword;

  div.appendChild(icon);
  div.appendChild(span);
  return div;
}

function createEmptyKeywordsElement(): HTMLElement {
  const emptyDiv = document.createElement('div');
  emptyDiv.className = 'text-center text-slate-400 py-8';
  const icon = document.createElement('i');
  icon.className = 'fas fa-inbox text-3xl mb-2';
  const text = document.createElement('p');
  text.className = 'text-sm';
  text.textContent = '暂无关键词数据';
  emptyDiv.appendChild(icon);
  emptyDiv.appendChild(text);
  return emptyDiv;
}

function updateFloatingKeywordCounts(): void {
  const matchedCount = document.getElementById('kt-tab-matched-count');
  const tracker = appStore.getState().keywordTracker;
  if (matchedCount) {
    matchedCount.textContent = tracker.matchedKeywords.length.toString();
  }

  const unmatchedCount = document.getElementById('kt-tab-unmatched-count');
  if (unmatchedCount) {
    unmatchedCount.textContent = tracker.unmatchedKeywords.length.toString();
  }
}

/**
 * 更新最小化徽章
 */
function updateMinimizedBadge(): void {
  const badge = document.getElementById('kt-minimized-badge');
  if (badge) {
    const tracker = appStore.getState().keywordTracker;
    const totalKeywords =
      (tracker.matchedKeywords?.length || 0) + (tracker.unmatchedKeywords?.length || 0);
    badge.textContent = totalKeywords.toString();
  }
}

// ==========================================
// Action Functions
// ==========================================

/**
 * 同步到输入模块
 */
async function syncToInput(): Promise<void> {
  let text = '';

  // 如果是翻译模式，只提取原文
  if (
    appStore.getState().keywordTracker.translationMode &&
    appStore.getState().keywordTracker.paragraphs &&
    appStore.getState().keywordTracker.paragraphs.length > 0
  ) {
    // 从 paragraphs 中提取所有原文
    text = appStore
      .getState()
      .keywordTracker.paragraphs.map(p =>
        typeof p === 'object' && 'original' in p ? p.original : p
      )
      .filter(t => t && t.trim())
      .join('\n');
  } else {
    // 普通模式：直接获取显示区域的文本
    const display = document.getElementById('kt-copy-display');
    text = display ? display.innerText : '';
  }

  // 保存到 state
  if (text && text.trim()) {
    saveProcessCopyText(text);
  } else {
    showToast('没有可同步的内容', { type: 'warning' });
    return;
  }

  showToast('已同步原文到输入模块');

  // 切换到输入模块
  await window.navigateTo('/app-center/keyword-hunter/input');
}

async function goToAnalysis(): Promise<void> {
  saveProcessStateToState();

  const processedCopy = appStore.getState().keywordTracker.processedCopy;
  if (!processedCopy || !processedCopy.trim()) {
    showToast('没有可分析的文案', { type: 'warning' });
    return;
  }

  await window.navigateTo('/app-center/keyword-hunter/analysis');
}

function getError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function isTranslationRunForCurrentCopy(run: ActiveTranslationRun): boolean {
  return getProcessedCopy() === run.processedCopy;
}

function finalizeTranslationSuccess(
  run: ActiveTranslationRun,
  pairs: Awaited<ReturnType<typeof KeywordService.fetchImmersionTranslation>>
): Awaited<ReturnType<typeof KeywordService.fetchImmersionTranslation>> {
  run.status = 'success';
  if (!isTranslationRunForCurrentCopy(run)) {
    return pairs;
  }

  appStore.getState().updateKeywordTracker({
    paragraphs: pairs,
    translationMode: true,
    showTranslation: true,
  });
  void persistTranslationSnapshot();
  return pairs;
}

async function persistTranslationSnapshot(): Promise<void> {
  try {
    await KeywordHunterSnapshotService.saveCurrentAsync();
  } catch (error) {
    ErrorService.handle(getError(error), {
      action: 'saveTranslationSnapshot',
      module: 'keywordTracker',
      notify: false,
    });
    const message = error instanceof Error ? error.message : '保存快照失败';
    showToast(`译文已生成，但历史快照自动保存失败：${message}`, {
      type: 'warning',
    });
  }
}

function finalizeTranslationFailure(run: ActiveTranslationRun, error: unknown): never {
  const normalizedError = getError(error);
  run.status = 'failure';
  run.error = normalizedError;
  throw normalizedError;
}

function startTranslationRun(processedCopy: string): ActiveTranslationRun {
  const run: ActiveTranslationRun = {
    processedCopy,
    promise: Promise.resolve([]),
    status: 'pending',
  };

  run.promise = KeywordService.fetchImmersionTranslation(processedCopy)
    .then(pairs => finalizeTranslationSuccess(run, pairs))
    .catch(error => finalizeTranslationFailure(run, error))
    .finally(() => {
      if (activeTranslationRun === run) {
        activeTranslationRun = null;
      }
    });

  activeTranslationRun = run;
  return run;
}

function attachTranslationRunToPage(run: ActiveTranslationRun): boolean {
  if (!isTranslationRunForCurrentCopy(run)) {
    return false;
  }

  const viewVersion = processViewVersion;
  renderTranslationPendingState();

  run.promise
    .then(() => {
      if (viewVersion !== processViewVersion || !isTranslationRunForCurrentCopy(run)) return;
      renderProcessModule();
      renderTranslationCompletedState();
    })
    .catch(error => {
      if (viewVersion !== processViewVersion || !isTranslationRunForCurrentCopy(run)) return;
      ErrorService.handle(getError(error), {
        action: 'translateCopyImmersive',
        module: 'keywordTracker',
      });
      renderTranslationFailureState();
    });

  return true;
}

/**
 * AI 沉浸式翻译
 */
async function translateCopyImmersive(): Promise<void> {
  const processedCopy = getProcessedCopy();

  if (activeTranslationRun?.status === 'pending') {
    if (attachTranslationRunToPage(activeTranslationRun)) {
      return;
    }
  }

  attachTranslationRunToPage(startTranslationRun(processedCopy));
}

/**
 * 定位关键词在文案中的位置
 */
function locateKeywordInCopy(keyword: string): void {
  const container = document.getElementById('kt-copy-display');
  if (!container) return;

  const targetKw = keyword.toLowerCase();
  const spans = findKeywordHighlightSpans(container, targetKw);

  if (spans.length === 0) {
    showToast(`未找到关键词: ${keyword}`, { type: 'warning' });
    return;
  }

  const groups = groupAdjacentHighlightSpans(spans);
  const idx = getKeywordLocationIndex(targetKw, groups.length);
  clearKeywordFocus(container);

  // 聚焦当前组的所有 span
  const targetGroup = groups[idx];
  if (!targetGroup) return;
  focusKeywordGroup(targetGroup);
  scrollToKeywordGroup(targetGroup);

  // 更新索引
  updateKeywordLocationIndex(targetKw, idx, groups.length);
  showToast(`定位: ${keyword} (${idx + 1}/${groups.length})`);
}

function findKeywordHighlightSpans(container: HTMLElement, targetKw: string): Element[] {
  const separator = '\x01';
  return Array.from(container.querySelectorAll('.highlightable')).filter(el => {
    const kwAll = el.getAttribute('data-kw-all');
    if (!kwAll) return false;
    return kwAll.split(separator).includes(targetKw);
  });
}

function groupAdjacentHighlightSpans(spans: Element[]): Element[][] {
  const firstSpan = spans[0];
  if (!firstSpan) return [];

  const groups: Element[][] = [];
  let currentGroup = [firstSpan];

  for (let i = 1; i < spans.length; i++) {
    const prev = spans[i - 1];
    const curr = spans[i];
    if (!prev || !curr) continue;
    if (prev.nextSibling === curr) {
      currentGroup.push(curr);
      continue;
    }

    groups.push(currentGroup);
    currentGroup = [curr];
  }

  groups.push(currentGroup);
  return groups;
}

function getKeywordLocationIndex(targetKw: string, groupCount: number): number {
  const tracker = appStore.getState().keywordTracker;
  if (!tracker.keywordLocationIndex) {
    appStore.getState().updateKeywordTracker({ keywordLocationIndex: {} });
  }

  const rawIndex = appStore.getState().keywordTracker.keywordLocationIndex[targetKw];
  const idx = typeof rawIndex === 'number' ? rawIndex : 0;
  return idx >= groupCount ? 0 : idx;
}

function clearKeywordFocus(container: HTMLElement): void {
  container
    .querySelectorAll('.highlight-focus')
    .forEach(el => el.classList.remove('highlight-focus'));
}

function focusKeywordGroup(targetGroup: Element[]): void {
  targetGroup.forEach((span: Element) => {
    span.classList.add('highlight-focus');
  });
}

function scrollToKeywordGroup(targetGroup: Element[]): void {
  const targetElement = targetGroup[0];
  if (targetElement instanceof HTMLElement) {
    targetElement.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }
}

function updateKeywordLocationIndex(targetKw: string, idx: number, groupCount: number): void {
  const keywordLocationIndex = appStore.getState().keywordTracker.keywordLocationIndex || {};
  appStore.getState().updateKeywordTracker({
    keywordLocationIndex: {
      ...keywordLocationIndex,
      [targetKw]: (idx + 1) % groupCount,
    },
  });
}

/**
 * 定位未匹配词根在关键词监控列表中的位置
 * 点击词根后，在浮动窗口中高亮显示所有包含该词根的未匹配关键词
 */
function locateUnmatchedRootInList(root: string): void {
  const floatWin = document.getElementById('kt-keywords-floating');
  const allKeywordsContainer = document.getElementById('kt-all-keywords');

  if (!allKeywordsContainer) {
    return;
  }

  // 确保浮动窗口可见
  if (!floatWin || !floatWin.classList.contains('show')) {
    restoreKeywordsWindow();
    // 等待窗口显示动画完成
    addTimeout(() => highlightRootKeywords(root, allKeywordsContainer), 300);
  } else {
    highlightRootKeywords(root, allKeywordsContainer);
  }
}

/**
 * 高亮包含指定词根的关键词
 */
function highlightRootKeywords(root: string, container: HTMLElement): void {
  // 移除之前的高亮
  const previousHighlights = container.querySelectorAll('.keyword-root-highlight');
  previousHighlights.forEach(el => el.classList.remove('keyword-root-highlight'));

  const rootLower = root.toLowerCase();

  // 查找所有未匹配的关键词元素
  const unmatchedKeywordDivs = container.querySelectorAll('.keyword-unmatched');

  const matchedDivs: Element[] = [];

  unmatchedKeywordDivs.forEach(div => {
    const keyword = div.getAttribute('data-keyword');

    if (!keyword) {
      return;
    }

    // 将关键词拆分为单词进行匹配
    const words = keyword.match(/[\p{L}\p{M}]+/gu) || [];

    const hasRoot = words.some(w => {
      const wordLower = w.toLowerCase();
      return wordLower === rootLower || wordLower.includes(rootLower);
    });

    if (hasRoot) {
      div.classList.add('keyword-root-highlight');
      matchedDivs.push(div);
    }
  });

  if (matchedDivs.length === 0) {
    showToast(`未找到包含词根 "${root}" 的关键词`, { type: 'warning' });
    return;
  }

  // 滚动到第一个匹配的关键词
  matchedDivs[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // 显示提示
  showToast(`找到 ${matchedDivs.length} 个包含 "${root}" 的关键词`);

  // 3秒后移除高亮效果
  addTimeout(() => {
    matchedDivs.forEach(div => div.classList.remove('keyword-root-highlight'));
  }, 3000);
}

/**
 * 最小化关键词窗口
 */
function minimizeKeywordsWindow(): void {
  const floatWinEl = document.getElementById('kt-keywords-floating');
  const minBtn = document.getElementById('kt-keywords-minimized');

  if (floatWinEl) {
    floatWinEl.classList.add('opacity-0', 'scale-95');
    addTimeout(() => {
      floatWinEl.classList.remove('show');
      floatWinEl.classList.remove('opacity-0', 'scale-95');

      if (minBtn) {
        minBtn.classList.add('show');
        appStore.getState().updateKeywordTracker({ isWindowMinimized: true });
      }
    }, 200);
  }
}

/**
 * 恢复关键词窗口
 */
function restoreKeywordsWindow(): void {
  const floatWinEl = document.getElementById('kt-keywords-floating');
  const minBtn = document.getElementById('kt-keywords-minimized');

  if (minBtn) minBtn.classList.remove('show');
  if (floatWinEl) {
    floatWinEl.classList.add('show');
    floatWinEl.classList.add('opacity-0', 'scale-95');
    requestAnimationFrame(() => {
      floatWinEl.classList.remove('opacity-0', 'scale-95');
      floatWinEl.classList.add('transition-all', 'duration-200');
    });
  }

  appStore.getState().updateKeywordTracker({ isWindowMinimized: false });
}

// ==========================================
// Floating Window Management
// ==========================================

/**
 * 设置浮动窗口拖拽功能
 */
function setupFloatingWindow(): void {
  const el = document.getElementById('kt-keywords-floating') as HTMLElement | null;
  if (!el) return;
  const header = el.querySelector('.floating-header') as HTMLElement | null;
  if (!header) return;

  addEventListener(header, 'mousedown', (e: Event) => {
    const mouseEvent = e as MouseEvent;
    floatWinState.isDragging = true;
    floatWinState.offsetX = mouseEvent.clientX - el.getBoundingClientRect().left;
    floatWinState.offsetY = mouseEvent.clientY - el.getBoundingClientRect().top;

    el.style.opacity = '0.9';
    el.style.transition = 'none';
    mouseEvent.preventDefault();
  });

  addEventListener(document, 'mousemove', (e: Event) => {
    const mouseEvent = e as MouseEvent;
    if (!floatWinState.isDragging) return;

    let newX = mouseEvent.clientX - floatWinState.offsetX;
    let newY = mouseEvent.clientY - floatWinState.offsetY;

    const maxX = window.innerWidth - el.offsetWidth;
    const maxY = window.innerHeight - el.offsetHeight;

    newX = Math.max(0, Math.min(newX, maxX));
    newY = Math.max(0, Math.min(newY, maxY));

    el.style.left = newX + 'px';
    el.style.top = newY + 'px';
    el.style.right = 'auto';
  });

  addEventListener(document, 'mouseup', () => {
    if (!floatWinState.isDragging) return;
    floatWinState.isDragging = false;

    el.style.opacity = '1';
    el.style.transition = 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';

    const rect = el.getBoundingClientRect();
    const screenWidth = window.innerWidth;
    const threshold = 100;

    // 修改: 优先吸附到右侧，避免遮挡左侧边栏
    if (rect.right > screenWidth - threshold) {
      el.style.left = screenWidth - rect.width - 20 + 'px';
    } else if (rect.left < threshold) {
      el.style.left = '20px';
    }
  });
}

/**
 * 管理浮动窗口的显示/隐藏
 */
function manageFloatingWindowVisibility(): void {
  const floatWin = document.getElementById('kt-keywords-floating');
  const minBtn = document.getElementById('kt-keywords-minimized');

  if (!floatWin || !minBtn) return;

  // 确保状态初始化
  if (appStore.getState().keywordTracker.isWindowMinimized === undefined) {
    appStore.getState().updateKeywordTracker({ isWindowMinimized: false });
  }

  const tracker = appStore.getState().keywordTracker;
  const keywordCount =
    (tracker.matchedKeywords?.length || 0) + (tracker.unmatchedKeywords?.length || 0);
  const hasAnalysisData = keywordCount > 0;

  if (!hasAnalysisData) {
    // 没有数据时隐藏浮动窗口和最小化按钮
    floatWin.classList.remove('show');
    minBtn.classList.remove('show');
    return;
  }

  // Process 模块显示浮动窗口
  if (appStore.getState().keywordTracker.isWindowMinimized) {
    floatWin.classList.remove('show');
    minBtn.classList.add('show');
  } else {
    floatWin.classList.add('show');
    minBtn.classList.remove('show');
  }
}

// ==========================================
// Event Listeners Setup
// ==========================================

/**
 * 设置事件监听器
 */
function setupEventListeners(container: HTMLElement): void {
  if (!container) return;

  // 翻译显示复选框
  const checkTrans = document.getElementById('kt-show-translation') as HTMLInputElement | null;
  if (checkTrans) {
    addEventListener(checkTrans, 'change', () => {
      saveProcessStateToState();
      renderCopyDisplay();
    });
  }

  const syncBtn = document.getElementById('kt-sync-to-input-btn');
  if (syncBtn) {
    addEventListener(syncBtn, 'click', () => {
      void syncToInput();
    });
  }

  const goAnalysisBtn = document.getElementById('kt-go-analysis-btn');
  if (goAnalysisBtn) {
    addEventListener(goAnalysisBtn, 'click', () => {
      void goToAnalysis();
    });
  }

  const translateBtn = document.getElementById('kt-translate-btn');
  if (translateBtn) {
    addEventListener(translateBtn, 'click', () => {
      void translateCopyImmersive();
    });
  }

  const minimizeBtn = document.getElementById('kt-minimize-keywords-btn');
  if (minimizeBtn) {
    addEventListener(minimizeBtn, 'click', () => {
      minimizeKeywordsWindow();
    });
  }

  const restoreBtn = document.getElementById('kt-keywords-minimized');
  if (restoreBtn) {
    addEventListener(restoreBtn, 'click', () => {
      restoreKeywordsWindow();
    });
  }

  // 设置浮动窗口拖拽
  setupFloatingWindow();
}

// ==========================================
// Module Exports (统一架构接口)
// ==========================================

/**
 * 挂载子模块
 * @param {HTMLElement} container - 容器元素
 */
export async function mount(container: HTMLElement): Promise<void> {
  try {
    processViewVersion += 1;
    // 1. 使用 SafeModuleLoader 加载模板
    const loader = SafeModuleLoader.getInstance();
    const renderer = SafeRenderer.getInstance();

    const html = await loader.loadTemplate(
      'src/modules/app_center/views/keyword_hunter/process/template.html',
      {
        retryCount: 3,
        timeout: 5000,
        onError: error => {
          ErrorService.handle(error as Error, {
            action: 'loadProcessTemplate',
            module: 'keywordTracker',
            notify: false,
          });
        },
      }
    );

    // 使用 SafeRenderer 渲染模板
    // 添加淡入动画（在渲染前添加）
    container.classList.add('fade-in');
    renderer.renderTemplate(container, html);

    // 2. 将浮动窗口移到 body 级别(避免被容器限制)
    const floatWin = document.getElementById('kt-keywords-floating');
    const minBtn = document.getElementById('kt-keywords-minimized');

    // 如果浮动窗口不在 body 中，则移动到 body
    if (floatWin && floatWin.parentElement !== document.body) {
      document.body.appendChild(floatWin);
    }
    if (minBtn && minBtn.parentElement !== document.body) {
      document.body.appendChild(minBtn);
    }

    // 3. 设置事件监听器
    setupEventListeners(container);

    // 4. 从 state 恢复状态
    await restoreProcessStateFromState();

    // 5. 管理浮动窗口显示 - 延迟执行确保 DOM 已渲染
    setTimeout(() => {
      manageFloatingWindowVisibility();
    }, 100);
  } catch (error) {
    ErrorService.handle(error as Error, {
      action: 'mountProcessModule',
      module: 'keywordTracker',
      notify: false,
    });
    throw error;
  }
}

/**
 * 卸载子模块
 */
export function unmount(): void {
  try {
    processViewVersion += 1;
    // 1. 保存状态到 state
    saveProcessStateToState();

    // 2. 移除浮动窗口和最小化按钮（从 DOM 中完全移除）
    const floatWin = document.getElementById('kt-keywords-floating');
    const minBtn = document.getElementById('kt-keywords-minimized');
    if (floatWin) {
      floatWin.remove();
    }
    if (minBtn) {
      minBtn.remove();
    }

    // 3. 清理事件监听器和定时器
    cleanup();
  } catch (error) {
    ErrorService.handle(error as Error, {
      action: 'unmountProcessModule',
      module: 'keywordTracker',
      notify: false,
    });
  }
}

/**
 * AnalysisStatsViewRenderer
 * ================================================================
 * ViewRenderer 标准化试点：将 keyword_hunter/process 中的
 * renderCoverageStats / renderWordFrequencyStats / renderWordCloud /
 * renderUnmatchedRootSection 及其辅助函数迁移为独立的视图渲染器。
 *
 * 迁移收益
 * --------
 * 1. 渲染逻辑可单元测试（不依赖模块生命周期，状态由调用方注入）。
 * 2. process/index.ts 减少约 250 行，职责收敛到事件/生命周期。
 * 3. 后续其他模块可复用同样的"统计面板"渲染模式。
 *
 * 交互说明：未匹配词根标签的点击定位通过 handlers.onLocateRoot 注入，
 * 保持渲染与交互注册分离。
 *
 * @module analysisStatsRenderer
 */
import { escapeHtml } from '@/common/utils/security';

import type { ViewRenderer } from '@/common/rendering/ViewRenderer';
import type { KeywordTrackerState } from '@/types/state';

// ---------------------------------------------------------------------------
// 渲染器所需的状态快照（从 KeywordTrackerState 派生，渲染器不直接依赖 store）
// ---------------------------------------------------------------------------

/** AnalysisStatsViewRenderer 所需的状态快照 */
export interface AnalysisStatsSnapshot {
  /** 覆盖率百分比（0-100） */
  coverageRate: number;
  /** 已匹配数量 */
  matchedCount: number;
  /** 未匹配数量 */
  unmatchedCount: number;
  /** 总数 */
  totalCount: number;
  /** 已匹配关键词条目（兼容 string 与对象形态） */
  matchedKeywords: ReadonlyArray<KeywordTrackerState['matchedKeywords'][number] | string>;
  /** 未匹配关键词列表 */
  unmatchedKeywords: ReadonlyArray<string>;
  /** 词频列表（可为空） */
  wordFrequency: ReadonlyArray<readonly [string, number]>;
}

/** 从 store 状态派生出渲染快照（纯函数，易于测试） */
export function buildAnalysisStatsSnapshot(
  tracker: KeywordTrackerState
): AnalysisStatsSnapshot {
  const total = tracker.keywords ? tracker.keywords.length : 0;
  const matched = tracker.matchedKeywords ? tracker.matchedKeywords.length : 0;
  const unmatched = tracker.unmatchedKeywords ? tracker.unmatchedKeywords.length : 0;
  const rate = total === 0 ? 0 : Math.round((matched / total) * 100);
  return {
    coverageRate: rate,
    matchedCount: matched,
    unmatchedCount: unmatched,
    totalCount: total,
    matchedKeywords: tracker.matchedKeywords ?? [],
    unmatchedKeywords: tracker.unmatchedKeywords ?? [],
    wordFrequency: tracker.wordFrequency ?? [],
  };
}

/** 可选交互回调 */
export interface AnalysisStatsViewHandlers {
  /** 点击未匹配词根标签时的定位回调 */
  onLocateRoot?: (root: string) => void;
}

// ---------------------------------------------------------------------------
// 视图渲染器实现
// ---------------------------------------------------------------------------

/** 覆盖率统计区域的目标元素 id 集合 */
const COVERAGE_IDS = {
  rate: 'keyword-hunter-coverage-rate',
  bar: 'keyword-hunter-coverage-bar',
  matched: 'keyword-hunter-stat-matched',
  unmatched: 'keyword-hunter-stat-unmatched',
  total: 'keyword-hunter-stat-total',
} as const;

/** 词频列表区域的目标元素 id */
const WORD_FREQUENCY_ID = 'keyword-hunter-word-frequency-list';

export class AnalysisStatsViewRenderer
  implements ViewRenderer<AnalysisStatsSnapshot, AnalysisStatsViewHandlers>
{
  render(
    container: HTMLElement,
    state: AnalysisStatsSnapshot,
    handlers?: AnalysisStatsViewHandlers
  ): void {
    renderCoverageStats(container, state);
    renderWordFrequencyStats(container, state, handlers?.onLocateRoot);
  }
}

function renderCoverageStats(
  container: HTMLElement,
  state: AnalysisStatsSnapshot
): void {
  setTextById(container, COVERAGE_IDS.rate, `${state.coverageRate}%`);
  const bar = container.querySelector<HTMLElement>(`#${escId(COVERAGE_IDS.bar)}`);
  if (bar) {
    const normalized = Math.max(0, Math.min(100, Math.round(state.coverageRate)));
    const valueText = normalized.toString();
    bar.setAttribute('aria-valuenow', valueText);
    bar.setAttribute('value', valueText);
    if ('value' in bar) {
      (bar as HTMLProgressElement).value = normalized;
    }
  }
  setTextById(container, COVERAGE_IDS.matched, state.matchedCount.toString());
  setTextById(container, COVERAGE_IDS.unmatched, state.unmatchedCount.toString());
  setTextById(container, COVERAGE_IDS.total, state.totalCount.toString());
}

function escId(id: string): string {
  // 简易 id 清洗：保留 ASCII 字字母数字/连字符/下划线，其余转义
  return id.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`);
}

function setTextById(container: HTMLElement, id: string, text: string): void {
  const el = container.querySelector<HTMLElement>(`#${escId(id)}`);
  if (el && el.textContent !== text) {
    el.textContent = text;
  }
}

function renderWordFrequencyStats(
  container: HTMLElement,
  state: AnalysisStatsSnapshot,
  onLocateRoot?: (root: string) => void
): void {
  const freqList = container.querySelector<HTMLElement>(
    `#${escId(WORD_FREQUENCY_ID)}`
  );
  if (!freqList) return;
  const matchedKeywordRoots = collectMatchedKeywordRoots(state.matchedKeywords);
  const unmatchedKeywordRoots = collectUnmatchedKeywordRoots(
    state.unmatchedKeywords,
    state.wordFrequency
  );
  freqList.replaceChildren();
  if (state.wordFrequency.length === 0 && unmatchedKeywordRoots.size === 0) {
    freqList.appendChild(createEmptyWordFrequencyElement());
    return;
  }
  renderWordCloud(freqList, state.wordFrequency, matchedKeywordRoots);
  renderUnmatchedRootSection(freqList, unmatchedKeywordRoots, onLocateRoot);
}

function collectMatchedKeywordRoots(
  matchedKeywords: ReadonlyArray<
    KeywordTrackerState['matchedKeywords'][number] | string
  >
): Set<string> {
  const roots = new Set<string>();
  matchedKeywords.forEach(item => {
    addKeywordRoots(roots, getMatchedKeywordText(item));
  });
  return roots;
}

function collectUnmatchedKeywordRoots(
  unmatchedKeywords: ReadonlyArray<string>,
  wordFrequency: ReadonlyArray<readonly [string, number]>
): Set<string> {
  const roots = new Set<string>();
  const highFreqWordsSet = new Set(wordFrequency.map(([word]) => word.toLowerCase()));
  unmatchedKeywords.forEach(keyword => {
    addKeywordRoots(roots, keyword, highFreqWordsSet);
  });
  return roots;
}

function getMatchedKeywordText(
  item: KeywordTrackerState['matchedKeywords'][number] | string
): string {
  return typeof item === 'object' ? item.keyword : item;
}

function addKeywordRoots(
  roots: Set<string>,
  keyword: string,
  excludedRoots?: Set<string>
): void {
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
  wordFrequency: ReadonlyArray<readonly [string, number]>,
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

function createWordFrequencySpan(
  word: string,
  count: number,
  isMatched: boolean
): HTMLElement {
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
    span.appendChild(document.createTextNode(` ${escapeHtml(word)} `));
    countSpan.className = 'opacity-60';
    span.appendChild(countSpan);
    return span;
  }
  span.className = 'px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md';
  span.textContent = `${escapeHtml(word)} `;
  countSpan.className = 'text-slate-400';
  span.appendChild(countSpan);
  return span;
}

function renderUnmatchedRootSection(
  freqList: HTMLElement,
  unmatchedKeywordRoots: Set<string>,
  onLocateRoot?: (root: string) => void
): void {
  if (unmatchedKeywordRoots.size === 0) return;
  const unmatchedRootsArray = Array.from(unmatchedKeywordRoots).sort();
  const unmatchedSection = document.createElement('div');
  unmatchedSection.className = 'mt-4 pt-4 border-t border-slate-200';
  unmatchedSection.appendChild(createUnmatchedRootsHeader(unmatchedRootsArray.length));
  unmatchedSection.appendChild(
    createUnmatchedRootsContainer(unmatchedRootsArray, onLocateRoot)
  );
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

function createUnmatchedRootsContainer(
  roots: string[],
  onLocateRoot?: (root: string) => void
): HTMLElement {
  const rootsContainer = document.createElement('div');
  rootsContainer.className = 'flex flex-wrap gap-2';
  const rootsFragment = document.createDocumentFragment();
  roots.forEach((root: string) => {
    rootsFragment.appendChild(createUnmatchedRootTag(root, onLocateRoot));
  });
  rootsContainer.appendChild(rootsFragment);
  return rootsContainer;
}

function createUnmatchedRootTag(
  root: string,
  onLocateRoot?: (root: string) => void
): HTMLElement {
  const span = document.createElement('span');
  span.className =
    'px-2 py-1 bg-red-100 text-red-700 text-xs rounded-md inline-flex items-center gap-1 cursor-pointer hover:bg-red-200 transition-colors';
  span.title = '点击在关键词监控中定位';
  if (onLocateRoot) {
    span.addEventListener('click', () => onLocateRoot(root));
  }
  const icon = document.createElement('i');
  icon.className = 'fa-solid fa-xmark text-[10px]';
  icon.setAttribute('aria-hidden', 'true');
  span.appendChild(icon);
  const text = document.createElement('span');
  text.textContent = root;
  span.appendChild(text);
  return span;
}

function createEmptyWordFrequencyElement(): HTMLElement {
  const emptyDiv = document.createElement('div');
  emptyDiv.className = 'flex flex-col items-center justify-center py-16 px-4 text-center';
  emptyDiv.setAttribute('role', 'status');
  emptyDiv.setAttribute('aria-live', 'polite');
  const iconWrap = document.createElement('div');
  iconWrap.className =
    'w-14 h-14 rounded-2xl bg-[var(--module-accent-soft)] flex items-center justify-center mb-4 border border-[var(--module-accent-soft)]';
  const icon = document.createElement('i');
  icon.className = 'fas fa-cloud text-[var(--module-accent)] text-xl';
  icon.setAttribute('aria-hidden', 'true');
  iconWrap.appendChild(icon);
  const title = document.createElement('p');
  title.className = 'text-sm font-semibold text-slate-600';
  title.textContent = '还没有词频数据';
  const reason = document.createElement('p');
  reason.className = 'text-xs text-slate-500 mt-2 max-w-sm leading-relaxed';
  reason.textContent = '当前没有可统计的 Listing 文案和关键词匹配结果。';
  const action = document.createElement('p');
  action.className = 'text-xs text-slate-500 mt-2 max-w-sm leading-relaxed';
  action.textContent = '推荐操作：返回输入页粘贴关键词和文案，点击开始分析后这里会生成词云。';
  emptyDiv.append(iconWrap, title, reason, action);
  return emptyDiv;
}

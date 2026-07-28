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

import { SafeTemplateLoader } from '@/common/infrastructure/SafeModuleLoader';
import { SafeRenderer } from '@/common/infrastructure/SafeRenderer';
import BaseModule from '@/common/BaseModule';
import { showToast } from '@/common/ui';
import { ValidationError } from '@/common/errors/AppError';
import { showLlmFailureToast } from '@/common/errors/llmFailureUx';
import { navigateToRouteId } from '@/common/router/initRouter';
import * as KeywordHunterService from '../services/keywordHunterService';
import { KeywordHunterSnapshotService } from '../services/snapshotService';
import { getLlmProviderConfig } from '@/common/config/llmProviders';
import { fetchModelsFromApi } from '@/services/llmService';
import { appStore } from '@/stores/useAppStore';
import { ErrorService } from '@/services/errorService';
import { StorageService, STORAGE_KEYS } from '@/services/storageService';
import {
  getToolTargetDefaultModel,
  setToolTargetDefaultModel,
} from '@/services/toolStrategyService';
import { getRuntimeKeywordHunterSeoOptions } from '@/services/runtimeStrategyService';
import { createSafeFragment } from '@/common/utils/security';
import { clearRuntimeCssRule, updateRuntimeCssRule } from '@/common/utils/runtimeStyles';
import type { LLMProviderConfig } from '@/types/state';
import '../styles.css';

// ==========================================
// Module State
// ==========================================

interface FloatWinState {
  isDragging: boolean;
  offsetX: number;
  offsetY: number;
}

/** Singleton set in module constructor; routes DOM/timer registration through BaseModule. */
let processLifecycle: KeywordHunterProcessModule | null = null;

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
  promise: ReturnType<typeof KeywordHunterService.fetchImmersionTranslation>;
  status: 'pending' | 'success' | 'failure';
  error?: Error;
  llmStatus?: KeywordHunterService.KeywordHunterLlmStatus;
}

interface TranslationModelRefreshConfig {
  storedConfig: Partial<LLMProviderConfig> | null;
  configWithKey: LLMProviderConfig | null;
  endpoint: string;
  apiKey: string;
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

type KeywordHunterStoreState = ReturnType<typeof appStore.getState>['keywordTracker'];
type MatchedKeywordEntry = KeywordHunterStoreState['matchedKeywords'][number] | string;
type TranslationModelOption = NonNullable<LLMProviderConfig['models']>[number];
const SEO_PROCESS_TARGET_ID = 'keyword-hunter-seo-process';

let floatWinState: FloatWinState = {
  isDragging: false,
  offsetX: 0,
  offsetY: 0,
};
let activeTranslationRun: ActiveTranslationRun | null = null;
let processViewVersion = 0;
let isRefreshingTranslationModels = false;

// ==========================================
// Helper Functions
// ==========================================

/**
 * 添加事件监听器（经 BaseModule disposables，unmount 自动清理）
 */
function addEventListener(
  element: HTMLElement | Document | Window,
  event: string,
  handler: EventListenerOrEventListenerObject
): void {
  processLifecycle?.trackDomEvent(element, event, handler);
}

/**
 * 添加定时器（经 BaseModule disposables，unmount 自动清理）
 */
function addTimeout(callback: () => void, delay: number): number {
  return processLifecycle?.trackTimeout(callback, delay) ?? 0;
}

const KEYWORD_HUNTER_FLOATING_WINDOW_ID = 'keyword-hunter-keywords-floating';
const KEYWORD_HUNTER_MINIMIZED_BUTTON_ID = 'keyword-hunter-keywords-minimized';
const KEYWORD_FLOATING_WINDOW_POSITION_RULE = 'keyword-floating-window-position';

/** Idempotent: remove body-level floating chrome left after process mount. */
function removeKeywordHunterFloatingChrome(): void {
  document.getElementById(KEYWORD_HUNTER_FLOATING_WINDOW_ID)?.remove();
  document.getElementById(KEYWORD_HUNTER_MINIMIZED_BUTTON_ID)?.remove();
  clearRuntimeCssRule(KEYWORD_FLOATING_WINDOW_POSITION_RULE);
}

/**
 * Domain teardown after BaseModule has disposed tracked listeners/timers.
 * Removes body-level floating chrome left by process mount.
 */
function cleanupProcessSurface(): void {
  removeKeywordHunterFloatingChrome();

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

function getActiveLlmProvider(): string | null {
  const provider = StorageService.get<string>(STORAGE_KEYS.LLM_ACTIVE_PROVIDER);
  return typeof provider === 'string' && provider.trim() ? provider : null;
}

function getTranslationModelId(model: TranslationModelOption): string {
  return typeof model === 'string' ? model : model.id;
}

function getTranslationModelLabel(model: TranslationModelOption): string {
  if (typeof model === 'string') return model;
  if (model.name && model.name !== model.id) return `${model.name} (${model.id})`;
  return model.id;
}

function dedupeTranslationModels(models: TranslationModelOption[]): TranslationModelOption[] {
  const seen = new Set<string>();
  return models.filter(model => {
    const id = getTranslationModelId(model);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function ensureTranslationModelOption(
  models: TranslationModelOption[],
  modelId: string | undefined
): TranslationModelOption[] {
  if (!modelId) return models;
  if (models.some(model => getTranslationModelId(model) === modelId)) return models;
  return [modelId, ...models];
}

function getTranslationLlmConfig(provider: string): Partial<LLMProviderConfig> | null {
  return StorageService.getLLMConfig(provider);
}

function getTranslationModelOptions(
  provider: string | null,
  config: Partial<LLMProviderConfig> | null
): TranslationModelOption[] {
  const presetModels = provider ? getLlmProviderConfig(provider)?.models || [] : [];
  const configuredModels = config?.models || [];
  const strategyModel = provider ? getToolTargetDefaultModel(SEO_PROCESS_TARGET_ID, provider) : '';
  return dedupeTranslationModels(
    ensureTranslationModelOption(
      ensureTranslationModelOption([...configuredModels, ...presetModels], config?.model),
      strategyModel
    )
  );
}

function getTranslationModelSelection(
  provider: string | null,
  config: Partial<LLMProviderConfig> | null,
  models: TranslationModelOption[]
): string {
  const strategyModel = provider ? getToolTargetDefaultModel(SEO_PROCESS_TARGET_ID, provider) : '';
  if (strategyModel) return strategyModel;
  if (config?.model) return config.model;
  const firstModel = models[0];
  return firstModel ? getTranslationModelId(firstModel) : '';
}

function createTranslationModelOption(
  model: TranslationModelOption,
  selectedModel: string
): HTMLOptionElement {
  const option = document.createElement('option');
  const id = getTranslationModelId(model);
  option.value = id;
  option.textContent = getTranslationModelLabel(model);
  option.selected = id === selectedModel;
  return option;
}

function setTranslationModelStatus(message: string, role: 'status' | 'alert' = 'status'): void {
  const status = document.getElementById('keyword-hunter-translation-model-status');
  if (!status) return;
  status.textContent = message;
  status.setAttribute('role', role);
  status.setAttribute('aria-live', role === 'alert' ? 'assertive' : 'polite');
}

function renderTranslationModelRefreshButton(): void {
  const button = document.getElementById(
    'keyword-hunter-refresh-models-btn'
  ) as HTMLButtonElement | null;
  const icon = document.getElementById('keyword-hunter-refresh-models-icon');
  if (!button) return;

  button.disabled = isRefreshingTranslationModels || !getActiveLlmProvider();
  if (isRefreshingTranslationModels) {
    button.setAttribute('aria-busy', 'true');
  } else {
    button.removeAttribute('aria-busy');
  }

  if (icon) {
    icon.className = isRefreshingTranslationModels
      ? 'fas fa-sync-alt fa-spin text-[10px]'
      : 'fas fa-sync-alt text-[10px]';
  }
}

function renderTranslationModelSelector(): void {
  const select = document.getElementById(
    'keyword-hunter-translation-model-select'
  ) as HTMLSelectElement | null;
  if (!select) return;

  const provider = getActiveLlmProvider();
  const config = provider ? getTranslationLlmConfig(provider) : null;
  const models = getTranslationModelOptions(provider, config);
  const selectedModel = getTranslationModelSelection(provider, config, models);

  select.replaceChildren();
  if (models.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = provider ? '暂无可选模型' : '模型未配置';
    select.appendChild(option);
    select.disabled = true;
  } else {
    const fragment = document.createDocumentFragment();
    models.forEach(model => {
      fragment.appendChild(createTranslationModelOption(model, selectedModel));
    });
    select.appendChild(fragment);
    select.disabled = false;
    select.value = selectedModel;
  }

  if (!provider) {
    setTranslationModelStatus('请先在全局设置中选择 LLM 提供商');
  } else if (!selectedModel) {
    setTranslationModelStatus('请先在全局设置中选择模型，或刷新可用模型列表');
  } else {
    setTranslationModelStatus(`当前 AI 翻译模型：${selectedModel}`);
  }

  renderTranslationModelRefreshButton();
}

function saveTranslationModelCatalog(
  provider: string,
  config: Partial<LLMProviderConfig> | null,
  models: TranslationModelOption[],
  fallbackModel?: string
): void {
  const presetConfig = getLlmProviderConfig(provider);
  const persistedModel =
    config?.model || fallbackModel || (models[0] ? getTranslationModelId(models[0]) : '');
  const nextConfig: LLMProviderConfig = {
    ...config,
    provider,
    endpoint: config?.endpoint || presetConfig?.endpoint || '',
    apiKey: '',
    model: persistedModel,
    models,
    enabled: config?.enabled ?? true,
    ...(config?.serviceTier && { serviceTier: config.serviceTier }),
  };

  StorageService.setLLMConfig(provider, nextConfig);
}

function saveTranslationStrategyModel(provider: string, model: string): void {
  setToolTargetDefaultModel(SEO_PROCESS_TARGET_ID, provider, model);
}

function selectTranslationModel(event: Event): void {
  const model = (event.target as HTMLSelectElement).value;
  if (!model) return;

  const provider = getActiveLlmProvider();
  if (!provider) {
    showLlmFailureToast(
      new ValidationError('请先在全局设置中选择 LLM 提供商', 'ERR_LLM_PROVIDER_NOT_SELECTED')
    );
    renderTranslationModelSelector();
    return;
  }

  const config = getTranslationLlmConfig(provider);
  const models = ensureTranslationModelOption(getTranslationModelOptions(provider, config), model);
  saveTranslationModelCatalog(provider, config, models, model);
  saveTranslationStrategyModel(provider, model);
  setTranslationModelStatus(`当前 AI 翻译模型：${model}`);
  showToast(`AI 翻译模型已切换为 ${model}`, { type: 'success' });
}

function warnTranslationModelRefreshBlocked(message: string): void {
  if (message.includes('提供商') || message.includes('选择 LLM')) {
    showLlmFailureToast(new ValidationError(message, 'ERR_LLM_PROVIDER_NOT_SELECTED'));
  } else if (message.includes('API Key') || message.includes('密钥')) {
    showLlmFailureToast(new ValidationError(message, 'ERR_LLM_API_KEY_MISSING'));
  } else if (message.includes('端点') || message.includes('Endpoint')) {
    showLlmFailureToast(new ValidationError(message, 'BIZ_NO_MODEL_CONFIGURED'));
  } else {
    showToast(message, { type: 'warning' });
  }
  setTranslationModelStatus(message, 'alert');
}

async function resolveTranslationModelRefreshConfig(
  provider: string
): Promise<TranslationModelRefreshConfig | null> {
  const storedConfig = getTranslationLlmConfig(provider);
  const configWithKey = await StorageService.getLLMConfigWithKey(provider);
  const presetConfig = getLlmProviderConfig(provider);
  const endpoint =
    configWithKey?.endpoint || storedConfig?.endpoint || presetConfig?.endpoint || '';
  const apiKey = configWithKey?.apiKey || '';

  if (!endpoint) {
    warnTranslationModelRefreshBlocked('请先在全局设置中配置 API 端点');
    return null;
  }

  if (!apiKey) {
    warnTranslationModelRefreshBlocked('请先在全局设置中配置 API Key');
    return null;
  }

  return { storedConfig, configWithKey, endpoint, apiKey };
}

function getNextTranslationModel(
  provider: string,
  config: Partial<LLMProviderConfig> | null,
  models: TranslationModelOption[]
): string {
  const selectedModel = getTranslationModelSelection(provider, config, models);
  const modelExists = models.some(model => getTranslationModelId(model) === selectedModel);
  const fallbackModel = models[0];
  if (!fallbackModel) {
    throw new ValidationError('未能获取到有效模型列表', 'KH_PROCESS_001', 'models', models, {
      module: 'keyword_hunter',
      action: 'getNextTranslationModel',
      provider,
    });
  }
  return modelExists ? selectedModel : getTranslationModelId(fallbackModel);
}

async function refreshTranslationModels(): Promise<void> {
  if (isRefreshingTranslationModels) return;

  const provider = getActiveLlmProvider();
  if (!provider) {
    warnTranslationModelRefreshBlocked('请先在全局设置中选择 LLM 提供商');
    renderTranslationModelRefreshButton();
    return;
  }

  isRefreshingTranslationModels = true;
  setTranslationModelStatus('正在获取 AI 翻译可用模型');
  renderTranslationModelRefreshButton();

  try {
    const refreshConfig = await resolveTranslationModelRefreshConfig(provider);
    if (!refreshConfig) return;

    const models = await fetchModelsFromApi(provider, refreshConfig.endpoint, refreshConfig.apiKey);
    const config = refreshConfig.configWithKey || refreshConfig.storedConfig;
    const nextModel = getNextTranslationModel(provider, config, models);
    saveTranslationModelCatalog(provider, config, models, nextModel);
    saveTranslationStrategyModel(provider, nextModel);
    renderTranslationModelSelector();
    showToast(`成功同步 ${models.length} 个模型`, { type: 'success' });
  } catch (error) {
    ErrorService.handle(getError(error), {
      action: 'refreshTranslationModels',
      module: 'keywordHunter',
      notify: false,
    });
    const ux = showLlmFailureToast(error, { titlePrefix: '获取模型失败: ' });
    setTranslationModelStatus(`获取模型失败: ${ux.title}`, 'alert');
  } finally {
    isRefreshingTranslationModels = false;
    renderTranslationModelRefreshButton();
  }
}

function getKeywordSet(sets: Set<string>[], index: number): Set<string> {
  return sets[index] ?? new Set<string>();
}

function getDefaultProcessKeywordHunterState(): KeywordHunterStoreState {
  const defaultMatchSettings = getRuntimeKeywordHunterSeoOptions();
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
      matchPlural: defaultMatchSettings.matchPlural,
      matchStem: defaultMatchSettings.matchStem,
      matchCase: defaultMatchSettings.matchCase,
      matchPartial: defaultMatchSettings.matchPartial,
    },
    isWindowMinimized: false,
  };
}

function ensureKeywordHunterState(): KeywordHunterStoreState {
  const currentState = appStore.getState();
  if (!currentState.keywordTracker) {
    currentState.updateKeywordTracker(getDefaultProcessKeywordHunterState());
  }

  return appStore.getState().keywordTracker;
}

function getProcessCopyTextFromDisplay(): string {
  const tracker = ensureKeywordHunterState();
  if (tracker.translationMode && tracker.paragraphs.length > 0) {
    return tracker.processedCopy || getOriginalTextFromTranslationParagraphs(tracker);
  }

  const displayEl = document.getElementById('keyword-hunter-copy-display');
  return displayEl ? displayEl.innerText : '';
}

function getOriginalTextFromTranslationParagraphs(tracker: KeywordHunterStoreState): string {
  return tracker.paragraphs
    .map(paragraph =>
      typeof paragraph === 'object' && 'original' in paragraph ? paragraph.original : paragraph
    )
    .filter(text => text && text.trim())
    .join('\n');
}

function saveProcessCopyText(copyText: string): void {
  const tracker = ensureKeywordHunterState();
  const changed = copyText !== tracker.processedCopy;
  const metrics = KeywordHunterService.computeKeywordHunterMetrics(
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
  ensureKeywordHunterState();

  const copyText = getProcessCopyTextFromDisplay();
  if (copyText.trim()) {
    saveProcessCopyText(copyText);
  }

  // 保存翻译显示状态
  const showTransCheckbox = document.getElementById(
    'keyword-hunter-show-translation'
  ) as HTMLInputElement | null;
  if (showTransCheckbox) {
    appStore.getState().updateKeywordTracker({ showTranslation: showTransCheckbox.checked });
  }
}

/**
 * 从内存 state 恢复处理状态。
 * 刷新后 store 只会保留匹配设置，不自动回填历史快照。
 */
function restoreProcessStateFromState(): void {
  ensureKeywordHunterState();

  // 恢复翻译显示状态
  const showTransCheckbox = document.getElementById(
    'keyword-hunter-show-translation'
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
  renderTranslationModelSelector();
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
  const tracker = ensureKeywordHunterState();
  const stats = getAnalysisStats(tracker);
  renderCoverageStats(stats);
  renderWordFrequencyStats(tracker);
}

function getAnalysisStats(tracker: KeywordHunterStoreState): AnalysisStats {
  const total = tracker.keywords ? tracker.keywords.length : 0;
  const matched = tracker.matchedKeywords ? tracker.matchedKeywords.length : 0;
  const unmatched = tracker.unmatchedKeywords ? tracker.unmatchedKeywords.length : 0;
  const rate = total === 0 ? 0 : Math.round((matched / total) * 100);

  return { total, matched, unmatched, rate };
}

function renderCoverageStats(stats: AnalysisStats): void {
  // 更新覆盖率
  const rateEl = document.getElementById('keyword-hunter-coverage-rate');
  if (rateEl) rateEl.textContent = stats.rate + '%';

  const barEl = document.getElementById('keyword-hunter-coverage-bar') as HTMLElement | null;
  if (barEl) setProgressValue(barEl, stats.rate);

  // 更新统计数据
  const matchedEl = document.getElementById('keyword-hunter-stat-matched');
  if (matchedEl) matchedEl.textContent = stats.matched.toString();

  const unmatchedEl = document.getElementById('keyword-hunter-stat-unmatched');
  if (unmatchedEl) unmatchedEl.textContent = stats.unmatched.toString();

  const totalEl = document.getElementById('keyword-hunter-stat-total');
  if (totalEl) totalEl.textContent = stats.total.toString();
}

function renderWordFrequencyStats(tracker: KeywordHunterStoreState): void {
  const freqList = document.getElementById('keyword-hunter-word-frequency-list');
  if (!freqList || !tracker.wordFrequency) return;

  const matchedKeywordRoots = collectMatchedKeywordRoots(tracker.matchedKeywords);
  const unmatchedKeywordRoots = collectUnmatchedKeywordRoots(tracker);

  freqList.replaceChildren();
  if (tracker.wordFrequency.length === 0 && unmatchedKeywordRoots.size === 0) {
    freqList.appendChild(createEmptyWordFrequencyElement());
    return;
  }

  renderWordCloud(freqList, tracker.wordFrequency, matchedKeywordRoots);
  renderUnmatchedRootSection(freqList, unmatchedKeywordRoots);
}

function createEmptyWordFrequencyElement(): HTMLElement {
  const emptyDiv = document.createElement('div');
  emptyDiv.className = 'flex flex-col items-center justify-center py-16 px-4 text-center';
  emptyDiv.setAttribute('role', 'status');
  emptyDiv.setAttribute('aria-live', 'polite');

  const iconWrap = document.createElement('div');
  iconWrap.className =
    'w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4 border border-indigo-100';
  const icon = document.createElement('i');
  icon.className = 'fas fa-cloud text-indigo-200 text-xl';
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

function collectMatchedKeywordRoots(matchedKeywords: readonly MatchedKeywordEntry[]): Set<string> {
  const roots = new Set<string>();
  matchedKeywords.forEach(item => {
    addKeywordRoots(roots, getMatchedKeywordText(item));
  });
  return roots;
}

function collectUnmatchedKeywordRoots(tracker: KeywordHunterStoreState): Set<string> {
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
  const transBtn = document.getElementById(
    'keyword-hunter-translate-btn'
  ) as HTMLButtonElement | null;
  const transBtnText = document.getElementById('keyword-hunter-translate-btn-text');
  const transCheckbox = document.getElementById(
    'keyword-hunter-show-translation'
  ) as HTMLInputElement | null;

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
    transBtn.classList.remove('keyword-hunter-btn-disabled');
    transBtn.classList.add('keyword-hunter-btn-active');
    return;
  }

  transBtn.disabled = true;
  transBtnText.textContent = state.hasTranslationData ? '翻译已完成' : 'AI 沉浸式翻译';
  transBtn.classList.add('keyword-hunter-btn-disabled');
  transBtn.classList.remove('keyword-hunter-btn-active');
}

function getTranslationElements(): {
  btn: HTMLButtonElement | null;
  progress: HTMLElement | null;
  text: HTMLElement | null;
  status: HTMLElement | null;
} {
  return {
    btn: document.getElementById('keyword-hunter-translate-btn') as HTMLButtonElement | null,
    progress: document.getElementById('keyword-hunter-translate-progress'),
    text: document.getElementById('keyword-hunter-translate-btn-text'),
    status: document.getElementById('keyword-hunter-translate-status'),
  };
}

function setProgressValue(progress: HTMLElement, value: number): void {
  const normalized = Math.max(0, Math.min(100, Math.round(value)));
  const valueText = normalized.toString();

  progress.setAttribute('aria-valuenow', valueText);
  progress.setAttribute('value', valueText);
  if ('value' in progress) {
    (progress as HTMLProgressElement).value = normalized;
  }
}

function renderTranslationPendingState(): void {
  const { btn, progress, text, status } = getTranslationElements();

  if (btn) {
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    btn.classList.add('keyword-hunter-btn-disabled');
    btn.classList.remove('keyword-hunter-btn-active');
  }
  if (progress) {
    progress.classList.remove('hidden');
    setProgressValue(progress, 30);
  }
  if (text) {
    text.textContent = '正在翻译...';
  }
  if (status) {
    status.textContent = 'AI 正在翻译文案，请稍候';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
  }
}

function renderTranslationStatusMessage(
  elements: ReturnType<typeof getTranslationElements>,
  progressValue: number,
  buttonText: string,
  statusText: string
): void {
  if (elements.progress) {
    setProgressValue(elements.progress, progressValue);
  }
  if (elements.text) {
    elements.text.textContent = buttonText;
  }
  if (elements.status) {
    elements.status.textContent = statusText;
  }
}

function renderTranslationLlmStatus(status: KeywordHunterService.KeywordHunterLlmStatus): void {
  const elements = getTranslationElements();

  if (status.stage === 'cache-hit') {
    renderTranslationStatusMessage(elements, 80, '正在载入缓存译文...', '已命中缓存，正在渲染译文');
    return;
  }

  if (status.stage === 'in-flight') {
    renderTranslationStatusMessage(
      elements,
      45,
      '正在复用翻译任务...',
      '相同文案正在翻译，不会重复调用模型'
    );
    return;
  }

  // Stream chunks: keep receiving state without requiring first-response metrics.
  if (status.stage === 'stream') {
    renderTranslationStatusMessage(elements, 65, '正在接收译文...', '流式响应进行中');
    return;
  }

  if (status.stage !== 'first-response') return;

  const firstMs = status.metrics.firstChunkMs ?? status.metrics.elapsedMs;
  renderTranslationStatusMessage(
    elements,
    55,
    '正在接收译文...',
    `模型已首响 ${(firstMs / 1000).toFixed(1)}s，正在接收译文`
  );
}

function renderTranslationCompletedState(): void {
  const { btn, progress, status } = getTranslationElements();
  if (btn) {
    btn.removeAttribute('aria-busy');
  }
  if (progress) {
    setProgressValue(progress, 100);
    addTimeout(() => progress.classList.add('hidden'), 500);
  }
  if (status) {
    status.textContent = 'AI 翻译已完成';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
  }
}

function renderTranslationFailureState(): void {
  const { btn, progress, text, status } = getTranslationElements();

  if (progress) {
    progress.classList.add('hidden');
    setProgressValue(progress, 0);
  }
  if (text) {
    text.textContent = '翻译失败，请重试';
  }
  if (btn) {
    btn.disabled = false;
    btn.removeAttribute('aria-busy');
    btn.classList.remove('keyword-hunter-btn-disabled');
    btn.classList.add('keyword-hunter-btn-active');
  }
  if (status) {
    status.textContent = 'AI 翻译失败，请重试';
    status.setAttribute('role', 'alert');
    status.setAttribute('aria-live', 'assertive');
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
  const display = document.getElementById('keyword-hunter-copy-display');
  if (!display) return;

  const showTrans = (
    document.getElementById('keyword-hunter-show-translation') as HTMLInputElement | null
  )?.checked;
  const tracker = appStore.getState().keywordTracker;

  if (shouldRenderTranslationParagraphs(tracker)) {
    renderTranslationParagraphs(display, getHighlightedTranslationParagraphs(tracker, showTrans));
    return;
  }

  renderProcessedCopy(display, tracker.processedCopy);
}

function shouldRenderTranslationParagraphs(tracker: KeywordHunterStoreState): boolean {
  return Boolean(tracker.translationMode && tracker.paragraphs && tracker.paragraphs.length > 0);
}

function getHighlightedTranslationParagraphs(
  tracker: KeywordHunterStoreState,
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
  tracker: KeywordHunterStoreState,
  keyword: string
): void {
  const kwLower = keyword.toLowerCase();
  const ranges = KeywordHunterService.findKeywordMatchRanges(text, keyword, tracker.settings);

  ranges.forEach(({ start, end }) => {
    for (let i = start; i < end; i++) {
      charKeywords[i]?.add(kwLower);
    }
  });
}

function buildCharacterKeywordMap(text: string, tracker: KeywordHunterStoreState): Set<string>[] {
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
  const allContainer = document.getElementById('keyword-hunter-all-keywords');

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
  emptyDiv.className = 'text-center text-slate-500 py-8 px-4';
  emptyDiv.setAttribute('role', 'status');
  emptyDiv.setAttribute('aria-live', 'polite');
  const icon = document.createElement('i');
  icon.className = 'fas fa-inbox text-3xl mb-3 text-slate-300';
  icon.setAttribute('aria-hidden', 'true');
  const title = document.createElement('p');
  title.className = 'text-sm font-semibold text-slate-600';
  title.textContent = '还没有关键词数据';
  const reason = document.createElement('p');
  reason.className = 'mt-2 text-xs text-slate-500';
  reason.textContent = '当前没有可监控的已匹配或未匹配关键词。';
  const action = document.createElement('p');
  action.className = 'mt-2 text-xs text-slate-500';
  action.textContent = '推荐操作：返回输入页粘贴关键词和文案，重新开始分析。';
  emptyDiv.append(icon, title, reason, action);
  return emptyDiv;
}

function updateFloatingKeywordCounts(): void {
  const matchedCount = document.getElementById('keyword-hunter-tab-matched-count');
  const tracker = appStore.getState().keywordTracker;
  if (matchedCount) {
    matchedCount.textContent = tracker.matchedKeywords.length.toString();
  }

  const unmatchedCount = document.getElementById('keyword-hunter-tab-unmatched-count');
  if (unmatchedCount) {
    unmatchedCount.textContent = tracker.unmatchedKeywords.length.toString();
  }
}

/**
 * 更新最小化徽章
 */
function updateMinimizedBadge(): void {
  const badge = document.getElementById('keyword-hunter-minimized-badge');
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

async function goToAnalysis(): Promise<void> {
  saveProcessStateToState();

  const processedCopy = appStore.getState().keywordTracker.processedCopy;
  if (!processedCopy || !processedCopy.trim()) {
    showToast('没有可分析的文案', { type: 'warning' });
    return;
  }

  await navigateToRouteId('keyword_hunter_analysis');
}

function getError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function isTranslationRunForCurrentCopy(run: ActiveTranslationRun): boolean {
  return getProcessedCopy() === run.processedCopy;
}

function finalizeTranslationSuccess(
  run: ActiveTranslationRun,
  pairs: Awaited<ReturnType<typeof KeywordHunterService.fetchImmersionTranslation>>
): Awaited<ReturnType<typeof KeywordHunterService.fetchImmersionTranslation>> {
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
      module: 'keywordHunter',
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

  run.promise = KeywordHunterService.fetchImmersionTranslation(processedCopy, {
    onLlmStatus: status => {
      run.llmStatus = status;
      if (isTranslationRunForCurrentCopy(run)) {
        renderTranslationLlmStatus(status);
      }
    },
  })
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
  if (run.llmStatus) {
    renderTranslationLlmStatus(run.llmStatus);
  }

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
        module: 'keywordHunter',
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
  const container = document.getElementById('keyword-hunter-copy-display');
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
  const floatWin = document.getElementById('keyword-hunter-keywords-floating');
  const allKeywordsContainer = document.getElementById('keyword-hunter-all-keywords');

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
  const floatWinEl = document.getElementById('keyword-hunter-keywords-floating');
  const minBtn = document.getElementById('keyword-hunter-keywords-minimized');

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
  const floatWinEl = document.getElementById('keyword-hunter-keywords-floating');
  const minBtn = document.getElementById('keyword-hunter-keywords-minimized');

  if (minBtn) minBtn.classList.remove('show');
  if (floatWinEl) {
    floatWinEl.classList.add('show');
    floatWinEl.classList.add('opacity-0', 'scale-95');
    requestAnimationFrame(() => {
      floatWinEl.classList.remove('opacity-0', 'scale-95');
      floatWinEl.classList.add('transition', 'duration-200');
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
  const el = document.getElementById('keyword-hunter-keywords-floating') as HTMLElement | null;
  if (!el) return;
  const header = el.querySelector('.floating-header') as HTMLElement | null;
  if (!header) return;

  addEventListener(header, 'mousedown', (e: Event) => {
    const mouseEvent = e as MouseEvent;
    if (mouseEvent.button !== 0 || isInteractiveDragTarget(mouseEvent.target)) {
      return;
    }

    const rect = el.getBoundingClientRect();
    floatWinState.isDragging = true;
    floatWinState.offsetX = mouseEvent.clientX - rect.left;
    floatWinState.offsetY = mouseEvent.clientY - rect.top;

    updateFloatingWindowPosition(rect.left, rect.top);
    el.classList.add('keyword-hunter-floating-window--positioned', 'is-dragging');
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

    updateFloatingWindowPosition(newX, newY);
  });

  addEventListener(document, 'mouseup', () => {
    if (!floatWinState.isDragging) return;
    floatWinState.isDragging = false;

    el.classList.remove('is-dragging');

    const rect = el.getBoundingClientRect();
    const screenWidth = window.innerWidth;
    const threshold = 100;

    // 修改: 优先吸附到右侧，避免遮挡左侧边栏
    if (rect.right > screenWidth - threshold) {
      updateFloatingWindowPosition(screenWidth - rect.width - 20, rect.top);
    } else if (rect.left < threshold) {
      updateFloatingWindowPosition(20, rect.top);
    }
  });
}

function isInteractiveDragTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest('button, a, input, textarea, select, label, [role="button"]') !== null
  );
}

function updateFloatingWindowPosition(left: number, top: number): void {
  updateRuntimeCssRule(
    KEYWORD_FLOATING_WINDOW_POSITION_RULE,
    `#${KEYWORD_HUNTER_FLOATING_WINDOW_ID}.keyword-hunter-floating-window--positioned`,
    {
      left: `${Math.round(left)}px`,
      top: `${Math.round(top)}px`,
    }
  );
}

/**
 * 管理浮动窗口的显示/隐藏
 */
function manageFloatingWindowVisibility(): void {
  const floatWin = document.getElementById('keyword-hunter-keywords-floating');
  const minBtn = document.getElementById('keyword-hunter-keywords-minimized');

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
  const checkTrans = document.getElementById(
    'keyword-hunter-show-translation'
  ) as HTMLInputElement | null;
  if (checkTrans) {
    addEventListener(checkTrans, 'change', () => {
      saveProcessStateToState();
      renderCopyDisplay();
    });
  }

  const translationModelSelect = document.getElementById('keyword-hunter-translation-model-select');
  if (translationModelSelect) {
    addEventListener(translationModelSelect, 'change', selectTranslationModel);
  }

  const refreshModelsBtn = document.getElementById('keyword-hunter-refresh-models-btn');
  if (refreshModelsBtn) {
    addEventListener(refreshModelsBtn, 'click', () => {
      void refreshTranslationModels();
    });
  }

  const goAnalysisBtn = document.getElementById('keyword-hunter-go-analysis-btn');
  if (goAnalysisBtn) {
    addEventListener(goAnalysisBtn, 'click', () => {
      void goToAnalysis();
    });
  }

  const translateBtn = document.getElementById('keyword-hunter-translate-btn');
  if (translateBtn) {
    addEventListener(translateBtn, 'click', () => {
      void translateCopyImmersive();
    });
  }

  const minimizeBtn = document.getElementById('keyword-hunter-minimize-keywords-btn');
  if (minimizeBtn) {
    addEventListener(minimizeBtn, 'click', () => {
      minimizeKeywordsWindow();
    });
  }

  const restoreBtn = document.getElementById('keyword-hunter-keywords-minimized');
  if (restoreBtn) {
    addEventListener(restoreBtn, 'click', () => {
      restoreKeywordsWindow();
    });
  }

  // 设置浮动窗口拖拽
  setupFloatingWindow();
}

function handleProcessMountError(error: unknown): never {
  ErrorService.handle(error as Error, {
    action: 'mountProcessModule',
    module: 'keywordHunter',
    notify: false,
  });
  throw error;
}

// ==========================================
// Module Exports (统一架构接口)
// ==========================================

class KeywordHunterProcessModule extends BaseModule {
  constructor() {
    super('keyword_hunter_process');
    // Module helpers need a stable handle for trackDomEvent/trackTimeout bridges.
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- lifecycle registry, not a closure alias
    processLifecycle = this;
  }

  /** Public bridge so module helpers can register auto-disposed listeners. */
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
      processViewVersion += 1;
      // 1. 使用 SafeTemplateLoader 加载模板
      const loader = SafeTemplateLoader.getInstance();
      const renderer = SafeRenderer.getInstance();

      const html = await loader.loadTemplate(
        'src/modules/app_center/views/keyword_hunter/process/template.html',
        {
          retryCount: 3,
          timeout: 5000,
          onError: error => {
            ErrorService.handle(error as Error, {
              action: 'loadProcessTemplate',
              module: 'keywordHunter',
              notify: false,
            });
          },
        }
      );
      if (!this.isCurrentMount(mountSignal)) return;

      // 使用 SafeRenderer 渲染模板
      // 添加淡入动画（在渲染前添加）
      container.classList.add('fade-in');
      renderer.renderTemplate(container, html);

      // 2. 将浮动窗口移到 body 级别(避免被容器限制)
      const floatWin = document.getElementById('keyword-hunter-keywords-floating');
      const minBtn = document.getElementById('keyword-hunter-keywords-minimized');

      // 如果浮动窗口不在 body 中，则移动到 body
      if (floatWin && floatWin.parentElement !== document.body) {
        document.body.appendChild(floatWin);
      }
      if (minBtn && minBtn.parentElement !== document.body) {
        document.body.appendChild(minBtn);
      }
    } catch (error) {
      if (!this.isCurrentMount(mountSignal)) return;
      handleProcessMountError(error);
    }
  }

  protected async init(): Promise<void> {
    const container = this.container;
    if (!container) return;

    try {
      // 3. 设置事件监听器
      setupEventListeners(container);

      // 4. 从内存 state 恢复状态（不自动回填历史快照）
      restoreProcessStateFromState();

      // 5. 管理浮动窗口显示 - 延迟执行确保 DOM 已渲染
      addTimeout(() => {
        manageFloatingWindowVisibility();
      }, 100);
    } catch (error) {
      handleProcessMountError(error);
    }
  }

  protected onUnmount(): void {
    try {
      processViewVersion += 1;
      // 1. 保存状态到 state
      saveProcessStateToState();

      // Listeners/timers already disposed by BaseModule.unmount; tear down body chrome.
      cleanupProcessSurface();
    } catch (error) {
      // Best-effort surface teardown even if state save failed mid-unmount.
      try {
        removeKeywordHunterFloatingChrome();
      } catch {
        // ignore secondary cleanup failures
      }
      ErrorService.handle(error as Error, {
        action: 'unmountProcessModule',
        module: 'keywordHunter',
        notify: false,
      });
    }
  }
}

const keywordHunterProcessModule = new KeywordHunterProcessModule();

export const mount = (container: HTMLElement): Promise<void> =>
  keywordHunterProcessModule.mount(container);
export const unmount = (): void => {
  keywordHunterProcessModule.unmount();
};

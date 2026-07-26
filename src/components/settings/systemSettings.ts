// src/components/settings/systemSettings.ts
// ================================================================
// 🎯 Phase 3: Alpine.js Refactor (TypeScript版本)
// ================================================================

import './systemSettings.css';
import { APP_EVENTS } from '@/common/constants/eventConstants';
import { getDangerousEndpoints } from '@/common/config/apiEndpoints';
import { EnvConfig } from '@/common/config/envConfig';
import {
  DEFAULT_LLM_PROVIDER_ID,
  DEFAULT_NEW_API_ENDPOINT,
  OLD_PRESET_MODEL_IDS,
  OBSOLETE_PRESET_MODEL_IDS,
  PROVIDERS,
  getLlmProviderConfig,
  type ModelFeature,
  type ProviderConfig,
} from '@/common/config/llmProviders';
import {
  DEFAULT_SCRAPER_PROXY_TYPE,
  SCRAPER_COMMERCIAL_PROXY_OPTIONS,
  SCRAPER_DIRECT_PROXY_OPTIONS,
  buildScraperProxyUrl,
  getScraperProxyDisplayName,
  getScraperProxyHintText,
  getScraperProxyInputLabel,
  getScraperProxyInputPlaceholder,
  scraperProxyNeedsInput,
  type ScraperProxyProviderConfig,
} from '@/common/config/scraperProxies';
import { showToast } from '@/common/ui';
import { formatLlmFailureUx, showLlmFailureToast } from '@/common/errors/llmFailureUx';
import { chooseWithModal, confirmWithModal } from '@/components/modal/confirmModal';
import { initEventLogger } from '@/common/utils/eventLogger';
import { downloadJson } from '@/common/utils/download';
import { escapeHtml, setSafeHtml } from '@/common/utils/security';
import { SECURE_STORAGE_SECURITY_BOUNDARY } from '@/common/utils/secureStorageBoundary';
import { fetchModelsFromApi, callLLM } from '@/services/llmService';
import {
  API_PATH_OPTIONS,
  DEFAULT_API_PATH_ID,
  DEFAULT_REASONING_EFFORTS,
  DEFAULT_REASONING_PREFS,
  buildFullApiUrl,
  clampEffort,
  isReasoningEffortLevel,
  normalizeApiPathId,
  normalizeReasoningUserPrefs,
  resolveModelCapability,
  shouldShowReasoningControls,
  type ApiPathId,
  type ApiPathOption,
  type ReasoningEffortLevel,
  type ReasoningUserPrefs,
  type ResolvedModelCapability,
} from '@/services/modelCapability';
import { StorageService, STORAGE_KEYS } from '@/services/storageService';
import {
  LocalDataStore,
  precheckLocalDataImportText,
  type LocalDataBucketId,
  type LocalDataExportSummary,
  type LocalDataUsage,
} from '@/services/localDataStore';
import { ErrorService } from '@/services/errorService';
import {
  TOOL_STRATEGY_TARGETS,
  getToolStrategySettings,
  getToolTargetDefaultModel,
  saveToolStrategySettings,
  setToolTargetDefaultModel,
  type ToolStrategySettings,
  type ToolStrategyTargetId,
} from '@/services/toolStrategyService';
import {
  DEFAULT_RUNTIME_STRATEGY_SETTINGS,
  getRuntimeStrategySettings,
  normalizeRuntimeStrategySettings,
  saveRuntimeStrategySettings,
  type RuntimeStrategySettings,
} from '@/services/runtimeStrategyService';
import {
  formatSchedulePreferenceHint,
  isSchedulingPreference,
  SCHEDULE_PREFERENCE_SHORT_LABELS,
  type SchedulingPreference,
} from '@/modules/app_center/views/master_analysis/ai_analysis/services/analysisScheduler';
import {
  getDeveloperDiagnosticSettings,
  updateDeveloperDiagnosticSetting,
  type DeveloperDiagnosticSettings,
  type DeveloperLogLevel,
} from '@/services/developerDiagnosticsService';
import { appStore } from '@/stores/useAppStore';
import type { ProxyConfig } from '@/types/modules-business';
import type { LLMProviderConfig } from '@/types/state';
import eventBus from '@/common/EventBus';
import { ApiError, isAppError } from '@/common/errors/AppError';
import {
  diffSettingsPartitions,
  snapshotSettingsPartitions,
  type SettingsDirtyPartition,
  type SettingsDirtySnapshot,
} from '@/components/settings/domain/settingsDirty';
import {
  evaluateSettingsHealth,
  isRuntimeRawInvalid,
  isStorageQuotaWarning,
} from '@/components/settings/domain/settingsHealth';
import {
  applySettingsDeepLink,
  expandSettingsFocusTarget,
  normalizeSettingsOpenOptions,
  type SettingsOpenOptions,
} from '@/components/settings/domain/settingsDeepLink';
import { findFirstSettingsSearchMatch } from '@/components/settings/domain/settingsSearch';
import {
  measureSettingsNavMarkers,
  pickActiveSettingsNavGroup,
  pickActiveSettingsNavId,
} from '@/components/settings/domain/settingsNavScroll';
import {
  applyRuntimePreset,
  isRuntimePresetId,
  type RuntimePresetId,
} from '@/components/settings/domain/settingsPresets';
import {
  evaluateExternalStorageChange,
  getSettingsRollbackCount,
  pushSettingsRollbackSnapshot,
  undoLastSettingsSave as popLastSettingsSave,
  type SettingsRollbackPartition,
} from '@/components/settings/domain/settingsRollback';
import { ThemeManager, THEME_PRESETS, type ColorMode } from '@/common/config/themeConfig';
import { animationSettingsStore, getAnimationSettings } from '@/stores/animation-settings';
import type { AnimationSpeed } from '@/types/animation-types';

export type { SettingsOpenOptions } from '@/components/settings/domain/settingsDeepLink';
export type { RuntimePresetId } from '@/components/settings/domain/settingsPresets';
export type { SettingsRollbackPartition } from '@/components/settings/domain/settingsRollback';

let alpineRetryCount = 0;

type CapabilityBadge = {
  id: string;
  label: string;
  active: boolean;
  title: string;
};

function pathIdToBadgeLabel(pathId: ApiPathId): string {
  if (pathId === 'responses') return 'Responses';
  if (pathId === 'anthropic_messages') return 'Messages';
  if (pathId === 'gemini_generate') return 'Gemini';
  return 'Chat';
}

/** Soft path/capability copy under API path select (extracted for complexity). */
function buildApiPathCapabilityHint(
  pathId: ApiPathId,
  registryCap: ResolvedModelCapability
): string {
  if (!registryCap.source.registryMatched) {
    return pathId === 'responses'
      ? '该模型尚未收录在能力目录：若网关没有 /responses，请求会自动回退到通用对话路径，您不必担心「完全连不上」。'
      : '';
  }
  const preferred = registryCap.apiSurface;
  if (pathId === 'responses' && preferred !== 'responses') {
    return `能力目录更常把此模型配在「${preferred}」。您已改选 Responses：请确认中转站已开通该路径；若 404，系统会回退通用对话。`;
  }
  if (pathId === 'chat_completions' && preferred === 'responses') {
    return '此模型目录默认偏好 Responses（推理摘要通道更完整）。Chat Completions 仍支持官方 tools / vision / structured。';
  }
  if (pathId === 'chat_completions') {
    return '当前为 Chat Completions 全量 Create：文本、流式、tools、vision、JSON 结构化均可用。';
  }
  return '';
}

/** R7 badges for settings model row (effective path + capability flags). */
function buildModelCapabilityBadges(
  pathId: ApiPathId,
  cap: ResolvedModelCapability
): CapabilityBadge[] {
  return [
    {
      id: 'path',
      label: pathIdToBadgeLabel(pathId),
      active: true,
      title: `当前请求路径：${pathId}`,
    },
    {
      id: 'reasoning',
      label: '推理',
      active: Boolean(cap.supportsReasoning && cap.mapRequest),
      title: cap.supportsReasoning
        ? `支持推理（档位：${cap.reasoningEfforts.join('/') || '—'}）`
        : '当前路径不支持推理字段',
    },
    {
      id: 'structured',
      label: '结构化',
      active: cap.supportsStructuredOutput,
      title: cap.supportsStructuredOutput
        ? '支持 Structured Outputs（response_format / text.format）'
        : '当前路径无结构化输出能力',
    },
    {
      id: 'tools',
      label: 'Tools',
      active: cap.supportsTools,
      title: cap.supportsTools ? '支持 function / tools 请求' : '当前路径不声明 tools',
    },
    {
      id: 'vision',
      label: 'Vision',
      active: cap.supportsVision,
      title: cap.supportsVision ? '支持多模态图片输入' : '当前路径不声明 vision',
    },
    {
      id: 'chain',
      label: '多轮链',
      active: cap.supportsPreviousResponseId,
      title: cap.supportsPreviousResponseId
        ? '支持 previous_response_id 多轮（Deep Chat 可链式）'
        : '当前路径不支持 previous_response_id（网关 fail-closed，默认禁用；多轮改发完整 transcript / tool item 回放）',
    },
    {
      id: 'builtin',
      label: '内置工具',
      active: cap.supportsBuiltInTools,
      title: cap.supportsBuiltInTools
        ? '支持 web_search 等 built-in tools 透传'
        : '当前路径不声明 built-in tools',
    },
  ];
}

// ==========================================
// 类型定义
// ==========================================

interface LLMState {
  provider: string;
  endpoint: string;
  apiKey: string;
  model: string;
  models: ModelOption[];
  serviceTier?: LLMProviderConfig['serviceTier'];
  reasoningPrefs: ReasoningUserPrefs;
  /** Default call path next to endpoint (URL + path layout). */
  apiPath: ApiPathId;
  showKey: boolean;
  isFetching: boolean;
  isTesting: boolean;
}

interface ProxyState {
  type: string;
  customUrl: string;
  showKey: boolean;
  savedKeyMap: Record<string, string>;
  /** UI-only: proxy connectivity probe in progress */
  isTesting: boolean;
  /** UI-only: last probe error (empty when clear/ok) */
  testError: string;
  /** UI-only: last probe message (success or failure) */
  testMessage: string;
  /** UI-only: '', 'ok', 'error', 'testing' */
  status: string;
}

/** Lightweight public URL used only to exercise the configured proxy path. */
const PROXY_PROBE_TARGET_URL = 'https://www.example.com/';

interface ToolStrategyState {
  targetModels: Record<ToolStrategyTargetId, string>;
  isSaving: boolean;
}

interface RuntimeStrategyState {
  settings: RuntimeStrategySettings;
  isSaving: boolean;
}

interface SettingsPanelData {
  isOpen: boolean;
  /** In-panel search query (P1-3) */
  searchQuery: string;
  /** Last search hit id (section or focus target) */
  searchHitId: string;
  /** Appearance: current theme id (instant apply; not dirty) */
  appearanceThemeId: string;
  /** Appearance: color mode preference light|dark|system (instant; not dirty) */
  appearanceColorMode: ColorMode;
  /** Appearance: animations master switch */
  appearanceAnimationsEnabled: boolean;
  /** Appearance: animation speed */
  appearanceAnimationSpeed: AnimationSpeed;
  /** Appearance: respect prefers-reduced-motion */
  appearanceRespectSystemPreference: boolean;
  /** Last applied runtime preset id (UI highlight only; not persisted) */
  activeRuntimePresetId: RuntimePresetId | null;
  /** API path custom dropdown open state */
  llmApiPathMenuOpen: boolean;
  schedulePreferenceMenuOpen: boolean;
  llm: LLMState;
  proxy: ProxyState;
  toolStrategy: ToolStrategyState;
  runtimeStrategy: RuntimeStrategyState;
  developerDiagnostics: DeveloperDiagnosticSettings;
  currentProviderConfig: ProviderConfig | Record<string, never>;
  llmProviderOptions: LLMProviderOption[];
  defaultLlmEndpoint: string;
  commercialProxyOptions: readonly ScraperProxyProviderConfig[];
  directProxyOptions: readonly ScraperProxyProviderConfig[];
  activeModelInfo: ModelMetadata | null;
  activeModelCapability: import('@/services/modelCapability').ResolvedModelCapability | null;
  showReasoningControls: boolean;
  reasoningEffortOptions: ReasoningEffortLevel[];
  clampReasoningPrefsToActiveModel(options?: {
    announce?: boolean;
    /** Persist demoted effort so storage does not re-toast every open. */
    persist?: boolean;
  }): boolean;
  apiPathOptions: readonly ApiPathOption[];
  fullApiUrlPreview: string;
  apiPathCapabilityHint: string;
  llmSetupReadinessText: string;
  selectedApiPathDescription: string;
  selectedApiPathOption: ApiPathOption | undefined;
  selectedApiPathPathLabel: string;
  selectedApiPathNameLabel: string;
  reasoningEffortLabel: string;
  reasoningEffortButtonLabel(level: string): string;
  modelCapabilityBadges: Array<{
    id: string;
    label: string;
    active: boolean;
    title: string;
  }>;
  isProduction: boolean;
  localData: {
    usage: LocalDataUsage | null;
    isBusy: boolean;
    clearingBucketId: LocalDataBucketId | null;
    cleanupItemsExpanded: boolean;
    /** Selected bucket ids for partial export (advanced). Empty means full export. */
    selectedExportBuckets: LocalDataBucketId[];
  };
  showDangerousEndpointWarning: boolean;
  proxyNeedsInput: boolean;
  proxyInputLabel: string;
  proxyInputPlaceholder: string;
  llmApiKeyInputType: string;
  llmApiKeyIconClass: string;
  llmApiKeyVisibilityLabel: string;
  modelSelectDisabled: boolean;
  fetchModelsIconClass: string;
  fetchModelsText: string;
  activeContextText: string;
  activeFeaturesText: string;
  activeFeatureBadges: ModelFeatureBadge[];
  toolStrategyProviderLabel: string;
  toolStrategyModelSelectDisabled: boolean;
  toolStrategyTargetItems: ToolStrategyTargetView[];
  toolStrategyTargetItemsByIds(targetIds: ToolStrategyTargetId[]): ToolStrategyTargetView[];
  toolStrategySaveText: string;
  toolStrategySaveIconClass: string;
  runtimeStrategySaveText: string;
  runtimeStrategySaveIconClass: string;
  runtimeTestConnectionTimeoutSeconds: number;
  runtimeAnalysisTimeoutSeconds: number;
  runtimeDeepChatTimeoutSeconds: number;
  masterAnalysisBudgetItems: RuntimeNumberFieldView[];
  ppcThresholdItems: RuntimeNumberFieldView[];
  showDeveloperDiagnostics: boolean;
  developerDangerousEndpointText: string;
  testConnectionIconClass: string;
  testConnectionText: string;
  proxyInputType: string;
  proxyKeyIconClass: string;
  proxyKeyVisibilityLabel: string;
  proxyHintText: string;
  localSecretBoundaryText: string;
  localStorageUsedText: string;
  localStorageKeysText: string;
  indexedDbUsedText: string;
  indexedDbKeysText: string;
  localDataCleanupSummaryText: string;
  localDataCleanupToggleText: string;
  localDataCleanupToggleIconClass: string;
  localDataBucketItems: LocalDataBucketView[];
  _unsubscribers?: Array<() => void>; // EventBus / window 订阅清理
  /** True after EventBus/window/$watch subscriptions are registered once. */
  _subscriptionsInitialized?: boolean;
  _settingsBaseline: SettingsDirtySnapshot | null;
  _runtimeHealthNormalized: boolean;
  healthMessages: string[];
  dirtyPartitions: SettingsDirtyPartition[];
  /** P2-4: another tab changed settings keys */
  externalChangeNotice: boolean;
  /** P2-4: dirty when external change arrived (conflict; no auto-reload) */
  externalChangeConflict: boolean;
  /** P2-5: localStorage usage / assumed 5MB limit */
  storageUsageRatio: number | undefined;
  /** P2-5: quota status bar visibility */
  quotaWarningVisible: boolean;
  /** P2-3: undo available for runtime partition */
  canUndoRuntimeSave: boolean;
  init(): void;
  open(options?: SettingsOpenOptions): Promise<void>;
  close(): Promise<void>;
  destroy(): void; // 新增：清理方法
  captureSettingsBaseline(): void;
  refreshSettingsHealth(): void;
  refreshRollbackUi(): void;
  handleStorageEvent(event: StorageEvent): void;
  dismissExternalChangeNotice(): void;
  reloadFromExternalChange(): Promise<void>;
  undoLastSettingsSave(partition: SettingsRollbackPartition): Promise<void>;
  openPerformanceMonitor(): Promise<void>;
  loadProviderConfig(provider: string): Promise<void>;
  fetchModels(): Promise<void>;
  testConnection(): Promise<void>;
  saveProviderConfig(): Promise<void>;
  autoSaveProviderConfig(successToast: string, options?: { silent?: boolean }): Promise<void>;
  loadToolStrategyDefaults(): void;
  saveToolStrategy(): Promise<void>;
  loadRuntimeStrategy(): void;
  persistRuntimeStrategySettings(options?: { toast?: string }): Promise<void>;
  saveRuntimeStrategy(): Promise<void>;
  resetRuntimeStrategy(): void;
  loadProxyConfig(): Promise<void>;
  saveProxyConfig(): Promise<void>;
  testProxyConnection(): Promise<void>;
  setLlmProvider(event: Event): void;
  setLlmEndpoint(event: Event): void;
  setLlmApiPath(event: Event): void;
  setLlmApiPathId(id: string): void;
  setLlmApiKey(event: Event): void;
  setLlmModel(event: Event): void;
  setLlmServiceTier(event: Event): void;
  setReasoningEnabled(event: Event): void;
  setReasoningEffort(event: Event): void;
  setReasoningEffortLevel(level: ReasoningEffortLevel | string): void;
  setToolTargetModel(targetId: ToolStrategyTargetId, event: Event): void;
  getRuntimeNumber(path: string, divisor?: number): number;
  getRuntimeBoolean(path: string): boolean;
  setRuntimeNumber(path: string, event: Event, multiplier?: number): void;
  setRuntimeBoolean(path: string, event: Event): void;
  setRuntimeString(path: string, event: Event): void;
  setMasterAnalysisSchedulePreference(preference: SchedulingPreference): void;
  masterAnalysisScheduleOptions: Array<{
    value: SchedulingPreference;
    label: string;
    hint: string;
  }>;
  masterAnalysisScheduleSelectedLabel: string;
  masterAnalysisScheduleSelectedHint: string;
  setDeveloperDiagnosticBoolean(
    key: keyof Omit<DeveloperDiagnosticSettings, 'loggerMinLevel'>,
    event: Event
  ): void;
  setDeveloperDiagnosticLogLevel(event: Event): void;
  setProxyType(event: Event): void;
  setProxyCustomUrl(event: Event): void;
  toggleLlmKeyVisibility(): void;
  toggleProxyKeyVisibility(): void;
  getModelValue(model: ModelOption): string;
  getModelLabel(model: ModelOption): string;
  isModelSelected(model: ModelOption): boolean;
  refreshLocalDataUsage(): Promise<void>;
  isPartialLocalDataExport: boolean;
  exportLocalDataButtonText: string;
  exportLocalData(): Promise<void>;
  importLocalData(): Promise<void>;
  toggleLocalDataCleanupItems(): void;
  isExportBucketSelected(bucketId: LocalDataBucketId): boolean;
  toggleExportBucket(bucketId: LocalDataBucketId): void;
  selectAllExportBuckets(): void;
  clearExportBucketSelection(): void;
  clearLocalCache(): Promise<void>;
  clearLocalDataBucket(bucketId: LocalDataBucketId): Promise<void>;
  clearAllLocalData(): Promise<void>;
  scrollToSection(sectionId: string): void;
  scrollToElementInPanel(el: HTMLElement): void;
  navOpenGroup: string | null;
  activeNavTargetId: string | null;
  _navScrollUnbind: (() => void) | null;
  _navScrollPauseUntil: number;
  isNavGroupOpen(groupId: string): boolean;
  isNavTargetCurrent(targetId: string): boolean;
  bindSettingsNavScrollSpy(): void;
  unbindSettingsNavScrollSpy(): void;
  updateActiveNavFromScroll(): void;
  toggleNavGroup(groupId: string, sectionId: string): void;
  navigateToNavTarget(targetId: string, groupId?: string): void;
  onSettingsSearch(event?: Event): void;
  scrollToSearchHit(hitId: string): void;
  loadAppearanceSettings(): void;
  setAppearanceTheme(themeId: string): void;
  setAppearanceThemeFromEvent(event: Event): void;
  setAppearanceColorMode(mode: ColorMode): void;
  setAppearanceAnimationsEnabled(event: Event): void;
  setAppearanceAnimationSpeed(speed: AnimationSpeed): void;
  setAppearanceRespectSystemPreference(event: Event): void;
  applyRuntimePresetById(id: RuntimePresetId | string): void;
  formatBytes(bytes: number): string;
  getProxyDisplayName(type: string): string;
  isDangerousEndpoint(endpoint: string): boolean;
  appearanceThemeOptions: Array<{ id: string; name: string; description?: string }>;
}

interface AlpineWatchContext {
  $watch<T = unknown>(property: string, callback: (value: T) => void): void;
}

type ModelMetadata = {
  id: string;
  name?: string;
  context?: number;
  features?: string[];
};
type ModelOption = string | ModelMetadata;
type SavedLLMConfig = Partial<LLMProviderConfig> | null;

interface LLMProviderOption {
  id: string;
  name: string;
  label: string;
}

interface ModelFeatureBadge {
  key: string;
  label: string;
  icon: string;
}

interface ToolStrategyTargetView {
  id: ToolStrategyTargetId;
  label: string;
  description: string;
  modelHint: string;
  model: string;
  resolvedModel: string;
}

interface RuntimeNumberFieldView {
  key: string;
  label: string;
  path: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
}

interface LocalDataBucketMeta {
  label: string;
  description: string;
  icon: string;
  iconClass: string;
  buttonClass: string;
  actionLabel: string;
  confirmMessage: string | null;
}

interface LocalDataBucketView extends LocalDataBucketMeta {
  id: LocalDataBucketId;
  usedText: string;
  keysText: string;
  percentText: string;
  percentWidth: string;
  percentValue: number;
  isEmpty: boolean;
  isClearing: boolean;
}

const MODEL_FEATURE_LABELS: Record<ModelFeature, string> = {
  chat: '对话',
  vision: '视觉',
  audio: '音频',
  video: '视频',
  function: '函数调用',
  structured: '结构化输出',
  streaming: '流式输出',
  reasoning: '推理',
  code: '代码',
  'long-context': '长上下文',
};

const MODEL_FEATURE_ICONS: Record<ModelFeature, string> = {
  chat: 'fa-comments',
  vision: 'fa-eye',
  audio: 'fa-volume-high',
  video: 'fa-video',
  function: 'fa-plug',
  structured: 'fa-table-cells-large',
  streaming: 'fa-bolt',
  reasoning: 'fa-brain',
  code: 'fa-code',
  'long-context': 'fa-expand-alt',
};

const LLM_TEST_CONNECTION_MAX_TOKENS = 32;

const ALL_LOCAL_DATA_BUCKET_IDS: LocalDataBucketId[] = [
  'config',
  'secrets',
  'workspace-state',
  'scrape-history',
  'chat-history',
  'keyword-history',
  'cache',
  'other',
];

const LOCAL_DATA_BUCKET_META: Record<LocalDataBucketId, LocalDataBucketMeta> = {
  config: {
    label: '系统配置与偏好',
    description: 'AI 连接、工具策略、网络、布局和功能开关',
    icon: 'fa-sliders-h',
    iconClass: 'bg-blue-50 text-blue-600 ring-blue-100',
    buttonClass: 'border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100',
    actionLabel: '清理配置',
    confirmMessage: '这会删除模型、网络、布局和偏好配置，保留历史、聊天与缓存。继续？',
  },
  secrets: {
    label: '密钥与凭据',
    description: '浏览器本地加密保存的 API Key 与代理凭据',
    icon: 'fa-key',
    iconClass: 'bg-amber-50 text-amber-600 ring-amber-100',
    buttonClass: 'border-amber-100 bg-amber-50 text-amber-700 hover:bg-amber-100',
    actionLabel: '清理密钥',
    confirmMessage: '这会删除本浏览器保存的 API Key，之后需要重新配置。继续？',
  },
  'workspace-state': {
    label: '工作台临时状态',
    description: '页面状态、草稿、PromptLab 与关键词工具工作区',
    icon: 'fa-layer-group',
    iconClass: 'bg-cyan-50 text-cyan-600 ring-cyan-100',
    buttonClass: 'border-cyan-100 bg-cyan-50 text-cyan-700 hover:bg-cyan-100',
    actionLabel: '清理状态',
    confirmMessage:
      '这会重置本浏览器保存的工作台状态、草稿和工具输入，但保留模型配置、密钥、采集历史、聊天和缓存。继续？',
  },
  'scrape-history': {
    label: '采集与报告历史',
    description: '商品采集结果、导入记录和历史报告',
    icon: 'fa-clock-rotate-left',
    iconClass: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    buttonClass: 'border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    actionLabel: '清理历史',
    confirmMessage: '这会删除本浏览器中的采集历史和历史报告，建议先导出备份。继续？',
  },
  'chat-history': {
    label: 'Deep Chat 聊天记录',
    description: 'Deep Chat 对话线程和消息上下文',
    icon: 'fa-comments',
    iconClass: 'bg-violet-50 text-violet-600 ring-violet-100',
    buttonClass: 'border-violet-100 bg-violet-50 text-violet-700 hover:bg-violet-100',
    actionLabel: '清理聊天',
    confirmMessage: '这会删除 Deep Chat 本地聊天线程，建议先导出备份。继续？',
  },
  'keyword-history': {
    label: 'Keyword Hunter 历史',
    description: 'Keyword Hunter 快照、对比记录和迁移备份',
    icon: 'fa-magnifying-glass-chart',
    iconClass: 'bg-teal-50 text-teal-600 ring-teal-100',
    buttonClass: 'border-teal-100 bg-teal-50 text-teal-700 hover:bg-teal-100',
    actionLabel: '清理关键词',
    confirmMessage: '这会删除 Keyword Hunter 本地快照和历史对比记录，建议先导出备份。继续？',
  },
  cache: {
    label: '缓存',
    description: '页面模板、HTTP 响应和 AI 分析缓存',
    icon: 'fa-broom',
    iconClass: 'bg-slate-100 text-slate-600 ring-slate-200',
    buttonClass: 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
    actionLabel: '清理缓存',
    confirmMessage: null,
  },
  other: {
    label: '未归类数据（谨慎）',
    description: '尚未归类的本地业务数据，清理前建议先导出备份',
    icon: 'fa-box-archive',
    iconClass: 'bg-rose-50 text-rose-600 ring-rose-100',
    buttonClass: 'border-rose-100 bg-rose-50 text-rose-700 hover:bg-rose-100',
    actionLabel: '谨慎清理',
    confirmMessage: '这会删除尚未归类的本地数据，可能影响部分模块状态。建议先导出备份。继续？',
  },
};

const MASTER_ANALYSIS_BUDGET_FIELDS = [
  { key: 'title-keywords', label: '标题关键词', min: 1024, max: 32000, step: 512 },
  { key: 'selling-points', label: '卖点提炼', min: 1024, max: 32000, step: 512 },
  { key: 'fatal-flaws', label: '致命缺陷', min: 1024, max: 32000, step: 512 },
  { key: 'wow-moments', label: 'Wow Moments', min: 1024, max: 32000, step: 512 },
  { key: 'hesitation-points', label: '犹豫点', min: 1024, max: 32000, step: 512 },
  { key: 'buyer-profile', label: '买家画像', min: 1024, max: 32000, step: 512 },
  { key: 'vocab-gap', label: '词汇差距', min: 1024, max: 32000, step: 512 },
  { key: 'promise-reality', label: '承诺落差', min: 1024, max: 32000, step: 512 },
] as const;

const PPC_THRESHOLD_FIELDS = [
  {
    key: 'targetAcos',
    label: '目标 ACOS %',
    path: 'ppcSearchTerms.thresholds.targetAcos',
    min: 1,
    max: 200,
    step: 1,
  },
  {
    key: 'highAcos',
    label: '高 ACOS %',
    path: 'ppcSearchTerms.thresholds.highAcos',
    min: 1,
    max: 300,
    step: 1,
  },
  {
    key: 'minClicksNoOrder',
    label: '无单点击',
    path: 'ppcSearchTerms.thresholds.minClicksNoOrder',
    min: 1,
    max: 1000,
    step: 1,
  },
  {
    key: 'minSpendNoOrder',
    label: '无单花费',
    path: 'ppcSearchTerms.thresholds.minSpendNoOrder',
    min: 1,
    max: 100000,
    step: 1,
  },
  {
    key: 'minOrdersHarvest',
    label: '收割订单',
    path: 'ppcSearchTerms.thresholds.minOrdersHarvest',
    min: 1,
    max: 1000,
    step: 1,
  },
  {
    key: 'minCtr',
    label: '低 CTR %',
    path: 'ppcSearchTerms.thresholds.minCtr',
    min: 0,
    max: 100,
    step: 0.05,
  },
] as const;

function registerSettingsWatchers(panel: SettingsPanelData & AlpineWatchContext): void {
  panel.$watch('llm.provider', (val: string) => panel.loadProviderConfig(val));
  panel.$watch('proxy.type', (val: string) => {
    panel.proxy.customUrl = panel.proxy.savedKeyMap[val] || '';
  });
}

async function resetAppStoreRuntimeState(): Promise<void> {
  const state = appStore.getState();

  state.resetScraper();
  state.resetAnalysis();
  state.resetPromptLab();
  state.resetKeywordTracker();
}

async function resetWorkspaceRuntimeState(): Promise<void> {
  await resetAppStoreRuntimeState();

  await LocalDataStore.clearBucket('workspace-state');
}

async function syncLocalDataRuntimeAfterBucketClear(bucketId: LocalDataBucketId): Promise<void> {
  if (bucketId === 'workspace-state') {
    await resetWorkspaceRuntimeState();
    return;
  }

  if (bucketId === 'scrape-history') {
    const { HistoryService } =
      await import('../../modules/app_center/views/master_analysis/services/historyService');
    await HistoryService.clearAsync();
    return;
  }

  if (bucketId === 'chat-history') {
    const { clearDeepChatThreadStore } =
      await import('../../modules/app_center/views/playground/deep-chat');
    await clearDeepChatThreadStore();
    return;
  }

  if (bucketId === 'keyword-history') {
    const { KeywordHunterSnapshotService } =
      await import('../../modules/app_center/views/keyword_hunter/services/snapshotService');
    await KeywordHunterSnapshotService.clearAsync();
  }
}

async function clearLocalDataBucketWithRuntimeSync(bucketId: LocalDataBucketId): Promise<number> {
  const removed = await LocalDataStore.clearBucket(bucketId);
  try {
    await syncLocalDataRuntimeAfterBucketClear(bucketId);
  } catch (error) {
    ErrorService.handle(error as Error, {
      action: 'syncLocalDataRuntimeAfterBucketClear',
      module: 'settings',
      notify: false,
    });
  }
  return removed;
}

async function syncRuntimeAfterClearAllLocalData(): Promise<void> {
  try {
    await resetAppStoreRuntimeState();
  } catch (error) {
    ErrorService.handle(error as Error, {
      action: 'resetAppStoreRuntimeState',
      module: 'settings',
      notify: false,
    });
  }

  const runtimeBuckets: LocalDataBucketId[] = ['scrape-history', 'chat-history', 'keyword-history'];
  for (const bucketId of runtimeBuckets) {
    try {
      await syncLocalDataRuntimeAfterBucketClear(bucketId);
    } catch (error) {
      ErrorService.handle(error as Error, {
        action: 'syncRuntimeAfterClearAllLocalData',
        module: 'settings',
        notify: false,
      });
    }
  }

  await LocalDataStore.clearBucket('workspace-state');
}

const LOCAL_DATA_EXPORT_SIZE_WARN_BYTES = 2 * 1024 * 1024;

function reloadAfterLocalDataChange(): void {
  window.setTimeout(() => window.location.reload(), 800);
}

function confirmSettingsAction(
  title: string,
  content: string,
  confirmLabel = '确认'
): Promise<boolean> {
  return confirmWithModal(title, content, '', confirmLabel);
}

/** Plain partition payloads for dirty detection (excludes UI-only flags). */
function buildSettingsDirtyInput(panel: {
  llm: LLMState;
  toolStrategy: ToolStrategyState;
  runtimeStrategy: RuntimeStrategyState;
  proxy: ProxyState;
}): {
  llm: unknown;
  toolStrategy: unknown;
  runtime: unknown;
  proxy: unknown;
  appearance: unknown;
} {
  return {
    llm: {
      provider: panel.llm.provider,
      endpoint: panel.llm.endpoint,
      model: panel.llm.model,
      apiKey: panel.llm.apiKey,
      serviceTier: panel.llm.serviceTier,
      reasoningPrefs: panel.llm.reasoningPrefs,
      apiPath: panel.llm.apiPath,
    },
    toolStrategy: panel.toolStrategy.targetModels,
    runtime: panel.runtimeStrategy.settings,
    proxy: {
      type: panel.proxy.type,
      customUrl: panel.proxy.customUrl,
    },
    // Appearance is instant-write (theme/animation stores); never discard-dirty — Spec §5.5
    appearance: {},
  };
}

function formatLocalDataBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function applyProxyProbeFailure(
  proxy: ProxyState,
  message: string,
  toastType: 'warning' | 'error' = 'error'
): void {
  proxy.testError = message;
  proxy.testMessage = message;
  proxy.status = 'error';
  showToast(message, { type: toastType });
}

function applyProxyProbeSuccess(proxy: ProxyState): void {
  proxy.status = 'ok';
  proxy.testError = '';
  proxy.testMessage = '代理连接成功';
  showToast('代理连接成功', { type: 'success' });
}

function formatProxyProbeError(error: unknown): string {
  const raw = error instanceof Error ? error.message : '代理连接失败';
  if (error instanceof Error && (error.name === 'AbortError' || /timeout|aborted/i.test(raw))) {
    return '代理连接超时';
  }
  return raw || '代理连接失败';
}

function buildAutoSaveLlmConfig(
  llm: LLMState,
  previous: Partial<LLMProviderConfig> | null
): LLMProviderConfig {
  const serviceTier = llm.serviceTier || previous?.serviceTier;
  return {
    provider: llm.provider,
    endpoint: llm.endpoint || previous?.endpoint || '',
    model: llm.model || previous?.model || '',
    models: llm.models?.length ? llm.models : previous?.models,
    ...(serviceTier ? { serviceTier } : {}),
    reasoningPrefs: normalizeReasoningUserPrefs(llm.reasoningPrefs),
    apiPath: normalizeApiPathId(llm.apiPath || previous?.apiPath),
    enabled: true,
    apiKey: '',
  };
}

function buildLocalDataExportConfirm(selectedBuckets: string[] | undefined): {
  title: string;
  content: string;
} {
  if (selectedBuckets) {
    return {
      title: '导出分桶本地数据',
      content: `将仅导出已选分类（${selectedBuckets.join('、')}）。备份可能仍含敏感本地数据。${SECURE_STORAGE_SECURITY_BOUNDARY} 请仅保存在可信位置。继续导出？`,
    };
  }
  return {
    title: '导出本地数据',
    content: `导出的备份文件可能包含本地加密的 API Key、代理凭据、配置和历史记录等敏感本地数据。${SECURE_STORAGE_SECURITY_BOUNDARY} 请仅保存在可信位置。继续导出？`,
  };
}

function buildLocalDataImportChoiceContent(summary: LocalDataExportSummary): string {
  const lines = [
    '请选择导入方式。取消不会修改当前数据。',
    '',
    `导出时间：${summary.exportedAt}`,
    `存储版本：${summary.storageVersion}`,
    `localStorage：${summary.localStorageKeys} 项`,
    `IndexedDB：${summary.indexedDbRecords} 条记录`,
    `预估体积：约 ${formatLocalDataBytes(summary.estimatedBytes)}`,
    summary.includesSecrets
      ? '包含密钥/凭据：是（备份中可能含本地加密 API Key 或代理凭据）'
      : '包含密钥/凭据：否',
    '',
    '完整恢复：先清空当前本地数据，再写入备份（与备份一致）。',
    '合并导入：保留当前备份外的本地数据，用备份覆盖同名项。',
  ];
  return lines.join('\n');
}

function getModelId(model: ModelOption): string {
  return typeof model === 'string' ? model : model.id;
}

function dedupeModels(models: ModelOption[]): ModelOption[] {
  const seen = new Set<string>();
  return models.filter(model => {
    const id = getModelId(model);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function resolveProviderEndpoint(
  provider: string,
  config: ProviderConfig,
  savedEndpoint: string
): string {
  const shouldUseNewApiDefault =
    provider === DEFAULT_LLM_PROVIDER_ID &&
    (!savedEndpoint || savedEndpoint === '/v1' || savedEndpoint === '/v1/');
  return shouldUseNewApiDefault ? config.endpoint : savedEndpoint || config.endpoint || '';
}

async function loadProviderApiKey(provider: string, savedConfig: SavedLLMConfig): Promise<string> {
  try {
    const key = await StorageService.getSecure(`llm_key_${provider}`, '');
    return key || '';
  } catch {
    return savedConfig && 'apiKey' in savedConfig ? savedConfig.apiKey || '' : '';
  }
}

function getRawProviderModels(savedConfig: SavedLLMConfig, config: ProviderConfig): ModelOption[] {
  const savedModels = savedConfig?.models as ModelOption[] | undefined;
  if (!savedModels || savedModels.length === 0) return config.models;

  const savedModelIds = savedModels.map(getModelId);
  const isObsoletePreset =
    savedModelIds.some(id => OBSOLETE_PRESET_MODEL_IDS.has(id)) &&
    savedModelIds.every(id => OLD_PRESET_MODEL_IDS.has(id));
  return isObsoletePreset ? config.models : savedModels;
}

function getInitialModel(savedModel: string | undefined, models: ModelOption[]): string {
  if (savedModel) return savedModel;
  const first = models[0];
  return first ? getModelId(first) : '';
}

function createEmptyToolTargetModels(): Record<ToolStrategyTargetId, string> {
  return TOOL_STRATEGY_TARGETS.reduce(
    (acc, target) => {
      acc[target.id] = '';
      return acc;
    },
    {} as Record<ToolStrategyTargetId, string>
  );
}

function millisecondsToSeconds(milliseconds: number): number {
  return Math.round(milliseconds / 1000);
}

function getInputNumber(event: Event): number {
  return Number((event.target as HTMLInputElement).value);
}

function getRuntimePathValue(settings: RuntimeStrategySettings, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => {
    if (value && typeof value === 'object') {
      return (value as Record<string, unknown>)[key];
    }
    return undefined;
  }, settings);
}

function setRuntimePathValue(
  settings: RuntimeStrategySettings,
  path: string,
  value: string | number | boolean
): void {
  const keys = path.split('.');
  const lastKey = keys.pop();
  if (!lastKey) return;

  let target: Record<string, unknown> = settings as unknown as Record<string, unknown>;
  keys.forEach(key => {
    const next = target[key];
    if (!next || typeof next !== 'object') {
      target[key] = {};
    }
    target = target[key] as Record<string, unknown>;
  });
  target[lastKey] = value;
}

function findPresetModelInfo(provider: string, modelId: string): ModelMetadata | null {
  const config = getLlmProviderConfig(provider);
  if (!config) return null;
  return config.models.find(model => model.id === modelId) || null;
}

function mergeModelMetadata(
  model: ModelMetadata | null,
  preset: ModelMetadata | null
): ModelMetadata | null {
  if (!model) return preset;
  if (!preset) return model;
  return {
    ...model,
    context: preset.context || model.context,
    features: preset.features && preset.features.length > 0 ? preset.features : model.features,
  };
}

function formatModelContext(context: number): string {
  if (!Number.isFinite(context) || context <= 0) return '';
  if (context >= 1000000) {
    return `${Number((context / 1000000).toFixed(2))}M`;
  }
  return `${Number((context / 1000).toFixed(1))}K`;
}

function getFeatureLabel(feature: string): string {
  return MODEL_FEATURE_LABELS[feature as ModelFeature] || feature;
}

function getFeatureIcon(feature: string): string {
  return MODEL_FEATURE_ICONS[feature as ModelFeature] || 'fa-star';
}

function formatModelFeatures(features: unknown): string {
  if (!Array.isArray(features) || features.length === 0) return '基础';
  return features.map(feature => getFeatureLabel(String(feature))).join('、');
}

function getModelFeatureBadges(features: unknown): ModelFeatureBadge[] {
  if (!Array.isArray(features) || features.length === 0) {
    return [{ key: 'basic', label: '基础能力', icon: 'fa-message' }];
  }

  return features.map(feature => {
    const key = String(feature);
    return {
      key,
      label: getFeatureLabel(key),
      icon: getFeatureIcon(key),
    };
  });
}

function validateModelFetchInput(llm: LLMState): string | null {
  if (!llm.endpoint) return '请先输入API端点地址';
  if (isLLMApiKeyRequired(llm) && !llm.apiKey) return '请先输入 API Key';
  return null;
}

function isLLMApiKeyRequired(llm: LLMState): boolean {
  return Boolean(llm.endpoint);
}

function assertFetchedModels(models: ModelOption[], provider: string): void {
  if (models.length > 0) return;
  throw new ApiError('未能获取到有效模型列表，请检查API配置和网络连接', 'SETTINGS_001', {
    context: { module: 'SystemSettings', action: 'fetchModels', provider },
  });
}

type PanelWithReasoningClamp = SettingsPanelData & {
  clampReasoningPrefsToActiveModel?: (options?: {
    announce?: boolean;
    persist?: boolean;
  }) => boolean;
};

function applyFetchedModels(panel: PanelWithReasoningClamp, models: ModelOption[]): void {
  panel.llm.models = dedupeModels(models);

  const currentModelExists = panel.llm.models.some(model => getModelId(model) === panel.llm.model);
  if (currentModelExists) return;

  const firstModel = panel.llm.models[0];
  if (firstModel) {
    panel.llm.model = getModelId(firstModel);
    // Model id changed — re-clamp effort to the new allowlist (AC3 closed loop).
    panel.clampReasoningPrefsToActiveModel?.({ announce: true, persist: true });
  }
}

const MODEL_FETCH_ERROR_RULES: ReadonlyArray<{ test: (message: string) => boolean; text: string }> =
  [
    {
      test: message => message.includes('HTTP 401') || message.includes('Unauthorized'),
      text: 'API Key 无效或已过期，请检查配置',
    },
    {
      test: message => message.includes('HTTP 403') || message.includes('Forbidden'),
      text: 'API Key 没有访问权限，请检查配置',
    },
    {
      test: message => message.includes('HTTP 429') || /rate limit/i.test(message),
      text: '请求过于频繁，请稍后再试',
    },
    {
      test: message => message.includes('HTTP 404'),
      text: 'API端点地址不正确，请检查配置',
    },
    {
      test: message => message.includes('Failed to fetch') || message.includes('NetworkError'),
      text: '网络连接失败，请检查网络或端点地址',
    },
    {
      test: message => message.includes('timeout') || message.includes('AbortError'),
      text: '请求超时，请检查网络连接',
    },
  ];

function getModelFetchErrorMessage(error: Error): string {
  const message = error.message;
  return MODEL_FETCH_ERROR_RULES.find(rule => rule.test(message))?.text ?? message;
}

function notifyModelFetchFailure(error: Error): void {
  const mapped = getModelFetchErrorMessage(error);
  const signal = `${mapped} ${error.message}`;
  // Prefer unified actionable UX for known auth/rate/timeout; keep prefix for other failures.
  if (/401|Unauthorized|API Key 无效|API_INVALID_KEY/i.test(signal)) {
    const payload = isAppError(error)
      ? error
      : Object.assign(new Error(mapped), { code: 'API_INVALID_KEY' });
    showLlmFailureToast(payload);
    return;
  }
  if (/429|rate limit|过于频繁|API_RATE_LIMIT/i.test(signal)) {
    const payload = isAppError(error)
      ? error
      : Object.assign(new Error(mapped), { code: 'API_RATE_LIMIT' });
    showLlmFailureToast(payload);
    return;
  }
  const ux = formatLlmFailureUx(error);
  if (
    ux.code === 'LLM_TIMEOUT' ||
    ux.code === 'NET_TIMEOUT' ||
    /超时|timeout|AbortError/i.test(signal)
  ) {
    showLlmFailureToast(error, { titlePrefix: '获取模型失败: ' });
    return;
  }
  showToast(`获取模型失败: ${mapped}`, { type: 'error' });
}

// ==========================================
// Alpine Component Logic
// ==========================================

type SettingsPanelPart = Partial<SettingsPanelData> & ThisType<SettingsPanelData>;

function createSettingsState(): Pick<
  SettingsPanelData,
  | 'isOpen'
  | 'searchQuery'
  | 'searchHitId'
  | 'appearanceThemeId'
  | 'appearanceColorMode'
  | 'appearanceAnimationsEnabled'
  | 'appearanceAnimationSpeed'
  | 'appearanceRespectSystemPreference'
  | 'activeRuntimePresetId'
  | '_unsubscribers'
  | '_subscriptionsInitialized'
  | '_settingsBaseline'
  | '_runtimeHealthNormalized'
  | 'healthMessages'
  | 'externalChangeNotice'
  | 'externalChangeConflict'
  | 'llm'
  | 'proxy'
  | 'toolStrategy'
  | 'runtimeStrategy'
  | 'developerDiagnostics'
  | 'localData'
  | 'llmApiPathMenuOpen'
  | 'schedulePreferenceMenuOpen'
  | 'navOpenGroup'
  | 'activeNavTargetId'
  | '_navScrollUnbind'
  | '_navScrollPauseUntil'
> {
  return {
    isOpen: false,

    searchQuery: '',
    searchHitId: '',
    navOpenGroup: null as string | null,
    activeNavTargetId: null as string | null,
    _navScrollUnbind: null as (() => void) | null,
    _navScrollPauseUntil: 0,

    appearanceThemeId: ThemeManager.getCurrentTheme(),
    appearanceColorMode: ThemeManager.getCurrentColorMode(),
    appearanceAnimationsEnabled: true,
    appearanceAnimationSpeed: 'normal',
    appearanceRespectSystemPreference: true,
    activeRuntimePresetId: null,

    // EventBus / window 订阅清理
    _unsubscribers: [],
    _subscriptionsInitialized: false,

    _settingsBaseline: null,

    _runtimeHealthNormalized: false,

    healthMessages: [] as string[],

    externalChangeNotice: false,
    externalChangeConflict: false,

    llmApiPathMenuOpen: false,
    schedulePreferenceMenuOpen: false,

    // LLM Config State
    llm: {
      provider: DEFAULT_LLM_PROVIDER_ID,
      endpoint: DEFAULT_NEW_API_ENDPOINT,
      apiKey: '',
      model: '',
      models: [],
      serviceTier: undefined,
      reasoningPrefs: { ...DEFAULT_REASONING_PREFS },
      apiPath: DEFAULT_API_PATH_ID,
      showKey: false,
      isFetching: false,
      isTesting: false,
    },

    // Proxy Config State
    proxy: {
      type: DEFAULT_SCRAPER_PROXY_TYPE,
      customUrl: '',
      showKey: false,
      savedKeyMap: {},
      isTesting: false,
      testError: '',
      testMessage: '',
      status: '',
    },

    toolStrategy: {
      targetModels: createEmptyToolTargetModels(),
      isSaving: false,
    },

    runtimeStrategy: {
      settings: getRuntimeStrategySettings(),
      isSaving: false,
    },

    developerDiagnostics: getDeveloperDiagnosticSettings(),

    localData: {
      usage: null,
      isBusy: false,
      clearingBucketId: null,
      cleanupItemsExpanded: false,
      // Empty selection = full export; advanced UI can opt into partial buckets.
      selectedExportBuckets: [],
    },
  };
}

const settingsPanelBehavior: SettingsPanelPart = {
  // Computed / Helpers
  get currentProviderConfig(): ProviderConfig | Record<string, never> {
    return getLlmProviderConfig(this.llm.provider) || {};
  },

  get llmProviderOptions(): LLMProviderOption[] {
    return Object.entries(PROVIDERS).map(([id, config]) => ({
      id,
      name: config.name,
      label: `✨ ${config.name}`,
    }));
  },

  get defaultLlmEndpoint(): string {
    return getLlmProviderConfig(this.llm.provider)?.endpoint || DEFAULT_NEW_API_ENDPOINT;
  },

  get commercialProxyOptions(): readonly ScraperProxyProviderConfig[] {
    return SCRAPER_COMMERCIAL_PROXY_OPTIONS;
  },

  get directProxyOptions(): readonly ScraperProxyProviderConfig[] {
    return SCRAPER_DIRECT_PROXY_OPTIONS;
  },

  get activeModelInfo(): ModelMetadata | null {
    if (!this.llm.model) return null;
    const m = this.llm.models.find(x => (typeof x === 'string' ? x : x.id) === this.llm.model);
    const model = m && typeof m !== 'string' ? m : null;
    return mergeModelMetadata(model, findPresetModelInfo(this.llm.provider, this.llm.model));
  },

  get activeModelCapability() {
    if (!this.llm.model) return null;
    const m = this.llm.models.find(x => (typeof x === 'string' ? x : x.id) === this.llm.model);
    return resolveModelCapability({
      provider: this.llm.provider,
      modelId: this.llm.model,
      modelsEntry: m ?? this.llm.model,
    });
  },

  get showReasoningControls(): boolean {
    const cap = this.activeModelCapability;
    return cap ? shouldShowReasoningControls(cap) : false;
  },

  get reasoningEffortOptions(): ReasoningEffortLevel[] {
    const cap = this.activeModelCapability;
    // Product scale remains low…max; UI lists only what the active model can send.
    if (!cap || cap.reasoningEfforts.length === 0) {
      return [...DEFAULT_REASONING_EFFORTS];
    }
    return cap.reasoningEfforts.filter(isReasoningEffortLevel);
  },

  /**
   * When model changes or prefs load, keep effort inside active model allowlist
   * via nearest-tier clamp (e.g. stored max → high on grok-4.5).
   * Returns true when demoted. With persist:true, writes clamped prefs so demotion
   * toast is once-only across reloads (AC3).
   */
  clampReasoningPrefsToActiveModel(options?: { announce?: boolean; persist?: boolean }): boolean {
    const prefs = normalizeReasoningUserPrefs(this.llm.reasoningPrefs);
    const allowed = this.reasoningEffortOptions;
    if (allowed.length === 0) return false;
    const effort = clampEffort(prefs.effort, allowed);
    if (effort === prefs.effort) return false;
    this.llm.reasoningPrefs = { ...prefs, effort };
    if (options?.announce !== false) {
      const model = (this.llm.model || '').trim() || '当前模型';
      showToast(
        `推理等级已从 ${prefs.effort} 调整为 ${effort}（${model} 支持：${allowed.join('/')}）`,
        { type: 'info' }
      );
    }
    if (options?.persist) {
      // Silent persist — demotion toast is the only UX; avoid success toast spam.
      void this.autoSaveProviderConfig('推理等级已按模型能力调整', { silent: true });
    }
    return true;
  },

  get apiPathOptions(): readonly ApiPathOption[] {
    return API_PATH_OPTIONS;
  },

  get fullApiUrlPreview(): string {
    const { fullUrl } = buildFullApiUrl(
      this.llm.endpoint || this.defaultLlmEndpoint,
      normalizeApiPathId(this.llm.apiPath),
      this.llm.model || '{model}'
    );
    return fullUrl || '—';
  },

  /**
   * When user-selected API path differs from registry preferred surface for the
   * current model, surface a soft warning (still allowed — gateways vary).
   */
  get apiPathCapabilityHint(): string {
    const model = (this.llm.model || '').trim();
    if (!model) return '';
    const pathId = normalizeApiPathId(this.llm.apiPath);
    const modelsEntry =
      this.llm.models.find(x => (typeof x === 'string' ? x : x.id) === model) ?? model;
    const registryCap = resolveModelCapability({
      provider: this.llm.provider,
      modelId: model,
      modelsEntry,
    });
    return buildApiPathCapabilityHint(pathId, registryCap);
  },

  /** Soft readiness line under the section intro (status only). */
  get llmSetupReadinessText(): string {
    const hasEndpoint = Boolean((this.llm.endpoint || '').trim());
    const needsKey = isLLMApiKeyRequired(this.llm);
    const hasKey = Boolean((this.llm.apiKey || '').trim());
    const hasModel = Boolean((this.llm.model || '').trim());
    if (!hasEndpoint) return '缺 Endpoint';
    if (needsKey && !hasKey) return '缺 API Key';
    if (!hasModel) return '未选模型';
    return '可测试连接';
  },

  get selectedApiPathDescription(): string {
    return this.selectedApiPathOption?.description || '';
  },

  get selectedApiPathOption(): ApiPathOption | undefined {
    const pathId = normalizeApiPathId(this.llm.apiPath);
    return API_PATH_OPTIONS.find(o => o.id === pathId);
  },

  get selectedApiPathPathLabel(): string {
    return this.selectedApiPathOption?.pathLabel || '/chat/completions';
  },

  get selectedApiPathNameLabel(): string {
    return this.selectedApiPathOption?.label || 'Chat Completions';
  },

  get reasoningEffortLabel(): string {
    return this.reasoningEffortButtonLabel(this.llm.reasoningPrefs?.effort || 'medium');
  },

  reasoningEffortButtonLabel(level: string): string {
    const labels: Record<string, string> = {
      low: 'low',
      medium: 'medium',
      high: 'high',
      xhigh: 'xhigh',
      max: 'max',
    };
    return labels[level] || level;
  },

  /**
   * R7: Capability badges for current model on the effective path (user apiPath).
   * Active = surface supports the flag; inactive shown dimmed for transparency.
   */
  get modelCapabilityBadges(): Array<{
    id: string;
    label: string;
    active: boolean;
    title: string;
  }> {
    const model = (this.llm.model || '').trim();
    if (!model) return [];
    const pathId = normalizeApiPathId(this.llm.apiPath);
    const modelsEntry =
      this.llm.models.find(x => (typeof x === 'string' ? x : x.id) === model) ?? model;
    const cap = resolveModelCapability({
      provider: this.llm.provider,
      modelId: model,
      modelsEntry,
      preferredSurface: pathId,
    });
    return buildModelCapabilityBadges(pathId, cap);
  },

  // 🔒 P0修复: 检查是否为生产环境
  get isProduction(): boolean {
    return EnvConfig.isProduction;
  },

  // 🔒 P0修复: 检查端点是否为危险的外部API
  isDangerousEndpoint(endpoint: string): boolean {
    if (!endpoint) return false;
    const dangerousEndpoints = [
      'api.openai.com',
      'api.anthropic.com',
      'api.deepseek.com',
      'generativelanguage.googleapis.com',
    ];
    return dangerousEndpoints.some(domain => endpoint.includes(domain));
  },

  get showDangerousEndpointWarning(): boolean {
    return this.isProduction && !!this.llm.endpoint && this.isDangerousEndpoint(this.llm.endpoint);
  },

  get proxyNeedsInput(): boolean {
    return scraperProxyNeedsInput(this.proxy.type);
  },

  get proxyInputLabel(): string {
    return getScraperProxyInputLabel(this.proxy.type);
  },

  get proxyInputPlaceholder(): string {
    return getScraperProxyInputPlaceholder(this.proxy.type);
  },

  get llmApiKeyInputType(): string {
    return this.llm.showKey ? 'text' : 'password';
  },

  get llmApiKeyIconClass(): string {
    return this.llm.showKey ? 'fa-eye-slash' : 'fa-eye';
  },

  get llmApiKeyVisibilityLabel(): string {
    return this.llm.showKey ? '隐藏 LLM API Key' : '显示 LLM API Key';
  },

  get modelSelectDisabled(): boolean {
    return this.llm.models.length === 0;
  },

  get fetchModelsIconClass(): string {
    return this.llm.isFetching ? 'fa-circle-notch fa-spin text-blue-500' : 'fa-sync-alt';
  },

  get fetchModelsText(): string {
    return this.llm.isFetching ? '同步中' : '获取模型列表';
  },

  get activeContextText(): string {
    const context =
      this.activeModelInfo && 'context' in this.activeModelInfo
        ? Number((this.activeModelInfo as { context?: unknown }).context)
        : 0;
    return formatModelContext(context);
  },

  get activeFeaturesText(): string {
    const features =
      this.activeModelInfo && 'features' in this.activeModelInfo
        ? (this.activeModelInfo as { features?: unknown }).features
        : null;
    return formatModelFeatures(features);
  },

  get activeFeatureBadges(): ModelFeatureBadge[] {
    const features =
      this.activeModelInfo && 'features' in this.activeModelInfo
        ? (this.activeModelInfo as { features?: unknown }).features
        : null;
    return getModelFeatureBadges(features);
  },

  get toolStrategyProviderLabel(): string {
    const provider = getLlmProviderConfig(this.llm.provider);
    return provider?.name || this.llm.provider || '未选择厂商';
  },

  get toolStrategyModelSelectDisabled(): boolean {
    return this.llm.models.length === 0;
  },

  get toolStrategyTargetItems(): ToolStrategyTargetView[] {
    return TOOL_STRATEGY_TARGETS.map(target => {
      const model = this.toolStrategy.targetModels[target.id] || '';
      return {
        ...target,
        model,
        resolvedModel: model || this.llm.model || '未选择模型',
      };
    });
  },

  toolStrategyTargetItemsByIds(targetIds: ToolStrategyTargetId[]): ToolStrategyTargetView[] {
    return targetIds
      .map(targetId => this.toolStrategyTargetItems.find(item => item.id === targetId))
      .filter((item): item is ToolStrategyTargetView => Boolean(item));
  },

  get toolStrategySaveText(): string {
    return this.toolStrategy.isSaving ? '保存中' : '保存工具与运行策略';
  },

  get toolStrategySaveIconClass(): string {
    return this.toolStrategy.isSaving ? 'fa-circle-notch fa-spin' : 'fa-check';
  },

  get runtimeStrategySaveText(): string {
    return this.runtimeStrategy.isSaving ? '保存中' : '保存运行策略';
  },

  get runtimeStrategySaveIconClass(): string {
    return this.runtimeStrategy.isSaving ? 'fa-circle-notch fa-spin' : 'fa-check';
  },

  get runtimeTestConnectionTimeoutSeconds(): number {
    return millisecondsToSeconds(this.runtimeStrategy.settings.llm.testConnectionTimeoutMs);
  },

  get runtimeAnalysisTimeoutSeconds(): number {
    return millisecondsToSeconds(this.runtimeStrategy.settings.llm.analysisTimeoutMs);
  },

  get runtimeDeepChatTimeoutSeconds(): number {
    return millisecondsToSeconds(this.runtimeStrategy.settings.deepChat.requestTimeoutMs);
  },

  get masterAnalysisBudgetItems(): RuntimeNumberFieldView[] {
    const budgets = this.runtimeStrategy.settings.masterAnalysis.tokenBudgetsByTarget;
    const defaultBudgets = DEFAULT_RUNTIME_STRATEGY_SETTINGS.masterAnalysis.tokenBudgetsByTarget;
    return MASTER_ANALYSIS_BUDGET_FIELDS.map(field => ({
      ...field,
      path: `masterAnalysis.tokenBudgetsByTarget.${field.key}`,
      value: budgets[field.key] ?? defaultBudgets[field.key] ?? 0,
      unit: 'tokens',
    }));
  },

  get masterAnalysisScheduleOptions(): Array<{
    value: SchedulingPreference;
    label: string;
    hint: string;
  }> {
    const enableCache = this.runtimeStrategy.settings.masterAnalysis.enableCache;
    return (['recommended', 'reliability', 'speed'] as const).map(value => ({
      value,
      label: SCHEDULE_PREFERENCE_SHORT_LABELS[value],
      hint: formatSchedulePreferenceHint(value, enableCache),
    }));
  },

  get masterAnalysisScheduleSelectedLabel(): string {
    const pref = this.runtimeStrategy.settings.masterAnalysis.schedulingPreference;
    const key = isSchedulingPreference(pref) ? pref : 'recommended';
    return SCHEDULE_PREFERENCE_SHORT_LABELS[key];
  },

  get masterAnalysisScheduleSelectedHint(): string {
    const pref = this.runtimeStrategy.settings.masterAnalysis.schedulingPreference;
    const key = isSchedulingPreference(pref) ? pref : 'recommended';
    return formatSchedulePreferenceHint(
      key,
      this.runtimeStrategy.settings.masterAnalysis.enableCache
    );
  },

  get ppcThresholdItems(): RuntimeNumberFieldView[] {
    return PPC_THRESHOLD_FIELDS.map(field => ({
      ...field,
      value: this.getRuntimeNumber(field.path),
    }));
  },

  get showDeveloperDiagnostics(): boolean {
    return !this.isProduction || this.developerDiagnostics.enableDebugMode;
  },

  get developerDangerousEndpointText(): string {
    return `${getDangerousEndpoints().length} 个危险端点需通过代理或企业网关访问`;
  },

  get testConnectionIconClass(): string {
    return this.llm.isTesting
      ? 'fa-circle-notch fa-spin text-blue-500'
      : 'fa-plug text-emerald-500';
  },

  get testConnectionText(): string {
    return this.llm.isTesting ? '测试中...' : '测试连接';
  },

  get proxyInputType(): string {
    return this.proxy.showKey ? 'text' : 'password';
  },

  get proxyKeyIconClass(): string {
    return this.proxy.showKey ? 'fa-eye-slash' : 'fa-eye';
  },

  get proxyKeyVisibilityLabel(): string {
    return this.proxy.showKey ? '隐藏采集网络 API Key' : '显示采集网络 API Key';
  },

  get proxyHintText(): string {
    return getScraperProxyHintText(this.proxy.type);
  },

  get localSecretBoundaryText(): string {
    return SECURE_STORAGE_SECURITY_BOUNDARY;
  },

  get localStorageUsedText(): string {
    return this.localData.usage
      ? this.formatBytes(this.localData.usage.localStorage.used)
      : '计算中';
  },

  get localStorageKeysText(): string {
    return this.localData.usage ? `${this.localData.usage.localStorage.keys} keys` : '';
  },

  get indexedDbUsedText(): string {
    return this.localData.usage ? this.formatBytes(this.localData.usage.indexedDB.used) : '计算中';
  },

  get indexedDbKeysText(): string {
    return this.localData.usage ? `${this.localData.usage.indexedDB.keys} records` : '';
  },

  get localDataCleanupSummaryText(): string {
    const total = this.localData.usage ? this.formatBytes(this.localData.usage.total) : '计算中';
    return `${this.localDataBucketItems.length} 类数据 · 总计 ${total}`;
  },

  get localDataCleanupToggleText(): string {
    return this.localData.cleanupItemsExpanded ? '收起清理项' : '展开清理项';
  },

  get localDataCleanupToggleIconClass(): string {
    return this.localData.cleanupItemsExpanded ? 'fa-chevron-up' : 'fa-chevron-down';
  },

  get isPartialLocalDataExport(): boolean {
    const selected = this.localData.selectedExportBuckets;
    return selected.length > 0 && selected.length < ALL_LOCAL_DATA_BUCKET_IDS.length;
  },

  get exportLocalDataButtonText(): string {
    return this.isPartialLocalDataExport ? '导出选中分类' : '导出全部备份';
  },

  get localDataBucketItems(): LocalDataBucketView[] {
    const usage = this.localData.usage;
    const total = usage?.total || 0;
    const buckets = usage?.buckets || [];

    return (Object.keys(LOCAL_DATA_BUCKET_META) as LocalDataBucketId[]).map(id => {
      const meta = LOCAL_DATA_BUCKET_META[id];
      const bucket = buckets.find(item => item.id === id);
      const used = bucket?.total || 0;
      const keys = (bucket?.localStorage.keys || 0) + (bucket?.indexedDB.keys || 0);
      const percent = total > 0 ? Math.round((used / total) * 100) : 0;
      const percentValue = used > 0 ? Math.max(percent, 3) : 0;

      return {
        id,
        ...meta,
        usedText: this.formatBytes(used),
        keysText: `${keys} 项`,
        percentText: `${percent}%`,
        percentWidth: `${percentValue}%`,
        percentValue,
        isEmpty: used <= 0 && keys === 0,
        isClearing: this.localData.clearingBucketId === id,
      };
    });
  },

  get storageUsageRatio(): number | undefined {
    if (!this.localData.usage) return undefined;
    const limit = 5 * 1024 * 1024;
    return this.localData.usage.localStorage.used / limit;
  },

  get quotaWarningVisible(): boolean {
    return isStorageQuotaWarning(this.storageUsageRatio);
  },

  get canUndoRuntimeSave(): boolean {
    return getSettingsRollbackCount('runtime') > 0;
  },

  // Lifecycle
  init() {
    this.loadRuntimeStrategy();
    this.loadAppearanceSettings();
    this.developerDiagnostics = getDeveloperDiagnosticSettings();
    void this.loadProxyConfig();
    this.loadProviderConfig(this.llm.provider);
    void this.refreshLocalDataUsage();

    // Subscriptions + $watch are once-per-instance (Alpine may re-enter init).
    if (this._subscriptionsInitialized) {
      return;
    }

    const unsubOpen = eventBus.on(APP_EVENTS.SETTINGS_OPEN, payload => {
      void this.open(
        normalizeSettingsOpenOptions(payload as SettingsOpenOptions | null | undefined)
      );
    });

    const unsubClose = eventBus.on(APP_EVENTS.SETTINGS_CLOSE, () => {
      void this.close();
    });

    const onStorage = (event: StorageEvent) => {
      this.handleStorageEvent(event);
    };
    window.addEventListener('storage', onStorage);

    this._unsubscribers = [
      unsubOpen,
      unsubClose,
      () => window.removeEventListener('storage', onStorage),
    ];

    registerSettingsWatchers(this as SettingsPanelData & AlpineWatchContext);
    this._subscriptionsInitialized = true;
  },

  async open(options?: SettingsOpenOptions) {
    this.isOpen = true;
    this.searchQuery = '';
    this.searchHitId = '';
    this.activeRuntimePresetId = null;
    const rawRuntime = StorageService.get(STORAGE_KEYS.RUNTIME_STRATEGY_SETTINGS);
    this._runtimeHealthNormalized = isRuntimeRawInvalid(rawRuntime);
    this.loadRuntimeStrategy();
    this.loadAppearanceSettings();
    this.developerDiagnostics = getDeveloperDiagnosticSettings();
    await this.loadProviderConfig(this.llm.provider);
    await this.loadProxyConfig();
    this.refreshSettingsHealth();
    void this.refreshLocalDataUsage().then(() => {
      this.refreshSettingsHealth();
    });
    this.captureSettingsBaseline();

    const deepLink = normalizeSettingsOpenOptions(options);
    if (deepLink.sectionId || deepLink.focus) {
      // Defer until panel is painted so section nodes exist for scroll/focus.
      queueMicrotask(() => {
        applySettingsDeepLink(deepLink, {
          scrollToSection: sectionId => this.scrollToSection(sectionId),
        });
      });
    }

    // Side-nav scroll-spy needs the painted panel; bind after open paint.
    queueMicrotask(() => {
      if (this.isOpen) {
        this.bindSettingsNavScrollSpy();
      }
    });
  },

  refreshSettingsHealth(): void {
    const hasLlmEndpoint = Boolean((this.llm.endpoint || '').trim());
    const hasLlmKey = Boolean((this.llm.apiKey || '').trim());
    this.healthMessages = evaluateSettingsHealth({
      runtimeNormalized: this._runtimeHealthNormalized,
      hasLlmEndpoint,
      hasLlmKey,
      storageUsageRatio: this.storageUsageRatio,
    }).messages;
  },

  refreshRollbackUi(): void {
    // Alpine getters re-read sessionStorage; no-op hook for tests / future ticks.
  },

  handleStorageEvent(event: StorageEvent): void {
    const result = evaluateExternalStorageChange({
      key: event.key,
      isDirty: this.dirtyPartitions.length > 0,
    });
    if (!result) return;
    // P2-4: never auto-reload — only surface notice (conflict when dirty).
    this.externalChangeNotice = true;
    this.externalChangeConflict = result.conflict;
  },

  dismissExternalChangeNotice(): void {
    this.externalChangeNotice = false;
    this.externalChangeConflict = false;
  },

  async reloadFromExternalChange(): Promise<void> {
    this.dismissExternalChangeNotice();
    this.loadRuntimeStrategy();
    this.loadToolStrategyDefaults();
    await this.loadProviderConfig(this.llm.provider);
    await this.loadProxyConfig();
    this.captureSettingsBaseline();
    this.refreshSettingsHealth();
    void this.refreshLocalDataUsage().then(() => this.refreshSettingsHealth());
    showToast('已从其他标签页重新加载设置', { type: 'success' });
  },

  async undoLastSettingsSave(partition: SettingsRollbackPartition): Promise<void> {
    const payload = popLastSettingsSave(partition);
    if (payload == null) {
      showToast('没有可撤销的保存', { type: 'warning' });
      return;
    }

    try {
      if (partition === 'runtime') {
        saveRuntimeStrategySettings(payload as RuntimeStrategySettings);
        this.loadRuntimeStrategy();
      } else if (partition === 'toolStrategy') {
        saveToolStrategySettings(payload as ToolStrategySettings);
        this.loadToolStrategyDefaults();
      } else if (partition === 'llm') {
        const snap = payload as {
          provider?: string;
          config?: LLMProviderConfig;
        };
        if (snap?.provider && snap.config) {
          StorageService.setLLMConfig(snap.provider, snap.config);
          this.llm.provider = snap.provider;
          await this.loadProviderConfig(snap.provider);
          updateModelStatus();
        }
      }
      this.captureSettingsBaseline();
      this.refreshRollbackUi();
      showToast('已撤销上次保存', { type: 'success' });
    } catch (error) {
      ErrorService.handle(error as Error, {
        action: 'undoLastSettingsSave',
        module: 'settings',
      });
    }
  },

  captureSettingsBaseline(): void {
    this._settingsBaseline = snapshotSettingsPartitions(buildSettingsDirtyInput(this));
  },

  get dirtyPartitions(): SettingsDirtyPartition[] {
    if (!this._settingsBaseline) return [];
    return diffSettingsPartitions(
      this._settingsBaseline,
      snapshotSettingsPartitions(buildSettingsDirtyInput(this))
    );
  },

  async close(): Promise<void> {
    if (!this.isOpen) return;
    // Shared confirm/choice modal owns Escape while its backdrop is mounted.
    // Do not match idle app-modals / page dialogs that stay in the DOM.
    if (document.querySelector('.app-confirm-modal-backdrop')) {
      return;
    }
    const dirty = this.dirtyPartitions;
    if (dirty.length > 0) {
      const partitionLabels: Record<SettingsDirtyPartition, string> = {
        llm: 'AI 模型与连接',
        toolStrategy: '工具策略',
        runtime: '运行时策略',
        proxy: '采集代理',
        appearance: '外观与体验',
      };
      const dirtyLabels = dirty.map(p => partitionLabels[p] || p).join('、');
      const ok = await confirmSettingsAction(
        '放弃未保存的更改？',
        `以下分区有未保存修改：${dirtyLabels}。关闭将丢失这些更改。`,
        '放弃更改'
      );
      if (!ok) return;
      // discard: reload authoritative state so baseline matches closed panel
      this.loadRuntimeStrategy();
      this.loadToolStrategyDefaults();
      await this.loadProviderConfig(this.llm.provider);
      await this.loadProxyConfig();
      this.captureSettingsBaseline();
    }
    this.unbindSettingsNavScrollSpy();
    this.activeNavTargetId = null;
    this.isOpen = false;
  },

  destroy() {
    this.unbindSettingsNavScrollSpy();
    this._unsubscribers?.forEach(unsub => unsub());
    this._unsubscribers = [];
    this._subscriptionsInitialized = false;
  },

  scrollToElementInPanel(el: HTMLElement): void {
    // Only scroll the settings content pane — never use scrollIntoView, which can
    // move outer ancestors and push the sticky footer up over the content.
    const scroller = el.closest('.settings-panel-scroll');
    if (!(scroller instanceof HTMLElement)) {
      return;
    }

    const scrollerRect = scroller.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const nextTop = scroller.scrollTop + (elRect.top - scrollerRect.top) - 8;
    scroller.scrollTo({
      top: Math.max(0, nextTop),
      behavior: 'smooth',
    });
  },

  scrollToSection(sectionId: string): void {
    const section = document.getElementById(sectionId);
    if (!section) {
      return;
    }
    this.scrollToElementInPanel(section);
  },

  isNavGroupOpen(groupId: string): boolean {
    return this.navOpenGroup === groupId;
  },

  isNavTargetCurrent(targetId: string): boolean {
    return this.activeNavTargetId === targetId;
  },

  unbindSettingsNavScrollSpy(): void {
    this._navScrollUnbind?.();
    this._navScrollUnbind = null;
  },

  updateActiveNavFromScroll(): void {
    if (Date.now() < this._navScrollPauseUntil) {
      return;
    }
    const root =
      document.querySelector('.settings-panel-root') ??
      document.querySelector('[data-testid="settings-panel"]');
    const scroller = root?.querySelector('.settings-panel-scroll');
    if (!(scroller instanceof HTMLElement)) {
      return;
    }
    const items = measureSettingsNavMarkers(
      scroller,
      scroller.querySelectorAll('[data-settings-nav-id]')
    );
    if (!items.length) {
      return;
    }
    const activeId = pickActiveSettingsNavId(items, scroller.scrollTop, 48);
    this.activeNavTargetId = activeId;
    // Only expand group when we have a real hit — never force tool open from null.
    if (activeId) {
      const groupId = pickActiveSettingsNavGroup(items, activeId);
      if (groupId) {
        this.navOpenGroup = groupId;
      }
    }
  },

  bindSettingsNavScrollSpy(): void {
    this.unbindSettingsNavScrollSpy();
    const root =
      document.querySelector('.settings-panel-root') ??
      document.querySelector('[data-testid="settings-panel"]');
    const scroller = root?.querySelector('.settings-panel-scroll');
    if (!(scroller instanceof HTMLElement)) {
      return;
    }
    const onScroll = () => {
      this.updateActiveNavFromScroll();
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    this._navScrollUnbind = () => {
      scroller.removeEventListener('scroll', onScroll);
    };
    requestAnimationFrame(() => {
      this.updateActiveNavFromScroll();
    });
  },

  toggleNavGroup(groupId: string, sectionId: string): void {
    // Scroll-spy may already open this group. Collapse only on re-click of same section.
    if (this.navOpenGroup === groupId && this.activeNavTargetId === sectionId) {
      this.navOpenGroup = null;
      return;
    }
    this.navOpenGroup = groupId;
    this.activeNavTargetId = sectionId;
    this._navScrollPauseUntil = Date.now() + 600;
    this.scrollToSection(sectionId);
  },

  navigateToNavTarget(targetId: string, groupId?: string): void {
    if (groupId) {
      this.navOpenGroup = groupId;
    }
    this.activeNavTargetId = targetId;
    // Pause spy briefly so click highlight is not overwritten mid-smooth-scroll.
    this._navScrollPauseUntil = Date.now() + 800;
    // Open collapsed details first so layout height is correct before scroll.
    const el = expandSettingsFocusTarget(targetId);
    if (!el) {
      this.scrollToSection(targetId);
      return;
    }
    // Defer scroll one frame so expanded details contribute to offset.
    requestAnimationFrame(() => {
      this.scrollToElementInPanel(el);
    });
  },

  get appearanceThemeOptions(): Array<{ id: string; name: string; description?: string }> {
    return Object.values(THEME_PRESETS).map(theme => ({
      id: theme.id,
      name: theme.name,
      description: theme.description,
    }));
  },

  loadAppearanceSettings(): void {
    this.appearanceThemeId = ThemeManager.getCurrentTheme();
    this.appearanceColorMode = ThemeManager.getCurrentColorMode();
    const anim = getAnimationSettings();
    this.appearanceAnimationsEnabled = anim.enabled;
    this.appearanceAnimationSpeed = anim.speed;
    this.appearanceRespectSystemPreference = anim.respectSystemPreference;
  },

  setAppearanceTheme(themeId: string): void {
    ThemeManager.applyTheme(themeId);
    this.appearanceThemeId = ThemeManager.getCurrentTheme();
  },

  setAppearanceThemeFromEvent(event: Event): void {
    const value = (event.target as HTMLSelectElement | null)?.value;
    if (typeof value === 'string' && value) {
      this.setAppearanceTheme(value);
    }
  },

  setAppearanceColorMode(mode: ColorMode): void {
    if (mode !== 'light' && mode !== 'dark' && mode !== 'system') return;
    ThemeManager.applyColorMode(mode);
    this.appearanceColorMode = ThemeManager.getCurrentColorMode();
  },

  setAppearanceAnimationsEnabled(event: Event): void {
    const checked = Boolean((event.target as HTMLInputElement | null)?.checked);
    if (checked) {
      animationSettingsStore.getState().enableAnimations();
    } else {
      animationSettingsStore.getState().disableAnimations();
    }
    this.loadAppearanceSettings();
  },

  setAppearanceAnimationSpeed(speed: AnimationSpeed): void {
    if (speed !== 'fast' && speed !== 'normal' && speed !== 'slow') return;
    animationSettingsStore.getState().setAnimationSpeed(speed);
    this.loadAppearanceSettings();
  },

  setAppearanceRespectSystemPreference(event: Event): void {
    const checked = Boolean((event.target as HTMLInputElement | null)?.checked);
    animationSettingsStore.getState().setRespectSystemPreference(checked);
    this.loadAppearanceSettings();
  },

  applyRuntimePresetById(id: RuntimePresetId | string): void {
    if (!isRuntimePresetId(id)) return;
    this.runtimeStrategy.settings = applyRuntimePreset(this.runtimeStrategy.settings, id);
    this.activeRuntimePresetId = id;
    // Button control: auto-persist runtime strategy
    void this.persistRuntimeStrategySettings({ toast: '已应用并保存运行策略预设' });
  },

  onSettingsSearch(event?: Event): void {
    const value = event?.target instanceof HTMLInputElement ? event.target.value : this.searchQuery;
    this.searchQuery = value;
    const match = findFirstSettingsSearchMatch(value);
    this.searchHitId = match?.id ?? '';
    if (!match) {
      return;
    }
    queueMicrotask(() => {
      this.scrollToSearchHit(match.id);
    });
  },

  scrollToSearchHit(hitId: string): void {
    const el =
      document.getElementById(hitId) ||
      document.querySelector<HTMLElement>(
        `[data-settings-focus="${typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(hitId) : hitId.replace(/"/g, '\\"')}"]`
      );
    if (!el) {
      // Fall back to section scroll via index entry
      const match = findFirstSettingsSearchMatch(this.searchQuery);
      if (match?.sectionId) {
        this.scrollToSection(match.sectionId);
      }
      return;
    }

    // Expand ancestor details so advanced/focus content is reachable
    let node: HTMLElement | null = el;
    while (node) {
      if (node instanceof HTMLDetailsElement) {
        node.open = true;
      }
      node = node.parentElement;
    }

    const scroller = el.closest('.settings-panel-scroll');
    if (scroller instanceof HTMLElement) {
      const scrollerRect = scroller.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const nextTop = scroller.scrollTop + (elRect.top - scrollerRect.top) - 8;
      scroller.scrollTo({
        top: Math.max(0, nextTop),
        behavior: 'smooth',
      });
    } else if (el.id) {
      this.scrollToSection(el.id);
    }

    el.classList.add('settings-deep-link-highlight');
    window.setTimeout(() => {
      el.classList.remove('settings-deep-link-highlight');
    }, 2000);
  },

  // 打开性能监控面板
  async openPerformanceMonitor(): Promise<void> {
    try {
      const { performanceMonitor } = await import('@/common/devtools/PerformanceMonitor');

      // 确保面板已初始化
      if (!performanceMonitor.isInitialized()) {
        performanceMonitor.initialize();
      }

      performanceMonitor.show();
      showToast(
        '监控面板已打开（右上角），快捷键 Ctrl+Shift+P 切换显示。注意：仅在开发模式下可用',
        { type: 'success', duration: 5000 }
      );
    } catch (error) {
      ErrorService.handle(error as Error, {
        action: 'openPerformanceMonitor',
        module: 'settings',
        notify: false,
      });
      showToast('打开监控面板失败', { type: 'error' });
    }
  },

  // --- LLM Logic ---

  async loadProviderConfig(provider: string): Promise<void> {
    const config = getLlmProviderConfig(provider);
    if (!config) return;

    const savedConfig = StorageService.getLLMConfig(provider);
    this.llm.endpoint = resolveProviderEndpoint(provider, config, savedConfig?.endpoint || '');
    this.llm.apiKey = await loadProviderApiKey(provider, savedConfig);
    this.llm.models = dedupeModels(getRawProviderModels(savedConfig, config));
    this.llm.model = getInitialModel(savedConfig?.model, this.llm.models);
    this.llm.serviceTier = savedConfig?.serviceTier;
    this.llm.reasoningPrefs = normalizeReasoningUserPrefs(savedConfig?.reasoningPrefs);
    this.llm.apiPath = normalizeApiPathId(savedConfig?.apiPath);
    // Clamp + persist demotion so next open does not re-toast (AC3 once-only).
    this.clampReasoningPrefsToActiveModel({ announce: true, persist: true });
    this.loadToolStrategyDefaults();
  },

  async fetchModels(): Promise<void> {
    const validationMessage = validateModelFetchInput(this.llm);
    if (validationMessage) {
      showToast(validationMessage, { type: 'warning' });
      return;
    }

    this.llm.isFetching = true;

    try {
      const provider = this.llm.provider;
      const models = await fetchModelsFromApi(provider, this.llm.endpoint, this.llm.apiKey);

      assertFetchedModels(models, provider);
      applyFetchedModels(this, models);

      showToast(`成功同步 ${this.llm.models.length} 个模型`, { type: 'success' });
    } catch (e) {
      const error = e as Error;
      notifyModelFetchFailure(error);
      // UI already toasted; log without a second user notification.
      const isAbort = error?.name === 'AbortError' || /timeout|aborted/i.test(error?.message || '');
      if (!isAbort) {
        ErrorService.handle(error, {
          action: 'fetchModels',
          module: 'settings',
          notify: false,
        });
      }
    } finally {
      this.llm.isFetching = false;
    }
  },

  async testConnection(): Promise<void> {
    if (!this.llm.endpoint || !this.llm.model) {
      showToast('请先完善配置 (端点 + 模型)', { type: 'warning' });
      return;
    }

    if (isLLMApiKeyRequired(this.llm) && !this.llm.apiKey) {
      showToast('请先完善配置 (Key + 模型)', { type: 'warning' });
      return;
    }

    this.llm.isTesting = true;
    try {
      showToast('正在发送测试请求...', { type: 'info' });
      const messages = [{ role: 'user' as const, content: "Hello! Reply 'OK'." }];

      const modelsEntry =
        this.llm.models.find(x => (typeof x === 'string' ? x : x.id) === this.llm.model) ??
        this.llm.model;
      await callLLM(
        messages,
        this.llm.provider,
        this.llm.endpoint,
        this.llm.apiKey,
        this.llm.model,
        {
          temperature: 0.1,
          jsonMode: false,
          maxTokens: LLM_TEST_CONNECTION_MAX_TOKENS,
          ...(this.llm.serviceTier && { serviceTier: this.llm.serviceTier }),
          reasoningPrefs: this.llm.reasoningPrefs,
          apiPath: normalizeApiPathId(this.llm.apiPath),
          modelsEntry,
          stream: true,
          timeout: this.runtimeStrategy.settings.llm.testConnectionTimeoutMs,
        }
      );

      showToast('连接成功！', { type: 'success' });
    } catch (error) {
      ErrorService.handle(error as Error, { action: 'testConnection', module: 'settings' });
    } finally {
      this.llm.isTesting = false;
    }
  },

  async saveProviderConfig(): Promise<void> {
    if (isLLMApiKeyRequired(this.llm) && !this.llm.apiKey) {
      showToast('请填写 API Key', { type: 'warning' });
      return;
    }

    try {
      // 🔐 P0优化: 使用安全存储保存API密钥
      const newConfig: LLMProviderConfig = {
        provider: this.llm.provider,
        endpoint: this.llm.endpoint,
        model: this.llm.model,
        models: this.llm.models,
        ...(this.llm.serviceTier && { serviceTier: this.llm.serviceTier }),
        reasoningPrefs: normalizeReasoningUserPrefs(this.llm.reasoningPrefs),
        apiPath: normalizeApiPathId(this.llm.apiPath),
        enabled: true,
        apiKey: '', // 占位符,实际存储在安全存储中
      };

      // P2-3: snapshot pre-save LLM config (no secrets)
      const previous = StorageService.getLLMConfig(this.llm.provider);
      pushSettingsRollbackSnapshot('llm', {
        provider: this.llm.provider,
        config: previous ? { ...previous, apiKey: '' } : { ...newConfig, apiKey: '' },
      });

      if (this.llm.apiKey) {
        // API Key 单独加密存储
        await StorageService.setSecure(`llm_key_${this.llm.provider}`, this.llm.apiKey);
      } else {
        StorageService.removeSecure(`llm_key_${this.llm.provider}`);
      }

      // 其他配置正常存储
      StorageService.setLLMConfig(this.llm.provider, newConfig);

      // Update global status UI
      updateModelStatus();

      showToast('LLM 配置已保存', { type: 'success' });
      this.captureSettingsBaseline();
      // Keep panel open after save — user may continue editing other sections.
    } catch (error) {
      ErrorService.handle(error as Error, { action: 'saveProviderConfig', module: 'settings' });
    }
  },

  loadToolStrategyDefaults(): void {
    this.toolStrategy.targetModels = TOOL_STRATEGY_TARGETS.reduce(
      (acc, target) => {
        acc[target.id] = getToolTargetDefaultModel(target.id, this.llm.provider);
        return acc;
      },
      {} as Record<ToolStrategyTargetId, string>
    );
  },

  async saveToolStrategy(): Promise<void> {
    try {
      this.toolStrategy.isSaving = true;
      // P2-3: pre-save snapshots for tool + runtime (both written by this action)
      pushSettingsRollbackSnapshot('toolStrategy', getToolStrategySettings());
      pushSettingsRollbackSnapshot('runtime', getRuntimeStrategySettings());
      TOOL_STRATEGY_TARGETS.forEach(target => {
        setToolTargetDefaultModel(
          target.id,
          this.llm.provider,
          this.toolStrategy.targetModels[target.id] || ''
        );
      });
      saveRuntimeStrategySettings(this.runtimeStrategy.settings);
      this.loadRuntimeStrategy();
      this.captureSettingsBaseline();
      this.refreshRollbackUi();
      showToast('工具与运行策略已保存', { type: 'success' });
    } catch (error) {
      ErrorService.handle(error as Error, { action: 'saveToolStrategy', module: 'settings' });
    } finally {
      this.toolStrategy.isSaving = false;
    }
  },

  loadRuntimeStrategy(): void {
    this.runtimeStrategy.settings = getRuntimeStrategySettings();
  },

  async persistRuntimeStrategySettings(options?: { toast?: string }): Promise<void> {
    try {
      this.runtimeStrategy.isSaving = true;
      pushSettingsRollbackSnapshot('runtime', getRuntimeStrategySettings());
      saveRuntimeStrategySettings(this.runtimeStrategy.settings);
      this.loadRuntimeStrategy();
      this.captureSettingsBaseline();
      this.refreshRollbackUi();
      showToast(options?.toast ?? '已保存', { type: 'success' });
    } catch (error) {
      ErrorService.handle(error as Error, {
        action: 'persistRuntimeStrategySettings',
        module: 'settings',
      });
    } finally {
      this.runtimeStrategy.isSaving = false;
    }
  },

  async saveRuntimeStrategy(): Promise<void> {
    // Explicit form save (e.g. data retention) — panel stays open
    await this.persistRuntimeStrategySettings({ toast: '数据策略已保存' });
  },

  resetRuntimeStrategy(): void {
    this.runtimeStrategy.settings = normalizeRuntimeStrategySettings(
      DEFAULT_RUNTIME_STRATEGY_SETTINGS
    );
  },

  // --- Proxy Logic ---

  async loadProxyConfig(): Promise<void> {
    const savedConfig = StorageService.getProxyConfig() as {
      type?: string;
      customUrl?: string;
    } | null;
    this.proxy.savedKeyMap = await StorageService.getProxyKeyMap();

    this.proxy.type = savedConfig?.type || DEFAULT_SCRAPER_PROXY_TYPE;
    // If the saved active type matches current type, use its URL, otherwise fallback to cache
    if (savedConfig?.type === this.proxy.type) {
      this.proxy.customUrl = savedConfig?.customUrl || '';
    } else {
      this.proxy.customUrl = this.proxy.savedKeyMap[this.proxy.type] || '';
    }
  },

  async saveProxyConfig(): Promise<void> {
    // Update cache map
    this.proxy.savedKeyMap[this.proxy.type] = this.proxy.customUrl;
    await StorageService.setProxyKeyMap(this.proxy.savedKeyMap);

    // Save active config
    const config: ProxyConfig = {
      type: this.proxy.type as ProxyConfig['type'],
      customUrl: this.proxy.customUrl,
    };
    await StorageService.setProxyConfigWithCredential(config);

    this.captureSettingsBaseline();
    showToast('网络配置已更新', { type: 'success' });
  },

  async testProxyConnection(): Promise<void> {
    // Clear previous probe result; never close the panel on failure (UT-P0-10).
    this.proxy.testError = '';
    this.proxy.testMessage = '';
    this.proxy.status = '';

    if (scraperProxyNeedsInput(this.proxy.type) && !this.proxy.customUrl.trim()) {
      applyProxyProbeFailure(this.proxy, '请先填写 API Key 或代理地址', 'warning');
      return;
    }

    const fetchUrl = buildScraperProxyUrl(
      this.proxy.type,
      PROXY_PROBE_TARGET_URL,
      this.proxy.customUrl
    );
    if (!fetchUrl) {
      applyProxyProbeFailure(this.proxy, '不支持的代理类型');
      return;
    }

    this.proxy.isTesting = true;
    this.proxy.status = 'testing';
    const timeoutMs = this.runtimeStrategy.settings.scraper.requestTimeoutMs;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      showToast('正在测试代理连接...', { type: 'info' });
      const response = await fetch(fetchUrl, { method: 'GET', signal: controller.signal });
      if (!response.ok) {
        throw new Error(`代理响应异常 (HTTP ${response.status})`);
      }
      applyProxyProbeSuccess(this.proxy);
    } catch (error) {
      applyProxyProbeFailure(this.proxy, formatProxyProbeError(error));
    } finally {
      clearTimeout(timeoutId);
      this.proxy.isTesting = false;
    }
  },

  setLlmProvider(event: Event): void {
    this.llm.provider = (event.target as HTMLSelectElement).value;
  },

  setLlmEndpoint(event: Event): void {
    this.llm.endpoint = (event.target as HTMLInputElement).value;
  },

  setLlmApiPath(event: Event): void {
    this.llm.apiPath = normalizeApiPathId((event.target as HTMLSelectElement).value);
    this.llmApiPathMenuOpen = false;
  },

  setLlmApiPathId(id: string): void {
    this.llm.apiPath = normalizeApiPathId(id);
    this.llmApiPathMenuOpen = false;
  },

  setLlmApiKey(event: Event): void {
    this.llm.apiKey = (event.target as HTMLInputElement).value;
  },

  setLlmModel(event: Event): void {
    this.llm.model = (event.target as HTMLSelectElement).value;
    this.clampReasoningPrefsToActiveModel({ announce: true, persist: true });
  },

  setLlmServiceTier(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.llm.serviceTier = value
      ? (value as NonNullable<LLMProviderConfig['serviceTier']>)
      : undefined;
  },

  setReasoningEnabled(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.llm.reasoningPrefs = {
      ...normalizeReasoningUserPrefs(this.llm.reasoningPrefs),
      enabled: checked,
    };
    void this.autoSaveProviderConfig('推理设置已保存');
  },

  setReasoningEffort(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.setReasoningEffortLevel(value);
  },

  setReasoningEffortLevel(level: ReasoningEffortLevel | string): void {
    const raw = isReasoningEffortLevel(level) ? level : DEFAULT_REASONING_PREFS.effort;
    // Only persist efforts the current model can actually send (nearest-tier clamp).
    const allowed = this.reasoningEffortOptions;
    const effort = allowed.length > 0 ? clampEffort(raw, allowed) : DEFAULT_REASONING_PREFS.effort;
    this.llm.reasoningPrefs = {
      ...normalizeReasoningUserPrefs(this.llm.reasoningPrefs),
      effort,
    };
    void this.autoSaveProviderConfig('推理等级已保存');
  },

  /**
   * Instant-save LLM config for button/switch controls (no panel close).
   * Requires endpoint+model (from form or last saved config).
   * `silent: true` skips success toast (used when demotion toast already shown).
   */
  async autoSaveProviderConfig(
    successToast: string,
    options?: { silent?: boolean }
  ): Promise<void> {
    try {
      const previous = StorageService.getLLMConfig(this.llm.provider);
      const newConfig = buildAutoSaveLlmConfig(this.llm, previous);
      if (!newConfig.endpoint || !newConfig.model) {
        if (!options?.silent) {
          showToast('请先配置 Endpoint 与模型后再保存推理设置', { type: 'warning' });
        }
        return;
      }
      pushSettingsRollbackSnapshot('llm', {
        provider: this.llm.provider,
        config: previous ? { ...previous, apiKey: '' } : { ...newConfig },
      });
      StorageService.setLLMConfig(this.llm.provider, newConfig);
      updateModelStatus();
      this.captureSettingsBaseline();
      if (!options?.silent) {
        showToast(successToast, { type: 'success' });
      }
    } catch (error) {
      ErrorService.handle(error as Error, {
        action: 'autoSaveProviderConfig',
        module: 'settings',
      });
    }
  },

  setToolTargetModel(targetId: ToolStrategyTargetId, event: Event): void {
    this.toolStrategy.targetModels[targetId] = (event.target as HTMLSelectElement).value;
  },

  getRuntimeNumber(path: string, divisor = 1): number {
    const value = Number(getRuntimePathValue(this.runtimeStrategy.settings, path));
    if (!Number.isFinite(value)) return 0;
    return divisor === 1 ? value : Number((value / divisor).toFixed(2));
  },

  getRuntimeBoolean(path: string): boolean {
    return Boolean(getRuntimePathValue(this.runtimeStrategy.settings, path));
  },

  setRuntimeNumber(path: string, event: Event, multiplier = 1): void {
    setRuntimePathValue(this.runtimeStrategy.settings, path, getInputNumber(event) * multiplier);
  },

  setRuntimeBoolean(path: string, event: Event): void {
    setRuntimePathValue(
      this.runtimeStrategy.settings,
      path,
      (event.target as HTMLInputElement).checked
    );
  },

  setRuntimeString(path: string, event: Event): void {
    setRuntimePathValue(
      this.runtimeStrategy.settings,
      path,
      (event.target as HTMLSelectElement).value
    );
  },

  setMasterAnalysisSchedulePreference(preference: SchedulingPreference): void {
    if (!isSchedulingPreference(preference)) return;
    this.runtimeStrategy.settings.masterAnalysis.schedulingPreference = preference;
    this.schedulePreferenceMenuOpen = false;
    void this.persistRuntimeStrategySettings({ toast: '调度偏好已保存' });
  },

  setDeveloperDiagnosticBoolean(
    key: keyof Omit<DeveloperDiagnosticSettings, 'loggerMinLevel'>,
    event: Event
  ): void {
    const enabled = (event.target as HTMLInputElement).checked;
    this.developerDiagnostics = updateDeveloperDiagnosticSetting(key, enabled);
    if (key === 'eventDebugEnabled' && enabled) {
      initEventLogger();
    }
  },

  setDeveloperDiagnosticLogLevel(event: Event): void {
    const level = (event.target as HTMLSelectElement).value as DeveloperLogLevel;
    this.developerDiagnostics = updateDeveloperDiagnosticSetting('loggerMinLevel', level);
  },

  setProxyType(event: Event): void {
    this.proxy.type = (event.target as HTMLSelectElement).value;
  },

  setProxyCustomUrl(event: Event): void {
    this.proxy.customUrl = (event.target as HTMLInputElement).value;
  },

  toggleLlmKeyVisibility(): void {
    this.llm.showKey = !this.llm.showKey;
  },

  toggleProxyKeyVisibility(): void {
    this.proxy.showKey = !this.proxy.showKey;
  },

  getModelValue(model: ModelOption): string {
    return typeof model === 'string' ? model : model.id;
  },

  getModelLabel(model: ModelOption): string {
    return this.getModelValue(model);
  },

  /**
   * Keep the rendered option list in sync with llm.model. Alpine's x-for reuses
   * <option> nodes when the models array is replaced (e.g. 获取模型列表), and the
   * browser resets <select>.value if the selected option node is briefly removed
   * — :selected re-asserts the saved model after every re-render.
   */
  isModelSelected(model: ModelOption): boolean {
    return this.getModelValue(model) === this.llm.model;
  },

  async refreshLocalDataUsage(): Promise<void> {
    try {
      this.localData.usage = await LocalDataStore.getUsage();
    } catch (error) {
      ErrorService.handle(error as Error, {
        action: 'refreshLocalDataUsage',
        module: 'settings',
        notify: false,
      });
    }
  },

  async exportLocalData(): Promise<void> {
    const selectedBuckets = this.isPartialLocalDataExport
      ? [...this.localData.selectedExportBuckets]
      : undefined;
    const confirmCopy = buildLocalDataExportConfirm(selectedBuckets);
    const confirmed = await confirmSettingsAction(
      confirmCopy.title,
      confirmCopy.content,
      '继续导出'
    );
    if (!confirmed) return;

    try {
      this.localData.isBusy = true;
      const data = await LocalDataStore.exportAll(
        selectedBuckets ? { buckets: selectedBuckets } : {}
      );
      const payload = JSON.stringify(data, null, 2);
      const estimatedBytes = payload.length * 2;
      if (estimatedBytes >= LOCAL_DATA_EXPORT_SIZE_WARN_BYTES) {
        const sizeConfirmed = await confirmSettingsAction(
          '备份体积较大',
          `本次备份预估约 ${formatLocalDataBytes(estimatedBytes)}，下载与后续导入可能较慢。仍要导出？`,
          '继续导出'
        );
        if (!sizeConfirmed) return;
      }

      const suffix = selectedBuckets ? `-partial-${selectedBuckets.join('-')}` : '';
      downloadJson(
        `sops-local-data${suffix}-${new Date().toISOString().slice(0, 10)}.json`,
        payload
      );
      showToast(selectedBuckets ? '分桶本地数据已导出' : '本地数据已导出', { type: 'success' });
    } catch (error) {
      ErrorService.handle(error as Error, { action: 'exportLocalData', module: 'settings' });
    } finally {
      this.localData.isBusy = false;
    }
  },

  async importLocalData(): Promise<void> {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        this.localData.isBusy = true;
        const text = await file.text();
        let prechecked: {
          data: Parameters<typeof LocalDataStore.importAll>[0];
          summary: LocalDataExportSummary;
        };
        try {
          prechecked = precheckLocalDataImportText(text);
        } catch (error) {
          ErrorService.handle(error as Error, { action: 'importLocalData', module: 'settings' });
          return;
        }

        const choice = await chooseWithModal({
          title: '导入本地数据',
          content: buildLocalDataImportChoiceContent(prechecked.summary),
          primaryLabel: '完整恢复',
          secondaryLabel: '合并导入',
          cancelLabel: '取消',
          primaryIsDestructive: true,
        });

        if (choice === 'cancel') {
          return;
        }

        const mode = choice === 'primary' ? 'replace' : 'merge';
        await LocalDataStore.importAll(prechecked.data, { mode });
        await this.refreshLocalDataUsage();
        showToast('本地数据已导入，页面即将刷新以应用恢复结果', { type: 'success' });
        reloadAfterLocalDataChange();
      } catch (error) {
        ErrorService.handle(error as Error, { action: 'importLocalData', module: 'settings' });
      } finally {
        this.localData.isBusy = false;
      }
    });
    input.click();
  },

  toggleLocalDataCleanupItems(): void {
    this.localData.cleanupItemsExpanded = !this.localData.cleanupItemsExpanded;
  },

  isExportBucketSelected(bucketId: LocalDataBucketId): boolean {
    return this.localData.selectedExportBuckets.includes(bucketId);
  },

  toggleExportBucket(bucketId: LocalDataBucketId): void {
    const selected = this.localData.selectedExportBuckets;
    if (selected.includes(bucketId)) {
      this.localData.selectedExportBuckets = selected.filter(id => id !== bucketId);
      return;
    }
    this.localData.selectedExportBuckets = [...selected, bucketId];
  },

  selectAllExportBuckets(): void {
    this.localData.selectedExportBuckets = [...ALL_LOCAL_DATA_BUCKET_IDS];
  },

  clearExportBucketSelection(): void {
    this.localData.selectedExportBuckets = [];
  },

  async clearLocalCache(): Promise<void> {
    await this.clearLocalDataBucket('cache');
  },

  async clearLocalDataBucket(bucketId: LocalDataBucketId): Promise<void> {
    const meta = LOCAL_DATA_BUCKET_META[bucketId];
    if (!meta) return;

    if (meta.confirmMessage) {
      const confirmed = await confirmSettingsAction(
        meta.actionLabel,
        meta.confirmMessage,
        meta.actionLabel
      );
      if (!confirmed) return;
    }

    try {
      this.localData.isBusy = true;
      this.localData.clearingBucketId = bucketId;
      const removed = await clearLocalDataBucketWithRuntimeSync(bucketId);
      await this.refreshLocalDataUsage();
      showToast(`${meta.label}已清理 (${removed} 项)`, { type: 'success' });
    } catch (error) {
      ErrorService.handle(error as Error, { action: 'clearLocalDataBucket', module: 'settings' });
    } finally {
      this.localData.isBusy = false;
      this.localData.clearingBucketId = null;
    }
  },

  async clearAllLocalData(): Promise<void> {
    const confirmed = await confirmSettingsAction(
      '清空全部本地数据',
      '这会删除本浏览器中的配置、密钥、采集历史、聊天记录和缓存。请先导出备份。继续？',
      '继续'
    );
    if (!confirmed) return;
    const confirmedAgain = await confirmSettingsAction(
      '二次确认',
      '二次确认：清空后无法恢复，除非你已有导出的备份文件。确定清空全部本地数据？',
      '清空全部'
    );
    if (!confirmedAgain) return;

    try {
      this.localData.isBusy = true;
      await LocalDataStore.clearAll();
      await syncRuntimeAfterClearAllLocalData();
      this.localData.usage = await LocalDataStore.getUsage();
      showToast('全部本地数据已清空，页面即将刷新以应用清理结果', { type: 'success' });
      reloadAfterLocalDataChange();
    } catch (error) {
      ErrorService.handle(error as Error, { action: 'clearAllLocalData', module: 'settings' });
    } finally {
      this.localData.isBusy = false;
    }
  },

  formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
  },

  getProxyDisplayName(type: string): string {
    return getScraperProxyDisplayName(type);
  },
};

function attachSettingsBehavior(panel: SettingsPanelData): SettingsPanelData {
  Object.defineProperties(panel, Object.getOwnPropertyDescriptors(settingsPanelBehavior));
  return panel;
}

const SettingsPanel = (): SettingsPanelData =>
  attachSettingsBehavior(createSettingsState() as SettingsPanelData);

// ==========================================
// Initialization & Exports
// ==========================================

/**
 * 初始化 Alpine.js 设置组件
 * 包含防御性检查和重试机制,确保在生产环境中正确注册
 */
export function initAlpineSettings(): void {
  // 防御性检查: 确保 Alpine.js 已加载
  if (typeof window.Alpine === 'undefined') {
    // 延迟重试,最多重试 10 次
    if (alpineRetryCount < 10) {
      alpineRetryCount += 1;
      setTimeout(initAlpineSettings, 100);
    }
    return;
  }

  // 确保 Alpine.data 方法可用
  if (typeof window.Alpine.data !== 'function') {
    return;
  }

  try {
    // 注册 settingsPanel 组件
    window.Alpine.data('settingsPanel', SettingsPanel);

    // 清理重试计数器
    alpineRetryCount = 0;
  } catch (error) {
    ErrorService.handle(error as Error, {
      action: 'initAlpineSettings',
      module: 'settings',
      notify: false,
    });
  }
}

// Legacy Bridge for ActionRegistry
export function openSettings(options?: SettingsOpenOptions): void {
  const deepLink = normalizeSettingsOpenOptions(options);
  eventBus.emit(APP_EVENTS.SETTINGS_OPEN, {
    ...deepLink,
    timestamp: Date.now(),
  });
}

export function closeSettings(): void {
  eventBus.emit(APP_EVENTS.SETTINGS_CLOSE, {
    saved: false,
    timestamp: Date.now(),
  });
}

/**
 * 打开性能监控面板
 */
export async function openPerformanceMonitor(): Promise<void> {
  try {
    const { performanceMonitor } = await import('@/common/devtools/PerformanceMonitor');
    performanceMonitor.show();
    showToast('监控面板已打开', { type: 'success' });
  } catch (error) {
    ErrorService.handle(error as Error, {
      action: 'openPerformanceMonitor',
      module: 'settings',
      notify: false,
    });
    showToast('打开监控面板失败', { type: 'error' });
  }
}

// These are no longer needed for direct calling, but kept for compatibility
export const initSettingsListeners = (): void => {};
export const saveProviderConfig = (): void => {};
export const loadProviderConfig = (): void => {};
export const fetchModels = (): void => {};
export const toggleApiKeyVisibility = (): void => {};
export const testConnection = (): void => {};
export const saveProxyConfig = (): void => {};
export const renderProxyInputUI = (): void => {};

// Keep this for main.js status update
export async function updateModelStatus(): Promise<void> {
  const provider = StorageService.get(STORAGE_KEYS.LLM_ACTIVE_PROVIDER) as string | null;
  const statusEl = document.getElementById('model-status');
  if (!statusEl) return;

  if (provider && typeof provider === 'string' && provider in PROVIDERS) {
    // 🔐 P0优化: 使用安全存储读取配置
    const config = await StorageService.getLLMConfigWithKey(provider);
    const providerKey = provider as keyof typeof PROVIDERS;
    const providerInfo = PROVIDERS[providerKey];
    if (config && config.apiKey && config.model && providerInfo) {
      // ✅ 安全: providerInfo.name和config.model已通过escapeHtml转义
      setSafeHtml(
        statusEl,
        `
                <span class="status-dot status-success"></span>
                <span class="text-slate-600 text-xs font-medium flex items-center gap-1">
                    ${escapeHtml(providerInfo.name)}: <span class="font-mono text-blue-600">${escapeHtml(config.model)}</span>
                </span>
            `
      );
      return;
    }
  }
  // ✅ 安全: 静态HTML模板，无用户输入
  setSafeHtml(
    statusEl,
    `
        <span class="status-dot status-pending pulse-dot"></span>
        <span class="text-slate-500 text-xs italic">等待API配置...</span>
    `
  );
}

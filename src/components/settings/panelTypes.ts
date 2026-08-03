// TD-SET-01 Phase 1: settings panel type aggregation (verbatim).
import type { AnimationSpeed } from '@/types/animation-types';
import type { LLMProviderConfig } from '@/types/state';
import type { ModelOption, ModelMetadata, LocalDataBucketMeta } from './domain/localDataCopy';
import type {
  ApiPathId,
  ApiPathOption,
  ReasoningEffortLevel,
  ReasoningUserPrefs,
} from '@/services/modelCapability';
import type { ToolStrategyTargetId } from '@/services/toolStrategyService';
import type {
  MasterAnalysisEvidenceDepth,
  RuntimeStrategySettings,
} from '@/services/runtimeStrategyService';
import type { RuntimePresetId } from './domain/settingsPresets';
import type { SettingsSearchHitView } from './domain/settingsSearch';
import type { ColorMode } from '@/common/config/themeConfig';
import type { DeveloperDiagnosticSettings } from '@/services/developerDiagnosticsService';
import type { ProviderConfig } from '@/common/config/llmProviders';
import type { ScraperProxyProviderConfig } from '@/common/config/scraperProxies';
import type { LocalDataBucketId, LocalDataUsage } from '@/services/localDataStore';
import type { SettingsDirtyPartition, SettingsDirtySnapshot } from './domain/settingsDirty';
import type { SettingsOpenOptions } from './domain/settingsDeepLink';
import type { SettingsRollbackPartition } from './domain/settingsRollback';
import type { SchedulingPreference } from '@/modules/app_center/views/master_analysis/ai_analysis/services/analysisScheduler';

export type CapabilityBadge = {
  id: string;
  label: string;
  active: boolean;
  title: string;
};

/** Protocol family shown next to provider; drives apiPath (not free-form path pick). */
export type LlmApiFamilyId = 'openai' | 'anthropic' | 'gemini';

export interface LlmApiFamilyOption {
  id: LlmApiFamilyId;
  label: string;
}

// ============ settings panel state & behavior types ============
export interface LLMState {
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

export interface ProxyState {
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

export interface ToolStrategyState {
  targetModels: Record<ToolStrategyTargetId, string>;
  isSaving: boolean;
}

export interface RuntimeStrategyState {
  settings: RuntimeStrategySettings;
  isSaving: boolean;
}

export interface SettingsPanelData {
  isOpen: boolean;
  /** In-panel search query (P1-3) */
  searchQuery: string;
  /** Last search hit id (section or focus target) */
  searchHitId: string;
  /** Ranked multi-hit list for in-panel search dropdown */
  searchHits: SettingsSearchHitView[];
  /** Appearance: current theme id (instant apply; not dirty) */
  appearanceThemeId: string;
  /** Appearance: color mode preference light|dark|system (instant; not dirty) */
  appearanceColorMode: ColorMode;
  /** Appearance: bumped on color-mode-changed so system hint re-resolves */
  appearanceColorModeRev: number;
  /** Appearance: animations master switch */
  appearanceAnimationsEnabled: boolean;
  /** Appearance: animation speed */
  appearanceAnimationSpeed: AnimationSpeed;
  /** Appearance: respect prefers-reduced-motion */
  appearanceRespectSystemPreference: boolean;
  /**
   * Active 应用策略预案 chip (`default` | reliability | speed | cost).
   * Derived from runtime fingerprint when possible; null = customized.
   */
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
  llmApiFamilyOptions: readonly LlmApiFamilyOption[];
  llmApiFamily: LlmApiFamilyId;
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
  settingsFooterStatusText: string;
  settingsAppVersionLabel: string;
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
  restoreLlmSettingsSnapshot(payload: unknown): Promise<void>;
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
  setLlmApiFamily(event: Event): void;
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
  setMasterAnalysisEvidenceDepth(depth: MasterAnalysisEvidenceDepth): void;
  masterAnalysisScheduleOptions: Array<{
    value: SchedulingPreference;
    label: string;
    hint: string;
  }>;
  masterAnalysisEvidenceDepthOptions: Array<{
    value: MasterAnalysisEvidenceDepth;
    label: string;
    hint: string;
  }>;
  masterAnalysisEvidenceDepthSelectedLabel: string;
  masterAnalysisEvidenceDepthSelectedHint: string;
  masterAnalysisScheduleSelectedLabel: string;
  masterAnalysisScheduleSelectedHint: string;
  setDeveloperDiagnosticBoolean(
    key: keyof Omit<DeveloperDiagnosticSettings, 'loggerMinLevel'>,
    event: Event
  ): void;
  setDeveloperDiagnosticLogLevel(event: Event): void;
  setProxyType(event: Event): void;
  setProxyCustomUrl(event: Event): void;
  toggleLlmKeyVisibility(): Promise<void>;
  toggleProxyKeyVisibility(): Promise<void>;
  getModelValue(model: ModelOption): string;
  getModelLabel(model: ModelOption): string;
  /** Tool-strategy select options: Provider:modelId */
  getToolStrategyModelOptionLabel(model: ModelOption): string;
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
  selectSettingsSearchHit(hitId: string, sectionId?: string): void;
  scrollToSearchHit(hitId: string, sectionId?: string): void;
  loadAppearanceSettings(): void;
  setAppearanceTheme(themeId: string): void;
  setAppearanceThemeFromEvent(event: Event): void;
  setAppearanceColorMode(mode: ColorMode): void;
  setAppearanceAnimationsEnabled(event: Event): void;
  setAppearanceAnimationSpeed(speed: AnimationSpeed): void;
  setAppearanceRespectSystemPreference(event: Event): void;
  syncActiveRuntimePresetFromSettings(): void;
  applyRuntimePresetById(id: RuntimePresetId | string): void;
  formatBytes(bytes: number): string;
  getProxyDisplayName(type: string): string;
  isDangerousEndpoint(endpoint: string): boolean;
  appearanceThemeOptions: Array<{ id: string; name: string; description?: string }>;
  /** True when color-mode preference is `system` (drives resolved hint visibility). */
  appearanceColorModeIsSystem: boolean;
  /** e.g. （当前为深色）; empty unless preference is system. */
  appearanceColorModeSystemHint: string;
}

export interface AlpineWatchContext {
  $watch<T = unknown>(property: string, callback: (value: T) => void): void;
}

export type SavedLLMConfig = Partial<LLMProviderConfig> | null;

export interface LLMProviderOption {
  id: string;
  name: string;
  label: string;
}

export interface ModelFeatureBadge {
  key: string;
  label: string;
  icon: string;
}

export interface ToolStrategyTargetView {
  id: ToolStrategyTargetId;
  label: string;
  description: string;
  modelHint: string;
  model: string;
  resolvedModel: string;
  /** Native follow option: Provider:model(跟随全局). */
  followGlobalOptionLabel: string;
  /** Hint when following global; kept for compatibility (UI uses fixed copy). */
  followGlobalResolvedLabel: string;
}

export interface RuntimeNumberFieldView {
  key: string;
  label: string;
  path: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
}

export interface LocalDataBucketView extends LocalDataBucketMeta {
  id: LocalDataBucketId;
  usedText: string;
  keysText: string;
  percentText: string;
  percentWidth: string;
  percentValue: number;
  isEmpty: boolean;
  isClearing: boolean;
}

export type SettingsPanelPart = Partial<SettingsPanelData> & ThisType<SettingsPanelData>;

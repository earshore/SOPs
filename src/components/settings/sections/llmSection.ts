// TD-SET-01 Phase 1: llm section fragment (verbatim).
import {
  API_PATH_OPTIONS,
  DEFAULT_REASONING_EFFORTS,
  buildFullApiUrl,
  clampEffort,
  isReasoningEffortLevel,
  normalizeApiPathId,
  normalizeReasoningUserPrefs,
  resolveModelCapability,
  shouldShowReasoningControls,
  type ApiPathOption,
  type ReasoningEffortLevel,
} from '@/services/modelCapability';
import {
  DEFAULT_NEW_API_ENDPOINT,
  PROVIDERS,
  getLlmProviderConfig,
  type ProviderConfig,
} from '@/common/config/llmProviders';
import { EnvConfig } from '@/common/config/envConfig';
import { getModelId } from '@/common/utils/modelOptions';
import { type ModelMetadata } from '../domain/localDataCopy';
import {
  LLM_API_FAMILY_OPTIONS,
  apiFamilyFromPathId,
  apiPathIdForFamily,
  applyFetchedModels,
  assertFetchedModels,
  buildApiPathCapabilityHint,
  buildModelCapabilityBadges,
  dedupeModels,
  findPresetModelInfo,
  formatModelContext,
  formatModelFeatures,
  getInitialModel,
  getModelFeatureBadges,
  getRawProviderModels,
  loadProviderApiKey,
  mergeModelMetadata,
  notifyModelFetchFailure,
  resolveProviderEndpoint,
  validateModelFetchInput,
} from '../domain/settingsLlmModel';
import { ErrorService } from '@/services/errorService';
import { LLMProviderConfig } from '@/types/state';
import {
  LlmApiFamilyId,
  LlmApiFamilyOption,
  LLMProviderOption,
  ModelFeatureBadge,
  SettingsPanelPart,
} from '../panelTypes';
import { StorageService } from '@/services/storageService';
import { fetchModelsFromApi } from '@/services/llmService';
import { showToast } from '@/common/ui';
import { updateModelStatus } from '../domain/settingsModelStatus';
import { saveSettingsDomainPartition } from '../domain/settingsDomain';

export const llmSectionBehavior: SettingsPanelPart = {
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

  get activeModelInfo(): ModelMetadata | null {
    if (!this.llm.model) return null;
    const m = this.llm.models.find(x => getModelId(x) === this.llm.model);
    const model = m && typeof m !== 'string' ? m : null;
    return mergeModelMetadata(model, findPresetModelInfo(this.llm.provider, this.llm.model));
  },

  get activeModelCapability() {
    if (!this.llm.model) return null;
    const m = this.llm.models.find(x => getModelId(x) === this.llm.model);
    return resolveModelCapability({
      provider: this.llm.provider,
      modelId: this.llm.model,
      modelsEntry: m ?? this.llm.model,
      // Align with transport resolution: use the effective user-selected path so
      // the settings UI shows exactly the tiers the request will actually send.
      preferredSurface: normalizeApiPathId(this.llm.apiPath),
    });
  },

  get showReasoningControls(): boolean {
    const cap = this.activeModelCapability;
    return cap ? shouldShowReasoningControls(cap) : false;
  },

  get reasoningEffortOptions(): ReasoningEffortLevel[] {
    const cap = this.activeModelCapability;
    // Product scale remains low…max; UI lists only what the active model can send.
    // Toggle-only models (e.g. Kimi K2.x) expose no tiers — empty hides the row.
    if (!cap) {
      return [...DEFAULT_REASONING_EFFORTS];
    }
    if (cap.supportsReasoning) {
      return cap.reasoningEfforts.filter(isReasoningEffortLevel);
    }
    // Unknown / unsupported models keep the full product scale so stored intent
    // survives a later switch to a reasoning-capable model (UI section is hidden).
    return [...DEFAULT_REASONING_EFFORTS];
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

  get llmApiFamilyOptions(): readonly LlmApiFamilyOption[] {
    return LLM_API_FAMILY_OPTIONS;
  },

  get llmApiFamily(): LlmApiFamilyId {
    return apiFamilyFromPathId(this.llm.apiPath);
  },

  /** Fold summary meta: complete endpoint URL shown on the Basic Info row. */
  get basicInfoMetaText(): string {
    const { fullUrl } = buildFullApiUrl(
      this.llm.endpoint || this.defaultLlmEndpoint,
      normalizeApiPathId(this.llm.apiPath),
      this.llm.model || '{model}'
    );
    return fullUrl || '尚未配置 Endpoint';
  },

  /** Fold summary meta: active model + reasoning level on the Model & Capability row. */
  get modelMetaText(): string {
    const model = (this.llm.model || '').trim();
    if (!model) return '未选择';
    return this.llm.reasoningPrefs?.enabled ? `${model} · ${this.reasoningEffortLabel}` : model;
  },

  /**
   * When user-selected API path differs from registry preferred surface for the
   * current model, surface a soft warning (still allowed — gateways vary).
   */
  get apiPathCapabilityHint(): string {
    const model = (this.llm.model || '').trim();
    if (!model) return '';
    const pathId = normalizeApiPathId(this.llm.apiPath);
    const modelsEntry = this.llm.models.find(x => getModelId(x) === model) ?? model;
    const registryCap = resolveModelCapability({
      provider: this.llm.provider,
      modelId: model,
      modelsEntry,
    });
    return buildApiPathCapabilityHint(pathId, registryCap);
  },

  get selectedApiPathDescription(): string {
    return this.selectedApiPathOption?.description || '';
  },

  get selectedApiPathOption(): ApiPathOption | undefined {
    const pathId = normalizeApiPathId(this.llm.apiPath);
    return API_PATH_OPTIONS.find(o => o.id === pathId);
  },

  get selectedApiPathPathLabel(): string {
    return this.selectedApiPathOption?.pathLabel || '/responses';
  },

  get selectedApiPathNameLabel(): string {
    return this.selectedApiPathOption?.label || 'Responses';
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
    const modelsEntry = this.llm.models.find(x => getModelId(x) === model) ?? model;
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
    return this.llm.isFetching
      ? 'fa-circle-notch fa-spin text-[var(--module-accent)]'
      : 'fa-sync-alt';
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

  get testConnectionIconClass(): string {
    return this.llm.isTesting
      ? 'fa-circle-notch fa-spin text-[var(--module-accent)]'
      : 'fa-plug text-emerald-500';
  },

  get testConnectionText(): string {
    return this.llm.isTesting ? '测试中...' : '测试连接';
  },

  async restoreLlmSettingsSnapshot(payload: unknown): Promise<void> {
    const snap = payload as {
      provider?: string;
      config?: LLMProviderConfig;
    };
    if (!snap?.provider || !snap.config) return;
    await saveSettingsDomainPartition('llm', { provider: snap.provider, config: snap.config });
    this.llm.provider = snap.provider;
    await this.loadProviderConfig(snap.provider);
    updateModelStatus();
  },

  async loadProviderConfig(provider: string): Promise<void> {
    const config = getLlmProviderConfig(provider);
    if (!config) return;

    const savedConfig = StorageService.getLLMConfig(provider);
    this.llm.endpoint = resolveProviderEndpoint(provider, config, savedConfig?.endpoint || '');
    this.llm.apiKey = await loadProviderApiKey(provider, savedConfig);
    // Without any credentials (no saved config, no API key), keep the model list
    // empty so only "— 请选择 —" is shown instead of preset models that cannot
    // actually be called yet.
    const hasCredentials = Boolean(savedConfig) || Boolean((this.llm.apiKey || '').trim());
    this.llm.models = hasCredentials ? dedupeModels(getRawProviderModels(savedConfig, config)) : [];
    this.llm.model = hasCredentials ? getInitialModel(savedConfig?.model, this.llm.models) : '';
    this.llm.serviceTier = savedConfig?.serviceTier;
    this.llm.reasoningPrefs = normalizeReasoningUserPrefs(savedConfig?.reasoningPrefs);
    // No stored preference: reflect the model capability default (vendor default
    // semantics, e.g. GLM-4.7/Qwen3 ship with thinking ON) in the toggle UI.
    if (savedConfig?.reasoningPrefs === undefined) {
      const cap = this.activeModelCapability;
      if (cap?.defaultEnabled) {
        this.llm.reasoningPrefs = { ...this.llm.reasoningPrefs, enabled: true };
      }
    }
    // No stored path: keep the vendor-family default (OpenAI → /responses) instead of
    // the global fallback /chat/completions, so first-open and family re-select show the
    // same path. normalizeApiPathId still guards invalid legacy saved values.
    this.llm.apiPath =
      savedConfig?.apiPath !== undefined
        ? normalizeApiPathId(savedConfig.apiPath)
        : apiPathIdForFamily(apiFamilyFromPathId(this.llm.apiPath));
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
};

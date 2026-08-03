// TD-SET-01 Phase 1: tool section fragment (verbatim).
import {
  DEFAULT_RUNTIME_STRATEGY_SETTINGS,
  getRuntimeStrategySettings,
  normalizeRuntimeStrategySettings,
  saveRuntimeStrategySettings,
  type MasterAnalysisEvidenceDepth,
  type RuntimeStrategySettings,
} from '@/services/runtimeStrategyService';
import { ErrorService } from '@/services/errorService';
import {
  TOOL_STRATEGY_TARGETS,
  getToolStrategySettings,
  getToolTargetDefaultModel,
  setToolTargetDefaultModel,
  type ToolStrategyTargetId,
} from '@/services/toolStrategyService';
import { ToolStrategyTargetView, RuntimeNumberFieldView, SettingsPanelPart } from '../panelTypes';
import {
  applyRuntimePreset,
  isRuntimePresetId,
  matchRuntimePreset,
  type RuntimePresetId,
} from '@/components/settings/domain/settingsPresets';
import { type ModelOption } from '../domain/localDataCopy';
import {
  formatSchedulePreferenceHint,
  isSchedulingPreference,
  SCHEDULE_PREFERENCE_SHORT_LABELS,
  type SchedulingPreference,
} from '@/modules/app_center/views/master_analysis/ai_analysis/services/analysisScheduler';
import { getLlmProviderConfig } from '@/common/config/llmProviders';
import {
  getSettingsRollbackCount,
  pushSettingsRollbackSnapshot,
} from '@/components/settings/domain/settingsRollback';
import { showToast } from '@/common/ui';

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

export function createEmptyToolTargetModels(): Record<ToolStrategyTargetId, string> {
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

export const toolStrategySectionBehavior: SettingsPanelPart = {
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
      const resolvedModel = model || this.llm.model || '未选择模型';
      const providerLabel = this.toolStrategyProviderLabel;
      const followGlobalOptionLabel =
        resolvedModel && resolvedModel !== '未选择模型'
          ? `${providerLabel}: ${resolvedModel}(跟随全局)`
          : '未选择模型(跟随全局)';
      const followGlobalResolvedLabel = '跟随全局模型';
      return {
        ...target,
        model,
        resolvedModel,
        followGlobalOptionLabel,
        followGlobalResolvedLabel,
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

  get masterAnalysisEvidenceDepthOptions(): Array<{
    value: MasterAnalysisEvidenceDepth;
    label: string;
    hint: string;
  }> {
    return [
      {
        value: 'fast',
        label: '快速',
        hint: '更少评论/要点 · 更高并发 · 适合扫一轮',
      },
      {
        value: 'balanced',
        label: '均衡',
        hint: '默认覆盖 · 速度与完整度折中',
      },
      {
        value: 'deep',
        label: '深入',
        hint: '更多证据 · 更完整字段 · 更慢更贵',
      },
    ];
  },

  get masterAnalysisEvidenceDepthSelectedLabel(): string {
    const depth = this.runtimeStrategy.settings.masterAnalysis.evidenceDepth || 'balanced';
    return (
      this.masterAnalysisEvidenceDepthOptions.find(item => item.value === depth)?.label || '均衡'
    );
  },

  get masterAnalysisEvidenceDepthSelectedHint(): string {
    const depth = this.runtimeStrategy.settings.masterAnalysis.evidenceDepth || 'balanced';
    return (
      this.masterAnalysisEvidenceDepthOptions.find(item => item.value === depth)?.hint ||
      '默认覆盖 · 速度与完整度折中'
    );
  },

  get ppcThresholdItems(): RuntimeNumberFieldView[] {
    return PPC_THRESHOLD_FIELDS.map(field => ({
      ...field,
      value: this.getRuntimeNumber(field.path),
    }));
  },

  get canUndoRuntimeSave(): boolean {
    return getSettingsRollbackCount('runtime') > 0;
  },

  // Lifecycle
  syncActiveRuntimePresetFromSettings(): void {
    this.activeRuntimePresetId = matchRuntimePreset(this.runtimeStrategy.settings);
  },

  applyRuntimePresetById(id: RuntimePresetId | string): void {
    if (!isRuntimePresetId(id)) return;
    this.runtimeStrategy.settings = applyRuntimePreset(this.runtimeStrategy.settings, id);
    this.activeRuntimePresetId = id;
    // Button control: auto-persist runtime strategy
    void this.persistRuntimeStrategySettings({
      toast: id === 'default' ? '已应用并保存默认策略预案' : '已应用并保存策略预案',
    });
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
    this.syncActiveRuntimePresetFromSettings();
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
    this.syncActiveRuntimePresetFromSettings();
  },

  // --- Proxy Logic ---

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
    this.syncActiveRuntimePresetFromSettings();
  },

  setRuntimeBoolean(path: string, event: Event): void {
    setRuntimePathValue(
      this.runtimeStrategy.settings,
      path,
      (event.target as HTMLInputElement).checked
    );
    this.syncActiveRuntimePresetFromSettings();
    // Switch controls: instant-save runtime strategy (no footer click required)
    void this.persistRuntimeStrategySettings({ toast: '已保存' });
  },

  setRuntimeString(path: string, event: Event): void {
    setRuntimePathValue(
      this.runtimeStrategy.settings,
      path,
      (event.target as HTMLSelectElement).value
    );
    this.syncActiveRuntimePresetFromSettings();
  },

  setMasterAnalysisSchedulePreference(preference: SchedulingPreference): void {
    if (!isSchedulingPreference(preference)) return;
    this.runtimeStrategy.settings.masterAnalysis.schedulingPreference = preference;
    this.schedulePreferenceMenuOpen = false;
    this.syncActiveRuntimePresetFromSettings();
    void this.persistRuntimeStrategySettings({ toast: '性能设置已保存' });
  },

  setMasterAnalysisEvidenceDepth(depth: MasterAnalysisEvidenceDepth): void {
    if (depth !== 'fast' && depth !== 'balanced' && depth !== 'deep') return;
    this.runtimeStrategy.settings.masterAnalysis.evidenceDepth = depth;
    this.syncActiveRuntimePresetFromSettings();
    void this.persistRuntimeStrategySettings({ toast: '证据深度已保存' });
  },

  getToolStrategyModelOptionLabel(model: ModelOption): string {
    const id = this.getModelValue(model);
    const provider = (this.toolStrategyProviderLabel || '').trim();
    // Native <option> is single-color; space after colon for scanability.
    return provider ? `${provider}: ${id}` : id;
  },

  /**
   * Keep the rendered option list in sync with llm.model. Alpine's x-for reuses
   * <option> nodes when the models array is replaced (e.g. 获取模型列表), and the
   * browser resets <select>.value if the selected option node is briefly removed
   * — :selected re-asserts the saved model after every re-render.
   */
};

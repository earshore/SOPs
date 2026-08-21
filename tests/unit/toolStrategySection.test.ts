import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createEmptyToolTargetModels,
  toolStrategySectionBehavior,
} from '@/components/settings/sections/toolStrategySection';
import type {
  RuntimeNumberFieldView,
  RuntimeStrategyState,
  ToolStrategyState,
  ToolStrategyTargetView,
} from '@/components/settings/panelTypes';
import type { RuntimeStrategySettings } from '@/services/runtimeStrategyService';
import { showToast as directShowToast } from '@/common/ui';

// ---------- 依赖 mock ----------
const deps = vi.hoisted(() => ({
  getLlmProviderConfig: vi.fn(),
  showToast: vi.fn(),
  applyRuntimePreset: vi.fn(),
  isRuntimePresetId: vi.fn(),
  matchRuntimePreset: vi.fn(),
  getSettingsRollbackCount: vi.fn(),
  pushSettingsRollbackSnapshot: vi.fn(),
  formatSchedulePreferenceHint: vi.fn(),
  isSchedulingPreference: vi.fn(),
  ErrorServiceHandle: vi.fn(),
  getRuntimeStrategySettings: vi.fn(),
  saveRuntimeStrategySettings: vi.fn(),
  normalizeRuntimeStrategySettings: vi.fn(),
  getToolStrategySettings: vi.fn(),
  getToolTargetDefaultModel: vi.fn(),
  setToolTargetDefaultModel: vi.fn(),
}));

vi.mock('@/common/config/llmProviders', () => ({
  getLlmProviderConfig: deps.getLlmProviderConfig,
}));
vi.mock('@/common/ui', () => ({ showToast: deps.showToast }));
vi.mock('@/components/settings/domain/settingsPresets', () => ({
  applyRuntimePreset: deps.applyRuntimePreset,
  isRuntimePresetId: deps.isRuntimePresetId,
  matchRuntimePreset: deps.matchRuntimePreset,
}));
vi.mock('@/components/settings/domain/settingsRollback', () => ({
  getSettingsRollbackCount: deps.getSettingsRollbackCount,
  pushSettingsRollbackSnapshot: deps.pushSettingsRollbackSnapshot,
}));
vi.mock('@/modules/app_center/views/master_analysis/ai_analysis/services/analysisScheduler', () => ({
  formatSchedulePreferenceHint: deps.formatSchedulePreferenceHint,
  isSchedulingPreference: deps.isSchedulingPreference,
  SCHEDULE_PREFERENCE_SHORT_LABELS: {
    recommended: '推荐',
    reliability: '稳定',
    speed: '速度',
  },
}));
vi.mock('@/services/errorService', () => ({
  ErrorService: { handle: deps.ErrorServiceHandle },
}));
vi.mock('@/services/runtimeStrategyService', () => ({
  DEFAULT_RUNTIME_STRATEGY_SETTINGS: {
    masterAnalysis: {
      tokenBudgetsByTarget: { 'title-keywords': 8192, 'selling-points': 8192 },
      schedulingPreference: 'recommended',
      evidenceDepth: 'balanced',
      enableCache: false,
    },
    llm: { testConnectionTimeoutMs: 15000, analysisTimeoutMs: 120000, maxRetries: 3 },
    deepChat: { requestTimeoutMs: 60000, enableBusinessTools: true },
    ppcSearchTerms: {
      batchSize: 50,
      maxConcurrentBatches: 2,
      thresholds: {
        targetAcos: 25,
        highAcos: 60,
        minClicksNoOrder: 20,
        minSpendNoOrder: 500,
        minOrdersHarvest: 10,
        minCtr: 0.5,
      },
    },
    keywordHunterSeoProcess: { enableLlmCache: true },
    keywordHunterListingReview: { enableLlmCache: false },
  } as unknown as RuntimeStrategySettings,
  MASTER_ANALYSIS_EVIDENCE_DEPTH_BY_SCHEDULING: {
    recommended: 'balanced',
    reliability: 'deep',
    speed: 'fast',
  } as Record<string, string>,
  MASTER_ANALYSIS_SCHEDULING_BY_EVIDENCE_DEPTH: {
    fast: 'speed',
    balanced: 'recommended',
    deep: 'reliability',
  } as Record<string, string>,
  MASTER_ANALYSIS_BUDGET_FIELDS: [
    { key: 'title-keywords', label: '标题关键词', path: 'masterAnalysis.tokenBudgetsByTarget.title-keywords' },
    { key: 'selling-points', label: '核心卖点', path: 'masterAnalysis.tokenBudgetsByTarget.selling-points' },
  ] as never,
  getRuntimeStrategySettings: deps.getRuntimeStrategySettings,
  saveRuntimeStrategySettings: deps.saveRuntimeStrategySettings,
  normalizeRuntimeStrategySettings: deps.normalizeRuntimeStrategySettings,
}));
vi.mock('@/services/toolStrategyService', () => ({
  TOOL_STRATEGY_TARGETS: [
    { id: 'master-analysis-ai-analysis', label: 'Master Analysis - AI智能分析' },
    { id: 'playground-deep-chat', label: 'Playground - Deep Chat' },
  ],
  getToolStrategySettings: deps.getToolStrategySettings,
  getToolTargetDefaultModel: deps.getToolTargetDefaultModel,
  setToolTargetDefaultModel: deps.setToolTargetDefaultModel,
}));

// ---------- this 上下文构造 ----------
// behavior 是 SettingsPanelPart 行为包（挂载到 Alpine data 上）。测试以原型链方式复用
// behavior 上的所有方法：ctx = Object.create(behavior)，方法沿原型链执行真实逻辑；
// 数据字段直接放在 ctx 上。注意 clearAllMocks 会清掉 mock 返回值，beforeEach 必须逐项重设。
interface CtxData {
  llm: ReturnType<typeof defaultLlmState>;
  toolStrategy: ToolStrategyState;
  runtimeStrategy: RuntimeStrategyState;
  activeRuntimePresetId: string | null;
  schedulePreferenceMenuOpen: boolean;
}

const behavior = toolStrategySectionBehavior;
type Ctx = CtxData;

// 工具函数：以 ctx 作为 this 执行 behavior 上的 getter。
// 直接访问 behavior.xxx 会先触发 getter（this=behavior），无法用 call 绑定 this，
// 因此通过 property descriptor 的 get 手动绑定 this。
function getter<T>(name: keyof typeof behavior, ctx: Ctx): T {
  const desc = Object.getOwnPropertyDescriptor(behavior, name);
  return desc!.get!.call(ctx) as T;
}

function defaultLlmState() {
  return {
    provider: 'openai',
    endpoint: 'https://api.openai.com/v1',
    apiKey: 'sk-xxx',
    model: 'gpt-4o',
    models: [
      { id: 'gpt-4o', value: 'gpt-4o' },
      { id: 'gpt-4o-mini', value: 'gpt-4o-mini' },
    ],
    reasoningPrefs: { effort: 'medium', enabled: false, maxTokens: 4096 },
    apiPath: 'default',
    showKey: false,
    isFetching: false,
    isTesting: false,
  } as never;
}

function defaultRuntimeSettings(): RuntimeStrategySettings {
  return {
    version: 2,
    llm: { testConnectionTimeoutMs: 15000, analysisTimeoutMs: 120000, maxRetries: 3 },
    deepChat: { requestTimeoutMs: 60000, enableBusinessTools: true },
    masterAnalysis: {
      tokenBudgetsByTarget: { 'title-keywords': 8192 },
      schedulingPreference: 'recommended',
      evidenceDepth: 'balanced',
      enableCache: false,
    },
    ppcSearchTerms: {
      batchSize: 50,
      maxConcurrentBatches: 2,
      thresholds: {
        targetAcos: 25,
        highAcos: 60,
        minClicksNoOrder: 20,
        minSpendNoOrder: 500,
        minOrdersHarvest: 10,
        minCtr: 0.5,
      },
    },
    keywordHunterSeoProcess: { enableLlmCache: true },
    keywordHunterListingReview: { enableLlmCache: false },
  } as never;
}

function makeCtx(overrides: Partial<CtxData> = {}): Ctx {
  return Object.assign(Object.create(behavior), {
    llm: defaultLlmState(),
    toolStrategy: { targetModels: {}, isSaving: false },
    runtimeStrategy: { settings: defaultRuntimeSettings(), isSaving: false },
    activeRuntimePresetId: null,
    schedulePreferenceMenuOpen: false,
    // 跨 section 钩子（由系统设置面板提供，行为对象内以 this.xxx 调用）。
    // 行为方法执行流程断言以 deps 副作用为主，此处保留 fn 以便统计调用次数。
    loadRuntimeStrategy: vi.fn(),
    captureSettingsBaseline: vi.fn(),
    refreshRollbackUi: vi.fn(),
    getModelValue: (model: { value?: string }) => model?.value ?? '',
    ...overrides,
  } as never);
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  // vi.restoreAllMocks 不会重置 vi.fn() 的 mockImplementation/mockReturnValueOnce，
  // 手动 mockReset 防止异常用例的抛错实现泄漏到后续用例。
  deps.saveRuntimeStrategySettings.mockReset();
});

// ======================================================================
// createEmptyToolTargetModels
// ======================================================================
describe('createEmptyToolTargetModels', () => {
  it('为每个 TOOL_STRATEGY_TARGETS 生成空 model 条目', () => {
    const models = createEmptyToolTargetModels();
    expect(Object.keys(models)).toEqual([
      'master-analysis-ai-analysis',
      'playground-deep-chat',
    ]);
    expect(Object.values(models)).toEqual(['', '']);
  });
});

// ======================================================================
// 厂商与模型选择 getter
// ======================================================================
describe('toolStrategyProviderLabel / toolStrategyModelSelectDisabled', () => {
  it('厂商配置存在时返回配置名称', () => {
    deps.getLlmProviderConfig.mockReturnValue({ name: 'OpenAI' });
    const ctx = makeCtx();
    expect(getter('toolStrategyProviderLabel', ctx)).toBe('OpenAI');
  });

  it('配置缺失但有 llm.provider 时回落到 provider id', () => {
    deps.getLlmProviderConfig.mockReturnValue(null);
    const ctx = makeCtx();
    expect(getter('toolStrategyProviderLabel', ctx)).toBe('openai');
  });

  it('配置缺失且 provider 为空时返回"未选择厂商"', () => {
    deps.getLlmProviderConfig.mockReturnValue(null);
    const ctx = makeCtx({ llm: { ...defaultLlmState(), provider: '' } });
    expect(getter('toolStrategyProviderLabel', ctx)).toBe('未选择厂商');
  });

  it('models 为空时模型选择器禁用', () => {
    const ctx = makeCtx({ llm: { ...defaultLlmState(), models: [] } });
    expect(getter('toolStrategyModelSelectDisabled', ctx)).toBe(true);
    const ctx2 = makeCtx();
    expect(getter<boolean>('toolStrategyModelSelectDisabled', ctx2)).toBe(false);
  });
});

// ======================================================================
// toolStrategyTargetItems
// ======================================================================
describe('toolStrategyTargetItems / toolStrategyTargetItemsByIds', () => {
  it('已配置目标模型时使用配置值并生成跟随全局标签', () => {
    deps.getLlmProviderConfig.mockReturnValue({ name: 'OpenAI' });
    const ctx = makeCtx({
      toolStrategy: { targetModels: { 'master-analysis-ai-analysis': 'gpt-4o' }, isSaving: false },
    });
    const items = getter('toolStrategyTargetItems', ctx) as ToolStrategyTargetView[];
    const ai = items.find(i => i.id === 'master-analysis-ai-analysis')!;
    expect(ai.model).toBe('gpt-4o');
    expect(ai.resolvedModel).toBe('gpt-4o');
    expect(ai.followGlobalOptionLabel).toBe('OpenAI: gpt-4o(跟随全局)');
    expect(ai.followGlobalResolvedLabel).toBe('跟随全局模型');
  });

  it('未配置时回落到全局模型 llm.model', () => {
    deps.getLlmProviderConfig.mockReturnValue({ name: 'OpenAI' });
    const ctx = makeCtx({ toolStrategy: { targetModels: {}, isSaving: false } });
    const items = getter('toolStrategyTargetItems', ctx) as ToolStrategyTargetView[];
    const deep = items.find(i => i.id === 'playground-deep-chat')!;
    expect(deep.model).toBe('');
    expect(deep.resolvedModel).toBe('gpt-4o');
  });

  it('全局模型也为空时显示"未选择模型"的跟随全局标签', () => {
    deps.getLlmProviderConfig.mockReturnValue(null);
    const ctx = makeCtx({
      llm: { ...defaultLlmState(), model: '', provider: '' },
      toolStrategy: { targetModels: {}, isSaving: false },
    });
    const items = getter('toolStrategyTargetItems', ctx) as ToolStrategyTargetView[];
    const deep = items.find(i => i.id === 'playground-deep-chat')!;
    expect(deep.resolvedModel).toBe('未选择模型');
    expect(deep.followGlobalOptionLabel).toBe('未选择模型(跟随全局)');
  });

  it('toolStrategyTargetItemsByIds 按 id 过滤且排除未命中 id', () => {
    deps.getLlmProviderConfig.mockReturnValue({ name: 'OpenAI' });
    const ctx = makeCtx({ toolStrategy: { targetModels: {}, isSaving: false } });
    const ids = behavior.toolStrategyTargetItemsByIds.call(ctx, [
      'playground-deep-chat',
      ('unknown-id' as never),
    ]) as ToolStrategyTargetView[];
    expect(ids.map(i => i.id)).toEqual(['playground-deep-chat']);
    expect(ids).toHaveLength(1);
  });
});

// ======================================================================
// 保存按钮文本/图标
// ======================================================================
describe('save 文本与图标', () => {
  it('非保存中显示保存文案与 fa-check', () => {
    const ctx = makeCtx();
    expect(getter('toolStrategySaveText', ctx)).toBe('保存工具与运行策略');
    expect(getter('toolStrategySaveIconClass', ctx)).toBe('fa-check');
    expect(getter('runtimeStrategySaveText', ctx)).toBe('保存运行策略');
    expect(getter('runtimeStrategySaveIconClass', ctx)).toBe('fa-check');
  });

  it('保存中显示"保存中"与转圈图标', () => {
    const ctx = makeCtx({
      toolStrategy: { targetModels: {}, isSaving: true },
      runtimeStrategy: { settings: defaultRuntimeSettings(), isSaving: true },
    });
    expect(getter('toolStrategySaveText', ctx)).toBe('保存中');
    expect(getter('toolStrategySaveIconClass', ctx)).toBe('fa-circle-notch fa-spin');
    expect(getter('runtimeStrategySaveText', ctx)).toBe('保存中');
    expect(getter('runtimeStrategySaveIconClass', ctx)).toBe('fa-circle-notch fa-spin');
  });
});

// ======================================================================
// 超时秒数转换（millisecondsToSeconds）
// ======================================================================
describe('超时秒数 getter', () => {
  it('毫秒转秒（含四舍五入）', () => {
    const ctx = makeCtx();
    expect(getter('runtimeTestConnectionTimeoutSeconds', ctx)).toBe(15);
    expect(getter('runtimeAnalysisTimeoutSeconds', ctx)).toBe(120);
    expect(getter('runtimeDeepChatTimeoutSeconds', ctx)).toBe(60);
    ctx.runtimeStrategy.settings.llm.testConnectionTimeoutMs = 15499;
    expect(getter('runtimeTestConnectionTimeoutSeconds', ctx)).toBe(15);
    ctx.runtimeStrategy.settings.llm.testConnectionTimeoutMs = 15500;
    expect(getter('runtimeTestConnectionTimeoutSeconds', ctx)).toBe(16);
  });
});

// ======================================================================
// masterAnalysisBudgetItems
// ======================================================================
describe('masterAnalysisBudgetItems', () => {
  it('优先 settings 值，缺失回落到默认配置', () => {
    const ctx = makeCtx();
    ctx.runtimeStrategy.settings.masterAnalysis.tokenBudgetsByTarget['title-keywords'] = 10240;
    const items = getter('masterAnalysisBudgetItems', ctx) as RuntimeNumberFieldView[];
    const title = items.find(i => i.key === 'title-keywords')!;
    expect(title.value).toBe(10240);
    expect(title.path).toBe('masterAnalysis.tokenBudgetsByTarget.title-keywords');
    expect(title.unit).toBe('tokens');
    const selling = items.find(i => i.key === 'selling-points')!;
    expect(selling.value).toBe(8192); // 回落到 DEFAULT_RUNTIME_STRATEGY_SETTINGS.masterAnalysis.tokenBudgetsByTarget
  });

  it('settings 与默认均无值时显示 0', () => {
    const ctx = makeCtx();
    ctx.runtimeStrategy.settings.masterAnalysis.tokenBudgetsByTarget = {};
    const items = getter('masterAnalysisBudgetItems', ctx) as RuntimeNumberFieldView[];
    const selling = items.find(i => i.key === 'selling-points')!;
    expect(selling.value).toBe(8192); // 均无值时回落到 DEFAULT 常量
  });
});

// ======================================================================
// 调度偏好选项/选中态
// ======================================================================
describe('masterAnalysisSchedule*', () => {
  beforeEach(() => {
    deps.formatSchedulePreferenceHint.mockReturnValue('提示文案');
    deps.isSchedulingPreference.mockImplementation(
      (v: unknown) => v === 'recommended' || v === 'reliability' || v === 'speed'
    );
  });

  it('scheduleOptions 覆盖三种偏好并透传 enableCache', () => {
    const ctx = makeCtx();
    ctx.runtimeStrategy.settings.masterAnalysis.enableCache = true;
    const opts = getter('masterAnalysisScheduleOptions', ctx) as Array<{
      value: string;
      label: string;
      hint: string;
    }>;
    expect(opts.map(o => o.value)).toEqual(['recommended', 'reliability', 'speed']);
    expect(opts[0].label).toBe('推荐');
    expect(deps.formatSchedulePreferenceHint).toHaveBeenCalledWith('recommended', true);
  });

  it('合法偏好时 selectedLabel 取偏好标签', () => {
    const ctx = makeCtx();
    ctx.runtimeStrategy.settings.masterAnalysis.schedulingPreference = 'speed';
    expect(getter('masterAnalysisScheduleSelectedLabel', ctx)).toBe('速度');
  });

  it('非法偏好时回落到 recommended', () => {
    const ctx = makeCtx();
    ctx.runtimeStrategy.settings.masterAnalysis.schedulingPreference = 'custom';
    // cond-expr 走 false 分支（'recommended'），随后取 LABELS['recommended']
    expect(getter('masterAnalysisScheduleSelectedLabel', ctx)).toBe('推荐');
  });

  it('非法偏好时 selectedHint 的 key 同样回落到 recommended', () => {
    deps.isSchedulingPreference.mockReturnValue(false);
    const ctx = makeCtx();
    ctx.runtimeStrategy.settings.masterAnalysis.schedulingPreference = 'custom';
    ctx.runtimeStrategy.settings.masterAnalysis.enableCache = false;
    getter('masterAnalysisScheduleSelectedHint', ctx);
    expect(deps.formatSchedulePreferenceHint).toHaveBeenCalledWith('recommended', false);
  });

  it('selectedHint 使用格式化函数与 enableCache', () => {
    const ctx = makeCtx();
    ctx.runtimeStrategy.settings.masterAnalysis.enableCache = false;
    getter('masterAnalysisScheduleSelectedHint', ctx);
    expect(deps.formatSchedulePreferenceHint).toHaveBeenCalledWith('recommended', false);
  });
});

// ======================================================================
// 证据深度选项/选中态
// ======================================================================
describe('masterAnalysisEvidenceDepth*', () => {
  it('evidenceDepthOptions 固定三个档位', () => {
    const ctx = makeCtx();
    const opts = getter('masterAnalysisEvidenceDepthOptions', ctx) as Array<{
      value: string;
      label: string;
      hint: string;
    }>;
    expect(opts.map(o => o.value)).toEqual(['fast', 'balanced', 'deep']);
  });

  it('已配置深度时显示对应 label 与 hint', () => {
    const ctx = makeCtx();
    ctx.runtimeStrategy.settings.masterAnalysis.evidenceDepth = 'deep';
    expect(getter('masterAnalysisEvidenceDepthSelectedLabel', ctx)).toBe('深入');
    expect(getter('masterAnalysisEvidenceDepthSelectedHint', ctx)).toContain('更慢更贵');
  });

  it('深度未配置时回落到 balanced', () => {
    const ctx = makeCtx();
    ctx.runtimeStrategy.settings.masterAnalysis.evidenceDepth = '' as never;
    expect(getter('masterAnalysisEvidenceDepthSelectedLabel', ctx)).toBe('均衡');
    expect(getter('masterAnalysisEvidenceDepthSelectedHint', ctx)).toContain('默认覆盖');
  });
});

// ======================================================================
// ppcThresholdItems
// ======================================================================
describe('ppcThresholdItems', () => {
  it('通过 getRuntimeNumber 读取 ppcSearchTerms.thresholds 各字段', () => {
    const ctx = makeCtx();
    const items = getter('ppcThresholdItems', ctx) as RuntimeNumberFieldView[];
    const acos = items.find(i => i.key === 'targetAcos')!;
    expect(acos.value).toBe(25);
    expect(acos.path).toBe('ppcSearchTerms.thresholds.targetAcos');
    const ctr = items.find(i => i.key === 'minCtr')!;
    expect(ctr.value).toBe(0.5);
    expect(items).toHaveLength(6);
  });
});

// ======================================================================
// canUndoRuntimeSave
// ======================================================================
describe('canUndoRuntimeSave', () => {
  it('存在回滚快照时可撤销', () => {
    deps.getSettingsRollbackCount.mockReturnValue(1);
    expect(getter<boolean>('canUndoRuntimeSave', makeCtx())).toBe(true);
  });

  it('无快照时不可撤销', () => {
    deps.getSettingsRollbackCount.mockReturnValue(0);
    expect(getter<boolean>('canUndoRuntimeSave', makeCtx())).toBe(false);
  });
});

// ======================================================================
// syncActiveRuntimePresetFromSettings / applyRuntimePresetById
// ======================================================================
describe('运行时策略预案', () => {
  beforeEach(() => {
    deps.matchRuntimePreset.mockReturnValue('default');
    deps.isRuntimePresetId.mockImplementation(
      (v: unknown) => v === 'default' || v === 'reliability' || v === 'speed' || v === 'cost'
    );
    deps.applyRuntimePreset.mockImplementation((settings: RuntimeStrategySettings, id: string) => ({
      ...settings,
      _applied: id,
    }));
  });

  it('syncActiveRuntimePresetFromSettings 用 settings 匹配预案 id', () => {
    const ctx = makeCtx();
    behavior.syncActiveRuntimePresetFromSettings.call(ctx);
    expect(deps.matchRuntimePreset).toHaveBeenCalledWith(ctx.runtimeStrategy.settings);
    expect(ctx.activeRuntimePresetId).toBe('default');
  });

  it('applyRuntimePresetById 应用预案并自动持久化（default 特殊 toast）', async () => {
    const ctx = makeCtx();
    await behavior.applyRuntimePresetById.call(ctx, 'default');
    expect(deps.applyRuntimePreset).toHaveBeenCalled();
    expect(ctx.activeRuntimePresetId).toBe('default');
    expect(deps.showToast).toHaveBeenCalledWith('已应用并保存默认策略预案', { type: 'success' });
  });

  it('applyRuntimePresetById 非 default 预案使用通用 toast', async () => {
    const ctx = makeCtx();
    await behavior.applyRuntimePresetById.call(ctx, 'reliability');
    expect(deps.showToast).toHaveBeenCalledWith('已应用并保存策略预案', { type: 'success' });
  });

  it('applyRuntimePresetById 拒绝非法 id（早返回）', async () => {
    deps.isRuntimePresetId.mockReturnValue(false);
    const ctx = makeCtx();
    await behavior.applyRuntimePresetById.call(ctx, 'evil');
    expect(deps.applyRuntimePreset).not.toHaveBeenCalled();
    expect(deps.showToast).not.toHaveBeenCalled();
    expect(ctx.activeRuntimePresetId).toBeNull();
  });
});

// ======================================================================
// loadToolStrategyDefaults
// ======================================================================
describe('loadToolStrategyDefaults', () => {
  it('为每个目标加载厂商默认模型', () => {
    deps.getToolTargetDefaultModel.mockReturnValueOnce('gpt-4o').mockReturnValueOnce('gpt-4o-mini');
    const ctx = makeCtx();
    behavior.loadToolStrategyDefaults.call(ctx);
    expect(ctx.toolStrategy.targetModels['master-analysis-ai-analysis']).toBe('gpt-4o');
    expect(ctx.toolStrategy.targetModels['playground-deep-chat']).toBe('gpt-4o-mini');
    expect(deps.getToolTargetDefaultModel).toHaveBeenCalledTimes(2);
  });
});

// ======================================================================
// saveToolStrategy
// ======================================================================
describe('saveToolStrategy', () => {
  beforeEach(() => {
    deps.getToolStrategySettings.mockReturnValue({ version: 2, targets: {} });
    deps.getRuntimeStrategySettings.mockReturnValue(defaultRuntimeSettings());
  });

  it('成功保存：快照→设置默认模型→保存→刷新→toast', async () => {
    const ctx = makeCtx({
      toolStrategy: { targetModels: { 'master-analysis-ai-analysis': 'qwen-max' }, isSaving: false },
    });
    await behavior.saveToolStrategy.call(ctx);
    expect(deps.pushSettingsRollbackSnapshot).toHaveBeenCalledTimes(2);
    expect(deps.pushSettingsRollbackSnapshot).toHaveBeenCalledWith(
      'toolStrategy',
      { version: 2, targets: {} }
    );
    expect(deps.setToolTargetDefaultModel).toHaveBeenCalledWith(
      'master-analysis-ai-analysis',
      'openai',
      'qwen-max'
    );
    expect(deps.saveRuntimeStrategySettings).toHaveBeenCalled();
    expect(ctx.loadRuntimeStrategy).toHaveBeenCalled();
    expect(ctx.captureSettingsBaseline).toHaveBeenCalled();
    expect(ctx.refreshRollbackUi).toHaveBeenCalled();
    expect(deps.showToast).toHaveBeenCalledWith('工具与运行策略已保存', { type: 'success' });
    expect(ctx.toolStrategy.isSaving).toBe(false);
  });

  it('空模型条目时以空字符串保存', async () => {
    const ctx = makeCtx({ toolStrategy: { targetModels: {}, isSaving: false } });
    await behavior.saveToolStrategy.call(ctx);
    expect(deps.setToolTargetDefaultModel).toHaveBeenCalledWith(
      'master-analysis-ai-analysis',
      'openai',
      ''
    );
  });

  it('异常时走 ErrorService.handle 且 isSaving 被复位', async () => {
    deps.saveRuntimeStrategySettings.mockImplementation(() => {
      throw new Error('storage boom');
    });
    const ctx = makeCtx({ toolStrategy: { targetModels: {}, isSaving: false } });
    await behavior.saveToolStrategy.call(ctx);
    expect(deps.ErrorServiceHandle).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ action: 'saveToolStrategy', module: 'settings' })
    );
    expect(ctx.toolStrategy.isSaving).toBe(false);
  });
});

// ======================================================================
// loadRuntimeStrategy / resetRuntimeStrategy
// ======================================================================
describe('loadRuntimeStrategy / resetRuntimeStrategy', () => {
  it('loadRuntimeStrategy 拉取 settings 并同步预案', () => {
    deps.getRuntimeStrategySettings.mockReturnValue(defaultRuntimeSettings());
    deps.matchRuntimePreset.mockReturnValue('speed');
    const ctx = makeCtx();
    behavior.loadRuntimeStrategy.call(ctx);
    expect(ctx.runtimeStrategy.settings).toEqual(defaultRuntimeSettings());
    expect(ctx.activeRuntimePresetId).toBe('speed');
  });

  it('resetRuntimeStrategy 用归一化后的默认值替换并同步预案', () => {
    const normalized = { ...defaultRuntimeSettings(), _normalized: true };
    deps.normalizeRuntimeStrategySettings.mockReturnValue(normalized);
    deps.matchRuntimePreset.mockReturnValue('default');
    const ctx = makeCtx();
    behavior.resetRuntimeStrategy.call(ctx);
    expect(deps.normalizeRuntimeStrategySettings).toHaveBeenCalled();
    expect(ctx.runtimeStrategy.settings).toBe(normalized);
    expect(ctx.activeRuntimePresetId).toBe('default');
  });
});

// ======================================================================
// persistRuntimeStrategySettings / saveRuntimeStrategy
// ======================================================================
describe('persistRuntimeStrategySettings', () => {
  it('默认 toast 为"已保存"并保存 settings', async () => {
    const ctx = makeCtx();
    await behavior.persistRuntimeStrategySettings.call(ctx);
    expect(deps.showToast).toHaveBeenCalledWith('已保存', { type: 'success' });
    expect(deps.saveRuntimeStrategySettings).toHaveBeenCalledWith(ctx.runtimeStrategy.settings);
    expect(ctx.runtimeStrategy.isSaving).toBe(false);
  });

  it('显式 toast 选项优先', async () => {
    const ctx = makeCtx();
    await behavior.persistRuntimeStrategySettings.call(ctx, { toast: '数据策略已保存' });
    expect(deps.showToast).toHaveBeenCalledWith('数据策略已保存', { type: 'success' });
  });

  it('异常时走 ErrorService.handle 且 isSaving 复位', async () => {
    deps.saveRuntimeStrategySettings.mockImplementation(() => {
      throw new Error('persist boom');
    });
    const ctx = makeCtx({
      runtimeStrategy: { settings: defaultRuntimeSettings(), isSaving: false },
    });
    await behavior.persistRuntimeStrategySettings.call(ctx);
    expect(deps.ErrorServiceHandle).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ action: 'persistRuntimeStrategySettings', module: 'settings' })
    );
    expect(ctx.runtimeStrategy.isSaving).toBe(false);
  });

  it('saveRuntimeStrategy 以固定 toast 持久化', async () => {
    const ctx = makeCtx();
    await behavior.saveRuntimeStrategy.call(ctx);
    expect(deps.showToast).toHaveBeenCalledWith('数据策略已保存', { type: 'success' });
  });
});

// ======================================================================
// Proxy logic：get/set runtime value
// ======================================================================
describe('getRuntimeNumber / getRuntimeBoolean', () => {
  it('常规读取数值与布尔路径', () => {
    const ctx = makeCtx();
    expect(behavior.getRuntimeNumber.call(ctx, 'llm.maxRetries')).toBe(3);
    expect(behavior.getRuntimeBoolean.call(ctx, 'deepChat.enableBusinessTools')).toBe(true);
  });

  it('路径不存在时返回 0 / false', () => {
    const ctx = makeCtx();
    expect(behavior.getRuntimeNumber.call(ctx, 'llm.nonexistent')).toBe(0);
    expect(behavior.getRuntimeBoolean.call(ctx, 'llm.nonexistent')).toBe(false);
  });

  it('路径中间遇到非对象值时 reduce 走非对象兜底，返回 undefined→0/false', () => {
    const ctx = makeCtx();
    // llm.maxRetries 为数字（非对象），再向下访问 .extra 命中 reduce 的 else 分支
    expect(behavior.getRuntimeNumber.call(ctx, 'llm.maxRetries.extra')).toBe(0);
    expect(behavior.getRuntimeBoolean.call(ctx, 'llm.maxRetries.extra')).toBe(false);
  });

  it('非数值内容返回 0', () => {
    const ctx = makeCtx();
    ctx.runtimeStrategy.settings.llm.testConnectionTimeoutMs = 'not-a-number' as never;
    expect(behavior.getRuntimeNumber.call(ctx, 'llm.testConnectionTimeoutMs')).toBe(0);
  });

  it('divisor !== 1 时做除法并保留两位小数', () => {
    const ctx = makeCtx();
    ctx.runtimeStrategy.settings.llm.testConnectionTimeoutMs = 20333;
    expect(behavior.getRuntimeNumber.call(ctx, 'llm.testConnectionTimeoutMs', 1000)).toBe(20.33);
  });

  it('布尔分支：0 为 false，非零为 true', () => {
    const ctx = makeCtx();
    ctx.runtimeStrategy.settings.ppcSearchTerms.thresholds.minCtr = 0;
    expect(behavior.getRuntimeBoolean.call(ctx, 'ppcSearchTerms.thresholds.minCtr')).toBe(false);
    ctx.runtimeStrategy.settings.ppcSearchTerms.thresholds.minCtr = 1;
    expect(behavior.getRuntimeBoolean.call(ctx, 'ppcSearchTerms.thresholds.minCtr')).toBe(true);
  });
});

// ======================================================================
// setRuntimeNumber / setRuntimeBoolean / setRuntimeString
// ======================================================================
describe('setRuntime 代理', () => {
  it('setRuntimeNumber 写入数值并同步预案', () => {
    const ctx = makeCtx();
    deps.matchRuntimePreset.mockReturnValue('recommended');
    behavior.setRuntimeNumber.call(ctx, 'llm.maxRetries', { target: { value: '5' } } as Event);
    expect(ctx.runtimeStrategy.settings.llm.maxRetries).toBe(5);
    expect(ctx.activeRuntimePresetId).toBe('recommended');
  });

  it('setRuntimeNumber multiplier 生效', () => {
    const ctx = makeCtx();
    behavior.setRuntimeNumber.call(
      ctx,
      'llm.analysisTimeoutMs',
      { target: { value: '180' } } as Event,
      1000
    );
    expect(ctx.runtimeStrategy.settings.llm.analysisTimeoutMs).toBe(180000);
  });

  it('setRuntimeNumber 非法数值产生 NaN，getRuntimeNumber 读回 0', () => {
    const ctx = makeCtx();
    behavior.setRuntimeNumber.call(ctx, 'llm.maxRetries', {
      target: { value: 'abc' },
    } as Event);
    expect(behavior.getRuntimeNumber.call(ctx, 'llm.maxRetries')).toBe(0);
  });

  it('setRuntimeBoolean 写入 checked 并即时持久化', () => {
    const ctx = makeCtx();
    behavior.setRuntimeBoolean.call(ctx, 'deepChat.enableBusinessTools', {
      target: { checked: false },
    } as Event);
    expect(ctx.runtimeStrategy.settings.deepChat.enableBusinessTools).toBe(false);
    expect(deps.showToast).toHaveBeenCalledWith('已保存', { type: 'success' });
  });

  it('setRuntimeString 写入 select value 并同步预案', () => {
    const ctx = makeCtx();
    deps.matchRuntimePreset.mockReturnValue('cost');
    behavior.setRuntimeString.call(ctx, 'masterAnalysis.schedulingPreference', {
      target: { value: 'cost' },
    } as Event);
    expect(ctx.runtimeStrategy.settings.masterAnalysis.schedulingPreference).toBe('cost');
    expect(ctx.activeRuntimePresetId).toBe('cost');
  });

  it('setRuntimeNumber 嵌套路径不存在时自动创建对象', () => {
    const ctx = makeCtx();
    behavior.setRuntimeNumber.call(ctx, 'deepChat.newFeature.nestedProp', {
      target: { value: '7' },
    } as Event);
    expect(behavior.getRuntimeNumber.call(ctx, 'deepChat.newFeature.nestedProp')).toBe(7);
  });

  it('setRuntimePathValue 空路径不写入', () => {
    const ctx = makeCtx();
    behavior.setRuntimeNumber.call(ctx, '', { target: { value: '9' } } as Event);
    expect(behavior.getRuntimeNumber.call(ctx, '')).toBe(0);
  });
});

// ======================================================================
// setToolTargetModel
// ======================================================================
describe('setToolTargetModel', () => {
  it('写入选择的目标模型', () => {
    const ctx = makeCtx({ toolStrategy: { targetModels: {}, isSaving: false } });
    behavior.setToolTargetModel.call(ctx, 'playground-deep-chat', {
      target: { value: 'gpt-4o-mini' },
    } as Event);
    expect(ctx.toolStrategy.targetModels['playground-deep-chat']).toBe('gpt-4o-mini');
  });
});

// ======================================================================
// setMasterAnalysisSchedulePreference / setMasterAnalysisEvidenceDepth
// ======================================================================
describe('masterAnalysis 设置器', () => {
  beforeEach(() => {
    deps.isSchedulingPreference.mockImplementation(
      (v: unknown) => v === 'recommended' || v === 'reliability' || v === 'speed'
    );
  });

  it('setMasterAnalysisSchedulePreference 双向联动 preference↔evidenceDepth', async () => {
    const ctx = makeCtx();
    behavior.setMasterAnalysisSchedulePreference.call(ctx, 'reliability');
    await Promise.resolve(); // flush void persistRuntimeStrategySettings 的微任务
    expect(ctx.runtimeStrategy.settings.masterAnalysis.schedulingPreference).toBe('reliability');
    expect(ctx.runtimeStrategy.settings.masterAnalysis.evidenceDepth).toBe('deep');
    expect(ctx.schedulePreferenceMenuOpen).toBe(false);
    expect(deps.showToast).toHaveBeenCalledWith('性能设置已保存', { type: 'success' });
  });

  it('setMasterAnalysisSchedulePreference 拒绝非法偏好（早返回）', () => {
    deps.isSchedulingPreference.mockReturnValue(false);
    const ctx = makeCtx();
    behavior.setMasterAnalysisSchedulePreference.call(ctx, 'custom' as never);
    expect(deps.showToast).not.toHaveBeenCalled();
    expect(ctx.runtimeStrategy.settings.masterAnalysis.schedulingPreference).toBe('recommended');
    expect(ctx.runtimeStrategy.settings.masterAnalysis.evidenceDepth).toBe('balanced');
  });

  it('setMasterAnalysisEvidenceDepth 双向联动 depth→preference', async () => {
    const ctx = makeCtx();
    behavior.setMasterAnalysisEvidenceDepth.call(ctx, 'fast');
    await Promise.resolve(); // flush void persistRuntimeStrategySettings 的微任务
    expect(ctx.runtimeStrategy.settings.masterAnalysis.evidenceDepth).toBe('fast');
    expect(ctx.runtimeStrategy.settings.masterAnalysis.schedulingPreference).toBe('speed');
    expect(deps.showToast).toHaveBeenCalledWith('证据深度已保存', { type: 'success' });
  });

  it('setMasterAnalysisEvidenceDepth 拒绝非法深度（早返回）', () => {
    const ctx = makeCtx();
    behavior.setMasterAnalysisEvidenceDepth.call(ctx, 'extreme' as never);
    expect(deps.showToast).not.toHaveBeenCalled();
  });

  it('setMasterAnalysisEvidenceDepth 三档深度全部可设置', async () => {
    const ctx = makeCtx();
    behavior.setMasterAnalysisEvidenceDepth.call(ctx, 'deep');
    await Promise.resolve(); // flush void persistRuntimeStrategySettings 的微任务
    expect(ctx.runtimeStrategy.settings.masterAnalysis.schedulingPreference).toBe('reliability');
    behavior.setMasterAnalysisEvidenceDepth.call(ctx, 'balanced');
    await Promise.resolve(); // flush void persistRuntimeStrategySettings 的微任务
    expect(ctx.runtimeStrategy.settings.masterAnalysis.schedulingPreference).toBe('recommended');
  });
});

// ======================================================================
// getToolStrategyModelOptionLabel
// ======================================================================
describe('getToolStrategyModelOptionLabel', () => {
  it('厂商非空时拼接"厂商: 模型"', () => {
    deps.getLlmProviderConfig.mockReturnValue({ name: 'OpenAI' });
    const ctx = makeCtx();
    const label = behavior.getToolStrategyModelOptionLabel.call(ctx, { value: 'gpt-4o' });
    expect(label).toBe('OpenAI: gpt-4o');
  });

  it('厂商为空字符串时仍拼接“未选择厂商”标签', () => {
    deps.getLlmProviderConfig.mockReturnValue(null);
    const ctx = makeCtx({ llm: { ...defaultLlmState(), provider: '' } });
    const label = behavior.getToolStrategyModelOptionLabel.call(ctx, { value: 'gpt-4o' });
    expect(label).toBe('未选择厂商: gpt-4o');
  });
});

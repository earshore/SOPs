// src/components/settings/systemSettings.ts
// ================================================================
// 🎯 Phase 3: Alpine.js Refactor (TypeScript版本)
// ================================================================

import { escapeHtml, setSafeHtml } from '../../common/utils/security';
import { PROVIDERS, type ModelFeature, type ProviderConfig } from '../../common/constants/constants';
import { fetchModelsFromApi, callLLM } from '../../services/llmService';
import { showToast } from '../../common/ui';
import { StorageService, STORAGE_KEYS } from '../../services/storageService';
import { LocalDataStore, type LocalDataBucketId, type LocalDataUsage } from '../../services/localDataStore';
import { ErrorService } from '../../services/errorService';
import { EnvConfig } from '../../common/config/envConfig';
import { configCenter } from '../../common/config/ConfigCenter';
import { APP_EVENTS } from '../../common/constants/eventConstants';
import type { LLMProviderConfig } from '../../types/state';
import { appStore } from '../../stores/useAppStore';
import eventBus from '@common/EventBus';
import { ApiError } from '@common/errors/AppError';

let alpineRetryCount = 0;

// ==========================================
// 类型定义
// ==========================================

interface LLMState {
    provider: string;
    endpoint: string;
    apiKey: string;
    model: string;
    models: ModelOption[];
    showKey: boolean;
    isFetching: boolean;
    isTesting: boolean;
}

interface ProxyState {
    type: string;
    customUrl: string;
    showKey: boolean;
    savedKeyMap: Record<string, string>;
}

interface SettingsPanelData {
    isOpen: boolean;
    llm: LLMState;
    proxy: ProxyState;
    currentProviderConfig: ProviderConfig | Record<string, never>;
    activeModelInfo: ModelMetadata | null;
    isProduction: boolean;
    localData: {
        usage: LocalDataUsage | null;
        isBusy: boolean;
        clearingBucketId: LocalDataBucketId | null;
        cleanupItemsExpanded: boolean;
    };
    showDangerousEndpointWarning: boolean;
    proxyNeedsInput: boolean;
    proxyInputLabel: string;
    proxyInputPlaceholder: string;
    llmApiKeyInputType: string;
    llmApiKeyIconClass: string;
    modelSelectDisabled: boolean;
    fetchModelsIconClass: string;
    fetchModelsText: string;
    activeContextText: string;
    activeFeaturesText: string;
    activeFeatureBadges: ModelFeatureBadge[];
    testConnectionIconClass: string;
    testConnectionText: string;
    proxyInputType: string;
    proxyKeyIconClass: string;
    proxyHintText: string;
    localStorageUsedText: string;
    localStorageKeysText: string;
    indexedDbUsedText: string;
    indexedDbKeysText: string;
    localDataCleanupSummaryText: string;
    localDataCleanupToggleText: string;
    localDataCleanupToggleIconClass: string;
    localDataBucketItems: LocalDataBucketView[];
    _unsubscribers?: Array<() => void>;  // 新增：存储清理函数
    init(): void;
    open(): void;
    close(): void;
    destroy(): void;  // 新增：清理方法
    openPerformanceMonitor(): Promise<void>;
    loadProviderConfig(provider: string): Promise<void>;
    fetchModels(): Promise<void>;
    testConnection(): Promise<void>;
    saveProviderConfig(): Promise<void>;
    loadProxyConfig(): void;
    saveProxyConfig(): void;
    setLlmProvider(event: Event): void;
    setLlmEndpoint(event: Event): void;
    setLlmApiKey(event: Event): void;
    setLlmModel(event: Event): void;
    setProxyType(event: Event): void;
    setProxyCustomUrl(event: Event): void;
    toggleLlmKeyVisibility(): void;
    toggleProxyKeyVisibility(): void;
    getModelValue(model: ModelOption): string;
    getModelLabel(model: ModelOption): string;
    refreshLocalDataUsage(): Promise<void>;
    exportLocalData(): Promise<void>;
    importLocalData(): Promise<void>;
    toggleLocalDataCleanupItems(): void;
    clearLocalCache(): Promise<void>;
    clearLocalDataBucket(bucketId: LocalDataBucketId): Promise<void>;
    clearAllLocalData(): Promise<void>;
    formatBytes(bytes: number): string;
    getProxyDisplayName(type: string): string;
    isDangerousEndpoint(endpoint: string): boolean;
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

interface ModelFeatureBadge {
    key: string;
    label: string;
    icon: string;
}

interface LocalDataBucketMeta {
    label: string;
    description: string;
    icon: string;
    iconClass: string;
    barClass: string;
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

const OBSOLETE_PRESET_MODEL_IDS = new Set([
    'gpt-5.4-mini',
    'gpt-5.4-mini-ca',
    'gpt-5.5-ca',
]);

const OLD_PRESET_MODEL_IDS = new Set([
    ...OBSOLETE_PRESET_MODEL_IDS,
    'gpt-5.5',
]);

const LOCAL_DATA_BUCKET_META: Record<LocalDataBucketId, LocalDataBucketMeta> = {
    config: {
        label: '配置与偏好',
        description: '模型、网络、布局和功能开关',
        icon: 'fa-sliders-h',
        iconClass: 'bg-blue-50 text-blue-600 ring-blue-100',
        barClass: 'bg-blue-500',
        buttonClass: 'border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100',
        actionLabel: '清理配置',
        confirmMessage: '这会删除模型、网络、布局和偏好配置，保留历史、聊天与缓存。继续？',
    },
    secrets: {
        label: '密钥',
        description: '加密保存的 API Key 和敏感凭据',
        icon: 'fa-key',
        iconClass: 'bg-amber-50 text-amber-600 ring-amber-100',
        barClass: 'bg-amber-500',
        buttonClass: 'border-amber-100 bg-amber-50 text-amber-700 hover:bg-amber-100',
        actionLabel: '清理密钥',
        confirmMessage: '这会删除本浏览器保存的 API Key，之后需要重新配置。继续？',
    },
    'workspace-state': {
        label: '工作台状态',
        description: '页面状态、草稿、PromptLab 与关键词工具工作区',
        icon: 'fa-layer-group',
        iconClass: 'bg-cyan-50 text-cyan-600 ring-cyan-100',
        barClass: 'bg-cyan-500',
        buttonClass: 'border-cyan-100 bg-cyan-50 text-cyan-700 hover:bg-cyan-100',
        actionLabel: '清理状态',
        confirmMessage: '这会重置本浏览器保存的工作台状态、草稿和工具输入，但保留模型配置、密钥、采集历史、聊天和缓存。继续？',
    },
    'scrape-history': {
        label: '采集历史',
        description: '商品采集结果、导入记录和历史报告',
        icon: 'fa-clock-rotate-left',
        iconClass: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
        barClass: 'bg-emerald-500',
        buttonClass: 'border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
        actionLabel: '清理历史',
        confirmMessage: '这会删除本浏览器中的采集历史和历史报告，建议先导出备份。继续？',
    },
    'chat-history': {
        label: '聊天记录',
        description: 'Playground 对话线程和消息上下文',
        icon: 'fa-comments',
        iconClass: 'bg-violet-50 text-violet-600 ring-violet-100',
        barClass: 'bg-violet-500',
        buttonClass: 'border-violet-100 bg-violet-50 text-violet-700 hover:bg-violet-100',
        actionLabel: '清理聊天',
        confirmMessage: '这会删除 Playground 本地聊天线程，建议先导出备份。继续？',
    },
    'keyword-history': {
        label: '关键词历史',
        description: 'Keyword Hunter 快照、对比记录和迁移备份',
        icon: 'fa-magnifying-glass-chart',
        iconClass: 'bg-teal-50 text-teal-600 ring-teal-100',
        barClass: 'bg-teal-500',
        buttonClass: 'border-teal-100 bg-teal-50 text-teal-700 hover:bg-teal-100',
        actionLabel: '清理关键词',
        confirmMessage: '这会删除 Keyword Hunter 本地快照和历史对比记录，建议先导出备份。继续？',
    },
    cache: {
        label: '缓存',
        description: '页面模板、HTTP 响应和 AI 分析缓存',
        icon: 'fa-broom',
        iconClass: 'bg-slate-100 text-slate-600 ring-slate-200',
        barClass: 'bg-slate-500',
        buttonClass: 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
        actionLabel: '清理缓存',
        confirmMessage: null,
    },
    other: {
        label: '其它数据',
        description: '尚未归类的本地业务数据',
        icon: 'fa-box-archive',
        iconClass: 'bg-rose-50 text-rose-600 ring-rose-100',
        barClass: 'bg-rose-500',
        buttonClass: 'border-rose-100 bg-rose-50 text-rose-700 hover:bg-rose-100',
        actionLabel: '清理其它',
        confirmMessage: '这会删除尚未归类的本地数据，可能影响部分模块状态。建议先导出备份。继续？',
    },
};

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
        const { HistoryService } = await import('../../modules/app_center/views/master_analysis/services/historyService');
        await HistoryService.clearAsync();
        return;
    }

    if (bucketId === 'chat-history') {
        const { clearPlaygroundThreadStore } = await import('../../modules/app_center/views/playground/deep-chat');
        await clearPlaygroundThreadStore();
        return;
    }

    if (bucketId === 'keyword-history') {
        const { KeywordHunterSnapshotService } = await import('../../modules/app_center/views/keyword_hunter/services/snapshotService');
        await KeywordHunterSnapshotService.clearAsync();
    }
}

async function clearLocalDataBucketWithRuntimeSync(bucketId: LocalDataBucketId): Promise<number> {
    const removed = await LocalDataStore.clearBucket(bucketId);
    await syncLocalDataRuntimeAfterBucketClear(bucketId);
    return removed;
}

async function syncRuntimeAfterClearAllLocalData(): Promise<void> {
    await resetAppStoreRuntimeState();
    await syncLocalDataRuntimeAfterBucketClear('scrape-history');
    await syncLocalDataRuntimeAfterBucketClear('chat-history');
    await syncLocalDataRuntimeAfterBucketClear('keyword-history');
}

function reloadAfterLocalDataImport(): void {
    window.setTimeout(() => window.location.reload(), 800);
}

function getModelId(model: ModelOption): string {
    return typeof model === 'string' ? model : model.id;
}

function dedupeModels(models: ModelOption[]): ModelOption[] {
    const seen = new Set<string>();
    return models.filter((model) => {
        const id = getModelId(model);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
    });
}

function getProviderConfig(provider: string): ProviderConfig | null {
    if (!provider) return null;
    if (!(provider in PROVIDERS)) {
        return null;
    }
    return PROVIDERS[provider as keyof typeof PROVIDERS] || null;
}

function resolveProviderEndpoint(provider: string, config: ProviderConfig, savedEndpoint: string): string {
    const shouldUseNewApiDefault = provider === 'new_api' && (!savedEndpoint || savedEndpoint === '/v1' || savedEndpoint === '/v1/');
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

function findPresetModelInfo(provider: string, modelId: string): ModelMetadata | null {
    const config = getProviderConfig(provider);
    if (!config) return null;
    return config.models.find(model => model.id === modelId) || null;
}

function mergeModelMetadata(model: ModelMetadata | null, preset: ModelMetadata | null): ModelMetadata | null {
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
    return features.map((feature) => getFeatureLabel(String(feature))).join('、');
}

function getModelFeatureBadges(features: unknown): ModelFeatureBadge[] {
    if (!Array.isArray(features) || features.length === 0) {
        return [{ key: 'basic', label: '基础能力', icon: 'fa-message' }];
    }

    return features.map((feature) => {
        const key = String(feature);
        return {
            key,
            label: getFeatureLabel(key),
            icon: getFeatureIcon(key),
        };
    });
}

function validateModelFetchInput(llm: LLMState): string | null {
    if (!llm.apiKey) return '请先输入 API Key';
    if (!llm.endpoint) return '请先输入API端点地址';
    return null;
}

function assertFetchedModels(models: ModelOption[], provider: string): void {
    if (models.length > 0) return;
    throw new ApiError('未能获取到有效模型列表，请检查API配置和网络连接', 'SETTINGS_001', {
        context: { module: 'SystemSettings', action: 'fetchModels', provider }
    });
}

function applyFetchedModels(panel: SettingsPanelData, models: ModelOption[]): void {
    panel.llm.models = dedupeModels(models);

    const currentModelExists = panel.llm.models.some(model => getModelId(model) === panel.llm.model);
    if (currentModelExists) return;

    const firstModel = panel.llm.models[0];
    if (firstModel) {
        panel.llm.model = getModelId(firstModel);
    }
}

function getModelFetchErrorMessage(error: Error): string {
    const message = error.message;
    if (message.includes('HTTP 401') || message.includes('Unauthorized')) return 'API Key 无效或已过期，请检查配置';
    if (message.includes('HTTP 403') || message.includes('Forbidden')) return 'API Key 没有访问权限，请检查配置';
    if (message.includes('HTTP 404')) return 'API端点地址不正确，请检查配置';
    if (message.includes('Failed to fetch') || message.includes('NetworkError')) return '网络连接失败，请检查网络或端点地址';
    if (message.includes('timeout') || message.includes('AbortError')) return '请求超时，请检查网络连接';
    return message;
}

// ==========================================
// Alpine Component Logic
// ==========================================

type SettingsPanelPart = Partial<SettingsPanelData> & ThisType<SettingsPanelData>;

function createSettingsState(): Pick<SettingsPanelData, 'isOpen' | '_unsubscribers' | 'llm' | 'proxy' | 'localData'> {
    return {
        isOpen: false,

        // 新增：清理函数数组
        _unsubscribers: [],

        // LLM Config State
        llm: {
            provider: 'new_api',
            endpoint: 'https://new.hongecb.store/v1',
            apiKey: '',
            model: '',
            models: [],
            showKey: false,
            isFetching: false,
            isTesting: false
        },

        // Proxy Config State
        proxy: {
            type: 'scraperapi',
            customUrl: '',
            showKey: false,
            savedKeyMap: {}
        },

        localData: {
            usage: null,
            isBusy: false,
            clearingBucketId: null,
            cleanupItemsExpanded: false
        }
    };
}

const settingsPanelBehavior: SettingsPanelPart = {

    // Computed / Helpers
    get currentProviderConfig(): ProviderConfig | Record<string, never> {
        return PROVIDERS[this.llm.provider] || {};
    },

    get activeModelInfo(): ModelMetadata | null {
        if (!this.llm.model) return null;
        const m = this.llm.models.find(x => (typeof x === 'string' ? x : x.id) === this.llm.model);
        const model = m && typeof m !== 'string' ? m : null;
        return mergeModelMetadata(model, findPresetModelInfo(this.llm.provider, this.llm.model));
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
            'generativelanguage.googleapis.com'
        ];
        return dangerousEndpoints.some(domain => endpoint.includes(domain));
    },

    get showDangerousEndpointWarning(): boolean {
        return this.isProduction && !!this.llm.endpoint && this.isDangerousEndpoint(this.llm.endpoint);
    },

    get proxyNeedsInput(): boolean {
        return ['scraperapi', 'zenrows', 'brightdata', 'custom_api', 'custom_proxy'].includes(this.proxy.type);
    },

    get proxyInputLabel(): string {
        if (this.proxy.type === 'custom_proxy') return 'HTTP 代理地址';
        if (this.proxy.type === 'custom_api') return '完整端点 (URL)';
        return 'API Key (密钥)';
    },

    get proxyInputPlaceholder(): string {
        if (this.proxy.type === 'custom_proxy') return 'http://user:pass@ip:port';
        if (this.proxy.type === 'custom_api') return 'https://api.example.com/?url=';
        return `粘贴 ${this.getProxyDisplayName(this.proxy.type)} Key`;
    },

    get llmApiKeyInputType(): string {
        return this.llm.showKey ? 'text' : 'password';
    },

    get llmApiKeyIconClass(): string {
        return this.llm.showKey ? 'fa-eye-slash' : 'fa-eye';
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
        const context = this.activeModelInfo && 'context' in this.activeModelInfo
            ? Number((this.activeModelInfo as { context?: unknown }).context)
            : 0;
        return formatModelContext(context);
    },

    get activeFeaturesText(): string {
        const features = this.activeModelInfo && 'features' in this.activeModelInfo
            ? (this.activeModelInfo as { features?: unknown }).features
            : null;
        return formatModelFeatures(features);
    },

    get activeFeatureBadges(): ModelFeatureBadge[] {
        const features = this.activeModelInfo && 'features' in this.activeModelInfo
            ? (this.activeModelInfo as { features?: unknown }).features
            : null;
        return getModelFeatureBadges(features);
    },

    get testConnectionIconClass(): string {
        return this.llm.isTesting ? 'fa-circle-notch fa-spin text-blue-500' : 'fa-plug text-emerald-500';
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

    get proxyHintText(): string {
        return this.proxy.type === 'custom_api'
            ? '请确保 URL 包含 url= 参数'
            : '请填写对应商业 API Key 或自定义代理地址';
    },

    get localStorageUsedText(): string {
        return this.localData.usage ? this.formatBytes(this.localData.usage.localStorage.used) : '计算中';
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

    get localDataBucketItems(): LocalDataBucketView[] {
        const usage = this.localData.usage;
        const total = usage?.total || 0;
        const buckets = usage?.buckets || [];

        return (Object.keys(LOCAL_DATA_BUCKET_META) as LocalDataBucketId[]).map((id) => {
            const meta = LOCAL_DATA_BUCKET_META[id];
            const bucket = buckets.find(item => item.id === id);
            const used = bucket?.total || 0;
            const keys = (bucket?.localStorage.keys || 0) + (bucket?.indexedDB.keys || 0);
            const percent = total > 0 ? Math.round((used / total) * 100) : 0;

            return {
                id,
                ...meta,
                usedText: this.formatBytes(used),
                keysText: `${keys} 项`,
                percentText: `${percent}%`,
                percentWidth: used > 0 ? `${Math.max(percent, 3)}%` : '0%',
                isEmpty: used <= 0 && keys === 0,
                isClearing: this.localData.clearingBucketId === id,
            };
        });
    },

    // Lifecycle
    init() {
        this.loadProxyConfig();
        this.loadProviderConfig(this.llm.provider);
        void this.refreshLocalDataUsage();

        // 订阅 EventBus 事件，保存清理函数
        const unsubOpen = eventBus.on(APP_EVENTS.SETTINGS_OPEN, () => {
            this.open();
        });
        
        const unsubClose = eventBus.on(APP_EVENTS.SETTINGS_CLOSE, () => {
            this.close();
        });
        
        // 保存清理函数
        this._unsubscribers = [unsubOpen, unsubClose];

        registerSettingsWatchers(this as SettingsPanelData & AlpineWatchContext);
    },

    open() {
        this.isOpen = true;
        this.loadProviderConfig(this.llm.provider);
        this.loadProxyConfig();
        void this.refreshLocalDataUsage();
    },

    close() {
        this.isOpen = false;
    },

    destroy() {
        // 清理 EventBus 订阅
        this._unsubscribers?.forEach(unsub => unsub());
        this._unsubscribers = [];
    },

    // 打开性能监控面板
    async openPerformanceMonitor(): Promise<void> {
        try {
            const { performanceMonitor } = await import('../../common/devtools/PerformanceMonitor');

            // 确保面板已初始化
            if (!performanceMonitor.isInitialized()) {
                performanceMonitor.initialize();
            }

            performanceMonitor.show();
            showToast('监控面板已打开（右上角），快捷键 Ctrl+Shift+P 切换显示。注意：仅在开发模式下可用', { type: 'success', duration: 5000 });
        } catch (error) {
            ErrorService.handle(error as Error, { action: 'openPerformanceMonitor', module: 'settings', notify: false });
            showToast('打开监控面板失败', { type: 'error' });
        }
    },

    // --- LLM Logic ---

    async loadProviderConfig(provider: string): Promise<void> {
        const config = getProviderConfig(provider);
        if (!config) return;

        const savedConfig = StorageService.getLLMConfig(provider);
        this.llm.endpoint = resolveProviderEndpoint(provider, config, savedConfig?.endpoint || '');
        this.llm.apiKey = await loadProviderApiKey(provider, savedConfig);
        this.llm.models = dedupeModels(getRawProviderModels(savedConfig, config));
        this.llm.model = getInitialModel(savedConfig?.model, this.llm.models);
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
            showToast(`获取模型失败: ${getModelFetchErrorMessage(error)}`, { type: 'error' });
            ErrorService.handle(error, { action: 'fetchModels', module: 'settings' });
        } finally {
            this.llm.isFetching = false;
        }
    },

    async testConnection(): Promise<void> {
        if (!this.llm.apiKey || !this.llm.model) {
            showToast('请先完善配置 (Key + 模型)', { type: 'warning' });
            return;
        }

        this.llm.isTesting = true;
        try {
            showToast('正在发送测试请求...', { type: 'info' });
            const messages = [{ role: 'user' as const, content: "Hello! Reply 'OK'." }];

            await callLLM(
                messages,
                this.llm.provider,
                this.llm.endpoint,
                this.llm.apiKey,
                this.llm.model,
                { temperature: 0.1, jsonMode: false, timeout: configCenter.get<number>('llm.testConnectionTimeout') || 15000 }
            );

            showToast('连接成功！', { type: 'success' });
        } catch (error) {
            ErrorService.handle(error as Error, { action: 'testConnection', module: 'settings' });
        } finally {
            this.llm.isTesting = false;
        }
    },

    async saveProviderConfig(): Promise<void> {
        if (!this.llm.apiKey) {
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
                enabled: true,
                apiKey: '' // 占位符,实际存储在安全存储中
            };
            
            // API Key 单独加密存储
            await StorageService.setSecure(`llm_key_${this.llm.provider}`, this.llm.apiKey);
            
            // 其他配置正常存储
            StorageService.setLLMConfig(this.llm.provider, newConfig);

            // Update global status UI
            updateModelStatus();

            showToast('LLM 配置已保存', { type: 'success' });
            setTimeout(() => this.close(), 500);
        } catch (error) {
            ErrorService.handle(error as Error, { action: 'saveProviderConfig', module: 'settings' });
        }
    },

    // --- Proxy Logic ---

    loadProxyConfig(): void {
        const savedConfig = StorageService.get(STORAGE_KEYS.SCRAPER_PROXY_CONFIG, {}) as { type?: string; customUrl?: string } | null;
        this.proxy.savedKeyMap = (StorageService.get(STORAGE_KEYS.PROXY_KEY_MAP, {}) as Record<string, string>) || {};

        this.proxy.type = savedConfig?.type || 'scraperapi';
        // If the saved active type matches current type, use its URL, otherwise fallback to cache
        if (savedConfig?.type === this.proxy.type) {
            this.proxy.customUrl = savedConfig?.customUrl || '';
        } else {
            this.proxy.customUrl = this.proxy.savedKeyMap[this.proxy.type] || '';
        }
    },

    saveProxyConfig(): void {
        // Update cache map
        this.proxy.savedKeyMap[this.proxy.type] = this.proxy.customUrl;
        StorageService.set(STORAGE_KEYS.PROXY_KEY_MAP, this.proxy.savedKeyMap);

        // Save active config
        const config = { type: this.proxy.type, customUrl: this.proxy.customUrl };
        StorageService.set(STORAGE_KEYS.SCRAPER_PROXY_CONFIG, config);

        showToast('网络配置已更新', { type: 'success' });
    },

    setLlmProvider(event: Event): void {
        this.llm.provider = (event.target as HTMLSelectElement).value;
    },

    setLlmEndpoint(event: Event): void {
        this.llm.endpoint = (event.target as HTMLInputElement).value;
    },

    setLlmApiKey(event: Event): void {
        this.llm.apiKey = (event.target as HTMLInputElement).value;
    },

    setLlmModel(event: Event): void {
        this.llm.model = (event.target as HTMLSelectElement).value;
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

    async refreshLocalDataUsage(): Promise<void> {
        try {
            this.localData.usage = await LocalDataStore.getUsage();
        } catch (error) {
            ErrorService.handle(error as Error, { action: 'refreshLocalDataUsage', module: 'settings', notify: false });
        }
    },

    async exportLocalData(): Promise<void> {
        try {
            this.localData.isBusy = true;
            const data = await LocalDataStore.exportAll();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `sops-local-data-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            showToast('本地数据已导出', { type: 'success' });
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
                const mode = window.confirm('导入前是否先清空当前本地数据？确定=完整恢复到备份状态；取消=合并导入并保留备份外数据。')
                    ? 'replace'
                    : 'merge';
                await LocalDataStore.importAll(JSON.parse(text), { mode });
                await this.refreshLocalDataUsage();
                showToast('本地数据已导入，页面即将刷新以应用恢复结果', { type: 'success' });
                reloadAfterLocalDataImport();
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

    async clearLocalCache(): Promise<void> {
        await this.clearLocalDataBucket('cache');
    },

    async clearLocalDataBucket(bucketId: LocalDataBucketId): Promise<void> {
        const meta = LOCAL_DATA_BUCKET_META[bucketId];
        if (!meta) return;

        if (meta.confirmMessage && !window.confirm(meta.confirmMessage)) {
            return;
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
        const confirmed = window.confirm('这会删除本浏览器中的配置、密钥、采集历史、聊天记录和缓存。请先导出备份。继续？');
        if (!confirmed) return;
        const confirmedAgain = window.confirm('二次确认：清空后无法恢复，除非你已有导出的备份文件。确定清空全部本地数据？');
        if (!confirmedAgain) return;

        try {
            this.localData.isBusy = true;
            await syncRuntimeAfterClearAllLocalData();
            await LocalDataStore.clearAll();
            this.localData.usage = await LocalDataStore.getUsage();
            showToast('全部本地数据已清空，请刷新页面重新初始化', { type: 'success' });
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
        const names: Record<string, string> = {
            scraperapi: 'ScraperAPI',
            zenrows: 'ZenRows',
            brightdata: 'Bright Data',
            custom_api: '自定义 API',
            custom_proxy: 'HTTP 代理',
        };
        return names[type] || '默认';
    }
};

function attachSettingsBehavior(panel: SettingsPanelData): SettingsPanelData {
    Object.defineProperties(panel, Object.getOwnPropertyDescriptors(settingsPanelBehavior));
    return panel;
}

const SettingsPanel = (): SettingsPanelData => attachSettingsBehavior(createSettingsState() as SettingsPanelData);

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
        ErrorService.handle(error as Error, { action: 'initAlpineSettings', module: 'settings', notify: false });
    }
}

// Legacy Bridge for ActionRegistry
export function openSettings(): void {
    eventBus.emit(APP_EVENTS.SETTINGS_OPEN);
}

export function closeSettings(): void {
    eventBus.emit(APP_EVENTS.SETTINGS_CLOSE);
}

/**
 * 打开性能监控面板
 */
export async function openPerformanceMonitor(): Promise<void> {
    try {
        const { performanceMonitor } = await import('../../common/devtools/PerformanceMonitor');
        performanceMonitor.show();
        showToast('监控面板已打开', { type: 'success' });
    } catch (error) {
        ErrorService.handle(error as Error, { action: 'openPerformanceMonitor', module: 'settings', notify: false });
        showToast('打开监控面板失败', { type: 'error' });
    }
}

// These are no longer needed for direct calling, but kept for compatibility
export const initSettingsListeners = (): void => { };
export const saveProviderConfig = (): void => { };
export const loadProviderConfig = (): void => { };
export const fetchModels = (): void => { };
export const toggleApiKeyVisibility = (): void => { };
export const testConnection = (): void => { };
export const saveProxyConfig = (): void => { };
export const renderProxyInputUI = (): void => { };

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
            setSafeHtml(statusEl, `
                <span class="status-dot status-success"></span>
                <span class="text-slate-600 text-xs font-medium flex items-center gap-1">
                    ${escapeHtml(providerInfo.name)}: <span class="font-mono text-blue-600">${escapeHtml(config.model)}</span>
                </span>
            `);
            return;
        }
    }
    // ✅ 安全: 静态HTML模板，无用户输入
    setSafeHtml(statusEl, `
        <span class="status-dot status-pending pulse-dot"></span>
        <span class="text-slate-500 text-xs italic">等待API配置...</span>
    `);
}

// src/components/settings/systemSettings.ts
// ================================================================
// 🎯 Phase 3: Alpine.js Refactor (TypeScript版本)
// ================================================================

import { escapeHtml, setSafeHtml } from '../../common/utils/security';
import { PROVIDERS, type ProviderConfig } from '../../common/constants/constants';
import { fetchModelsFromApi, callLLM } from '../../services/llmService';
import { showToast } from '../../common/ui';
import { StorageService, STORAGE_KEYS } from '../../services/storageService';
import { LocalDataStore, type LocalDataUsage } from '../../services/localDataStore';
import { ErrorService } from '../../services/errorService';
import { EnvConfig } from '../../common/config/envConfig';
import { configCenter } from '../../common/config/ConfigCenter';
import { APP_EVENTS } from '../../common/constants/eventConstants';
import type { LLMProviderConfig } from '../../types/state';
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
    models: Array<string | { id: string; name?: string }>;
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
    activeModelInfo: { id: string; name?: string } | null;
    isProduction: boolean;
    localData: {
        usage: LocalDataUsage | null;
        isBusy: boolean;
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
    testConnectionIconClass: string;
    testConnectionText: string;
    proxyInputType: string;
    proxyKeyIconClass: string;
    proxyHintText: string;
    localStorageUsedText: string;
    localStorageKeysText: string;
    indexedDbUsedText: string;
    indexedDbKeysText: string;
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
    getModelValue(model: string | { id: string; name?: string }): string;
    getModelLabel(model: string | { id: string; name?: string }): string;
    refreshLocalDataUsage(): Promise<void>;
    exportLocalData(): Promise<void>;
    importLocalData(): Promise<void>;
    clearLocalCache(): Promise<void>;
    clearAllLocalData(): Promise<void>;
    formatBytes(bytes: number): string;
    getProxyDisplayName(type: string): string;
    isDangerousEndpoint(endpoint: string): boolean;
}

interface AlpineWatchContext {
    $watch<T = unknown>(property: string, callback: (value: T) => void): void;
}

function registerSettingsWatchers(panel: SettingsPanelData & AlpineWatchContext): void {
    panel.$watch('llm.provider', (val: string) => panel.loadProviderConfig(val));
    panel.$watch('proxy.type', (val: string) => {
        panel.proxy.customUrl = panel.proxy.savedKeyMap[val] || '';
    });
}

// ==========================================
// Alpine Component Logic
// ==========================================

const SettingsPanel = (): SettingsPanelData => ({
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
        isBusy: false
    },

    // Computed / Helpers
    get currentProviderConfig(): ProviderConfig | Record<string, never> {
        return PROVIDERS[this.llm.provider] || {};
    },

    get activeModelInfo(): { id: string; name?: string } | null {
        if (!this.llm.model) return null;
        const m = this.llm.models.find(x => (typeof x === 'string' ? x : x.id) === this.llm.model);
        if (!m || typeof m === 'string') return null;
        return m;
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
        return this.llm.isFetching ? '同步中' : '刷新';
    },

    get activeContextText(): string {
        const context = this.activeModelInfo && 'context' in this.activeModelInfo
            ? Number((this.activeModelInfo as { context?: unknown }).context)
            : 0;
        return context ? `${context / 1000}K` : '';
    },

    get activeFeaturesText(): string {
        const features = this.activeModelInfo && 'features' in this.activeModelInfo
            ? (this.activeModelInfo as { features?: unknown }).features
            : null;
        return Array.isArray(features) && features.length > 0 ? features.join(', ') : '基础';
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
        console.log('[Settings] 清理 EventBus 订阅');
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
            console.error('Failed to open performance monitor:', error);
            showToast('打开监控面板失败', { type: 'error' });
        }
    },

    // --- LLM Logic ---

    async loadProviderConfig(provider: string): Promise<void> {
        if (!provider) return;
        
        // 类型安全检查: 确保provider是有效的key
        if (!(provider in PROVIDERS)) {
            console.warn(`Unknown provider: ${provider}, falling back to OpenAI`);
            return;
        }
        
        const config = PROVIDERS[provider as keyof typeof PROVIDERS];
        const savedConfig = StorageService.getLLMConfig(provider);

        const savedEndpoint = savedConfig?.endpoint || '';
        this.llm.endpoint = provider === 'new_api' && (!savedEndpoint || savedEndpoint === '/v1' || savedEndpoint === '/v1/')
            ? config?.endpoint || 'https://new.hongecb.store/v1'
            : savedEndpoint || config?.endpoint || '';
        
        // 🔐 P0优化: 从安全存储读取API密钥
        try {
            const key = await StorageService.getSecure(`llm_key_${provider}`, '');
            this.llm.apiKey = key || '';
        } catch (error) {
            console.warn('[Settings] Failed to load encrypted API key, using fallback:', error);
            // 兼容旧数据: 如果加密读取失败,尝试读取明文(迁移期)
            this.llm.apiKey = (savedConfig && 'apiKey' in savedConfig) ? (savedConfig.apiKey || '') : '';
        }

        // Models: Use saved or default
        const rawModels: Array<string | { id: string }> = (savedConfig && 'models' in savedConfig && savedConfig.models && savedConfig.models.length > 0)
            ? savedConfig.models
            : (config?.models || []);

        // Deduplicate models
        const seen = new Set<string>();
        this.llm.models = rawModels.filter((m: string | { id: string }) => {
            const id = typeof m === 'string' ? m : m.id;
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
        });

        this.llm.model = savedConfig?.model || '';

        // Auto-select first model if none selected and models exist
        if (!this.llm.model && this.llm.models.length > 0) {
            const first = this.llm.models[0];
            if (first) {
                this.llm.model = typeof first === 'string' ? first : first.id;
            }
        }
    },

    async fetchModels(): Promise<void> {
        if (!this.llm.apiKey) {
            showToast('请先输入 API Key', { type: 'warning' });
            return;
        }

        if (!this.llm.endpoint) {
            showToast('请先输入API端点地址', { type: 'warning' });
            return;
        }

        this.llm.isFetching = true;
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🚀 开始获取模型列表`);
        console.log(`📋 Provider: ${this.llm.provider}`);
        console.log(`📋 Endpoint: ${this.llm.endpoint}`);
        console.log(`📋 API Key: ${this.llm.apiKey.substring(0, 10)}...`);
        console.log(`${'='.repeat(60)}\n`);

        try {
            let models: Array<string | { id: string; name?: string }> = [];
            const provider = this.llm.provider;

            // 所有网关均为 OpenAI 兼容接口，统一走 API 拉取
            console.log(`🔄 正在从 ${provider} 获取模型列表...`);
            models = await fetchModelsFromApi(provider, this.llm.endpoint, this.llm.apiKey);
            console.log(`📋 从API获取到 ${models.length} 个模型:`, models.slice(0, 5));

            if (models.length === 0) {
                console.warn('⚠️ 模型列表为空，可能是API配置错误或网络问题');
                throw new ApiError(
                    '未能获取到有效模型列表，请检查API配置和网络连接',
                    'SETTINGS_001',
                    undefined,
                    undefined,
                    { module: 'SystemSettings', action: 'fetchModels', provider: this.llm.provider }
                );
            }

            // Deduplicate models
            const seen = new Set<string>();
            const uniqueModels: Array<string | { id: string; name?: string }> = [];
            
            models.forEach(m => {
                const id = typeof m === 'string' ? m : m.id;
                if (id && !seen.has(id)) {
                    seen.add(id);
                    uniqueModels.push(m);
                }
            });

            this.llm.models = uniqueModels;
            console.log(`✅ 去重后保留 ${this.llm.models.length} 个模型`);

            // 如果当前选中的模型不在新列表中，自动选择第一个
            const currentModelExists = this.llm.models.some(m => {
                const id = typeof m === 'string' ? m : m.id;
                return id === this.llm.model;
            });

            if (!currentModelExists && this.llm.models.length > 0) {
                const firstModel = this.llm.models[0];
                if (firstModel) {
                    this.llm.model = typeof firstModel === 'string' ? firstModel : firstModel.id;
                    console.log(`🔄 自动选择第一个模型: ${this.llm.model}`);
                }
            }

            console.log(`\n${'='.repeat(60)}`);
            console.log(`✅ 模型列表获取成功！共 ${this.llm.models.length} 个模型`);
            console.log(`${'='.repeat(60)}\n`);

            showToast(`成功同步 ${this.llm.models.length} 个模型`, { type: 'success' });
        } catch (e) {
            const error = e as Error;
            console.error(`\n${'='.repeat(60)}`);
            console.error('❌ 获取模型列表失败:', error);
            console.error('❌ 错误详情:', error.message);
            console.error('❌ 错误堆栈:', error.stack);
            console.error(`${'='.repeat(60)}\n`);
            
            // 提供更友好的错误提示
            let errorMsg = error.message;
            if (error.message.includes('HTTP 401') || error.message.includes('Unauthorized')) {
                errorMsg = 'API Key 无效或已过期，请检查配置';
            } else if (error.message.includes('HTTP 403') || error.message.includes('Forbidden')) {
                errorMsg = 'API Key 没有访问权限，请检查配置';
            } else if (error.message.includes('HTTP 404')) {
                errorMsg = 'API端点地址不正确，请检查配置';
            } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                errorMsg = '网络连接失败，请检查网络或端点地址';
            } else if (error.message.includes('timeout') || error.message.includes('AbortError')) {
                errorMsg = '请求超时，请检查网络连接';
            }
            
            showToast(`获取模型失败: ${errorMsg}`, { type: 'error' });
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

            const response = await callLLM(
                messages,
                this.llm.provider,
                this.llm.endpoint,
                this.llm.apiKey,
                this.llm.model,
                { temperature: 0.1, jsonMode: false, timeout: configCenter.get<number>('llm.testConnectionTimeout') || 15000 }
            );

            console.log('Test Response:', response);
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

    getModelValue(model: string | { id: string; name?: string }): string {
        return typeof model === 'string' ? model : model.id;
    },

    getModelLabel(model: string | { id: string; name?: string }): string {
        return this.getModelValue(model);
    },

    async refreshLocalDataUsage(): Promise<void> {
        try {
            this.localData.usage = await LocalDataStore.getUsage();
        } catch (error) {
            console.warn('[Settings] Failed to load local data usage:', error);
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
                await LocalDataStore.importAll(JSON.parse(text));
                await this.refreshLocalDataUsage();
                showToast('本地数据已导入，请刷新页面确认恢复结果', { type: 'success' });
            } catch (error) {
                ErrorService.handle(error as Error, { action: 'importLocalData', module: 'settings' });
            } finally {
                this.localData.isBusy = false;
            }
        });
        input.click();
    },

    async clearLocalCache(): Promise<void> {
        try {
            this.localData.isBusy = true;
            const removed = await LocalDataStore.clearCache();
            await this.refreshLocalDataUsage();
            showToast(`缓存已清理 (${removed} 项)，配置和用户数据已保留`, { type: 'success' });
        } catch (error) {
            ErrorService.handle(error as Error, { action: 'clearLocalCache', module: 'settings' });
        } finally {
            this.localData.isBusy = false;
        }
    },

    async clearAllLocalData(): Promise<void> {
        const confirmed = window.confirm('这会删除本浏览器中的配置、密钥、采集历史、聊天记录和缓存。请先导出备份。继续？');
        if (!confirmed) return;
        const confirmedAgain = window.confirm('二次确认：清空后无法恢复，除非你已有导出的备份文件。确定清空全部本地数据？');
        if (!confirmedAgain) return;

        try {
            this.localData.isBusy = true;
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
});

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
        console.warn('[Settings] Alpine.js not loaded yet, retrying in 100ms...');
        // 延迟重试,最多重试 10 次
        if (alpineRetryCount < 10) {
            alpineRetryCount += 1;
            setTimeout(initAlpineSettings, 100);
        } else {
            console.error('[Settings] Alpine.js failed to load after 10 retries');
        }
        return;
    }
    
    // 确保 Alpine.data 方法可用
    if (typeof window.Alpine.data !== 'function') {
        console.error('[Settings] Alpine.data is not a function');
        return;
    }
    
    try {
        // 注册 settingsPanel 组件
        window.Alpine.data('settingsPanel', SettingsPanel);
        console.log('[Settings] ✅ Alpine component "settingsPanel" registered successfully');
        
        // 清理重试计数器
        alpineRetryCount = 0;
    } catch (error) {
        console.error('[Settings] Failed to register Alpine component:', error);
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
        console.error('Failed to open performance monitor:', error);
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

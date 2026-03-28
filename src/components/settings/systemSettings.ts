// src/components/settings/systemSettings.ts
// ================================================================
// 🎯 Phase 3: Alpine.js Refactor (TypeScript版本)
// ================================================================

import { escapeHtml } from '../../common/utils/security';
import { PROVIDERS, type ProviderConfig } from '../../common/constants/constants';
import { fetchModelsFromApi, callLLM } from '../../services/llmService';
import { showToast } from '../../common/ui';
import { StorageService, STORAGE_KEYS } from '../../services/storageService';
import { ErrorService } from '../../services/errorService';
import { EnvConfig } from '../../common/config/envConfig';
import { configCenter } from '../../common/config/ConfigCenter';
import { APP_EVENTS } from '../../common/constants/eventConstants';
import type { LLMProviderConfig } from '../../types/state';
import eventBus from '@common/EventBus';
import { ApiError } from '@common/errors/AppError';
import { Logger } from '../../services/loggerService';
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
    proxyNeedsInput: boolean;
    proxyInputLabel: string;
    proxyInputPlaceholder: string;
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
    getProxyDisplayName(type: string): string;
    isDangerousEndpoint(endpoint: string): boolean;
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
        provider: 'llmgateway',
        endpoint: 'https://ai-gateway.hongecb.store/v1',
        apiKey: '',
        model: '',
        models: [],
        showKey: false,
        isFetching: false,
        isTesting: false
    },

    // Proxy Config State
    proxy: {
        type: 'allorigins',
        customUrl: '',
        showKey: false,
        savedKeyMap: {}
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

    // Lifecycle
    init() {
        this.loadProxyConfig();
        this.loadProviderConfig(this.llm.provider);

        // 订阅 EventBus 事件，保存清理函数
        const unsubOpen = eventBus.on(APP_EVENTS.SETTINGS_OPEN, () => {
            this.open();
        });
        
        const unsubClose = eventBus.on(APP_EVENTS.SETTINGS_CLOSE, () => {
            this.close();
        });
        
        // 保存清理函数
        this._unsubscribers = [unsubOpen, unsubClose];

        // Watch for provider changes to load its config
        // @ts-expect-error - Alpine.js $watch is injected at runtime
        this.$watch('llm.provider', (val: string) => this.loadProviderConfig(val));
        // Watch for proxy type to restore cached key
        // @ts-expect-error - Alpine.js $watch is injected at runtime
        this.$watch('proxy.type', (val: string) => {
            this.proxy.customUrl = this.proxy.savedKeyMap[val] || '';
        });
    },

    open() {
        this.isOpen = true;
        this.loadProviderConfig(this.llm.provider);
        this.loadProxyConfig();
    },

    close() {
        this.isOpen = false;
    },

    destroy() {
        // 清理 EventBus 订阅
        Logger.debug('[Settings] 清理 EventBus 订阅');
        this._unsubscribers?.forEach(unsub => unsub());
        this._unsubscribers = [];
    },

    // 打开性能监控面板
    async openPerformanceMonitor(): Promise<void> {
        try {
            const { performanceMonitor } = await import('../../common/devtools/PerformanceMonitor');
            performanceMonitor.show();
            showToast('监控面板已打开', { type: 'success' });
        } catch (error) {
            Logger.error('Failed to open performance monitor:', error);
            showToast('打开监控面板失败', { type: 'error' });
        }
    },

    // --- LLM Logic ---

    async loadProviderConfig(provider: string): Promise<void> {
        if (!provider) return;
        
        // 类型安全检查: 确保provider是有效的key
        if (!(provider in PROVIDERS)) {
            Logger.warn(`Unknown provider: ${provider}, falling back to OpenAI`);
            return;
        }
        
        const config = PROVIDERS[provider as keyof typeof PROVIDERS];
        const savedConfig = StorageService.getLLMConfig(provider);

        this.llm.endpoint = savedConfig?.endpoint || config?.endpoint || '';
        
        // 🔐 P0优化: 从安全存储读取API密钥
        try {
            const key = await StorageService.getSecure(`llm_key_${provider}`, '');
            this.llm.apiKey = key || '';
        } catch (error) {
            Logger.warn('[Settings] Failed to load encrypted API key, using fallback:', error);
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
            showToast('请先输入访问密码 (AUTH_PASSWORD)', { type: 'warning' });
            return;
        }

        if (!this.llm.endpoint) {
            showToast('请先输入API端点地址', { type: 'warning' });
            return;
        }

        this.llm.isFetching = true;
        Logger.debug(`\n${'='.repeat(60)}`);
        Logger.debug(`🚀 开始获取模型列表`);
        Logger.debug(`📋 Provider: ${this.llm.provider}`);
        Logger.debug(`📋 Endpoint: ${this.llm.endpoint}`);
        Logger.debug(`📋 API Key: ${this.llm.apiKey.substring(0, 10)}...`);
        Logger.debug(`${'='.repeat(60)}\n`);

        try {
            let models: Array<string | { id: string; name?: string }> = [];
            const provider = this.llm.provider;

            // 所有网关均为 OpenAI 兼容接口，统一走 API 拉取
            Logger.debug(`🔄 正在从 ${provider} 获取模型列表...`);
            models = await fetchModelsFromApi(provider, this.llm.endpoint, this.llm.apiKey);
            Logger.debug(`📋 从API获取到 ${models.length} 个模型:`, models.slice(0, 5));

            if (models.length === 0) {
                Logger.warn('⚠️ 模型列表为空，可能是API配置错误或网络问题');
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
            Logger.debug(`✅ 去重后保留 ${this.llm.models.length} 个模型`);

            // 如果当前选中的模型不在新列表中，自动选择第一个
            const currentModelExists = this.llm.models.some(m => {
                const id = typeof m === 'string' ? m : m.id;
                return id === this.llm.model;
            });

            if (!currentModelExists && this.llm.models.length > 0) {
                const firstModel = this.llm.models[0];
                if (firstModel) {
                    this.llm.model = typeof firstModel === 'string' ? firstModel : firstModel.id;
                    Logger.debug(`🔄 自动选择第一个模型: ${this.llm.model}`);
                }
            }

            Logger.debug(`\n${'='.repeat(60)}`);
            Logger.debug(`✅ 模型列表获取成功！共 ${this.llm.models.length} 个模型`);
            Logger.debug(`${'='.repeat(60)}\n`);

            showToast(`成功同步 ${this.llm.models.length} 个模型`, { type: 'success' });
        } catch (e) {
            const error = e as Error;
            Logger.error(`\n${'='.repeat(60)}`);
            Logger.error('❌ 获取模型列表失败:', error);
            Logger.error('❌ 错误详情:', error.message);
            Logger.error('❌ 错误堆栈:', error.stack);
            Logger.error(`${'='.repeat(60)}\n`);
            
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

            Logger.debug('Test Response:', response);
            showToast('连接成功！', { type: 'success' });
        } catch (error) {
            ErrorService.handle(error as Error, { action: 'testConnection', module: 'settings' });
        } finally {
            this.llm.isTesting = false;
        }
    },

    async saveProviderConfig(): Promise<void> {
        if (!this.llm.apiKey) {
            showToast('请填写访问密码 (AUTH_PASSWORD)', { type: 'warning' });
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

        this.proxy.type = savedConfig?.type || 'allorigins';
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

    getProxyDisplayName(type: string): string {
        const names: Record<string, string> = {
            scraperapi: 'ScraperAPI',
            zenrows: 'ZenRows',
            brightdata: 'Bright Data',
            custom_api: '自定义 API',
            allorigins: 'AllOrigins',
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
        Logger.warn('[Settings] Alpine.js not loaded yet, retrying in 100ms...');
        // 延迟重试,最多重试 10 次
        const retryCount = (window as any).__alpineRetryCount || 0;
        if (retryCount < 10) {
            (window as any).__alpineRetryCount = retryCount + 1;
            setTimeout(initAlpineSettings, 100);
        } else {
            Logger.error('[Settings] Alpine.js failed to load after 10 retries');
        }
        return;
    }
    
    // 确保 Alpine.data 方法可用
    if (typeof window.Alpine.data !== 'function') {
        Logger.error('[Settings] Alpine.data is not a function');
        return;
    }
    
    try {
        // 注册 settingsPanel 组件
        window.Alpine.data('settingsPanel', SettingsPanel);
        Logger.debug('[Settings] ✅ Alpine component "settingsPanel" registered successfully');
        
        // 清理重试计数器
        delete (window as any).__alpineRetryCount;
    } catch (error) {
        Logger.error('[Settings] Failed to register Alpine component:', error);
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
        Logger.error('Failed to open performance monitor:', error);
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
            statusEl.innerHTML = `
                <span class="status-dot status-success"></span>
                <span class="text-slate-600 text-xs font-medium flex items-center gap-1">
                    ${escapeHtml(providerInfo.name)}: <span class="font-mono text-blue-600">${escapeHtml(config.model)}</span>
                </span>
            `;
            return;
        }
    }
    // ✅ 安全: 静态HTML模板，无用户输入
    statusEl.innerHTML = `
        <span class="status-dot status-pending pulse-dot"></span>
        <span class="text-slate-500 text-xs italic">等待API配置...</span>
    `;
}

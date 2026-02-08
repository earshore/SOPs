// src/components/settings/systemSettings.js
// ================================================================
// 🎯 Phase 3: Alpine.js Refactor
// ================================================================

import { escapeHtml } from '@/common/utils/security';
import { PROVIDERS } from "../../common/constants/constants.js";
import { fetchModelsFromApi, callLLM } from "../../services/llmService";
import { showToast } from "../../common/utils/ui.js";
import { StorageService, STORAGE_KEYS } from "../../services/storageService.ts";
import { ErrorService } from "../../services/errorService";
import { EnvConfig } from "../../common/config/envConfig.js"; // 🔒 P0修复: 导入环境配置

// ==========================================
// Alpine Component Logic
// ==========================================

const SettingsPanel = () => ({
    isOpen: false,

    // LLM Config State
    llm: {
        provider: 'llmgateway',
        endpoint: '',
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
        savedKeyMap: {} // Cache for keys of different providers
    },

    // Computed / Helpers
    get currentProviderConfig() {
        return PROVIDERS[this.llm.provider] || {};
    },

    get activeModelInfo() {
        if (!this.llm.model) return null;
        const m = this.llm.models.find(x => (typeof x === 'string' ? x : x.id) === this.llm.model);
        if (!m || typeof m === 'string') return null;
        return m;
    },

    // 🔒 P0修复: 检查是否为生产环境
    get isProduction() {
        return EnvConfig.isProduction;
    },

    // 🔒 P0修复: 检查端点是否为危险的外部API
    isDangerousEndpoint(endpoint) {
        if (!endpoint) return false;
        const dangerousEndpoints = [
            'api.openai.com',
            'api.anthropic.com',
            'api.deepseek.com',
            'generativelanguage.googleapis.com'
        ];
        return dangerousEndpoints.some(domain => endpoint.includes(domain));
    },

    get proxyNeedsInput() {
        return ['scraperapi', 'zenrows', 'brightdata', 'custom_api', 'custom_proxy'].includes(this.proxy.type);
    },

    get proxyInputLabel() {
        if (this.proxy.type === 'custom_proxy') return 'HTTP 代理地址';
        if (this.proxy.type === 'custom_api') return '完整端点 (URL)';
        return 'API Key (密钥)';
    },

    get proxyInputPlaceholder() {
        if (this.proxy.type === 'custom_proxy') return 'http://user:pass@ip:port';
        if (this.proxy.type === 'custom_api') return 'https://api.example.com/?url=';
        return `粘贴 ${this.getProxyDisplayName(this.proxy.type)} Key`;
    },

    // Lifecycle
    init() {
        this.loadProxyConfig();
        this.loadProviderConfig(this.llm.provider); // Force load on init

        // Watch for provider changes to load its config
        this.$watch('llm.provider', (val) => this.loadProviderConfig(val));
        // Watch for proxy type to restore cached key
        this.$watch('proxy.type', (val) => {
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

    // --- LLM Logic ---

    async loadProviderConfig(provider) {
        if (!provider) return;
        const config = PROVIDERS[provider];

        // Safety check: if provider key doesn't exist in constants
        if (!config) {
            console.warn(`Unknown provider: ${provider}, falling back to OpenAI`);
            return;
        }

        const savedConfig = StorageService.getLLMConfig(provider) || {};

        this.llm.endpoint = savedConfig.endpoint || config.endpoint;
        
        // 🔐 P0优化: 从安全存储读取API密钥
        try {
            this.llm.apiKey = await StorageService.getSecure(`llm_key_${provider}`, "");
        } catch (error) {
            console.warn('[Settings] Failed to load encrypted API key, using fallback:', error);
            // 兼容旧数据: 如果加密读取失败,尝试读取明文(迁移期)
            this.llm.apiKey = savedConfig.apiKey || "";
        }

        // Models: Use saved or default
        const rawModels = (savedConfig.models && savedConfig.models.length > 0)
            ? savedConfig.models
            : (config.models || []);

        // Deduplicate models
        const seen = new Set();
        this.llm.models = rawModels.filter(m => {
            const id = typeof m === 'string' ? m : m.id;
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
        });

        this.llm.model = savedConfig.model || "";

        // Auto-select first model if none selected and models exist
        if (!this.llm.model && this.llm.models.length > 0) {
            const first = this.llm.models[0];
            this.llm.model = typeof first === 'string' ? first : first.id;
        }
    },

    async fetchModels() {
        if (!this.llm.apiKey) {
            showToast("请先输入API Key", "warning");
            return;
        }

        if (!this.llm.endpoint) {
            showToast("请先输入API端点地址", "warning");
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
            let models = [];
            const provider = this.llm.provider;

            if (["llmgateway", "openai", "deepseek", "moonshot", "qwen"].includes(provider)) {
                console.log(`🔄 正在从 ${provider} 获取模型列表...`);
                models = await fetchModelsFromApi(provider, this.llm.endpoint, this.llm.apiKey);
                console.log(`📋 从API获取到 ${models.length} 个模型:`, models.slice(0, 5));
            } else {
                // Mock delay for static providers
                models = PROVIDERS[provider].models || [];
                console.log(`📋 使用静态模型列表 (${provider}):`, models);
                await new Promise(r => setTimeout(r, 600));
            }

            if (models.length === 0) {
                console.warn("⚠️ 模型列表为空，可能是API配置错误或网络问题");
                throw new Error("未能获取到有效模型列表，请检查API配置和网络连接");
            }

            // Deduplicate models - 改进去重逻辑
            const seen = new Set();
            const uniqueModels = [];
            
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
                this.llm.model = typeof firstModel === 'string' ? firstModel : firstModel.id;
                console.log(`🔄 自动选择第一个模型: ${this.llm.model}`);
            }

            console.log(`\n${'='.repeat(60)}`);
            console.log(`✅ 模型列表获取成功！共 ${this.llm.models.length} 个模型`);
            console.log(`${'='.repeat(60)}\n`);

            showToast(`成功同步 ${this.llm.models.length} 个模型`, "success");
        } catch (e) {
            console.error(`\n${'='.repeat(60)}`);
            console.error("❌ 获取模型列表失败:", e);
            console.error("❌ 错误详情:", e.message);
            console.error("❌ 错误堆栈:", e.stack);
            console.error(`${'='.repeat(60)}\n`);
            
            // 提供更友好的错误提示
            let errorMsg = e.message;
            if (e.message.includes('HTTP 401') || e.message.includes('Unauthorized')) {
                errorMsg = 'API Key 无效或已过期，请检查配置';
            } else if (e.message.includes('HTTP 403') || e.message.includes('Forbidden')) {
                errorMsg = 'API Key 没有访问权限，请检查配置';
            } else if (e.message.includes('HTTP 404')) {
                errorMsg = 'API端点地址不正确，请检查配置';
            } else if (e.message.includes('Failed to fetch') || e.message.includes('NetworkError')) {
                errorMsg = '网络连接失败，请检查网络或端点地址';
            } else if (e.message.includes('timeout') || e.message.includes('AbortError')) {
                errorMsg = '请求超时，请检查网络连接';
            }
            
            showToast(`获取模型失败: ${errorMsg}`, "error");
            ErrorService.handle(e, { action: 'fetchModels', module: 'settings' });
        } finally {
            this.llm.isFetching = false;
        }
    },

    async testConnection() {
        if (!this.llm.apiKey || !this.llm.model) {
            showToast("请先完善配置 (Key + 模型)", "warning");
            return;
        }

        this.llm.isTesting = true;
        try {
            showToast("正在发送测试请求...", "info");
            const messages = [{ role: "user", content: "Hello! Reply 'OK'." }];

            const response = await callLLM(
                messages,
                this.llm.provider,
                this.llm.endpoint,
                this.llm.apiKey,
                this.llm.model,
                { temperature: 0.1, jsonMode: false, timeout: 15000 }
            );

            console.log("Test Response:", response);
            showToast("连接成功！", "success");
        } catch (error) {
            ErrorService.handle(error, { action: 'testConnection', module: 'settings' });
        } finally {
            this.llm.isTesting = false;
        }
    },

    async saveProviderConfig() {
        if (!this.llm.apiKey && this.llm.provider !== 'custom') {  // Custom might not need key? Usually does.
            showToast("请填写 API Key", "warning");
            return;
        }

        try {
            // 🔐 P0优化: 使用安全存储保存API密钥
            const newConfig = {
                endpoint: this.llm.endpoint,
                model: this.llm.model,
                models: this.llm.models
            };
            
            // API Key 单独加密存储
            await StorageService.setSecure(`llm_key_${this.llm.provider}`, this.llm.apiKey);
            
            // 其他配置正常存储
            StorageService.setLLMConfig(this.llm.provider, newConfig);

            // Update global status UI (if any outside this component)
            // Since we use Alpine, we might want a global store for status
            // For now, rely on StorageService events or manual update
            updateModelStatus();

            showToast("LLM 配置已保存 (API Key 已加密)", "success");
            setTimeout(() => this.close(), 500);
        } catch (error) {
            ErrorService.handle(error, { action: 'saveProviderConfig', module: 'settings' });
        }
    },

    // --- Proxy Logic ---

    loadProxyConfig() {
        const savedConfig = StorageService.get(STORAGE_KEYS.SCRAPER_PROXY_CONFIG, {});
        this.proxy.savedKeyMap = StorageService.get(STORAGE_KEYS.PROXY_KEY_MAP, {});

        this.proxy.type = savedConfig.type || "allorigins";
        // If the saved active type matches current type, use its URL, otherwise fallback to cache
        if (savedConfig.type === this.proxy.type) {
            this.proxy.customUrl = savedConfig.customUrl || "";
        } else {
            this.proxy.customUrl = this.proxy.savedKeyMap[this.proxy.type] || "";
        }
    },

    saveProxyConfig() {
        // Update cache map
        this.proxy.savedKeyMap[this.proxy.type] = this.proxy.customUrl;
        StorageService.set(STORAGE_KEYS.PROXY_KEY_MAP, this.proxy.savedKeyMap);

        // Save active config
        const config = { type: this.proxy.type, customUrl: this.proxy.customUrl };
        StorageService.set(STORAGE_KEYS.SCRAPER_PROXY_CONFIG, config);

        showToast("网络配置已更新", "success");
    },

    getProxyDisplayName(type) {
        const names = {
            scraperapi: "ScraperAPI",
            zenrows: "ZenRows",
            brightdata: "Bright Data",
            custom_api: "自定义 API",
            allorigins: "AllOrigins",
            custom_proxy: "HTTP 代理",
        };
        return names[type] || "默认";
    }
});

// ==========================================
// Initialization & Exports
// ==========================================

export function initAlpineSettings() {
    if (window.Alpine) {
        window.Alpine.data('settingsPanel', SettingsPanel);
    } else {
        console.error("Alpine not found!");
    }
}

// Legacy Bridge for ActionRegistry
export function openSettings() {
    window.dispatchEvent(new CustomEvent(APP_EVENTS.SETTINGS_OPEN));
}

export function closeSettings() {
    // Dispatch event to close via Alpine
    window.dispatchEvent(new CustomEvent(APP_EVENTS.SETTINGS_CLOSE));
    // We need to add @close-settings.window="close()" to HTML
}

// These are no longer needed for direct calling, but kept if other modules import them
// actually, other modules shouldn't import them anymore if we move to event bus.
// For now, we only need openSettings export.
export const initSettingsListeners = () => { }; // No-op, handled by Alpine
export const saveProviderConfig = () => { };
export const loadProviderConfig = () => { };
export const fetchModels = () => { };
export const toggleApiKeyVisibility = () => { };
export const testConnection = () => { };
export const saveProxyConfig = () => { };
export const renderProxyInputUI = () => { };

// Keep this for main.js status update
export async function updateModelStatus() {
    const provider = StorageService.get(STORAGE_KEYS.LLM_ACTIVE_PROVIDER);
    const statusEl = document.getElementById("model-status");
    if (!statusEl) return;

    if (provider && PROVIDERS[provider]) {
        // 🔐 P0优化: 使用安全存储读取配置
        const config = await StorageService.getLLMConfigWithKey(provider);
        if (config && config.apiKey && config.model) {
            statusEl.innerHTML = `
                <span class="status-dot status-success"></span>
                <span class="text-slate-600 text-xs font-medium flex items-center gap-1">
                    ${escapeHtml(PROVIDERS[provider].name)}: <span class="font-mono text-blue-600">${escapeHtml(config.model)}</span>
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
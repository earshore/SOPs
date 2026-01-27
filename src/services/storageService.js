// src/services/storageService.js
// ================================================================
// 🎯 P0-1: 统一数据持久化服务
// 替代分散的 localStorage 直接调用
// ================================================================

/**
 * 存储键名常量
 * 集中定义所有 localStorage 键名，便于管理和重命名
 */
export const STORAGE_KEYS = {
    // === LLM 配置 ===
    LLM_ACTIVE_PROVIDER: 'llm_active_provider',
    LLM_CONFIG_PREFIX: 'llm_',  // 实际键: llm_openai, llm_deepseek 等

    // === 代理配置 ===
    PROXY_CONFIG: 'proxy_config',
    PROXY_KEY_MAP: 'proxy_key_map',
    SCRAPER_PROXY_CONFIG: 'scraper_proxy_config',

    // === 采集历史 ===
    SCRAPE_HISTORY: 'scrape_history',

    // === 布局配置 ===
    LAYOUT_CONFIG_PREFIX: 'layout_config_',  // 实际键: layout_config_template1 等

    // === 功能开关 ===
    FEATURE_FLAGS_PREFIX: 'feature_',

    // === 搜索历史 ===
    AMZ_SEARCH_HISTORY: 'amzf_search_history',

    // === 草稿箱 ===
    DRAFT_PREFIX: 'draft_',
};

/**
 * 存储服务 - 统一的数据持久化接口
 */
export const StorageService = {
    /**
     * 获取数据
     * @param {string} key
     * @param {*} defaultValue
     */
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            // Handle cases where item might be "undefined" string
            if (item === "undefined") return defaultValue;
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.warn(`[Storage] Error reading ${key}:`, e);
            return defaultValue;
        }
    },

    /**
     * 保存数据
     * @param {string} key
     * @param {*} value
     */
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error(`[Storage] Error saving ${key}:`, e);
        }
    },

    /**
     * 删除数据
     * @param {string} key
     */
    remove(key) {
        localStorage.removeItem(key);
    },

    /**
     * 清空所有数据
     */
    clear() {
        localStorage.clear();
    },

    // ================================================================
    // 🔧 业务快捷方法
    // ================================================================

    /**
     * 获取 LLM 配置
     * @param {string} provider 
     */
    getLLMConfig(provider) {
        return this.get(`${STORAGE_KEYS.LLM_CONFIG_PREFIX}${provider}`, {});
    },

    /**
     * 保存 LLM 配置
     * @param {string} provider 
     * @param {Object} config 
     */
    setLLMConfig(provider, config) {
        this.set(`${STORAGE_KEYS.LLM_CONFIG_PREFIX}${provider}`, config);
    },

    /**
     * 获取代理配置 (Main.js 兼容)
     * @returns {Object}
     */
    getProxyConfig() {
        // 优先读取新版 Scraper Proxy Config，如果不存在读取旧版 Proxy Config
        // 这里根据 main.js 的用法，似乎是指全局代理或 Scraper 代理
        // Main.js 195行: StorageService.getProxyConfig() 用于 setting the global proxy input?
        // Let's assume it matches STORAGE_KEYS.PROXY_CONFIG based on variable names usually.
        // But systemSettings.js uses SCRAPER_PROXY_CONFIG for scraping.
        // Let's look at main.js again. loading "proxy-select" value.
        // In systemSettings.js loadProxyConfig uses SCRAPER_PROXY_CONFIG. 
        // Main.js seems to be loading the generic proxy config (maybe for the browser/system?).
        // For safety, I will map it to PROXY_CONFIG as per keys.
        return this.get(STORAGE_KEYS.PROXY_CONFIG, {});
    },

    /**
     * 获取草稿
     * @param {string} module - 模块名 (e.g. 'analysis', 'promptlab')
     * @returns {*} 草稿数据
     */
    getDraft(module) {
        return this.get(`${STORAGE_KEYS.DRAFT_PREFIX}${module}`, null);
    },

    /**
     * 获取抓取历史
     * @returns {Array}
     */
    getScrapeHistory() {
        return this.get(STORAGE_KEYS.SCRAPE_HISTORY, []);
    },

    /**
     * 保存抓取历史
     * @param {Array} history
     */
    setScrapeHistory(history) {
        this.set(STORAGE_KEYS.SCRAPE_HISTORY, history);
    },

    /**
     * 保存草稿
     * @param {string} module - 模块名
     * @param {*} data - 草稿数据
     */
    setDraft(module, data) {
        this.set(`${STORAGE_KEYS.DRAFT_PREFIX}${module}`, data);
    },

    /**
     * 清除草稿
     * @param {string} module - 模块名
     */
    removeDraft(module) {
        this.remove(`${STORAGE_KEYS.DRAFT_PREFIX}${module}`);
    },

    // ... existing layout config methods ...

    /**
     * 获取布局配置
     * @param {string} templateId
     * @returns {Array}
     */
    getLayoutConfig(templateId) {
        return this.get(`${STORAGE_KEYS.LAYOUT_CONFIG_PREFIX}${templateId}`, []);
    },

    /**
     * 保存布局配置
     * @param {string} templateId
     * @param {Array} layout
     */
    setLayoutConfig(templateId, layout) {
        this.set(`${STORAGE_KEYS.LAYOUT_CONFIG_PREFIX}${templateId}`, layout);
    },
};

// 默认导出
export default StorageService;

// ================================================================
// 🔄 向后兼容：暴露到 window (过渡期)
// ================================================================
if (typeof window !== 'undefined') {
    window.StorageService = StorageService;
    window.STORAGE_KEYS = STORAGE_KEYS;
}

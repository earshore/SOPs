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
};

/**
 * 存储服务 - 统一的数据持久化接口
 */
export const StorageService = {
    /**
     * 获取存储值
     * @param {string} key - 存储键名
     * @param {*} defaultValue - 默认值
     * @returns {*} 解析后的值或默认值
     */
    get(key, defaultValue = null) {
        try {
            const raw = localStorage.getItem(key);
            if (raw === null) return defaultValue;
            return JSON.parse(raw);
        } catch (e) {
            console.warn(`[StorageService] 解析失败: ${key}`, e);
            return defaultValue;
        }
    },

    /**
     * 设置存储值
     * @param {string} key - 存储键名
     * @param {*} value - 要存储的值
     * @returns {boolean} 是否成功
     */
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error(`[StorageService] 存储失败: ${key}`, e);
            // 可能是存储空间已满
            if (e.name === 'QuotaExceededError') {
                this._handleQuotaExceeded();
            }
            return false;
        }
    },

    /**
     * 获取原始字符串（不进行 JSON 解析）
     * @param {string} key - 存储键名
     * @param {string} defaultValue - 默认值
     * @returns {string|null} 原始字符串或默认值
     */
    getRaw(key, defaultValue = null) {
        try {
            const raw = localStorage.getItem(key);
            return raw !== null ? raw : defaultValue;
        } catch (e) {
            console.warn(`[StorageService] 读取失败: ${key}`, e);
            return defaultValue;
        }
    },

    /**
     * 设置原始字符串（不进行 JSON 序列化）
     * @param {string} key - 存储键名
     * @param {string} value - 要存储的字符串
     * @returns {boolean} 是否成功
     */
    setRaw(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (e) {
            console.error(`[StorageService] 存储失败: ${key}`, e);
            // 可能是存储空间已满
            if (e.name === 'QuotaExceededError') {
                this._handleQuotaExceeded();
            }
            return false;
        }
    },

    /**
     * 删除存储值
     * @param {string} key - 存储键名
     */
    remove(key) {
        localStorage.removeItem(key);
    },

    /**
     * 获取存储使用情况
     * @returns {{used: number, total: number, percent: number}}
     */
    getUsage() {
        let used = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            used += (localStorage.getItem(key) || '').length * 2; // UTF-16 编码
        }
        const total = 5 * 1024 * 1024; // 5MB 限制
        return {
            used,
            total,
            percent: Math.round((used / total) * 100)
        };
    },

    /**
     * 处理存储空间超限
     * @private
     */
    _handleQuotaExceeded() {
        console.warn('[StorageService] 存储空间不足，尝试清理历史数据...');
        // 清理采集历史中的旧数据
        const history = this.get(STORAGE_KEYS.SCRAPE_HISTORY, []);
        if (history.length > 10) {
            this.set(STORAGE_KEYS.SCRAPE_HISTORY, history.slice(0, 10));
        }
    },

    // ================================================================
    // 🔧 业务快捷方法
    // ================================================================

    /**
     * 获取 LLM 配置 (包含加密的API密钥)
     * @param {string} [provider] - 厂商标识，不传则使用当前激活的
     * @returns {Promise<Object|null>} 完整配置(包含解密后的apiKey)
     */
    async getLLMConfigWithKey(provider = null) {
        const activeProvider = provider || this.get(STORAGE_KEYS.LLM_ACTIVE_PROVIDER);
        if (!activeProvider) return null;
        
        const config = this.getLLMConfig(activeProvider);
        if (!config) return null;
        
        // 🔐 从安全存储读取API密钥
        try {
            const apiKey = await this.getSecure(`llm_key_${activeProvider}`, '');
            return { ...config, apiKey };
        } catch (error) {
            console.warn('[StorageService] Failed to decrypt API key:', error);
            return { ...config, apiKey: '' };
        }
    },

    /**
     * 获取 LLM 配置
     * @param {string} [provider] - 厂商标识，不传则使用当前激活的
     * @returns {Object|null}
     */
    getLLMConfig(provider = null) {
        const activeProvider = provider || this.get(STORAGE_KEYS.LLM_ACTIVE_PROVIDER);
        if (!activeProvider) return null;
        
        const config = this.get(`${STORAGE_KEYS.LLM_CONFIG_PREFIX}${activeProvider}`, {});
        
        // 🔐 P0优化: 不再返回apiKey,需要通过getSecure单独获取
        // 移除可能存在的明文apiKey(迁移期兼容)
        if (config.apiKey) {
            delete config.apiKey;
        }
        
        return config;
    },

    /**
     * 保存 LLM 配置
     * @param {string} provider - 厂商标识
     * @param {Object} config - 配置对象
     */
    setLLMConfig(provider, config) {
        this.set(`${STORAGE_KEYS.LLM_CONFIG_PREFIX}${provider}`, config);
        this.set(STORAGE_KEYS.LLM_ACTIVE_PROVIDER, provider);
    },

    /**
     * 获取代理配置
     * @returns {Object}
     */
    getProxyConfig() {
        return this.get(STORAGE_KEYS.PROXY_CONFIG, { type: 'allorigins' });
    },

    /**
     * 保存代理配置
     * @param {Object} config
     */
    setProxyConfig(config) {
        this.set(STORAGE_KEYS.PROXY_CONFIG, config);
    },

    /**
     * 获取采集历史
     * @returns {Array}
     */
    getScrapeHistory() {
        return this.get(STORAGE_KEYS.SCRAPE_HISTORY, []);
    },

    /**
     * 保存采集历史
     * @param {Array} history
     */
    setScrapeHistory(history) {
        // 限制最大条数
        const maxItems = 50;
        const trimmed = history.slice(0, maxItems);
        this.set(STORAGE_KEYS.SCRAPE_HISTORY, trimmed);
    },

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
    
    // ================================================================
    // 🔐 P0优化: 安全存储快捷方法
    // ================================================================
    
    /**
     * 安全存储敏感数据 (加密)
     * @param {string} key - 存储键名
     * @param {any} value - 要存储的值
     * @returns {Promise<boolean>} 是否成功
     */
    async setSecure(key, value) {
        // 动态导入 SecureStorage 避免循环依赖
        const { SecureStorage } = await import('../common/utils/secureStorage.js');
        return await SecureStorage.setSecure(key, value);
    },
    
    /**
     * 读取安全存储的数据 (解密)
     * @param {string} key - 存储键名
     * @param {any} defaultValue - 默认值
     * @returns {Promise<any>} 解密后的值
     */
    async getSecure(key, defaultValue = null) {
        const { SecureStorage } = await import('../common/utils/secureStorage.js');
        return await SecureStorage.getSecure(key, defaultValue);
    },
    
    /**
     * 删除安全存储的数据
     * @param {string} key - 存储键名
     */
    removeSecure(key) {
        this.remove(`secure_${key}`);
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

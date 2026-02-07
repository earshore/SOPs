// src/common/config/envConfig.js
// ================================================================
// 🌐 环境配置管理 - 基于 Vite 环境变量
// 支持 .env 文件配置，提供灵活的环境管理
// ================================================================

/**
 * 环境配置
 * 基于 Vite 的 import.meta.env 读取配置
 */
export const EnvConfig = {
  /**
   * 当前环境
   * @returns {'development' | 'production' | 'test'}
   */
  get environment() {
    return import.meta.env.VITE_APP_ENV || import.meta.env.MODE || 'production';
  },

  /**
   * 是否为开发环境
   */
  get isDevelopment() {
    return this.environment === 'development';
  },

  /**
   * 是否为生产环境
   */
  get isProduction() {
    return this.environment === 'production';
  },

  /**
   * 是否为测试环境
   */
  get isTest() {
    return this.environment === 'test';
  },

  /**
   * API 配置
   */
  api: {
    /**
     * API 基础路径
     */
    get baseUrl() {
      return import.meta.env.VITE_API_BASE_URL || '/v1';
    },

    /**
     * API 超时时间（毫秒）
     */
    get timeout() {
      const timeout = import.meta.env.VITE_API_TIMEOUT;
      return timeout ? parseInt(timeout, 10) : 30000;
    },

    /**
     * 标准化 API Endpoint
     * @param {string} endpoint - 用户配置的 endpoint
     * @returns {string} 标准化后的 endpoint
     */
    normalizeEndpoint(endpoint) {
      // 开发环境: 统一使用代理路径
      if (EnvConfig.isDevelopment) {
        return this.baseUrl;
      }
      
      // 生产环境: 
      // 1. 如果用户配置了完整的 URL (http/https 开头),直接使用
      // 2. 如果是相对路径或空,使用 Cloudflare Functions 代理
      if (endpoint && (endpoint.startsWith('http://') || endpoint.startsWith('https://'))) {
        // 移除末尾的 /v1 (如果存在),避免重复
        let normalizedUrl = endpoint.trim();
        if (normalizedUrl.endsWith('/v1')) {
          normalizedUrl = normalizedUrl.slice(0, -3);
        }
        return normalizedUrl;
      }
      
      // 使用配置的基础路径
      return this.baseUrl;
    }
  },

  /**
   * 功能开关
   */
  features: {
    /**
     * 是否启用监控
     */
    get monitoring() {
      return import.meta.env.VITE_ENABLE_MONITORING === 'true';
    },

    /**
     * 是否启用调试模式
     */
    get debug() {
      return import.meta.env.VITE_ENABLE_DEBUG === 'true';
    },

    /**
     * 是否启用性能监控
     */
    get performance() {
      return import.meta.env.VITE_ENABLE_PERFORMANCE === 'true';
    }
  },

  /**
   * 日志配置
   */
  logging: {
    /**
     * 日志级别
     * @returns {'debug' | 'info' | 'warn' | 'error'}
     */
    get level() {
      return import.meta.env.VITE_LOG_LEVEL || 'info';
    },

    /**
     * 是否启用详细日志
     */
    get verbose() {
      return this.level === 'debug' || EnvConfig.features.debug;
    }
  },

  /**
   * 监控服务配置
   */
  monitoring: {
    /**
     * Sentry DSN
     */
    get sentryDsn() {
      return import.meta.env.VITE_SENTRY_DSN || null;
    }
  },

  /**
   * 获取所有环境变量（调试用）
   * @returns {Object}
   */
  getAll() {
    return {
      environment: this.environment,
      isDevelopment: this.isDevelopment,
      isProduction: this.isProduction,
      api: {
        baseUrl: this.api.baseUrl,
        timeout: this.api.timeout
      },
      features: {
        monitoring: this.features.monitoring,
        debug: this.features.debug,
        performance: this.features.performance
      },
      logging: {
        level: this.logging.level,
        verbose: this.logging.verbose
      }
    };
  }
};

export default EnvConfig;

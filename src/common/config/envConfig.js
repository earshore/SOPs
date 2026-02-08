// src/common/config/envConfig.js
// ================================================================
// 🌐 环境配置管理 - 基于 ConfigCenter
// 向后兼容的环境配置接口
// ================================================================

import { configCenter } from './ConfigCenter';

/**
 * 环境配置
 * @deprecated 请使用 configCenter 替代
 */
export const EnvConfig = {
  /**
   * 当前环境
   * @returns {'development' | 'production' | 'test'}
   */
  get environment() {
    return configCenter.get('environment');
  },

  /**
   * 是否为开发环境
   */
  get isDevelopment() {
    return configCenter.isDevelopment();
  },

  /**
   * 是否为生产环境
   */
  get isProduction() {
    return configCenter.isProduction();
  },

  /**
   * 是否为测试环境
   */
  get isTest() {
    return configCenter.isTest();
  },

  /**
   * API 配置
   */
  api: {
    /**
     * API 基础路径
     */
    get baseUrl() {
      return configCenter.get('api.baseUrl');
    },

    /**
     * API 超时时间
     */
    get timeout() {
      return configCenter.get('api.timeout');
    },

    /**
     * 重试次数
     */
    get retryAttempts() {
      return configCenter.get('api.retryAttempts');
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
   * 性能配置
   */
  performance: {
    /**
     * 是否启用性能监控
     */
    get enableMonitoring() {
      return configCenter.get('performance.enableMonitoring');
    },

    /**
     * 是否启用DevTools
     */
    get enableDevTools() {
      return configCenter.get('performance.enableDevTools');
    },

    /**
     * 日志级别
     */
    get logLevel() {
      return configCenter.get('performance.logLevel');
    }
  },

  /**
   * 功能开关
   */
  features: {
    /**
     * 是否启用实验性功能
     */
    get enableExperimentalFeatures() {
      return configCenter.get('features.enableExperimentalFeatures');
    },

    /**
     * 是否启用Beta功能
     */
    get enableBetaFeatures() {
      return configCenter.get('features.enableBetaFeatures');
    },

    /**
     * 是否启用调试模式
     */
    get enableDebugMode() {
      return configCenter.get('features.enableDebugMode');
    },

    /**
     * 是否启用监控（向后兼容）
     */
    get monitoring() {
      return this.enableMonitoring;
    },

    /**
     * 是否启用调试模式（向后兼容）
     */
    get debug() {
      return this.enableDebugMode;
    },

    /**
     * 是否启用性能监控（向后兼容）
     */
    get performance() {
      return configCenter.get('performance.enableMonitoring');
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
      return configCenter.get('performance.logLevel');
    },

    /**
     * 是否启用详细日志
     */
    get verbose() {
      return this.level === 'debug' || EnvConfig.features.enableDebugMode;
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
        timeout: this.api.timeout,
        retryAttempts: this.api.retryAttempts
      },
      features: {
        enableExperimentalFeatures: this.features.enableExperimentalFeatures,
        enableBetaFeatures: this.features.enableBetaFeatures,
        enableDebugMode: this.features.enableDebugMode
      },
      performance: {
        enableMonitoring: this.performance.enableMonitoring,
        enableDevTools: this.performance.enableDevTools,
        logLevel: this.performance.logLevel
      },
      logging: {
        level: this.logging.level,
        verbose: this.logging.verbose
      }
    };
  }
};

export default EnvConfig;

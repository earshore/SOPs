/**
 * envConfig.ts - 环境配置管理
 * 
 * 基于 ConfigCenter 的向后兼容环境配置接口
 */

import { configCenter } from './ConfigCenter';

/**
 * 环境类型
 */
export type Environment = 'development' | 'production' | 'test';

/**
 * 日志级别
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * 环境配置接口
 * @deprecated 请使用 configCenter 替代
 */
export const EnvConfig = {
  /**
   * 当前环境
   */
  get environment(): Environment {
    return configCenter.get('environment') as Environment;
  },

  /**
   * 是否为开发环境
   */
  get isDevelopment(): boolean {
    return configCenter.isDevelopment();
  },

  /**
   * 是否为生产环境
   */
  get isProduction(): boolean {
    return configCenter.isProduction();
  },

  /**
   * 是否为测试环境
   */
  get isTest(): boolean {
    return configCenter.isTest();
  },

  /**
   * API 配置
   */
  api: {
    /**
     * API 基础路径
     */
    get baseUrl(): string {
      return configCenter.get('api.baseUrl') as string;
    },

    /**
     * API 超时时间
     */
    get timeout(): number {
      return configCenter.get('api.timeout') as number;
    },

    /**
     * 重试次数
     */
    get retryAttempts(): number {
      return configCenter.get('api.retryAttempts') as number;
    },

    /**
     * 标准化 API Endpoint
     * @param endpoint - 用户配置的 endpoint
     * @returns 标准化后的 endpoint
     */
    normalizeEndpoint(endpoint: string): string {
      // 尊重用户配置的 endpoint；危险上游由调用层统一拦截。
      const candidate = (endpoint || this.baseUrl || '/v1').trim();
      if (candidate === '/') return candidate;
      return candidate.replace(/\/+$/, '');
    }
  },

  /**
   * 性能配置
   */
  performance: {
    /**
     * 是否启用性能监控
     */
    get enableMonitoring(): boolean {
      return configCenter.get('performance.enableMonitoring') as boolean;
    },

    /**
     * 是否启用DevTools
     */
    get enableDevTools(): boolean {
      return configCenter.get('performance.enableDevTools') as boolean;
    },

    /**
     * 日志级别
     */
    get logLevel(): LogLevel {
      return configCenter.get('performance.logLevel') as LogLevel;
    }
  },

  /**
   * 功能开关
   */
  features: {
    /**
     * 是否启用实验性功能
     */
    get enableExperimentalFeatures(): boolean {
      return configCenter.get('features.enableExperimentalFeatures') as boolean;
    },

    /**
     * 是否启用Beta功能
     */
    get enableBetaFeatures(): boolean {
      return configCenter.get('features.enableBetaFeatures') as boolean;
    },

    /**
     * 是否启用调试模式
     */
    get enableDebugMode(): boolean {
      return configCenter.get('features.enableDebugMode') as boolean;
    },

    /**
     * 是否启用性能监控（向后兼容）
     */
    get performance(): boolean {
      return configCenter.get('performance.enableMonitoring') as boolean;
    }
  },

  /**
   * 日志配置
   */
  logging: {
    /**
     * 日志级别
     */
    get level(): LogLevel {
      return configCenter.get('performance.logLevel') as LogLevel;
    },

    /**
     * 是否启用详细日志
     */
    get verbose(): boolean {
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
    get sentryDsn(): string | null {
      return import.meta.env.VITE_SENTRY_DSN || null;
    }
  },

  /**
   * 获取所有环境变量（调试用）
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

// src/common/config/ConfigCenter.ts
// ================================================================
// 🎯 统一配置管理中心
// 集中管理所有应用配置，支持环境差异化、验证和热更新
// ================================================================

import type { MenuConfig } from '../../types/config';
import type { IConfigService } from '../../types/services';
import { validateConfig } from './schemas/configSchema';
import { loadRouteConfig } from './loaders/routeConfigLoader';
// ==================== 类型定义 ====================

/**
 * 环境类型
 */
export type Environment = 'development' | 'production' | 'test';

/**
 * API配置
 */
export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

/**
 * 爬虫服务配置
 */
export interface ScraperConfig {
  requestTimeout: number;
  maxConcurrent: number;
  maxRetries: number;
  retryDelay: number;
  batchSize: number;
  batchDelay: number;
  cacheDuration: number;
}

/**
 * LLM服务配置
 */
export interface LLMConfig {
  defaultTimeout: number;
  analysisTimeout: number;
  testConnectionTimeout: number;
  maxRetries: number;
  retryDelay: number;
}

/**
 * 历史记录配置
 */
export interface HistoryConfig {
  maxItems: number;
  maxEventHistory: number;
  maxSearchHistory: number;
}

/**
 * 日志配置
 */
export interface LoggerConfig {
  maxLogs: number;
  minLevel: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  batchSize: number;
  batchTimeout: number;
}

/**
 * 存储配置
 */
export interface StorageConfig {
  lruMaxSize: number; // bytes
  lruWarningThreshold: number; // 0-1
  lruCleanupRatio: number; // 0-1
  localStorageTotalSize: number; // bytes
  historyMaxItems: number;
}

/**
 * 性能配置
 */
export interface PerformanceConfig {
  enableMonitoring: boolean;
  enableDevTools: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  maxCacheSize: number;
}

/**
 * 功能开关配置
 */
export interface FeatureFlags {
  enableExperimentalFeatures: boolean;
  enableBetaFeatures: boolean;
  enableDebugMode: boolean;
}

/**
 * 应用配置接口
 */
export interface AppConfig {
  environment: Environment;
  api: ApiConfig;
  performance: PerformanceConfig;
  features: FeatureFlags;
  routes: MenuConfig;
  scraper: ScraperConfig;
  llm: LLMConfig;
  history: HistoryConfig;
  logger: LoggerConfig;
  storage: StorageConfig;
}

/**
 * 配置变更监听器
 */
export type ConfigChangeListener = (key: string, newValue: unknown, oldValue: unknown) => void;

// ==================== 配置中心类 ====================

/**
 * 配置中心单例类
 * 实现 IConfigService 接口
 */
export class ConfigCenter implements IConfigService {
  private static instance: ConfigCenter;
  private config: AppConfig;
  private listeners: Map<string, Set<ConfigChangeListener>>;

  private constructor() {
    this.listeners = new Map();
    this.config = this.loadConfig();
    // ConfigCenter 是基础服务，不依赖 Logger 避免循环依赖
  }

  /**
   * 获取配置中心单例
   */
  public static getInstance(): ConfigCenter {
    if (!ConfigCenter.instance) {
      ConfigCenter.instance = new ConfigCenter();
    }
    return ConfigCenter.instance;
  }

  /**
   * 加载配置
   */
  private loadConfig(): AppConfig {
    const env = this.getEnvironment();
    
    // 加载基础配置
    const baseConfig = this.getBaseConfig(env);
    
    // 加载环境特定配置
    const envConfig = this.getEnvConfig(env);
    
    // 加载路由配置
    const routeConfig = loadRouteConfig();
    
    // 合并配置
    return this.mergeConfig(baseConfig, { ...envConfig, routes: routeConfig });
  }

  /**
   * 获取当前环境
   */
  private getEnvironment(): Environment {
    const env = import.meta.env.VITE_APP_ENV || import.meta.env.MODE || 'production';
    return env as Environment;
  }

  /**
   * 获取基础配置
   */
  private getBaseConfig(env: Environment): AppConfig {
    return {
      environment: env,
      api: {
        baseUrl: import.meta.env.VITE_API_BASE_URL || '/v1',
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000
      },
      performance: {
        enableMonitoring: true,
        enableDevTools: env === 'development',
        logLevel: env === 'development' ? 'debug' : 'info',
        maxCacheSize: 100
      },
      features: {
        enableExperimentalFeatures: false,
        enableBetaFeatures: env === 'development',
        enableDebugMode: env === 'development'
      },
      routes: {} as MenuConfig, // 将在后续加载
      scraper: {
        requestTimeout: 15000,
        maxConcurrent: 2,
        maxRetries: 3,
        retryDelay: 500,
        batchSize: 3,
        batchDelay: 1500,
        cacheDuration: 24 * 60 * 60 * 1000 // 24小时
      },
      llm: {
        defaultTimeout: 30000,
        analysisTimeout: 120000,
        testConnectionTimeout: 15000,
        maxRetries: 2,
        retryDelay: 1000
      },
      history: {
        maxItems: 20,
        maxEventHistory: 100,
        maxSearchHistory: 10
      },
      logger: {
        maxLogs: 100,
        minLevel: env === 'development' ? 'debug' : 'info',
        batchSize: 10,
        batchTimeout: 5000
      },
      storage: {
        lruMaxSize: 4 * 1024 * 1024, // 4MB
        lruWarningThreshold: 0.8,
        lruCleanupRatio: 0.3,
        localStorageTotalSize: 5 * 1024 * 1024, // 5MB
        historyMaxItems: 50
      }
    };
  }

  /**
   * 获取环境特定配置
   */
  private getEnvConfig(env: Environment): Partial<AppConfig> {
    switch (env) {
      case 'development':
        return {
          api: {
            timeout: 60000,
            retryAttempts: 1
          },
          performance: {
            enableMonitoring: true,
            enableDevTools: true,
            logLevel: 'debug'
          },
          scraper: {
            requestTimeout: 30000,
            maxRetries: 1
          },
          llm: {
            defaultTimeout: 60000,
            analysisTimeout: 180000
          }
        } as Partial<AppConfig>;
        
      case 'production':
        return {
          api: {
            timeout: 30000,
            retryAttempts: 3
          },
          performance: {
            enableMonitoring: true,
            enableDevTools: false,
            logLevel: 'error'
          },
          scraper: {
            requestTimeout: 15000,
            maxRetries: 3
          },
          llm: {
            defaultTimeout: 30000,
            analysisTimeout: 120000
          }
        } as Partial<AppConfig>;
        
      case 'test':
        return {
          api: {
            timeout: 10000,
            retryAttempts: 0
          },
          performance: {
            enableMonitoring: false,
            enableDevTools: false,
            logLevel: 'warn'
          },
          scraper: {
            requestTimeout: 5000,
            maxRetries: 0
          },
          llm: {
            defaultTimeout: 5000,
            analysisTimeout: 10000
          }
        } as Partial<AppConfig>;
        
      default:
        return {};
    }
  }

  /**
   * 深度合并配置
   */
  private mergeConfig(base: AppConfig, override: Partial<AppConfig>): AppConfig {
    return {
      ...base,
      api: { ...base.api, ...override.api },
      performance: { ...base.performance, ...override.performance },
      features: { ...base.features, ...override.features },
      routes: override.routes || base.routes,
      scraper: { ...base.scraper, ...override.scraper },
      llm: { ...base.llm, ...override.llm },
      history: { ...base.history, ...override.history },
      logger: { ...base.logger, ...override.logger },
      storage: { ...base.storage, ...override.storage }
    };
  }

  /**
   * 获取完整配置
   */
  public getConfig(): Readonly<AppConfig> {
    return Object.freeze({ ...this.config });
  }

  /**
   * 获取指定路径的配置值
   * 实现 IConfigService.get
   */
  public get<T = unknown>(path: string, defaultValue?: T): T {
    const keys = path.split('.');
    let value: unknown = this.config;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = (value as Record<string, unknown>)[key];
      } else {
        return defaultValue as T;
      }
    }
    
    return (value !== undefined ? value : defaultValue) as T;
  }

  /**
   * 设置配置值（支持热更新）
   */
  public set(path: string, value: unknown): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    let target: Record<string, unknown> = this.config as unknown as Record<string, unknown>;
    
    // 导航到目标对象
    for (const key of keys) {
      if (!(key in target)) {
        target[key] = {};
      }
      target = target[key] as Record<string, unknown>;
    }
    
    // 保存旧值
    const oldValue = target[lastKey];
    
    // 设置新值
    target[lastKey] = value;

    // 触发监听器
    this.notifyListeners(path, value, oldValue);
  }

  /**
   * 监听配置变更
   */
  public watch(path: string, listener: ConfigChangeListener): () => void {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, new Set());
    }
    
    this.listeners.get(path)!.add(listener);
    
    // 返回取消监听函数
    return () => {
      const listeners = this.listeners.get(path);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.listeners.delete(path);
        }
      }
    };
  }

  /**
   * 通知监听器
   */
  private notifyListeners(path: string, newValue: unknown, oldValue: unknown): void {
    const listeners = this.listeners.get(path);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(path, newValue, oldValue);
        } catch (error) {
          // 静默失败，避免循环依赖
          console.error('[ConfigCenter] 配置监听器执行失败', { path, error });
        }
      });
    }
  }

  /**
   * 验证配置
   */
  public validate(): boolean {
    const isValid = validateConfig(this.config);
    // 移除日志调用，避免循环依赖
    return isValid;
  }

  /**
   * 重新加载配置
   */
  public reload(): void {
    this.config = this.loadConfig();
    // 移除日志调用，避免循环依赖
  }

  /**
   * 导出配置（用于调试）
   */
  public export(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * 便捷方法：判断是否为开发环境
   */
  public isDevelopment(): boolean {
    return this.config.environment === 'development';
  }

  /**
   * 便捷方法：判断是否为生产环境
   */
  public isProduction(): boolean {
    return this.config.environment === 'production';
  }

  /**
   * 便捷方法：判断是否为测试环境
   */
  public isTest(): boolean {
    return this.config.environment === 'test';
  }

  /**
   * 检查配置键是否存在
   * 实现 IConfigService.has
   */
  public has(path: string): boolean {
    const keys = path.split('.');
    let value: unknown = this.config;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = (value as Record<string, unknown>)[key];
      } else {
        return false;
      }
    }
    
    return value !== undefined;
  }

  /**
   * 获取所有配置
   * 实现 IConfigService.getAll
   */
  public getAll(): Record<string, unknown> {
    return { ...this.config };
  }

  /**
   * 重置配置到默认值
   * 实现 IConfigService.reset
   */
  public reset(): void {
    this.config = this.loadConfig();
    // 移除日志调用，避免循环依赖
  }
}

// ==================== 导出单例实例 ====================

/**
 * 配置中心单例实例
 */
export const configCenter = ConfigCenter.getInstance();

/**
 * 默认导出
 */
export default configCenter;

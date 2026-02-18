// src/common/config/ConfigCenter.ts
// ================================================================
// 🎯 统一配置管理中心
// 集中管理所有应用配置，支持环境差异化、验证和热更新
// ================================================================

import { Logger } from '../../services/loggerService';
import type { MenuConfig } from '../../types/config';
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
}

/**
 * 配置变更监听器
 */
export type ConfigChangeListener = (key: string, newValue: any, oldValue: any) => void;

// ==================== 配置中心类 ====================

/**
 * 配置中心单例类
 */
export class ConfigCenter {
  private static instance: ConfigCenter;
  private config: AppConfig;
  private listeners: Map<string, Set<ConfigChangeListener>>;
  private readonly logger = Logger;

  private constructor() {
    this.listeners = new Map();
    this.config = this.loadConfig();
    this.logger.info('配置中心已初始化', { environment: this.config.environment });
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
      routes: {} as MenuConfig // 将在后续加载
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
      routes: override.routes || base.routes
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
   */
  public get<T = any>(path: string): T | undefined {
    const keys = path.split('.');
    let value: any = this.config;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }
    
    return value as T;
  }

  /**
   * 设置配置值（支持热更新）
   */
  public set(path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    let target: any = this.config;
    
    // 导航到目标对象
    for (const key of keys) {
      if (!(key in target)) {
        target[key] = {};
      }
      target = target[key];
    }
    
    // 保存旧值
    const oldValue = target[lastKey];
    
    // 设置新值
    target[lastKey] = value;
    
    // 触发监听器
    this.notifyListeners(path, value, oldValue);
    
    this.logger.debug('配置已更新', { path, oldValue, newValue: value });
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
  private notifyListeners(path: string, newValue: any, oldValue: any): void {
    const listeners = this.listeners.get(path);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(path, newValue, oldValue);
        } catch (error) {
          this.logger.error('配置监听器执行失败', { path, error });
        }
      });
    }
  }

  /**
   * 验证配置
   */
  public validate(): boolean {
    const isValid = validateConfig(this.config);
    if (isValid) {
      this.logger.info('配置验证通过');
    } else {
      this.logger.error('配置验证失败');
    }
    return isValid;
  }

  /**
   * 重新加载配置
   */
  public reload(): void {
    const oldConfig = this.config;
    this.config = this.loadConfig();
    this.logger.info('配置已重新加载', { 
      oldEnv: oldConfig.environment, 
      newEnv: this.config.environment 
    });
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

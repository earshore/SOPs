// src/common/di/ServiceRegistry.ts
// ================================================================
// 服务注册中心
// 集中管理所有服务的注册配置，提供类型安全的服务解析
// ================================================================

import type { DIContainer, ServiceFactory, ServiceLifetime } from './Container';

/**
 * 服务名称常量
 * 使用常量避免字符串拼写错误
 */
export const SERVICE_NAMES = {
  // 基础服务（无依赖）
  CONFIG: 'config',
  STORAGE: 'storage',
  EVENT_BUS: 'eventBus',
  
  // 核心服务（依赖基础服务）
  LOGGER: 'logger',
  WORKING_STATE_MANAGER: 'workingStateManager',
  GLOBAL_ERROR_HANDLER: 'globalErrorHandler',
  
  // 应用服务（依赖核心服务）
  HTTP: 'http',
  ACTION_REGISTRY: 'actionRegistry',
  ROUTER: 'router',
  LOADING_MANAGER: 'loadingManager',
  
  // 业务服务
  LLM: 'llm',
  PERFORMANCE: 'performance',
  ANALYTICS: 'analytics',
  ERROR_TRACKER: 'errorTracker',
  MONITORING: 'monitoring',
  WEB_VITALS: 'webVitals',
  ALERT: 'alert',
  PERFORMANCE_STORAGE: 'performanceStorage',
} as const;

/**
 * 服务名称类型
 */
export type ServiceName = typeof SERVICE_NAMES[keyof typeof SERVICE_NAMES];

/**
 * 服务配置定义
 */
export interface ServiceConfig<T = any> {
  /** 服务名称 */
  name: ServiceName;
  /** 工厂函数 */
  factory: ServiceFactory<T>;
  /** 生命周期 */
  lifetime: ServiceLifetime;
  /** 依赖的服务名称列表 */
  dependencies: ServiceName[];
  /** 是否为可选服务 */
  optional?: boolean;
  /** 初始化超时时间（毫秒） */
  timeout?: number;
}

/**
 * 服务注册表
 * 集中管理所有服务的注册配置
 */
export class ServiceRegistry {
  private configs: Map<ServiceName, ServiceConfig> = new Map();

  /**
   * 注册服务配置
   */
  register<T = any>(config: ServiceConfig<T>): void {
    if (this.configs.has(config.name)) {
      console.warn(`[ServiceRegistry] 服务 "${config.name}" 已注册，将被覆盖`);
    }

    this.configs.set(config.name, config);
    console.log(`[ServiceRegistry] 已注册服务配置: ${config.name}`);
  }

  /**
   * 获取服务配置
   */
  getConfig(name: ServiceName): ServiceConfig | undefined {
    return this.configs.get(name);
  }

  /**
   * 获取所有服务配置
   */
  getAllConfigs(): ServiceConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * 检查服务是否已注册
   */
  has(name: ServiceName): boolean {
    return this.configs.has(name);
  }

  /**
   * 批量注册所有服务到DI容器
   */
  registerAll(container: DIContainer): void {
    console.log(`[ServiceRegistry] 开始批量注册 ${this.configs.size} 个服务到容器`);
    
    for (const config of this.configs.values()) {
      container.register(
        config.name,
        config.factory,
        {
          lifetime: config.lifetime,
          dependencies: config.dependencies
        }
      );
    }
    
    console.log(`[ServiceRegistry] 批量注册完成`);
  }

  /**
   * 获取服务数量
   */
  get size(): number {
    return this.configs.size;
  }

  /**
   * 清空所有注册（用于测试）
   */
  clear(): void {
    this.configs.clear();
    console.log(`[ServiceRegistry] 已清空所有服务配置`);
  }
}

// 创建全局注册表实例
export const serviceRegistry = new ServiceRegistry();

// 默认导出
export default serviceRegistry;

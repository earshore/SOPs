// src/common/di/services/coreServices.ts
// ================================================================
// 核心服务注册配置
// 定义基础服务和核心服务的注册配置
// ================================================================

import type { ServiceRegistry } from '../ServiceRegistry';
import { SERVICE_NAMES } from '../ServiceRegistry';
import type { IStorageService, IConfigService, ILoggerService } from '@/types/services';

import { Logger } from '../../../services/loggerService';
/**
 * 注册核心服务到注册表
 */
export function registerCoreServices(registry: ServiceRegistry): void {
  Logger.debug('[CoreServices] 开始注册核心服务配置');

  // ================================================================
  // Level 0: 基础服务（无依赖）
  // ================================================================

  // ConfigCenter - 配置中心
  registry.register({
    name: SERVICE_NAMES.CONFIG,
    factory: async () => {
      const { ConfigCenter } = await import('@/common/config/ConfigCenter');
      return ConfigCenter.getInstance();
    },
    lifetime: 'singleton',
    dependencies: []
  });

  // StorageService - 存储服务
  registry.register({
    name: SERVICE_NAMES.STORAGE,
    factory: async () => {
      const { createStorageService } = await import('@/services/storageService');
      return createStorageService();
    },
    lifetime: 'singleton',
    dependencies: []
  });

  // EventBus - 事件总线
  registry.register({
    name: SERVICE_NAMES.EVENT_BUS,
    factory: async () => {
      const eventBus = (await import('@/common/EventBus')).default;
      return eventBus;
    },
    lifetime: 'singleton',
    dependencies: []
  });

  // ================================================================
  // Level 1: 核心服务（依赖基础服务）
  // ================================================================

  // LoggerService - 日志服务
  registry.register({
    name: SERVICE_NAMES.LOGGER,
    factory: async (c) => {
      const { createLoggerService } = await import('@/services/loggerService');
      const storage = c.resolve<IStorageService>(SERVICE_NAMES.STORAGE);
      const config = c.resolve<IConfigService>(SERVICE_NAMES.CONFIG);
      return createLoggerService(storage, config);
    },
    lifetime: 'singleton',
    dependencies: [SERVICE_NAMES.STORAGE, SERVICE_NAMES.CONFIG]
  });

  // WorkingStateManager - 工作状态管理器
  registry.register({
    name: SERVICE_NAMES.WORKING_STATE_MANAGER,
    factory: async () => {
      const { workingStateManager } = await import('@/common/utils/WorkingStateManager');
      return workingStateManager;
    },
    lifetime: 'singleton',
    dependencies: []
  });

  // GlobalErrorHandler - 全局错误处理器
  registry.register({
    name: SERVICE_NAMES.GLOBAL_ERROR_HANDLER,
    factory: async () => {
      const { globalErrorHandler } = await import('@/common/errors/GlobalErrorHandler');
      return globalErrorHandler;
    },
    lifetime: 'singleton',
    dependencies: []
  });

  // ================================================================
  // Level 2: 应用服务（依赖核心服务）
  // ================================================================

  // HttpService - HTTP请求服务
  registry.register({
    name: SERVICE_NAMES.HTTP,
    factory: async (c) => {
      const { createHttpService } = await import('@/services/httpService');
      const logger = c.resolve<ILoggerService>(SERVICE_NAMES.LOGGER);
      const config = c.resolve<IConfigService>(SERVICE_NAMES.CONFIG);
      return createHttpService(logger, config);
    },
    lifetime: 'singleton',
    dependencies: [SERVICE_NAMES.LOGGER, SERVICE_NAMES.CONFIG]
  });

  // ActionRegistry - 动作注册中心
  registry.register({
    name: SERVICE_NAMES.ACTION_REGISTRY,
    factory: async () => {
      const { default: actionRegistry } = await import('@/common/utils/actionRegistry');
      return actionRegistry;
    },
    lifetime: 'singleton',
    dependencies: [SERVICE_NAMES.EVENT_BUS]
  });

  // Router - 路由器（Navigo 适配器）
  registry.register({
    name: SERVICE_NAMES.ROUTER,
    factory: async () => {
      const { initRouter } = await import('@/common/router/initRouter');
      return initRouter();
    },
    lifetime: 'singleton',
    dependencies: [SERVICE_NAMES.EVENT_BUS]
  });

  // LoadingManager - 加载管理器
  registry.register({
    name: SERVICE_NAMES.LOADING_MANAGER,
    factory: async () => {
      const { loadingManager } = await import('@/common/utils/LoadingManager');
      return loadingManager;
    },
    lifetime: 'singleton',
    dependencies: []
  });

  Logger.debug('[CoreServices] 核心服务配置注册完成');
}

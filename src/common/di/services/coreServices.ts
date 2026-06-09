// src/common/di/services/coreServices.ts
// ================================================================
// 核心服务注册配置
// 定义基础服务和核心服务的注册配置
// ================================================================

import type { ServiceRegistry } from '../ServiceRegistry';
import { SERVICE_NAMES } from '../ServiceRegistry';
import type { IStorageService, IConfigService, ILoggerService } from '@/types/services';

import { ConfigCenter } from '@/common/config/ConfigCenter';
import { createStorageService } from '@/services/storageService';
import eventBus from '@/common/EventBus';
import { globalErrorHandler } from '@/common/errors/GlobalErrorHandler';
import { loadingManager } from '@/common/utils/LoadingManager';
import actionRegistry from '@/common/utils/actionRegistry';
import { initRouter } from '@/common/router/initRouter';

function registerBaseServices(registry: ServiceRegistry): void {
  registry.register({
    name: SERVICE_NAMES.CONFIG,
    factory: async () => ConfigCenter.getInstance(),
    lifetime: 'singleton',
    dependencies: []
  });

  // StorageService - 存储服务
  registry.register({
    name: SERVICE_NAMES.STORAGE,
    factory: async () => {
      return createStorageService();
    },
    lifetime: 'singleton',
    dependencies: []
  });

  // EventBus - 事件总线
  registry.register({
    name: SERVICE_NAMES.EVENT_BUS,
    factory: async () => {
      return eventBus;
    },
    lifetime: 'singleton',
    dependencies: []
  });
}

function registerRuntimeServices(registry: ServiceRegistry): void {
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
      return globalErrorHandler;
    },
    lifetime: 'singleton',
    dependencies: []
  });
}

function registerApplicationServices(registry: ServiceRegistry): void {
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
      return actionRegistry;
    },
    lifetime: 'singleton',
    dependencies: [SERVICE_NAMES.EVENT_BUS]
  });

  // Router - 路由器（Navigo 适配器）
  registry.register({
    name: SERVICE_NAMES.ROUTER,
    factory: async () => {
      return initRouter();
    },
    lifetime: 'singleton',
    dependencies: [SERVICE_NAMES.EVENT_BUS]
  });

  // LoadingManager - 加载管理器
  registry.register({
    name: SERVICE_NAMES.LOADING_MANAGER,
    factory: async () => {
      return loadingManager;
    },
    lifetime: 'singleton',
    dependencies: []
  });
}

/**
 * 注册核心服务到注册表
 */
export function registerCoreServices(registry: ServiceRegistry): void {
  registerBaseServices(registry);
  registerRuntimeServices(registry);
  registerApplicationServices(registry);
}

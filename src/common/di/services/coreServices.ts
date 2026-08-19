// src/common/di/services/coreServices.ts
// ================================================================
// 核心服务注册配置
// 定义基础服务和核心服务的注册配置
// ================================================================

import { ConfigCenter } from '@/common/config/ConfigCenter';
import { globalErrorHandler } from '@/common/errors/GlobalErrorHandler';
import eventBus from '@/common/EventBus';
import { initRouter } from '@/common/router/initRouter';
import actionRegistry from '@/common/utils/actionRegistry';
import { loadingManager } from '@/common/utils/LoadingManager';
import { StorageService } from '@/services/storageService';

import { SERVICE_NAMES } from '../ServiceRegistry';

import type { ServiceRegistry } from '../ServiceRegistry';
import type { IConfigService, ILoggerService } from '@/types/services';

function registerBaseServices(registry: ServiceRegistry): void {
  registry.register({
    name: SERVICE_NAMES.CONFIG,
    factory: () => ConfigCenter.getInstance(),
    lifetime: 'singleton',
    dependencies: [],
  });

  // StorageService - 存储服务（与应用广泛使用的导出单例保持一致）
  registry.register({
    name: SERVICE_NAMES.STORAGE,
    factory: () => StorageService,
    lifetime: 'singleton',
    dependencies: [],
  });

  // EventBus - 事件总线
  registry.register({
    name: SERVICE_NAMES.EVENT_BUS,
    factory: () => {
      return eventBus;
    },
    lifetime: 'singleton',
    dependencies: [],
  });
}

function registerRuntimeServices(registry: ServiceRegistry): void {
  registry.register({
    name: SERVICE_NAMES.LOGGER,
    // 动态导入：基础服务注册层不静态依赖 Logger（避免循环依赖 lint 门禁）
    factory: async () => {
      const { Logger } = await import('@/services/loggerService');
      return Logger;
    },
    lifetime: 'singleton',
    dependencies: [],
    async: true,
  });

  // WorkingStateManager - 工作状态管理器
  registry.register({
    name: SERVICE_NAMES.WORKING_STATE_MANAGER,
    factory: async () => {
      const { workingStateManager } = await import('@/common/utils/WorkingStateManager');
      return workingStateManager;
    },
    lifetime: 'singleton',
    dependencies: [],
    async: true,
  });

  // GlobalErrorHandler - 全局错误处理器
  registry.register({
    name: SERVICE_NAMES.GLOBAL_ERROR_HANDLER,
    factory: () => {
      return globalErrorHandler;
    },
    lifetime: 'singleton',
    dependencies: [],
  });
}

function registerApplicationServices(registry: ServiceRegistry): void {
  registry.register({
    name: SERVICE_NAMES.HTTP,
    factory: async c => {
      const { createHttpService } = await import('@/services/httpService');
      const logger = await c.resolveAsync<ILoggerService>(SERVICE_NAMES.LOGGER);
      const config = c.resolve<IConfigService>(SERVICE_NAMES.CONFIG);
      return createHttpService(logger, config);
    },
    lifetime: 'singleton',
    dependencies: [SERVICE_NAMES.LOGGER, SERVICE_NAMES.CONFIG],
    async: true,
  });

  // ActionRegistry - 动作注册中心
  registry.register({
    name: SERVICE_NAMES.ACTION_REGISTRY,
    factory: () => {
      return actionRegistry;
    },
    lifetime: 'singleton',
    dependencies: [SERVICE_NAMES.EVENT_BUS],
  });

  // Router - 路由器（Navigo 适配器）
  registry.register({
    name: SERVICE_NAMES.ROUTER,
    factory: () => {
      return initRouter();
    },
    lifetime: 'singleton',
    dependencies: [SERVICE_NAMES.EVENT_BUS],
  });

  // LoadingManager - 加载管理器
  registry.register({
    name: SERVICE_NAMES.LOADING_MANAGER,
    factory: () => {
      return loadingManager;
    },
    lifetime: 'singleton',
    dependencies: [],
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

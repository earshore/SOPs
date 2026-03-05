// src/common/di/services/businessServices.ts
// ================================================================
// 业务服务注册配置
// 定义业务相关服务的注册配置
// ================================================================

import type { ServiceRegistry } from '../ServiceRegistry';
import { SERVICE_NAMES } from '../ServiceRegistry';
import type { ILoggerService } from '@/types/services';

import { Logger } from '../../../services/loggerService';
import { analyticsService } from '@/services/analyticsService';
import { createErrorTracker } from '@/services/errorTracker';
import { createAlertService } from '@/services/alertService';
import { createPerformanceStorage } from '@/services/performanceStorage';
/**
 * 注册业务服务到注册表
 */
export function registerBusinessServices(registry: ServiceRegistry): void {
  Logger.debug('[BusinessServices] 开始注册业务服务配置');

  // ================================================================
  // Level 3: 业务服务（依赖应用服务）
  // ================================================================

  // PerformanceService - 性能监控服务
  registry.register({
    name: SERVICE_NAMES.PERFORMANCE,
    factory: async (c) => {
      const { createPerformanceService } = await import('@/services/performanceService');
      const logger = c.resolve<ILoggerService>(SERVICE_NAMES.LOGGER);
      return createPerformanceService(logger);
    },
    lifetime: 'singleton',
    dependencies: [SERVICE_NAMES.LOGGER],
    optional: true
  });

  // AnalyticsService - 用户行为分析服务
  registry.register({
    name: SERVICE_NAMES.ANALYTICS,
    factory: async () => {
      return analyticsService;
    },
    lifetime: 'singleton',
    dependencies: [SERVICE_NAMES.LOGGER, SERVICE_NAMES.STORAGE],
    optional: true
  });

  // ErrorTracker - 错误追踪服务
  registry.register({
    name: SERVICE_NAMES.ERROR_TRACKER,
    factory: async (c) => {
      const logger = c.resolve<ILoggerService>(SERVICE_NAMES.LOGGER);
      return createErrorTracker(logger);
    },
    lifetime: 'singleton',
    dependencies: [SERVICE_NAMES.LOGGER],
    optional: true
  });

  // MonitoringService - 监控服务
  registry.register({
    name: SERVICE_NAMES.MONITORING,
    factory: async (c) => {
      const { createMonitoringService } = await import('@/services/monitoringService');
      const logger = c.resolve<ILoggerService>(SERVICE_NAMES.LOGGER);
      return createMonitoringService(logger);
    },
    lifetime: 'singleton',
    dependencies: [SERVICE_NAMES.LOGGER],
    optional: true
  });

  // WebVitalsService - Web性能指标服务
  registry.register({
    name: SERVICE_NAMES.WEB_VITALS,
    factory: async () => {
      const { createWebVitalsService } = await import('@/services/webVitalsService');
      return createWebVitalsService();
    },
    lifetime: 'singleton',
    dependencies: [],
    optional: true
  });

  // AlertService - 告警服务
  registry.register({
    name: SERVICE_NAMES.ALERT,
    factory: async (c) => {
      const logger = c.resolve<ILoggerService>(SERVICE_NAMES.LOGGER);
      return createAlertService(logger);
    },
    lifetime: 'singleton',
    dependencies: [SERVICE_NAMES.LOGGER],
    optional: true
  });

  // PerformanceStorage - 性能数据存储
  registry.register({
    name: SERVICE_NAMES.PERFORMANCE_STORAGE,
    factory: async (c) => {
      const logger = c.resolve<ILoggerService>(SERVICE_NAMES.LOGGER);
      return createPerformanceStorage(logger);
    },
    lifetime: 'singleton',
    dependencies: [SERVICE_NAMES.LOGGER],
    optional: true
  });

  Logger.debug('[BusinessServices] 业务服务配置注册完成');
}

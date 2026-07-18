// src/common/di/services/businessServices.ts
// ================================================================
// 业务服务注册配置
// 定义业务相关服务的注册配置
// ================================================================

import type { ServiceRegistry } from '../ServiceRegistry';
import { SERVICE_NAMES } from '../ServiceRegistry';
import type { ILoggerService } from '@/types/services';

import { analyticsService } from '@/services/analyticsService';
import { errorTracker } from '@/services/errorTracker';
import { alertService } from '@/services/alertService';
import { performanceStorage } from '@/services/performanceStorage';
/**
 * 注册业务服务到注册表
 */
export function registerBusinessServices(registry: ServiceRegistry): void {
  // ================================================================
  // Level 3: 业务服务（依赖应用服务）
  // ================================================================

  // PerformanceService - 性能监控服务
  registry.register({
    name: SERVICE_NAMES.PERFORMANCE,
    factory: async c => {
      const { performanceService } = await import('@/services/performanceService');
      const logger = await c.resolveAsync<ILoggerService>(SERVICE_NAMES.LOGGER);
      performanceService.setLogger(logger);
      return performanceService;
    },
    lifetime: 'singleton',
    dependencies: [SERVICE_NAMES.LOGGER],
    async: true,
    optional: true,
  });

  // AnalyticsService - 用户行为分析服务
  registry.register({
    name: SERVICE_NAMES.ANALYTICS,
    factory: async c => {
      const logger = await c.resolveAsync<ILoggerService>(SERVICE_NAMES.LOGGER);
      analyticsService.setLogger(logger);
      return analyticsService;
    },
    lifetime: 'singleton',
    dependencies: [SERVICE_NAMES.LOGGER, SERVICE_NAMES.STORAGE],
    async: true,
    optional: true,
  });

  // ErrorTracker - 错误追踪服务
  registry.register({
    name: SERVICE_NAMES.ERROR_TRACKER,
    factory: async c => {
      const logger = await c.resolveAsync<ILoggerService>(SERVICE_NAMES.LOGGER);
      errorTracker.setLogger(logger);
      return errorTracker;
    },
    lifetime: 'singleton',
    dependencies: [SERVICE_NAMES.LOGGER],
    async: true,
    optional: true,
  });

  // MonitoringService - 监控服务
  registry.register({
    name: SERVICE_NAMES.MONITORING,
    factory: async c => {
      const { monitoringService } = await import('@/services/monitoringService');
      const logger = await c.resolveAsync<ILoggerService>(SERVICE_NAMES.LOGGER);
      monitoringService.setLogger(logger);
      return monitoringService;
    },
    lifetime: 'singleton',
    dependencies: [SERVICE_NAMES.LOGGER],
    async: true,
    optional: true,
  });

  // WebVitalsService - Web性能指标服务
  registry.register({
    name: SERVICE_NAMES.WEB_VITALS,
    factory: async () => {
      const { webVitalsService } = await import('@/services/webVitalsService');
      return webVitalsService;
    },
    lifetime: 'singleton',
    dependencies: [],
    async: true,
    optional: true,
  });

  // AlertService - 告警服务
  registry.register({
    name: SERVICE_NAMES.ALERT,
    factory: async c => {
      const logger = await c.resolveAsync<ILoggerService>(SERVICE_NAMES.LOGGER);
      alertService.setLogger(logger);
      return alertService;
    },
    lifetime: 'singleton',
    dependencies: [SERVICE_NAMES.LOGGER],
    async: true,
    optional: true,
  });

  // PerformanceStorage - 性能数据存储
  registry.register({
    name: SERVICE_NAMES.PERFORMANCE_STORAGE,
    factory: async c => {
      const logger = await c.resolveAsync<ILoggerService>(SERVICE_NAMES.LOGGER);
      performanceStorage.setLogger(logger);
      return performanceStorage;
    },
    lifetime: 'singleton',
    dependencies: [SERVICE_NAMES.LOGGER],
    async: true,
    optional: true,
  });
}

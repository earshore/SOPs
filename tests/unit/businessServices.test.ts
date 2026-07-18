import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DIContainer } from '@/common/di/Container';
import {
  SERVICE_NAMES,
  type ServiceConfig,
  type ServiceRegistry,
} from '@/common/di/ServiceRegistry';
import { registerBusinessServices } from '@/common/di/services/businessServices';
import type { ILoggerService } from '@/types/services';
import { performanceService } from '@/services/performanceService';
import { analyticsService } from '@/services/analyticsService';
import { errorTracker } from '@/services/errorTracker';
import { monitoringService } from '@/services/monitoringService';
import { webVitalsService } from '@/services/webVitalsService';
import { alertService } from '@/services/alertService';
import { performanceStorage } from '@/services/performanceStorage';

function collectConfigs(): ServiceConfig[] {
  const configs: ServiceConfig[] = [];
  const registry = {
    register: (config: ServiceConfig) => configs.push(config),
  } as unknown as ServiceRegistry;

  registerBusinessServices(registry);
  return configs;
}

function createLogger(): ILoggerService {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    getLogs: vi.fn(() => []),
    getErrors: vi.fn(() => []),
    clear: vi.fn(),
    download: vi.fn(),
  };
}

type LoggerBackedSingleton = {
  logger: ILoggerService | null;
  setLogger(logger: ILoggerService): void;
};

describe('registerBusinessServices', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    [SERVICE_NAMES.PERFORMANCE, performanceService],
    [SERVICE_NAMES.ANALYTICS, analyticsService],
    [SERVICE_NAMES.ERROR_TRACKER, errorTracker],
    [SERVICE_NAMES.MONITORING, monitoringService],
    [SERVICE_NAMES.ALERT, alertService],
    [SERVICE_NAMES.PERFORMANCE_STORAGE, performanceStorage],
  ])('injects the resolved logger into the legacy %s singleton', async (serviceName, singleton) => {
    const config = collectConfigs().find(candidate => candidate.name === serviceName);
    const logger = createLogger();
    const resolveAsync = vi.fn().mockResolvedValue(logger);
    const container = {
      resolveAsync,
    } as unknown as DIContainer;
    const loggerBacked = singleton as unknown as LoggerBackedSingleton;
    const previousLogger = loggerBacked.logger;
    const setLogger = vi.spyOn(loggerBacked, 'setLogger');

    try {
      expect(config).toBeDefined();
      expect(config?.async).toBe(true);
      expect(await config?.factory(container)).toBe(singleton);
      expect(resolveAsync).toHaveBeenCalledTimes(1);
      expect(resolveAsync).toHaveBeenCalledWith(SERVICE_NAMES.LOGGER);
      expect(setLogger).toHaveBeenCalledTimes(1);
      expect(setLogger).toHaveBeenCalledWith(logger);
      expect(loggerBacked.logger).toBe(logger);
    } finally {
      loggerBacked.logger = previousLogger;
      setLogger.mockRestore();
    }
  });

  it('returns the WebVitals singleton without resolving a logger', async () => {
    const config = collectConfigs().find(candidate => candidate.name === SERVICE_NAMES.WEB_VITALS);
    const resolveAsync = vi.fn().mockResolvedValue(createLogger());
    const container = {
      resolveAsync,
    } as unknown as DIContainer;

    expect(config).toBeDefined();
    expect(await config?.factory(container)).toBe(webVitalsService);
    expect(resolveAsync).not.toHaveBeenCalled();
  });
});

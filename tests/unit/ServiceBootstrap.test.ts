import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ServiceBootstrap } from '@/common/bootstrap/ServiceBootstrap';
import type { DIContainer } from '@/common/di/Container';
import type { ServiceName, ServiceRegistry } from '@/common/di/ServiceRegistry';
import { SystemError } from '@/common/errors/AppError';

const mocks = vi.hoisted(() => ({
  errorTracker: {
    init: vi.fn(),
    getStats: vi.fn(() => ({ total: 0 })),
  },
  analyticsService: {
    init: vi.fn(),
  },
  performanceStorage: {
    init: vi.fn(() => new Promise<void>(() => {})),
    save: vi.fn(),
  },
  alertService: {
    init: vi.fn(),
    check: vi.fn(),
  },
  webVitalsService: {
    onMetric: vi.fn(),
  },
}));

vi.mock('@/services/errorTracker', () => ({
  errorTracker: mocks.errorTracker,
}));

vi.mock('@/services/analyticsService', () => ({
  analyticsService: mocks.analyticsService,
}));

vi.mock('@/services/performanceStorage', () => ({
  performanceStorage: mocks.performanceStorage,
}));

vi.mock('@/services/alertService', () => ({
  alertService: mocks.alertService,
  AlertType: {
    ERROR_RATE: 'ERROR_RATE',
    MEMORY_LEAK: 'MEMORY_LEAK',
    PERFORMANCE: 'PERFORMANCE',
  },
}));

vi.mock('@/services/webVitalsService', () => ({
  webVitalsService: mocks.webVitalsService,
}));

type TestServiceConfig = {
  name: string;
  dependencies: string[];
  optional?: boolean;
  timeout?: number;
};

function registry(configs: TestServiceConfig[]): ServiceRegistry {
  return {
    getConfig: vi.fn((name: ServiceName) => configs.find(config => config.name === name)),
    getAllConfigs: vi.fn(() => configs),
  } as unknown as ServiceRegistry;
}

function container(
  options: {
    resolve?: (name: string) => unknown | Promise<unknown>;
    validationErrors?: string[];
  } = {}
): DIContainer {
  return {
    validateDependencies: vi.fn(() => {
      const errors = options.validationErrors || [];
      return {
        valid: errors.length === 0,
        errors,
      };
    }),
    resolve: vi.fn((name: string) => options.resolve?.(name) ?? { name }),
    resolveAsync: vi.fn(async (name: string) => options.resolve?.(name) ?? { name }),
  } as unknown as DIContainer;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it('initializes services by dependency level and starts monitoring services', async () => {
  const calls: string[] = [];
  const di = container({
    resolve: async name => {
      calls.push(name);
      return { name };
    },
  });
  const serviceRegistry = registry([
    { name: 'logger', dependencies: [] },
    { name: 'storage', dependencies: ['logger'] },
    { name: 'analytics', dependencies: ['logger'] },
    { name: 'feature', dependencies: ['storage', 'analytics'] },
  ]);
  const bootstrap = new ServiceBootstrap(di, serviceRegistry);

  const result = await bootstrap.initialize();

  expect(result).toEqual({
    success: true,
    failed: [],
    optionalFailed: [],
    initialized: expect.arrayContaining(['logger', 'storage', 'analytics', 'feature']),
    warnings: [],
  });
  expect(calls.indexOf('logger')).toBeLessThan(calls.indexOf('storage'));
  expect(calls.indexOf('logger')).toBeLessThan(calls.indexOf('analytics'));
  expect(calls.indexOf('storage')).toBeLessThan(calls.indexOf('feature'));
  expect(calls.indexOf('analytics')).toBeLessThan(calls.indexOf('feature'));
  expect(mocks.errorTracker.init).toHaveBeenCalledWith({
    enabled: true,
    sampleRate: 1,
  });
  expect(mocks.analyticsService.init).toHaveBeenCalledWith({
    enabled: true,
    trackPageViews: true,
    trackUserActions: true,
  });
  expect(mocks.performanceStorage.init).toHaveBeenCalledWith({
    retentionDays: 7,
    maxRecords: 10000,
  });
  expect(bootstrap.isInitialized('feature')).toBe(true);
  expect(bootstrap.getInitializedServices()).toEqual(
    expect.arrayContaining(['logger', 'storage', 'analytics', 'feature'])
  );
});

it('throws when dependency validation fails', async () => {
  const bootstrap = new ServiceBootstrap(
    container({ validationErrors: ['storage depends on missing logger'] }),
    registry([])
  );

  await expect(bootstrap.initialize()).rejects.toMatchObject({
    code: 'BOOTSTRAP_DEPENDENCY_VALIDATION_FAILED',
  });
  expect(console.error).toHaveBeenCalledWith('❌ [Bootstrap] 依赖验证失败:');
  expect(console.error).toHaveBeenCalledWith('  - storage depends on missing logger');
});

it('records required service failures and keeps optional failures non-fatal', async () => {
  const optionalFailure = new ServiceBootstrap(
    container({
      resolve: async name => {
        if (name === 'optional-service') throw new Error('optional failed');
        return { name };
      },
    }),
    registry([
      { name: 'core', dependencies: [] },
      { name: 'optional-service', dependencies: [], optional: true },
    ])
  );

  await expect(optionalFailure.initialize()).resolves.toMatchObject({
    success: true,
    failed: [],
    optionalFailed: [
      expect.objectContaining({
        name: 'optional-service',
        error: 'optional failed',
      }),
    ],
    initialized: ['core'],
    warnings: [
      expect.objectContaining({
        scope: 'optional-service',
        serviceName: 'optional-service',
        message: 'optional failed',
      }),
    ],
  });

  const requiredFailure = new ServiceBootstrap(
    container({
      resolve: async () => {
        throw new Error('required failed');
      },
    }),
    registry([{ name: 'core', dependencies: [] }])
  );

  await expect(requiredFailure.initialize()).rejects.toThrow('required failed');
});

it('rejects service initialization on timeout', async () => {
  vi.useFakeTimers();
  const bootstrap = new ServiceBootstrap(
    container({
      resolve: () => new Promise(() => {}),
    }),
    registry([{ name: 'slow-service', dependencies: [], timeout: 10 }])
  );
  const errorPromise = bootstrap.initialize().catch(error => error);

  await vi.advanceTimersByTimeAsync(10);
  const error = await errorPromise;

  expect(error).toBeInstanceOf(SystemError);
  expect(error).toMatchObject({
    code: 'BOOTSTRAP_SERVICE_TIMEOUT',
    context: expect.objectContaining({
      serviceName: 'slow-service',
      timeout: 10,
    }),
  });
});

it('resets initialized and failed service state', async () => {
  const bootstrap = new ServiceBootstrap(
    container(),
    registry([{ name: 'core', dependencies: [] }])
  );

  await bootstrap.initialize();
  expect(bootstrap.getInitializedServices()).toEqual(['core']);

  bootstrap.reset();
  expect(bootstrap.getInitializedServices()).toEqual([]);
  expect(bootstrap.isInitialized('core')).toBe(false);
});

it('records monitoring initialization failures without failing required services', async () => {
  mocks.performanceStorage.init.mockRejectedValueOnce(new Error('IndexedDB unavailable'));
  const bootstrap = new ServiceBootstrap(
    container(),
    registry([{ name: 'core', dependencies: [] }])
  );

  const result = await bootstrap.initialize();
  await bootstrap.whenMonitoringReady();

  expect(result.success).toBe(true);
  expect(bootstrap.getMonitoringStatus()).toEqual({
    state: 'failed',
    warnings: [
      expect.objectContaining({
        scope: 'monitoring',
        message: 'IndexedDB unavailable',
      }),
    ],
  });
  expect(console.warn).toHaveBeenCalledWith('⚠️ [Bootstrap] monitoring: IndexedDB unavailable');
});

it('clears monitoring intervals on destroy', async () => {
  vi.useFakeTimers();
  mocks.performanceStorage.init.mockResolvedValueOnce();
  const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
  const bootstrap = new ServiceBootstrap(
    container(),
    registry([{ name: 'core', dependencies: [] }])
  );

  await bootstrap.initialize();
  await bootstrap.whenMonitoringReady();

  expect(mocks.webVitalsService.onMetric).toHaveBeenCalled();

  bootstrap.destroy();

  expect(clearIntervalSpy).toHaveBeenCalled();
  expect(bootstrap.getMonitoringStatus()).toEqual({
    state: 'idle',
    warnings: [],
  });
});

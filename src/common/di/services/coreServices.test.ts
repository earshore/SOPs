import { describe, expect, it, vi } from 'vitest';
import { SERVICE_NAMES, type ServiceRegistry } from '../ServiceRegistry';
import { registerCoreServices } from './coreServices';

const mocks = vi.hoisted(() => ({
  configCenter: { id: 'config-center' },
  storageService: { id: 'storage-service' },
  eventBus: { id: 'event-bus' },
  globalErrorHandler: { id: 'global-error-handler' },
  loadingManager: { id: 'loading-manager' },
  actionRegistry: { id: 'action-registry' },
  router: { id: 'router' },
  workingStateManager: { id: 'working-state-manager' },
  loggerService: { id: 'logger-service' },
  httpService: { id: 'http-service' },
  createStorageService: vi.fn(),
  createLoggerService: vi.fn(),
  createHttpService: vi.fn(),
  initRouter: vi.fn(),
}));

vi.mock('@/common/config/ConfigCenter', () => ({
  ConfigCenter: {
    getInstance: () => mocks.configCenter,
  },
}));

vi.mock('@/services/storageService', () => ({
  createStorageService: mocks.createStorageService,
}));

vi.mock('@/common/EventBus', () => ({
  default: mocks.eventBus,
}));

vi.mock('@/common/errors/GlobalErrorHandler', () => ({
  globalErrorHandler: mocks.globalErrorHandler,
}));

vi.mock('@/common/utils/LoadingManager', () => ({
  loadingManager: mocks.loadingManager,
}));

vi.mock('@/common/utils/actionRegistry', () => ({
  default: mocks.actionRegistry,
}));

vi.mock('@/common/router/initRouter', () => ({
  initRouter: mocks.initRouter,
}));

vi.mock('@/common/utils/WorkingStateManager', () => ({
  workingStateManager: mocks.workingStateManager,
}));

vi.mock('@/services/loggerService', () => ({
  createLoggerService: mocks.createLoggerService,
}));

vi.mock('@/services/httpService', () => ({
  createHttpService: mocks.createHttpService,
}));

type RegisteredConfig = {
  name: string;
  dependencies: string[];
  lifetime: string;
  factory: (container: { resolve: <T>(name: string) => T }) => Promise<unknown>;
};

function createRegistry(): {
  registry: ServiceRegistry;
  configs: RegisteredConfig[];
} {
  const configs: RegisteredConfig[] = [];
  return {
    configs,
    registry: {
      register: vi.fn((config: RegisteredConfig) => {
        configs.push(config);
      }),
    } as unknown as ServiceRegistry,
  };
}

describe('registerCoreServices', () => {
  it('registers base, runtime, and application services with expected dependencies', () => {
    const { registry, configs } = createRegistry();

    registerCoreServices(registry);

    expect(configs.map(config => config.name)).toEqual([
      SERVICE_NAMES.CONFIG,
      SERVICE_NAMES.STORAGE,
      SERVICE_NAMES.EVENT_BUS,
      SERVICE_NAMES.LOGGER,
      SERVICE_NAMES.WORKING_STATE_MANAGER,
      SERVICE_NAMES.GLOBAL_ERROR_HANDLER,
      SERVICE_NAMES.HTTP,
      SERVICE_NAMES.ACTION_REGISTRY,
      SERVICE_NAMES.ROUTER,
      SERVICE_NAMES.LOADING_MANAGER,
    ]);
    expect(configs.find(config => config.name === SERVICE_NAMES.LOGGER)?.dependencies).toEqual([
      SERVICE_NAMES.STORAGE,
      SERVICE_NAMES.CONFIG,
    ]);
    expect(configs.find(config => config.name === SERVICE_NAMES.HTTP)?.dependencies).toEqual([
      SERVICE_NAMES.LOGGER,
      SERVICE_NAMES.CONFIG,
    ]);
  });

  it('resolves registered factories through the configured service graph', async () => {
    const { registry, configs } = createRegistry();
    const resolved = new Map<string, unknown>([
      [SERVICE_NAMES.STORAGE, mocks.storageService],
      [SERVICE_NAMES.CONFIG, mocks.configCenter],
      [SERVICE_NAMES.LOGGER, mocks.loggerService],
    ]);
    const resolve = vi.fn((name: string) => resolved.get(name)) as unknown as <T>(
      name: string
    ) => T;
    const container: { resolve: <T>(name: string) => T } = {
      resolve,
    };
    mocks.createStorageService.mockReturnValue(mocks.storageService);
    mocks.createLoggerService.mockReturnValue(mocks.loggerService);
    mocks.createHttpService.mockReturnValue(mocks.httpService);
    mocks.initRouter.mockReturnValue(mocks.router);

    registerCoreServices(registry);

    await expect(configs[0]?.factory(container)).resolves.toBe(mocks.configCenter);
    await expect(configs[1]?.factory(container)).resolves.toBe(mocks.storageService);
    await expect(configs[2]?.factory(container)).resolves.toBe(mocks.eventBus);
    await expect(configs[3]?.factory(container)).resolves.toBe(mocks.loggerService);
    await expect(configs[4]?.factory(container)).resolves.toBe(mocks.workingStateManager);
    await expect(configs[5]?.factory(container)).resolves.toBe(mocks.globalErrorHandler);
    await expect(configs[6]?.factory(container)).resolves.toBe(mocks.httpService);
    await expect(configs[7]?.factory(container)).resolves.toBe(mocks.actionRegistry);
    await expect(configs[8]?.factory(container)).resolves.toBe(mocks.router);
    await expect(configs[9]?.factory(container)).resolves.toBe(mocks.loadingManager);

    expect(mocks.createLoggerService).toHaveBeenCalledWith(
      mocks.storageService,
      mocks.configCenter
    );
    expect(mocks.createHttpService).toHaveBeenCalledWith(mocks.loggerService, mocks.configCenter);
    expect(mocks.initRouter).toHaveBeenCalledTimes(1);
  });
});

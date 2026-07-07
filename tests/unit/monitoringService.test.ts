import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { configCenter } from '@/common/config/ConfigCenter';
import { MonitoringService, createMonitoringService } from '@/services/monitoringService';

vi.mock('@/common/config/ConfigCenter', () => ({
  configCenter: {
    isProduction: vi.fn(),
    get: vi.fn(),
  },
}));

function createLogger() {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

function createSentryMock() {
  return {
    init: vi.fn(),
    captureException: vi.fn(),
    captureMessage: vi.fn(),
    setUser: vi.fn(),
    setTag: vi.fn(),
    setContext: vi.fn(),
    addBreadcrumb: vi.fn(),
    startTransaction: vi.fn(() => ({ finish: vi.fn(), setStatus: vi.fn() })),
    BrowserTracing: vi.fn(function BrowserTracing() {
      return { name: 'BrowserTracing' };
    }),
  };
}

let logger: ReturnType<typeof createLogger>;

beforeEach(() => {
  logger = createLogger();
  vi.mocked(configCenter.isProduction).mockReturnValue(false);
  vi.mocked(configCenter.get).mockReturnValue('test');
});

afterEach(() => {
  vi.restoreAllMocks();
});

it('skips initialization outside production unless forced', async () => {
  const service = new MonitoringService(logger);

  await service.init({ dsn: 'https://dsn.example' });

  expect(logger.info).toHaveBeenCalledWith('开发环境，跳过监控服务初始化', {}, 'Monitoring');
});

it('does not initialize when DSN is missing', async () => {
  const service = new MonitoringService(logger);

  await service.init({ forceEnable: true });

  expect(logger.warn).toHaveBeenCalledWith('未配置Sentry DSN，监控服务未启用', {}, 'Monitoring');
});

it('initializes Sentry and sanitizes events through beforeSend', async () => {
  const service = new MonitoringService(logger);
  const Sentry = createSentryMock();
  vi.spyOn(
    service as unknown as { loadSentry: () => Promise<typeof Sentry> },
    'loadSentry'
  ).mockResolvedValue(Sentry);

  await service.init({
    dsn: 'https://dsn.example',
    environment: 'production',
    release: '2.0.0',
    forceEnable: true,
  });

  expect(Sentry.init).toHaveBeenCalledWith(
    expect.objectContaining({
      dsn: 'https://dsn.example',
      environment: 'production',
      release: '2.0.0',
      tracesSampleRate: 0.1,
      beforeSend: expect.any(Function),
    })
  );

  const beforeSend = Sentry.init.mock.calls[0][0].beforeSend;
  const event = beforeSend(
    {
      request: {
        cookies: { session: 'secret' },
        headers: { Authorization: 'Bearer secret', keep: 'ok' },
      },
      contexts: {
        state: { llm: { apiKey: 'secret', model: 'gpt-test' } },
      },
    },
    {}
  );

  expect(event.request.cookies).toBeUndefined();
  expect(event.request.headers.Authorization).toBeUndefined();
  expect(event.request.headers.keep).toBe('ok');
  expect(event.contexts.state.llm.apiKey).toBeUndefined();
  expect(event.contexts.app).toMatchObject({
    version: '2.0.0',
    environment: 'production',
  });
});

it('rejects when the local Sentry SDK cannot initialize', async () => {
  const service = new MonitoringService(logger);
  vi.spyOn(
    service as unknown as { loadSentry: () => Promise<unknown> },
    'loadSentry'
  ).mockRejectedValue(new Error('chunk load failed'));

  await expect(service.init({ dsn: 'https://dsn.example', forceEnable: true })).rejects.toThrow(
    'chunk load failed'
  );
  expect(logger.error).toHaveBeenCalledWith(
    '监控服务初始化失败',
    { error: 'chunk load failed' },
    'Monitoring'
  );
});

it('captures exceptions, messages, context, breadcrumbs, and transactions after initialization', async () => {
  const service = new MonitoringService(logger);
  const Sentry = createSentryMock();
  vi.spyOn(
    service as unknown as { loadSentry: () => Promise<typeof Sentry> },
    'loadSentry'
  ).mockResolvedValue(Sentry);

  await service.init({ dsn: 'https://dsn.example', forceEnable: true });
  const error = new Error('broken');
  service.captureException(error, {
    module: 'Orders',
    tags: { area: 'checkout' },
    extra: { id: 1 },
  });
  service.captureMessage('hello', 'warning', { tags: { area: 'checkout' }, extra: { id: 2 } });
  service.setUser({ id: 'u1', username: 'tester', token: 'secret' });
  service.setTag('release', 'test');
  service.setContext('cart', { items: 2 });
  service.addBreadcrumb({ message: 'clicked' });
  const transaction = service.startTransaction('checkout');

  expect(Sentry.captureException).toHaveBeenCalledWith(error, {
    tags: { area: 'checkout' },
    extra: { id: 1 },
    level: 'error',
  });
  expect(Sentry.captureMessage).toHaveBeenCalledWith('hello', {
    level: 'warning',
    tags: { area: 'checkout' },
    extra: { id: 2 },
  });
  expect(Sentry.setUser).toHaveBeenCalledWith({ id: 'u1', username: 'tester' });
  expect(Sentry.setTag).toHaveBeenCalledWith('release', 'test');
  expect(Sentry.setContext).toHaveBeenCalledWith('cart', { items: 2 });
  expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({ message: 'clicked' });
  expect(transaction).toEqual(expect.objectContaining({ finish: expect.any(Function) }));
});

it('logs captured data when monitoring is not initialized', () => {
  const service = new MonitoringService(logger);

  service.captureException(new Error('offline'), { module: 'Offline' });
  service.captureMessage('note');

  expect(logger.error).toHaveBeenCalledWith(
    '捕获异常（监控服务未启用）',
    {
      error: 'offline',
      module: 'Offline',
    },
    'Monitoring'
  );
  expect(logger.info).toHaveBeenCalledWith('捕获消息（监控服务未启用）: note', {}, 'Monitoring');
  expect(service.startTransaction('noop')).toBeNull();
});

it('creates independent instances through the factory', () => {
  expect(createMonitoringService(logger)).toBeInstanceOf(MonitoringService);
});

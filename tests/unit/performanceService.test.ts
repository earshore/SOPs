import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  METRIC_TYPES,
  PerformanceService,
  createPerformanceService,
} from '@/services/performanceService';
import { StorageService } from '@/services/storageService';

vi.mock('@/services/storageService', () => ({
  StorageService: {
    set: vi.fn(),
  },
}));

  let service: PerformanceService;

  beforeEach(() => {
    service = new PerformanceService();
    vi.spyOn(Date, 'now').mockReturnValue(1000);
    vi.spyOn(performance, 'now')
      .mockReturnValueOnce(10)
      .mockReturnValueOnce(42)
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(150)
      .mockReturnValue(200);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(StorageService.set).mockClear();
  });

  afterEach(() => {
    service.destroy();
    vi.restoreAllMocks();
  });

  it('records metrics with URL metadata and groups them in reports', async () => {
    service.recordMetric(METRIC_TYPES.PAGE_LOAD, 1200, { source: 'test' });
    service.recordMetric(METRIC_TYPES.API_CALL, 80, { api: 'products' });

    const report = service.getReport();

    expect(report.summary).toEqual({
      totalMetrics: 2,
      avgDuration: 640,
      maxDuration: 1200,
      minDuration: 80,
    });
    expect(report.byCategory[METRIC_TYPES.PAGE_LOAD]).toHaveLength(1);
    expect(report.byCategory[METRIC_TYPES.PAGE_LOAD]?.[0]).toMatchObject({
      name: METRIC_TYPES.PAGE_LOAD,
      duration: 1200,
      metadata: expect.objectContaining({ source: 'test', url: '/' }),
    });

    await vi.waitFor(() => {
      expect(StorageService.set).toHaveBeenCalledWith('performance_metrics', expect.any(Array));
    });
  });

  it('keeps the in-memory metric buffer bounded', () => {
    for (let index = 0; index < 150; index += 1) {
      service.recordMetric(METRIC_TYPES.API_CALL, index);
    }

    expect(service.getReport().summary.totalMetrics).toBeLessThanOrEqual(100);
  });

  it('measures successful and failed module loads', async () => {
    const module = { name: 'test-module' };

    await expect(service.measureModuleLoad('test-module', async () => module)).resolves.toBe(module);
    await expect(service.measureModuleLoad('broken-module', async () => {
      throw new Error('load failed');
    })).rejects.toThrow('load failed');

    const moduleMetrics = service.getReport().byCategory[METRIC_TYPES.MODULE_LOAD] ?? [];
    expect(moduleMetrics).toHaveLength(2);
    expect(moduleMetrics[0]).toMatchObject({
      duration: 32,
      metadata: expect.objectContaining({ module: 'test-module' }),
    });
    expect(moduleMetrics[1].metadata).toMatchObject({
      module: 'broken-module',
      error: 'load failed',
    });
  });

  it('measures API calls and user actions with success and failure metadata', async () => {
    await expect(service.measureApiCall('products', async () => ({ ok: true }))).resolves.toEqual({ ok: true });
    await expect(service.measureApiCall('orders', async () => {
      throw new Error('api failed');
    })).rejects.toThrow('api failed');
    await expect(service.measureUserAction('submit-form', async () => 'done')).resolves.toBe('done');

    const report = service.getReport();
    expect(report.byCategory[METRIC_TYPES.API_CALL]?.[0].metadata).toMatchObject({
      api: 'products',
      success: true,
    });
    expect(report.byCategory[METRIC_TYPES.API_CALL]?.[1].metadata).toMatchObject({
      api: 'orders',
      success: false,
      error: 'api failed',
    });
    expect(report.byCategory[METRIC_TYPES.USER_ACTION]?.[0].metadata).toMatchObject({
      action: 'submit-form',
    });
  });

  it('collects page load metrics from navigation entries', () => {
    vi.spyOn(performance, 'getEntriesByType').mockImplementation((type: string) => {
      if (type !== 'navigation') return [];
      return [{
        domainLookupEnd: 12,
        domainLookupStart: 2,
        connectEnd: 22,
        connectStart: 12,
        responseStart: 40,
        requestStart: 25,
        responseEnd: 75,
        domContentLoadedEventEnd: 115,
        loadEventEnd: 200,
        fetchStart: 0,
      } as PerformanceNavigationTiming];
    });

    (service as unknown as { _collectPageLoadMetrics: () => void })._collectPageLoadMetrics();

    expect(service.getReport().byCategory[METRIC_TYPES.PAGE_LOAD]?.[0].duration).toBe(200);
    expect(service.getReport().byCategory[METRIC_TYPES.TTFB]?.[0].duration).toBe(15);
  });

  it('creates independent instances through the factory', () => {
    expect(createPerformanceService()).toBeInstanceOf(PerformanceService);
  });

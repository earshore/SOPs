import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createWebVitalsService, type Metric } from '@/services/webVitalsService';

class MockPerformanceObserver {
  static instances: MockPerformanceObserver[] = [];
  callback: PerformanceObserverCallback;

  constructor(callback: PerformanceObserverCallback) {
    this.callback = callback;
    MockPerformanceObserver.instances.push(this);
  }

  observe = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
}

function emitEntries(observer: MockPerformanceObserver, entries: PerformanceEntry[]): void {
  observer.callback({
    getEntries: () => entries,
    getEntriesByName: () => [],
    getEntriesByType: () => entries,
  } as PerformanceObserverEntryList, observer as unknown as PerformanceObserver);
}

describe('webVitalsService', () => {
  beforeEach(() => {
    MockPerformanceObserver.instances = [];
    vi.stubGlobal('PerformanceObserver', MockPerformanceObserver);
    vi.spyOn(Date, 'now').mockReturnValue(1000);
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('subscribes to metric updates and returns an unsubscribe function', () => {
    const service = createWebVitalsService();
    const callback = vi.fn();
    const unsubscribe = service.onMetric(callback);

    (service as unknown as { handleMetric: (metric: Metric) => void }).handleMetric({
      name: 'FCP',
      value: 1200,
      rating: 'good',
      delta: 1200,
      id: 'metric-1',
      navigationType: 'navigate',
    });
    unsubscribe();
    (service as unknown as { handleMetric: (metric: Metric) => void }).handleMetric({
      name: 'LCP',
      value: 5000,
      rating: 'poor',
      delta: 5000,
      id: 'metric-2',
      navigationType: 'navigate',
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(service.getMetrics().get('FCP')?.value).toBe(1200);
    expect(service.getMetrics().get('LCP')?.value).toBe(5000);
  });

  it('builds a rounded summary and score from collected metrics', () => {
    const service = createWebVitalsService();
    const handleMetric = (service as unknown as { handleMetric: (metric: Metric) => void }).handleMetric.bind(service);

    handleMetric({ name: 'CLS', value: 0.08, rating: 'good', delta: 0.08, id: '1', navigationType: 'navigate' });
    handleMetric({ name: 'LCP', value: 3200.4, rating: 'needs-improvement', delta: 3200.4, id: '2', navigationType: 'navigate' });

    expect(service.getSummary()).toEqual({
      metrics: {
        CLS: { value: 0, rating: 'good' },
        LCP: { value: 3200, rating: 'needs-improvement' },
      },
      score: 50,
    });
  });

  it('collects fallback metrics from browser performance APIs', async () => {
    const service = createWebVitalsService();
    const callback = vi.fn();
    service.onMetric(callback);
    vi.spyOn(performance, 'getEntriesByType').mockImplementation((type: string) => {
      if (type === 'paint') {
        return [{ name: 'first-contentful-paint', startTime: 1500 } as PerformanceEntry];
      }
      if (type === 'navigation') {
        return [{ requestStart: 20, responseStart: 120 } as PerformanceNavigationTiming];
      }
      return [];
    });

    await service.initialize();
    window.dispatchEvent(new Event('load'));

    const lcpObserver = MockPerformanceObserver.instances.find((observer) =>
      vi.mocked(observer.observe).mock.calls.some((call) => call[0].type === 'largest-contentful-paint')
    );
    const clsObserver = MockPerformanceObserver.instances.find((observer) =>
      vi.mocked(observer.observe).mock.calls.some((call) => call[0].type === 'layout-shift')
    );

    expect(lcpObserver).toBeDefined();
    expect(clsObserver).toBeDefined();

    emitEntries(lcpObserver as MockPerformanceObserver, [
      { startTime: 2600, renderTime: 0, loadTime: 0 } as PerformanceEntry & { renderTime: number; loadTime: number },
    ]);
    emitEntries(clsObserver as MockPerformanceObserver, [
      { hadRecentInput: false, value: 0.06 } as PerformanceEntry & { hadRecentInput: boolean; value: number },
      { hadRecentInput: true, value: 1 } as PerformanceEntry & { hadRecentInput: boolean; value: number },
    ]);

    expect(service.getMetrics().get('FCP')?.rating).toBe('good');
    expect(service.getMetrics().get('TTFB')?.value).toBe(100);
    expect(service.getMetrics().get('LCP')?.rating).toBe('needs-improvement');
    expect(service.getMetrics().get('CLS')?.value).toBe(0.06);
    expect(callback).toHaveBeenCalled();
  });

  it('reports metrics only when an endpoint is provided and logs failures', async () => {
    const service = createWebVitalsService();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    await service.reportMetrics();
    expect(fetchMock).not.toHaveBeenCalled();

    await service.reportMetrics('/metrics');
    expect(fetchMock).toHaveBeenCalledWith('/metrics', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.stringContaining('"timestamp"'),
    }));

    fetchMock.mockRejectedValueOnce(new Error('network failed'));
    await service.reportMetrics('/metrics');

    expect(console.error).toHaveBeenCalledWith('[WebVitals] 指标上报失败:', expect.any(Error));
  });
});

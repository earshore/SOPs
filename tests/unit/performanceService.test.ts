import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configCenter } from '@/common/config/ConfigCenter';
import {
  METRIC_TYPES,
  PerformanceService,
  createPerformanceService,
  performanceService as defaultExport,
} from '@/services/performanceService';
import { StorageService } from '@/services/storageService';

vi.mock('@/services/storageService', () => ({
  StorageService: {
    set: vi.fn(),
  },
}));

vi.mock('@/common/config/ConfigCenter', () => ({
  configCenter: {
    isProduction: vi.fn(),
  },
}));

/** 伪造 PerformanceObserver：支持 observe 与手动触发回调 */
class FakePerformanceObserver {
  static observeCalls: string[] = [];

  callback: (list: { getEntries: () => unknown[] }) => void;
  disconnected = false;

  constructor(callback: (list: { getEntries: () => unknown[] }) => void) {
    this.callback = callback;
  }

  observe(options: { entryTypes: string[] }): void {
    FakePerformanceObserver.observeCalls.push(...options.entryTypes);
  }

  disconnect(): void {
    this.disconnected = true;
  }

  /** 向自身注入条目，模拟浏览器产生条目 */
  emit(entries: unknown[]): void {
    this.callback({ getEntries: () => entries });
  }
}

/** 通过原型上的 observers 找到指定 entryType 的伪造观察者 */
function findObserver(service: PerformanceService, entryType: string): FakePerformanceObserver | undefined {
  const observers = (service as unknown as { observers: FakePerformanceObserver[] }).observers;
  const idx = FakePerformanceObserver.observeCalls.lastIndexOf(entryType);
  return observers?.[idx] ?? undefined;
}

function setReadyState(state: DocumentReadyState): void {
  Object.defineProperty(document, 'readyState', { value: state, configurable: true });
}

let service: PerformanceService;
let originalPO: unknown;

beforeEach(() => {
  vi.useFakeTimers();
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
  vi.mocked(configCenter.isProduction).mockReset();
  FakePerformanceObserver.observeCalls = [];
  originalPO = window.PerformanceObserver;
  window.PerformanceObserver = (function PerformanceObserver(cb: unknown) {
    return new FakePerformanceObserver(cb as (list: { getEntries: () => unknown[] }) => void);
  } as unknown as typeof PerformanceObserver);
});

afterEach(() => {
  service.destroy();
  if (originalPO) {
    window.PerformanceObserver = originalPO as typeof PerformanceObserver;
  } else {
    delete (window as unknown as Record<string, unknown>).PerformanceObserver;
  }
  setReadyState('complete');
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('指标记录与报告', () => {
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

    await vi.advanceTimersByTimeAsync(0);
    expect(StorageService.set).toHaveBeenCalledWith('performance_metrics', expect.any(Array));
  });

  it('keeps the in-memory metric buffer bounded', () => {
    for (let index = 0; index < 150; index += 1) {
      service.recordMetric(METRIC_TYPES.API_CALL, index);
    }

    expect(service.getReport().summary.totalMetrics).toBeLessThanOrEqual(100);
  });

  it('metrics 为空时报告摘要全部为零且分类为空', () => {
    const report = service.getReport();
    expect(report.summary).toEqual({
      totalMetrics: 0,
      avgDuration: 0,
      maxDuration: 0,
      minDuration: 0,
    });
    expect(report.byCategory).toEqual({});
    expect(report.metrics).toEqual([]);
  });
});

describe('异步测量包装器', () => {
  it('measures successful and failed module loads', async () => {
    const module = { name: 'test-module' };

    await expect(service.measureModuleLoad('test-module', async () => module)).resolves.toBe(module);
    await expect(
      service.measureModuleLoad('broken-module', async () => {
        throw new Error('load failed');
      })
    ).rejects.toThrow('load failed');

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

  it('measureModuleLoad 失败时打印 console.error 并携带错误信息', async () => {
    await expect(
      service.measureModuleLoad('broken', async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');

    expect(console.error).toHaveBeenCalledWith('[Performance] 模块加载失败 broken: 32ms', expect.any(Error));
  });

  it('measures API calls and user actions with success and failure metadata', async () => {
    await expect(service.measureApiCall('products', async () => ({ ok: true }))).resolves.toEqual({
      ok: true,
    });
    await expect(
      service.measureApiCall('orders', async () => {
        throw new Error('api failed');
      })
    ).rejects.toThrow('api failed');
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

  it('measureApiCall 失败时打印 console.error 并携带错误信息', async () => {
    await expect(
      service.measureApiCall('users', async () => {
        throw new Error('http 500');
      })
    ).rejects.toThrow('http 500');

    expect(console.error).toHaveBeenCalledWith('[Performance] API调用失败 users: 32ms', expect.any(Error));
  });
});

describe('页面加载测量', () => {
  it('collects page load metrics from navigation entries', () => {
    vi.spyOn(performance, 'getEntriesByType').mockImplementation((type: string) => {
      if (type !== 'navigation') return [];
      return [
        {
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
        } as PerformanceNavigationTiming,
      ];
    });

    (service as unknown as { collectPageLoadMetrics: () => void }).collectPageLoadMetrics();

    expect(service.getReport().byCategory[METRIC_TYPES.PAGE_LOAD]?.[0].duration).toBe(200);
    expect(service.getReport().byCategory[METRIC_TYPES.TTFB]?.[0].duration).toBe(15);
  });

  it('readyState 已完成时直接收集加载指标', () => {
    setReadyState('complete');
    const collectSpy = vi
      .spyOn(service as unknown as { collectPageLoadMetrics: () => void }, 'collectPageLoadMetrics')
      .mockImplementation(() => {});

    service.measurePageLoad();

    expect(collectSpy).toHaveBeenCalledTimes(1);
  });

  it('readyState 未完成时注册 load 监听并在资源加载后延迟收集', () => {
    setReadyState('loading');
    const collectSpy = vi
      .spyOn(service as unknown as { collectPageLoadMetrics: () => void }, 'collectPageLoadMetrics')
      .mockImplementation(() => {});

    service.measurePageLoad();
    expect(collectSpy).not.toHaveBeenCalled();

    window.dispatchEvent(new Event('load'));
    expect(collectSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(0);
    expect(collectSpy).toHaveBeenCalledTimes(1);
  });

  it('导航条目为空时 collectPageLoadMetrics 早返回不记录指标', () => {
    vi.spyOn(performance, 'getEntriesByType').mockReturnValue([]);

    (service as unknown as { collectPageLoadMetrics: () => void }).collectPageLoadMetrics();

    expect(service.getReport().metrics).toHaveLength(0);
    expect(StorageService.set).not.toHaveBeenCalled();
  });

  it('导航条目存在时计算全部页面加载指标并异步落盘', async () => {
    vi.spyOn(performance, 'getEntriesByType').mockImplementation((type: string) => {
      if (type !== 'navigation') return [];
      return [
        {
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
        } as PerformanceNavigationTiming,
      ];
    });

    (service as unknown as { collectPageLoadMetrics: () => void }).collectPageLoadMetrics();

    const report = service.getReport();
    expect(report.byCategory[METRIC_TYPES.DNS]?.[0].duration).toBe(10);
    expect(report.byCategory[METRIC_TYPES.TCP]?.[0].duration).toBe(10);
    expect(report.byCategory[METRIC_TYPES.DOWNLOAD]?.[0].duration).toBe(35);
    expect(report.byCategory[METRIC_TYPES.DOM_PARSE]?.[0].duration).toBe(40);
    expect(report.byCategory[METRIC_TYPES.PAGE_LOAD]?.[0].metadata.url).toBe('/');

    await vi.advanceTimersByTimeAsync(0);
    expect(StorageService.set).toHaveBeenCalledWith('performance_metrics', expect.any(Array));
  });
});

describe('Core Web Vitals 观测', () => {
  it('PerformanceObserver 不可用时全部测量方法安全跳过', () => {
    delete (window as unknown as Record<string, unknown>).PerformanceObserver;

    const noop = () => {
      service.measureLCP();
      service.measureFID();
      service.measureCLS();
      service.measureFCP();
      service.measureLongTasks();
    };
    expect(noop).not.toThrow();
  });

  it('measureLCP 取最后一条条目并按 renderTime > loadTime > startTime 取值', () => {
    service.init();
    const lcp = findObserver(service, 'largest-contentful-paint');
    expect(lcp).toBeDefined();

    // 分支：renderTime 存在
    lcp!.emit([{ renderTime: 123.7, loadTime: 999, startTime: 50, element: { tagName: 'IMG' }, url: '/img.png' }]);
    // 分支：仅 loadTime
    lcp!.emit([{ loadTime: 200.2, startTime: 50 }]);
    // 分支：仅 startTime
    lcp!.emit([{ startTime: 300 }]);
    // 分支：entries 为空（!lastEntry 早返回）
    lcp!.emit([]);

    const metrics = service.getReport().byCategory[METRIC_TYPES.LCP] ?? [];
    expect(metrics).toHaveLength(3);
    expect(metrics.map((m) => m.duration)).toEqual([124, 200, 300]);
    // recordMetric 会在元数据末尾强制覆盖 url 为当前路径，因此 url 为 '/'
    expect(metrics[0].metadata).toEqual(expect.objectContaining({ element: 'IMG', url: '/' }));
  });

  it('measureFID 按 processingStart - startTime 计算并在 processingStart 缺失时回退 0', () => {
    service.init();
    const fid = findObserver(service, 'first-input');

    fid!.emit([{ name: 'click', processingStart: 150, startTime: 100 }]);
    fid!.emit([{ name: 'keydown', startTime: 200 }]);

    const metrics = service.getReport().byCategory[METRIC_TYPES.FID] ?? [];
    expect(metrics).toHaveLength(2);
    expect(metrics.map((m) => m.duration)).toEqual([50, -200]);
    expect(metrics[0].metadata).toEqual(expect.objectContaining({ eventType: 'click' }));
  });

  it('measureCLS 只累加非用户输入引起的偏移并对缺失 value 兜底 0', () => {
    service.init();
    const cls = findObserver(service, 'layout-shift');

    // hadRecentInput=true 跳过
    cls!.emit([{ hadRecentInput: true, value: 0.5 }]);
    // 正常累加
    cls!.emit([{ hadRecentInput: false, value: 0.12345 }]);
    // value 缺失兜底 0
    cls!.emit([{ hadRecentInput: false }]);

    const metrics = service.getReport().byCategory[METRIC_TYPES.CLS] ?? [];
    expect(metrics).toHaveLength(3);
    // 只有两条非输入偏移计入：0.123（toFixed(3)）
    expect(metrics[2].duration).toBe(0.123);
    expect(metrics[2].metadata).toEqual(expect.objectContaining({ entries: 2 }));
  });

  it('measureFCP 只接受 first-contentful-paint 条目', () => {
    service.init();
    const fcp = findObserver(service, 'paint');

    fcp!.emit([{ name: 'first-contentful-paint', startTime: 420 }]);
    // 同名条目重复出现
    fcp!.emit([{ name: 'first-contentful-paint', startTime: 430 }]);
    // 其他 paint 条目忽略
    fcp!.emit([{ name: 'first-paint', startTime: 100 }]);

    const metrics = service.getReport().byCategory[METRIC_TYPES.FCP] ?? [];
    expect(metrics).toHaveLength(2);
    expect(metrics.map((m) => m.duration)).toEqual([420, 430]);
  });

  it('measureLongTasks 只记录超过 50ms 的长任务', () => {
    service.init();
    const lt = findObserver(service, 'longtask');

    lt!.emit([{ name: 'script', duration: 120, startTime: 1000 }]);
    lt!.emit([{ name: 'style', duration: 50, startTime: 2000 }]);
    lt!.emit([{ name: 'layout', duration: 200.7, startTime: 3000 }]);

    const metrics = service.getReport().metrics.filter((m) => m.name === 'long_task');
    expect(metrics).toHaveLength(2);
    expect(metrics.map((m) => m.duration)).toEqual([120, 201]);
    expect(metrics[0].metadata).toEqual(
      expect.objectContaining({ name: 'script', startTime: 1000 })
    );
  });

  it('观察者构造抛错时测量方法捕获异常并记录 debug 日志', () => {
    window.PerformanceObserver = (function PerformanceObserver() {
      throw new Error('observer not available');
    } as unknown as typeof PerformanceObserver);

    const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    service.setLogger(logger);

    expect(() => service.measureLCP()).not.toThrow();
    expect(() => service.measureFID()).not.toThrow();
    expect(() => service.measureCLS()).not.toThrow();
    expect(() => service.measureFCP()).not.toThrow();
    expect(() => service.measureLongTasks()).not.toThrow();

    expect(logger.debug).toHaveBeenCalledWith('LCP measurement failed', expect.objectContaining({ error: 'observer not available' }), 'Performance');
    expect(logger.debug).toHaveBeenCalledWith('FID measurement failed', expect.objectContaining({ error: 'observer not available' }), 'Performance');
    expect(logger.debug).toHaveBeenCalledWith('CLS measurement failed', expect.objectContaining({ error: 'observer not available' }), 'Performance');
    expect(logger.debug).toHaveBeenCalledWith('FCP measurement failed', expect.objectContaining({ error: 'observer not available' }), 'Performance');
    expect(logger.debug).toHaveBeenCalledWith('Long task measurement not supported', {}, 'Performance');
  });
});

describe('Logger 注入与上报', () => {
  it('setLogger 后内部日志走注入的 logger 而非 console', () => {
    const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    service.setLogger(logger);

    const noop = () => {
      (service as unknown as { log: (l: string, m: string, d?: Record<string, unknown>) => void }).log('info', 'hello', { a: 1 });
    };
    expect(noop).not.toThrow();
    expect(logger.info).toHaveBeenCalledWith('hello', { a: 1 }, 'Performance');
    expect(console.error).not.toHaveBeenCalled();
  });

  it('无 logger 时 log 静默不抛错', () => {
    const noop = () => {
      (service as unknown as { log: (l: string, m: string, d?: Record<string, unknown>) => void }).log('warn', 'fallback', {});
    };
    expect(noop).not.toThrow();
  });

  it('构造函数与 createPerformanceService 均支持注入 logger', () => {
    const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const constructed = new PerformanceService(logger);
    const factory = createPerformanceService(logger);

    const callLog = (s: PerformanceService) =>
      (s as unknown as { log: (l: string, m: string) => void }).log('error', 'err');
    expect(() => callLog(constructed)).not.toThrow();
    expect(() => callLog(factory)).not.toThrow();
    expect(logger.error).toHaveBeenCalledTimes(2);
  });

  it('开发环境 sendMetrics 跳过上报并记录 debug 日志', () => {
    vi.mocked(configCenter.isProduction).mockReturnValue(false);
    const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    service.setLogger(logger);

    // sendMetrics 由 collectPageLoadMetrics（通过 init → measurePageLoad）触发，
    // 因此通过注入 mock navigation 条目并触发 init 来走通该分支
    vi.spyOn(performance, 'getEntriesByType').mockImplementation((type: string) => {
      if (type !== 'navigation') return [];
      return [
        {
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
        } as PerformanceNavigationTiming,
      ];
    });
    service.init();

    expect(logger.debug).toHaveBeenCalledWith('开发环境，跳过指标上报', {}, 'Performance');
  });

  it('生产环境 sendMetrics 直接返回不做任何事', () => {
    vi.mocked(configCenter.isProduction).mockReturnValue(true);

    service.recordMetric(METRIC_TYPES.API_CALL, 100);

    // 不抛错且除存储落盘外无其他副作用（sendMetrics 当前为占位实现）
    expect(service.getReport().summary.totalMetrics).toBe(1);
  });
});

describe('工厂与单例导出', () => {
  it('creates independent instances through the factory', () => {
    expect(createPerformanceService()).toBeInstanceOf(PerformanceService);
  });

  it('模块级单例 performanceService 可直接导入使用', () => {
    expect(defaultExport).toBeInstanceOf(PerformanceService);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PerformanceMonitor } from './PerformanceMonitor';

type MetricCallback = (metric: { name: string; value: number }) => void;
type WebVitalsSummary = {
  score: number;
  metrics: Record<
    string,
    {
      value: number;
      rating: string;
    }
  >;
};

const mocks = vi.hoisted(() => {
  const createWebVitalsSummary = (): WebVitalsSummary => ({
    score: 86,
    metrics: {
      LCP: {
        value: 1234,
        rating: 'good',
      },
      CLS: {
        value: 0.1234,
        rating: 'needs-improvement',
      },
    },
  });

  return {
    createWebVitalsSummary,
    metricCallback: null as MetricCallback | null,
    unsubscribe: vi.fn(),
    summary: createWebVitalsSummary(),
    errorStats: {
      total: 0,
      recentErrors: [] as Array<{
        type: string;
        message: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        count: number;
        lastOccurrence: number;
      }>,
    },
    analyticsStats: {
      totalPageViews: 12,
      topPages: [] as Array<{ path: string; views: number }>,
    },
    session: {
      startTime: Date.UTC(2026, 6, 2, 7, 58, 55),
      pageViews: 4,
      events: 9,
    } as { startTime: number; pageViews: number; events: number } | null,
    alertStats: {
      unacknowledged: 0,
    },
    alerts: [] as Array<{
      id: string;
      level: 'info' | 'warning' | 'error' | 'critical';
      title: string;
      message: string;
      timestamp: number;
    }>,
    acknowledgeAll: vi.fn(),
  };
});

vi.mock('../../services/webVitalsService', () => ({
  webVitalsService: {
    onMetric: vi.fn((callback: MetricCallback) => {
      mocks.metricCallback = callback;
      return mocks.unsubscribe;
    }),
    getSummary: () => mocks.summary,
  },
}));

vi.mock('../../services/errorTracker', () => ({
  errorTracker: {
    getStats: () => mocks.errorStats,
  },
}));

vi.mock('../../services/analyticsService', () => ({
  analyticsService: {
    getStats: () => mocks.analyticsStats,
    getCurrentSession: () => mocks.session,
  },
}));

vi.mock('../../services/alertService', () => ({
  alertService: {
    getStats: () => mocks.alertStats,
    getUnacknowledgedAlerts: () => mocks.alerts,
    acknowledgeAll: mocks.acknowledgeAll,
  },
}));

function setNodeEnv(value: string | undefined): void {
  if (value === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = value;
  }
}

function setMemory(usedMb: number, limitMb: number): void {
  Object.defineProperty(performance, 'memory', {
    configurable: true,
    value: {
      usedJSHeapSize: usedMb * 1048576,
      jsHeapSizeLimit: limitMb * 1048576,
    },
  });
}

function clickTab(label: string): void {
  const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('#perf-tabs button'));
  const tab = tabs.find(button => button.textContent?.includes(label));
  expect(tab).toBeDefined();
  tab?.click();
}

const originalNodeEnv = process.env.NODE_ENV;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-02T08:00:00Z'));
  setNodeEnv('development');
  document.body.innerHTML = '';
  mocks.metricCallback = null;
  mocks.unsubscribe.mockReset();
  mocks.summary = mocks.createWebVitalsSummary();
  mocks.errorStats = {
    total: 0,
    recentErrors: [],
  };
  mocks.analyticsStats = {
    totalPageViews: 12,
    topPages: [],
  };
  mocks.session = {
    startTime: Date.UTC(2026, 6, 2, 7, 58, 55),
    pageViews: 4,
    events: 9,
  };
  mocks.alertStats = {
    unacknowledged: 0,
  };
  mocks.alerts = [];
  mocks.acknowledgeAll.mockReset();
  setMemory(32, 128);
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  setNodeEnv(originalNodeEnv);
  document.body.innerHTML = '';
});

describe('PerformanceMonitor lifecycle and metrics', () => {
  it('skips initialization outside development mode', () => {
    setNodeEnv('production');
    const monitor = new PerformanceMonitor();

    monitor.initialize();

    expect(monitor.isInitialized()).toBe(false);
    expect(document.getElementById('performance-monitor')).toBeNull();
  });

  it('initializes, shows, hides, toggles, and destroys the panel', () => {
    const monitor = new PerformanceMonitor();

    monitor.initialize();
    expect(monitor.isInitialized()).toBe(true);
    expect(document.getElementById('performance-monitor')?.classList.contains('hidden')).toBe(true);

    monitor.show();
    expect(document.getElementById('performance-monitor')?.classList.contains('hidden')).toBe(
      false
    );
    expect(document.querySelector('#perf-content')?.textContent).toContain('性能评分');
    expect(document.querySelector('#perf-content')?.textContent).toContain('32MB / 128MB (25%)');

    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        ctrlKey: true,
        shiftKey: true,
        key: 'P',
      })
    );
    expect(document.getElementById('performance-monitor')?.classList.contains('hidden')).toBe(true);

    monitor.toggle();
    expect(document.getElementById('performance-monitor')?.classList.contains('hidden')).toBe(
      false
    );

    document.querySelector<HTMLButtonElement>('#perf-close')?.click();
    expect(document.getElementById('performance-monitor')?.classList.contains('hidden')).toBe(true);

    monitor.destroy();
    expect(mocks.unsubscribe).toHaveBeenCalledTimes(1);
    expect(monitor.isInitialized()).toBe(false);
    expect(document.getElementById('performance-monitor')).toBeNull();
  });

  it('renders performance metrics and refreshes when a metric arrives', () => {
    const monitor = new PerformanceMonitor();
    monitor.initialize();
    monitor.show();

    clickTab('性能');
    expect(document.querySelector('#perf-content')?.textContent).toContain('1234ms');
    expect(document.querySelector('#perf-content')?.textContent).toContain('0.123');

    mocks.summary = {
      score: 72,
      metrics: {
        LCP: {
          value: 2222,
          rating: 'poor',
        },
      },
    };
    mocks.metricCallback?.({ name: 'LCP', value: 2222 });

    expect(document.querySelector('#perf-content')?.textContent).toContain('2222ms');
    monitor.destroy();
  });
});

describe('PerformanceMonitor tab content', () => {
  it('renders escaped errors, analytics, and empty states', () => {
    const monitor = new PerformanceMonitor();
    mocks.errorStats = {
      total: 1,
      recentErrors: [
        {
          type: '<script>',
          message: '<bad message>',
          severity: 'critical',
          count: 2,
          lastOccurrence: Date.UTC(2026, 6, 2, 8, 0, 0),
        },
      ],
    };
    mocks.analyticsStats = {
      totalPageViews: 22,
      topPages: [
        {
          path: '<home>',
          views: 7,
        },
      ],
    };

    monitor.initialize();
    monitor.show();

    clickTab('错误');
    expect(document.querySelector('#perf-content')?.innerHTML).toContain('&lt;script&gt;');
    expect(document.querySelector('#perf-content')?.innerHTML).toContain('&lt;bad message&gt;');

    clickTab('分析');
    expect(document.querySelector('#perf-content')?.textContent).toContain('1分5秒');
    expect(document.querySelector('#perf-content')?.innerHTML).toContain('&lt;home&gt;');

    mocks.session = null;
    clickTab('分析');
    expect(document.querySelector('#perf-content')?.textContent).toContain('暂无分析数据');

    monitor.destroy();
  });

  it('renders alerts and wires the acknowledge action', async () => {
    const monitor = new PerformanceMonitor();
    mocks.alertStats = {
      unacknowledged: 1,
    };
    mocks.alerts = [
      {
        id: 'alert-1',
        level: 'warning',
        title: '<Slow API>',
        message: '<latency high>',
        timestamp: Date.UTC(2026, 6, 2, 8, 0, 0),
      },
    ];

    monitor.initialize();
    monitor.show();
    clickTab('告警');

    expect(document.querySelector('#perf-content')?.innerHTML).toContain('&lt;Slow API&gt;');
    expect(document.querySelector('#perf-content')?.innerHTML).toContain('&lt;latency high&gt;');

    await vi.advanceTimersByTimeAsync(0);
    document.querySelector<HTMLButtonElement>('[data-action="acknowledge-all-alerts"]')?.click();

    expect(mocks.acknowledgeAll).toHaveBeenCalledTimes(1);
    monitor.destroy();
  });

  it('renders empty errors, empty alerts, and unavailable memory API', () => {
    const monitor = new PerformanceMonitor();
    Object.defineProperty(performance, 'memory', {
      configurable: true,
      value: undefined,
    });

    monitor.initialize();
    monitor.show();

    expect(document.querySelector('#perf-content')?.textContent).toContain('Memory API不可用');

    clickTab('错误');
    expect(document.querySelector('#perf-content')?.textContent).toContain('暂无错误记录');

    clickTab('告警');
    expect(document.querySelector('#perf-content')?.textContent).toContain('暂无告警');

    monitor.destroy();
  });
});

import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CSSPerformanceMonitor, cssPerformanceMonitor } from './CSSPerformanceMonitor';

let now: number;

beforeEach(() => {
  now = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => {
      now += 120;
      callback(now);
      return 1;
    })
  );
});

afterEach(() => {
  cssPerformanceMonitor.clear();
  cssPerformanceMonitor.setEnabled(true);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it('returns an empty healthy report before metrics are recorded', () => {
  const monitor = new CSSPerformanceMonitor();
  monitor.setEnabled(true);

  expect(monitor.generateReport()).toEqual({
    loadMetrics: {
      totalLoaded: 0,
      averageLoadTime: 0,
      slowestLoad: null,
      totalLoadTime: 0,
    },
    runtimeMetrics: {
      themeSwitches: 0,
      averageThemeSwitchTime: 0,
      slowestThemeSwitch: null,
    },
    recommendations: ['✅ CSS性能表现良好，无需优化'],
  });
});

it('tracks CSS loads, caps history, and reports load recommendations', () => {
  const monitor = new CSSPerformanceMonitor();
  monitor.setEnabled(true);

  for (let index = 0; index < 101; index += 1) {
    now = 1200 + index;
    monitor.trackCSSLoad(`/assets/${index}.css`, 0, index);
  }

  const report = monitor.printReport();

  expect(report.loadMetrics.totalLoaded).toBe(100);
  expect(report.loadMetrics.slowestLoad).toMatchObject({
    href: '/assets/100.css',
    loadTime: 1300,
    size: 100,
  });
  expect(report.recommendations).toEqual(
    expect.arrayContaining([
      'CSS平均加载时间过长，考虑启用HTTP/2或使用CDN',
      '最慢的CSS文件: /assets/100.css，考虑拆分或优化',
      '加载的CSS文件过多，考虑合并或使用CSS代码分割',
    ])
  );
});

it('tracks theme switches and ignores metrics while disabled', () => {
  const monitor = new CSSPerformanceMonitor();
  monitor.setEnabled(true);

  for (let index = 0; index < 51; index += 1) {
    monitor.trackThemeSwitch(`theme-${index}`, `theme-${index + 1}`);
  }

  monitor.setEnabled(false);
  monitor.trackCSSLoad('/disabled.css', 0);
  monitor.trackThemeSwitch('disabled', 'still-disabled');

  const report = monitor.generateReport();

  expect(report.loadMetrics.totalLoaded).toBe(0);
  expect(report.runtimeMetrics.themeSwitches).toBe(50);
  expect(report.runtimeMetrics.averageThemeSwitchTime).toBe(120);
  expect(report.runtimeMetrics.slowestThemeSwitch).toMatchObject({
    fromTheme: 'theme-1',
    toTheme: 'theme-2',
    duration: 120,
  });
  expect(report.recommendations).toContain('主题切换时间过长，检查CSS变量数量和复杂度');
});

it('clears collected metrics and exposes the singleton helpers', () => {
  cssPerformanceMonitor.setEnabled(true);
  now = 20;
  cssPerformanceMonitor.trackCSSLoad('/app.css', 10);

  expect(cssPerformanceMonitor.generateReport().loadMetrics.totalLoaded).toBe(1);

  cssPerformanceMonitor.clear();

  expect(cssPerformanceMonitor.generateReport().loadMetrics.totalLoaded).toBe(0);
  expect((window as unknown as Record<string, unknown>).__CSS_PERF__).toBe(cssPerformanceMonitor);
  expect((window as unknown as { printCSSPerf?: () => unknown }).printCSSPerf?.()).toEqual(
    cssPerformanceMonitor.printReport()
  );
});

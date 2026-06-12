import { afterEach, describe, expect, it, vi } from 'vitest';

type WindowWithLazyLibs = Window & {
  Chart?: unknown;
  GridStack?: unknown;
};

async function importLazyLibs() {
  vi.resetModules();
  return import('@/common/utils/lazyLibs');
}

describe('lazyLibs', () => {
  afterEach(() => {
    delete (window as WindowWithLazyLibs).Chart;
    delete (window as WindowWithLazyLibs).GridStack;
    vi.doUnmock('chart.js/auto');
    vi.doUnmock('gridstack');
    vi.doUnmock('gridstack/dist/gridstack.min.css');
    vi.restoreAllMocks();
  });

  it('returns an existing Chart.js global without dynamic import', async () => {
    const chart = { version: 'existing' };
    (window as WindowWithLazyLibs).Chart = chart;
    const { loadChartJs } = await importLazyLibs();

    await expect(loadChartJs()).resolves.toBe(chart);
  });

  it('loads Chart.js once and caches concurrent callers', async () => {
    const chart = { version: 'mocked' };
    vi.doMock('chart.js/auto', () => ({ default: chart }));
    const { loadChartJs } = await importLazyLibs();

    const firstLoad = loadChartJs();
    const secondLoad = loadChartJs();

    expect(secondLoad).toBe(firstLoad);
    await expect(firstLoad).resolves.toBe(chart);
    expect((window as WindowWithLazyLibs).Chart).toBe(chart);
  });

  it('clears the Chart.js cache after a failed import so callers can retry', async () => {
    const chart = { version: 'retry' };
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.doMock('chart.js/auto', () => {
      throw new Error('chart import failed');
    });
    const { loadChartJs } = await importLazyLibs();

    await expect(loadChartJs()).rejects.toThrow();

    vi.doUnmock('chart.js/auto');
    vi.doMock('chart.js/auto', () => ({ default: chart }));

    await expect(loadChartJs()).resolves.toBe(chart);
    expect(consoleError).toHaveBeenCalledWith('Failed to load Chart.js', expect.any(Error));
  });

  it('returns an existing GridStack global without dynamic import', async () => {
    const gridStack = { init: vi.fn() };
    (window as WindowWithLazyLibs).GridStack = gridStack;
    const { loadGridStack } = await importLazyLibs();

    await expect(loadGridStack()).resolves.toBe(gridStack);
  });

  it('loads GridStack once and caches concurrent callers', async () => {
    const gridStack = { init: vi.fn() };
    vi.doMock('gridstack/dist/gridstack.min.css', () => ({}));
    vi.doMock('gridstack', () => ({ GridStack: gridStack }));
    const { loadGridStack } = await importLazyLibs();

    const firstLoad = loadGridStack();
    const secondLoad = loadGridStack();

    expect(secondLoad).toBe(firstLoad);
    await expect(firstLoad).resolves.toBe(gridStack);
    expect((window as WindowWithLazyLibs).GridStack).toBe(gridStack);
  });
});

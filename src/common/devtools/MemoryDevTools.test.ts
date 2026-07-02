import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  memoryUsage: {
    heapUsed: 42.5,
    percentage: 65,
  },
  snapshots: [] as Array<{ timestamp: number; heapUsed: number }>,
  leaks: [] as Array<{ event: string; message: string; severity: 'warning' | 'critical' }>,
  forceGC: vi.fn(),
  clearSnapshots: vi.fn(),
  eventStats: {
    totalListeners: 3,
    events: ['ready', 'change'],
  },
}));

vi.mock('../utils/MemoryLeakDetector', () => ({
  memoryLeakDetector: {
    getMemoryUsage: () => mocks.memoryUsage,
    getSnapshots: () => mocks.snapshots,
    forceGC: mocks.forceGC,
    clearSnapshots: mocks.clearSnapshots,
  },
}));

vi.mock('../EventBus', () => ({
  default: {
    getStats: () => mocks.eventStats,
    detectLeaks: () => mocks.leaks,
  },
}));

async function loadMemoryDevTools() {
  vi.resetModules();
  return import('./MemoryDevTools');
}

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = '';
  mocks.memoryUsage = {
    heapUsed: 42.5,
    percentage: 65,
  };
  mocks.snapshots = [];
  mocks.leaks = [];
  mocks.forceGC.mockReset();
  mocks.clearSnapshots.mockReset();
  mocks.eventStats = {
    totalListeners: 3,
    events: ['ready', 'change'],
  };
  delete (window as unknown as { __MemoryDevTools?: unknown }).__MemoryDevTools;
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
  delete (window as unknown as { __MemoryDevTools?: unknown }).__MemoryDevTools;
});

describe('MemoryDevTools', () => {
  it('creates the panel and toggles updates from the keyboard shortcut', async () => {
    const { MemoryDevTools } = await loadMemoryDevTools();
    const devtools = new MemoryDevTools();

    devtools.init();

    const panel = document.getElementById('memory-devtools');
    expect(panel).not.toBeNull();
    expect(panel?.classList.contains('hidden')).toBe(true);

    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        ctrlKey: true,
        shiftKey: true,
        key: 'M',
      })
    );

    expect(panel?.classList.contains('hidden')).toBe(false);
    expect(panel?.querySelector('#heap-used')?.textContent).toBe('42.5 MB');
    expect(panel?.querySelector('#heap-percentage')?.textContent).toBe('65.0%');
    expect((panel?.querySelector('#heap-percentage') as HTMLElement | null)?.style.color).toBe(
      'rgb(245, 158, 11)'
    );
    expect(panel?.querySelector('#total-listeners')?.textContent).toBe('3');
    expect(panel?.querySelector('#event-count')?.textContent).toBe('2');

    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        ctrlKey: true,
        shiftKey: true,
        key: 'M',
      })
    );

    expect(panel?.classList.contains('hidden')).toBe(true);
    devtools.destroy();
  });

  it('renders snapshots, leak warnings, and action buttons', async () => {
    const { MemoryDevTools } = await loadMemoryDevTools();
    const devtools = new MemoryDevTools();
    mocks.memoryUsage = {
      heapUsed: 82,
      percentage: 85,
    };
    mocks.snapshots = [
      { timestamp: Date.UTC(2026, 6, 2, 8, 0, 0), heapUsed: 40 },
      { timestamp: Date.UTC(2026, 6, 2, 8, 1, 0), heapUsed: 48 },
    ];
    mocks.leaks = [
      {
        event: 'APP_EVENTS.TEST',
        message: 'listener count exceeded',
        severity: 'critical',
      },
    ];

    devtools.init();
    devtools.toggle();

    const panel = document.getElementById('memory-devtools');

    expect((panel?.querySelector('#heap-percentage') as HTMLElement | null)?.style.color).toBe(
      'rgb(239, 68, 68)'
    );
    expect(panel?.querySelector('#memory-snapshots')?.textContent).toContain('48.0 MB');
    expect((panel?.querySelector('#leak-warnings') as HTMLElement | null)?.style.display).toBe(
      'block'
    );
    expect(panel?.querySelector('#leak-list')?.textContent).toContain('listener count exceeded');

    panel?.querySelector<HTMLButtonElement>('#memory-force-gc')?.click();
    expect(mocks.forceGC).toHaveBeenCalledTimes(1);

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    panel?.querySelector<HTMLButtonElement>('#memory-clear-snapshots')?.click();
    expect(mocks.clearSnapshots).toHaveBeenCalledTimes(1);

    panel?.querySelector<HTMLButtonElement>('#memory-devtools-close')?.click();
    expect(panel?.classList.contains('hidden')).toBe(true);

    devtools.destroy();
  });

  it('handles missing memory usage and removes the panel on destroy', async () => {
    const { MemoryDevTools } = await loadMemoryDevTools();
    const devtools = new MemoryDevTools();
    mocks.memoryUsage = null as unknown as typeof mocks.memoryUsage;

    devtools.init();
    devtools.toggle();
    devtools.destroy();

    expect(document.getElementById('memory-devtools')).toBeNull();
  });

  it('auto-enables the singleton in development mode', async () => {
    await loadMemoryDevTools();

    await vi.advanceTimersByTimeAsync(1500);

    const globalDevtools = (window as unknown as { __MemoryDevTools?: { destroy: () => void } })
      .__MemoryDevTools;
    expect(globalDevtools).toBeDefined();
    expect(document.getElementById('memory-devtools')).not.toBeNull();

    globalDevtools?.destroy();
  });
});

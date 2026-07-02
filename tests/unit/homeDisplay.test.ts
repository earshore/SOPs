import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const homeTemplate = `
  <div id="home-splash-container">
    <canvas id="particles-canvas"></canvas>
    <div id="time-display"></div>
    <div id="cursor-follower"></div>
    <div id="hero-content"></div>
  </div>
`;

type ResizeObserverCallback = ConstructorParameters<typeof ResizeObserver>[0];

let resizeCallback: ResizeObserverCallback | null = null;
let disconnectResizeObserver: ReturnType<typeof vi.fn>;
let frameCallbacks: FrameRequestCallback[];

function flushPromises(): Promise<void> {
  return new Promise((resolve) => {
    queueMicrotask(resolve);
  });
}

async function importHomeDisplay() {
  vi.resetModules();
  vi.doMock('@/common/utils/viewLoader', () => ({
    loadTemplate: vi.fn(async () => homeTemplate),
  }));

  const module = await import('@/modules/home/homeDisplay');
  const viewLoader = await import('@/common/utils/viewLoader');

  return {
    ...module,
    loadTemplate: viewLoader.loadTemplate as ReturnType<typeof vi.fn>,
  };
}

function createCanvasContext(): CanvasRenderingContext2D {
  return {
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    clearRect: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
  } as unknown as CanvasRenderingContext2D;
}

  beforeEach(() => {
    document.body.innerHTML = '';
    resizeCallback = null;
    disconnectResizeObserver = vi.fn();
    frameCallbacks = [];
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-02T08:09:00Z'));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(createCanvasContext());
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frameCallbacks.push(callback);
      return frameCallbacks.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    global.ResizeObserver = class TestResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        resizeCallback = callback;
      }

      observe(): void {}

      disconnect(): void {
        disconnectResizeObserver();
      }

      unobserve(): void {}
    } as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    vi.doUnmock('@/common/utils/viewLoader');
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('mounts the home splash, initializes time, resize handling, and mouse effects', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    const { mount, unmount, loadTemplate } = await importHomeDisplay();

    mount(container);
    await flushPromises();
    await flushPromises();

    expect(loadTemplate).toHaveBeenCalledWith('src/modules/home/homeDisplay.html');
    expect(container.querySelector('#home-splash-container')).not.toBeNull();
    expect(document.getElementById('time-display')?.textContent).toContain('|');
    expect(frameCallbacks).toHaveLength(1);

    const queuedFrameCount = frameCallbacks.length;
    resizeCallback?.([
      { contentRect: { width: 160, height: 120 } as DOMRectReadOnly },
    ] as ResizeObserverEntry[], {} as ResizeObserver);
    frameCallbacks[queuedFrameCount]?.(0);

    const canvas = document.getElementById('particles-canvas') as HTMLCanvasElement;
    expect(canvas.width).toBe(160);
    expect(canvas.height).toBe(120);

    frameCallbacks[0]?.(20);

    document.dispatchEvent(new MouseEvent('mousemove', {
      clientX: 80,
      clientY: 40,
    }));

    expect(document.getElementById('cursor-follower')?.style.transform).toContain('translate(80px, 40px)');
    expect(document.getElementById('hero-content')?.style.transform).toContain('translate');

    vi.advanceTimersByTime(1000);
    expect(document.getElementById('time-display')?.textContent).toContain('|');

    unmount();

    expect(window.cancelAnimationFrame).toHaveBeenCalled();
    expect(disconnectResizeObserver).toHaveBeenCalled();
  });

  it('keeps pre-rendered containers intact and supports the legacy initHomeSplash entrypoint', async () => {
    const parent = document.createElement('main');
    const splash = document.createElement('section');
    splash.id = 'home-splash-container';
    parent.append(splash);
    document.body.append(parent);
    const { initHomeSplash, unmount, loadTemplate } = await importHomeDisplay();

    initHomeSplash();
    await flushPromises();
    await flushPromises();

    expect(loadTemplate).not.toHaveBeenCalled();
    expect(parent.firstElementChild).toBe(splash);

    unmount();
  });

  it('does not start the canvas animation when the template has no canvas', async () => {
    vi.resetModules();
    vi.doMock('@/common/utils/viewLoader', () => ({
      loadTemplate: vi.fn(async () => '<div id="home-splash-container"><div id="time-display"></div></div>'),
    }));
    const { mount, unmount } = await import('@/modules/home/homeDisplay');
    const container = document.createElement('main');

    mount(container);
    await flushPromises();
    await flushPromises();

    expect(window.requestAnimationFrame).not.toHaveBeenCalled();

    unmount();
  });

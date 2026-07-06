import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const homeTemplate = `
  <div id="home-splash-container">
    <canvas id="particles-canvas"></canvas>
    <div id="time-display"></div>
    <div id="hero-content">
      <div class="slogan-line highlight">规范流程</div>
      <div class="slogan-line outline">无限可能</div>
      <div class="home-primary-actions" aria-label="首页主入口">
        <button type="button" class="home-primary-action" data-action="switch-tab" data-tab="sops_overview">进入 SOP 流程中心</button>
        <button type="button" class="home-primary-action" data-action="switch-tab" data-tab="app_center_overview">打开应用中心</button>
      </div>
    </div>
    <aside class="floating-workbench" aria-label="应用中心快捷入口">
      <button type="button" class="floating-workbench__trigger" aria-expanded="false"
        aria-controls="home-floating-workbench-actions" aria-label="展开应用中心快捷入口" title="应用中心">
        <i class="fas fa-cubes" aria-hidden="true"></i>
        <span class="sr-only">应用中心</span>
      </button>
      <div id="home-floating-workbench-actions" class="floating-workbench__actions" aria-label="应用中心应用快捷入口"
        aria-hidden="true" inert>
        <button type="button" class="floating-workbench__item" data-action="switch-tab" data-tab="scraper" aria-label="打开 Master Analysis">Master Analysis</button>
        <button type="button" class="floating-workbench__item" data-action="switch-tab" data-tab="playground" aria-label="打开 Playground">Playground</button>
        <button type="button" class="floating-workbench__item" data-action="switch-tab" data-tab="kw_input" aria-label="打开 Keyword Hunter">Keyword Hunter</button>
        <button type="button" class="floating-workbench__item" data-action="switch-tab" data-tab="ppc_search_terms" aria-label="打开 PPC Tools">PPC Tools</button>
      </div>
    </aside>
  </div>
`;

type ResizeObserverCallback = ConstructorParameters<typeof ResizeObserver>[0];

let resizeCallback: ResizeObserverCallback | null = null;
let disconnectResizeObserver: ReturnType<typeof vi.fn>;
let frameCallbacks: FrameRequestCallback[];

function flushPromises(): Promise<void> {
  return new Promise(resolve => {
    queueMicrotask(resolve);
  });
}

async function importHomeDisplay(template = homeTemplate) {
  vi.resetModules();
  const loadTemplate = vi.fn(async () => template);

  vi.doMock('@/common/infrastructure/SafeModuleLoader', () => ({
    SafeTemplateLoader: {
      getInstance: () => ({
        loadTemplate,
      }),
    },
  }));

  const module = await import('@/modules/home/homeDisplay');

  return {
    ...module,
    loadTemplate,
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
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
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
  vi.doUnmock('@/common/infrastructure/SafeModuleLoader');
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it('mounts the full home splash with particles, hero copy, app center shortcuts, and time', async () => {
  const container = document.createElement('main');
  document.body.append(container);
  const { mount, unmount, loadTemplate } = await importHomeDisplay();

  mount(container);
  await flushPromises();
  await flushPromises();

  expect(loadTemplate).toHaveBeenCalledWith('src/modules/home/homeDisplay.html');
  expect(container.querySelector('#home-splash-container')).not.toBeNull();
  expect(container.querySelector('#particles-canvas')).not.toBeNull();
  expect(container.querySelector('#hero-content')).not.toBeNull();
  expect(container.textContent).toContain('规范流程');
  expect(container.textContent).toContain('无限可能');
  expect(container.querySelector('.floating-workbench')).not.toBeNull();
  expect(container.querySelector('.floating-workbench__trigger')?.textContent).toContain(
    '应用中心'
  );
  expect(container.querySelector('.floating-workbench__trigger')).toBeInstanceOf(HTMLButtonElement);
  expect(
    container.querySelector('.floating-workbench__trigger')?.getAttribute('aria-expanded')
  ).toBe('false');
  expect(container.querySelector('.floating-workbench__actions')?.getAttribute('aria-hidden')).toBe(
    'true'
  );
  expect(container.querySelector('.floating-workbench__actions')?.hasAttribute('inert')).toBe(true);
  expect(container.querySelector('#cursor-follower')).toBeNull();
  expect(document.getElementById('time-display')?.textContent).toContain('|');
  expect(frameCallbacks).toHaveLength(1);

  const routeIds = Array.from(container.querySelectorAll<HTMLElement>('[data-action="switch-tab"]'))
    .map(element => element.dataset.tab)
    .filter(Boolean);

  expect(routeIds).toEqual([
    'sops_overview',
    'app_center_overview',
    'scraper',
    'playground',
    'kw_input',
    'ppc_search_terms',
  ]);

  const workbench = container.querySelector<HTMLElement>('.floating-workbench');
  const trigger = container.querySelector<HTMLButtonElement>('.floating-workbench__trigger');
  const actions = container.querySelector<HTMLElement>('.floating-workbench__actions');

  workbench?.dispatchEvent(new MouseEvent('mouseenter'));
  expect(workbench?.classList.contains('is-expanded')).toBe(false);

  trigger?.click();
  expect(workbench?.classList.contains('is-expanded')).toBe(true);
  expect(trigger?.getAttribute('aria-expanded')).toBe('true');
  expect(actions?.getAttribute('aria-hidden')).toBe('false');
  expect(actions?.hasAttribute('inert')).toBe(false);

  container.querySelector<HTMLButtonElement>('[data-tab="ppc_search_terms"]')?.click();
  expect(workbench?.classList.contains('is-expanded')).toBe(false);
  expect(actions?.getAttribute('aria-hidden')).toBe('true');
  expect(actions?.hasAttribute('inert')).toBe(true);

  trigger?.click();
  expect(workbench?.classList.contains('is-expanded')).toBe(true);

  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  expect(workbench?.classList.contains('is-expanded')).toBe(false);

  trigger?.click();
  document.body.click();
  expect(workbench?.classList.contains('is-expanded')).toBe(false);

  const queuedFrameCount = frameCallbacks.length;
  resizeCallback?.(
    [{ contentRect: { width: 160, height: 120 } as DOMRectReadOnly }] as ResizeObserverEntry[],
    {} as ResizeObserver
  );
  frameCallbacks[queuedFrameCount]?.(0);

  const canvas = document.getElementById('particles-canvas') as HTMLCanvasElement;
  expect(canvas.width).toBe(160);
  expect(canvas.height).toBe(120);

  frameCallbacks[0]?.(20);

  document.dispatchEvent(
    new MouseEvent('mousemove', {
      clientX: 80,
      clientY: 40,
    })
  );

  expect(document.getElementById('hero-content')?.getAttribute('style')).toBeNull();

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

it('keeps the clock working when the template has no animation canvas', async () => {
  const container = document.createElement('main');
  document.body.append(container);
  const { mount, unmount } = await importHomeDisplay(
    '<div id="home-splash-container"><div id="time-display"></div></div>'
  );

  mount(container);
  await flushPromises();
  await flushPromises();

  expect(document.getElementById('time-display')?.textContent).toContain('|');
  expect(window.requestAnimationFrame).not.toHaveBeenCalled();

  unmount();
});

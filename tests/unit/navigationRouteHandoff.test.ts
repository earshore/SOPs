import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { ensureViewLoaded, emitAppEvent, setCurrentTab } = vi.hoisted(() => ({
  ensureViewLoaded: vi.fn<() => Promise<void>>(),
  emitAppEvent: vi.fn(),
  setCurrentTab: vi.fn(),
}));

vi.mock('@/stores/useAppStore', () => ({
  appStore: {
    getState: () => ({
      currentTab: '',
      setCurrentTab,
    }),
  },
}));

vi.mock('@/common/config/menuConfig', () => ({
  MENU_CONFIG: {
    sopCategories: [],
    appCategories: [],
    hubCategories: [],
    moreCategories: [],
    modules: {},
  },
  getRoutesByModule: () => [],
  getRouteFullConfig: (routeId: string) => ({
    module: { id: `module-${routeId}`, title: routeId, icon: '', version: '' },
    route: { panelId: `panel-${routeId}` },
    context: { id: `context-${routeId}` },
  }),
}));

vi.mock('@/common/components/SidebarRenderer', () => ({
  createSidebarRenderer: () => ({ render: vi.fn() }),
}));

vi.mock('@/common/utils/viewLoader', () => ({
  ensureViewLoaded,
}));

vi.mock('@/common/constants/eventConstants', () => ({
  APP_EVENTS: { MODULE_UNLOAD: 'module-unload' },
  emitAppEvent,
}));

vi.mock('@/common/ui/utils', () => ({
  getEl: (id: string) => document.getElementById(id),
}));

vi.mock('@/common/ui/notifications', () => ({
  showToast: vi.fn(),
}));

vi.mock('@/common/utils/security', () => ({
  setSafeHtml: vi.fn(),
}));

import { updateUIForRoute } from '@/common/ui/navigation';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => {
    resolve = res;
  });

  return { promise, resolve };
}

describe('updateUIForRoute route handoff', () => {
  beforeEach(() => {
    ensureViewLoaded.mockReset();
    emitAppEvent.mockReset();
    setCurrentTab.mockReset();
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(performance.now());
      return 0;
    });
    document.body.innerHTML = `
      <main id="main-content">
        <section id="panel-first" class="panel">页面 A</section>
        <section id="panel-second" class="panel hidden">页面 B</section>
      </main>
    `;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.replaceChildren();
  });

  it('hides the old panel before the next route view finishes loading', async () => {
    ensureViewLoaded.mockResolvedValueOnce(undefined);
    await updateUIForRoute('first');

    const nextView = deferred<void>();
    ensureViewLoaded.mockReturnValueOnce(nextView.promise);
    const routeChange = updateUIForRoute('second');

    const firstPanel = document.getElementById('panel-first') as HTMLElement;
    const secondPanel = document.getElementById('panel-second') as HTMLElement;
    expect(firstPanel.classList.contains('hidden')).toBe(true);
    expect(secondPanel.classList.contains('hidden')).toBe(true);
    expect(emitAppEvent).toHaveBeenLastCalledWith('module-unload', {
      panelId: 'panel-first',
      nextPanelId: 'panel-second',
    });

    nextView.resolve();
    await routeChange;

    expect(firstPanel.classList.contains('hidden')).toBe(true);
    expect(secondPanel.classList.contains('hidden')).toBe(false);
  });
});

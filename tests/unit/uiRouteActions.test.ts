import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionHandler } from '@/common/utils/actionRegistry';

const mocks = vi.hoisted(() => ({
  actions: {} as Record<string, ActionHandler>,
  closeMegaMenus: vi.fn(),
  navigateTo: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/common/utils/actionRegistry', () => ({
  registerActions: vi.fn((actions: Record<string, ActionHandler>) => {
    mocks.actions = actions;
  }),
}));

vi.mock('@/common/router/initRouter', () => ({
  navigateTo: mocks.navigateTo,
  getRouter: vi.fn(),
  getCurrentRoute: vi.fn(),
  hasRoute: vi.fn(),
}));

vi.mock('@/common/ui/megaMenu', () => ({
  renderMegaMenu: vi.fn(),
  renderMoreMenu: vi.fn(),
  renderHubMegaMenu: vi.fn(),
  renderSopsMegaMenu: vi.fn(),
  initMegaMenuAccessibility: vi.fn(),
  closeMegaMenus: mocks.closeMegaMenus,
}));

vi.mock('@/common/ui/navigation', () => ({
  updateUIForRoute: vi.fn(),
  registerSidebarRenderer: vi.fn(),
  toggleSOPGroup: vi.fn(),
  scrollToSOPModule: vi.fn(),
  scrollToHubModule: vi.fn(),
  scrollToMoreModule: vi.fn(),
}));

vi.mock('@/common/ui/notifications', () => ({
  showToast: vi.fn(),
  showProgress: vi.fn(),
}));

vi.mock('@/common/ui/search', () => ({
  searchSOPs: vi.fn(),
  clearSOPSearch: vi.fn(),
  searchHub: vi.fn(),
  clearHubSearch: vi.fn(),
  searchSidebar: vi.fn(),
  clearSidebarSearch: vi.fn(),
}));

function event(): Event {
  return {
    preventDefault: vi.fn(),
  } as unknown as Event;
}

beforeEach(async () => {
  vi.resetModules();
  mocks.actions = {};
  mocks.closeMegaMenus.mockReset();
  mocks.navigateTo.mockReset().mockResolvedValue(true);
  await import('@/common/ui/index');
});

describe('UI route actions', () => {
  it('navigates switch-tab only for valid route ids', async () => {
    await mocks.actions['switch-tab']?.({ tab: 'ppc_search_terms' }, event());

    expect(mocks.closeMegaMenus).toHaveBeenCalledWith({ blurActive: true });
    expect(mocks.navigateTo).toHaveBeenCalledWith('/app-center/ppc-search-terms');

    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mocks.closeMegaMenus.mockClear();
    mocks.navigateTo.mockClear();

    await mocks.actions['switch-tab']?.({ tab: '__missing__' }, event());

    expect(consoleWarn).toHaveBeenCalledWith(
      '[ActionRegistry] switch-tab ignored unknown routeId:',
      '__missing__'
    );
    expect(mocks.closeMegaMenus).not.toHaveBeenCalled();
    expect(mocks.navigateTo).not.toHaveBeenCalled();
  });
});

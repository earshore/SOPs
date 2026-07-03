import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OverviewRenderer } from '@/common/components/OverviewRenderer';
import {
  SidebarRenderer,
  createSidebarRenderer,
} from '@/common/components/SidebarRenderer';
import {
  MENU_CONFIG,
  getRoutesByModule,
  type CategoryConfig,
  type ModuleConfig,
  type RouteConfig,
} from '@/common/config/menuConfig';
import { appStore } from '@/stores/useAppStore';
import { SystemError } from '@/common/errors/AppError';

const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
const originalMatchMedia = window.matchMedia;

function routesWithCategory(moduleId: string): Array<RouteConfig & { id: string }> {
  return getRoutesByModule(moduleId).filter(route => route.category);
}

function firstRouteInCategory(moduleId: string, categoryId?: string): RouteConfig & { id: string } {
  const route = routesWithCategory(moduleId).find(item => !categoryId || item.category === categoryId);
  if (!route) {
    throw new Error(`No route fixture for module ${moduleId} and category ${categoryId || '*'}`);
  }
  return route;
}

function twoRoutesInDifferentCategories(moduleId: string): Array<RouteConfig & { id: string }> {
  const routes = routesWithCategory(moduleId);
  const first = routes[0];
  const second = routes.find(route => route.category && route.category !== first?.category);
  if (!first || !second) {
    throw new Error(`Expected two route fixtures in different categories for ${moduleId}`);
  }
  return [first, second];
}

beforeEach(() => {
  document.body.innerHTML = '';
  appStore.getState().setCurrentTab('home');
  HTMLElement.prototype.scrollIntoView = vi.fn();
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
  window.matchMedia = originalMatchMedia;
  document.body.innerHTML = '';
});

  it('rejects unknown module ids with a structured error', () => {
    const container = document.createElement('main');

    expect(() => new OverviewRenderer(container, '__missing__')).toThrow(SystemError);
    expect(() => new OverviewRenderer(container, '__missing__')).toThrow('模块配置未找到');
  });

  it('renders categorized overview content with delegated route actions', async () => {
    const container = document.createElement('main');
    const route = firstRouteInCategory('sops');

    const renderer = new OverviewRenderer(container, 'sops', {
      categoryKey: 'sopCategories',
    });
    await renderer.render();

    expect(container.classList.contains('fade-in')).toBe(true);
    expect(container.querySelector('.overview-container')?.getAttribute('data-module')).toBe(
      'sops'
    );
    expect(container.textContent).toContain(MENU_CONFIG.modules.sops.title);
    expect(container.querySelector('#overview-search-input')?.getAttribute('aria-label')).toBe(
      '搜索功能模块'
    );
    expect(
      container
        .querySelector('.category-filter-btn[data-category="all"]')
        ?.getAttribute('aria-pressed')
    ).toBe('true');
    expect(container.querySelector(`[data-tab="${route.id}"]`)).not.toBeNull();
    expect(container.textContent).toContain('功能模块');

    expect(
      container.querySelector<HTMLElement>(`[data-tab="${route.id}"]`)?.dataset.action
    ).toBe('switch-tab');
  });

  it('supports custom guides, alternate layouts, and disabled chrome sections', async () => {
    const listContainer = document.createElement('main');
    const gridContainer = document.createElement('main');

    await new OverviewRenderer(listContainer, 'more_core', {
      customGuide: '<aside id="custom-guide">Custom guide</aside>',
      layout: 'list',
      showFilter: false,
      showStats: false,
      showSearch: false,
    }).render();
    await new OverviewRenderer(gridContainer, 'more_core', {
      layout: 'grid',
      showGuide: false,
      showFilter: false,
      showStats: false,
    }).render();

    expect(listContainer.querySelector('#custom-guide')?.textContent).toBe('Custom guide');
    expect(listContainer.querySelector('#overview-search-input')).toBeNull();
    expect(listContainer.querySelector('.category-filter-btn')).toBeNull();
    expect(listContainer.textContent).not.toContain('功能模块');
    expect(listContainer.querySelector('[data-action="switch-tab"]')).not.toBeNull();
    expect(gridContainer.querySelector('.grid [data-action="switch-tab"]')).not.toBeNull();
  });

  it('filters cards through search and category controls', async () => {
    const container = document.createElement('main');
    const [first, second] = twoRoutesInDifferentCategories('sops');
    await new OverviewRenderer(container, 'sops', {
      categoryKey: 'sopCategories',
    }).render();

    const firstCard = container.querySelector<HTMLElement>(`[data-tab="${first.id}"]`);
    const secondCard = container.querySelector<HTMLElement>(`[data-tab="${second.id}"]`);
    const search = container.querySelector<HTMLInputElement>('#overview-search-input');
    const secondFilter = container.querySelector<HTMLButtonElement>(
      `.category-filter-btn[data-category="${second.category}"]`
    );
    const allFilter = container.querySelector<HTMLButtonElement>(
      '.category-filter-btn[data-category="all"]'
    );

    expect(firstCard).not.toBeNull();
    expect(secondCard).not.toBeNull();
    expect(allFilter?.getAttribute('aria-pressed')).toBe('true');
    expect(secondFilter?.getAttribute('aria-pressed')).toBe('false');

    search!.value = first.label;
    search!.dispatchEvent(new Event('input', { bubbles: true }));
    expect(firstCard!.style.display).toBe('');
    expect(secondCard!.style.display).toBe('none');

    secondFilter!.click();
    expect(secondFilter!.classList.contains('active')).toBe(true);
    expect(secondFilter!.getAttribute('aria-pressed')).toBe('true');
    expect(allFilter!.getAttribute('aria-pressed')).toBe('false');
    expect(firstCard!.style.display).toBe('none');
    expect(secondCard!.style.display).toBe('');

    allFilter!.click();
    expect(allFilter!.getAttribute('aria-pressed')).toBe('true');
    expect(secondFilter!.getAttribute('aria-pressed')).toBe('false');
    expect(firstCard!.style.display).toBe('');
    expect(secondCard!.style.display).toBe('');
  });

  it('scrolls to a category with a temporary highlight', async () => {
    vi.useFakeTimers();
    const container = document.createElement('main');
    const route = firstRouteInCategory('sops');
    const renderer = new OverviewRenderer(container, 'sops', {
      categoryKey: 'sopCategories',
    });
    await renderer.render();

    renderer.scrollToCategory(route.category!);

    const section = container.querySelector<HTMLElement>(`#overview-module-${route.category}`);
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
      inline: 'nearest',
    });
    expect(section?.classList.contains('overview-module-highlight')).toBe(true);

    await vi.advanceTimersByTimeAsync(2000);
    expect(section?.classList.contains('overview-module-highlight')).toBe(false);
    expect(() => renderer.unmount()).not.toThrow();
  });

  it('renders categorized navigation with active state and search controls', () => {
    const sidebar = document.createElement('aside');
    const activeRoute = firstRouteInCategory('sops');
    appStore.getState().setCurrentTab(activeRoute.id);

    const renderer = createSidebarRenderer({
      moduleId: 'sops',
      categories: MENU_CONFIG.sopCategories,
      overviewRouteId: 'sops_overview',
      enableSearch: true,
      searchPlaceholder: '搜索 SOP',
    });
    renderer.render(
      sidebar,
      MENU_CONFIG.modules.sops as ModuleConfig,
      getRoutesByModule('sops')
    );

    expect(sidebar.dataset.moduleId).toBe('sops');
    expect(sidebar.querySelector('#sidebar-search-input')?.getAttribute('placeholder')).toBe(
      '搜索 SOP'
    );
    expect(sidebar.querySelector(`#sidebar-btn-${activeRoute.id}`)?.getAttribute('aria-current')).toBe(
      'page'
    );
    expect(
      sidebar.querySelector<HTMLElement>(
        `.sidebar-category-group[data-category="${activeRoute.category}"] .sidebar-category-children`
      )?.classList.contains('hidden')
    ).toBe(false);
    expect(sidebar.textContent).toContain(MENU_CONFIG.modules.sops.title);
  });

  it('updates existing sidebar markup instead of re-rendering for the same module', () => {
    const sidebar = document.createElement('aside');
    const [first, second] = twoRoutesInDifferentCategories('sops');
    const renderer = new SidebarRenderer({
      moduleId: 'sops',
      categories: MENU_CONFIG.sopCategories,
      overviewRouteId: 'sops_overview',
      enableSearch: false,
    });

    appStore.getState().setCurrentTab(first.id);
    renderer.render(
      sidebar,
      MENU_CONFIG.modules.sops as ModuleConfig,
      getRoutesByModule('sops')
    );
    const originalNav = sidebar.querySelector('#sidebar-nav-container');

    appStore.getState().setCurrentTab(second.id);
    renderer.render(
      sidebar,
      MENU_CONFIG.modules.sops as ModuleConfig,
      getRoutesByModule('sops')
    );

    expect(sidebar.querySelector('#sidebar-nav-container')).toBe(originalNav);
    expect(sidebar.querySelector(`#sidebar-btn-${first.id}`)?.hasAttribute('aria-current')).toBe(
      false
    );
    expect(sidebar.querySelector(`#sidebar-btn-${second.id}`)?.getAttribute('aria-current')).toBe(
      'page'
    );
    expect(sidebar.querySelector('#sidebar-search-input')).toBeNull();
  });

  it('toggles category children with and without reduced motion', async () => {
    vi.useFakeTimers();
    const sidebar = document.createElement('aside');
    const activeRoute = firstRouteInCategory('sops');
    appStore.getState().setCurrentTab(activeRoute.id);
    const renderer = createSidebarRenderer({
      moduleId: 'sops',
      categories: MENU_CONFIG.sopCategories,
      overviewRouteId: 'sops_overview',
    });
    renderer.render(
      sidebar,
      MENU_CONFIG.modules.sops as ModuleConfig,
      getRoutesByModule('sops')
    );

    const button = sidebar.querySelector<HTMLButtonElement>(
      `[data-action="toggle-category"][data-category="${activeRoute.category}"]`
    );
    const children = sidebar.querySelector<HTMLElement>(
      `.sidebar-category-group[data-category="${activeRoute.category}"] .sidebar-category-children`
    );
    const chevron = button?.querySelector<HTMLElement>('.category-chevron');

    button!.click();
    expect(button!.getAttribute('aria-expanded')).toBe('false');
    expect(chevron!.style.transform).toBe('rotate(0deg)');
    await vi.advanceTimersByTimeAsync(200);
    expect(children!.classList.contains('hidden')).toBe(true);

    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as unknown as typeof window.matchMedia;

    button!.click();
    expect(button!.getAttribute('aria-expanded')).toBe('true');
    expect(children!.classList.contains('hidden')).toBe(false);
    expect(chevron!.style.transform).toBe('rotate(180deg)');
  });

  it('falls back to inferred colors and safe defaults', () => {
    const sidebar = document.createElement('aside');
    const renderer = createSidebarRenderer({
      moduleId: 'unknown_child_module',
      categories: {
        empty: {
          id: 'empty',
          label: 'Empty',
          icon: 'fas fa-box',
          color: 'not-a-palette',
          order: 1,
          version: 'v1',
          description: 'No routes',
        } as CategoryConfig,
      },
      overviewRouteId: 'missing_overview',
    });

    renderer.render(sidebar, {
      id: 'unknown_child_module',
      contextId: 'apps',
      title: 'Unknown',
      version: 'v0',
      icon: 'fas fa-question',
      description: 'Unknown module',
      themeColor: 'not-a-theme',
    } as ModuleConfig, []);

    expect(sidebar.querySelector('.sidebar-shell')?.getAttribute('style')).toContain(
      '--sidebar-primary'
    );
    expect(sidebar.textContent).toContain('总览');
    expect(sidebar.textContent).toContain('0 项');
  });

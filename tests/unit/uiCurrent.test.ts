import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MENU_CONFIG } from '@/common/config/menuConfig';
import { appStore } from '@/stores/useAppStore';
import { showProgress, showToast } from '@/common/ui/notifications';
import { getEl, getErrorSummary, sleep } from '@/common/ui/utils';
import {
  clearHubSearch,
  clearSOPSearch,
  clearSidebarSearch,
  searchHub,
  searchSOPs,
  searchSidebar,
} from '@/common/ui/search';
import {
  closeMegaMenus,
  initMegaMenuAccessibility,
  renderHubMegaMenu,
  renderMegaMenu,
  renderMoreMenu,
  renderSopsMegaMenu,
} from '@/common/ui/megaMenu';
import {
  scrollToHubModule,
  scrollToMoreModule,
  scrollToSOPModule,
  toggleSOPGroup,
} from '@/common/ui/navigation';

const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;

function routeForModule(moduleId: string): [string, { label: string; category?: string }] {
  const entry = Object.entries(MENU_CONFIG.routes).find(
    ([, route]) => route.moduleId === moduleId && !!route.label
  );
  if (!entry) {
    throw new Error(`Missing route fixture for module: ${moduleId}`);
  }
  return entry as [string, { label: string; category?: string }];
}

function setupSearchDom(): void {
  document.body.innerHTML = `
    <input id="sop-search-input" value="old" />
    <section id="sop-search-results" class="hidden"></section>
    <nav id="sop-nav-container"></nav>
    <button id="sop-search-clear" class="hidden"></button>

    <input id="hub-search-input" value="old" />
    <section id="hub-search-results" class="hidden"></section>
    <nav id="hub-nav-container"></nav>
    <button id="hub-search-clear" class="hidden"></button>

    <input id="sidebar-search-input" value="old" />
    <section id="sidebar-search-results" class="hidden"></section>
    <nav id="sidebar-nav-container"></nav>
    <button id="sidebar-search-clear" class="hidden"></button>
  `;
}

beforeEach(() => {
  document.body.innerHTML = '';
  appStore.getState().setCurrentTab('home');
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
  document.body.innerHTML = '';
});

describe('current UI notifications and utilities', () => {
  it('renders toast title, description, type icon, and timed removal', async () => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="toast-container"></div>';

    showToast('Saved', {
      type: 'success',
      description: 'Changes persisted',
      duration: 25,
    });

    const container = getEl('toast-container');
    const toast = container?.querySelector('.toast');
    expect(toast).not.toBeNull();
    expect(container?.getAttribute('role')).toBe('status');
    expect(container?.getAttribute('aria-live')).toBe('polite');
    expect(container?.getAttribute('aria-atomic')).toBe('false');
    expect(toast?.getAttribute('role')).toBe('status');
    expect(toast?.getAttribute('aria-live')).toBe('polite');
    expect(toast?.getAttribute('aria-atomic')).toBe('true');
    expect(toast?.className).toContain('toast-success');
    expect(toast?.querySelector('i')?.className).toContain('fa-circle-check');
    expect(toast?.textContent).toContain('Saved');
    expect(toast?.textContent).toContain('Changes persisted');

    await vi.advanceTimersByTimeAsync(25);
    expect(toast?.classList.contains('toast-slide-out')).toBe(true);
    await vi.advanceTimersByTimeAsync(400);
    expect(container?.children).toHaveLength(0);
  });

  it('announces error toasts assertively without changing the container contract', () => {
    document.body.innerHTML = '<div id="toast-container"></div>';

    showToast('Failed', {
      type: 'error',
      description: 'Please retry',
      duration: 1000,
    });

    const container = getEl('toast-container');
    const toast = container?.querySelector('.toast');

    expect(container?.getAttribute('role')).toBe('status');
    expect(container?.getAttribute('aria-live')).toBe('polite');
    expect(container?.getAttribute('aria-atomic')).toBe('false');
    expect(toast?.getAttribute('role')).toBe('alert');
    expect(toast?.getAttribute('aria-live')).toBe('assertive');
    expect(toast?.getAttribute('aria-atomic')).toBe('true');
    expect(toast?.className).toContain('toast-error');
    expect(toast?.querySelector('i')?.className).toContain('fa-circle-xmark');
    expect(toast?.textContent).toContain('Failed');
    expect(toast?.textContent).toContain('Please retry');
  });

  it('handles missing toast container and clamps progress percentages', () => {
    expect(() => showToast('No container')).not.toThrow();

    document.body.innerHTML = `
      <div id="global-progress" class="hidden"></div>
      <progress id="progress-fill" value="0" max="100"></progress>
    `;

    showProgress(true, 120);
    expect(getEl('global-progress')?.classList.contains('hidden')).toBe(false);
    expect(getEl('global-progress')?.getAttribute('role')).toBe('progressbar');
    expect(getEl('global-progress')?.getAttribute('aria-valuenow')).toBe('100');
    expect(getEl('global-progress')?.getAttribute('aria-hidden')).toBe('false');
    expect(getEl('progress-fill')?.getAttribute('value')).toBe('100');

    showProgress(true, -10);
    expect(getEl('global-progress')?.getAttribute('aria-valuenow')).toBe('0');
    expect(getEl('progress-fill')?.getAttribute('value')).toBe('0');

    showProgress(false);
    expect(getEl('global-progress')?.classList.contains('hidden')).toBe(true);
    expect(getEl('global-progress')?.getAttribute('aria-hidden')).toBe('true');
    expect(getEl('global-progress')?.getAttribute('aria-valuenow')).toBe('0');
    expect(getEl('progress-fill')?.getAttribute('value')).toBe('0');
  });

  it('summarizes known and unknown errors and resolves sleep after the delay', async () => {
    vi.useFakeTimers();
    let resolved = false;
    const promise = sleep(100).then(() => {
      resolved = true;
    });

    expect(getErrorSummary('HTTP 404')).toContain('页面未找到');
    expect(getErrorSummary('network disconnected')).toContain('网络连接失败');
    expect(getErrorSummary('')).toBe('未知错误');
    expect(getErrorSummary('x'.repeat(80))).toHaveLength(50);
    expect(resolved).toBe(false);

    await vi.advanceTimersByTimeAsync(100);
    await promise;
    expect(resolved).toBe(true);
  });
});

describe('current UI search helpers', () => {
  it('searches SOP routes, invokes clear callback from result click, and resets the view', () => {
    setupSearchDom();
    const [routeId, route] = routeForModule('sops');
    searchSOPs(route.label);

    const result = getEl('sop-search-results')?.querySelector<HTMLButtonElement>(
      `[data-tab="${routeId}"]`
    );
    expect(result).not.toBeNull();
    expect(result?.dataset.clearSearch).toBe('sop');
    expect(getEl('sop-search-results')?.classList.contains('hidden')).toBe(false);
    expect(getEl('sop-search-results')?.getAttribute('aria-hidden')).toBe('false');
    expect(getEl('sop-nav-container')?.classList.contains('hidden')).toBe(true);
    expect(getEl('sop-nav-container')?.getAttribute('aria-hidden')).toBe('true');

    result?.click();

    clearSOPSearch();
    expect((getEl('sop-search-input') as HTMLInputElement).value).toBe('');
    expect(getEl('sop-search-results')?.classList.contains('hidden')).toBe(true);
    expect(getEl('sop-search-results')?.getAttribute('aria-hidden')).toBe('true');
    expect(getEl('sop-nav-container')?.classList.contains('hidden')).toBe(false);
    expect(getEl('sop-nav-container')?.getAttribute('aria-hidden')).toBe('false');
    expect(getEl('sop-search-clear')?.classList.contains('hidden')).toBe(true);
  });

  it('renders empty Hub results and resets Hub search', () => {
    setupSearchDom();

    searchHub('__no_match__');
    expect(getEl('hub-search-results')?.textContent).toContain('未找到匹配的内容');
    expect(getEl('hub-search-results')?.classList.contains('hidden')).toBe(false);
    expect(getEl('hub-search-results')?.getAttribute('aria-hidden')).toBe('false');
    expect(getEl('hub-nav-container')?.getAttribute('aria-hidden')).toBe('true');

    clearHubSearch();
    expect((getEl('hub-search-input') as HTMLInputElement).value).toBe('');
    expect(getEl('hub-search-results')?.classList.contains('hidden')).toBe(true);
    expect(getEl('hub-search-results')?.getAttribute('aria-hidden')).toBe('true');
    expect(getEl('hub-nav-container')?.classList.contains('hidden')).toBe(false);
    expect(getEl('hub-nav-container')?.getAttribute('aria-hidden')).toBe('false');
  });

  it('searches the current sidebar module and clears sidebar search', () => {
    setupSearchDom();
    const [routeId, route] = routeForModule('app_center');
    appStore.getState().setCurrentTab(routeId);

    searchSidebar(route.label.slice(0, Math.max(1, Math.min(2, route.label.length))));

    const result = getEl('sidebar-search-results')?.querySelector<HTMLButtonElement>(
      `[data-tab="${routeId}"]`
    );
    expect(result).not.toBeNull();
    expect(result?.dataset.clearSearch).toBe('sidebar');
    expect(getEl('sidebar-search-clear')?.classList.contains('hidden')).toBe(false);
    expect(getEl('sidebar-search-results')?.getAttribute('aria-hidden')).toBe('false');
    expect(getEl('sidebar-nav-container')?.getAttribute('aria-hidden')).toBe('true');

    result?.click();

    clearSidebarSearch();
    expect((getEl('sidebar-search-input') as HTMLInputElement).value).toBe('');
    expect(getEl('sidebar-search-results')?.classList.contains('hidden')).toBe(true);
    expect(getEl('sidebar-search-results')?.getAttribute('aria-hidden')).toBe('true');
    expect(getEl('sidebar-nav-container')?.classList.contains('hidden')).toBe(false);
    expect(getEl('sidebar-nav-container')?.getAttribute('aria-hidden')).toBe('false');
  });

  it('handles blank or incomplete sidebar search DOM without throwing', () => {
    setupSearchDom();
    searchSidebar('');
    expect(getEl('sidebar-search-results')?.classList.contains('hidden')).toBe(true);
    expect(getEl('sidebar-search-results')?.getAttribute('aria-hidden')).toBe('true');
    expect(getEl('sidebar-nav-container')?.classList.contains('hidden')).toBe(false);
    expect(getEl('sidebar-nav-container')?.getAttribute('aria-hidden')).toBe('false');

    document.body.innerHTML = '';
    expect(() => searchSidebar('anything')).not.toThrow();
    expect(() => searchSOPs('anything')).not.toThrow();
    expect(() => searchHub('anything')).not.toThrow();
  });
});

describe('current UI mega menu helpers', () => {
  it('renders configured mega menu containers', () => {
    document.body.innerHTML = `
      <section id="mega-menu-content"></section>
      <section id="sops-mega-menu-content"></section>
      <section id="hub-mega-menu-content"></section>
      <section id="more-menu-content"></section>
    `;

    renderMegaMenu();
    renderSopsMegaMenu();
    renderHubMegaMenu();

    // Dark-mode jag fix: no hard white rings on gradient icon tiles
    const apps = document.getElementById('mega-menu-content');
    expect(apps?.innerHTML ?? '').toContain('mega-menu-card-icon');
    expect(apps?.innerHTML ?? '').not.toContain('ring-white/50');
    expect(apps?.innerHTML ?? '').toContain('mega-menu-card-icon__glyph');
    renderMoreMenu();

    expect(getEl('mega-menu-content')?.querySelector('[data-action="switch-tab"]')).not.toBeNull();
    expect(getEl('sops-mega-menu-content')?.textContent).toContain('SOP 总览');
    expect(getEl('hub-mega-menu-content')?.textContent).toContain('智库总览');
    expect(getEl('more-menu-content')?.textContent).toContain('更多总览');
  });

  it('toggles mega menu accessibility state from mouse, keyboard, and document events', async () => {
    vi.useFakeTimers();
    document.body.innerHTML = `
      <div class="nav-group">
        <button class="nav-trigger" aria-expanded="true">Apps</button>
        <div class="mega-menu" aria-hidden="false">
          <div class="mega-menu-inner">
            <a id="menu-action" href="#page-a" data-action="switch-tab" data-tab="page-a">Page A</a>
          </div>
        </div>
      </div>
      <button id="outside">Outside</button>
    `;
    const group = document.querySelector<HTMLElement>('.nav-group');
    const trigger = document.querySelector<HTMLButtonElement>('.nav-trigger');
    const menu = document.querySelector<HTMLElement>('.mega-menu');
    const action = document.querySelector<HTMLAnchorElement>('#menu-action');
    const actionClick = vi.fn();
    action?.addEventListener('click', actionClick);

    initMegaMenuAccessibility();
    expect(trigger?.id).toBe('nav-trigger-1');
    expect(menu?.id).toBe('nav-trigger-1-menu');
    expect(trigger?.getAttribute('aria-controls')).toBe('nav-trigger-1-menu');
    expect(menu?.getAttribute('aria-labelledby')).toBe('nav-trigger-1');
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');
    expect(menu?.getAttribute('aria-hidden')).toBe('true');
    expect(menu?.hasAttribute('inert')).toBe(true);

    group?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    expect(group?.classList.contains('is-open')).toBe(true);
    expect(trigger?.getAttribute('aria-expanded')).toBe('true');
    expect(menu?.hasAttribute('inert')).toBe(false);

    const openClick = new MouseEvent('click', { bubbles: true, cancelable: true });
    expect(action?.dispatchEvent(openClick)).toBe(true);
    expect(openClick.defaultPrevented).toBe(false);
    expect(actionClick).toHaveBeenCalledTimes(1);

    trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(group?.classList.contains('is-open')).toBe(true);

    trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(group?.classList.contains('is-open')).toBe(false);
    expect(menu?.hasAttribute('inert')).toBe(true);

    const hiddenClick = new MouseEvent('click', { bubbles: true, cancelable: true });
    expect(action?.dispatchEvent(hiddenClick)).toBe(false);
    expect(hiddenClick.defaultPrevented).toBe(true);
    expect(actionClick).toHaveBeenCalledTimes(1);

    trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    group?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(group?.classList.contains('is-open')).toBe(false);

    group?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    getEl('outside')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(group?.classList.contains('is-open')).toBe(false);

    group?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    closeMegaMenus({ blurActive: true });
    expect(group?.classList.contains('is-open')).toBe(false);
  });
});

describe('current UI mega menu sibling and CSS safeguards', () => {
  it('keeps only one mega menu expanded across sibling nav groups', () => {
    document.body.innerHTML = `
      <div class="nav-group" id="group-a">
        <button class="nav-trigger" type="button">Apps</button>
        <div class="mega-menu">
          <a href="#page-a" data-action="switch-tab" data-tab="page-a">Page A</a>
        </div>
      </div>
      <div class="nav-group" id="group-b">
        <button class="nav-trigger" type="button">SOPs</button>
        <div class="mega-menu">
          <a href="#page-b" data-action="switch-tab" data-tab="page-b">Page B</a>
        </div>
      </div>
    `;

    const groupA = getEl('group-a') as HTMLElement;
    const groupB = getEl('group-b') as HTMLElement;
    const triggerA = groupA.querySelector<HTMLButtonElement>('.nav-trigger');
    const triggerB = groupB.querySelector<HTMLButtonElement>('.nav-trigger');
    const menuA = groupA.querySelector<HTMLElement>('.mega-menu');
    const menuB = groupB.querySelector<HTMLElement>('.mega-menu');

    initMegaMenuAccessibility();

    expect(triggerA?.getAttribute('aria-controls')).toBe(menuA?.id);
    expect(menuA?.getAttribute('aria-labelledby')).toBe(triggerA?.id);
    expect(triggerB?.getAttribute('aria-controls')).toBe(menuB?.id);
    expect(menuB?.getAttribute('aria-labelledby')).toBe(triggerB?.id);

    triggerA?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(triggerA?.getAttribute('aria-expanded')).toBe('true');
    expect(menuA?.getAttribute('aria-hidden')).toBe('false');
    expect(menuA?.hasAttribute('inert')).toBe(false);

    triggerB?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(triggerA?.getAttribute('aria-expanded')).toBe('false');
    expect(menuA?.getAttribute('aria-hidden')).toBe('true');
    expect(menuA?.hasAttribute('inert')).toBe(true);
    expect(triggerB?.getAttribute('aria-expanded')).toBe('true');
    expect(menuB?.getAttribute('aria-hidden')).toBe('false');
    expect(menuB?.hasAttribute('inert')).toBe(false);
  });

  it('keeps mega menu visibility controlled by is-open instead of CSS hover', () => {
    const cssFiles = ['src/css/critical.css', 'src/css/components/header-main.css'];

    cssFiles.forEach(file => {
      const css = readFileSync(file, 'utf8');
      expect(css).not.toMatch(/\.nav-group:hover\s+\.mega-menu/);
      expect(css).toMatch(/\.nav-group\.is-open\s+\.mega-menu/);
      expect(css).toMatch(/\.nav-group:not\(\.is-open\)\s+\.mega-menu \*/);
    });
  });

  it('keeps AMZ Hub module-container overflow scoped to its own panel', () => {
    const css = readFileSync('src/modules/amz_hub/amz_hub_style.css', 'utf8');

    expect(css).toContain('#amz_hub_content_area .module-container');
    expect(css).not.toMatch(/(^|\n)\.module-container\s*\{\s*overflow:\s*visible\s*!important;/);
  });
});

describe('current UI navigation helpers', () => {
  it('toggles SOP groups and scrolls module sections with temporary highlights', async () => {
    vi.useFakeTimers();
    const scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    document.body.innerHTML = `
      <div id="sop-group-growth" class="hidden"></div>
      <i id="sop-chevron-growth"></i>
      <section id="sop-module-growth"></section>
      <section id="hub-module-research"></section>
      <section id="more-module-tools"></section>
    `;

    toggleSOPGroup({ category: 'growth' });
    expect(getEl('sop-group-growth')?.classList.contains('hidden')).toBe(false);
    expect(getEl('sop-chevron-growth')?.classList.contains('rotate-180')).toBe(true);

    scrollToSOPModule('growth');
    scrollToHubModule('research');
    scrollToMoreModule('tools');

    expect(scrollIntoView).toHaveBeenCalledTimes(3);
    expect(getEl('sop-module-growth')?.classList.contains('sop-module-highlight')).toBe(true);
    expect(getEl('hub-module-research')?.classList.contains('hub-module-highlight')).toBe(true);
    expect(getEl('more-module-tools')?.classList.contains('more-module-highlight')).toBe(true);

    await vi.advanceTimersByTimeAsync(2000);
    expect(getEl('sop-module-growth')?.classList.contains('sop-module-highlight')).toBe(false);
    expect(getEl('hub-module-research')?.classList.contains('hub-module-highlight')).toBe(false);
    expect(getEl('more-module-tools')?.classList.contains('more-module-highlight')).toBe(false);
  });

  it('ignores empty navigation helper inputs', () => {
    document.body.innerHTML = '';

    expect(() => toggleSOPGroup({ category: '' })).not.toThrow();
    expect(() => scrollToSOPModule('')).not.toThrow();
    expect(() => scrollToHubModule('')).not.toThrow();
    expect(() => scrollToMoreModule('')).not.toThrow();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prepareUIForRoute, updateUIForRoute } from '@/common/ui/navigation';
import { ensureViewLoaded } from '@/common/utils/viewLoader';

vi.mock('@/common/utils/viewLoader', () => ({
  ensureViewLoaded: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/common/ui/notifications', () => ({
  showToast: vi.fn(),
}));

describe('navigation page enter animation', () => {
  beforeEach(() => {
    document.body.className = '';
    document.body.innerHTML = `
      <div id="dynamic-sidebar" class="hidden -ml-64"></div>
      <button id="nav-sops" class="nav-trigger text-slate-600 border-transparent"></button>
      <button id="nav-app_center" class="nav-trigger text-slate-600 border-transparent"></button>
      <main id="main-content" class="app-shell-pending p-8 bg-gradient-to-b"></main>
      <div id="panel-home" class="panel hidden"></div>
      <div id="panel-sops" class="panel hidden"></div>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    document.body.className = '';
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('shows the home panel without delaying first-screen content', async () => {
    const homePanel = document.getElementById('panel-home') as HTMLElement;

    await updateUIForRoute('home');

    expect(ensureViewLoaded).toHaveBeenCalledWith('home');
    expect(homePanel.classList.contains('hidden')).toBe(false);
    expect(homePanel.classList.contains('view-fade-in-initial')).toBe(false);
    expect(homePanel.classList.contains('view-fade-in')).toBe(false);
    expect(document.body.classList.contains('home-shell-active')).toBe(false);
  });

  it('shows another panel without applying the immersive home shell state', async () => {
    await updateUIForRoute('sops_overview');

    expect(document.getElementById('panel-sops')?.classList.contains('hidden')).toBe(false);
    expect(document.body.classList.contains('home-shell-active')).toBe(false);
  });

  it('loads the route view once while preserving the page enter sequence', async () => {
    const mainContent = document.getElementById('main-content') as HTMLElement;
    const routePanel = document.getElementById('panel-sops') as HTMLElement;
    const requestAnimationFrame = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation(callback => {
        callback(0);
        return 1;
      });

    await updateUIForRoute('sops_overview');

    expect(ensureViewLoaded).toHaveBeenCalledOnce();
    expect(ensureViewLoaded).toHaveBeenCalledWith('sops_overview');
    expect(requestAnimationFrame).toHaveBeenCalledTimes(2);
    expect(routePanel.classList.contains('hidden')).toBe(false);
    expect(mainContent.classList.contains('app-shell-pending')).toBe(false);
  });

  it('marks the active top-level PC navigation item for orientation', async () => {
    const sopsNav = document.getElementById('nav-sops') as HTMLElement;
    const appCenterNav = document.getElementById('nav-app_center') as HTMLElement;

    await updateUIForRoute('sops_overview');

    expect(sopsNav.getAttribute('aria-current')).toBe('page');
    expect(sopsNav.classList.contains('text-blue-700')).toBe(true);
    expect(sopsNav.classList.contains('border-blue-600')).toBe(true);
    expect(appCenterNav.hasAttribute('aria-current')).toBe(false);
    expect(appCenterNav.classList.contains('border-transparent')).toBe(true);
  });

  it('reveals main content after the route layout is stable', async () => {
    const mainContent = document.getElementById('main-content') as HTMLElement;

    await updateUIForRoute('sops_overview');

    expect(mainContent.classList.contains('app-shell-pending')).toBe(false);
  });

  it('stabilizes the sidebar before revealing initial route content', () => {
    const mainContent = document.getElementById('main-content') as HTMLElement;
    const sidebar = document.getElementById('dynamic-sidebar') as HTMLElement;

    prepareUIForRoute('sops_overview');

    expect(sidebar.classList.contains('hidden')).toBe(false);
    expect(sidebar.classList.contains('-ml-64')).toBe(false);
    expect(mainContent.classList.contains('app-shell-pending')).toBe(false);
  });

  it('reveals main content when route loading fails', async () => {
    const mainContent = document.getElementById('main-content') as HTMLElement;
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(ensureViewLoaded).mockRejectedValueOnce(new Error('route failed'));

    await expect(updateUIForRoute('sops_overview')).rejects.toThrow('route failed');

    expect(mainContent.classList.contains('app-shell-pending')).toBe(false);
  });
});

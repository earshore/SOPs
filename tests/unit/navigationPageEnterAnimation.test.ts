import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { updateUIForRoute } from '@/common/ui/navigation';
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
      <div id="dynamic-sidebar"></div>
      <button id="nav-sops" class="nav-trigger text-slate-600 border-transparent"></button>
      <button id="nav-app_center" class="nav-trigger text-slate-600 border-transparent"></button>
      <main id="main-content" class="p-8 bg-gradient-to-b"></main>
      <div id="panel-home" class="panel hidden"></div>
      <div id="panel-sops" class="panel hidden"></div>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    document.body.className = '';
    vi.clearAllMocks();
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

  it('marks the active top-level PC navigation item for orientation', async () => {
    const sopsNav = document.getElementById('nav-sops') as HTMLElement;
    const appCenterNav = document.getElementById('nav-app_center') as HTMLElement;

    await updateUIForRoute('sops_overview');

    expect(sopsNav.getAttribute('aria-current')).toBe('page');
    expect(sopsNav.classList.contains('text-blue-600')).toBe(true);
    expect(sopsNav.classList.contains('border-blue-600')).toBe(true);
    expect(appCenterNav.hasAttribute('aria-current')).toBe(false);
    expect(appCenterNav.classList.contains('border-transparent')).toBe(true);
  });
});

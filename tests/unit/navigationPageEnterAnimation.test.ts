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
});

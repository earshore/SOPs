import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { updateUIForRoute } from '@/common/ui/navigation';
import { ensureViewLoaded } from '@/common/utils/viewLoader';

vi.mock('@/common/utils/viewLoader', () => ({
  ensureViewLoaded: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('@/common/ui/notifications', () => ({
  showToast: vi.fn()
}));

describe('navigation page enter animation', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="dynamic-sidebar"></div>
      <div id="panel-home" class="panel hidden"></div>
      <div id="panel-sops" class="panel hidden"></div>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('applies the page enter animation when the home panel is shown', async () => {
    const homePanel = document.getElementById('panel-home') as HTMLElement;

    await updateUIForRoute('home');

    expect(ensureViewLoaded).toHaveBeenCalledWith('home');
    expect(homePanel.classList.contains('hidden')).toBe(false);
    expect(homePanel.classList.contains('view-fade-in-initial')).toBe(true);
    expect(homePanel.classList.contains('view-fade-in')).toBe(true);
  });
});

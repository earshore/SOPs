import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, unmount } from './index';

describe('promo tools module', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    unmount();
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it('renders navigation and static content blocks', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    await mount(container);

    expect(container.classList.contains('fade-in')).toBe(true);
    expect(container.querySelectorAll('.amzpt_nav_step').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.amzpt_card').length).toBeGreaterThan(0);
    expect(container.querySelector('.amzpt_table')).not.toBeNull();
    expect(container.querySelector('.amzpt_tag')).not.toBeNull();
    expect(container.querySelector('.amzpt_check_item--done')).not.toBeNull();
  });
});

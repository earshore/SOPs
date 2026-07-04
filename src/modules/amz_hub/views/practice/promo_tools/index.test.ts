import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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

  it('renders comparison tables as named keyboard-scrollable regions', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    await mount(container);

    const wrappers = Array.from(container.querySelectorAll<HTMLElement>('.amzpt_table_wrapper'));
    const tables = Array.from(container.querySelectorAll<HTMLTableElement>('.amzpt_table'));

    expect(wrappers.length).toBeGreaterThan(0);
    expect(tables).toHaveLength(wrappers.length);

    wrappers.forEach(wrapper => {
      const descriptionId = wrapper.getAttribute('aria-describedby');
      expect(wrapper.getAttribute('role')).toBe('region');
      expect(wrapper.getAttribute('aria-label')).toContain('对比表');
      expect(wrapper.getAttribute('tabindex')).toBe('0');
      expect(descriptionId).toBeTruthy();
      expect(container.querySelector(`#${descriptionId}`)?.textContent).toContain('横向滚动');
    });

    tables.forEach(table => {
      expect(table.querySelector('caption')?.textContent).toContain('对比表');
      expect(
        Array.from(table.querySelectorAll<HTMLTableCellElement>('thead th')).every(
          th => th.scope === 'col'
        )
      ).toBe(true);
      expect(
        Array.from(table.querySelectorAll('tbody tr')).every(row =>
          row.querySelector('th[scope="row"]')
        )
      ).toBe(true);
    });
  });

  it('keeps comparison tables wide enough and resilient to long terms', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'src/modules/amz_hub/views/practice/promo_tools/styles.css'),
      'utf8'
    );

    expect(css).toContain('min-width: 900px');
    expect(css).toContain('overflow-wrap: anywhere');
  });
});

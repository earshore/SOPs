import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';
import { loadTemplate } from '@/common/utils/viewLoader';
import { mount, unmount } from '@/modules/sops/views/overview/index';

const realOverviewTemplatePath = join(cwd(), 'src/modules/sops/views/overview/template.html');

const overviewTemplate = `
  <div class="sops-overview">
    <button class="category-filter-btn active bg-blue-500 text-white hover:bg-blue-600" data-category="all"></button>
    <button class="category-filter-btn bg-white text-slate-700 border-slate-300" data-category="growth"></button>
    <section data-category="growth"></section>
    <section data-category="backend"></section>
    <div class="sop-card" data-category="growth"><h3>Listing</h3><p>SEO</p></div>
  </div>
`;

vi.mock('@/common/utils/viewLoader', () => ({
  loadTemplate: vi.fn(),
}));

describe('SOPs Overview', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    vi.mocked(loadTemplate).mockResolvedValue(overviewTemplate);
  });

  afterEach(() => {
    unmount();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('renders the overview template on mount', async () => {
    await mount(container);

    expect(loadTemplate).toHaveBeenCalledWith('src/modules/sops/views/overview/template.html');
    expect(container.querySelector('.sops-overview')).not.toBeNull();
  });

  it('filters overview sections by category', async () => {
    await mount(container);
    container.querySelector<HTMLButtonElement>('[data-category="growth"]')?.click();

    expect((container.querySelector('section[data-category="growth"]') as HTMLElement).style.display).toBe('');
    expect((container.querySelector('section[data-category="backend"]') as HTMLElement).style.display).toBe('none');
  });

  it('does not include local pilot usage metrics on the real overview page', () => {
    const html = readFileSync(realOverviewTemplatePath, 'utf8');

    expect(html).not.toContain('本地试运行计数');
    expect(html).not.toContain('data-ops-metric-count');
    expect(html).not.toContain('data-ops-metric-last');
  });
});

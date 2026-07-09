import { readFileSync } from 'node:fs';
import { beforeEach, expect, it, vi } from 'vitest';
import { mount, unmount } from '@/modules/more/views/explore/prompts';
import { showToast } from '@/common/ui';

const promptMocks = vi.hoisted(() => {
  const template = `
    <section>
      <input id="prompt-search" />
      <div id="category-container"></div>
      <div id="prompt-list"></div>
      <app-modal id="prompt-detail-modal" class="hidden" title="提示词详情" size="full" no-header>
        <div slot="body">
          <h2 id="modal-prompt-title"></h2>
          <span id="modal-prompt-category"></span>
          <span id="modal-prompt-model"></span>
          <p id="modal-prompt-description"></p>
          <button data-prompt-modal-action="close"></button>
          <button data-prompt-modal-action="copy"></button>
          <button data-prompt-lang="zh" data-lang="zh" class="lang-btn"></button>
          <button data-prompt-lang="en" data-lang="en" class="lang-btn"></button>
          <pre id="modal-prompt-content"></pre>
        </div>
      </app-modal>
    </section>
  `;

  return {
    loadTemplate: vi.fn(async () => template),
    showToast: vi.fn(),
    writeText: vi.fn(),
  };
});

vi.mock('@/common/infrastructure/SafeModuleLoader', () => ({
  SafeTemplateLoader: {
    getInstance: () => ({
      loadTemplate: promptMocks.loadTemplate,
    }),
  },
}));

vi.mock('@/common/ui', () => ({
  showToast: promptMocks.showToast,
}));

function click(element: Element | null): void {
  expect(element).not.toBeNull();
  element?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

async function mountPrompts(): Promise<HTMLElement> {
  const container = document.createElement('section');
  document.body.appendChild(container);
  await mount(container);
  return container;
}

beforeEach(() => {
  document.body.innerHTML = '';
  promptMocks.loadTemplate.mockClear();
  promptMocks.showToast.mockClear();
  promptMocks.writeText.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: promptMocks.writeText },
  });
  unmount();
});

  it('keeps prompt detail template buttons explicit about non-submit behavior', () => {
    const template = readFileSync('src/modules/more/views/explore/prompts/template.html', 'utf8');
    const buttonOpenings = template.match(/<button\b[^>]*>/g) ?? [];
    const implicitButtons = buttonOpenings.filter(
      (button) => !/\btype\s*=|:type\s*=|x-bind:type\s*=/.test(button)
    );

    expect(buttonOpenings).toHaveLength(5);
    expect(implicitButtons).toEqual([]);
  });

  it('mounts template content, renders categories, and lists prompt cards', async () => {
    const container = await mountPrompts();

    expect(promptMocks.loadTemplate).toHaveBeenCalledWith(
      'src/modules/more/views/explore/prompts/template.html'
    );
    expect(container.classList.contains('fade-in')).toBe(true);
    expect(container.querySelector('#category-container')?.textContent).toContain('全部');
    expect(container.querySelectorAll('.category-btn').length).toBeGreaterThan(1);
    expect(container.querySelectorAll('.prompt-card').length).toBeGreaterThan(0);
    expect(container.querySelector('.prompt-card .btn-icon[title="查看详情"]')).not.toBeNull();
  });

  it('filters prompt cards by search text and shows an empty state', async () => {
    const container = await mountPrompts();
    const search = container.querySelector<HTMLInputElement>('#prompt-search');
    const initialCount = container.querySelectorAll('.prompt-card').length;

    expect(search).not.toBeNull();
    search!.value = 'zzzz-not-found';
    search!.dispatchEvent(new Event('input', { bubbles: true }));

    expect(container.querySelectorAll('.prompt-card')).toHaveLength(0);
    expect(container.querySelector('#prompt-list')?.textContent).toContain('未找到匹配的提示词');
    expect(container.querySelector('#prompt-list')?.textContent).toContain(
      '推荐操作：清空搜索、切回“全部”分类，或使用更短关键词重试。'
    );
    expect(container.querySelector('#prompt-list [role="status"]')).not.toBeNull();

    search!.value = 'listing';
    search!.dispatchEvent(new Event('input', { bubbles: true }));

    expect(container.querySelectorAll('.prompt-card').length).toBeLessThanOrEqual(initialCount);
  });

  it('switches categories and updates active button state', async () => {
    const container = await mountPrompts();
    const category = container.querySelector<HTMLElement>('.category-btn:not([data-category="all"])');

    click(category);

    expect(category?.classList.contains('active')).toBe(true);
    expect(category?.getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelector('.category-btn[data-category="all"]')?.getAttribute('aria-pressed')).toBe('false');
  });

  it('opens, updates, copies, and closes the prompt detail modal', async () => {
    const container = await mountPrompts();
    const firstCard = container.querySelector<HTMLElement>('.prompt-card[data-prompt-id]');
    const promptId = firstCard?.dataset.promptId;

    click(firstCard);

    const modal = document.body.querySelector<HTMLElement>('#prompt-detail-modal');
    const panel = modal?.shadowRoot?.querySelector<HTMLElement>('[role="dialog"]');
    expect(modal?.tagName.toLowerCase()).toBe('app-modal');
    expect(modal?.classList.contains('hidden')).toBe(false);
    expect(panel?.getAttribute('aria-modal')).toBe('true');
    expect(panel?.getAttribute('aria-label')).toBe(document.body.querySelector('#modal-prompt-title')?.textContent);
    expect(document.body.querySelector('#modal-prompt-title')?.textContent).not.toBe('');
    expect(document.body.querySelector('#modal-prompt-content')?.textContent).not.toBe('');

    click(document.body.querySelector('[data-prompt-lang="en"]'));
    expect(document.body.querySelector('[data-prompt-lang="en"]')?.classList.contains('active')).toBe(true);

    click(document.body.querySelector('[data-prompt-modal-action="copy"]'));
    await Promise.resolve();

    expect(promptMocks.writeText).toHaveBeenCalledWith(expect.any(String));
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('提示词已复制到剪贴板'), {
      type: 'success',
    });

    click(document.body.querySelector('[data-prompt-modal-action="close"]'));
    expect(modal?.classList.contains('hidden')).toBe(true);

    window.viewPrompt?.(promptId || '');
    modal?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(modal?.classList.contains('hidden')).toBe(true);
  });

  it('copies prompt cards and reports clipboard failures', async () => {
    const container = await mountPrompts();
    const copyButton = container.querySelector('[data-action="copy-prompt"][data-prompt-id]');

    click(copyButton);
    await Promise.resolve();

    expect(promptMocks.writeText).toHaveBeenCalledWith(expect.any(String));
    expect(showToast).toHaveBeenCalledWith('提示词已复制到剪贴板', { type: 'success' });

    promptMocks.writeText.mockRejectedValueOnce(new Error('blocked'));
    click(copyButton);
    await Promise.resolve();
    await Promise.resolve();

    expect(showToast).toHaveBeenCalledWith('复制失败,请手动复制', { type: 'error' });
  });

  it('handles modal keyboard close and unregisters window actions on unmount', async () => {
    const container = await mountPrompts();
    const opener = container.querySelector<HTMLElement>('[data-action="view-prompt"][data-prompt-id]');
    opener?.focus();
    click(opener);

    const modal = document.body.querySelector('#prompt-detail-modal');
    expect(modal?.classList.contains('hidden')).toBe(false);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(modal?.classList.contains('hidden')).toBe(true);
    await new Promise(resolve => setTimeout(resolve, 360));
    expect(document.activeElement).toBe(opener);

    unmount();

    expect(document.body.querySelector('#prompt-detail-modal')).toBeNull();
    expect(window.viewPrompt).toBeUndefined();
    expect(window.copyPrompt).toBeUndefined();
    expect(window.copyModalPrompt).toBeUndefined();
  });

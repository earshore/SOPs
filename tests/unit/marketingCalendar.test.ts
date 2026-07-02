import { beforeEach, expect, it, vi } from 'vitest';
import { mount, unmount } from '@/modules/amz_hub/views/practice/marketing_calendar';

const mocks = vi.hoisted(() => ({
  storage: {
    get: vi.fn(),
    set: vi.fn(),
  },
  configGet: vi.fn(),
  container: {
    resolve: vi.fn(),
    has: vi.fn(),
  },
}));

vi.mock('@/common/config/ConfigCenter', () => ({
  configCenter: {
    get: mocks.configGet,
  },
}));

vi.mock('@/common/di/Container', () => ({
  container: mocks.container,
}));

function click(element: Element | null): void {
  expect(element).not.toBeNull();
  element?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function input(element: HTMLInputElement, value: string): void {
  element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

async function mountCalendar(): Promise<HTMLElement> {
  const container = document.createElement('section');
  document.body.appendChild(container);
  await mount(container);
  return container;
}

beforeEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
  mocks.storage.get.mockReset().mockReturnValue(['Prime Day', '圣诞']);
  mocks.storage.set.mockReset();
  mocks.configGet.mockReset().mockReturnValue(5);
  mocks.container.resolve.mockReset().mockImplementation((name: string) => {
    if (name === 'storage') return mocks.storage;
    return {};
  });
  mocks.container.has.mockReset().mockReturnValue(true);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  unmount();
});

  it('mounts the calendar and renders countries, stats, and event cards', async () => {
    const container = await mountCalendar();

    expect(container.classList.contains('fade-in')).toBe(true);
    expect(container.querySelector('#amzf_stats')?.textContent).toContain('营销节点');
    expect(container.querySelector('#amzf_country_tabs')?.textContent).toContain('全部');
    expect(container.querySelector('#amzf_main')?.textContent).toContain('电商切入策略');
    expect(mocks.storage.get).toHaveBeenCalledWith('amzf_search_history', []);
  });

  it('searches, persists history, and clears search state', async () => {
    vi.useFakeTimers();
    const container = await mountCalendar();
    const search = container.querySelector<HTMLInputElement>('#amzf_search');
    const clear = container.querySelector('#amzf_clear');

    expect(search).not.toBeNull();
    search?.focus();
    await vi.advanceTimersByTimeAsync(16);
    expect(document.body.querySelector('#amzf_search_history')).not.toBeNull();
    expect(document.body.querySelector('#amzf_search_history')?.classList.contains('amzf_show')).toBe(true);

    input(search as HTMLInputElement, 'Prime');
    await vi.advanceTimersByTimeAsync(300);

    expect(clear?.classList.contains('amzf_visible')).toBe(true);
    expect(container.querySelector('#amzf_main')?.textContent).toContain('Prime');

    search?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(mocks.storage.set).toHaveBeenCalledWith(
      'amzf_search_history',
      expect.arrayContaining(['Prime'])
    );

    click(clear);
    expect(search?.value).toBe('');
    expect(clear?.classList.contains('amzf_visible')).toBe(false);
  });

  it('handles country, view, section, and quick-tag controls through delegated clicks', async () => {
    const container = await mountCalendar();
    const germany = container.querySelector('[data-amzf-country="DE"]');
    click(germany);

    expect(germany?.classList.contains('amzf_active')).toBe(true);

    click(container.querySelector('[data-action="amzf_switchView"][data-param="event"]'));
    expect(container.querySelector('#amzf_btn_event')?.classList.contains('amzf_active')).toBe(true);
    expect(container.querySelector('#amzf_main')?.innerHTML).toContain('amzf_event_view');

    const sectionToggle = container.querySelector('[data-amzf-toggle-section]');
    const sectionId = (sectionToggle as HTMLElement | null)?.dataset.amzfToggleSection;
    click(sectionToggle);

    expect(sectionId ? document.getElementById(sectionId)?.classList.contains('amzf_expanded') : false).toBe(true);

    const search = container.querySelector<HTMLInputElement>('#amzf_search');
    search?.focus();
    const quickTag = document.body.querySelector<HTMLElement>('[data-amzf-quick-tag]');
    click(quickTag);

    expect(search?.value).toBe(quickTag?.dataset.amzfQuickTag);
    expect(document.body.querySelector('#amzf_search_history')?.classList.contains('amzf_show')).toBe(false);
  });

  it('renders and mutates search history controls outside the module container', async () => {
    const container = await mountCalendar();
    const search = container.querySelector<HTMLInputElement>('#amzf_search');
    search?.focus();

    const history = document.body.querySelector('#amzf_search_history');
    expect(history?.textContent).toContain('搜索历史');
    expect(history?.textContent).toContain('Prime Day');

    click(history?.querySelector('[data-amzf-delete-history-index="0"]'));
    expect(mocks.storage.set).toHaveBeenCalledWith('amzf_search_history', ['圣诞']);

    click(history?.querySelector('[data-amzf-clear-history]'));
    expect(mocks.storage.set).toHaveBeenCalledWith('amzf_search_history', []);
  });

  it('hides or removes floating history on document interactions and unmount', async () => {
    const container = await mountCalendar();
    const search = container.querySelector<HTMLInputElement>('#amzf_search');
    search?.focus();

    const history = document.body.querySelector('#amzf_search_history');
    expect(history?.classList.contains('amzf_show')).toBe(true);

    window.dispatchEvent(new Event('scroll'));
    expect(history?.classList.contains('amzf_show')).toBe(false);

    search?.dispatchEvent(new FocusEvent('focus'));
    window.dispatchEvent(new Event('resize'));
    expect(history?.classList.contains('amzf_show')).toBe(true);

    unmount();
    expect(document.body.querySelector('#amzf_search_history')).toBeNull();
  });

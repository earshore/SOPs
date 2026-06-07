import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { APP_EVENTS } from '@/common/constants/eventConstants';
import { loadTemplate } from '@/common/utils/viewLoader';
import eventBus from '@/common/EventBus';
import * as overviewModule from '@/modules/app_center/views/overview/index';

vi.mock('@/common/utils/viewLoader', () => ({
  loadTemplate: vi.fn()
}));

vi.mock('@/common/EventBus', () => ({
  default: {
    emit: vi.fn()
  }
}));

const overviewTemplate = `
  <div class="app-overview-container">
    <button class="category-filter-btn" data-category="all"></button>
    <button class="category-filter-btn" data-category="apps"></button>
    <button data-quick-link="scraper"></button>
    <section id="app-module-apps">
      <div class="app-center-card-grid">
        <div data-category="apps" data-action="switch-tab" data-tab="ai_analysis"></div>
      </div>
    </section>
  </div>
`;

describe('App Center Overview', () => {
  beforeEach(() => {
    vi.mocked(loadTemplate).mockResolvedValue(overviewTemplate);
    vi.mocked(eventBus.emit).mockClear();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('exports the lifecycle API used by ModuleLoader', () => {
    expect(typeof overviewModule.mount).toBe('function');
    expect(typeof overviewModule.unmount).toBe('function');
  });

  it('mounts the overview template into the provided container', async () => {
    const container = document.createElement('div');

    await overviewModule.mount(container);

    expect(loadTemplate).toHaveBeenCalledWith('src/modules/app_center/views/overview/template.html');
    expect(container.classList.contains('fade-in')).toBe(true);
    expect(container.querySelector('.app-overview-container')).not.toBeNull();
  });

  it('emits route changes from quick links and app cards', async () => {
    const container = document.createElement('div');

    await overviewModule.mount(container);
    container.querySelector<HTMLElement>('[data-quick-link="scraper"]')?.click();
    container.querySelector<HTMLElement>('[data-action="switch-tab"]')?.click();

    expect(eventBus.emit).toHaveBeenCalledWith(APP_EVENTS.ROUTE_CHANGE, { routeId: 'scraper' });
    expect(eventBus.emit).toHaveBeenCalledWith(APP_EVENTS.ROUTE_CHANGE, { routeId: 'ai_analysis' });
  });
});

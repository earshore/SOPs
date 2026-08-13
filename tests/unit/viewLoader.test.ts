import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

async function importViewLoader() {
  vi.resetModules();
  return import('@/common/utils/viewLoader');
}

describe('viewLoader', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = `
      <main id="main"></main>
      <div id="modal-container"></div>
    `;
  });

  afterEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('loads a known template by normalized path without a page-enter wrapper', async () => {
    const { loadTemplate } = await importViewLoader();

    const html = await loadTemplate('src/modules/home/homeDisplay.html');

    expect(html).not.toContain('view-fade-in');
    expect(html.length).toBeGreaterThan(100);
  });

  it('throws a SystemError for missing templates', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { loadTemplate } = await importViewLoader();

    await expect(loadTemplate('/missing/template.html')).rejects.toThrow('Template path not found');
    expect(consoleError).toHaveBeenCalledWith('[ViewLoader] Template not found in registry: /missing/template.html');
  });

  it('loads the home view into the main container', async () => {
    const { initHomeView } = await importViewLoader();

    await initHomeView();

    expect(document.querySelector('main')?.innerHTML.length).toBeGreaterThan(100);
  });

  it('loads deferred modal and settings views into the modal container', async () => {
    const { initDeferredViews } = await importViewLoader();

    await initDeferredViews();

    expect(document.querySelector('#modal-container')?.innerHTML.length).toBeGreaterThan(100);
  });

  it('ignores routes that do not require a registered shell view', async () => {
    const { ensureViewLoaded } = await importViewLoader();

    await expect(ensureViewLoaded('unknown-route')).resolves.toBeUndefined();
  });

  it('loads a shell view without creating a route transition node', async () => {
    const { ensureViewLoaded } = await importViewLoader();

    await ensureViewLoaded('app_center_overview');

    expect(document.querySelector('.route-loading-transition')).toBeNull();
    expect(document.querySelector('main')?.innerHTML.length).toBeGreaterThan(100);
  });

  it('clears legacy cache keys and reports remaining cache stats', async () => {
    const { clearOldCache, getCacheStats } = await importViewLoader();
    localStorage.setItem('view_cache_0.9.0_/legacy.html', '<div>old</div>');

    clearOldCache();
    localStorage.setItem('cache:view:test_/active.html', '<div>active</div>');

    expect(localStorage.getItem('view_cache_0.9.0_/legacy.html')).toBeNull();
    expect(getCacheStats()).toMatchObject({
      count: 1,
      size: '<div>active</div>'.length * 2,
    });
  });

  it('keeps registerView as a no-op compatibility API', async () => {
    const { registerView } = await importViewLoader();

    expect(() => registerView({ path: '/virtual.html', target: 'main' })).not.toThrow();
  });
});

import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cssLoader } from '@/common/utils/cssLoader';

const usedHrefs: string[] = [];

function uniqueHref(name: string): string {
  const href = `/assets/${name}-${Date.now()}-${Math.random()}.css`;
  usedHrefs.push(href);
  return href;
}

function getLink(href: string): HTMLLinkElement {
  const link = [...document.head.querySelectorAll('link')]
    .find((candidate) => candidate.getAttribute('href') === href);
  expect(link).toBeInstanceOf(HTMLLinkElement);
  return link as HTMLLinkElement;
}

function dispatchLinkEvent(href: string, type: 'load' | 'error'): void {
  getLink(href).dispatchEvent(new Event(type));
}

  beforeEach(() => {
    document.head.innerHTML = '';
    vi.spyOn(performance, 'now').mockReturnValue(100);
  });

  afterEach(() => {
    usedHrefs.forEach((href) => cssLoader.unloadCSS(href));
    usedHrefs.length = 0;
    document.head.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('loads a stylesheet and records it as loaded', async () => {
    const href = uniqueHref('main');
    const loadPromise = cssLoader.loadCSS(href);

    vi.mocked(performance.now).mockReturnValue(125);
    dispatchLinkEvent(href, 'load');

    await expect(loadPromise).resolves.toEqual({
      success: true,
      href,
      loadTime: 25,
      fromCache: false,
    });
    expect(cssLoader.isCSSLoaded(href)).toBe(true);
  });

  it('returns cached results without appending another link', async () => {
    const href = uniqueHref('cached');
    const firstLoad = cssLoader.loadCSS(href);
    dispatchLinkEvent(href, 'load');
    await firstLoad;

    document.head.innerHTML = '';
    const secondResult = await cssLoader.loadCSS(href);

    expect(secondResult).toMatchObject({ success: true, href, fromCache: true, loadTime: 0 });
    expect(document.head.querySelectorAll('link')).toHaveLength(0);
  });

  it('deduplicates concurrent requests for the same stylesheet', async () => {
    const href = uniqueHref('dedupe');

    const firstLoad = cssLoader.loadCSS(href);
    const secondLoad = cssLoader.loadCSS(href);

    expect(document.head.querySelectorAll(`link[href="${href}"]`)).toHaveLength(1);

    dispatchLinkEvent(href, 'load');
    const results = await Promise.all([firstLoad, secondLoad]);

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual(results[1]);
  });

  it('falls back to a secondary stylesheet when the primary load fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const primaryHref = uniqueHref('primary');
    const fallbackHref = uniqueHref('fallback');

    const loadPromise = cssLoader.loadCSS(primaryHref, { fallback: fallbackHref });
    dispatchLinkEvent(primaryHref, 'error');
    dispatchLinkEvent(fallbackHref, 'load');

    await expect(loadPromise).resolves.toMatchObject({
      success: true,
      href: fallbackHref,
      fromCache: false,
    });
    expect(cssLoader.isCSSLoaded(primaryHref)).toBe(true);
    expect(cssLoader.isCSSLoaded(fallbackHref)).toBe(true);
    expect(warn).toHaveBeenCalledWith(`CSS加载失败，使用降级方案: ${primaryHref}`);
  });

  it('loads stylesheets in sequence and reports progress for non-empty hrefs', async () => {
    const firstHref = uniqueHref('batch-a');
    const secondHref = uniqueHref('batch-b');
    const onProgress = vi.fn();

    const batchPromise = cssLoader.loadCSSBatch([firstHref, '', secondHref], { onProgress });

    dispatchLinkEvent(firstHref, 'load');
    await new Promise((resolve) => setTimeout(resolve, 0));
    dispatchLinkEvent(secondHref, 'load');

    const results = await batchPromise;
    expect(results.map((result) => result.href)).toEqual([firstHref, secondHref]);
    expect(onProgress).toHaveBeenNthCalledWith(1, 1, 3);
    expect(onProgress).toHaveBeenNthCalledWith(2, 3, 3);
  });

  it('preloads a stylesheet and marks it loaded after the preload finishes', () => {
    const href = uniqueHref('preload');

    cssLoader.preloadCSS(href);
    const link = getLink(href);
    expect(link.rel).toBe('preload');
    expect(link.as).toBe('style');

    dispatchLinkEvent(href, 'load');

    expect(link.rel).toBe('stylesheet');
    expect(cssLoader.isCSSLoaded(href)).toBe(true);
  });

  it('unloads an existing stylesheet and updates stats', async () => {
    const href = uniqueHref('unload');
    const loadPromise = cssLoader.loadCSS(href);
    dispatchLinkEvent(href, 'load');
    await loadPromise;

    cssLoader.unloadCSS(href);

    expect(cssLoader.isCSSLoaded(href)).toBe(false);
    expect([...document.head.querySelectorAll('link')].some((link) => link.getAttribute('href') === href)).toBe(false);
    expect(cssLoader.getStats().loading).toBe(0);
  });

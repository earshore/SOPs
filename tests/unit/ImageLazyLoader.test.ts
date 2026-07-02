import { afterEach, beforeEach, expect, it, vi } from 'vitest';

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  observed: Element[] = [];
  callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }

  observe = vi.fn((element: Element) => {
    this.observed.push(element);
  });
  unobserve = vi.fn((element: Element) => {
    this.observed = this.observed.filter((item) => item !== element);
  });
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
}

async function importImageLazyLoader() {
  vi.resetModules();
  return import('@/common/utils/ImageLazyLoader');
}

  beforeEach(() => {
    document.body.innerHTML = '';
    MockIntersectionObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('observes existing lazy images and assigns placeholders', async () => {
    const image = document.createElement('img');
    image.dataset.src = '/real.png';
    document.body.appendChild(image);
    const { imageLazyLoader } = await importImageLazyLoader();

    imageLazyLoader.initialize({ placeholder: '/placeholder.png' });

    expect(image.src).toContain('/placeholder.png');
    expect(image.classList.contains('lazy-image')).toBe(true);
    expect(MockIntersectionObserver.instances[0].observed).toContain(image);
  });

  it('loads an observed image when it intersects', async () => {
    const image = document.createElement('img');
    image.dataset.src = '/real.png';
    image.dataset.srcset = '/real-2x.png 2x';
    document.body.appendChild(image);
    const { imageLazyLoader } = await importImageLazyLoader();
    imageLazyLoader.initialize({ fadeIn: true, fadeInDuration: 120 });

    const observer = MockIntersectionObserver.instances[0];
    observer.callback([
      { isIntersecting: true, target: image } as IntersectionObserverEntry,
    ], observer as unknown as IntersectionObserver);

    expect(image.src).toContain('/real.png');
    expect(image.srcset).toContain('/real-2x.png 2x');
    expect(image.classList.contains('lazy-loading')).toBe(true);

    image.dispatchEvent(new Event('load'));

    expect(image.classList.contains('lazy-loaded')).toBe(true);
    expect(image.style.opacity).toBe('1');
    expect(observer.unobserve).toHaveBeenCalledWith(image);
  });

  it('sets the error image after load failure', async () => {
    const image = document.createElement('img');
    image.dataset.src = '/missing.png';
    const { imageLazyLoader } = await importImageLazyLoader();
    imageLazyLoader.initialize({ errorImage: '/error.png' });

    imageLazyLoader.forceLoad(image);
    image.dispatchEvent(new Event('error'));

    expect(image.classList.contains('lazy-error')).toBe(true);
    expect(image.src).toContain('/error.png');
  });

  it('falls back to loading all images when IntersectionObserver is unavailable', async () => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(window, 'IntersectionObserver');
    const image = document.createElement('img');
    image.dataset.src = '/fallback.png';
    document.body.appendChild(image);
    const { imageLazyLoader } = await importImageLazyLoader();

    imageLazyLoader.initialize();

    expect(image.src).toContain('/fallback.png');
  });

  it('converts normal images into lazy images', async () => {
    const image = document.createElement('img');
    image.src = 'https://example.com/source.png';
    document.body.appendChild(image);
    const { imageLazyLoader, makeLazyImage, makeLazyImages } = await importImageLazyLoader();
    imageLazyLoader.initialize();

    makeLazyImage(image);

    expect(image.dataset.src).toBe('https://example.com/source.png');
    expect(image.classList.contains('lazy-image')).toBe(true);

    const second = document.createElement('img');
    second.src = 'https://example.com/second.png';
    document.body.appendChild(second);
    makeLazyImages('img[src]');

    expect(second.dataset.src).toBe('https://example.com/second.png');
  });

  it('updates config, reports stats, and cleans up the observer', async () => {
    const image = document.createElement('img');
    image.dataset.src = '/stats.png';
    document.body.appendChild(image);
    const { imageLazyLoader } = await importImageLazyLoader();
    imageLazyLoader.initialize();

    imageLazyLoader.forceLoad(image);
    image.dispatchEvent(new Event('load'));

    expect(imageLazyLoader.getStats()).toEqual({ observed: 1, loaded: 1 });

    const firstObserver = MockIntersectionObserver.instances[0];
    imageLazyLoader.updateConfig({ rootMargin: '100px' });
    expect(firstObserver.disconnect).toHaveBeenCalled();

    const latestObserver = MockIntersectionObserver.instances.at(-1);
    imageLazyLoader.cleanup();
    expect(latestObserver?.disconnect).toHaveBeenCalled();
  });

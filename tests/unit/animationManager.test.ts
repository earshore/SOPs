import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ANIMATION_CLASSES, DATA_ATTRIBUTES, STORAGE_KEY } from '@/config/animation-config';

type StorageMock = {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
};

type EventBusMock = {
  emit: ReturnType<typeof vi.fn>;
};

async function importAnimationManager(options: {
  reducedMotion?: boolean;
  storedSettings?: unknown;
} = {}) {
  const storage: StorageMock = {
    get: vi.fn(() => options.storedSettings ?? null),
    set: vi.fn(),
  };
  const eventBus: EventBusMock = {
    emit: vi.fn(),
  };
  const mediaQuery = {
    matches: options.reducedMotion ?? false,
    addEventListener: vi.fn(),
    addListener: vi.fn(),
  };

  vi.resetModules();
  vi.doMock('@/services/storageService', () => ({ StorageService: storage }));
  vi.doMock('@common/EventBus', () => ({ default: eventBus }));
  vi.spyOn(window, 'matchMedia').mockReturnValue(mediaQuery as unknown as MediaQueryList);

  const module = await import('@/services/animation-manager');

  return {
    AnimationManager: module.AnimationManager,
    storage,
    eventBus,
    mediaQuery,
  };
}

describe('AnimationManager', () => {
  beforeEach(() => {
    document.documentElement.className = '';
    document.documentElement.removeAttribute(DATA_ATTRIBUTES.animations);
    document.documentElement.removeAttribute(DATA_ATTRIBUTES.animationSpeed);
    document.documentElement.style.cssText = '';
    vi.spyOn(Date, 'now').mockReturnValue(1000);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.doUnmock('@/services/storageService');
    vi.doUnmock('@common/EventBus');
    vi.restoreAllMocks();
  });

  it('applies default enabled settings on construction', async () => {
    const { AnimationManager, storage, eventBus, mediaQuery } = await importAnimationManager();
    const manager = new AnimationManager();

    expect(manager.shouldReduceMotion()).toBe(false);
    expect(document.documentElement.getAttribute(DATA_ATTRIBUTES.animations)).toBe('enabled');
    expect(document.documentElement.getAttribute(DATA_ATTRIBUTES.animationSpeed)).toBe('normal');
    expect(document.documentElement.style.getPropertyValue('--animation-speed-multiplier')).toBe('1');
    expect(storage.get).toHaveBeenCalledWith(STORAGE_KEY);
    expect(mediaQuery.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    expect(eventBus.emit).toHaveBeenCalled();
  });

  it('enables, disables, and changes animation speed with persisted settings', async () => {
    const { AnimationManager, storage } = await importAnimationManager();
    const manager = new AnimationManager();

    manager.disableAnimations();
    expect(manager.shouldReduceMotion()).toBe(true);
    expect(document.documentElement.getAttribute(DATA_ATTRIBUTES.animations)).toBe('disabled');
    expect(document.documentElement.style.getPropertyValue('--animations-enabled')).toBe('0');

    manager.enableAnimations();
    manager.setAnimationSpeed('fast');

    expect(manager.shouldReduceMotion()).toBe(false);
    expect(document.documentElement.getAttribute(DATA_ATTRIBUTES.animationSpeed)).toBe('fast');
    expect(document.documentElement.style.getPropertyValue('--animation-speed-multiplier')).toBe('0.7');
    expect(storage.set).toHaveBeenCalledWith(STORAGE_KEY, expect.objectContaining({
      enabled: true,
      speed: 'fast',
      lastUpdated: 1000,
    }));
  });

  it('toggles category classes and category availability', async () => {
    const { AnimationManager } = await importAnimationManager();
    const manager = new AnimationManager();

    manager.disableCategory('button');
    expect(manager.isCategoryEnabled('button')).toBe(false);
    expect(document.documentElement.classList.contains(ANIMATION_CLASSES.noButtonAnimations)).toBe(true);

    manager.enableCategory('button');
    expect(manager.isCategoryEnabled('button')).toBe(true);
    expect(document.documentElement.classList.contains(ANIMATION_CLASSES.noButtonAnimations)).toBe(false);
  });

  it('loads compatible stored settings and filters invalid categories', async () => {
    const { AnimationManager } = await importAnimationManager({
      storedSettings: {
        version: '1.0.0',
        enabled: true,
        speed: 'slow',
        disabledCategories: ['button', 'invalid-category'],
        respectSystemPreference: false,
      },
    });

    const manager = new AnimationManager();
    const settings = manager.getSettings();

    expect(settings.speed).toBe('slow');
    expect([...settings.disabledCategories]).toEqual(['button']);
    expect(document.documentElement.classList.contains(ANIMATION_CLASSES.noButtonAnimations)).toBe(true);
    expect(document.documentElement.getAttribute(DATA_ATTRIBUTES.animationSpeed)).toBe('slow');
  });

  it('respects or ignores system reduced-motion preference based on settings', async () => {
    const { AnimationManager } = await importAnimationManager({ reducedMotion: true });
    const manager = new AnimationManager();

    expect(manager.shouldReduceMotion()).toBe(true);

    manager.setRespectSystemPreference(false);

    expect(manager.shouldReduceMotion()).toBe(false);
  });

  it('falls back to addListener for older media query objects', async () => {
    const { AnimationManager, mediaQuery } = await importAnimationManager();
    mediaQuery.addEventListener = undefined as unknown as ReturnType<typeof vi.fn>;

    new AnimationManager();

    expect(mediaQuery.addListener).toHaveBeenCalledWith(expect.any(Function));
  });

  it('resets settings to defaults and clears the singleton on destroy', async () => {
    const { AnimationManager } = await importAnimationManager();
    const manager = AnimationManager.getInstance();

    manager.disableAnimations();
    manager.resetToDefaults();

    expect(manager.shouldReduceMotion()).toBe(false);
    expect(manager.getSettings().speed).toBe('normal');

    manager.destroy();

    expect(AnimationManager.getInstance()).not.toBe(manager);
  });
});

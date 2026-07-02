import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type AnimationSettingsState = {
  enabled: boolean;
  speed: 'fast' | 'normal' | 'slow';
  disabledCategories: Set<'button' | 'modal' | 'form'>;
  respectSystemPreference: boolean;
};

type AnimationManagerMock = {
  getSettings: ReturnType<typeof vi.fn<[], AnimationSettingsState>>;
  enableAnimations: ReturnType<typeof vi.fn>;
  disableAnimations: ReturnType<typeof vi.fn>;
  setAnimationSpeed: ReturnType<typeof vi.fn>;
  disableCategory: ReturnType<typeof vi.fn>;
  enableCategory: ReturnType<typeof vi.fn>;
  setRespectSystemPreference: ReturnType<typeof vi.fn>;
  resetToDefaults: ReturnType<typeof vi.fn>;
};

async function importAnimationSettingsStore(initialState?: Partial<AnimationSettingsState>) {
  let settings: AnimationSettingsState = {
    enabled: true,
    speed: 'normal',
    disabledCategories: new Set(),
    respectSystemPreference: true,
    ...initialState,
  };

  const cloneSettings = (): AnimationSettingsState => ({
    ...settings,
    disabledCategories: new Set(settings.disabledCategories),
  });

  const animationManager: AnimationManagerMock = {
    getSettings: vi.fn(() => cloneSettings()),
    enableAnimations: vi.fn(() => {
      settings = { ...settings, enabled: true };
    }),
    disableAnimations: vi.fn(() => {
      settings = { ...settings, enabled: false };
    }),
    setAnimationSpeed: vi.fn((speed: AnimationSettingsState['speed']) => {
      settings = { ...settings, speed };
    }),
    disableCategory: vi.fn((category: 'button' | 'modal' | 'form') => {
      settings = { ...settings, disabledCategories: new Set([...settings.disabledCategories, category]) };
    }),
    enableCategory: vi.fn((category: 'button' | 'modal' | 'form') => {
      const nextCategories = new Set(settings.disabledCategories);
      nextCategories.delete(category);
      settings = { ...settings, disabledCategories: nextCategories };
    }),
    setRespectSystemPreference: vi.fn((respect: boolean) => {
      settings = { ...settings, respectSystemPreference: respect };
    }),
    resetToDefaults: vi.fn(() => {
      settings = {
        enabled: true,
        speed: 'normal',
        disabledCategories: new Set(),
        respectSystemPreference: true,
      };
    }),
  };

  vi.resetModules();
  vi.doMock('@/services/animation-manager', () => ({ animationManager }));

  const module = await import('@/stores/animation-settings');

  return {
    ...module,
    animationManager,
  };
}

describe('animation settings store', () => {
  beforeEach(() => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList);
  });

  afterEach(() => {
    vi.doUnmock('@/services/animation-manager');
    vi.restoreAllMocks();
  });

  it('delegates actions to the animation manager and refreshes state', async () => {
    const { animationSettingsStore, animationManager } = await importAnimationSettingsStore();
    const store = animationSettingsStore;

    store.getState().disableAnimations();
    expect(store.getState().settings.enabled).toBe(false);

    store.getState().toggleAnimations();
    expect(animationManager.enableAnimations).toHaveBeenCalled();
    expect(store.getState().settings.enabled).toBe(true);

    store.getState().setAnimationSpeed('fast');
    store.getState().disableCategory('button');
    expect(store.getState().settings.speed).toBe('fast');
    expect(store.getState().settings.disabledCategories.has('button')).toBe(true);

    store.getState().toggleCategory('button');
    expect(animationManager.enableCategory).toHaveBeenCalledWith('button');
    expect(store.getState().settings.disabledCategories.has('button')).toBe(false);
  });

  it('supports selectors, subscriptions, and system preference initialization', async () => {
    const {
      animationSettingsStore,
      animationSelectors,
      initializeAnimationStore,
      subscribeToAnimationSettings,
      shouldReduceMotion,
      isCategoryEnabled,
    } = await importAnimationSettingsStore();

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const callback = vi.fn();
    const unsubscribe = subscribeToAnimationSettings(callback);

    animationSettingsStore.getState().setRespectSystemPreference(false);
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ respectSystemPreference: false }));
    expect(shouldReduceMotion()).toBe(false);
    expect(isCategoryEnabled('button')).toBe(true);
    expect(animationSelectors.speed(animationSettingsStore.getState())).toBe('normal');

    initializeAnimationStore();
    expect(mediaQuery.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));

    unsubscribe();
  });
});

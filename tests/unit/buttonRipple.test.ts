import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type AnimationManagerMock = {
  shouldReduceMotion: ReturnType<typeof vi.fn>;
  isCategoryEnabled: ReturnType<typeof vi.fn>;
};

type EventBusMock = {
  on: ReturnType<typeof vi.fn>;
};

async function importButtonRipple(options: {
  reducedMotion?: boolean;
  categoryEnabled?: boolean;
} = {}) {
  const animationManager: AnimationManagerMock = {
    shouldReduceMotion: vi.fn(() => options.reducedMotion ?? false),
    isCategoryEnabled: vi.fn(() => options.categoryEnabled ?? true),
  };
  const createRipple = vi.fn();
  const unsubscribe = vi.fn();
  const eventBus: EventBusMock = {
    on: vi.fn(() => unsubscribe),
  };

  vi.resetModules();
  vi.doMock('@/services/animation-manager', () => ({ animationManager }));
  vi.doMock('@/utils/animation-utils', () => ({ createRipple }));
  vi.doMock('@common/EventBus', () => ({ default: eventBus }));

  const module = await import('@/components/button-ripple');

  return {
    ...module,
    animationManager,
    createRipple,
    eventBus,
    unsubscribe,
  };
}

describe('button ripple', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 1;
    });
  });

  afterEach(() => {
    vi.doUnmock('@/services/animation-manager');
    vi.doUnmock('@/utils/animation-utils');
    vi.doUnmock('@common/EventBus');
    vi.restoreAllMocks();
  });

  it('initializes eligible buttons and delegates clicks to createRipple', async () => {
    const button = document.createElement('button');
    button.className = 'btn';
    document.body.append(button);
    const { initButtonRipple, createRipple } = await importButtonRipple();

    initButtonRipple();
    button.click();

    expect(button.dataset.rippleInitialized).toBe('true');
    expect(button.classList.contains('btn-ripple')).toBe(true);
    expect(createRipple).toHaveBeenCalledWith(button, expect.any(MouseEvent));
  });

  it('skips initialization when reduced motion or disabled category is active', async () => {
    const reducedButton = document.createElement('button');
    reducedButton.className = 'btn';
    document.body.append(reducedButton);

    const reducedModule = await importButtonRipple({ reducedMotion: true });
    reducedModule.initButtonRipple();

    expect(reducedButton.dataset.rippleInitialized).toBeUndefined();

    const disabledButton = document.createElement('button');
    disabledButton.className = 'btn';
    document.body.replaceChildren(disabledButton);

    const disabledModule = await importButtonRipple({ categoryEnabled: false });
    disabledModule.addRippleToButton(disabledButton);

    expect(disabledButton.dataset.rippleInitialized).toBeUndefined();
  });

  it('ignores disabled buttons at click time and cleans initialized buttons', async () => {
    const button = document.createElement('button');
    button.className = 'btn';
    button.setAttribute('aria-disabled', 'true');
    document.body.append(button);
    const { addRippleToButton, cleanupButtonRipple, createRipple } = await importButtonRipple();

    addRippleToButton(button);
    button.append(Object.assign(document.createElement('span'), { className: 'btn-ripple-effect' }));
    button.click();

    expect(createRipple).not.toHaveBeenCalled();

    cleanupButtonRipple();

    expect(button.dataset.rippleInitialized).toBeUndefined();
    expect(button.classList.contains('btn-ripple')).toBe(false);
    expect(button.querySelector('.btn-ripple-effect')).toBeNull();
  });

  it('reinitializes after animation settings change with throttling', async () => {
    const button = document.createElement('button');
    button.className = 'btn';
    document.body.append(button);
    vi.spyOn(Date, 'now').mockReturnValue(2000);
    const { observeAnimationSettings, eventBus } = await importButtonRipple();

    observeAnimationSettings();
    observeAnimationSettings();
    const listener = eventBus.on.mock.calls[0]?.[1] as (() => void) | undefined;
    listener?.();
    listener?.();

    expect(eventBus.on).toHaveBeenCalledTimes(1);
    expect(button.dataset.rippleInitialized).toBe('true');
  });
});

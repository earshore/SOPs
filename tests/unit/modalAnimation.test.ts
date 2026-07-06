import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ANIMATION_CLASSES } from '@/config/animation-config';

type AnimationManagerMock = {
  shouldReduceMotion: ReturnType<typeof vi.fn>;
  isCategoryEnabled: ReturnType<typeof vi.fn>;
};

async function importModalAnimation(options: {
  reducedMotion?: boolean;
  categoryEnabled?: boolean;
} = {}) {
  const animationManager: AnimationManagerMock = {
    shouldReduceMotion: vi.fn(() => options.reducedMotion ?? false),
    isCategoryEnabled: vi.fn(() => options.categoryEnabled ?? true),
  };

  vi.resetModules();
  vi.doMock('@/services/animation-manager', () => ({ animationManager }));

  const module = await import('@/components/modal-animation');

  return {
    ...module,
    animationManager,
  };
}

function createModalElements(): { backdrop: HTMLElement; modal: HTMLElement } {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  const modal = document.createElement('section');
  modal.className = 'modal';
  backdrop.append(modal);
  document.body.append(backdrop);
  return { backdrop, modal };
}

describe('modal animation', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.doUnmock('@/services/animation-manager');
    vi.restoreAllMocks();
  });

  it('opens and closes instantly when animations are skipped', async () => {
    const { backdrop, modal } = createModalElements();
    const { createModalAnimationController } = await importModalAnimation();
    const controller = createModalAnimationController(backdrop, modal);
    const onStart = vi.fn();
    const onComplete = vi.fn();

    await controller.open({ skipAnimation: true, onStart, onComplete });

    expect(backdrop.classList.contains('show')).toBe(true);
    expect(modal.classList.contains('modal-interaction-blocked')).toBe(false);
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);

    await controller.close({ skipAnimation: true });

    expect(backdrop.classList.contains('show')).toBe(false);
    expect(modal.classList.contains('modal-interaction-blocked')).toBe(false);
  });

  it('runs animated open and close sequences and clears animation classes', async () => {
    const { backdrop, modal } = createModalElements();
    const { createModalAnimationController } = await importModalAnimation();
    const controller = createModalAnimationController(backdrop, modal);

    const openPromise = controller.open();

    expect(controller.isInProgress()).toBe(true);
    expect(backdrop.classList.contains(ANIMATION_CLASSES.modalBackdropEnter)).toBe(true);
    expect(modal.classList.contains(ANIMATION_CLASSES.modalContentEnter)).toBe(true);

    backdrop.dispatchEvent(new Event('animationend'));
    modal.dispatchEvent(new Event('animationend'));
    await openPromise;

    expect(controller.isInProgress()).toBe(false);
    expect(backdrop.classList.contains(ANIMATION_CLASSES.modalBackdropEnter)).toBe(false);
    expect(backdrop.classList.contains('show')).toBe(true);
    expect(modal.classList.contains('modal-interaction-blocked')).toBe(false);

    const closePromise = controller.close();
    backdrop.dispatchEvent(new Event('animationend'));
    modal.dispatchEvent(new Event('animationend'));
    await closePromise;

    expect(backdrop.classList.contains(ANIMATION_CLASSES.modalBackdropExit)).toBe(false);
    expect(modal.classList.contains(ANIMATION_CLASSES.modalContentExit)).toBe(false);
    expect(backdrop.classList.contains('show')).toBe(false);
  });

  it('attaches and retrieves controllers for existing modal backdrops', async () => {
    const { backdrop } = createModalElements();
    const { initializeModalAnimations, getModalAnimationController } = await importModalAnimation();

    initializeModalAnimations();

    expect(getModalAnimationController(backdrop)).not.toBeNull();
    expect(getModalAnimationController(document.createElement('div'))).toBeNull();
  });

  it('can stop an in-progress animation without waiting for events', async () => {
    const { backdrop, modal } = createModalElements();
    const { createModalAnimationController } = await importModalAnimation();
    const controller = createModalAnimationController(backdrop, modal);

    void controller.open();
    controller.stopAnimation();

    expect(controller.isInProgress()).toBe(false);
    expect(backdrop.classList.contains(ANIMATION_CLASSES.modalBackdropEnter)).toBe(false);
    expect(modal.classList.contains(ANIMATION_CLASSES.modalContentEnter)).toBe(false);
  });
});

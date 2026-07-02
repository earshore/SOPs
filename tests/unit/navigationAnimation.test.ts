import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ANIMATION_CLASSES } from '@/config/animation-config';

type AnimationManagerMock = {
  shouldReduceMotion: ReturnType<typeof vi.fn>;
  isCategoryEnabled: ReturnType<typeof vi.fn>;
};

async function importNavigationAnimation(options: {
  reducedMotion?: boolean;
  categoryEnabled?: boolean;
} = {}) {
  const animationManager: AnimationManagerMock = {
    shouldReduceMotion: vi.fn(() => options.reducedMotion ?? false),
    isCategoryEnabled: vi.fn(() => options.categoryEnabled ?? true),
  };

  vi.resetModules();
  vi.doMock('@/services/animation-manager', () => ({ animationManager }));

  const module = await import('@/components/navigation-animation');

  return {
    ...module,
    animationManager,
  };
}

describe('navigation animation', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.doUnmock('@/services/animation-manager');
    vi.restoreAllMocks();
  });

  it('transitions page content instantly when animation is skipped', async () => {
    const container = document.createElement('main');
    const onStart = vi.fn();
    const onComplete = vi.fn();
    const { createPageTransitionController } = await importNavigationAnimation();
    const controller = createPageTransitionController(container);

    await controller.transition('<section>Next</section>', { skipAnimation: true, onStart, onComplete });

    expect(container.innerHTML).toContain('Next');
    expect(controller.isInProgress()).toBe(false);
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('runs page fade-out and fade-in around element replacement', async () => {
    const container = document.createElement('main');
    container.textContent = 'Old';
    const nextContent = document.createElement('section');
    nextContent.textContent = 'New';
    const { createPageTransitionController } = await importNavigationAnimation();
    const controller = createPageTransitionController(container);

    const transitionPromise = controller.transition(nextContent);

    expect(controller.isInProgress()).toBe(true);
    expect(container.classList.contains(ANIMATION_CLASSES.pageExit)).toBe(true);

    container.dispatchEvent(new Event('animationend'));

    await vi.waitFor(() => {
      expect(container.textContent).toBe('New');
    });
    expect(container.classList.contains(ANIMATION_CLASSES.pageEnter)).toBe(true);

    container.dispatchEvent(new Event('animationend'));
    await transitionPromise;

    expect(controller.isInProgress()).toBe(false);
    expect(container.classList.contains(ANIMATION_CLASSES.pageEnter)).toBe(false);
  });

  it('opens, closes, and toggles sidebars while respecting completed state', async () => {
    const sidebar = document.createElement('aside');
    sidebar.className = 'sidebar sidebar-hidden';
    const { createSidebarAnimationController } = await importNavigationAnimation();
    const controller = createSidebarAnimationController(sidebar);
    const onStart = vi.fn();
    const onComplete = vi.fn();

    await controller.open({ skipAnimation: true, onStart, onComplete });
    await controller.open({ skipAnimation: true, onStart, onComplete });

    expect(controller.getState()).toBe(true);
    expect(sidebar.classList.contains('sidebar-visible')).toBe(true);
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(2);

    await controller.toggle({ skipAnimation: true });

    expect(controller.getState()).toBe(false);
    expect(sidebar.classList.contains('sidebar-hidden')).toBe(true);
  });

  it('animates dropdown open and close using animationend events', async () => {
    const dropdown = document.createElement('div');
    dropdown.className = 'dropdown-menu';
    const { createDropdownAnimationController } = await importNavigationAnimation();
    const controller = createDropdownAnimationController(dropdown);

    const openPromise = controller.open();
    expect(controller.isInProgress()).toBe(true);
    expect(dropdown.classList.contains(ANIMATION_CLASSES.dropdownEnter)).toBe(true);
    dropdown.dispatchEvent(new Event('animationend'));
    await openPromise;

    expect(controller.getState()).toBe(true);
    expect(dropdown.classList.contains('dropdown-open')).toBe(true);

    const closePromise = controller.close();
    expect(dropdown.classList.contains(ANIMATION_CLASSES.dropdownExit)).toBe(true);
    dropdown.dispatchEvent(new Event('animationend'));
    await closePromise;

    expect(controller.getState()).toBe(false);
    expect(dropdown.classList.contains('dropdown-open')).toBe(false);
  });

  it('initializes page, sidebar, and dropdown controllers with DOM triggers', async () => {
    document.body.innerHTML = `
      <main class="page-container"></main>
      <aside id="left-rail" class="sidebar sidebar-hidden"></aside>
      <button data-sidebar-toggle="left-rail">Toggle</button>
      <button id="dropdown-trigger">Menu</button>
      <div class="dropdown-menu"></div>
    `;
    const {
      initializeNavigationAnimations,
      getPageTransitionController,
      getSidebarAnimationController,
      getDropdownAnimationController,
    } = await importNavigationAnimation();

    initializeNavigationAnimations();

    const page = document.querySelector<HTMLElement>('.page-container');
    const sidebar = document.querySelector<HTMLElement>('.sidebar');
    const dropdown = document.querySelector<HTMLElement>('.dropdown-menu');

    expect(page && getPageTransitionController(page)).not.toBeNull();
    expect(sidebar && getSidebarAnimationController(sidebar)).not.toBeNull();
    expect(dropdown && getDropdownAnimationController(dropdown)).not.toBeNull();

    document.querySelector<HTMLButtonElement>('[data-sidebar-toggle]')?.click();
    expect(getSidebarAnimationController(sidebar as HTMLElement)?.isInProgress()).toBe(true);

    document.getElementById('dropdown-trigger')?.click();
    expect(getDropdownAnimationController(dropdown as HTMLElement)?.isInProgress()).toBe(true);
  });

  it('does not initialize controllers when navigation animation category is disabled', async () => {
    const page = document.createElement('main');
    page.className = 'page-container';
    document.body.append(page);
    const { initializeNavigationAnimations, getPageTransitionController } = await importNavigationAnimation({
      categoryEnabled: false,
    });

    initializeNavigationAnimations();

    expect(getPageTransitionController(page)).toBeNull();
  });
});

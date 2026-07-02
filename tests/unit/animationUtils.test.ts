import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ANIMATION_CLASSES } from '@/config/animation-config';
import {
  addAnimation,
  applyStaggerAnimation,
  applyStaggerToNewItems,
  batchAddAnimation,
  batchRemoveAnimation,
  createRipple,
  getAnimationDuration,
  isInViewport,
  observeListAnimations,
  preloadAnimation,
  removeAnimation,
  resetListAnimation,
  safeAnimate,
  staggerAnimation,
  toggleAnimation,
  waitForAnimation,
} from '@/utils/animation-utils';

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

  beforeEach(() => {
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('data-animations');
    MockIntersectionObserver.instances = [];
    vi.useFakeTimers();
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('adds, removes, toggles, and batches animation classes', () => {
    const first = document.createElement('div');
    const second = document.createElement('div');

    removeAnimation(first, 'fade-in');
    batchAddAnimation([first, second], 'fade-in');
    expect(first.classList.contains('fade-in')).toBe(true);
    expect(second.classList.contains('fade-in')).toBe(true);

    expect(toggleAnimation(first, 'active')).toBe(true);
    expect(toggleAnimation(first, 'active')).toBe(false);

    batchRemoveAnimation([first, second], 'fade-in');
    expect(first.classList.contains('fade-in')).toBe(false);
    expect(second.classList.contains('fade-in')).toBe(false);
  });

  it('resolves addAnimation by timeout or animationend', async () => {
    const timed = document.createElement('div');
    const timedPromise = addAnimation(timed, 'fade-in', 200);
    vi.advanceTimersByTime(200);
    await expect(timedPromise).resolves.toBeUndefined();

    const evented = document.createElement('div');
    const eventPromise = addAnimation(evented, 'slide-in');
    evented.dispatchEvent(new Event('animationend', { bubbles: true }));
    await expect(eventPromise).resolves.toBeUndefined();
  });

  it('applies staggered classes after configured delays', () => {
    const first = document.createElement('div');
    const second = document.createElement('div');

    staggerAnimation([first, second], 'fade-in', 50);

    vi.advanceTimersByTime(49);
    expect(first.classList.contains('fade-in')).toBe(true);
    expect(second.classList.contains('fade-in')).toBe(false);

    vi.advanceTimersByTime(1);
    expect(second.classList.contains('fade-in')).toBe(true);
  });

  it('creates and removes a ripple element', () => {
    const button = document.createElement('button');
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
      width: 100,
      height: 60,
      left: 10,
      top: 20,
      right: 110,
      bottom: 80,
      x: 10,
      y: 20,
      toJSON: () => ({}),
    });

    createRipple(button, new MouseEvent('click', { clientX: 40, clientY: 50 }));

    const ripple = button.querySelector('span');
    expect(button.classList.contains(ANIMATION_CLASSES.btnRipple)).toBe(true);
    expect(ripple).toBeInstanceOf(HTMLSpanElement);
    expect((ripple as HTMLSpanElement).style.width).toBe('100px');

    ripple?.dispatchEvent(new Event('animationend'));
    expect(button.querySelector('span')).toBeNull();
  });

  it('calculates viewport visibility with optional threshold', () => {
    const element = document.createElement('div');
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      width: 100,
      height: 100,
      left: 0,
      top: 0,
      right: 100,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    expect(isInViewport(element)).toBe(true);
    expect(isInViewport(element, 0.5)).toBe(true);

    vi.mocked(element.getBoundingClientRect).mockReturnValue({
      width: 100,
      height: 100,
      left: -200,
      top: -200,
      right: -100,
      bottom: -100,
      x: -200,
      y: -200,
      toJSON: () => ({}),
    });
    expect(isInViewport(element)).toBe(false);
  });

  it('waits for animation, transition, or timeout completion', async () => {
    const animated = document.createElement('div');
    const animatedPromise = waitForAnimation(animated);
    animated.dispatchEvent(new Event('animationend', { bubbles: true }));
    await expect(animatedPromise).resolves.toBeUndefined();

    const transitioned = document.createElement('div');
    const transitionPromise = waitForAnimation(transitioned);
    transitioned.dispatchEvent(new Event('transitionend', { bubbles: true }));
    await expect(transitionPromise).resolves.toBeUndefined();

    const fallback = document.createElement('div');
    const fallbackPromise = waitForAnimation(fallback);
    vi.advanceTimersByTime(5000);
    await expect(fallbackPromise).resolves.toBeUndefined();
  });

  it('handles safe animation errors through the optional callback', () => {
    const error = new Error('animation failed');
    const onError = vi.fn();

    safeAnimate(() => {
      throw error;
    }, onError);

    expect(onError).toHaveBeenCalledWith(error);
  });

  it('parses animation durations in seconds and milliseconds', () => {
    const element = document.createElement('div');
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      animationDuration: '0.25s',
      transitionDuration: '',
    } as CSSStyleDeclaration);
    expect(getAnimationDuration(element)).toBe(250);

    vi.mocked(window.getComputedStyle).mockReturnValue({
      animationDuration: '',
      transitionDuration: '120ms',
    } as CSSStyleDeclaration);
    expect(getAnimationDuration(element)).toBe(120);
  });

  it('preloads and applies list stagger animation settings', () => {
    const element = document.createElement('div');
    preloadAnimation(element, 'preload-me');
    expect(element.classList.contains('preload-me')).toBe(false);

    const container = document.createElement('div');
    container.append(document.createElement('span'), document.createElement('span'));

    applyStaggerAnimation(container, { delay: 75, animationClass: 'item-enter' });
    const items = Array.from(container.children) as HTMLElement[];
    expect(items[0].style.getPropertyValue('--stagger-index')).toBe('0');
    expect(items[1].style.getPropertyValue('--stagger-delay')).toBe('75ms');
    expect(items.every((item) => item.classList.contains('item-enter'))).toBe(true);

    resetListAnimation(container, 'item-enter');
    expect(items.every((item) => item.classList.contains('item-enter'))).toBe(false);
    expect(items[0].style.getPropertyValue('--stagger-index')).toBe('');
  });

  it('skips list stagger animation when animations are disabled', () => {
    document.documentElement.setAttribute('data-animations', 'disabled');
    const item = document.createElement('div');

    applyStaggerToNewItems([item], 5, { animationClass: 'item-enter' });

    expect(item.classList.contains('item-enter')).toBe(false);
  });

  it('observes list containers and applies stagger animation when intersecting', () => {
    const list = document.createElement('div');
    list.dataset.staggerList = '';
    list.append(document.createElement('span'));
    document.body.appendChild(list);

    const observer = observeListAnimations({ delay: 25 });
    const instance = MockIntersectionObserver.instances[0];

    expect(instance.observed).toContain(list);
    instance.callback([
      { isIntersecting: true, target: list } as IntersectionObserverEntry,
    ], observer);

    expect((list.firstElementChild as HTMLElement).classList.contains(ANIMATION_CLASSES.listStaggerItem)).toBe(true);
    expect(instance.unobserve).toHaveBeenCalledWith(list);
  });

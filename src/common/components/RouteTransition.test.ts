import {
  ROUTE_TRANSITION_EXIT_MS,
  ROUTE_TRANSITION_MIN_VISIBLE_MS,
  RouteTransitionController,
} from './RouteTransition';

describe('RouteTransitionController', () => {
  const originalRequestAnimationFrame = window.requestAnimationFrame;

  beforeEach(() => {
    vi.useFakeTimers();
    window.requestAnimationFrame = callback => {
      callback(performance.now());
      return 0;
    };
  });

  afterEach(() => {
    window.requestAnimationFrame = originalRequestAnimationFrame;
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  it('keeps the loader visible long enough to avoid a flash, then removes it after exit', async () => {
    const container = document.createElement('main');
    document.body.appendChild(container);
    const controller = new RouteTransitionController();

    const transition = controller.show(container, 'sops', 'route-loading-transition');
    expect(transition.classList.contains('route-loading-transition--entered')).toBe(true);

    const hidePromise = controller.hide();
    await vi.advanceTimersByTimeAsync(ROUTE_TRANSITION_MIN_VISIBLE_MS - 1);
    expect(transition.isConnected).toBe(true);
    expect(transition.classList.contains('route-loading-transition--leaving')).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(transition.classList.contains('route-loading-transition--leaving')).toBe(true);

    await vi.advanceTimersByTimeAsync(ROUTE_TRANSITION_EXIT_MS);
    await hidePromise;
    expect(document.getElementById('route-loading-transition')).toBeNull();
  });
});

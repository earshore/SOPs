export const PAGE_ENTER_ANIMATION_INITIAL_CLASS = 'view-fade-in-initial';
export const PAGE_ENTER_ANIMATION_ACTIVE_CLASS = 'view-fade-in';

export const PAGE_ENTER_ANIMATION_CLASSES = [
  PAGE_ENTER_ANIMATION_INITIAL_CLASS,
  PAGE_ENTER_ANIMATION_ACTIVE_CLASS,
] as const;

/**
 * CSS variables for the page-enter animation durations (see keyframes.css).
 * We clear the trigger classes once the animation settles, so that later DOM
 * updates (e.g. a light/dark theme flip) can never re-trigger a replay:
 * animation replay requires the triggering rule to still match.
 *
 * --duration-slower ≈ 800ms, +0.15s stagger delay ⇒ clear after ~1100ms.
 */
const PAGE_ENTER_ANIMATION_CLEAR_DELAY_MS = 1100;

export function clearPageEnterAnimation(container: HTMLElement): void {
  container.classList.remove(...PAGE_ENTER_ANIMATION_CLASSES);
}

export function preparePageEnterAnimation(container: HTMLElement): void {
  clearPageEnterAnimation(container);
  container.classList.add(PAGE_ENTER_ANIMATION_INITIAL_CLASS);
}

export function applyPageEnterAnimation(container: HTMLElement): void {
  const firstChild = container.firstElementChild;
  if (firstChild?.classList.contains(PAGE_ENTER_ANIMATION_ACTIVE_CLASS)) {
    clearPageEnterAnimation(container);
    return;
  }

  clearPageEnterAnimation(container);
  void container.offsetHeight;
  container.classList.add(...PAGE_ENTER_ANIMATION_CLASSES);

  // Self-clear: once the enter animation finishes, remove the trigger classes
  // (the final state equals the default styles, so nothing snaps back).
  // Use both an animationend watcher (captures the last descendant's staggered
  // animation) and a timeout fallback for robustness.
  let cleared = false;
  const clearOnce = (): void => {
    if (cleared) return;
    cleared = true;
    container.removeEventListener('animationend', onEnd);
    clearPageEnterAnimation(container);
  };
  const onEnd = (e: Event): void => {
    const target = e.target as HTMLElement;
    if (container.contains(target)) clearOnce();
  };
  container.addEventListener('animationend', onEnd, { passive: true });
  window.setTimeout(clearOnce, PAGE_ENTER_ANIMATION_CLEAR_DELAY_MS);
}

export function wrapWithPageEnterAnimation(html: string): string {
  return `<div class="${PAGE_ENTER_ANIMATION_INITIAL_CLASS} ${PAGE_ENTER_ANIMATION_ACTIVE_CLASS}">${html}</div>`;
}

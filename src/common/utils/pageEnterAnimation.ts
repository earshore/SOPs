export const PAGE_ENTER_ANIMATION_INITIAL_CLASS = 'view-fade-in-initial';
export const PAGE_ENTER_ANIMATION_ACTIVE_CLASS = 'view-fade-in';

export const PAGE_ENTER_ANIMATION_CLASSES = [
  PAGE_ENTER_ANIMATION_INITIAL_CLASS,
  PAGE_ENTER_ANIMATION_ACTIVE_CLASS,
] as const;

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
}

export function wrapWithPageEnterAnimation(html: string): string {
  return `<div class="${PAGE_ENTER_ANIMATION_INITIAL_CLASS} ${PAGE_ENTER_ANIMATION_ACTIVE_CLASS}">${html}</div>`;
}

import { describe, expect, it } from 'vitest';
import {
  PAGE_ENTER_ANIMATION_ACTIVE_CLASS,
  PAGE_ENTER_ANIMATION_INITIAL_CLASS,
  applyPageEnterAnimation,
  clearPageEnterAnimation,
  wrapWithPageEnterAnimation
} from '@/common/utils/pageEnterAnimation';

describe('pageEnterAnimation', () => {
  it('applies the canonical page enter classes to a container', () => {
    const container = document.createElement('div');

    applyPageEnterAnimation(container);

    expect(container.classList.contains(PAGE_ENTER_ANIMATION_INITIAL_CLASS)).toBe(true);
    expect(container.classList.contains(PAGE_ENTER_ANIMATION_ACTIVE_CLASS)).toBe(true);
  });

  it('does not duplicate the page enter animation when the first child already owns it', () => {
    const container = document.createElement('div');
    const child = document.createElement('div');
    container.classList.add(PAGE_ENTER_ANIMATION_INITIAL_CLASS, PAGE_ENTER_ANIMATION_ACTIVE_CLASS);
    child.classList.add(PAGE_ENTER_ANIMATION_INITIAL_CLASS, PAGE_ENTER_ANIMATION_ACTIVE_CLASS);
    container.appendChild(child);

    applyPageEnterAnimation(container);

    expect(container.classList.contains(PAGE_ENTER_ANIMATION_INITIAL_CLASS)).toBe(false);
    expect(container.classList.contains(PAGE_ENTER_ANIMATION_ACTIVE_CLASS)).toBe(false);
    expect(child.classList.contains(PAGE_ENTER_ANIMATION_ACTIVE_CLASS)).toBe(true);
  });

  it('clears the canonical page enter classes', () => {
    const container = document.createElement('div');
    container.classList.add(PAGE_ENTER_ANIMATION_INITIAL_CLASS, PAGE_ENTER_ANIMATION_ACTIVE_CLASS);

    clearPageEnterAnimation(container);

    expect(container.classList.contains(PAGE_ENTER_ANIMATION_INITIAL_CLASS)).toBe(false);
    expect(container.classList.contains(PAGE_ENTER_ANIMATION_ACTIVE_CLASS)).toBe(false);
  });

  it('wraps static templates with the canonical page enter shell', () => {
    const html = wrapWithPageEnterAnimation('<section>Content</section>');

    expect(html).toBe(
      '<div class="view-fade-in-initial view-fade-in"><section>Content</section></div>'
    );
  });
});

import { describe, expect, it, vi } from 'vitest';
import {
  bindCategoryFilterButtons,
  filterSectionsByCategory,
  scrollToModuleSection,
} from '@/common/utils/overviewInteractions';

describe('overviewInteractions', () => {
  it('filters sections by data-category', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <section data-category="a"></section>
      <section data-category="b"></section>
    `;
    filterSectionsByCategory(root, 'a');
    const sections = root.querySelectorAll('section');
    expect((sections[0] as HTMLElement).hidden).toBe(false);
    expect((sections[1] as HTMLElement).hidden).toBe(true);

    filterSectionsByCategory(root, 'all');
    expect((sections[0] as HTMLElement).hidden).toBe(false);
    expect((sections[1] as HTMLElement).hidden).toBe(false);
  });

  it('binds exclusive active state on filter buttons', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <button class="category-filter-btn" data-category="all"></button>
      <button class="category-filter-btn" data-category="a"></button>
      <section data-category="a"></section>
      <section data-category="b"></section>
    `;
    const onFilter = vi.fn();
    const dispose = bindCategoryFilterButtons(root, { onFilter });
    const buttons = root.querySelectorAll('.category-filter-btn');
    (buttons[1] as HTMLButtonElement).click();
    expect(buttons[1].classList.contains('active')).toBe(true);
    expect(buttons[0].classList.contains('active')).toBe(false);
    expect(onFilter).toHaveBeenCalledWith('a');
    dispose();
  });

  it('scrolls to module section and highlights', () => {
    const el = document.createElement('div');
    el.id = 'sop-module-growth';
    el.scrollIntoView = vi.fn();
    document.body.appendChild(el);

    scrollToModuleSection('growth', {
      idPrefix: 'sop-module-',
      highlightClass: 'sop-module-highlight',
      highlightMs: 10,
    });

    expect(el.scrollIntoView).toHaveBeenCalled();
    expect(el.classList.contains('sop-module-highlight')).toBe(true);
    el.remove();
  });
});

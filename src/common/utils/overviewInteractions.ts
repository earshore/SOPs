/**
 * Shared overview page interactions (category filter + scroll-to-section).
 */

export interface CategoryFilterOptions {
  buttonSelector?: string;
  sectionSelector?: string;
  onFilter?: (category: string) => void;
}

/**
 * Filter sections that expose data-category. category "all" shows everything.
 */
export function filterSectionsByCategory(
  container: HTMLElement,
  category: string,
  sectionSelector = 'section[data-category]'
): void {
  const sections = container.querySelectorAll(sectionSelector);

  sections.forEach(section => {
    const sectionEl = section as HTMLElement;
    if (category === 'all' || sectionEl.dataset.category === category) {
      sectionEl.hidden = false;
      sectionEl.classList.add('fade-in');
    } else {
      sectionEl.hidden = true;
    }
  });
}

/**
 * Bind exclusive active state on category filter buttons and run the filter.
 * Returns a disposer that removes listeners.
 */
export function bindCategoryFilterButtons(
  container: HTMLElement,
  options: CategoryFilterOptions = {}
): () => void {
  const buttonSelector = options.buttonSelector ?? '.category-filter-btn';
  const sectionSelector = options.sectionSelector ?? 'section[data-category]';
  const filterBtns = Array.from(container.querySelectorAll(buttonSelector));

  const handleClick = (event: Event): void => {
    const btn = event.currentTarget as HTMLElement;

    filterBtns.forEach(item => {
      item.classList.remove('active');
      item.setAttribute('aria-pressed', 'false');
    });

    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');

    const category = btn.dataset.category;
    if (!category) return;

    filterSectionsByCategory(container, category, sectionSelector);
    options.onFilter?.(category);
  };

  filterBtns.forEach(btn => {
    btn.addEventListener('click', handleClick);
  });

  return () => {
    filterBtns.forEach(btn => {
      btn.removeEventListener('click', handleClick);
    });
  };
}

/**
 * Smooth-scroll to `#${idPrefix}${categoryId}` and briefly highlight it.
 */
export function scrollToModuleSection(
  categoryId: string,
  options: {
    idPrefix: string;
    highlightClass: string;
    highlightMs?: number;
  }
): void {
  if (!categoryId) return;

  const moduleElement = document.getElementById(`${options.idPrefix}${categoryId}`);
  if (!moduleElement) return;

  moduleElement.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
    inline: 'nearest',
  });

  moduleElement.classList.add(options.highlightClass);
  window.setTimeout(() => {
    moduleElement.classList.remove(options.highlightClass);
  }, options.highlightMs ?? 2000);
}

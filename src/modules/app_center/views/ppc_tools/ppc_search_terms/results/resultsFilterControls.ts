import { ACTION_ICONS, ACTION_LABELS, REPORT_FILTERS } from '../actions/actionMetadata';
import { createIcon, getElement } from '../ui/dom';
import { isFilterType, type FilterType } from '../utils/filters';

import type { ActionType, AnalyzedRow, ReportType } from '../types';

export function renderFilterButtons(
  container: HTMLElement,
  reportType: ReportType,
  activeFilter: FilterType
): FilterType {
  const wrapper = getElement(container, 'ppc-search-terms-filter-buttons');
  if (!wrapper) return activeFilter;

  const filters: FilterType[] = ['all', ...REPORT_FILTERS[reportType]];
  const nextFilter = filters.includes(activeFilter) ? activeFilter : 'all';

  wrapper.replaceChildren(
    ...filters.map(filter => createFilterButton(filter, filter === nextFilter))
  );
  return nextFilter;
}

export function setActiveFilterButton(container: HTMLElement, filter: FilterType): void {
  container.querySelectorAll<HTMLElement>('.category-filter-btn').forEach(item => {
    const isActive = item.dataset.filter === filter;
    item.classList.toggle('active', isActive);
    item.setAttribute('aria-pressed', String(isActive));
  });
}

export function updateFilterCounts(container: HTMLElement, rows: AnalyzedRow[]): void {
  const counts = new Map<FilterType, number>([['all', rows.length]]);
  (Object.keys(ACTION_LABELS) as ActionType[]).forEach(action => counts.set(action, 0));

  rows.forEach(row => {
    counts.set(row.action, (counts.get(row.action) || 0) + 1);
  });

  container.querySelectorAll<HTMLElement>('.category-filter-btn').forEach(button => {
    const filter = button.dataset.filter;
    if (!isFilterType(filter)) return;

    const count = button.querySelector<HTMLElement>('em');
    if (count) count.textContent = String(counts.get(filter) || 0);
  });
}

function createFilterButton(filter: FilterType, isActive: boolean): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = `category-filter-btn${isActive ? ' active' : ''}`;
  button.type = 'button';
  button.dataset.filter = filter;
  button.setAttribute('aria-pressed', String(isActive));

  const icon = createIcon(filter === 'all' ? 'fas fa-layer-group' : ACTION_ICONS[filter]);
  const label = document.createElement('span');
  label.textContent = filter === 'all' ? '全部' : ACTION_LABELS[filter];
  // 计数徽标用共享胶囊的 em 样式（.category-filter-btn em）
  const count = document.createElement('em');
  count.textContent = '0';
  button.append(icon, label, count);
  return button;
}

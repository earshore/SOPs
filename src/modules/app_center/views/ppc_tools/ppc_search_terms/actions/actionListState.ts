import { getInput } from '../ui/dom';
import { isFilterType, type FilterType } from '../utils/filters';
import { updateReportControls } from '../ui/reportControls';
import { renderResults, setActiveFilterButton } from '../results/resultsRenderer';
import type { AnalyzedRow, ReportType } from '../types';

interface ActionListStateDependencies {
  getRows(): AnalyzedRow[];
  getReportType(): ReportType;
}

export interface ActionListStateController {
  getFilter(): FilterType;
  getSearchQuery(): string;
  reset(): void;
  resetControls(container: HTMLElement): void;
  syncReportControls(container: HTMLElement): void;
  render(container: HTMLElement, rows?: AnalyzedRow[]): void;
  setFilterFromButton(container: HTMLElement, button: HTMLElement): void;
  handleSearch(container: HTMLElement): void;
  handleSearchKeydown(container: HTMLElement, event: Event): void;
  clearSearch(container: HTMLElement): void;
}

export function createActionListState({
  getRows,
  getReportType,
}: ActionListStateDependencies): ActionListStateController {
  let activeFilter: FilterType = 'all';
  let activeSearchQuery = '';

  function getFilter(): FilterType {
    return activeFilter;
  }

  function getSearchQuery(): string {
    return activeSearchQuery;
  }

  function reset(): void {
    activeFilter = 'all';
    activeSearchQuery = '';
  }

  function resetControls(container: HTMLElement): void {
    reset();
    setSearchQuery(container, '');
    syncReportControls(container);
  }

  function syncReportControls(container: HTMLElement): void {
    activeFilter = updateReportControls(container, getReportType(), activeFilter);
  }

  function render(container: HTMLElement, rows = getRows()): void {
    renderResults(container, rows, {
      filter: activeFilter,
      reportType: getReportType(),
      searchQuery: activeSearchQuery,
    });
  }

  function setFilterFromButton(container: HTMLElement, button: HTMLElement): void {
    const filter = button.dataset.filter;
    if (!isFilterType(filter)) return;

    activeFilter = filter;
    setActiveFilterButton(container, filter);
    render(container);
  }

  function handleSearch(container: HTMLElement): void {
    setSearchQuery(container, getInput(container, 'ppc-action-search')?.value || '');
    render(container);
  }

  function handleSearchKeydown(container: HTMLElement, event: Event): void {
    if (!(event instanceof KeyboardEvent) || event.key !== 'Escape') return;
    clearSearch(container);
  }

  function clearSearch(container: HTMLElement): void {
    setSearchQuery(container, '');
    render(container);
    getInput(container, 'ppc-action-search')?.focus();
  }

  function setSearchQuery(container: HTMLElement, query: string): void {
    activeSearchQuery = query.trim();
    const input = getInput(container, 'ppc-action-search');
    if (input && input.value !== activeSearchQuery) input.value = activeSearchQuery;
  }

  return {
    getFilter,
    getSearchQuery,
    reset,
    resetControls,
    syncReportControls,
    render,
    setFilterFromButton,
    handleSearch,
    handleSearchKeydown,
    clearSearch,
  };
}

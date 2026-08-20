import { updateFilterCounts } from './resultsFilterControls';
import { MAX_RENDER_ROWS, renderRows } from './resultsTable';
import { formatSummaryAcos, summarize, type AnalysisSummary } from '../export/summary';
import { setButtonDisabled, setText } from '../ui/dom';
import {
  filterRows,
  getGrowthExportFilter,
  getWasteExportFilter,
  searchRows,
  type FilterType,
} from '../utils/filters';
import { formatCurrency } from '../utils/formatters';

import type { AnalyzedRow, ReportType } from '../types';

export { renderFilterButtons, setActiveFilterButton } from './resultsFilterControls';

export interface ResultsRenderState {
  filter: FilterType;
  reportType: ReportType;
  searchQuery: string;
}

export function renderResults(
  container: HTMLElement,
  rows: AnalyzedRow[],
  state: ResultsRenderState
): void {
  const searchedRows = searchRows(rows, state.searchQuery);
  const visibleRows = filterRows(searchedRows, state.filter);
  const summary = summarize(rows);
  updateStats(container, summary);
  updateFilterCounts(container, searchedRows);
  updateExportAvailability(container, rows, visibleRows, state.reportType);
  updateResultCount(container, rows, searchedRows, visibleRows, state.searchQuery);
  renderRows(container, visibleRows, rows.length > 0, state.searchQuery);
}

function updateStats(container: HTMLElement, summary: AnalysisSummary): void {
  setText(container, 'ppc-search-terms-stat-rows', String(summary.rowCount));
  setText(container, 'ppc-search-terms-stat-spend', formatCurrency(summary.spend));
  setText(container, 'ppc-search-terms-stat-acos', formatSummaryAcos(summary));
  setText(container, 'ppc-search-terms-stat-actions', String(summary.actionCount));
}

function updateResultCount(
  container: HTMLElement,
  rows: AnalyzedRow[],
  searchedRows: AnalyzedRow[],
  visibleRows: AnalyzedRow[],
  searchQuery: string
): void {
  if (rows.length === 0) {
    setText(container, 'ppc-search-terms-result-count', '等待导入数据。');
    return;
  }
  const extra = visibleRows.length > MAX_RENDER_ROWS ? `，当前展示前 ${MAX_RENDER_ROWS} 行` : '';
  const searchText = searchQuery ? `，匹配 ${searchedRows.length} 行` : '';
  setText(
    container,
    'ppc-search-terms-result-count',
    `共 ${rows.length} 行${searchText}，当前筛选 ${visibleRows.length} 行${extra}。`
  );
}

function updateExportAvailability(
  container: HTMLElement,
  rows: AnalyzedRow[],
  visibleRows: AnalyzedRow[],
  reportType: ReportType
): void {
  const hasRows = rows.length > 0;
  const wasteFilter = getWasteExportFilter(reportType);
  const growthFilter = getGrowthExportFilter(reportType);
  const hasWasteRows = rows.some(row => row.action === wasteFilter);
  const hasGrowthRows = rows.some(row => row.action === growthFilter);

  setButtonDisabled(container, 'ppc-search-terms-export-all', !hasRows);
  setButtonDisabled(container, 'ppc-search-terms-export-current', visibleRows.length === 0);
  setButtonDisabled(container, 'ppc-search-terms-export-negative', !hasWasteRows);
  setButtonDisabled(container, 'ppc-search-terms-export-harvest', !hasGrowthRows);
  setButtonDisabled(container, 'ppc-search-terms-copy-summary', !hasRows);
}

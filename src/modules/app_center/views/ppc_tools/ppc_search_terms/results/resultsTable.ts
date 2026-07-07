import { getElement, setText } from '../ui/dom';
import { createResultRow } from './resultsRow';
import type { AnalyzedRow } from '../types';

export const MAX_RENDER_ROWS = 300;

export function renderRows(
  container: HTMLElement,
  rows: AnalyzedRow[],
  hasAnalyzedRows: boolean,
  searchQuery: string
): void {
  const body = getElement(container, 'ppc-search-terms-results-body');
  const empty = getElement(container, 'ppc-search-terms-empty-state');
  const wrapper = getElement(container, 'ppc-search-terms-table-wrapper');
  if (!body || !empty || !wrapper) return;

  body.replaceChildren();
  if (rows.length === 0) {
    updateEmptyState(container, hasAnalyzedRows, searchQuery);
    empty.classList.remove('hidden');
    wrapper.classList.add('hidden');
    return;
  }

  rows.slice(0, MAX_RENDER_ROWS).forEach(row => body.appendChild(createResultRow(row)));
  empty.classList.add('hidden');
  wrapper.classList.remove('hidden');
}

function updateEmptyState(
  container: HTMLElement,
  hasAnalyzedRows: boolean,
  searchQuery: string
): void {
  if (!hasAnalyzedRows) {
    setText(container, 'ppc-search-terms-empty-title', '还没有分析结果');
    setText(
      container,
      'ppc-search-terms-empty-description',
      '导入报表或加载样例数据后，会在这里生成可执行动作。'
    );
    return;
  }

  setText(container, 'ppc-search-terms-empty-title', '没有匹配的动作');
  setText(
    container,
    'ppc-search-terms-empty-description',
    searchQuery ? '调整搜索词或切换动作筛选。' : '切换动作筛选后再查看。'
  );
}

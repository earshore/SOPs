import { formatCurrency, formatPercent } from '../utils/formatters';

import type { AnalyzedRow } from '../types';

export function createResultRow(row: AnalyzedRow): HTMLTableRowElement {
  const tr = document.createElement('tr');
  tr.className =
    row.reviewStatus === 'model_reviewed'
      ? 'ppc-search-terms-results-row ppc-search-terms-results-row-reviewed'
      : 'ppc-search-terms-results-row';
  tr.appendChild(createSearchTermCell(row));
  tr.appendChild(createActionCell(row));
  tr.appendChild(createCell(formatCurrency(row.spend), 'right'));
  tr.appendChild(createCell(formatCurrency(row.sales), 'right'));
  tr.appendChild(createCell(String(row.orders), 'right'));
  tr.appendChild(createCell(row.sales > 0 ? formatPercent(row.acos) : '-', 'right'));
  tr.appendChild(createCell(formatPercent(row.ctr), 'right'));
  tr.appendChild(createCell(formatPercent(row.cvr), 'right'));
  tr.appendChild(createReasonCell(row));
  return tr;
}

function createSearchTermCell(row: AnalyzedRow): HTMLTableCellElement {
  const cell = createCell('', 'left');
  const term = document.createElement('div');
  term.className = 'font-bold text-slate-900';
  term.textContent = row.searchTerm;
  const meta = document.createElement('div');
  meta.className = 'text-xs text-slate-500 mt-1';
  meta.textContent = getObjectMeta(row);
  cell.append(term, meta);
  return cell;
}

function getObjectMeta(row: AnalyzedRow): string {
  if (row.reportType === 'erp_campaign') {
    return [row.store, row.targetingType, row.serviceStatus].filter(Boolean).join(' / ') || '-';
  }

  if (row.reportType === 'erp_search_term') {
    return [row.store, row.campaign, row.adGroup, row.keyword].filter(Boolean).join(' / ') || '-';
  }

  return [row.campaign, row.adGroup, row.keyword].filter(Boolean).join(' / ') || '-';
}

function createActionCell(row: AnalyzedRow): HTMLTableCellElement {
  const cell = createCell('', 'left');
  const badge = document.createElement('span');
  badge.className = `ppc-search-terms-action-badge ppc-search-terms-action-${row.action}`;
  badge.textContent = row.actionLabel;
  cell.appendChild(badge);

  if (row.reviewStatus === 'model_reviewed') {
    const reviewBadge = document.createElement('span');
    reviewBadge.className = 'ppc-search-terms-review-chip';
    reviewBadge.textContent = 'Agent 复核';
    cell.appendChild(reviewBadge);
  }

  return cell;
}

function createReasonCell(row: AnalyzedRow): HTMLTableCellElement {
  const cell = createCell('', 'left');

  if (row.reviewStatus !== 'model_reviewed') {
    cell.textContent = row.reason;
    return cell;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'ppc-search-terms-review-reason';
  const label = document.createElement('div');
  label.className = 'ppc-search-terms-review-reason-label';
  label.textContent = '语义复核结论';
  const text = document.createElement('div');
  text.className = 'ppc-search-terms-review-reason-text';
  text.textContent = row.reason;
  wrapper.append(label, text);
  cell.appendChild(wrapper);
  return cell;
}

function createCell(text: string, align: 'left' | 'right'): HTMLTableCellElement {
  const cell = document.createElement('td');
  cell.className = align === 'right' ? 'text-right tabular-nums' : 'text-left';
  cell.textContent = text;
  return cell;
}

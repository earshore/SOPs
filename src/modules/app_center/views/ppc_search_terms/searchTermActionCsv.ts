import { ACTION_ITEM_COLUMNS, buildActionItemCsvFields } from './actionItems';
import { formatCsvRows } from './csv';
import type { AnalyzedRow } from './types';

function buildPerformanceCsvFields(row: AnalyzedRow): string[] {
  return [
    row.spend.toFixed(2),
    row.sales.toFixed(2),
    String(row.orders),
    row.sales > 0 ? row.acos.toFixed(2) : '',
    row.reason,
  ];
}

export function buildSearchTermActionCsv(rows: AnalyzedRow[], owner: string): string {
  const headers = [
    'Action',
    'Search Term',
    'Campaign',
    'Ad Group',
    'Keyword',
    'Spend',
    'Sales',
    'Orders',
    'ACOS',
    'Reason',
    ...ACTION_ITEM_COLUMNS,
  ];
  const lines = rows.map(row => [
    row.actionLabel,
    row.searchTerm,
    row.campaign,
    row.adGroup,
    row.keyword,
    ...buildPerformanceCsvFields(row),
    ...buildActionItemCsvFields(row, owner),
  ]);
  return formatCsvRows([headers, ...lines]);
}

export function buildErpSearchTermActionCsv(rows: AnalyzedRow[], owner: string): string {
  const headers = [
    'Action',
    'Store',
    'Search Term',
    'Campaign',
    'Ad Group',
    'Targeting',
    'Match Type',
    'Spend',
    'Sales',
    'Orders',
    'ACOS',
    'Reason',
    ...ACTION_ITEM_COLUMNS,
  ];
  const lines = rows.map(row => [
    row.actionLabel,
    row.store || '',
    row.searchTerm,
    row.campaign,
    row.adGroup,
    row.keyword,
    row.matchType,
    ...buildPerformanceCsvFields(row),
    ...buildActionItemCsvFields(row, owner),
  ]);
  return formatCsvRows([headers, ...lines]);
}

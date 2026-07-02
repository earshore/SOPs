import { ACTION_ITEM_COLUMNS, buildActionItemCsvFields } from './actionItems';
import { formatCsvRows } from './csv';
import type { AnalyzedRow } from './types';

export function buildCampaignActionCsv(rows: AnalyzedRow[], owner: string): string {
  const headers = [
    'Action',
    'Campaign',
    'Store',
    'Targeting Type',
    'Service Status',
    'Daily Budget',
    'Spend',
    'Sales',
    'Orders',
    'ACOS',
    'ROAS',
    'Reason',
    ...ACTION_ITEM_COLUMNS,
  ];
  const lines = rows.map(row => [
    row.actionLabel,
    row.searchTerm,
    row.store || '',
    row.targetingType || '',
    row.serviceStatus || '',
    formatOptionalNumber(row.dailyBudget),
    row.spend.toFixed(2),
    row.sales.toFixed(2),
    String(row.orders),
    row.sales > 0 ? row.acos.toFixed(2) : '',
    typeof row.roas === 'number' && row.roas > 0 ? row.roas.toFixed(2) : '',
    row.reason,
    ...buildActionItemCsvFields(row, owner),
  ]);
  return formatCsvRows([headers, ...lines]);
}

function formatOptionalNumber(value: number | undefined): string {
  return typeof value === 'number' && value > 0 ? value.toFixed(2) : '';
}

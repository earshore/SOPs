import { formatPercent } from '../utils/formatters';
import type { AnalyzedRow } from '../types';

export interface AnalysisSummary {
  rowCount: number;
  spend: number;
  sales: number;
  orders: number;
  acos: number;
  actionCount: number;
  hasMixedCurrency: boolean;
}

export function summarize(rows: AnalyzedRow[]): AnalysisSummary {
  const totals = rows.reduce(
    (summary, row) => ({
      rowCount: summary.rowCount + 1,
      spend: summary.spend + row.spend,
      sales: summary.sales + row.sales,
      orders: summary.orders + row.orders,
      actionCount: summary.actionCount + (row.action === 'observe' ? 0 : 1),
    }),
    { rowCount: 0, spend: 0, sales: 0, orders: 0, actionCount: 0 }
  );
  const currencies = new Set(rows.map(row => normalizeCurrency(row.currency)).filter(Boolean));

  return {
    ...totals,
    acos: percentage(totals.spend, totals.sales),
    hasMixedCurrency: currencies.size > 1,
  };
}

export function formatSummaryAcos(summary: AnalysisSummary): string {
  if (summary.hasMixedCurrency) return '多币种不汇总';
  return summary.sales > 0 ? formatPercent(summary.acos) : '-';
}

function normalizeCurrency(value: string | undefined): string {
  return (value || '').trim().toUpperCase();
}

function percentage(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return (numerator / denominator) * 100;
}

import { getActionStatus, requiresHumanConfirmation } from './actionItems';
import { formatCurrency, formatPercent } from './formatters';
import { formatSummaryAcos, type AnalysisSummary } from './summary';
import type { AnalyzedRow } from './types';

export function buildSpendSummaryLine(summary: AnalysisSummary): string {
  if (summary.hasMixedCurrency) {
    return '- 花费：多币种不汇总，销售额：多币种不汇总，ACOS：多币种不汇总';
  }

  return `- 花费：${formatCurrency(summary.spend)}，销售额：${formatCurrency(summary.sales)}，ACOS：${formatSummaryAcos(summary)}`;
}

export function countHumanReviewRows(rows: AnalyzedRow[]): number {
  return rows.filter(requiresHumanConfirmation).length;
}

export function buildTopEvidenceLines(rows: AnalyzedRow[]): string[] {
  const evidenceRows = rows.filter(requiresHumanConfirmation).slice(0, 5);

  if (evidenceRows.length === 0) {
    return ['- 暂无需要人工动作的高优先级证据。'];
  }

  return evidenceRows.map(
    row =>
      `- ${row.searchTerm}：${row.actionLabel}，花费 ${formatCurrency(row.spend)}，销售额 ${formatCurrency(row.sales)}，订单 ${row.orders}，ACOS ${row.sales > 0 ? formatPercent(row.acos) : '-'}。`
  );
}

export function buildReviewActionLines(rows: AnalyzedRow[], owner: string): string[] {
  const actionRows = rows.filter(requiresHumanConfirmation).slice(0, 5);

  if (actionRows.length === 0) {
    return ['- 暂无需要人工执行的建议动作，继续观察。'];
  }

  return actionRows.map(
    row =>
      `- [ ] ${row.actionLabel}：${row.searchTerm}；原因：${row.reason}；Owner：${owner}；状态：${getActionStatus(row)}。`
  );
}

import { showToast } from '@/common/ui/notifications';
import { buildActionCsv } from '../actions/actionCsv';
import { today } from '../utils/formatters';
import { buildSummaryText } from './summaryText';
import { filterRows, searchRows, type FilterType } from '../utils/filters';
import { readActionOwner, saveActionOwner } from '../settings/settings';
import type { AnalyzedRow, ReportType } from '../types';

export interface ExportControllerState {
  getRows(): AnalyzedRow[];
  getReportType(): ReportType;
  getSearchQuery(): string;
}

export function exportActionRows(
  container: HTMLElement,
  filter: FilterType,
  includeSearch: boolean,
  state: ExportControllerState
): void {
  const sourceRows = state.getRows();
  const baseRows = includeSearch ? searchRows(sourceRows, state.getSearchQuery()) : sourceRows;
  const rows = filterRows(baseRows, filter);
  if (rows.length === 0) {
    showToast('没有可导出的数据', { type: 'warning' });
    return;
  }

  const owner = readActionOwner(container);
  saveActionOwner(owner);
  const csv = buildActionCsv(rows, owner);
  downloadText(`ppc-${state.getReportType()}-actions-${filter}-${today()}.csv`, csv);
  showToast('导出完成', { type: 'success', description: `${rows.length} 行动作已导出` });
}

export async function copyActionSummary(
  container: HTMLElement,
  state: ExportControllerState
): Promise<void> {
  const rows = state.getRows();
  if (rows.length === 0) {
    showToast('没有可复制的摘要', { type: 'warning' });
    return;
  }

  const owner = readActionOwner(container);
  saveActionOwner(owner);
  const summary = buildSummaryText(rows, owner);
  try {
    if (!navigator.clipboard?.writeText) {
      throw new Error('Clipboard API unavailable');
    }
    await navigator.clipboard.writeText(summary);
    showToast('复盘模板已复制', { type: 'success' });
  } catch {
    showToast('复制失败', { type: 'error', description: '当前浏览器没有开放剪贴板写入权限' });
  }
}

function downloadText(filename: string, content: string): void {
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

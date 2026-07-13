import { copyTextToClipboard } from '@/common/utils/clipboard';
import { showToast } from '@/common/ui/notifications';
import { registerPpcActionListArtifact } from '@/modules/app_center/artifactEnvelopeService';
import { getWorkspaceContext } from '@/modules/app_center/workspaceContext';
import { buildActionCsv } from '../actions/actionCsv';
import { requiresHumanConfirmation } from '../actions/actionItems';
import { today } from '../utils/formatters';
import { buildSummaryText } from './summaryText';
import { savePpcActionListSnapshot } from './actionListSnapshotService';
import { filterRows, searchRows, type FilterType } from '../utils/filters';
import { readActionOwner, saveActionOwner } from '../settings/settings';
import type { AnalyzedRow, ReportType } from '../types';

export interface ExportControllerState {
  getRows(): AnalyzedRow[];
  getReportType(): ReportType;
  getSearchQuery(): string;
}

export async function exportActionRows(
  container: HTMLElement,
  filter: FilterType,
  includeSearch: boolean,
  state: ExportControllerState
): Promise<void> {
  const sourceRows = state.getRows();
  const baseRows = includeSearch ? searchRows(sourceRows, state.getSearchQuery()) : sourceRows;
  const rows = filterRows(baseRows, filter);
  if (rows.length === 0) {
    showToast('没有可导出的数据', { type: 'warning' });
    return;
  }

  const owner = readActionOwner(container);
  saveActionOwner(owner);
  const reportType = state.getReportType();
  const csv = buildActionCsv(rows, owner);
  const createdAt = new Date().toISOString();
  const id = createPpcActionListId(reportType, filter, createdAt);
  downloadText(`ppc-${reportType}-actions-${filter}-${today()}.csv`, csv);
  const snapshot = await savePpcActionListSnapshot({
    id,
    reportType,
    filter,
    owner,
    rows,
    createdAt,
  });
  if (!snapshot) {
    showToast('导出完成，但未能保存本地建议快照', {
      type: 'warning',
      description: 'CSV 已下载；释放本地存储空间后可重新导出。',
    });
    return;
  }
  registerPpcActionListArtifact(
    {
      id,
      reportType,
      filter,
      rowCount: rows.length,
      owner,
      requiresHumanConfirmation: rows.some(requiresHumanConfirmation),
      createdAt,
    },
    getWorkspaceContext()
  );
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
  if (!(await copyTextToClipboard(summary))) {
    showToast('复制失败', {
      type: 'error',
      description: '当前浏览器没有开放剪贴板写入权限',
    });
    return;
  }
  showToast('复盘模板已复制', { type: 'success' });
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

function createPpcActionListId(
  reportType: ReportType,
  filter: FilterType,
  createdAt: string
): string {
  const timestamp = new Date(createdAt).getTime().toString(36);
  const suffix = globalThis.crypto?.randomUUID?.().slice(0, 8) || timestamp;
  return `ppc-${reportType}-${filter}-${timestamp}-${suffix}`;
}

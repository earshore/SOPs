import { StorageService } from '@/services/storageService';
import { getSelect } from './settingsFields';
import type { ReportSelection } from '../types';

const REPORT_SELECTION_STORAGE_KEY = 'ppc_report_selection_v1';

export function restoreReportSelection(container: HTMLElement): ReportSelection {
  const saved = StorageService.get<ReportSelection>(REPORT_SELECTION_STORAGE_KEY, 'auto');
  const selection = isReportSelection(saved) ? saved : 'auto';
  const select = getSelect(container, 'ppc-report-type');
  if (select) select.value = selection;
  return selection;
}

export function readReportSelection(container: HTMLElement): ReportSelection {
  const value = getSelect(container, 'ppc-report-type')?.value;
  return isReportSelection(value) ? value : 'auto';
}

export function saveReportSelection(selection: ReportSelection): void {
  StorageService.set(REPORT_SELECTION_STORAGE_KEY, selection);
}

function isReportSelection(value: unknown): value is ReportSelection {
  return (
    value === 'auto' ||
    value === 'search_term' ||
    value === 'erp_search_term' ||
    value === 'erp_campaign'
  );
}

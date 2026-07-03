import { showToast } from '@/common/ui/notifications';
import { getTextarea } from '../ui/dom';
import { MAX_REPORT_DATA_CHARS } from './reportLimits';
import type { AnalysisFlowCallbacks } from './analysisFlowTypes';

export function getAnalyzableReportText(
  container: HTMLElement,
  text: string,
  callbacks: AnalysisFlowCallbacks
): string | null {
  const cleanText = text.trim();
  if (!cleanText) {
    getTextarea(container, 'ppc-paste-input')?.focus();
    showToast('没有可分析的数据', { type: 'warning' });
    return null;
  }

  if (cleanText.length > MAX_REPORT_DATA_CHARS) {
    showToast('报表数据过大', {
      type: 'warning',
      description: `请控制在 ${callbacks.formatFileSize(MAX_REPORT_DATA_CHARS)} 以内`,
    });
    return null;
  }

  return cleanText;
}

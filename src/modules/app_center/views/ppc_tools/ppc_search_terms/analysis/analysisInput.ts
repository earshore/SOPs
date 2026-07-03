import { showToast } from '@/common/ui/notifications';
import { getElement, getTextarea } from '../ui/dom';
import { MAX_REPORT_DATA_CHARS } from './reportLimits';
import type { AnalysisFlowCallbacks } from './analysisFlowTypes';
import { setPpcStatus } from '../ui/reportControls';

export function getAnalyzableReportText(
  container: HTMLElement,
  text: string,
  callbacks: AnalysisFlowCallbacks
): string | null {
  const cleanText = text.trim();
  if (!cleanText) {
    getTextarea(container, 'ppc-paste-input')?.focus();
    setPasteInputError(container, '请先粘贴报表内容或选择报表文件。');
    setPpcStatus(container, '没有可分析的数据，请先粘贴报表内容或选择报表文件。', 'error');
    showToast('没有可分析的数据', { type: 'warning' });
    return null;
  }

  if (cleanText.length > MAX_REPORT_DATA_CHARS) {
    const message = `报表数据过大，请控制在 ${callbacks.formatFileSize(MAX_REPORT_DATA_CHARS)} 以内。`;
    setPasteInputError(container, message);
    setPpcStatus(container, message, 'error');
    showToast('报表数据过大', {
      type: 'warning',
      description: `请控制在 ${callbacks.formatFileSize(MAX_REPORT_DATA_CHARS)} 以内`,
    });
    return null;
  }

  setPasteInputError(container, '');
  return cleanText;
}

export function setPasteInputError(container: HTMLElement, message: string): void {
  const textarea = getTextarea(container, 'ppc-paste-input');
  const error = getElement(container, 'ppc-paste-error');

  if (textarea) {
    if (message) {
      textarea.setAttribute('aria-invalid', 'true');
    } else {
      textarea.removeAttribute('aria-invalid');
    }
  }

  if (!error) return;
  error.textContent = message;
  error.classList.toggle('hidden', !message);
}

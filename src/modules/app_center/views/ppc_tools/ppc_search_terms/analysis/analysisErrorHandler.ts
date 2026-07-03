import { showToast } from '@/common/ui/notifications';
import { isSearchTermReportType } from '../columns/columns';
import type { AnalysisResult } from './analysisEngine';
import type { AnalysisFlowCallbacks } from './analysisFlowTypes';
import { renderMappingStatus, setPpcStatus } from '../ui/reportControls';
import { readAnalysisSettings, type AnalysisSettings } from '../settings/settings';
import { setPasteInputError } from './analysisInput';

export function handleAnalysisError(
  container: HTMLElement,
  error: unknown,
  localResult: AnalysisResult | null,
  callbacks: AnalysisFlowCallbacks
): void {
  const message = error instanceof Error ? error.message : '报表解析失败';
  const settings = readAnalysisSettings(container);

  const fallbackResult = getLocalFallbackResult(settings, localResult);
  if (fallbackResult) {
    setPasteInputError(container, '');
    callbacks.setAnalyzedRows(fallbackResult.rows);
    renderMappingStatus(
      container,
      fallbackResult.mapping,
      fallbackResult.totalRows,
      fallbackResult.validRows,
      '已使用本地规则降级'
    );
    callbacks.renderResults(container, fallbackResult.rows);
    showToast('模型分析失败，已使用本地规则', { type: 'warning', description: message });
    return;
  }

  if (hasVisibleSearchTermResult(localResult, callbacks)) {
    setPasteInputError(container, '');
    renderMappingStatus(
      container,
      localResult.mapping,
      localResult.totalRows,
      localResult.validRows,
      'Agent 复核失败，当前展示本地初判结果'
    );
  } else {
    callbacks.setAnalyzedRows([]);
    callbacks.renderResults(container, []);
    setPasteInputError(container, message);
    setPpcStatus(container, `分析失败：${message}`, 'error');
  }
  showToast('分析失败', { type: 'error', description: message });
}

function getLocalFallbackResult(
  settings: AnalysisSettings,
  result: AnalysisResult | null
): AnalysisResult | null {
  return settings.allowLocalFallback ? result : null;
}

function hasVisibleSearchTermResult(
  result: AnalysisResult | null,
  callbacks: AnalysisFlowCallbacks
): result is AnalysisResult {
  return (
    result !== null && isSearchTermReportType(result.reportType) && callbacks.hasAnalyzedRows()
  );
}

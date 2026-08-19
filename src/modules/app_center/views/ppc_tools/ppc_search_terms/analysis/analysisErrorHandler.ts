import {
  formatLlmFailureUx,
  openSettingsFromLlmFailure,
  type LlmFailureUx,
} from '@/common/errors/llmFailureUx';
import { showToast } from '@/common/ui/notifications';

import { setPasteInputError } from './analysisInput';
import { isSearchTermReportType } from '../columns/columns';
import { readAnalysisSettings, type AnalysisSettings } from '../settings/settings';

import type { AnalysisResult } from './analysisEngine';
import type { AnalysisFlowCallbacks } from './analysisFlowTypes';

function detailFromLlmFailure(ux: LlmFailureUx): string {
  return ux.description ? `${ux.title}。${ux.description}` : ux.title;
}

function toastActionFromUx(ux: LlmFailureUx) {
  if (!ux.openSettings) return undefined;
  return {
    label: ux.actionLabel ?? '打开设置',
    onClick: () => openSettingsFromLlmFailure(ux.openSettings),
  };
}

export function handleAnalysisError(
  container: HTMLElement,
  error: unknown,
  localResult: AnalysisResult | null,
  callbacks: AnalysisFlowCallbacks
): void {
  const ux = formatLlmFailureUx(error);
  const detail = detailFromLlmFailure(ux);
  const settings = readAnalysisSettings(container);

  const fallbackResult = getLocalFallbackResult(settings, localResult);
  if (fallbackResult) {
    setPasteInputError(container, '');
    callbacks.setAnalyzedRows(fallbackResult.rows);
    callbacks.renderMappingStatus(
      container,
      fallbackResult.mapping,
      fallbackResult.totalRows,
      fallbackResult.validRows,
      '已使用本地规则降级'
    );
    callbacks.renderResults(container, fallbackResult.rows);
    // Keep title stable for UI tests / operators; detail may include settings CTA.
    showToast('模型分析失败，已使用本地规则', {
      type: 'warning',
      description: detail,
    });
    return;
  }

  if (hasVisibleSearchTermResult(localResult, callbacks)) {
    setPasteInputError(container, '');
    callbacks.renderMappingStatus(
      container,
      localResult.mapping,
      localResult.totalRows,
      localResult.validRows,
      'Agent 复核失败，当前展示本地初判结果'
    );
  } else {
    callbacks.setAnalyzedRows([]);
    callbacks.renderResults(container, []);
    setPasteInputError(container, detail);
    callbacks.setStatus(container, `分析失败：${detail}`, 'error');
  }

  // Config/auth failures: lead with actionable title; unknown LLM errors keep short "分析失败".
  const action = toastActionFromUx(ux);
  showToast(ux.openSettings ? ux.title : '分析失败', {
    type: ux.openSettings ? ux.toastType : 'error',
    description: ux.openSettings ? (ux.description ?? detail) : detail,
    ...(action ? { action } : {}),
  });
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

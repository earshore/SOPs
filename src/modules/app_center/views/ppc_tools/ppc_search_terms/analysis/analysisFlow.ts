import { analyzeReport, type AnalysisResult } from './analysisEngine';
import { handleAnalysisError } from './analysisErrorHandler';
import { getAnalyzableReportText } from './analysisInput';
import { clearActiveAnalysisRun, isCurrentAnalysisRun, startAnalysisRun } from './analysisRun';
import { applyAgentAnalysis } from '../agents/agentAnalysisFlow';
import {
  finishLocalAnalysisIfNeeded,
  getLocalAnalysisStatus,
} from '../utils/localAnalysisFeedback';
import {
  readAnalysisSettings,
  readReportSelection,
  readThresholds,
  saveAnalysisSettings,
  saveReportSelection,
  saveThresholds,
} from '../settings/settings';
import type { AnalysisFlowCallbacks } from './analysisFlowTypes';

export type { AnalysisFlowCallbacks } from './analysisFlowTypes';

export async function analyzeReportText(
  container: HTMLElement,
  text: string,
  callbacks: AnalysisFlowCallbacks
): Promise<void> {
  const cleanText = getAnalyzableReportText(container, text, callbacks);
  if (!cleanText) return;

  let localResult: AnalysisResult | null = null;
  const { runId, controller } = startAnalysisRun();
  callbacks.setAnalyzing(true);
  callbacks.setStatus(container, '正在分析报表数据，请稍候。');

  try {
    const thresholds = readThresholds(container);
    const settings = readAnalysisSettings(container);
    const reportSelection = readReportSelection(container);
    localResult = analyzeReport(cleanText, thresholds, reportSelection);

    callbacks.setSourceText(cleanText);
    callbacks.setAnalyzedRows(localResult.rows);
    callbacks.setActiveReportType(localResult.reportType);
    callbacks.resetResultControls(container, localResult.reportType);
    saveThresholds(thresholds);
    saveAnalysisSettings(settings);
    saveReportSelection(reportSelection);
    callbacks.renderMappingStatus(
      container,
      localResult.mapping,
      localResult.totalRows,
      localResult.validRows,
      getLocalAnalysisStatus(localResult.reportType, settings.useAgent)
    );
    callbacks.renderResults(container, localResult.rows);

    if (finishLocalAnalysisIfNeeded(localResult, settings)) return;

    await applyAgentAnalysis({
      container,
      localResult,
      thresholds,
      settings,
      run: { runId, controller },
      callbacks,
    });
  } catch (error) {
    if (!isCurrentAnalysisRun(runId)) return;
    handleAnalysisError(container, error, localResult, callbacks);
  } finally {
    if (isCurrentAnalysisRun(runId)) {
      clearActiveAnalysisRun(runId);
      callbacks.setAnalyzing(false);
    }
  }
}

export { cancelActiveAnalysis } from './analysisRun';

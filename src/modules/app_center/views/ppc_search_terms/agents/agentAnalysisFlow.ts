import { analyzePpcSearchTermsWithAgent } from '../services/llmAnalysisService';
import { isCurrentAnalysisRun, type ActiveAnalysisRun } from '../analysis/analysisRun';
import {
  applyModelDecisions,
  applyPartialModelDecisions,
  formatAgentStatus,
  formatAgentToast,
  hasProgressDecisions,
} from './agentReview';
import { renderMappingStatus } from '../ui/reportControls';
import type { AnalysisResult } from '../analysis/analysisEngine';
import type { AnalysisFlowCallbacks } from '../analysis/analysisFlowTypes';
import type { AnalysisSettings } from '../settings/settings';
import type { Thresholds } from '../types';
import { showToast } from '@/common/ui/notifications';

interface AgentAnalysisContext {
  container: HTMLElement;
  localResult: AnalysisResult;
  thresholds: Thresholds;
  settings: AnalysisSettings;
  run: ActiveAnalysisRun;
  callbacks: AnalysisFlowCallbacks;
}

export async function applyAgentAnalysis({
  container,
  localResult,
  thresholds,
  settings,
  run,
  callbacks,
}: AgentAnalysisContext): Promise<void> {
  const agentResult = await analyzePpcSearchTermsWithAgent({
    rows: localResult.rows,
    thresholds,
    context: settings.useContext ? settings.context : undefined,
    signal: run.controller.signal,
    onProgress: progress => {
      if (!isCurrentAnalysisRun(run.runId)) return;
      const progressDecisions = progress.decisions || [];
      if (hasProgressDecisions(progressDecisions, localResult)) {
        const rows = applyPartialModelDecisions(localResult.rows, progressDecisions);
        callbacks.setAnalyzedRows(rows);
        callbacks.renderResults(container, rows);
      }

      renderMappingStatus(
        container,
        localResult.mapping,
        localResult.totalRows,
        localResult.validRows,
        `Agent 语义工具复核中 ${progress.completedBatches}/${progress.totalBatches}`
      );
    },
  });

  if (!isCurrentAnalysisRun(run.runId)) return;
  const rows = applyModelDecisions(
    localResult.rows,
    agentResult.decisions,
    new Set(agentResult.modelDecisionIds)
  );
  callbacks.setAnalyzedRows(rows);
  renderMappingStatus(
    container,
    localResult.mapping,
    localResult.totalRows,
    localResult.validRows,
    formatAgentStatus(agentResult)
  );
  callbacks.renderResults(container, rows);
  showToast('PPC Agent 分析完成', { type: 'success', description: formatAgentToast(agentResult) });
}

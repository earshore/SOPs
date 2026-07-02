export interface ActiveAnalysisRun {
  runId: number;
  controller: AbortController;
}

let activeAnalysisRunId = 0;
let activeAnalysisController: AbortController | null = null;

export function startAnalysisRun(): ActiveAnalysisRun {
  cancelActiveAnalysis();
  const controller = new AbortController();
  activeAnalysisRunId += 1;
  activeAnalysisController = controller;
  return { runId: activeAnalysisRunId, controller };
}

export function cancelActiveAnalysis(): void {
  activeAnalysisRunId += 1;
  activeAnalysisController?.abort();
  activeAnalysisController = null;
}

export function isCurrentAnalysisRun(runId: number): boolean {
  return activeAnalysisRunId === runId;
}

export function clearActiveAnalysisRun(runId: number): void {
  if (isCurrentAnalysisRun(runId)) {
    activeAnalysisController = null;
  }
}

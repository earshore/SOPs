import type { AnalyzedRow, ReportType } from './types';

export interface AnalysisFlowCallbacks {
  setSourceText(text: string): void;
  setAnalyzedRows(rows: AnalyzedRow[]): void;
  setActiveReportType(reportType: ReportType): void;
  resetResultControls(container: HTMLElement, reportType: ReportType): void;
  renderResults(container: HTMLElement, rows: AnalyzedRow[]): void;
  hasAnalyzedRows(): boolean;
  formatFileSize(bytes: number): string;
}

import type { AnalyzedRow, ReportType } from '../types';
import type { ColumnMapping } from '../columns/columns';

export type AnalysisStatusTone = 'status' | 'error';

export interface AnalysisFlowCallbacks {
  setSourceText(text: string): void;
  setAnalyzedRows(rows: AnalyzedRow[]): void;
  setActiveReportType(reportType: ReportType): void;
  setAnalyzing(isAnalyzing: boolean): void;
  setStatus(container: HTMLElement, message: string, tone?: AnalysisStatusTone): void;
  renderMappingStatus(
    container: HTMLElement,
    mapping: ColumnMapping,
    totalRows: number,
    validRows: number,
    status?: string
  ): void;
  resetResultControls(container: HTMLElement, reportType: ReportType): void;
  renderResults(container: HTMLElement, rows: AnalyzedRow[]): void;
  hasAnalyzedRows(): boolean;
  formatFileSize(bytes: number): string;
}

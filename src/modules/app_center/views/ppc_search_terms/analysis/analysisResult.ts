import type { ColumnMapping } from '../columns/columns';
import type { AnalyzedRow, ReportType } from '../types';

export interface AnalysisResult {
  rows: AnalyzedRow[];
  mapping: ColumnMapping;
  reportType: ReportType;
  totalRows: number;
  validRows: number;
}

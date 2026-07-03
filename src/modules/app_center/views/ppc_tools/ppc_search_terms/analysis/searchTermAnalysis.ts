import { mapColumns, type ColumnMapping } from '../columns/columns';
import { readField, readSearchTermPerformanceMetrics } from './analysisMetrics';
import type { ParsedReport, RawRecord } from '../import/delimitedReport';
import { classifySearchTermMetrics } from '../rules/searchTermRules';
import type { AnalysisResult } from './analysisResult';
import type { AnalyzedRow, ReportType, Thresholds } from '../types';

export function analyzeSearchTermParsedReport(
  report: ParsedReport,
  thresholds: Thresholds,
  reportType: Extract<ReportType, 'search_term' | 'erp_search_term'>
): AnalysisResult {
  const mapping = mapColumns(report.headers, reportType);
  const rows = report.records
    .map((record, index) => analyzeSearchTermRecord(record, mapping, thresholds, index, reportType))
    .filter((row): row is AnalyzedRow => row !== null)
    .sort((a, b) => b.priority - a.priority || b.spend - a.spend);

  return {
    rows,
    mapping,
    reportType,
    totalRows: report.records.length,
    validRows: rows.length,
  };
}

function analyzeSearchTermRecord(
  record: RawRecord,
  mapping: ColumnMapping,
  thresholds: Thresholds,
  index: number,
  reportType: Extract<ReportType, 'search_term' | 'erp_search_term'>
): AnalyzedRow | null {
  const searchTerm =
    readField(record, mapping, 'searchTerm') || readField(record, mapping, 'keyword');
  if (!searchTerm) return null;

  const store = readField(record, mapping, 'shop');
  const currency = readField(record, mapping, 'currency');
  const metrics = readSearchTermPerformanceMetrics(record, mapping);
  const decision = classifySearchTermMetrics(metrics, thresholds);

  return {
    id: `${index}-${searchTerm}`,
    reportType,
    campaign: readField(record, mapping, 'campaign'),
    adGroup: readField(record, mapping, 'adGroup'),
    searchTerm,
    keyword: readField(record, mapping, 'keyword'),
    matchType: readField(record, mapping, 'matchType'),
    ...metrics,
    action: decision.type,
    actionLabel: decision.label,
    reason: decision.reason,
    priority: decision.priority,
    store,
    currency,
  };
}

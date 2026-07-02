import { resolveReportType } from './columns';
import { analyzeErpCampaignReport } from './campaignAnalysis';
import { parseReport } from './delimitedReport';
import { analyzeSearchTermParsedReport } from './searchTermAnalysis';
import type { AnalysisResult } from './analysisResult';
import type { ReportSelection, Thresholds } from './types';

export type { AnalysisResult } from './analysisResult';

export function analyzeReport(
  text: string,
  thresholds: Thresholds,
  selection: ReportSelection = 'auto'
): AnalysisResult {
  const report = parseReport(text.trim());
  const reportType = resolveReportType(report.headers, selection);

  if (reportType === 'erp_campaign') {
    return analyzeErpCampaignReport(report, thresholds);
  }

  return analyzeSearchTermParsedReport(report, thresholds, reportType);
}

export function analyzeSearchTermReport(text: string, thresholds: Thresholds): AnalysisResult {
  return analyzeSearchTermParsedReport(parseReport(text.trim()), thresholds, 'search_term');
}

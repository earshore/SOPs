import { classifyCampaignMetrics } from '../rules/campaignRules';
import { mapColumns, type ColumnMapping } from '../columns/columns';
import { readCampaignPerformanceMetrics, readField } from './analysisMetrics';
import type { ParsedReport, RawRecord } from '../import/delimitedReport';
import type { AnalysisResult } from './analysisResult';
import type { AnalyzedRow, Thresholds } from '../types';

export function analyzeErpCampaignReport(
  report: ParsedReport,
  thresholds: Thresholds
): AnalysisResult {
  const mapping = mapColumns(report.headers, 'erp_campaign');
  const rows = report.records
    .map((record, index) => analyzeCampaignRecord(record, mapping, thresholds, index))
    .filter((row): row is AnalyzedRow => row !== null)
    .sort((a, b) => b.priority - a.priority || b.spend - a.spend || b.orders - a.orders);

  return {
    rows,
    mapping,
    reportType: 'erp_campaign',
    totalRows: report.records.length,
    validRows: rows.length,
  };
}

function analyzeCampaignRecord(
  record: RawRecord,
  mapping: ColumnMapping,
  thresholds: Thresholds,
  index: number
): AnalyzedRow | null {
  const campaign = readField(record, mapping, 'campaign');
  if (!campaign) return null;

  const shop = readField(record, mapping, 'shop');
  const currency = readField(record, mapping, 'currency');
  const status = readField(record, mapping, 'status');
  const serviceStatus = readField(record, mapping, 'serviceStatus');
  const displayStatus = serviceStatus || status;
  const targetingType = readField(record, mapping, 'targetingType');
  const adType = readField(record, mapping, 'adType');
  const bidStrategy = readField(record, mapping, 'bidStrategy');
  const metrics = readCampaignPerformanceMetrics(record, mapping);
  const decision = classifyCampaignMetrics(
    {
      status,
      serviceStatus,
      ...metrics,
    },
    thresholds
  );

  return {
    id: `${index}-${shop}-${campaign}`,
    reportType: 'erp_campaign',
    campaign: shop,
    adGroup: targetingType,
    searchTerm: campaign,
    keyword: [adType, displayStatus, bidStrategy].filter(Boolean).join(' / '),
    matchType: targetingType,
    ...metrics,
    action: decision.type,
    actionLabel: decision.label,
    reason: decision.reason,
    priority: decision.priority,
    store: shop,
    currency,
    serviceStatus: displayStatus,
    targetingType,
  };
}

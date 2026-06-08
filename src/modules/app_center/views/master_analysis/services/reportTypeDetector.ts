/**
 * 报告类型检测工具
 * 识别各种报告格式
 */

import type {
  CompetitorReport,
  ProductOverviewReport,
  SemanticAnalysisReport
} from '../types/downloadsReportTypes';
import type { FullAnalysisReport } from '../ai_analysis/config/analysisReportData';
import { ReportType } from '../types/downloadsReportTypes';

type ReportRecord = Record<string, unknown>;

function isReportRecord(report: unknown): report is ReportRecord {
  return !!report && typeof report === 'object';
}

function getRecordField(report: ReportRecord, key: string): ReportRecord | null {
  const value = report[key];
  return isReportRecord(value) ? value : null;
}

function hasAnyField(report: ReportRecord, keys: string[]): boolean {
  return keys.some(key => !!report[key]);
}

/**
 * 检测报告类型（基于字段特征）
 *
 * @param report 待检测的报告对象
 * @returns 报告类型
 */
export function detectReportType(report: unknown): ReportType {
  if (!isReportRecord(report)) {
    console.warn('[报告检测] 无效的报告对象');
    return ReportType.UNKNOWN;
  }

  // 优先检测 Full Analysis Report（应用中实际使用的格式）
  if (isFullAnalysisReport(report)) {
    console.log('[报告检测] 识别为 Full Analysis Report');
    return ReportType.FULL_ANALYSIS;
  }

  // 检测 Competitor Report 特征
  if (isCompetitorReport(report)) {
    console.log('[报告检测] 识别为 Competitor Report');
    return ReportType.COMPETITOR;
  }

  // 检测 Product Overview Report 特征
  if (isProductOverviewReport(report)) {
    console.log('[报告检测] 识别为 Product Overview Report');
    return ReportType.PRODUCT_OVERVIEW;
  }

  // 检测 Semantic Analysis Report 特征
  if (isSemanticAnalysisReport(report)) {
    console.log('[报告检测] 识别为 Semantic Analysis Report');
    return ReportType.SEMANTIC_ANALYSIS;
  }

  const reportObj = report as ReportRecord;
  console.warn('[报告检测] 未识别的报告格式', {
    hasBuyerProfile: !!(reportObj['buyer-profile'] || reportObj.buyer_profile),
    hasSellingPoints: !!(reportObj['selling-points'] || reportObj.selling_points),
    hasCompetitorInsights: hasAnyField(reportObj, ['competitor_insights', 'competitorInsights']),
    hasProductOverview: hasAnyField(reportObj, ['productOverview', 'product_overview']),
    hasPainPointGaps: !!reportObj.pain_point_gaps,
    metaTemplateId: getRecordField(reportObj, 'meta')?.templateId
  });

  return ReportType.UNKNOWN;
}

/**
 * 检测是否为 Full Analysis Report（应用实际使用的格式）
 */
function isFullAnalysisReport(report: unknown): report is FullAnalysisReport {
  if (!isReportRecord(report)) return false;

  // 检查是否有 FullAnalysisReport 的特征字段
  const hasBuyerProfile = !!(report['buyer-profile'] || report.buyer_profile);
  const hasSellingPoints = !!(report['selling-points'] || report.selling_points);

  // 至少需要有 buyer-profile 或 selling-points 之一
  // 并且不应该有 Downloads 格式的特征字段
  const hasDownloadsFields = !!(
    report.competitor_insights ||
    report.competitorInsights ||
    report.productOverview ||
    report.product_overview ||
    report.pain_point_gaps
  );

  return (hasBuyerProfile || hasSellingPoints) && !hasDownloadsFields;
}

/**
 * 检测是否为 Competitor Report
 */
function isCompetitorReport(report: unknown): report is CompetitorReport {
  if (!isReportRecord(report)) return false;

  const featurePoints = report.feature_points || report.featurePoints;

  return !!(
    hasAnyField(report, ['competitor_insights', 'competitorInsights']) &&
    Array.isArray(featurePoints) &&
    hasAnyField(report, ['keyword_clusters', 'keywordClusters'])
  );
}

/**
 * 检测是否为 Product Overview Report
 */
function isProductOverviewReport(report: unknown): report is ProductOverviewReport {
  if (!isReportRecord(report)) return false;

  const coreFeatures = report.coreFeatures || report.core_features;

  return !!(
    hasAnyField(report, ['productOverview', 'product_overview']) &&
    hasAnyField(report, ['user_profile', 'userProfile']) &&
    coreFeatures &&
    typeof coreFeatures === 'object'
  );
}

/**
 * 检测是否为 Semantic Analysis Report
 */
function isSemanticAnalysisReport(report: unknown): report is SemanticAnalysisReport {
  if (!isReportRecord(report)) return false;

  const meta = getRecordField(report, 'meta');
  const templateUsed = meta?.templateUsed;

  return !!(
    report.pain_point_gaps &&
    report.native_voice &&
    report.high_frequency_phrases &&
    (meta?.templateId === 'semantic' ||
      (typeof templateUsed === 'string' && templateUsed.includes('语义')))
  );
}

/**
 * 验证报告是否为支持的格式
 */
export function isSupportedReport(report: unknown): boolean {
  return detectReportType(report) !== ReportType.UNKNOWN;
}

/**
 * 获取报告的元数据信息
 */
export function getReportMetadata(report: unknown): {
  type: ReportType;
  asins: string[];
  market: string;
  generatedAt: string;
} {
  const type = detectReportType(report);

  let asins: string[] = [];
  let market = 'unknown';
  let generatedAt = '';

  const meta = isReportRecord(report) ? getRecordField(report, 'meta') : null;
  if (meta) {
    const metaAsins = meta.analyzedASINs || meta.asins;
    asins = Array.isArray(metaAsins) ? metaAsins.filter((asin): asin is string => typeof asin === 'string') : [];
    market = typeof meta.targetMarket === 'string'
      ? meta.targetMarket
      : typeof meta.market === 'string'
        ? meta.market
        : 'unknown';
    generatedAt = typeof meta.generatedAt === 'string' ? meta.generatedAt : '';
  }

  return { type, asins, market, generatedAt };
}

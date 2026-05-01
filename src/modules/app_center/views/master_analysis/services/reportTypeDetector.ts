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
import { Logger } from '../../../../../services/loggerService';

/**
 * 检测报告类型（基于字段特征）
 *
 * @param report 待检测的报告对象
 * @returns 报告类型
 */
export function detectReportType(report: any): ReportType {
  if (!report || typeof report !== 'object') {
    Logger.warn('[报告检测] 无效的报告对象');
    return ReportType.UNKNOWN;
  }

  // 优先检测 Full Analysis Report（应用中实际使用的格式）
  if (isFullAnalysisReport(report)) {
    Logger.debug('[报告检测] 识别为 Full Analysis Report');
    return ReportType.FULL_ANALYSIS;
  }

  // 检测 Competitor Report 特征
  if (isCompetitorReport(report)) {
    Logger.debug('[报告检测] 识别为 Competitor Report');
    return ReportType.COMPETITOR;
  }

  // 检测 Product Overview Report 特征
  if (isProductOverviewReport(report)) {
    Logger.debug('[报告检测] 识别为 Product Overview Report');
    return ReportType.PRODUCT_OVERVIEW;
  }

  // 检测 Semantic Analysis Report 特征
  if (isSemanticAnalysisReport(report)) {
    Logger.debug('[报告检测] 识别为 Semantic Analysis Report');
    return ReportType.SEMANTIC_ANALYSIS;
  }

  Logger.warn('[报告检测] 未识别的报告格式', {
    hasBuyerProfile: !!(report['buyer-profile'] || report.buyer_profile),
    hasSellingPoints: !!(report['selling-points'] || report.selling_points),
    hasCompetitorInsights: !!report.competitor_insights,
    hasProductOverview: !!report.productOverview,
    hasPainPointGaps: !!report.pain_point_gaps,
    metaTemplateId: report.meta?.templateId
  });

  return ReportType.UNKNOWN;
}

/**
 * 检测是否为 Full Analysis Report（应用实际使用的格式）
 */
function isFullAnalysisReport(report: any): report is FullAnalysisReport {
  // 检查是否有 FullAnalysisReport 的特征字段
  const hasBuyerProfile = !!(report['buyer-profile'] || report.buyer_profile);
  const hasSellingPoints = !!(report['selling-points'] || report.selling_points);

  // 至少需要有 buyer-profile 或 selling-points 之一
  // 并且不应该有 Downloads 格式的特征字段
  const hasDownloadsFields = !!(
    report.competitor_insights ||
    report.productOverview ||
    report.pain_point_gaps
  );

  return (hasBuyerProfile || hasSellingPoints) && !hasDownloadsFields;
}

/**
 * 检测是否为 Competitor Report
 */
function isCompetitorReport(report: any): report is CompetitorReport {
  return !!(
    report.competitor_insights &&
    report.feature_points &&
    Array.isArray(report.feature_points) &&
    report.keyword_clusters
  );
}

/**
 * 检测是否为 Product Overview Report
 */
function isProductOverviewReport(report: any): report is ProductOverviewReport {
  return !!(
    report.productOverview &&
    report.coreFeatures &&
    report.user_profile &&
    typeof report.coreFeatures === 'object'
  );
}

/**
 * 检测是否为 Semantic Analysis Report
 */
function isSemanticAnalysisReport(report: any): report is SemanticAnalysisReport {
  return !!(
    report.pain_point_gaps &&
    report.native_voice &&
    report.high_frequency_phrases &&
    (report.meta?.templateId === 'semantic' || report.meta?.templateUsed?.includes('语义'))
  );
}

/**
 * 验证报告是否为支持的格式
 */
export function isSupportedReport(report: any): boolean {
  return detectReportType(report) !== ReportType.UNKNOWN;
}

/**
 * 获取报告的元数据信息
 */
export function getReportMetadata(report: any): {
  type: ReportType;
  asins: string[];
  market: string;
  generatedAt: string;
} {
  const type = detectReportType(report);

  let asins: string[] = [];
  let market = 'unknown';
  let generatedAt = '';

  if (report.meta) {
    asins = report.meta.analyzedASINs || report.meta.asins || [];
    market = report.meta.targetMarket || report.meta.market || 'unknown';
    generatedAt = report.meta.generatedAt || '';
  }

  return { type, asins, market, generatedAt };
}

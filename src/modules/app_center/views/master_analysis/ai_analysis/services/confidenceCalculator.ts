/**
 * AI 分析报告置信度计算器
 * 为每种报告类型计算置信度分数 (0-1)
 */

import type {
  TitleKeywordsReport,
  SellingPointsReport,
  FatalFlawsReport,
  WowMomentsReport,
  HesitationPointsReport,
  BuyerProfileReport,
  VocabGapReport,
  PromiseRealityReport,
} from '../config/analysisReportData';

/**
 * 置信度阈值配置
 */
const CONFIDENCE_THRESHOLDS = {
  MIN_ACCEPTABLE: 0.2, // 最低可接受置信度
  HIGH_QUALITY: 0.7, // 高质量阈值
  MEDIUM_QUALITY: 0.5, // 中等质量阈值
};

function checkStringQuality(value: string): number {
  const trimmed = value.trim();
  if (trimmed.length === 0) return 0;
  if (trimmed.includes('未能') || trimmed.includes('无法') || trimmed.includes('错误')) return 0.1;
  if (trimmed.length < 5) return 0.3;
  if (trimmed.length < 20) return 0.6;
  return 1.0;
}

function isNonEmptyRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && Object.keys(value).length > 0;
}

function isValidArrayItem(item: unknown): boolean {
  if (typeof item === 'string') return item.trim().length > 0;
  return isNonEmptyRecord(item);
}

function checkArrayQuality(value: unknown[]): number {
  if (value.length === 0) return 0;
  return value.filter(isValidArrayItem).length / value.length;
}

/**
 * 通用数据质量检查
 */
function checkDataQuality(value: unknown): number {
  if (value === null || value === undefined) return 0;

  if (typeof value === 'string') {
    return checkStringQuality(value);
  }

  if (Array.isArray(value)) {
    return checkArrayQuality(value);
  }

  if (typeof value === 'object') {
    return isNonEmptyRecord(value) ? 1.0 : 0;
  }

  return 0.5;
}

function scoreOptionalQuality(value: unknown): number {
  return value === null || value === undefined ? 0 : checkDataQuality(value);
}

function scoreByArrayLength(items: unknown, targetCount: number, emptyScore = 0): number {
  if (!Array.isArray(items)) return 0;
  if (items.length === 0) return emptyScore;
  return Math.min(items.length / targetCount, 1.0);
}

function scoreByValidText<T>(
  items: T[] | undefined,
  getText: (item: T) => string | undefined,
  targetCount: number
): number {
  if (!Array.isArray(items)) return 0;

  const validItems = items.filter(item => {
    const text = getText(item);
    return typeof text === 'string' && text.trim().length > 0;
  });
  return validItems.length > 0 ? Math.min(validItems.length / targetCount, 1.0) : 0;
}

function scoreAnyArrayContent(...items: unknown[]): number {
  return items.some(item => Array.isArray(item) && item.length > 0) ? 0.8 : 0;
}

function finalizeConfidence(scores: number[]): number {
  if (scores.length === 0) {
    return 0;
  }

  const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  const clampedScore = Math.max(0, Math.min(1, avgScore));
  return clampedScore;
}

/**
 * 计算 Title Keywords 报告置信度
 */
export function calculateTitleKeywordsConfidence(report: TitleKeywordsReport | null): number {
  if (!report) {
    console.error('[置信度] Title Keywords 报告为空');
    return 0;
  }

  const scores: number[] = [];

  try {
    // 检查主关键词
    if (report.primary_keywords && Array.isArray(report.primary_keywords)) {
      const validPrimary = report.primary_keywords.filter(
        k => k.keyword && k.keyword.trim().length > 0
      );
      scores.push(validPrimary.length > 0 ? Math.min(validPrimary.length / 3, 1.0) : 0);
    } else {
      scores.push(0);
    }

    // 检查次要关键词
    if (report.secondary_keywords && Array.isArray(report.secondary_keywords)) {
      const validSecondary = report.secondary_keywords.filter(
        k => k.keyword && k.keyword.trim().length > 0
      );
      scores.push(validSecondary.length > 0 ? Math.min(validSecondary.length / 5, 1.0) : 0);
    } else {
      scores.push(0);
    }

    // 检查优化建议
    scores.push(checkDataQuality(report.optimization_suggestions));

    if (scores.length === 0) {
      return 0;
    }

    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const clampedScore = Math.max(0, Math.min(1, avgScore));
    return clampedScore;
  } catch (error) {
    console.error('[置信度] Title Keywords 计算失败:', error);
    return 0;
  }
}

/**
 * 计算 Selling Points 报告置信度
 */
export function calculateSellingPointsConfidence(report: SellingPointsReport | null): number {
  if (!report) {
    console.error('[置信度] Selling Points 报告为空');
    return 0;
  }

  const scores: number[] = [];

  try {
    scores.push(scoreByValidText(report.bullet_analysis, b => b.original_text_summary, 3));
    scores.push(scoreOptionalQuality(report.overall_strategy?.primary_differentiation));
    scores.push(
      scoreAnyArrayContent(
        report.function_scene_matrix?.functions,
        report.function_scene_matrix?.scenes
      )
    );

    return finalizeConfidence(scores);
  } catch (error) {
    console.error('[置信度] Selling Points 计算失败:', error);
    return 0;
  }
}

/**
 * 计算 Fatal Flaws 报告置信度
 */
export function calculateFatalFlawsConfidence(report: FatalFlawsReport | null): number {
  if (!report) {
    console.error('[置信度] Fatal Flaws 报告为空');
    return 0;
  }

  const scores: number[] = [];

  try {
    // 检查致命缺陷
    if (report.critical_issues && Array.isArray(report.critical_issues)) {
      // 致命缺陷可能为空（产品很好），所以空数组也给一定分数
      scores.push(
        report.critical_issues.length === 0 ? 0.8 : Math.min(report.critical_issues.length / 2, 1.0)
      );
    } else {
      scores.push(0);
    }

    // 检查风险评估
    if (report.risk_assessment) {
      scores.push(checkDataQuality(report.risk_assessment.overall_risk_level));
    } else {
      scores.push(0);
    }

    // 检查可行性修复建议
    scores.push(checkDataQuality(report.actionable_fixes));

    if (scores.length === 0) {
      return 0;
    }

    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const clampedScore = Math.max(0, Math.min(1, avgScore));
    return clampedScore;
  } catch (error) {
    console.error('[置信度] Fatal Flaws 计算失败:', error);
    return 0;
  }
}

/**
 * 计算 Wow Moments 报告置信度
 */
export function calculateWowMomentsConfidence(report: WowMomentsReport | null): number {
  if (!report) {
    console.error('[置信度] Wow Moments 报告为空');
    return 0;
  }

  const scores: number[] = [];

  try {
    // 检查惊喜时刻
    if (report.moments && Array.isArray(report.moments)) {
      const validMoments = report.moments.filter(
        m => m.moment_description && m.moment_description.trim().length > 0
      );
      scores.push(validMoments.length > 0 ? Math.min(validMoments.length / 2, 1.0) : 0);
    } else {
      scores.push(0);
    }

    // 检查情感触发器
    scores.push(checkDataQuality(report.emotional_triggers));

    // 检查文案角度
    scores.push(checkDataQuality(report.copywriting_angles));

    if (scores.length === 0) {
      return 0;
    }

    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const clampedScore = Math.max(0, Math.min(1, avgScore));
    return clampedScore;
  } catch (error) {
    console.error('[置信度] Wow Moments 计算失败:', error);
    return 0;
  }
}

/**
 * 计算 Hesitation Points 报告置信度
 */
export function calculateHesitationPointsConfidence(report: HesitationPointsReport | null): number {
  if (!report) {
    console.error('[置信度] Hesitation Points 报告为空');
    return 0;
  }

  const scores: number[] = [];

  try {
    // 检查犹豫点
    if (report.hesitations && Array.isArray(report.hesitations)) {
      const validPoints = report.hesitations.filter(
        p => p.pre_purchase_worry && p.pre_purchase_worry.trim().length > 0
      );
      scores.push(validPoints.length > 0 ? Math.min(validPoints.length / 3, 1.0) : 0);
    } else {
      scores.push(0);
    }

    // 检查常见疑虑
    scores.push(checkDataQuality(report.common_doubts));

    // 检查信任建立者
    scores.push(checkDataQuality(report.trust_builders));

    if (scores.length === 0) {
      return 0;
    }

    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const clampedScore = Math.max(0, Math.min(1, avgScore));
    return clampedScore;
  } catch (error) {
    console.error('[置信度] Hesitation Points 计算失败:', error);
    return 0;
  }
}

/**
 * 计算 Buyer Profile 报告置信度
 */
export function calculateBuyerProfileConfidence(report: BuyerProfileReport | null): number {
  if (!report) {
    console.error('[置信度] Buyer Profile 报告为空');
    return 0;
  }

  const scores: number[] = [];

  try {
    scores.push(scoreOptionalQuality(report.demographics?.likely_gender));
    scores.push(scoreByArrayLength(report.buyer_types, 3));
    scores.push(scoreByArrayLength(report.usage_scenes, 2));
    scores.push(checkDataQuality(report.purchase_motivations));

    return finalizeConfidence(scores);
  } catch (error) {
    console.error('[置信度] Buyer Profile 计算失败:', error);
    return 0;
  }
}

/**
 * 计算 Vocab Gap 报告置信度
 */
export function calculateVocabGapConfidence(report: VocabGapReport | null): number {
  if (!report) {
    console.error('[置信度] Vocab Gap 报告为空');
    return 0;
  }

  const scores: number[] = [];

  try {
    // 未覆盖术语可能为空（词汇很完整），所以空数组也给一定分数
    scores.push(scoreByArrayLength(report.uncovered_buyer_terms, 5, 0.8));
    scores.push(checkDataQuality(report.term_translations));
    scores.push(
      scoreAnyArrayContent(
        report.listing_optimization?.title_additions,
        report.listing_optimization?.bullet_additions
      )
    );

    return finalizeConfidence(scores);
  } catch (error) {
    console.error('[置信度] Vocab Gap 计算失败:', error);
    return 0;
  }
}

/**
 * 计算 Promise Reality 报告置信度
 */
export function calculatePromiseRealityConfidence(report: PromiseRealityReport | null): number {
  if (!report) {
    console.error('[置信度] Promise Reality 报告为空');
    return 0;
  }

  const scores: number[] = [];

  try {
    // 检查承诺现实差距
    if (report.gaps && Array.isArray(report.gaps)) {
      const validGaps = report.gaps.filter(
        g => g.listing_claim && g.listing_claim.trim().length > 0
      );
      scores.push(validGaps.length > 0 ? Math.min(validGaps.length / 3, 1.0) : 0);
    } else {
      scores.push(0);
    }

    // 检查总体可信度
    if (report.overall_credibility) {
      scores.push(checkDataQuality(report.overall_credibility.score));
    } else {
      scores.push(0);
    }

    // 检查已验证声明
    scores.push(checkDataQuality(report.verified_claims));

    if (scores.length === 0) {
      return 0;
    }

    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const clampedScore = Math.max(0, Math.min(1, avgScore));
    return clampedScore;
  } catch (error) {
    console.error('[置信度] Promise Reality 计算失败:', error);
    return 0;
  }
}

/**
 * 计算完整报告的置信度
 */
export function calculateFullReportConfidence(
  report: Record<string, unknown>
): Record<string, number> {
  const confidence: Record<string, number> = {};

  if (report['title-keywords']) {
    confidence['title-keywords'] = calculateTitleKeywordsConfidence(
      report['title-keywords'] as TitleKeywordsReport
    );
  }

  if (report['selling-points']) {
    confidence['selling-points'] = calculateSellingPointsConfidence(
      report['selling-points'] as SellingPointsReport
    );
  }

  if (report['fatal-flaws']) {
    confidence['fatal-flaws'] = calculateFatalFlawsConfidence(
      report['fatal-flaws'] as FatalFlawsReport
    );
  }

  if (report['wow-moments']) {
    confidence['wow-moments'] = calculateWowMomentsConfidence(
      report['wow-moments'] as WowMomentsReport
    );
  }

  if (report['hesitation-points']) {
    confidence['hesitation-points'] = calculateHesitationPointsConfidence(
      report['hesitation-points'] as HesitationPointsReport
    );
  }

  if (report['buyer-profile']) {
    confidence['buyer-profile'] = calculateBuyerProfileConfidence(
      report['buyer-profile'] as BuyerProfileReport
    );
  }

  if (report['vocab-gap']) {
    confidence['vocab-gap'] = calculateVocabGapConfidence(report['vocab-gap'] as VocabGapReport);
  }

  if (report['promise-reality']) {
    confidence['promise-reality'] = calculatePromiseRealityConfidence(
      report['promise-reality'] as PromiseRealityReport
    );
  }

  return confidence;
}

/**
 * 计算总体置信度
 */
export function calculateOverallConfidence(confidenceScores: Record<string, number>): number {
  const scores = Object.values(confidenceScores);
  if (scores.length === 0) return 0;

  const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  return avgScore;
}

/**
 * 获取置信度等级
 */
export function getConfidenceLevel(score: number): 'high' | 'medium' | 'low' {
  if (score >= CONFIDENCE_THRESHOLDS.HIGH_QUALITY) return 'high';
  if (score >= CONFIDENCE_THRESHOLDS.MEDIUM_QUALITY) return 'medium';
  return 'low';
}

/**
 * 获取置信度颜色类
 */
export function getConfidenceColorClass(score: number): string {
  const level = getConfidenceLevel(score);
  switch (level) {
    case 'high':
      return 'bg-green-100 text-green-700';
    case 'medium':
      return 'bg-yellow-100 text-yellow-700';
    case 'low':
      return 'bg-orange-100 text-orange-700';
  }
}

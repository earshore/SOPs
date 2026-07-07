/**
 * Product Overview Report 适配器
 * 从产品概览报告中提取产品 DNA
 */

import type { ReportAdapter, ExtractionResult } from './ReportAdapter';
import type { ProductOverviewReport } from '../../types/downloadsReportTypes';
import type { ExtendedDNA } from '../../types/extendedDNA';
import { isTechnicalSpec } from '../../utils/specUtils';
import { ValidationError } from '@/common/errors/AppError';

type ProductOverviewUserProfileInput = Partial<ProductOverviewReport['user_profile']> & {
  demographics?: Partial<ProductOverviewReport['user_profile']['demographics']> & {
    ageRanges?: string[];
  };
  painPoints?: string[];
  priceSensitivity?: string;
  decisionDrivers?: string[];
};

type ProductOverviewReportInput = Partial<Omit<ProductOverviewReport, 'user_profile'>> & {
  product_overview?: ProductOverviewReport['productOverview'];
  core_features?: ProductOverviewReport['coreFeatures'];
  user_profile?: ProductOverviewUserProfileInput;
  userProfile?: ProductOverviewUserProfileInput;
  differentiation_angles?: ProductOverviewReport['differentiationAngles'];
  keyword_clusters?: ProductOverviewReport['keywordClusters'];
  compliance_risks?: ProductOverviewReport['complianceRisks'];
};

type ProductOverviewReportInputKey = keyof ProductOverviewReportInput;
type ProductOverviewUserProfileKey = keyof ProductOverviewUserProfileInput;
type ProductOverviewDemographicsInput = Partial<
  ProductOverviewReport['user_profile']['demographics']
> & {
  ageRanges?: string[];
};
type ProductOverviewDemographicsKey = keyof ProductOverviewDemographicsInput;

function pickOverviewField<T>(
  reportObj: ProductOverviewReportInput,
  keys: ProductOverviewReportInputKey[],
  fallback: T
): T {
  for (const key of keys) {
    const value = reportObj[key];
    if (value) return value as T;
  }
  return fallback;
}

function pickUserProfileField<T>(
  userProfile: ProductOverviewUserProfileInput,
  keys: ProductOverviewUserProfileKey[],
  fallback: T
): T {
  for (const key of keys) {
    const value = userProfile[key];
    if (value) return value as T;
  }
  return fallback;
}

function pickDemographicField<T>(
  demographics: ProductOverviewDemographicsInput,
  keys: ProductOverviewDemographicsKey[],
  fallback: T
): T {
  for (const key of keys) {
    const value = demographics[key];
    if (value) return value as T;
  }
  return fallback;
}

function normalizeProductOverviewUserProfile(
  reportObj: ProductOverviewReportInput
): ProductOverviewReport['user_profile'] {
  const userProfile = pickOverviewField<ProductOverviewUserProfileInput>(
    reportObj,
    ['user_profile', 'userProfile'],
    {}
  );
  const demographics = (userProfile.demographics || {}) as ProductOverviewDemographicsInput;

  return {
    demographics: {
      age_ranges: pickDemographicField(demographics, ['age_ranges', 'ageRanges'], []),
      locations: pickDemographicField(demographics, ['locations'], []),
      household: pickDemographicField(demographics, ['household'], []),
    },
    goals: pickUserProfileField(userProfile, ['goals'], []),
    pain_points: pickUserProfileField(userProfile, ['pain_points', 'painPoints'], []),
    scenarios: pickUserProfileField(userProfile, ['scenarios'], []),
    objections: pickUserProfileField(userProfile, ['objections'], []),
    price_sensitivity: pickUserProfileField(
      userProfile,
      ['price_sensitivity', 'priceSensitivity'],
      ''
    ),
    decision_drivers: pickUserProfileField(
      userProfile,
      ['decision_drivers', 'decisionDrivers'],
      []
    ),
  };
}

function createEmptyKeywordClusters(): ProductOverviewReport['keywordClusters'] {
  return {
    core: [],
    longTail: [],
    intent: [],
  };
}

const KEYWORD_FIELD_CONFIDENCE = {
  CORE: 0.85,
  LONG_TAIL: 0.75,
  INTENT: 0.7,
} as const;

/**
 * Product Overview Report 适配器实现
 */
export class ProductOverviewAdapter implements ReportAdapter {
  getName(): string {
    return 'ProductOverviewAdapter';
  }

  canHandle(report: unknown): boolean {
    // 类型守卫：确保 report 是对象
    if (!report || typeof report !== 'object') {
      return false;
    }

    const reportObj = report as Record<string, unknown>;

    // 放宽条件：支持字段命名变体
    const hasProductOverview = !!(reportObj.productOverview || reportObj.product_overview);
    const hasCoreFeatures = !!(reportObj.coreFeatures || reportObj.core_features);
    const hasUserProfile = !!(reportObj.user_profile || reportObj.userProfile);

    // 只要有 productOverview 和其他任意一个字段即可
    const result = hasProductOverview && (hasCoreFeatures || hasUserProfile);

    // 移除频繁调用的 debug 日志，减少生产环境性能开销

    return result;
  }

  extractDNA(report: unknown, _language: string = 'zh'): ExtendedDNA | null {
    if (!this.canHandle(report)) {
      return null;
    }

    // 规范化字段名（支持 snake_case 和 camelCase）
    const overviewReport = this.normalizeReport(report);

    try {
      // 移除 "开始提取" debug 日志，减少生产环境噪音

      // 提取各个部分
      const keywords = this.extractKeywords(overviewReport);
      const highFrequencyPhrases = this.extractHighFrequencyPhrases(overviewReport);
      const audience = this.extractAudience(overviewReport);
      const usps = this.extractUSPs(overviewReport);
      const specs = this.extractSpecs(overviewReport);
      const restrictedWords = this.extractRestrictedWords(overviewReport);
      const painPoints = this.extractPainPoints(overviewReport);
      const differentiation = this.extractDifferentiation(overviewReport);

      // 构建 DNA 对象
      const dna: ExtendedDNA = {
        audience: audience.data,
        usps: usps.data,
        specs: specs.data,
        keywords: keywords.data,
        restrictedWords: restrictedWords.data,
        highFrequencyPhrases: highFrequencyPhrases.data,
        painPoints: painPoints.data,
        differentiationAngles: differentiation.data,
        confidence: {
          audience: audience.confidence,
          usps: usps.confidence,
          specs: specs.confidence,
          keywords: keywords.confidence,
          keywordsCore: keywords.data.core.length > 0 ? KEYWORD_FIELD_CONFIDENCE.CORE : 0,
          keywordsLongTail:
            keywords.data.longTail.length > 0 ? KEYWORD_FIELD_CONFIDENCE.LONG_TAIL : 0,
          keywordsIntent: keywords.data.intent.length > 0 ? KEYWORD_FIELD_CONFIDENCE.INTENT : 0,
          restrictedWords: restrictedWords.confidence,
          highFrequencyPhrases: highFrequencyPhrases.confidence,
          painPoints: painPoints.confidence,
          differentiationAngles: differentiation.confidence,
        },
        metadata: {
          extractedAt: new Date().toISOString(),
          reportType: 'product_overview',
          sourceFields: [
            ...new Set([
              ...keywords.sourceFields,
              ...highFrequencyPhrases.sourceFields,
              ...audience.sourceFields,
              ...usps.sourceFields,
              ...specs.sourceFields,
              ...restrictedWords.sourceFields,
              ...painPoints.sourceFields,
              ...differentiation.sourceFields,
            ]),
          ],
          fieldSources: {
            audience: audience.sourceFields,
            usps: usps.sourceFields,
            specs: specs.sourceFields,
            keywordsCore:
              keywords.data.core.length > 0
                ? keywords.sourceFields.filter(source => source.includes('core'))
                : [],
            keywordsLongTail:
              keywords.data.longTail.length > 0
                ? keywords.sourceFields.filter(source => source.includes('longTail'))
                : [],
            keywordsIntent:
              keywords.data.intent.length > 0
                ? keywords.sourceFields.filter(source => source.includes('intent'))
                : [],
            restrictedWords: restrictedWords.sourceFields,
          },
          stats: {
            totalKeywords:
              keywords.data.core.length +
              keywords.data.longTail.length +
              keywords.data.intent.length,
            totalRestrictedWords: restrictedWords.data.length,
            totalPhrases: highFrequencyPhrases.data.length,
            totalPainPoints: painPoints.data.length,
            totalDifferentiationAngles: differentiation.data.length,
          },
        },
      };

      return dna;
    } catch (error) {
      console.error('[ProductOverviewAdapter] 提取失败:', error);
      return null;
    }
  }

  /**
   * 提取分类关键词
   */
  private extractKeywords(report: ProductOverviewReport): ExtractionResult<{
    core: string[];
    longTail: string[];
    intent: string[];
  }> {
    const clusters = report.keywordClusters;
    let confidence = 0;
    const sourceFields: string[] = [];

    const data = {
      core: clusters?.core || [],
      longTail: clusters?.longTail || [],
      intent: clusters?.intent || [],
    };

    if (data.core.length > 0) {
      confidence += 0.4;
      sourceFields.push('keywordClusters.core');
    }
    if (data.longTail.length > 0) {
      confidence += 0.3;
      sourceFields.push('keywordClusters.longTail');
    }
    if (data.intent.length > 0) {
      confidence += 0.3;
      sourceFields.push('keywordClusters.intent');
    }

    return { data, confidence: Math.min(confidence, 1.0), sourceFields };
  }

  /**
   * 提取限制词
   */
  private extractRestrictedWords(report: ProductOverviewReport): ExtractionResult<string[]> {
    const restrictedWords = new Set<string>();
    const sourceFields: string[] = [];

    if (Array.isArray(report.complianceRisks) && report.complianceRisks.length > 0) {
      report.complianceRisks
        .map(risk => risk.risk?.trim() || risk.type?.trim())
        .filter((word): word is string => !!word)
        .forEach(word => restrictedWords.add(word));

      if (restrictedWords.size > 0) {
        sourceFields.push('complianceRisks');
      }
    }

    return {
      data: Array.from(restrictedWords),
      confidence: restrictedWords.size > 0 ? 0.8 : 0,
      sourceFields,
    };
  }

  /**
   * 提取高频短语
   * Product Overview 格式没有直接的 high_frequency_phrases 字段
   * 从其他字段推断
   */
  private extractHighFrequencyPhrases(report: ProductOverviewReport): ExtractionResult<string[]> {
    const phrases: string[] = [];

    // 从 decision_drivers 提取（这些通常是高频关注点）
    if (report.user_profile?.decision_drivers) {
      phrases.push(...report.user_profile.decision_drivers);
    }

    const confidence = phrases.length > 0 ? 0.6 : 0;

    return {
      data: phrases,
      confidence,
      sourceFields: phrases.length > 0 ? ['user_profile.decision_drivers'] : [],
    };
  }

  /**
   * 提取目标受众
   */
  private extractAudience(report: ProductOverviewReport): ExtractionResult<string> {
    const parts: string[] = [];
    let confidence = 0;
    const sourceFields: string[] = [];

    const demographics = report.user_profile?.demographics;
    if (demographics) {
      if (demographics.age_ranges && demographics.age_ranges.length > 0) {
        parts.push(...demographics.age_ranges);
        confidence += 0.3;
        sourceFields.push('user_profile.demographics.age_ranges');
      }
      if (demographics.household && demographics.household.length > 0) {
        parts.push(...demographics.household);
        confidence += 0.2;
        sourceFields.push('user_profile.demographics.household');
      }
    }

    // 从 scenarios 补充
    if (report.user_profile?.scenarios && report.user_profile.scenarios.length > 0) {
      parts.push(...report.user_profile.scenarios.slice(0, 2));
      confidence += 0.5;
      sourceFields.push('user_profile.scenarios');
    }

    return {
      data: parts.join(', ') || '',
      confidence: Math.min(confidence, 1.0),
      sourceFields,
    };
  }

  /**
   * 提取核心卖点
   */
  private extractUSPs(report: ProductOverviewReport): ExtractionResult<string> {
    const usps: string[] = [];
    let confidence = 0;
    const sourceFields: string[] = [];

    // 从 coreFeatures 提取
    if (report.coreFeatures) {
      const features = Object.entries(report.coreFeatures)
        .filter(([_, value]) => value && typeof value === 'string')
        .map(([key, value]) => `- ${key}: ${value}`)
        .slice(0, 5);

      if (features.length > 0) {
        usps.push(...features);
        confidence += 0.5;
        sourceFields.push('coreFeatures');
      }
    }

    // 从 strengths 补充
    if (report.strengths && report.strengths.length > 0) {
      usps.push(...report.strengths.slice(0, 3).map(s => `- ${s}`));
      confidence += 0.5;
      sourceFields.push('strengths');
    }

    return {
      data: usps.join('\n') || '',
      confidence: Math.min(confidence, 1.0),
      sourceFields,
    };
  }

  /**
   * 提取技术规格
   */
  private extractSpecs(report: ProductOverviewReport): ExtractionResult<string> {
    const specs: string[] = [];
    const sourceFields: string[] = [];

    // 从 coreFeatures 中提取技术规格
    if (report.coreFeatures) {
      Object.entries(report.coreFeatures).forEach(([key, value]) => {
        if (value && typeof value === 'string' && isTechnicalSpec(value)) {
          specs.push(`- ${key}: ${value}`);
        }
      });
    }

    const confidence = specs.length > 0 ? Math.min(specs.length / 5, 1.0) : 0;
    if (specs.length > 0) {
      sourceFields.push('coreFeatures');
    }

    return {
      data: specs.join('\n') || '',
      confidence,
      sourceFields,
    };
  }

  /**
   * 提取痛点
   */
  private extractPainPoints(report: ProductOverviewReport): ExtractionResult<string[]> {
    const painPoints: string[] = [];
    let confidence = 0;
    const sourceFields: string[] = [];

    // 从 pain_points 提取
    if (report.user_profile?.pain_points && report.user_profile.pain_points.length > 0) {
      painPoints.push(...report.user_profile.pain_points);
      confidence += 0.5;
      sourceFields.push('user_profile.pain_points');
    }

    // 从 weaknesses 补充
    if (report.weaknesses && report.weaknesses.length > 0) {
      painPoints.push(...report.weaknesses);
      confidence += 0.5;
      sourceFields.push('weaknesses');
    }

    return {
      data: painPoints,
      confidence: Math.min(confidence, 1.0),
      sourceFields,
    };
  }

  /**
   * 提取差异化角度
   */
  private extractDifferentiation(report: ProductOverviewReport): ExtractionResult<string[]> {
    const angles = report.differentiationAngles || [];
    const confidence = angles.length > 0 ? 0.9 : 0;

    return {
      data: angles,
      confidence,
      sourceFields: angles.length > 0 ? ['differentiationAngles'] : [],
    };
  }

  /**
   * 规范化报告字段名（支持 snake_case 和 camelCase）
   */
  private normalizeReport(report: unknown): ProductOverviewReport {
    // 类型守卫
    if (!report || typeof report !== 'object') {
      throw new ValidationError(
        '[ProductOverviewAdapter] Invalid report object',
        'PRODUCT_OVERVIEW_ADAPTER_001',
        'report',
        report,
        { module: 'ProductOverviewAdapter', action: 'normalizeReport' }
      );
    }

    const reportObj = report as ProductOverviewReportInput;

    return {
      meta: pickOverviewField(reportObj, ['meta'], {} as ProductOverviewReport['meta']),
      productOverview: pickOverviewField(
        reportObj,
        ['productOverview', 'product_overview'],
        {} as ProductOverviewReport['productOverview']
      ),
      coreFeatures: pickOverviewField(reportObj, ['coreFeatures', 'core_features'], {}),
      user_profile: normalizeProductOverviewUserProfile(reportObj),
      strengths: pickOverviewField(reportObj, ['strengths'], []),
      weaknesses: pickOverviewField(reportObj, ['weaknesses'], []),
      differentiationAngles: pickOverviewField(
        reportObj,
        ['differentiationAngles', 'differentiation_angles'],
        []
      ),
      keywordClusters: pickOverviewField(
        reportObj,
        ['keywordClusters', 'keyword_clusters'],
        createEmptyKeywordClusters()
      ),
      complianceRisks: pickOverviewField(reportObj, ['complianceRisks', 'compliance_risks'], []),
    };
  }
}

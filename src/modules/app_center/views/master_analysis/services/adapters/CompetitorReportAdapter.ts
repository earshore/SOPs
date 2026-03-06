/**
 * Competitor Report 适配器
 * 从竞品分析报告中提取产品 DNA
 */

import type { ReportAdapter, ExtractionResult } from './ReportAdapter';
import type { CompetitorReport } from '../../types/downloadsReportTypes';
import type { ExtendedDNA } from '../../types/extendedDNA';
import { Logger } from '../../../../../../services/loggerService';
import { isTechnicalSpec } from '../../utils/specUtils';

/**
 * Competitor Report 适配器实现
 */
export class CompetitorReportAdapter implements ReportAdapter {
  getName(): string {
    return 'CompetitorReportAdapter';
  }

  canHandle(report: unknown): boolean {
    // 类型守卫：确保 report 是对象
    if (!report || typeof report !== 'object') {
      return false;
    }

    const reportObj = report as Record<string, unknown>;

    // 放宽条件：支持字段命名变体（snake_case 和 camelCase）
    const hasCompetitorInsights = !!(reportObj.competitor_insights || reportObj.competitorInsights);
    const hasFeaturePoints = !!(reportObj.feature_points || reportObj.featurePoints);
    const hasKeywordClusters = !!(reportObj.keyword_clusters || reportObj.keywordClusters);

    // 只要有 competitor_insights 和其他任意一个字段即可
    const result = hasCompetitorInsights && (hasFeaturePoints || hasKeywordClusters);

    // 移除频繁调用的 debug 日志，减少生产环境性能开销

    return result;
  }

  extractDNA(report: unknown, language: string = 'zh'): ExtendedDNA | null {
    if (!this.canHandle(report)) {
      Logger.warn('[CompetitorAdapter] 报告格式不匹配');
      return null;
    }

    // 规范化字段名（支持 snake_case 和 camelCase）
    const competitorReport = this.normalizeReport(report);

    try {
      // 移除 "开始提取" debug 日志，减少生产环境噪音

      // 提取各个部分
      const keywords = this.extractKeywords(competitorReport);
      const highFrequencyPhrases = this.extractHighFrequencyPhrases(competitorReport);
      const audience = this.extractAudience(competitorReport);
      const usps = this.extractUSPs(competitorReport);
      const specs = this.extractSpecs(competitorReport);
      const painPoints = this.extractPainPoints(competitorReport);
      const differentiation = this.extractDifferentiation(competitorReport);

      // 构建 DNA 对象
      const dna: ExtendedDNA = {
        // 原有字段
        audience: audience.data,
        usps: usps.data,
        specs: specs.data,

        // 新增字段
        keywords: keywords.data,
        highFrequencyPhrases: highFrequencyPhrases.data,
        painPoints: painPoints.data,
        differentiationAngles: differentiation.data,

        // 置信度
        confidence: {
          audience: audience.confidence,
          usps: usps.confidence,
          specs: specs.confidence,
          keywords: keywords.confidence,
          highFrequencyPhrases: highFrequencyPhrases.confidence,
          painPoints: painPoints.confidence,
          differentiationAngles: differentiation.confidence
        },

        // 元数据
        metadata: {
          extractedAt: new Date().toISOString(),
          reportType: 'competitor',
          sourceFields: [...new Set([
            ...keywords.sourceFields,
            ...highFrequencyPhrases.sourceFields,
            ...audience.sourceFields,
            ...usps.sourceFields,
            ...specs.sourceFields,
            ...painPoints.sourceFields,
            ...differentiation.sourceFields
          ])],
          stats: {
            totalKeywords: keywords.data.core.length + keywords.data.longTail.length + keywords.data.intent.length,
            totalPhrases: highFrequencyPhrases.data.length,
            totalPainPoints: painPoints.data.length,
            totalDifferentiationAngles: differentiation.data.length
          }
        }
      };

      Logger.debug('[CompetitorAdapter] DNA 提取完成', {
        keywordsCount: dna.metadata.stats?.totalKeywords,
        phrasesCount: dna.metadata.stats?.totalPhrases,
        painPointsCount: dna.metadata.stats?.totalPainPoints
      });

      return dna;
    } catch (error) {
      Logger.error('[CompetitorAdapter] 提取失败:', error);
      return null;
    }
  }

  /**
   * 规范化报告字段名（支持 snake_case 和 camelCase）
   */
  private normalizeReport(report: unknown): CompetitorReport {
    // 类型守卫
    if (!report || typeof report !== 'object') {
      throw new Error('[CompetitorAdapter] Invalid report object');
    }

    const reportObj = report as Record<string, unknown>;

    return {
      product_summary: (reportObj.product_summary || reportObj.productSummary || '') as string,
      feature_points: (reportObj.feature_points || reportObj.featurePoints || []) as string[],
      intents: (reportObj.intents || []) as string[],
      competitor_insights: (reportObj.competitor_insights || reportObj.competitorInsights || {
        strengths: [],
        weaknesses: [],
        user_profile: [],
        differentiation_angles: []
      }) as any,
      keyword_clusters: (reportObj.keyword_clusters || reportObj.keywordClusters || {
        core: [],
        attribute: [],
        long_tail: []
      }) as any,
      high_frequency_phrases: (reportObj.high_frequency_phrases || reportObj.highFrequencyPhrases || []) as string[],
      negative_drivers: (reportObj.negative_drivers || reportObj.negativeDrivers || []) as string[],
      compliance_risks: (reportObj.compliance_risks || reportObj.complianceRisks || []) as any[],
      qa_opportunities: (reportObj.qa_opportunities || reportObj.qaOpportunities || []) as any[],
      meta: (reportObj.meta || {}) as any
    };
  }

  /**
   * 提取分类关键词
   */
  private extractKeywords(report: CompetitorReport): ExtractionResult<{
    core: string[];
    longTail: string[];
    intent: string[];
  }> {
    const keywords = report.keyword_clusters;
    let confidence = 0;
    const sourceFields: string[] = [];

    const data = {
      core: keywords.core || [],
      longTail: keywords.long_tail || [],
      intent: [] as string[] // Competitor Report 没有 intent 字段
    };

    // 计算置信度
    if (data.core.length > 0) {
      confidence += 0.4;
      sourceFields.push('keyword_clusters.core');
    }
    if (data.longTail.length > 0) {
      confidence += 0.4;
      sourceFields.push('keyword_clusters.long_tail');
    }

    // 从 intents 字段提取意图关键词（如果有）
    if (report.intents && report.intents.length > 0) {
      data.intent = report.intents;
      confidence += 0.2;
      sourceFields.push('intents');
    }

    return { data, confidence: Math.min(confidence, 1.0), sourceFields };
  }

  /**
   * 提取高频短语
   */
  private extractHighFrequencyPhrases(report: CompetitorReport): ExtractionResult<string[]> {
    const phrases = report.high_frequency_phrases || [];
    const confidence = phrases.length > 0 ? Math.min(phrases.length / 10, 1.0) : 0;

    return {
      data: phrases,
      confidence,
      sourceFields: phrases.length > 0 ? ['high_frequency_phrases'] : []
    };
  }

  /**
   * 提取目标受众
   */
  private extractAudience(report: CompetitorReport): ExtractionResult<string> {
    const userProfile = report.competitor_insights?.user_profile || [];
    const confidence = userProfile.length > 0 ? 0.8 : 0;

    return {
      data: userProfile.join(', ') || '未能提取目标受众',
      confidence,
      sourceFields: userProfile.length > 0 ? ['competitor_insights.user_profile'] : []
    };
  }

  /**
   * 提取核心卖点
   */
  private extractUSPs(report: CompetitorReport): ExtractionResult<string> {
    const usps: string[] = [];
    let confidence = 0;
    const sourceFields: string[] = [];

    // 从 feature_points 提取
    if (report.feature_points && report.feature_points.length > 0) {
      usps.push(...report.feature_points.slice(0, 5).map(f => `- ${f}`));
      confidence += 0.5;
      sourceFields.push('feature_points');
    }

    // 从 strengths 补充
    if (report.competitor_insights?.strengths && report.competitor_insights.strengths.length > 0) {
      usps.push(...report.competitor_insights.strengths.slice(0, 3).map(s => `- ${s}`));
      confidence += 0.5;
      sourceFields.push('competitor_insights.strengths');
    }

    return {
      data: usps.join('\n') || '未能提取核心卖点',
      confidence: Math.min(confidence, 1.0),
      sourceFields
    };
  }

  /**
   * 提取技术规格
   */
  private extractSpecs(report: CompetitorReport): ExtractionResult<string> {
    const specs: string[] = [];
    const attributes = report.keyword_clusters?.attribute || [];

    // 使用技术规格模式匹配
    const techSpecs = attributes.filter(attr => isTechnicalSpec(attr));

    if (techSpecs.length > 0) {
      specs.push(...techSpecs.map(s => `- ${s}`));
    }

    const confidence = techSpecs.length > 0 ? Math.min(techSpecs.length / 5, 1.0) : 0;

    return {
      data: specs.join('\n') || '未能提取技术规格',
      confidence,
      sourceFields: techSpecs.length > 0 ? ['keyword_clusters.attribute'] : []
    };
  }

  /**
   * 提取痛点
   */
  private extractPainPoints(report: CompetitorReport): ExtractionResult<string[]> {
    const painPoints: string[] = [];
    let confidence = 0;
    const sourceFields: string[] = [];

    // 从 weaknesses 提取
    if (report.competitor_insights?.weaknesses && report.competitor_insights.weaknesses.length > 0) {
      painPoints.push(...report.competitor_insights.weaknesses);
      confidence += 0.5;
      sourceFields.push('competitor_insights.weaknesses');
    }

    // 从 negative_drivers 补充
    if (report.negative_drivers && report.negative_drivers.length > 0) {
      painPoints.push(...report.negative_drivers);
      confidence += 0.5;
      sourceFields.push('negative_drivers');
    }

    return {
      data: painPoints,
      confidence: Math.min(confidence, 1.0),
      sourceFields
    };
  }

  /**
   * 提取差异化角度
   */
  private extractDifferentiation(report: CompetitorReport): ExtractionResult<string[]> {
    const angles = report.competitor_insights?.differentiation_angles || [];
    const confidence = angles.length > 0 ? 0.9 : 0;

    return {
      data: angles,
      confidence,
      sourceFields: angles.length > 0 ? ['competitor_insights.differentiation_angles'] : []
    };
  }
}

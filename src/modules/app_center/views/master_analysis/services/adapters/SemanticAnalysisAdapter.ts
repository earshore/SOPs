/**
 * Semantic Analysis Report 适配器
 * 从语义分析报告中提取产品 DNA
 */

import type { ReportAdapter, ExtractionResult } from './ReportAdapter';
import type { SemanticAnalysisReport } from '../../types/downloadsReportTypes';
import type { ExtendedDNA } from '../../types/extendedDNA';
import { Logger } from '../../../../../../services/loggerService';
import { isTechnicalSpec } from '../../utils/specUtils';

/**
 * Semantic Analysis Report 适配器实现
 */
export class SemanticAnalysisAdapter implements ReportAdapter {
  getName(): string {
    return 'SemanticAnalysisAdapter';
  }

  canHandle(report: unknown): boolean {
    // 类型守卫：确保 report 是对象
    if (!report || typeof report !== 'object') {
      return false;
    }

    const reportObj = report as Record<string, unknown>;

    // 放宽条件：支持字段命名变体
    const hasPainPointGaps = !!(reportObj.pain_point_gaps || reportObj.painPointGaps);
    const hasNativeVoice = !!(reportObj.native_voice || reportObj.nativeVoice);
    const hasHighFrequencyPhrases = !!(reportObj.high_frequency_phrases || reportObj.highFrequencyPhrases);
    const isSemanticTemplate = !!(
      (reportObj.meta as any)?.templateId === 'semantic' ||
      (reportObj.meta as any)?.templateUsed?.includes('语义') ||
      (reportObj.meta as any)?.template_id === 'semantic' ||
      (reportObj.meta as any)?.template_used?.includes('语义')
    );

    // 只要有核心字段的任意两个，或者有明确的语义模板标识即可
    const coreFieldsCount = [hasPainPointGaps, hasNativeVoice, hasHighFrequencyPhrases].filter(Boolean).length;
    const result = coreFieldsCount >= 2 || (coreFieldsCount >= 1 && isSemanticTemplate);

    // 移除频繁调用的 debug 日志，减少生产环境性能开销

    return result;
  }

  extractDNA(report: unknown, language: string = 'zh'): ExtendedDNA | null {
    if (!this.canHandle(report)) {
      Logger.warn('[SemanticAnalysisAdapter] 报告格式不匹配');
      return null;
    }

    // 规范化字段名（支持 snake_case 和 camelCase）
    const semanticReport = this.normalizeReport(report);

    try {
      // 移除 "开始提取" debug 日志，减少生产环境噪音

      // 提取各个部分
      const keywords = this.extractKeywords(semanticReport);
      const highFrequencyPhrases = this.extractHighFrequencyPhrases(semanticReport);
      const audience = this.extractAudience(semanticReport);
      const usps = this.extractUSPs(semanticReport);
      const specs = this.extractSpecs(semanticReport);
      const painPoints = this.extractPainPoints(semanticReport);
      const differentiation = this.extractDifferentiation(semanticReport);

      // 构建 DNA 对象
      const dna: ExtendedDNA = {
        audience: audience.data,
        usps: usps.data,
        specs: specs.data,
        keywords: keywords.data,
        highFrequencyPhrases: highFrequencyPhrases.data,
        painPoints: painPoints.data,
        differentiationAngles: differentiation.data,
        confidence: {
          audience: audience.confidence,
          usps: usps.confidence,
          specs: specs.confidence,
          keywords: keywords.confidence,
          highFrequencyPhrases: highFrequencyPhrases.confidence,
          painPoints: painPoints.confidence,
          differentiationAngles: differentiation.confidence
        },
        metadata: {
          extractedAt: new Date().toISOString(),
          reportType: 'semantic_analysis',
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

      Logger.debug('[SemanticAnalysisAdapter] DNA 提取完成');
      return dna;
    } catch (error) {
      Logger.error('[SemanticAnalysisAdapter] 提取失败:', error);
      return null;
    }
  }

  /**
   * 提取分类关键词
   * Semantic Analysis 没有 keyword_clusters，从其他字段推断
   */
  private extractKeywords(report: SemanticAnalysisReport): ExtractionResult<{
    core: string[];
    longTail: string[];
    intent: string[];
  }> {
    let confidence = 0;
    const sourceFields: string[] = [];

    const data = {
      core: [] as string[],
      longTail: [] as string[],
      intent: [] as string[]
    };

    // 从 high_frequency_phrases.attribute 提取核心关键词
    if (report.high_frequency_phrases?.attribute && report.high_frequency_phrases.attribute.length > 0) {
      data.core = report.high_frequency_phrases.attribute;
      confidence += 0.5;
      sourceFields.push('high_frequency_phrases.attribute');
    }

    // 从 native_voice.native_phrasing 提取长尾关键词
    if (report.native_voice?.native_phrasing && report.native_voice.native_phrasing.length > 0) {
      data.longTail = report.native_voice.native_phrasing;
      confidence += 0.3;
      sourceFields.push('native_voice.native_phrasing');
    }

    // 从 high_frequency_phrases.use_cases 提取意图关键词
    if (report.high_frequency_phrases?.use_cases && report.high_frequency_phrases.use_cases.length > 0) {
      data.intent = report.high_frequency_phrases.use_cases;
      confidence += 0.2;
      sourceFields.push('high_frequency_phrases.use_cases');
    }

    return { data, confidence: Math.min(confidence, 1.0), sourceFields };
  }

  /**
   * 提取高频短语
   */
  private extractHighFrequencyPhrases(report: SemanticAnalysisReport): ExtractionResult<string[]> {
    const phrases: string[] = [];
    let confidence = 0;
    const sourceFields: string[] = [];

    // 合并 attribute 和 use_cases
    if (report.high_frequency_phrases?.attribute) {
      phrases.push(...report.high_frequency_phrases.attribute);
      confidence += 0.5;
      sourceFields.push('high_frequency_phrases.attribute');
    }

    if (report.high_frequency_phrases?.use_cases) {
      phrases.push(...report.high_frequency_phrases.use_cases);
      confidence += 0.5;
      sourceFields.push('high_frequency_phrases.use_cases');
    }

    return {
      data: phrases,
      confidence: Math.min(confidence, 1.0),
      sourceFields
    };
  }

  /**
   * 提取目标受众
   * Semantic Analysis 没有直接的 user_profile，从 use_cases 推断
   */
  private extractAudience(report: SemanticAnalysisReport): ExtractionResult<string> {
    const useCases = report.high_frequency_phrases?.use_cases || [];
    const confidence = useCases.length > 0 ? 0.5 : 0;

    return {
      data: useCases.join(', ') || '未能提取目标受众',
      confidence,
      sourceFields: useCases.length > 0 ? ['high_frequency_phrases.use_cases'] : []
    };
  }

  /**
   * 提取核心卖点
   */
  private extractUSPs(report: SemanticAnalysisReport): ExtractionResult<string> {
    const usps: string[] = [];
    let confidence = 0;
    const sourceFields: string[] = [];

    // 从 differentiation_angles 提取（这些是 Killer Features）
    if (report.pain_point_gaps?.differentiation_angles && report.pain_point_gaps.differentiation_angles.length > 0) {
      usps.push(...report.pain_point_gaps.differentiation_angles.map(a => `- ${a}`));
      confidence += 0.7;
      sourceFields.push('pain_point_gaps.differentiation_angles');
    }

    // 从 emotional_hook 补充
    if (report.native_voice?.emotional_hook && report.native_voice.emotional_hook.length > 0) {
      usps.push(...report.native_voice.emotional_hook.map(h => `- ${h}`));
      confidence += 0.3;
      sourceFields.push('native_voice.emotional_hook');
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
  private extractSpecs(report: SemanticAnalysisReport): ExtractionResult<string> {
    const specs: string[] = [];
    const attributes = report.high_frequency_phrases?.attribute || [];

    // 使用技术规格模式匹配
    const techSpecs = attributes.filter(attr => isTechnicalSpec(attr));

    if (techSpecs.length > 0) {
      specs.push(...techSpecs.map(s => `- ${s}`));
    }

    const confidence = techSpecs.length > 0 ? Math.min(techSpecs.length / 5, 1.0) : 0;

    return {
      data: specs.join('\n') || '未能提取技术规格',
      confidence,
      sourceFields: techSpecs.length > 0 ? ['high_frequency_phrases.attribute'] : []
    };
  }

  /**
   * 提取痛点
   */
  private extractPainPoints(report: SemanticAnalysisReport): ExtractionResult<string[]> {
    const painPoints: string[] = [];
    let confidence = 0;
    const sourceFields: string[] = [];

    // 从 top_quality_issues 提取
    if (report.pain_point_gaps?.top_quality_issues && report.pain_point_gaps.top_quality_issues.length > 0) {
      painPoints.push(...report.pain_point_gaps.top_quality_issues);
      confidence += 0.5;
      sourceFields.push('pain_point_gaps.top_quality_issues');
    }

    // 从 unmet_need 补充
    if (report.pain_point_gaps?.unmet_need && report.pain_point_gaps.unmet_need.length > 0) {
      painPoints.push(...report.pain_point_gaps.unmet_need);
      confidence += 0.5;
      sourceFields.push('pain_point_gaps.unmet_need');
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
  private extractDifferentiation(report: SemanticAnalysisReport): ExtractionResult<string[]> {
    const angles = report.pain_point_gaps?.differentiation_angles || [];
    const confidence = angles.length > 0 ? 0.9 : 0;

    return {
      data: angles,
      confidence,
      sourceFields: angles.length > 0 ? ['pain_point_gaps.differentiation_angles'] : []
    };
  }

  /**
   * 规范化报告字段名（支持 snake_case 和 camelCase）
   */
  private normalizeReport(report: unknown): SemanticAnalysisReport {
    // 类型守卫
    if (!report || typeof report !== 'object') {
      throw new Error('[SemanticAnalysisAdapter] Invalid report object');
    }

    const reportObj = report as Record<string, unknown>;
    const highFrequencyPhrases = reportObj.high_frequency_phrases || reportObj.highFrequencyPhrases || {};
    const painPointGaps = reportObj.pain_point_gaps || reportObj.painPointGaps || {};
    const nativeVoice = reportObj.native_voice || reportObj.nativeVoice || {};

    return {
      high_frequency_phrases: {
        attribute: ((highFrequencyPhrases as any).attribute || []) as string[],
        use_cases: ((highFrequencyPhrases as any).use_cases || (highFrequencyPhrases as any).useCases || []) as string[]
      },
      pain_point_gaps: {
        top_quality_issues: ((painPointGaps as any).top_quality_issues || (painPointGaps as any).topQualityIssues || []) as string[],
        unmet_need: ((painPointGaps as any).unmet_need || (painPointGaps as any).unmetNeed || []) as string[],
        differentiation_angles: ((painPointGaps as any).differentiation_angles || (painPointGaps as any).differentiationAngles || []) as string[]
      },
      native_voice: {
        native_phrasing: ((nativeVoice as any).native_phrasing || (nativeVoice as any).nativePhrasing || []) as string[],
        emotional_hook: ((nativeVoice as any).emotional_hook || (nativeVoice as any).emotionalHook || []) as string[]
      },
      meta: (reportObj.meta || {}) as any
    };
  }
}

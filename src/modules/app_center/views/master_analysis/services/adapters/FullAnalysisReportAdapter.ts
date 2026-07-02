/**
 * Full Analysis Report 适配器
 * 处理应用中 AI 分析生成的报告格式（buyer-profile, selling-points, title-keywords）
 */

import type { ReportAdapter, ExtractionResult } from './ReportAdapter';
import type {
  BuyerProfileReport,
  FullAnalysisReport,
  SellingPointsReport,
  TitleKeywordsReport,
} from '../../ai_analysis/config/analysisReportData';
import type { ExtendedDNA } from '../../types/extendedDNA';
import { getSpecLabel } from '../../config/specLabels';
import {
  AUDIENCE_CONFIDENCE_WEIGHTS,
  USPS_CONFIDENCE_WEIGHTS,
  SPECS_CONFIDENCE_WEIGHTS,
  KEYWORDS_CONFIDENCE_WEIGHTS,
  PAIN_POINTS_CONFIDENCE_WEIGHTS,
  DIFFERENTIATION_CONFIDENCE_WEIGHTS,
  CONFIDENCE_THRESHOLDS,
} from '../../config/confidenceWeights';
import { ValidationError } from '../../../../../../common/errors/AppError';

const nativeLoggerConsole = globalThis.console;

type FullAnalysisReportInput = Partial<FullAnalysisReport> & {
  buyer_profile?: FullAnalysisReport['buyer-profile'];
  selling_points?: FullAnalysisReport['selling-points'];
  title_keywords?: FullAnalysisReport['title-keywords'];
  title_seo_roots?: FullAnalysisReport['title-keywords'];
  fatal_flaws?: FullAnalysisReport['fatal-flaws'];
  wow_moments?: FullAnalysisReport['wow-moments'];
  hesitation_points?: FullAnalysisReport['hesitation-points'];
  vocab_gap?: FullAnalysisReport['vocab-gap'];
  promise_reality?: FullAnalysisReport['promise-reality'];
};

type FullAnalysisReportInputKey = keyof FullAnalysisReportInput;

interface AudienceExtractionState {
  parts: string[];
  confidence: number;
  sourceFields: string[];
}

interface SpecsExtractionState {
  specs: string[];
  keywordsCount: number;
  techSpecsCount: number;
  sourceFields: string[];
}

interface USPExtractionState {
  usps: string[];
  confidence: number;
  sourceFields: string[];
}

interface FullAnalysisDNAExtraction {
  audience: ExtractionResult<string>;
  usps: ExtractionResult<string>;
  specs: ExtractionResult<string>;
  keywords: ExtractionResult<ExtendedDNA['keywords']>;
  restrictedWords: ExtractionResult<string[]>;
  highFrequencyPhrases: ExtractionResult<string[]>;
  painPoints: ExtractionResult<string[]>;
  differentiation: ExtractionResult<string[]>;
}

type SecondaryKeyword = TitleKeywordsReport['secondary_keywords'][number];

const GENDER_LABELS: Record<string, string> = {
  male: '男性',
  female: '女性',
};

const TECHNICAL_SPEC_TYPES = new Set([
  'size',
  'volume',
  'weight',
  'dimensions',
  'quantity',
  'material',
  'concentration',
  'capacity',
]);

const SPEC_PATTERNS = [
  /(\d+(?:\.\d+)?)\s*([a-zA-Z]+|小时|克|毫升|厘米|米|千克|分钟)/g,
  /(\d+\s*[x×]\s*\d+(?:\s*[x×]\s*\d+)?)\s*([a-zA-Z]+|厘米|米)/g,
];

const KEYWORD_FIELD_CONFIDENCE = {
  CORE: 0.9,
  LONG_TAIL: 0.8,
  INTENT: 0.7,
} as const;

function pickReportField<T>(
  reportObj: FullAnalysisReportInput,
  keys: FullAnalysisReportInputKey[]
): T | undefined {
  for (const key of keys) {
    const value = reportObj[key];
    if (value) return value as T;
  }
  return undefined;
}

function getDemographicText(demographics: BuyerProfileReport['demographics']): string {
  const genderText = GENDER_LABELS[demographics.likely_gender] || '';
  return `${demographics.age_range_estimate || ''}${genderText}`;
}

function createAudienceResult(state: AudienceExtractionState): ExtractionResult<string> {
  return {
    data: state.parts.join(', ') || '',
    confidence: Math.min(state.confidence, 1.0),
    sourceFields: state.sourceFields,
  };
}

function appendAudienceDemographics(
  state: AudienceExtractionState,
  buyerProfile: BuyerProfileReport
): void {
  const demographics = buyerProfile.demographics;
  if (!demographics) return;

  const demographic = getDemographicText(demographics);
  if (demographic) {
    state.parts.push(demographic);
    state.confidence += AUDIENCE_CONFIDENCE_WEIGHTS.DEMOGRAPHICS;
    state.sourceFields.push('buyer-profile.demographics');
  }

  const lifestyle = demographics.lifestyle_indicators || [];
  if (lifestyle.length > 0) {
    state.parts.push(...lifestyle.slice(0, 3));
    state.confidence += AUDIENCE_CONFIDENCE_WEIGHTS.LIFESTYLE;
  }
}

function appendAudienceBuyerTypes(
  state: AudienceExtractionState,
  buyerProfile: BuyerProfileReport
): void {
  const topTypes = (buyerProfile.buyer_types || [])
    .slice(0, 2)
    .map(buyerType => buyerType.type)
    .filter(Boolean);

  if (topTypes.length === 0) return;

  state.parts.push(...topTypes);
  state.confidence += AUDIENCE_CONFIDENCE_WEIGHTS.BUYER_TYPES;
  state.sourceFields.push('buyer-profile.buyer_types');
}

function appendAudienceMotivations(
  state: AudienceExtractionState,
  buyerProfile: BuyerProfileReport
): void {
  const motivations = buyerProfile.purchase_motivations || [];
  if (motivations.length === 0 || state.parts.length >= 5) return;

  state.parts.push(...motivations.slice(0, 2));
  state.confidence += AUDIENCE_CONFIDENCE_WEIGHTS.MOTIVATIONS;
  state.sourceFields.push('buyer-profile.purchase_motivations');
}

function collectSpecPatternMatches(text: string, pattern: RegExp): string[] {
  return Array.from(text.matchAll(pattern))
    .filter(match => !!(match[1] && match[2]))
    .map(match => `${match[1]}${match[2]}`);
}

function appendTechnicalSpecKeyword(
  grouped: Map<string, string[]>,
  keyword: SecondaryKeyword | null | undefined
): void {
  if (!keyword || typeof keyword !== 'object') return;

  const type = keyword.type?.toLowerCase() || 'other';
  if (!TECHNICAL_SPEC_TYPES.has(type)) return;

  const keywordsForType = grouped.get(type) || [];
  grouped.set(type, keywordsForType);
  if (keyword.keyword && typeof keyword.keyword === 'string') {
    keywordsForType.push(keyword.keyword);
  }
}

function groupTechnicalSpecKeywords(
  keywords: TitleKeywordsReport['secondary_keywords']
): Map<string, string[]> {
  const grouped = new Map<string, string[]>();
  keywords.forEach(keyword => appendTechnicalSpecKeyword(grouped, keyword));
  return grouped;
}

function formatSpecKeywordGroups(grouped: Map<string, string[]>, language: string): string[] {
  const specs: string[] = [];
  grouped.forEach((keywords, type) => {
    if (keywords.length > 0) {
      const label = getSpecLabel(type, language);
      specs.push(`${label}: ${keywords.join(', ')}`);
    }
  });
  return specs;
}

/**
 * Full Analysis Report 适配器实现
 * 这是应用中实际使用的报告格式
 */
export class FullAnalysisReportAdapter implements ReportAdapter {
  getName(): string {
    return 'FullAnalysisReportAdapter';
  }

  canHandle(report: unknown): boolean {
    // 类型守卫：确保 report 是对象
    if (!report || typeof report !== 'object') {
      return false;
    }

    const reportObj = report as Record<string, unknown>;

    // 检查是否有 FullAnalysisReport 的特征字段
    const hasBuyerProfile = !!(reportObj['buyer-profile'] || reportObj.buyer_profile);
    const hasSellingPoints = !!(reportObj['selling-points'] || reportObj.selling_points);

    // 至少需要有 buyer-profile 或 selling-points 之一
    const result = hasBuyerProfile || hasSellingPoints;

    // 移除频繁调用的 debug 日志，减少生产环境性能开销
    // canHandle() 在每次 DNA 提取时都会被多个适配器调用

    return result;
  }

  extractDNA(report: unknown, language: string = 'zh'): ExtendedDNA | null {
    if (!this.canHandle(report)) {
      return null;
    }

    // 规范化字段名
    const fullReport = this.normalizeReport(report);

    try {
      // 移除 "开始提取" debug 日志，减少生产环境噪音

      const extraction = this.extractDNAFields(fullReport, language);

      // 计算总体置信度
      const avgConfidence = this.calculateCoreConfidence(extraction);

      // 如果总体置信度太低，返回 null
      if (avgConfidence < CONFIDENCE_THRESHOLDS.MINIMUM_ACCEPTABLE) {
        nativeLoggerConsole.warn('[FullAnalysisReportAdapter] 提取置信度过低，放弃提取');
        return null;
      }

      const dna = this.buildDNA(extraction);

      // 移除 "DNA 提取完成" debug 日志，减少生产环境性能开销
      // 成功路径不需要日志，只在错误时记录

      return dna;
    } catch (error) {
      console.error('[FullAnalysisReportAdapter] 提取失败:', error);
      return null;
    }
  }

  private extractDNAFields(
    fullReport: FullAnalysisReport,
    language: string
  ): FullAnalysisDNAExtraction {
    return {
      audience: this.extractAudience(fullReport),
      usps: this.extractUSPs(fullReport),
      specs: this.extractSpecs(fullReport, language),
      keywords: this.extractKeywords(fullReport),
      restrictedWords: this.extractRestrictedWords(fullReport),
      highFrequencyPhrases: this.extractHighFrequencyPhrases(fullReport),
      painPoints: this.extractPainPoints(fullReport),
      differentiation: this.extractDifferentiation(fullReport),
    };
  }

  private calculateCoreConfidence(extraction: FullAnalysisDNAExtraction): number {
    return (
      (extraction.audience.confidence + extraction.usps.confidence + extraction.specs.confidence) /
      3
    );
  }

  private buildDNA(extraction: FullAnalysisDNAExtraction): ExtendedDNA {
    return {
      audience: extraction.audience.data,
      usps: extraction.usps.data,
      specs: extraction.specs.data,
      keywords: extraction.keywords.data,
      restrictedWords: extraction.restrictedWords.data,
      highFrequencyPhrases: extraction.highFrequencyPhrases.data,
      painPoints: extraction.painPoints.data,
      differentiationAngles: extraction.differentiation.data,
      confidence: this.buildDNAConfidence(extraction),
      metadata: this.buildDNAMetadata(extraction),
    };
  }

  private buildDNAConfidence(extraction: FullAnalysisDNAExtraction): ExtendedDNA['confidence'] {
    const { keywords } = extraction;
    return {
      audience: extraction.audience.confidence,
      usps: extraction.usps.confidence,
      specs: extraction.specs.confidence,
      keywords: keywords.confidence,
      keywordsCore: keywords.data.core.length > 0 ? KEYWORD_FIELD_CONFIDENCE.CORE : 0,
      keywordsLongTail: keywords.data.longTail.length > 0 ? KEYWORD_FIELD_CONFIDENCE.LONG_TAIL : 0,
      keywordsIntent: keywords.data.intent.length > 0 ? KEYWORD_FIELD_CONFIDENCE.INTENT : 0,
      restrictedWords: extraction.restrictedWords.confidence,
      highFrequencyPhrases: extraction.highFrequencyPhrases.confidence,
      painPoints: extraction.painPoints.confidence,
      differentiationAngles: extraction.differentiation.confidence,
    };
  }

  private buildDNAMetadata(extraction: FullAnalysisDNAExtraction): ExtendedDNA['metadata'] {
    const { keywords } = extraction;
    return {
      extractedAt: new Date().toISOString(),
      reportType: 'full_analysis',
      sourceFields: [
        ...new Set([
          ...extraction.audience.sourceFields,
          ...extraction.usps.sourceFields,
          ...extraction.specs.sourceFields,
          ...keywords.sourceFields,
          ...extraction.restrictedWords.sourceFields,
          ...extraction.highFrequencyPhrases.sourceFields,
          ...extraction.painPoints.sourceFields,
          ...extraction.differentiation.sourceFields,
        ]),
      ],
      fieldSources: {
        audience: extraction.audience.sourceFields,
        usps: extraction.usps.sourceFields,
        specs: extraction.specs.sourceFields,
        keywordsCore:
          keywords.data.core.length > 0
            ? keywords.sourceFields.filter(source => source.includes('primary'))
            : [],
        keywordsLongTail:
          keywords.data.longTail.length > 0
            ? keywords.sourceFields.filter(source => source.includes('secondary'))
            : [],
        keywordsIntent:
          keywords.data.intent.length > 0
            ? keywords.sourceFields.filter(source => source.includes('scene'))
            : [],
        restrictedWords: extraction.restrictedWords.sourceFields,
      },
      stats: {
        totalKeywords:
          keywords.data.core.length + keywords.data.longTail.length + keywords.data.intent.length,
        totalRestrictedWords: extraction.restrictedWords.data.length,
        totalPhrases: extraction.highFrequencyPhrases.data.length,
        totalPainPoints: extraction.painPoints.data.length,
        totalDifferentiationAngles: extraction.differentiation.data.length,
      },
    };
  }

  /**
   * 规范化报告字段名（支持连字符、下划线和旧字段名）
   */
  private normalizeReport(report: unknown): FullAnalysisReport {
    // 类型守卫
    if (!report || typeof report !== 'object') {
      throw new ValidationError(
        '[FullAnalysisReportAdapter] Invalid report object',
        'FULL_ANALYSIS_ADAPTER_001',
        'report',
        report,
        { module: 'FullAnalysisReportAdapter', action: 'normalizeReport' }
      );
    }

    const reportObj = report as FullAnalysisReportInput;

    return {
      'buyer-profile': pickReportField(reportObj, ['buyer-profile', 'buyer_profile']),
      'selling-points': pickReportField(reportObj, ['selling-points', 'selling_points']),
      // 支持新旧两套字段名：title-keywords (新) 和 title_seo_roots (旧)
      'title-keywords': pickReportField(reportObj, [
        'title-keywords',
        'title_keywords',
        'title_seo_roots',
      ]),
      'fatal-flaws': pickReportField(reportObj, ['fatal-flaws', 'fatal_flaws']),
      'wow-moments': pickReportField(reportObj, ['wow-moments', 'wow_moments']),
      'hesitation-points': pickReportField(reportObj, ['hesitation-points', 'hesitation_points']),
      'vocab-gap': pickReportField(reportObj, ['vocab-gap', 'vocab_gap']),
      'promise-reality': pickReportField(reportObj, ['promise-reality', 'promise_reality']),
      _metadata: reportObj._metadata,
    };
  }

  /**
   * 提取目标受众
   */
  private extractAudience(report: FullAnalysisReport): ExtractionResult<string> {
    const parts: string[] = [];
    let confidence = 0;
    const sourceFields: string[] = [];

    const buyerProfile = report['buyer-profile'];
    if (!buyerProfile) {
      return { data: '', confidence: 0, sourceFields: [] };
    }

    try {
      const state = { parts, confidence, sourceFields };
      appendAudienceDemographics(state, buyerProfile);
      appendAudienceBuyerTypes(state, buyerProfile);
      appendAudienceMotivations(state, buyerProfile);

      return createAudienceResult(state);
    } catch (error) {
      console.error('[FullAnalysisReportAdapter] 提取受众失败:', error);
      return { data: '', confidence: 0, sourceFields: [] };
    }
  }

  /**
   * 提取核心卖点
   */
  private extractUSPs(report: FullAnalysisReport): ExtractionResult<string> {
    const sellingPoints = report['selling-points'];
    if (!sellingPoints) {
      return { data: '', confidence: 0, sourceFields: [] };
    }

    try {
      const state: USPExtractionState = { usps: [], confidence: 0, sourceFields: [] };
      this.appendFunctionUSPs(state, sellingPoints);
      this.appendPrimaryDifferentiationUSP(state, sellingPoints);
      this.appendBulletUSPs(state, sellingPoints);
      return this.createUSPResult(state);
    } catch (error) {
      console.error('[FullAnalysisReportAdapter] 提取卖点失败:', error);
      return { data: '', confidence: 0, sourceFields: [] };
    }
  }

  private appendFunctionUSPs(state: USPExtractionState, sellingPoints: SellingPointsReport): void {
    const functions = sellingPoints.function_scene_matrix?.functions?.slice(0, 5);
    if (!functions?.length) return;

    state.usps.push(...functions.map(f => `- ${f}`));
    state.confidence += USPS_CONFIDENCE_WEIGHTS.FUNCTIONS;
    state.sourceFields.push('selling-points.function_scene_matrix.functions');
  }

  private appendPrimaryDifferentiationUSP(
    state: USPExtractionState,
    sellingPoints: SellingPointsReport
  ): void {
    const primaryDifferentiation = sellingPoints.overall_strategy?.primary_differentiation;
    if (!primaryDifferentiation) return;

    state.usps.push(`- ${primaryDifferentiation}`);
    state.confidence += USPS_CONFIDENCE_WEIGHTS.PRIMARY_DIFFERENTIATION;
    state.sourceFields.push('selling-points.overall_strategy.primary_differentiation');
  }

  private appendBulletUSPs(state: USPExtractionState, sellingPoints: SellingPointsReport): void {
    if (state.usps.length >= 3 || !sellingPoints.bullet_analysis) return;

    const bullets = sellingPoints.bullet_analysis
      .filter(b => b.credibility_score === 'high' || b.credibility_score === 'medium')
      .slice(0, 3 - state.usps.length);

    bullets.forEach(b => {
      if (b.functions && b.functions.length > 0) {
        state.usps.push(`- ${b.functions[0]}`);
      }
    });
    state.confidence += USPS_CONFIDENCE_WEIGHTS.BULLET_ANALYSIS;
    state.sourceFields.push('selling-points.bullet_analysis');
  }

  private createUSPResult(state: USPExtractionState): ExtractionResult<string> {
    return {
      data: state.usps.join('\n') || '',
      confidence: Math.min(state.confidence, 1.0),
      sourceFields: state.sourceFields,
    };
  }

  private appendKeywordSpecs(
    state: SpecsExtractionState,
    report: FullAnalysisReport,
    language: string
  ): void {
    const secondaryKeywords = report['title-keywords']?.secondary_keywords;
    if (!secondaryKeywords?.length) return;

    const keywordSpecs = this.extractSpecsByType(secondaryKeywords, language);
    state.specs.push(...keywordSpecs);
    state.keywordsCount = keywordSpecs.length;
    state.sourceFields.push('title-keywords.secondary_keywords');
  }

  private appendTechnicalSpecs(state: SpecsExtractionState, report: FullAnalysisReport): void {
    const bulletAnalysis = report['selling-points']?.bullet_analysis;
    if (!bulletAnalysis || state.specs.length >= 8) return;

    const techSpecs = this.extractTechnicalSpecs(bulletAnalysis);
    state.specs.push(...techSpecs);
    state.techSpecsCount = techSpecs.length;
    if (state.techSpecsCount > 0) {
      state.sourceFields.push('selling-points.bullet_analysis');
    }
  }

  private calculateSpecsConfidence(state: SpecsExtractionState): number {
    let confidence = 0;

    if (state.specs.length > 0) {
      confidence += SPECS_CONFIDENCE_WEIGHTS.BASE;
    }
    if (state.specs.length >= 3) {
      confidence += SPECS_CONFIDENCE_WEIGHTS.QUANTITY_THRESHOLD_3;
    }
    if (state.specs.length >= 5) {
      confidence += SPECS_CONFIDENCE_WEIGHTS.QUANTITY_THRESHOLD_5;
    }
    if (state.keywordsCount > 0) {
      confidence += SPECS_CONFIDENCE_WEIGHTS.FROM_KEYWORDS;
    }
    if (state.techSpecsCount > 0) {
      confidence += SPECS_CONFIDENCE_WEIGHTS.FROM_TECH_SPECS;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * 提取技术参数
   */
  private extractSpecs(
    report: FullAnalysisReport,
    language: string = 'zh'
  ): ExtractionResult<string> {
    const specs: string[] = [];
    const sourceFields: string[] = [];

    try {
      const state = { specs, keywordsCount: 0, techSpecsCount: 0, sourceFields };
      this.appendKeywordSpecs(state, report, language);
      this.appendTechnicalSpecs(state, report);

      const text = specs.join('\n');
      return {
        data: text || '',
        confidence: this.calculateSpecsConfidence(state),
        sourceFields,
      };
    } catch (error) {
      console.error('[FullAnalysisReportAdapter] 提取规格失败:', error);
      return { data: '', confidence: 0, sourceFields: [] };
    }
  }

  /**
   * 从 secondary_keywords 按 type 动态提取规格
   * 只提取真正的技术规格，排除营销特性和主观描述
   */
  private extractSpecsByType(
    keywords: TitleKeywordsReport['secondary_keywords'],
    language: string = 'zh'
  ): string[] {
    try {
      // 输入验证
      if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
        return [];
      }

      return formatSpecKeywordGroups(groupTechnicalSpecKeywords(keywords), language);
    } catch (error) {
      console.error('[FullAnalysisReportAdapter] extractSpecsByType 失败:', error);
      return [];
    }
  }

  /**
   * 从 bullet_analysis 智能提取技术规格
   * 从原始文本摘要中提取数字+单位的技术参数，而非功能描述
   */
  private extractTechnicalSpecs(bulletAnalysis: SellingPointsReport['bullet_analysis']): string[] {
    try {
      // 输入验证
      if (!bulletAnalysis || !Array.isArray(bulletAnalysis) || bulletAnalysis.length === 0) {
        return [];
      }

      const techSpecs: string[] = [];
      const seen = new Set<string>(); // 去重

      // 从 original_text_summary 提取技术参数（而非 functions）
      bulletAnalysis.forEach(bullet => {
        if (!bullet || typeof bullet !== 'object') {
          return;
        }

        const summary = bullet.original_text_summary;
        if (!summary || typeof summary !== 'string') {
          return;
        }

        // 提取数字+单位模式（如：50ml, 1.7oz, 6小时, 100g）
        const specs = this.extractSpecPatterns(summary);
        specs.forEach(spec => {
          if (!seen.has(spec)) {
            seen.add(spec);
            techSpecs.push(`- ${spec}`);
          }
        });
      });

      return techSpecs.slice(0, 5);
    } catch (error) {
      console.error('[FullAnalysisReportAdapter] extractTechnicalSpecs 失败:', error);
      return [];
    }
  }

  /**
   * 从文本中提取技术参数模式
   */
  private extractSpecPatterns(text: string): string[] {
    try {
      // 输入验证
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return [];
      }

      return SPEC_PATTERNS.flatMap(pattern => collectSpecPatternMatches(text, pattern));
    } catch (error) {
      console.error('[FullAnalysisReportAdapter] extractSpecPatterns 失败:', error);
      return [];
    }
  }

  /**
   * 提取分类关键词
   */
  private extractKeywords(report: FullAnalysisReport): ExtractionResult<{
    core: string[];
    longTail: string[];
    intent: string[];
  }> {
    const titleKeywords = report['title-keywords'];
    let confidence = 0;
    const sourceFields: string[] = [];

    const data = {
      core: [] as string[],
      longTail: [] as string[],
      intent: [] as string[],
    };

    if (!titleKeywords) {
      return { data, confidence: 0, sourceFields: [] };
    }

    // 从 primary_keywords 提取核心关键词
    if (titleKeywords.primary_keywords && titleKeywords.primary_keywords.length > 0) {
      data.core = titleKeywords.primary_keywords.map(k => k.keyword);
      confidence += KEYWORDS_CONFIDENCE_WEIGHTS.CORE;
      sourceFields.push('title-keywords.primary_keywords');
    }

    // 从 secondary_keywords 提取长尾关键词
    if (titleKeywords.secondary_keywords && titleKeywords.secondary_keywords.length > 0) {
      data.longTail = titleKeywords.secondary_keywords.map(k => k.keyword);
      confidence += KEYWORDS_CONFIDENCE_WEIGHTS.LONG_TAIL;
      sourceFields.push('title-keywords.secondary_keywords');
    }

    // 从 scene_keywords 提取意图关键词
    if (titleKeywords.scene_keywords && titleKeywords.scene_keywords.length > 0) {
      data.intent = titleKeywords.scene_keywords.map(k => k.keyword);
      confidence += KEYWORDS_CONFIDENCE_WEIGHTS.INTENT;
      sourceFields.push('title-keywords.scene_keywords');
    }

    return { data, confidence: Math.min(confidence, 1.0), sourceFields };
  }

  /**
   * 提取限制词
   */
  private extractRestrictedWords(report: FullAnalysisReport): ExtractionResult<string[]> {
    const titleKeywords = report['title-keywords'];
    let confidence = 0;
    const sourceFields: string[] = [];
    const restrictedWords = new Set<string>();

    if (!titleKeywords) {
      return { data: [], confidence: 0, sourceFields: [] };
    }

    if (
      Array.isArray(titleKeywords.removed_modifiers) &&
      titleKeywords.removed_modifiers.length > 0
    ) {
      titleKeywords.removed_modifiers
        .map(word => word?.trim())
        .filter((word): word is string => !!word)
        .forEach(word => restrictedWords.add(word));
      confidence += 0.5;
      sourceFields.push('title-keywords.removed_modifiers');
    }

    if (
      Array.isArray(titleKeywords.removed_brand_terms) &&
      titleKeywords.removed_brand_terms.length > 0
    ) {
      titleKeywords.removed_brand_terms
        .map(word => word?.trim())
        .filter((word): word is string => !!word)
        .forEach(word => restrictedWords.add(word));
      confidence += 0.5;
      sourceFields.push('title-keywords.removed_brand_terms');
    }

    return {
      data: Array.from(restrictedWords),
      confidence: Math.min(confidence, 1.0),
      sourceFields,
    };
  }

  /**
   * 提取高频短语
   */
  private extractHighFrequencyPhrases(_report: FullAnalysisReport): ExtractionResult<string[]> {
    // FullAnalysisReport 没有直接的高频短语字段
    // 可以从其他字段推断，但目前返回空数组
    return { data: [], confidence: 0, sourceFields: [] };
  }

  /**
   * 提取痛点
   */
  private extractPainPoints(report: FullAnalysisReport): ExtractionResult<string[]> {
    const painPoints: string[] = [];
    let confidence = 0;
    const sourceFields: string[] = [];

    // 从 selling-points.function_scene_matrix.pain_points 提取
    const sellingPoints = report['selling-points'];
    if (sellingPoints?.function_scene_matrix?.pain_points) {
      painPoints.push(...sellingPoints.function_scene_matrix.pain_points);
      confidence += PAIN_POINTS_CONFIDENCE_WEIGHTS.FROM_FUNCTION_SCENE;
      sourceFields.push('selling-points.function_scene_matrix.pain_points');
    }

    // 从 fatal-flaws 提取
    const fatalFlaws = report['fatal-flaws'];
    if (fatalFlaws?.critical_issues) {
      const issues = fatalFlaws.critical_issues.map(i => i.issue);
      painPoints.push(...issues);
      confidence += PAIN_POINTS_CONFIDENCE_WEIGHTS.FROM_FATAL_FLAWS;
      sourceFields.push('fatal-flaws.critical_issues');
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
  private extractDifferentiation(report: FullAnalysisReport): ExtractionResult<string[]> {
    const angles: string[] = [];
    let confidence = 0;
    const sourceFields: string[] = [];

    // 从 selling-points.overall_strategy 提取
    const sellingPoints = report['selling-points'];
    if (sellingPoints?.overall_strategy) {
      const strategy = sellingPoints.overall_strategy;

      if (strategy.primary_differentiation) {
        angles.push(strategy.primary_differentiation);
        confidence += DIFFERENTIATION_CONFIDENCE_WEIGHTS.PRIMARY;
        sourceFields.push('selling-points.overall_strategy.primary_differentiation');
      }

      if (strategy.target_positioning) {
        angles.push(strategy.target_positioning);
        confidence += DIFFERENTIATION_CONFIDENCE_WEIGHTS.POSITIONING;
        sourceFields.push('selling-points.overall_strategy.target_positioning');
      }

      if (strategy.emotional_hooks && strategy.emotional_hooks.length > 0) {
        angles.push(...strategy.emotional_hooks.slice(0, 2));
        confidence += DIFFERENTIATION_CONFIDENCE_WEIGHTS.EMOTIONAL_HOOKS;
        sourceFields.push('selling-points.overall_strategy.emotional_hooks');
      }
    }

    return {
      data: angles,
      confidence: Math.min(confidence, 1.0),
      sourceFields,
    };
  }
}

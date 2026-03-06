/**
 * Full Analysis Report 适配器
 * 处理应用中 AI 分析生成的报告格式（buyer-profile, selling-points, title-keywords）
 */

import type { ReportAdapter, ExtractionResult } from './ReportAdapter';
import type {
  FullAnalysisReport,
  SellingPointsReport,
  TitleKeywordsReport
} from '../../ai_analysis/config/analysisReportData';
import type { ExtendedDNA } from '../../types/extendedDNA';
import { Logger } from '../../../../../../services/loggerService';
import { getSpecLabel } from '../../config/specLabels';
import {
  AUDIENCE_CONFIDENCE_WEIGHTS,
  USPS_CONFIDENCE_WEIGHTS,
  SPECS_CONFIDENCE_WEIGHTS,
  KEYWORDS_CONFIDENCE_WEIGHTS,
  PAIN_POINTS_CONFIDENCE_WEIGHTS,
  DIFFERENTIATION_CONFIDENCE_WEIGHTS,
  CONFIDENCE_THRESHOLDS
} from '../../config/confidenceWeights';

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
    // 支持三种字段名：title-keywords (新), title_keywords (下划线), title_seo_roots (旧系统)
    const hasTitleKeywords = !!(reportObj['title-keywords'] || reportObj.title_keywords || reportObj.title_seo_roots);

    // 至少需要有 buyer-profile 或 selling-points 之一
    const result = hasBuyerProfile || hasSellingPoints;

    // 移除频繁调用的 debug 日志，减少生产环境性能开销
    // canHandle() 在每次 DNA 提取时都会被多个适配器调用

    return result;
  }

  extractDNA(report: unknown, language: string = 'zh'): ExtendedDNA | null {
    if (!this.canHandle(report)) {
      Logger.warn('[FullAnalysisReportAdapter] 报告格式不匹配');
      return null;
    }

    // 规范化字段名
    const fullReport = this.normalizeReport(report);

    try {
      // 移除 "开始提取" debug 日志，减少生产环境噪音

      // 提取各个部分
      const audience = this.extractAudience(fullReport);
      const usps = this.extractUSPs(fullReport);
      const specs = this.extractSpecs(fullReport, language);
      const keywords = this.extractKeywords(fullReport);
      const highFrequencyPhrases = this.extractHighFrequencyPhrases(fullReport);
      const painPoints = this.extractPainPoints(fullReport);
      const differentiation = this.extractDifferentiation(fullReport);

      // 计算总体置信度
      const avgConfidence = (
        audience.confidence +
        usps.confidence +
        specs.confidence
      ) / 3;

      // 如果总体置信度太低，返回 null
      if (avgConfidence < CONFIDENCE_THRESHOLDS.MINIMUM_ACCEPTABLE) {
        Logger.warn('[FullAnalysisReportAdapter] 提取置信度过低，放弃提取');
        return null;
      }

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
          reportType: 'full_analysis',
          sourceFields: [...new Set([
            ...audience.sourceFields,
            ...usps.sourceFields,
            ...specs.sourceFields,
            ...keywords.sourceFields,
            ...highFrequencyPhrases.sourceFields,
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

      // 移除 "DNA 提取完成" debug 日志，减少生产环境性能开销
      // 成功路径不需要日志，只在错误时记录

      return dna;
    } catch (error) {
      Logger.error('[FullAnalysisReportAdapter] 提取失败:', error);
      return null;
    }
  }

  /**
   * 规范化报告字段名（支持连字符、下划线和旧字段名）
   */
  private normalizeReport(report: unknown): FullAnalysisReport {
    // 类型守卫
    if (!report || typeof report !== 'object') {
      throw new Error('[FullAnalysisReportAdapter] Invalid report object');
    }

    const reportObj = report as Record<string, unknown>;

    return {
      'buyer-profile': (reportObj['buyer-profile'] || reportObj.buyer_profile) as any,
      'selling-points': (reportObj['selling-points'] || reportObj.selling_points) as any,
      // 支持新旧两套字段名：title-keywords (新) 和 title_seo_roots (旧)
      'title-keywords': (reportObj['title-keywords'] || reportObj.title_keywords || reportObj.title_seo_roots) as any,
      'fatal-flaws': (reportObj['fatal-flaws'] || reportObj.fatal_flaws) as any,
      'wow-moments': (reportObj['wow-moments'] || reportObj.wow_moments) as any,
      'hesitation-points': (reportObj['hesitation-points'] || reportObj.hesitation_points) as any,
      'vocab-gap': (reportObj['vocab-gap'] || reportObj.vocab_gap) as any,
      'promise-reality': (reportObj['promise-reality'] || reportObj.promise_reality) as any,
      _metadata: reportObj._metadata as any
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
      return { data: '未能提取目标受众', confidence: 0, sourceFields: [] };
    }

    try {
      // 1. 提取人口统计信息
      const demographics = buyerProfile.demographics;
      if (demographics) {
        const ageRange = demographics.age_range_estimate;
        const gender = demographics.likely_gender;
        const lifestyle = demographics.lifestyle_indicators || [];

        if (ageRange || gender) {
          let demographic = '';
          if (ageRange) demographic += ageRange;
          if (gender) {
            const genderText = gender === 'male' ? '男性' : gender === 'female' ? '女性' : '';
            demographic += genderText;
          }
          if (demographic) {
            parts.push(demographic);
            confidence += AUDIENCE_CONFIDENCE_WEIGHTS.DEMOGRAPHICS;
            sourceFields.push('buyer-profile.demographics');
          }
        }

        // 添加生活方式特征（前3个）
        if (lifestyle.length > 0) {
          parts.push(...lifestyle.slice(0, 3));
          confidence += AUDIENCE_CONFIDENCE_WEIGHTS.LIFESTYLE;
        }
      }

      // 2. 提取买家类型（前2个）
      const buyerTypes = buyerProfile.buyer_types || [];
      if (buyerTypes.length > 0) {
        const topTypes = buyerTypes
          .slice(0, 2)
          .map(t => t.type)
          .filter(Boolean);
        if (topTypes.length > 0) {
          parts.push(...topTypes);
          confidence += AUDIENCE_CONFIDENCE_WEIGHTS.BUYER_TYPES;
          sourceFields.push('buyer-profile.buyer_types');
        }
      }

      // 3. 提取购买动机（前2个）
      const motivations = buyerProfile.purchase_motivations || [];
      if (motivations.length > 0 && parts.length < 5) {
        parts.push(...motivations.slice(0, 2));
        confidence += AUDIENCE_CONFIDENCE_WEIGHTS.MOTIVATIONS;
        sourceFields.push('buyer-profile.purchase_motivations');
      }

      const text = parts.join(', ');
      return {
        data: text || '未能提取目标受众信息',
        confidence: Math.min(confidence, 1.0),
        sourceFields
      };
    } catch (error) {
      Logger.error('[FullAnalysisReportAdapter] 提取受众失败:', error);
      return { data: '', confidence: 0, sourceFields: [] };
    }
  }

  /**
   * 提取核心卖点
   */
  private extractUSPs(report: FullAnalysisReport): ExtractionResult<string> {
    const usps: string[] = [];
    let confidence = 0;
    const sourceFields: string[] = [];

    const sellingPoints = report['selling-points'];
    if (!sellingPoints) {
      return { data: '未能提取核心卖点', confidence: 0, sourceFields: [] };
    }

    try {
      // 1. 提取功能卖点
      const functionSceneMatrix = sellingPoints.function_scene_matrix;
      if (functionSceneMatrix && functionSceneMatrix.functions) {
        const functions = functionSceneMatrix.functions.slice(0, 5);
        usps.push(...functions.map(f => `- ${f}`));
        confidence += USPS_CONFIDENCE_WEIGHTS.FUNCTIONS;
        sourceFields.push('selling-points.function_scene_matrix.functions');
      }

      // 2. 提取核心差异化
      const overallStrategy = sellingPoints.overall_strategy;
      if (overallStrategy && overallStrategy.primary_differentiation) {
        usps.push(`- ${overallStrategy.primary_differentiation}`);
        confidence += USPS_CONFIDENCE_WEIGHTS.PRIMARY_DIFFERENTIATION;
        sourceFields.push('selling-points.overall_strategy.primary_differentiation');
      }

      // 3. 如果卖点不足，从 bullet_analysis 补充
      if (usps.length < 3 && sellingPoints.bullet_analysis) {
        const bullets = sellingPoints.bullet_analysis
          .filter(b => b.credibility_score === 'high' || b.credibility_score === 'medium')
          .slice(0, 3 - usps.length);

        bullets.forEach(b => {
          if (b.functions && b.functions.length > 0) {
            usps.push(`- ${b.functions[0]}`);
          }
        });
        confidence += USPS_CONFIDENCE_WEIGHTS.BULLET_ANALYSIS;
        sourceFields.push('selling-points.bullet_analysis');
      }

      const text = usps.join('\n');
      return {
        data: text || '未能提取核心卖点',
        confidence: Math.min(confidence, 1.0),
        sourceFields
      };
    } catch (error) {
      Logger.error('[FullAnalysisReportAdapter] 提取卖点失败:', error);
      return { data: '', confidence: 0, sourceFields: [] };
    }
  }

  /**
   * 提取技术参数
   */
  private extractSpecs(report: FullAnalysisReport, language: string = 'zh'): ExtractionResult<string> {
    const specs: string[] = [];
    let keywordsCount = 0;
    let techSpecsCount = 0;
    const sourceFields: string[] = [];

    try {
      // 1. 从 title-keywords 动态提取所有规格（按 type 分组）
      const titleKeywords = report['title-keywords'];
      if (titleKeywords && titleKeywords.secondary_keywords && titleKeywords.secondary_keywords.length > 0) {
        const keywordSpecs = this.extractSpecsByType(titleKeywords.secondary_keywords, language);
        specs.push(...keywordSpecs);
        keywordsCount = keywordSpecs.length;
        sourceFields.push('title-keywords.secondary_keywords');
      }

      // 2. 从 selling-points 智能提取技术规格（如果规格还不够多）
      const sellingPoints = report['selling-points'];
      if (sellingPoints && sellingPoints.bullet_analysis && specs.length < 8) {
        const techSpecs = this.extractTechnicalSpecs(sellingPoints.bullet_analysis);
        specs.push(...techSpecs);
        techSpecsCount = techSpecs.length;
        if (techSpecsCount > 0) {
          sourceFields.push('selling-points.bullet_analysis');
        }
      }

      // 3. 计算置信度（基于提取到的数据量和质量）
      let confidence = 0;

      // 基础分：有数据就给分
      if (specs.length > 0) {
        confidence += SPECS_CONFIDENCE_WEIGHTS.BASE;
      }

      // 数量分：提取的规格越多，置信度越高
      if (specs.length >= 3) {
        confidence += SPECS_CONFIDENCE_WEIGHTS.QUANTITY_THRESHOLD_3;
      }
      if (specs.length >= 5) {
        confidence += SPECS_CONFIDENCE_WEIGHTS.QUANTITY_THRESHOLD_5;
      }

      // 来源分：从多个来源提取更可靠
      if (keywordsCount > 0) {
        confidence += SPECS_CONFIDENCE_WEIGHTS.FROM_KEYWORDS;
      }
      if (techSpecsCount > 0) {
        confidence += SPECS_CONFIDENCE_WEIGHTS.FROM_TECH_SPECS;
      }

      const text = specs.join('\n');
      return {
        data: text || '未能提取技术参数',
        confidence: Math.min(confidence, 1.0),
        sourceFields
      };
    } catch (error) {
      Logger.error('[FullAnalysisReportAdapter] 提取规格失败:', error);
      return { data: '', confidence: 0, sourceFields: [] };
    }
  }

  /**
   * 从 secondary_keywords 按 type 动态提取规格
   * 只提取真正的技术规格，排除营销特性和主观描述
   */
  private extractSpecsByType(keywords: TitleKeywordsReport['secondary_keywords'], language: string = 'zh'): string[] {
    try {
      // 输入验证
      if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
        Logger.debug('[FullAnalysisReportAdapter] extractSpecsByType: 无效或空的 keywords 数组');
        return [];
      }

      const specs: string[] = [];

      // 定义规格类型白名单（只包含客观、可测量的技术参数）
      const SPEC_TYPES = new Set([
        'size',          // 尺寸/容量
        'volume',        // 体积
        'weight',        // 重量
        'dimensions',    // 尺寸
        'quantity',      // 数量
        'material',      // 材质
        'concentration', // 浓度类型
        'capacity'       // 容量
      ]);

      // 按 type 分组，只保留规格类型
      const grouped = new Map<string, string[]>();

      keywords.forEach(k => {
        if (!k || typeof k !== 'object') {
          Logger.debug('[FullAnalysisReportAdapter] extractSpecsByType: 跳过无效的 keyword 对象');
          return;
        }

        const type = k.type?.toLowerCase() || 'other';

        // 只提取规格类型，排除 feature（功能特性）、scent（香调描述）等
        if (SPEC_TYPES.has(type)) {
          if (!grouped.has(type)) {
            grouped.set(type, []);
          }
          if (k.keyword && typeof k.keyword === 'string') {
            grouped.get(type)!.push(k.keyword);
          }
        }
      });

      // 格式化输出，使用本地化标签
      grouped.forEach((kws, type) => {
        if (kws.length > 0) {
          const label = getSpecLabel(type, language);
          specs.push(`${label}: ${kws.join(', ')}`);
        }
      });

      return specs;
    } catch (error) {
      Logger.error('[FullAnalysisReportAdapter] extractSpecsByType 失败:', error);
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
        Logger.debug('[FullAnalysisReportAdapter] extractTechnicalSpecs: 无效或空的 bulletAnalysis');
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
      Logger.error('[FullAnalysisReportAdapter] extractTechnicalSpecs 失败:', error);
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

      const patterns: string[] = [];

      // 匹配：数字+单位（如 50ml, 1.7oz, 6小时, 100g）
      try {
        const unitPattern = /(\d+(?:\.\d+)?)\s*([a-zA-Z]+|小时|克|毫升|厘米|米|千克|分钟)/g;
        let match;

        while ((match = unitPattern.exec(text)) !== null) {
          if (match[1] && match[2]) {
            patterns.push(`${match[1]}${match[2]}`);
          }
        }
      } catch (regexError) {
        Logger.warn('[FullAnalysisReportAdapter] unitPattern 正则匹配失败:', regexError);
      }

      // 匹配：尺寸范围（如 10x5x3cm）
      try {
        const dimensionPattern = /(\d+\s*[x×]\s*\d+(?:\s*[x×]\s*\d+)?)\s*([a-zA-Z]+|厘米|米)/g;
        let match;

        while ((match = dimensionPattern.exec(text)) !== null) {
          if (match[1] && match[2]) {
            patterns.push(`${match[1]}${match[2]}`);
          }
        }
      } catch (regexError) {
        Logger.warn('[FullAnalysisReportAdapter] dimensionPattern 正则匹配失败:', regexError);
      }

      return patterns;
    } catch (error) {
      Logger.error('[FullAnalysisReportAdapter] extractSpecPatterns 失败:', error);
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
      intent: [] as string[]
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
      sourceFields
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
      sourceFields
    };
  }
}

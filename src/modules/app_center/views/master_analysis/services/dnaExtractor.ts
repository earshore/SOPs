/**
 * DNA 提取器 - 从 AI 分析报告中自动提取产品 DNA
 *
 * 功能：
 * - 从 buyer-profile 提取目标受众
 * - 从 selling-points 提取核心卖点
 * - 从 title-keywords 和 selling-points 提取技术参数
 */

import type {
  FullAnalysisReport,
  BuyerProfileReport,
  SellingPointsReport,
  TitleKeywordsReport
} from '../ai_analysis/config/analysisReportData';
import { Logger } from '../../../../../services/loggerService';

/**
 * 提取的产品 DNA 接口
 */
export interface ExtractedDNA {
  audience: string;      // 目标受众描述
  usps: string;          // 核心卖点（多行）
  specs: string;         // 技术参数（多行）
  confidence: {          // 提取置信度 (0-1)
    audience: number;
    usps: number;
    specs: number;
  };
  metadata?: {
    extractedAt: string;
    sourceFields: string[];
  };
}

/**
 * 从 buyer-profile 提取目标受众
 */
function extractAudience(report: BuyerProfileReport): { text: string; confidence: number } {
  const parts: string[] = [];
  let confidence = 0;

  try {
    // 1. 提取人口统计信息
    const demographics = report.demographics;
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
          confidence += 0.3;
        }
      }

      // 添加生活方式特征（前3个）
      if (lifestyle.length > 0) {
        parts.push(...lifestyle.slice(0, 3));
        confidence += 0.2;
      }
    }

    // 2. 提取买家类型（前2个）
    const buyerTypes = report.buyer_types || [];
    if (buyerTypes.length > 0) {
      const topTypes = buyerTypes
        .slice(0, 2)
        .map(t => t.type)
        .filter(Boolean);
      if (topTypes.length > 0) {
        parts.push(...topTypes);
        confidence += 0.3;
      }
    }

    // 3. 提取购买动机（前2个）
    const motivations = report.purchase_motivations || [];
    if (motivations.length > 0 && parts.length < 5) {
      parts.push(...motivations.slice(0, 2));
      confidence += 0.2;
    }

    const text = parts.join(', ');
    return {
      text: text || '未能提取目标受众信息',
      confidence: Math.min(confidence, 1.0)
    };
  } catch (error) {
    Logger.error('[DNA提取器] 提取受众失败:', error);
    return { text: '', confidence: 0 };
  }
}

/**
 * 从 selling-points 提取核心卖点
 */
function extractUSPs(report: SellingPointsReport): { text: string; confidence: number } {
  const usps: string[] = [];
  let confidence = 0;

  try {
    // 1. 提取功能卖点
    const functionSceneMatrix = report.function_scene_matrix;
    if (functionSceneMatrix && functionSceneMatrix.functions) {
      const functions = functionSceneMatrix.functions.slice(0, 5);
      usps.push(...functions.map(f => `- ${f}`));
      confidence += 0.4;
    }

    // 2. 提取核心差异化
    const overallStrategy = report.overall_strategy;
    if (overallStrategy && overallStrategy.primary_differentiation) {
      usps.push(`- ${overallStrategy.primary_differentiation}`);
      confidence += 0.3;
    }

    // 3. 如果卖点不足，从 bullet_analysis 补充
    if (usps.length < 3 && report.bullet_analysis) {
      const bullets = report.bullet_analysis
        .filter(b => b.credibility_score === 'high' || b.credibility_score === 'medium')
        .slice(0, 3 - usps.length);

      bullets.forEach(b => {
        if (b.functions && b.functions.length > 0) {
          usps.push(`- ${b.functions[0]}`);
        }
      });
      confidence += 0.3;
    }

    const text = usps.join('\n');
    return {
      text: text || '未能提取核心卖点',
      confidence: Math.min(confidence, 1.0)
    };
  } catch (error) {
    Logger.error('[DNA提取器] 提取卖点失败:', error);
    return { text: '', confidence: 0 };
  }
}

/**
 * 从 title-keywords 和 selling-points 提取技术参数
 */
function extractSpecs(
  titleKeywords: TitleKeywordsReport | undefined,
  sellingPoints: SellingPointsReport | undefined
): { text: string; confidence: number } {
  const specs: string[] = [];
  let confidence = 0;

  try {
    // 1. 从 title-keywords 提取规格词
    if (titleKeywords && titleKeywords.secondary_keywords) {
      const sizeKeywords = titleKeywords.secondary_keywords
        .filter(k => k.type === 'size')
        .map(k => k.keyword);

      const featureKeywords = titleKeywords.secondary_keywords
        .filter(k => k.type === 'feature')
        .map(k => k.keyword);

      const scentKeywords = titleKeywords.secondary_keywords
        .filter(k => k.type === 'scent')
        .map(k => k.keyword);

      if (sizeKeywords.length > 0) {
        specs.push(`容量: ${sizeKeywords.join(', ')}`);
        confidence += 0.3;
      }

      if (scentKeywords.length > 0) {
        specs.push(`香调: ${scentKeywords.join(', ')}`);
        confidence += 0.2;
      }

      if (featureKeywords.length > 0) {
        specs.push(`特性: ${featureKeywords.join(', ')}`);
        confidence += 0.2;
      }
    }

    // 2. 从 selling-points 的 bullet_analysis 提取技术规格
    if (sellingPoints && sellingPoints.bullet_analysis && specs.length < 5) {
      const techSpecs = sellingPoints.bullet_analysis
        .filter(b => b.functions && b.functions.length > 0)
        .slice(0, 3)
        .flatMap(b => b.functions)
        .filter(f => f.includes('小时') || f.includes('dB') || f.includes('cm') || f.includes('ml'));

      if (techSpecs.length > 0) {
        specs.push(...techSpecs.map(s => `- ${s}`));
        confidence += 0.3;
      }
    }

    const text = specs.join('\n');
    return {
      text: text || '未能提取技术参数',
      confidence: Math.min(confidence, 1.0)
    };
  } catch (error) {
    Logger.error('[DNA提取器] 提取规格失败:', error);
    return { text: '', confidence: 0 };
  }
}

/**
 * 从完整分析报告中提取产品 DNA
 *
 * @param report 完整的 AI 分析报告
 * @returns 提取的产品 DNA，如果提取失败返回 null
 */
export function extractProductDNA(report: FullAnalysisReport | null | undefined): ExtractedDNA | null {
  if (!report) {
    Logger.warn('[DNA提取器] 报告为空，无法提取');
    return null;
  }

  Logger.debug('[DNA提取器] 开始提取产品 DNA');

  try {
    // 提取各个部分
    const audienceResult = report['buyer-profile']
      ? extractAudience(report['buyer-profile'])
      : { text: '', confidence: 0 };

    const uspsResult = report['selling-points']
      ? extractUSPs(report['selling-points'])
      : { text: '', confidence: 0 };

    const specsResult = extractSpecs(
      report['title-keywords'],
      report['selling-points']
    );

    // 计算总体置信度
    const avgConfidence = (
      audienceResult.confidence +
      uspsResult.confidence +
      specsResult.confidence
    ) / 3;

    // 如果总体置信度太低，返回 null
    if (avgConfidence < 0.2) {
      Logger.warn('[DNA提取器] 提取置信度过低，放弃提取');
      return null;
    }

    const dna: ExtractedDNA = {
      audience: audienceResult.text,
      usps: uspsResult.text,
      specs: specsResult.text,
      confidence: {
        audience: audienceResult.confidence,
        usps: uspsResult.confidence,
        specs: specsResult.confidence
      },
      metadata: {
        extractedAt: new Date().toISOString(),
        sourceFields: [
          report['buyer-profile'] ? 'buyer-profile' : '',
          report['selling-points'] ? 'selling-points' : '',
          report['title-keywords'] ? 'title-keywords' : ''
        ].filter(Boolean)
      }
    };

    Logger.debug('[DNA提取器] 提取完成:', {
      audienceLength: dna.audience.length,
      uspsLength: dna.usps.length,
      specsLength: dna.specs.length,
      confidence: dna.confidence
    });

    return dna;
  } catch (error) {
    Logger.error('[DNA提取器] 提取过程出错:', error);
    return null;
  }
}

/**
 * 检查报告是否包含足够的数据用于 DNA 提取
 */
export function canExtractDNA(report: FullAnalysisReport | null | undefined): boolean {
  if (!report) return false;

  // 至少需要有 buyer-profile 或 selling-points 之一
  return !!(report['buyer-profile'] || report['selling-points']);
}

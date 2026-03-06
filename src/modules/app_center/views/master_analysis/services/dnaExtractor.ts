/**
 * DNA 提取器 - 从 AI 分析报告中自动提取产品 DNA
 *
 * 架构特点（零硬编码设计）：
 * - 零硬编码：不预设任何产品属性名称，完全数据驱动
 * - 品类无关：适用于假发、电子产品、化妆品、服装等所有品类
 * - 动态提取：直接使用 AI 报告中的原始字段值，不做翻译或转换
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
 *
 * 提取策略（零硬编码）：
 * - 直接使用 AI 报告中的原始字段值，不做翻译
 * - 从 demographics、buyer_types、purchase_motivations 中提取
 * - 适用于所有品类：假发、电子产品、化妆品、服装等
 *
 * 数据来源：
 * 1. demographics.age_range_estimate - 年龄范围（如 "25-45岁"）
 * 2. demographics.likely_gender - 性别（male/female）
 * 3. demographics.lifestyle_indicators - 生活方式特征（前3个）
 * 4. buyer_types - 买家类型（前2个）
 * 5. purchase_motivations - 购买动机（前2个）
 *
 * 置信度计算：
 * - 有年龄或性别：+0.3
 * - 有生活方式特征：+0.2
 * - 有买家类型：+0.3
 * - 有购买动机：+0.2
 *
 * @param report buyer-profile 报告
 * @returns 提取的受众描述和置信度 (0-1)
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
 *
 * 提取策略（零硬编码）：
 * - 直接使用 AI 生成的功能描述，不做翻译或转换
 * - 优先提取功能卖点，补充差异化优势
 * - 适用于所有品类的产品功能描述
 *
 * 数据来源（优先级从高到低）：
 * 1. function_scene_matrix.functions - 功能卖点（前5个）
 * 2. overall_strategy.primary_differentiation - 核心差异化
 * 3. bullet_analysis - 高/中可信度的功能（补充到3个）
 *
 * 置信度计算：
 * - 有功能卖点：+0.4
 * - 有核心差异化：+0.3
 * - 从 bullet_analysis 补充：+0.3
 *
 * @param report selling-points 报告
 * @returns 提取的卖点列表（多行）和置信度 (0-1)
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
 * 判断文本是否包含技术规格信息
 *
 * 零硬编码设计：
 * - 不使用硬编码的单位列表（如 "ml", "inch", "mAh"）
 * - 使用通用模式匹配，适用于任意品类的技术参数
 * - 支持假发（"180 density", "13x4 lace"）、电子产品（"5000mAh"）、化妆品（"50ml"）等
 *
 * 匹配模式：
 * 1. 数字+单位：50ml, 20 inch, 5000mAh, 180density
 * 2. 单位+数字：SPF 50, Shade 3, Type-C
 * 3. 百分号：99%, 150% density
 * 4. 范围：20-30cm, 100-240V, 13x4 lace
 * 5. 小数：6.5 inch, 1.7oz
 * 6. 数字-连字符-单位：24-hour, 8-day, 3-year
 *
 * @param text 待检测的文本
 * @returns true 如果文本包含技术规格特征
 */
function isTechnicalSpec(text: string): boolean {
  // 模式 1: 包含数字和单位 (如 "50ml", "20 inch", "5000mAh", "150density")
  const hasNumberWithUnit = /\d+\s*[a-zA-Z]+/.test(text);

  // 模式 2: 包含字母和数字 (如 "SPF 50", "Shade 3", "Type-C")
  const hasUnitWithNumber = /[a-zA-Z]+\s*\d+/.test(text);

  // 模式 3: 包含数字和百分号 (如 "99% 纯度", "150% density")
  const hasPercentage = /\d+\s*%/.test(text);

  // 模式 4: 包含范围 (如 "20-30cm", "100-240V", "13x4 lace")
  const hasRange = /\d+\s*[-~x]\s*\d+/i.test(text);

  // 模式 5: 包含小数 (如 "6.5 inch", "1.7oz")
  const hasDecimal = /\d+\.\d+/.test(text);

  // 模式 6: 包含数字-连字符-单位 (如 "24-hour", "8-day", "3-year")
  const hasNumberHyphenUnit = /\d+\s*-\s*[a-zA-Z]+/.test(text);

  return hasNumberWithUnit || hasUnitWithNumber || hasPercentage || hasRange || hasDecimal || hasNumberHyphenUnit;
}

/**
 * 从 secondary_keywords 按 type 动态提取规格
 *
 * 零硬编码设计（核心函数）：
 * - 直接使用 AI 返回的原始 type 标签，不做任何翻译
 * - 不预设任何产品属性名称（如 "尺寸"、"颜色"、"密度"）
 * - 完全数据驱动，适用于任意品类
 *
 * 为什么不翻译 type：
 * - AI 可能返回任意品类的 type（hair_density, screen_size, scent 等）
 * - 硬编码翻译会限制支持的品类
 * - 保持原始 type 确保信息不丢失
 *
 * 输出格式示例：
 * - 假发：hair_density: 180% density, curl_pattern: body wave
 * - 电子：screen_size: 6.5 inch, battery: 5000mAh
 * - 化妆品：scent: rose, texture: lightweight
 *
 * @param keywords secondary_keywords 数组
 * @returns 按 type 分组的规格列表（格式：type: keyword1, keyword2）
 */
function extractSpecsByType(keywords: TitleKeywordsReport['secondary_keywords']): string[] {
  const specs: string[] = [];

  // 按 type 分组
  const grouped = new Map<string, string[]>();

  keywords.forEach(k => {
    const type = k.type || 'other';
    if (!grouped.has(type)) {
      grouped.set(type, []);
    }
    grouped.get(type)!.push(k.keyword);
  });

  // 为每个 type 生成一行规格（直接使用原始 type）
  grouped.forEach((kws, type) => {
    specs.push(`${type}: ${kws.join(', ')}`);
  });

  return specs;
}

/**
 * 从 bullet_analysis 智能提取技术规格
 *
 * 零硬编码设计：
 * - 使用通用模式匹配（isTechnicalSpec）而非硬编码单位列表
 * - 自动识别包含数字、单位、范围的技术参数
 * - 适用于所有品类的技术规格
 *
 * 提取逻辑：
 * 1. 从所有 bullet_analysis 中提取 functions 字段
 * 2. 使用模式匹配筛选技术规格（而非主观描述）
 * 3. 取前5个技术规格
 *
 * 示例（跨品类）：
 * - 假发：150% density, 20 inch length, 13x4 lace frontal
 * - 电子：5000mAh battery, 6.5 inch screen, 128GB storage
 * - 化妆品：SPF 50+, 50ml volume, 24-hour wear
 *
 * @param bulletAnalysis bullet_analysis 数组
 * @returns 技术规格列表（带 "- " 前缀）
 */
function extractTechnicalSpecs(bulletAnalysis: SellingPointsReport['bullet_analysis']): string[] {
  if (!bulletAnalysis) return [];

  // 提取所有 functions
  const allFunctions = bulletAnalysis
    .filter(b => b.functions && b.functions.length > 0)
    .flatMap(b => b.functions);

  // 使用智能模式匹配筛选技术规格
  const techSpecs = allFunctions
    .filter(f => isTechnicalSpec(f))
    .slice(0, 5)
    .map(s => `- ${s}`);

  return techSpecs;
}

/**
 * 从 title-keywords 和 selling-points 提取技术参数
 *
 * 零硬编码设计（核心函数）：
 * - 完全基于实际数据动态提取，不预设任何产品属性
 * - 结合两个数据源：结构化关键词 + 智能模式匹配
 * - 适用于任意品类的产品
 *
 * 提取策略：
 * 1. 从 title-keywords.secondary_keywords 按 type 分组提取（结构化数据）
 * 2. 从 selling-points.bullet_analysis 智能提取技术规格（补充数据）
 * 3. 两种来源互补，确保提取完整性
 *
 * 置信度计算（基于数据量和来源多样性）：
 * - 有规格数据：+0.3（基础分）
 * - 规格数量 ≥3：+0.2
 * - 规格数量 ≥5：+0.2
 * - 来自 keywords：+0.15
 * - 来自 bullet_analysis：+0.15
 *
 * 为什么不需要调整置信度计算：
 * - 置信度基于数据量，与品类无关
 * - 不依赖特定字段名称或值
 *
 * @param titleKeywords title-keywords 报告（可选）
 * @param sellingPoints selling-points 报告（可选）
 * @returns 提取的技术参数（多行）和置信度 (0-1)
 */
function extractSpecs(
  titleKeywords: TitleKeywordsReport | undefined,
  sellingPoints: SellingPointsReport | undefined
): { text: string; confidence: number } {
  const specs: string[] = [];
  let keywordsCount = 0;
  let techSpecsCount = 0;

  try {
    // 1. 从 title-keywords 动态提取所有规格（按 type 分组）
    if (titleKeywords && titleKeywords.secondary_keywords && titleKeywords.secondary_keywords.length > 0) {
      const keywordSpecs = extractSpecsByType(titleKeywords.secondary_keywords);
      specs.push(...keywordSpecs);
      keywordsCount = keywordSpecs.length;
    }

    // 2. 从 selling-points 智能提取技术规格（如果规格还不够多）
    if (sellingPoints && sellingPoints.bullet_analysis && specs.length < 8) {
      const techSpecs = extractTechnicalSpecs(sellingPoints.bullet_analysis);
      specs.push(...techSpecs);
      techSpecsCount = techSpecs.length;
    }

    // 3. 计算置信度（基于提取到的数据量和质量）
    let confidence = 0;

    // 基础分：有数据就给分
    if (specs.length > 0) {
      confidence += 0.3;
    }

    // 数量分：提取的规格越多，置信度越高
    if (specs.length >= 3) {
      confidence += 0.2;
    }
    if (specs.length >= 5) {
      confidence += 0.2;
    }

    // 来源分：从多个来源提取更可靠
    if (keywordsCount > 0) {
      confidence += 0.15;
    }
    if (techSpecsCount > 0) {
      confidence += 0.15;
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

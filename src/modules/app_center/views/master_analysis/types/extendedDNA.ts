/**
 * 扩展的产品 DNA 接口
 * 支持从 Downloads 报告格式提取的完整数据
 */

/**
 * 扩展的产品 DNA 接口
 * 包含用户需求的所有字段
 */
export interface ExtendedDNA {
  // 原有字段（保持向后兼容）
  audience: string;
  usps: string;
  specs: string;

  // 新增字段：分类关键词
  keywords: {
    core: string[];
    longTail: string[];
    intent: string[];
  };

  // 新增字段：限制词
  restrictedWords: string[];

  // 新增字段：高频短语
  highFrequencyPhrases: string[];

  // 新增字段：痛点
  painPoints: string[];

  // 新增字段：差异化角度
  differentiationAngles: string[];

  // 置信度（扩展）
  confidence: {
    audience: number;
    usps: number;
    specs: number;
    keywords: number;
    restrictedWords: number;
    highFrequencyPhrases: number;
    painPoints: number;
    differentiationAngles: number;
  };

  // 元数据（扩展）
  metadata: {
    extractedAt: string;
    reportType: string;
    sourceFields: string[];
    stats?: {
      totalKeywords: number;
      totalRestrictedWords: number;
      totalPhrases: number;
      totalPainPoints: number;
      totalDifferentiationAngles: number;
    };
  };
}

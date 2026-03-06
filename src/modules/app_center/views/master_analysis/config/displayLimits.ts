/**
 * 显示限制常量
 * 统一管理 UI 中各种列表的显示数量限制
 */

/**
 * 分析服务显示限制
 */
export const ANALYSIS_DISPLAY_LIMITS = {
  /** 主要关键词显示数量 */
  PRIMARY_KEYWORDS: 2,
  /** 次要关键词显示数量 */
  SECONDARY_KEYWORDS: 2,
  /** 缺失元素显示数量 */
  MISSING_ELEMENTS: 2,
  /** 犹豫点显示数量 */
  HESITATION_POINTS: 4,
  /** 买家类型显示数量 */
  BUYER_TYPES: 2,
  /** 词汇翻译显示数量 */
  TERM_TRANSLATIONS: 4,
} as const;

/**
 * Promptlab 显示限制
 */
export const PROMPTLAB_DISPLAY_LIMITS = {
  /** 高频短语显示数量 */
  HIGH_FREQUENCY_PHRASES: 3,
  /** 情感触发点显示数量 */
  EMOTIONAL_TRIGGERS: 2,
  /** 常见疑虑显示数量 */
  COMMON_DOUBTS: 2,
  /** 生活方式指标显示数量 */
  LIFESTYLE_INDICATORS: 2,
  /** 痛点显示数量 */
  PAIN_POINTS: 2,
} as const;

/**
 * 通用显示限制
 */
export const GENERAL_DISPLAY_LIMITS = {
  /** 产品预览数量 */
  PRODUCT_PREVIEW: 2,
  /** 目标选择数量 */
  TARGET_SELECTION: 5,
  /** 分析结果数量 */
  ANALYSIS_RESULTS: 5,
} as const;

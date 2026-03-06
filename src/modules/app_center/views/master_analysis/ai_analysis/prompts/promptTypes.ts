/**
 * Prompt 系统类型定义
 * 为 AI 分析提示词生成提供完整的类型安全
 */

import type { Product } from '../config/sampleData';

/**
 * 支持的语言代码
 */
export type LanguageCode = 'en' | 'zh' | 'de' | 'fr' | 'es' | 'ja' | 'it';

/**
 * 分析任务 ID
 */
export type AnalysisTaskId =
  | 'title-keywords'
  | 'selling-points'
  | 'fatal-flaws'
  | 'wow-moments'
  | 'hesitation-points'
  | 'buyer-profile'
  | 'vocab-gap'
  | 'promise-reality';

/**
 * Prompt 模板变量
 */
export interface PromptTemplateVariables {
  productTitle: string;
  featureBullets: string;
  lowStarReviews: string;
  highStarReviews: string;
  allReviews: string;
  reviewerCountries: string;
}

/**
 * Prompt 生成输入
 */
export interface PromptGenerationInput {
  taskId: AnalysisTaskId;
  product: Product;
  language?: LanguageCode;
}

/**
 * 批量 Prompt 生成输入
 */
export interface BatchPromptGenerationInput {
  taskIds: AnalysisTaskId[];
  product: Product;
  language?: LanguageCode;
}

/**
 * Prompt 生成结果
 */
export interface PromptGenerationResult {
  prompt: string;
  taskId: AnalysisTaskId;
  language: LanguageCode;
  metadata: {
    productAsin: string;
    generatedAt: string;
    templateVersion: string;
  };
}

/**
 * 批量 Prompt 生成结果
 */
export interface BatchPromptGenerationResult {
  prompt: string;
  taskIds: AnalysisTaskId[];
  language: LanguageCode;
  metadata: {
    productAsin: string;
    generatedAt: string;
    templateVersion: string;
    taskCount: number;
  };
}

/**
 * Prompt 验证结果
 */
export interface PromptValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 分析任务定义（从 analysisPrompts.ts 导出的类型）
 */
export interface AnalysisTaskDefinition {
  id: string;
  name: string;
  taskPrompt: string;
  schemaTemplate: string;
}

/**
 * Prompt 配置选项
 */
export interface PromptGenerationOptions {
  /** 是否启用 prompt injection 防护 */
  enableSanitization?: boolean;
  /** 是否包含详细的调试信息 */
  includeDebugInfo?: boolean;
  /** 自定义模板变量 */
  customVariables?: Partial<PromptTemplateVariables>;
  /** 最大 prompt 长度（字符数） */
  maxLength?: number;
}

/**
 * Prompt 统计信息
 */
export interface PromptStats {
  totalLength: number;
  variableCount: number;
  reviewCount: number;
  bulletCount: number;
  estimatedTokens: number;
}

// src/modules/app_center/views/master_analysis/services/analysisService.ts
// ================================================================
// 🎯 P2 重构: 添加完整的类型注释
// 🛡️ Phase 1: 增强鲁棒性 - 改进解析逻辑与类型检查
// 🎯 P0优化: 使用统一类型定义
// ================================================================

import { callLLM } from '@/services/llmService';
import { withStructuredAnalysisOptions } from '@/services/modelCapability';
import { configCenter } from '@/common/config/ConfigCenter';
import { ApiError, ValidationError } from '@/common/errors/AppError';
import { TRANSLATE_PROMPT_TEMPLATE } from '../constants/prompts';
import { sanitizePromptInput } from '../ai_analysis/prompts/promptSanitizer';
import {
  getMasterAnalysisFullReportMaxTokens,
  getMasterAnalysisTranslationMaxTokens,
} from './llmOutputBudget';
import type { ProductData, DataOptions, LLMConfig, AnalysisReport } from '@/types/modules-business';
import { parseLlmJson } from '@/common/utils/parseLlmJson';

const nativeLoggerConsole = globalThis.console;

// ========================
// 辅助函数
// ========================

function sanitizePromptValue(value: string | undefined, maxLength = 10000): string {
  return sanitizePromptInput(value || '').slice(0, maxLength);
}

function buildProductDataSection(product: ProductData, dataOptions: DataOptions): string {
  const { includeTitle = true, includeBullets = true, includeReviews = true } = dataOptions;
  const parts: string[] = [`ASIN: ${sanitizePromptValue(product.asin, 120)}`];

  if (includeTitle) {
    parts.push(`Title: ${sanitizePromptValue(product.productTitle) || 'N/A'}`);
  }

  if (includeBullets) {
    parts.push(`Feature Bullets: ${buildFeatureBullets(product)}`);
  }

  if (includeReviews) {
    parts.push(`Top Reviews: ${buildTopReviews(product)}`);
  }

  return parts.join('\n');
}

function buildFeatureBullets(product: ProductData): string {
  if (!product.feature_bullets || product.feature_bullets.length === 0) return 'N/A';
  return product.feature_bullets.map(bullet => sanitizePromptValue(bullet)).join('; ');
}

function buildTopReviews(product: ProductData): string {
  const reviews = (product.customer_reviews || [])
    .slice(0, 5)
    .map(review => sanitizePromptValue(review.body, 150))
    .join(' | ');

  return reviews || 'No reviews found';
}

function buildProductsData(products: ProductData[], dataOptions: DataOptions): string {
  return products.map(product => buildProductDataSection(product, dataOptions)).join('\n\n---\n\n');
}

function buildAnalysisPrompt(
  promptTemplate: string,
  productsData: string,
  language: string
): string {
  const safeLanguage = sanitizePromptValue(language, 80) || 'English';
  return promptTemplate
    .replace(/{{language}}/g, safeLanguage)
    .replace('{{productsData}}', productsData)
    .replace('{{category}}', 'General');
}

async function callAnalysisLLM(prompt: string, llmConfig: LLMConfig): Promise<string> {
  return callLLM(
    [{ role: 'user', content: prompt }],
    llmConfig.provider,
    llmConfig.endpoint,
    llmConfig.apiKey,
    llmConfig.model,
    withStructuredAnalysisOptions(
      {
        maxTokens: getMasterAnalysisFullReportMaxTokens(),
        ...(llmConfig.serviceTier && { serviceTier: llmConfig.serviceTier }),
        stream: true,
        timeout: configCenter.get<number>('llm.analysisTimeout') || 120000,
      },
      {
        provider: llmConfig.provider,
        model: llmConfig.model,
        schemaName: 'master_analysis_report',
      }
    )
  );
}

function parseAnalysisResponse(response: string, language: string): AnalysisReport {
  try {
    const parsed = robustParseJSON(response);
    return parsed as AnalysisReport;
  } catch (e) {
    const error = e as Error;
    nativeLoggerConsole.warn('Analysis JSON Parse Failed:', error.message);

    throw new ApiError(
      'AI分析响应解析失败',
      'ERR_ANALYSIS_PARSE_FAILED',
      500,
      { raw_response: response },
      { module: 'AnalysisService', action: 'generateReport', language },
      error
    );
  }
}

/**
 * 鲁棒性 JSON 提取器
 * 处理 Markdown 代码块及杂余文本
 */
function robustParseJSON(text: string): unknown {
  if (!text) return null;

  try {
    return parseLlmJson(text).value;
  } catch {
    throw new ValidationError(
      '无法从响应中解析有效的 JSON 数据',
      'ERR_JSON_PARSE_FAILED',
      'response',
      text,
      { module: 'AnalysisService', action: 'robustParseJSON' }
    );
  }
}

// ========================
// 核心分析服务
// ========================

/**
 * 分析服务模块
 * 提供竞品分析和报告翻译功能
 */
export const AnalysisService = {
  /**
   * 执行竞品分析，生成分析报告
   *
   * @param products - 选中的产品数据数组
   * @param promptTemplate - Prompt 模版 (包含 {{language}}, {{productsData}}, {{category}} 占位符)
   * @param language - 目标语言 (如 "English", "German")
   * @param llmConfig - LLM 配置对象
   * @param dataOptions - 数据维度选项
   * @returns 分析报告对象
   */
  async generateReport(
    products: ProductData[],
    promptTemplate: string,
    language: string,
    llmConfig: LLMConfig,
    dataOptions: DataOptions = {}
  ): Promise<AnalysisReport> {
    const productsData = buildProductsData(products, dataOptions);
    const finalPrompt = buildAnalysisPrompt(promptTemplate, productsData, language);
    const response = await callAnalysisLLM(finalPrompt, llmConfig);

    return parseAnalysisResponse(response, language);
  },

  /**
   * 翻译分析报告
   *
   * @param report - 原始分析报告
   * @param language - 目标翻译语言
   * @param llmConfig - LLM 配置对象
   * @returns 翻译后的报告
   */
  async translateReport(
    report: AnalysisReport,
    language: string,
    llmConfig: LLMConfig
  ): Promise<AnalysisReport> {
    // 深拷贝并移除 meta 字段，减少 Token 消耗
    const toTranslate = JSON.parse(JSON.stringify(report));
    if (toTranslate.meta) delete toTranslate.meta;

    const safeLanguage = sanitizePromptValue(language, 80) || 'English';
    const safeReport = sanitizePromptInput(JSON.stringify(toTranslate, null, 2));
    const translatePrompt = TRANSLATE_PROMPT_TEMPLATE.replace(
      /{{language}}/g,
      safeLanguage
    ).replace('{{report}}', safeReport);

    const response = await callLLM(
      [{ role: 'user', content: translatePrompt }],
      llmConfig.provider,
      llmConfig.endpoint,
      llmConfig.apiKey,
      llmConfig.model,
      withStructuredAnalysisOptions(
        {
          maxTokens: getMasterAnalysisTranslationMaxTokens(),
          ...(llmConfig.serviceTier && { serviceTier: llmConfig.serviceTier }),
          stream: true,
          timeout: configCenter.get<number>('llm.defaultTimeout') || 60000,
        },
        {
          provider: llmConfig.provider,
          model: llmConfig.model,
          schemaName: 'analysis_translation',
        }
      )
    );

    try {
      const parsed = robustParseJSON(response);
      // 类型断言：robustParseJSON 返回的对象作为 AnalysisReport
      return parsed as AnalysisReport;
    } catch (e) {
      const error = e as Error;
      nativeLoggerConsole.warn('Translation JSON Parse Failed:', error.message);

      throw new ApiError(
        '翻译响应解析失败',
        'ERR_TRANSLATION_PARSE_FAILED',
        500,
        { raw_response: response },
        { module: 'AnalysisService', action: 'translateReport', language },
        error
      );
    }
  },
};

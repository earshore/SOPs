// src/modules/app_center/views/master_analysis/services/analysisService.ts
// ================================================================
// 🎯 P2 重构: 添加完整的类型注释
// 🛡️ Phase 1: 增强鲁棒性 - 改进解析逻辑与类型检查
// 🎯 P0优化: 使用统一类型定义
// ================================================================

import { callLLM } from "../../../../../services/llmService";
import { configCenter } from '../../../../../common/config/ConfigCenter';
import { ApiError } from '@common/errors/AppError';
import { TRANSLATE_PROMPT_TEMPLATE } from "../constants/prompts";
import { Logger } from '../../../../../services/loggerService';
import type {
  ProductData,
  DataOptions,
  LLMConfig,
  AnalysisReport
} from '@/types/modules-business';

// ======================== 
// 辅助函数
// ======================== 

/**
 * 鲁棒性 JSON 提取器
 * 处理 Markdown 代码块及杂余文本
 */
function robustParseJSON(text: string): unknown {
  if (!text) return null;

  // 1. 尝试直接解析
  try {
    return JSON.parse(text);
  } catch (e) {
    // 2. 尝试提取 Markdown JSON 块 ```json ... ```
    const mdMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (mdMatch && mdMatch[1]) {
      try { return JSON.parse(mdMatch[1]); } catch (e2) { /* ignore */ }
    }

    // 3. 尝试使用花括号匹配提取最外层的 {}
    const braceMatch = text.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      try { return JSON.parse(braceMatch[0]); } catch (e3) { /* ignore */ }
    }
  }
  throw new Error("无法从响应中解析有效的 JSON 数据");
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
    const {
      includeTitle = true,
      includeBullets = true,
      includeReviews = true,
    } = dataOptions;

    // 1. 动态构建数据字符串
    const productsData = products
      .map((p) => {
        const parts: string[] = [`ASIN: ${p.asin}`];

        if (includeTitle) {
          parts.push(`Title: ${p.productTitle || "N/A"}`);
        }

        if (includeBullets) {
          const bullets =
            p.feature_bullets && p.feature_bullets.length > 0
              ? p.feature_bullets.join("; ")
              : "N/A";
          parts.push(`Feature Bullets: ${bullets}`);
        }

        if (includeReviews) {
          const reviews = (p.customer_reviews || [])
            .slice(0, 5)
            .map((r) => r.body.substring(0, 150))
            .join(" | ");
          parts.push(`Top Reviews: ${reviews || "No reviews found"}`);
        }

        return parts.join("\n");
      })
      .join("\n\n---\n\n");

    // 2. 替换模板变量
    const finalPrompt = promptTemplate
      .replace(/{{language}}/g, language)
      .replace("{{productsData}}", productsData)
      .replace("{{category}}", "General");

    // 3. 调用 LLM
    // 增加超时至 120s，因为分析通常涉及大量上下文
    const response = await callLLM(
      [{ role: "user", content: finalPrompt }],
      llmConfig.provider,
      llmConfig.endpoint,
      llmConfig.apiKey,
      llmConfig.model,
      { jsonMode: false, timeout: configCenter.get<number>('llm.analysisTimeout') || 120000 }
    );

    try {
      const parsed = robustParseJSON(response);
      // 类型断言：robustParseJSON 返回的对象作为 AnalysisReport
      return parsed as AnalysisReport;
    } catch (e) {
      const error = e as Error;
      Logger.warn("Analysis JSON Parse Failed:", error.message);
      
      throw new ApiError(
        'AI分析响应解析失败',
        'ERR_ANALYSIS_PARSE_FAILED',
        500,
        { raw_response: response },
        { module: 'AnalysisService', action: 'generateReport', language },
        error
      );
    }
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

    const translatePrompt = TRANSLATE_PROMPT_TEMPLATE.replace(
      /{{language}}/g,
      language
    ).replace("{{report}}", JSON.stringify(toTranslate, null, 2));

    const response = await callLLM(
      [{ role: "user", content: translatePrompt }],
      llmConfig.provider,
      llmConfig.endpoint,
      llmConfig.apiKey,
      llmConfig.model,
      { jsonMode: false, timeout: configCenter.get<number>('llm.defaultTimeout') || 60000 }
    );

    try {
      const parsed = robustParseJSON(response);
      // 类型断言：robustParseJSON 返回的对象作为 AnalysisReport
      return parsed as AnalysisReport;
    } catch (e) {
      const error = e as Error;
      Logger.warn("Translation JSON Parse Failed:", error.message);
      
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

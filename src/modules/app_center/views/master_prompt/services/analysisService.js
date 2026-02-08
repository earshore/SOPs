// src/modules/master_prompt/services/analysisService.js
// @ts-check
// ================================================= ===============
// 🎯 P2 重构: 添加完整的 JSDoc 类型注释
// 🛡️ Phase 1: 增强鲁棒性 - 改进解析逻辑与类型检查
// ================================================= ===============

import { callLLM } from "../../../../../services/llmService.js";
import { TRANSLATE_PROMPT_TEMPLATE } from "../constants/prompts.js";

// ======================== 
// 类型定义
// ======================== 

/**
 * 产品数据对象
 * @typedef {Object} ProductData
 * @property {string} asin - Amazon 标准识别码
 * @property {string} [productTitle] - 产品标题
 * @property {string[]} [feature_bullets] - 五点描述
 * @property {CustomerReview[]} [customer_reviews] - 客户评论
 */

/**
 * 客户评论对象
 * @typedef {Object} CustomerReview
 * @property {string} body - 评论正文
 * @property {number} [rating] - 评分 (1-5)
 * @property {string} [title] - 评论标题
 */

/**
 * 数据维度选项
 * @typedef {Object} DataOptions
 * @property {boolean} [includeTitle] - 是否包含标题
 * @property {boolean} [includeBullets] - 是否包含五点描述
 * @property {boolean} [includeReviews] - 是否包含评论
 */

/**
 * LLM 配置对象
 * @typedef {Object} LLMConfig
 * @property {string} provider - 厂商标识
 * @property {string} endpoint - API 端点
 * @property {string} apiKey - API 密钥
 * @property {string} model - 模型名称
 */

/**
 * 分析报告对象
 * @typedef {Object} AnalysisReport
 * @property {string} [targetMarket] - 目标市场
 * @property {string} [language] - 语言
 * @property {Object} [meta] - 元数据
 * @property {boolean} [parse_error] - 解析是否出错
 * @property {string} [raw_response] - 原始响应 (解析失败时)
 * @property {string} [error_detail] - 错误详情
 */

// ======================== 
// 辅助函数
// ======================== 

/**
 * 鲁棒性 JSON 提取器
 * 处理 Markdown 代码块及杂余文本
 * @param {string} text 
 * @returns {any}
 */
function robustParseJSON(text) {
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
   * @param {ProductData[]} products - 选中的产品数据数组
   * @param {string} promptTemplate - Prompt 模版 (包含 {{language}}, {{rawdataStr}}, {{category}} 占位符)
   * @param {string} language - 目标语言 (如 "English", "German")
   * @param {LLMConfig} llmConfig - LLM 配置对象
   * @param {DataOptions} [dataOptions={}] - 数据维度选项
   * @returns {Promise<AnalysisReport>} 分析报告对象
   */
  async generateReport(
    products,
    promptTemplate,
    language,
    llmConfig,
    dataOptions = {}
  ) {
    const {
      includeTitle = true,
      includeBullets = true,
      includeReviews = true,
    } = dataOptions;

    // 1. 动态构建数据字符串
    const rawdataStr = products
      .map((p) => {
        /** @type {string[]} */
        let parts = [`ASIN: ${p.asin}`];

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
      .replace("{{rawdataStr}}", rawdataStr)
      .replace("{{category}}", "General");

    // 3. 调用 LLM
    // 增加超时至 120s，因为分析通常涉及大量上下文
    const response = await callLLM(
      [{ role: "user", content: finalPrompt }],
      llmConfig.provider,
      llmConfig.endpoint,
      llmConfig.apiKey,
      llmConfig.model,
      { jsonMode: false, timeout: 120000 }
    );

    try {
      return robustParseJSON(response);
    } catch (e) {
      const error = /** @type {Error} */ (e);
      console.warn("Analysis JSON Parse Failed:", error.message);
      return { 
        raw_response: response, 
        parse_error: true, 
        error_detail: error.message 
      };
    }
  },

  /**
   * 翻译分析报告
   *
   * @param {AnalysisReport} report - 原始分析报告
   * @param {string} language - 目标翻译语言
   * @param {LLMConfig} llmConfig - LLM 配置对象
   * @returns {Promise<AnalysisReport>} 翻译后的报告
   */
  async translateReport(report, language, llmConfig) {
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
      { jsonMode: false, timeout: 60000 }
    );

    try {
      return robustParseJSON(response);
    } catch (e) {
      const error = /** @type {Error} */ (e);
      console.warn("Translation JSON Parse Failed:", error.message);
      return { 
        ...report, // 返回原报告，但标记错误
        parse_error: true, 
        raw_response: response 
      };
    }
  },
};

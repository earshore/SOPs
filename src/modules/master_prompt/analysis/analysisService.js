// src/services/analysisService.js
import { callLLM } from "../../../services/llmService.js";
import { TRANSLATE_PROMPT_TEMPLATE } from "../../../common/constants/prompts.js";

/**
 * 核心分析服务
 */
export const AnalysisService = {
  /**
   * 执行竞品分析
   * @param {Array} products - 选中的产品数据
   * @param {string} promptTemplate - 最终使用的 Prompt 模版
   * @param {string} language - 目标语言
   * @param {Object} llmConfig - LLM 配置
   * @param {Object} dataOptions - ✅ 新增：数据维度选项 {includeTitle, includeBullets, includeReviews}
   * @returns {Promise<Object>} 分析报告对象
   */
  async generateReport(
    products,
    promptTemplate,
    language,
    llmConfig,
    dataOptions = {}
  ) {
    // 默认全选，兼容旧代码
    const {
      includeTitle = true,
      includeBullets = true,
      includeReviews = true,
    } = dataOptions;

    // 1. ✅ 动态构建数据字符串
    const rawdataStr = products
      .map((p) => {
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
            .map((r) => r.body.substring(0, 150)) // 稍微增加点截断长度，既然用户特意选了评论
            .join(" | ");
          parts.push(`Top Reviews: ${reviews || "No reviews found"}`);
        }

        return parts.join("\n");
      })
      .join("\n\n---\n\n");

    // 2. 替换变量
    const finalPrompt = promptTemplate
      .replace(/{{language}}/g, language)
      .replace("{{rawdataStr}}", rawdataStr)
      .replace("{{category}}", "General");

    // 3. 调用 LLM
    const response = await callLLM(
      [{ role: "user", content: finalPrompt }],
      llmConfig.provider,
      llmConfig.endpoint,
      llmConfig.apiKey,
      llmConfig.model
    );

    // 4. 解析结果
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : response);
    } catch (e) {
      console.warn("JSON Parse Failed, returning raw response wrapper");
      return { raw_response: response, parse_error: true };
    }
  },

  /**
   * 翻译报告
   */
  async translateReport(report, language, llmConfig) {
    const toTranslate = JSON.parse(JSON.stringify(report));
    delete toTranslate.meta;

    const translatePrompt = TRANSLATE_PROMPT_TEMPLATE.replace(
      /{{language}}/g,
      language
    ).replace("{{report}}", JSON.stringify(toTranslate, null, 2));

    const response = await callLLM(
      [{ role: "user", content: translatePrompt }],
      llmConfig.provider,
      llmConfig.endpoint,
      llmConfig.apiKey,
      llmConfig.model
    );

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : response);
  },
};

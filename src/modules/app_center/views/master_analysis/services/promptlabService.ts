// src/modules/app_center/views/master_analysis/services/promptlabService.ts

import type { PromptInputs } from "../../../../../types/state";
import type { AnalysisReport } from "../../../../../types/modules-business";

// ============================================================
// Markdown 转换工具函数
// ============================================================

/** 将字符串数组转换为逗号分隔文本 */
const arrToInline = (arr: unknown[] | undefined, max = 10): string => {
  if (!arr || !Array.isArray(arr)) return "";
  return arr
    .slice(0, max)
    .filter((v) => v != null && v !== "")
    .map(String)
    .join(", ");
};

/** 将字符串数组转换为 Markdown 缩进列表行 */
const arrToListLines = (arr: unknown[] | undefined, max = 8): string => {
  if (!arr || !Array.isArray(arr)) return "";
  return arr
    .slice(0, max)
    .filter((v) => v != null && v !== "")
    .map((v) => `  - ${String(v)}`)
    .join("\n");
};

// ----------------------------------------
// 各分析模块 → Markdown 转换器
// ----------------------------------------

/**
 * title-keywords → Markdown
 */
const titleKeywordsToMarkdown = (data: Record<string, unknown>): string => {
  const lines: string[] = ["#### 🔑 Title Core Keywords"];

  if (Array.isArray(data.primary_keywords) && data.primary_keywords.length) {
    const kw = (data.primary_keywords as Array<Record<string, unknown>>)
      .slice(0, 8)
      .map((k) => `${k.keyword} [${k.weight ?? ""}]`)
      .filter(Boolean)
      .join(", ");
    if (kw) lines.push(`- **Primary Keywords:** ${kw}`);
  }

  if (
    Array.isArray(data.secondary_keywords) &&
    data.secondary_keywords.length
  ) {
    const kw = (data.secondary_keywords as Array<Record<string, unknown>>)
      .slice(0, 8)
      .map((k) => `${k.keyword} (${k.type ?? ""})`)
      .filter(Boolean)
      .join(", ");
    if (kw) lines.push(`- **Secondary Keywords:** ${kw}`);
  }

  if (Array.isArray(data.scene_keywords) && data.scene_keywords.length) {
    const kw = (data.scene_keywords as Array<Record<string, unknown>>)
      .slice(0, 5)
      .map((k) => String(k.keyword ?? ""))
      .filter(Boolean)
      .join(", ");
    if (kw) lines.push(`- **Scene Keywords:** ${kw}`);
  }

  if (Array.isArray(data.audience_keywords) && data.audience_keywords.length) {
    const kw = (data.audience_keywords as Array<Record<string, unknown>>)
      .slice(0, 5)
      .map((k) => String(k.keyword ?? ""))
      .filter(Boolean)
      .join(", ");
    if (kw) lines.push(`- **Audience Keywords:** ${kw}`);
  }

  if (
    Array.isArray(data.optimization_suggestions) &&
    data.optimization_suggestions.length
  ) {
    const list = arrToListLines(data.optimization_suggestions as unknown[], 5);
    if (list) lines.push(`- **Optimization Suggestions:**\n${list}`);
  }

  return lines.join("\n");
};

/**
 * selling-points → Markdown
 */
const sellingPointsToMarkdown = (data: Record<string, unknown>): string => {
  const lines: string[] = ["#### 💎 Selling Points Structure"];

  if (data.overall_strategy && typeof data.overall_strategy === "object") {
    const s = data.overall_strategy as Record<string, unknown>;
    if (s.primary_differentiation)
      lines.push(`- **Primary Differentiation:** ${s.primary_differentiation}`);
    if (s.target_positioning)
      lines.push(`- **Target Positioning:** ${s.target_positioning}`);
    if (Array.isArray(s.emotional_hooks) && s.emotional_hooks.length)
      lines.push(
        `- **Emotional Hooks:** ${arrToInline(s.emotional_hooks as unknown[])}`,
      );
    if (Array.isArray(s.missing_elements) && s.missing_elements.length)
      lines.push(
        `- **Missing Elements:** ${arrToInline(s.missing_elements as unknown[])}`,
      );
  }

  if (
    data.function_scene_matrix &&
    typeof data.function_scene_matrix === "object"
  ) {
    const m = data.function_scene_matrix as Record<string, unknown>;
    if (Array.isArray(m.pain_points) && m.pain_points.length)
      lines.push(
        `- **Pain Points Addressed:** ${arrToInline(m.pain_points as unknown[])}`,
      );
  }

  if (Array.isArray(data.bullet_analysis) && data.bullet_analysis.length) {
    const bulletLines = (data.bullet_analysis as Array<Record<string, unknown>>)
      .slice(0, 5)
      .map((b) => {
        const parts: string[] = [];
        if (b.differentiation_angle)
          parts.push(`Differentiation: ${b.differentiation_angle}`);
        if (
          Array.isArray(b.pain_points_addressed) &&
          (b.pain_points_addressed as unknown[]).length
        )
          parts.push(
            `Pain Points: ${arrToInline(b.pain_points_addressed as unknown[], 3)}`,
          );
        if (b.credibility_score)
          parts.push(`Credibility: ${b.credibility_score}`);
        return `  - Bullet ${b.bullet_index ?? ""}: ${parts.join(" | ")}`;
      });
    if (bulletLines.length)
      lines.push(`- **Bullet Analysis:**\n${bulletLines.join("\n")}`);
  }

  return lines.join("\n");
};

/**
 * fatal-flaws → Markdown
 */
const fatalFlawsToMarkdown = (data: Record<string, unknown>): string => {
  const lines: string[] = ["#### ⚠️ Fatal Flaws (Competitor Issues)"];

  if (data.risk_assessment && typeof data.risk_assessment === "object") {
    const r = data.risk_assessment as Record<string, unknown>;
    const parts: string[] = [];
    if (r.overall_risk_level)
      parts.push(`Risk Level: **${r.overall_risk_level}**`);
    if (r.primary_concern) parts.push(`Primary Concern: ${r.primary_concern}`);
    if (parts.length) lines.push(`- ${parts.join(" | ")}`);
  }

  if (Array.isArray(data.critical_issues) && data.critical_issues.length) {
    const issueLines = (data.critical_issues as Array<Record<string, unknown>>)
      .slice(0, 5)
      .map((i) => {
        const parts: string[] = [];
        if (i.issue) parts.push(String(i.issue));
        if (i.severity) parts.push(`[${i.severity}]`);
        if (Array.isArray(i.user_quotes) && (i.user_quotes as string[]).length)
          parts.push(`"${(i.user_quotes as string[])[0]}"`);
        return `  - ${parts.join(" ")}`;
      });
    if (issueLines.length)
      lines.push(`- **Critical Issues:**\n${issueLines.join("\n")}`);
  }

  if (Array.isArray(data.return_triggers) && data.return_triggers.length)
    lines.push(
      `- **Return Triggers:** ${arrToInline(data.return_triggers as unknown[])}`,
    );

  if (Array.isArray(data.expectation_gaps) && data.expectation_gaps.length) {
    const gapLines = (data.expectation_gaps as Array<Record<string, unknown>>)
      .slice(0, 3)
      .map((g) => `  - Expected: "${g.expected}" → Reality: "${g.reality}"`);
    if (gapLines.length)
      lines.push(`- **Expectation Gaps:**\n${gapLines.join("\n")}`);
  }

  if (Array.isArray(data.actionable_fixes) && data.actionable_fixes.length) {
    const list = arrToListLines(data.actionable_fixes as unknown[], 4);
    if (list) lines.push(`- **Actionable Fixes:**\n${list}`);
  }

  return lines.join("\n");
};

/**
 * wow-moments → Markdown
 */
const wowMomentsToMarkdown = (data: Record<string, unknown>): string => {
  const lines: string[] = ["#### ✨ Wow Moments (Customer Delight)"];

  if (
    Array.isArray(data.high_conversion_phrases) &&
    data.high_conversion_phrases.length
  )
    lines.push(
      `- **High Conversion Phrases:** ${arrToInline(data.high_conversion_phrases as unknown[])}`,
    );

  if (Array.isArray(data.copywriting_angles) && data.copywriting_angles.length)
    lines.push(
      `- **Copywriting Angles:** ${arrToInline(data.copywriting_angles as unknown[])}`,
    );

  if (
    Array.isArray(data.unexpected_benefits) &&
    data.unexpected_benefits.length
  )
    lines.push(
      `- **Unexpected Benefits:** ${arrToInline(data.unexpected_benefits as unknown[])}`,
    );

  if (Array.isArray(data.emotional_triggers) && data.emotional_triggers.length)
    lines.push(
      `- **Emotional Triggers:** ${arrToInline(data.emotional_triggers as unknown[])}`,
    );

  if (Array.isArray(data.moments) && data.moments.length) {
    const momentLines = (data.moments as Array<Record<string, unknown>>)
      .slice(0, 4)
      .map((m) => {
        const tag = [m.emotion_type, m.aspect].filter(Boolean).join("/");
        const quote = m.user_quote ? `"${m.user_quote}"` : "";
        const potential = m.marketing_potential
          ? `→ Potential: ${m.marketing_potential}`
          : "";
        return `  - ${tag ? `[${tag}] ` : ""}${quote}${potential ? " " + potential : ""}`;
      });
    if (momentLines.length)
      lines.push(`- **Key Moments:**\n${momentLines.join("\n")}`);
  }

  return lines.join("\n");
};

/**
 * hesitation-points → Markdown
 */
const hesitationPointsToMarkdown = (data: Record<string, unknown>): string => {
  const lines: string[] = ["#### 🤔 Hesitation Points (Pre-Purchase Worries)"];

  if (Array.isArray(data.common_doubts) && data.common_doubts.length)
    lines.push(
      `- **Common Doubts:** ${arrToInline(data.common_doubts as unknown[])}`,
    );

  if (Array.isArray(data.trust_builders) && data.trust_builders.length)
    lines.push(
      `- **Trust Builders:** ${arrToInline(data.trust_builders as unknown[])}`,
    );

  if (Array.isArray(data.hesitations) && data.hesitations.length) {
    const hesLines = (data.hesitations as Array<Record<string, unknown>>)
      .slice(0, 4)
      .map(
        (h) =>
          `  - Worry: "${h.pre_purchase_worry}" → Resolution: "${h.post_purchase_resolution}"`,
      );
    if (hesLines.length)
      lines.push(`- **Hesitation Patterns:**\n${hesLines.join("\n")}`);
  }

  if (
    Array.isArray(data.qa_optimization_items) &&
    data.qa_optimization_items.length
  ) {
    const qaLines = (
      data.qa_optimization_items as Array<Record<string, unknown>>
    )
      .slice(0, 3)
      .map((qa) => `  - Q: "${qa.question}" → A: "${qa.suggested_answer}"`);
    if (qaLines.length)
      lines.push(`- **Q&A Optimization:**\n${qaLines.join("\n")}`);
  }

  return lines.join("\n");
};

/**
 * buyer-profile → Markdown
 */
const buyerProfileToMarkdown = (data: Record<string, unknown>): string => {
  const lines: string[] = ["#### 👤 Buyer Profile"];

  if (data.demographics && typeof data.demographics === "object") {
    const d = data.demographics as Record<string, unknown>;
    const parts: string[] = [];
    if (d.likely_gender) parts.push(`Gender: ${d.likely_gender}`);
    if (d.age_range_estimate) parts.push(`Age: ${d.age_range_estimate}`);
    if (
      Array.isArray(d.lifestyle_indicators) &&
      (d.lifestyle_indicators as unknown[]).length
    )
      parts.push(
        `Lifestyle: ${arrToInline(d.lifestyle_indicators as unknown[], 4)}`,
      );
    if (parts.length) lines.push(`- **Demographics:** ${parts.join(" | ")}`);
  }

  if (
    data.geographic_insights &&
    typeof data.geographic_insights === "object"
  ) {
    const g = data.geographic_insights as Record<string, unknown>;
    if (
      Array.isArray(g.primary_markets) &&
      (g.primary_markets as unknown[]).length
    )
      lines.push(
        `- **Primary Markets:** ${arrToInline(g.primary_markets as unknown[])}`,
      );
    if (
      Array.isArray(g.cultural_considerations) &&
      (g.cultural_considerations as unknown[]).length
    )
      lines.push(
        `- **Cultural Considerations:** ${arrToInline(g.cultural_considerations as unknown[], 4)}`,
      );
  }

  if (Array.isArray(data.buyer_types) && data.buyer_types.length) {
    const typeLines = (data.buyer_types as Array<Record<string, unknown>>)
      .slice(0, 3)
      .map(
        (t) =>
          `  - ${t.type} (${t.percentage_estimate ?? ""}): ${t.evidence ?? ""}`,
      );
    if (typeLines.length)
      lines.push(`- **Buyer Types:**\n${typeLines.join("\n")}`);
  }

  if (Array.isArray(data.usage_scenes) && data.usage_scenes.length) {
    const sceneLines = (data.usage_scenes as Array<Record<string, unknown>>)
      .slice(0, 3)
      .map((s) => `  - [${s.frequency ?? ""}] ${s.scene}: ${s.context ?? ""}`);
    if (sceneLines.length)
      lines.push(`- **Usage Scenes:**\n${sceneLines.join("\n")}`);
  }

  if (
    Array.isArray(data.purchase_motivations) &&
    data.purchase_motivations.length
  )
    lines.push(
      `- **Purchase Motivations:** ${arrToInline(data.purchase_motivations as unknown[])}`,
    );

  return lines.join("\n");
};

/**
 * vocab-gap → Markdown
 */
const vocabGapToMarkdown = (data: Record<string, unknown>): string => {
  const lines: string[] = ["#### 📝 Vocabulary Gap Analysis"];

  if (
    Array.isArray(data.uncovered_buyer_terms) &&
    data.uncovered_buyer_terms.length
  ) {
    const termLines = (
      data.uncovered_buyer_terms as Array<Record<string, unknown>>
    )
      .slice(0, 5)
      .map(
        (t) =>
          `  - "${t.term}" [${t.frequency ?? ""}] → ${t.recommendation ?? ""}`,
      );
    if (termLines.length)
      lines.push(
        `- **Uncovered Buyer Terms (Add to Listing):**\n${termLines.join("\n")}`,
      );
  }

  if (Array.isArray(data.term_translations) && data.term_translations.length) {
    const transLines = (
      data.term_translations as Array<Record<string, unknown>>
    )
      .slice(0, 4)
      .map((t) => `  - "${t.seller_says}" → "${t.buyer_says}"`);
    if (transLines.length)
      lines.push(`- **Seller → Buyer Language:**\n${transLines.join("\n")}`);
  }

  if (
    data.listing_optimization &&
    typeof data.listing_optimization === "object"
  ) {
    const opt = data.listing_optimization as Record<string, unknown>;
    if (
      Array.isArray(opt.title_additions) &&
      (opt.title_additions as unknown[]).length
    )
      lines.push(
        `- **Title Additions:** ${arrToInline(opt.title_additions as unknown[])}`,
      );
    if (
      Array.isArray(opt.bullet_additions) &&
      (opt.bullet_additions as unknown[]).length
    )
      lines.push(
        `- **Bullet Additions:** ${arrToInline(opt.bullet_additions as unknown[])}`,
      );
    if (
      Array.isArray(opt.keyword_opportunities) &&
      (opt.keyword_opportunities as unknown[]).length
    )
      lines.push(
        `- **Keyword Opportunities:** ${arrToInline(opt.keyword_opportunities as unknown[])}`,
      );
  }

  return lines.join("\n");
};

/**
 * promise-reality → Markdown
 */
const promiseRealityToMarkdown = (data: Record<string, unknown>): string => {
  const lines: string[] = ["#### 🎯 Promise vs Reality"];

  if (
    data.overall_credibility &&
    typeof data.overall_credibility === "object"
  ) {
    const c = data.overall_credibility as Record<string, unknown>;
    if (c.score || c.assessment)
      lines.push(
        `- **Overall Credibility:** ${c.score ?? "?"}/10 — ${c.assessment ?? ""}`,
      );
  }

  if (Array.isArray(data.gaps) && data.gaps.length) {
    const gapLines = (data.gaps as Array<Record<string, unknown>>)
      .slice(0, 4)
      .map((g) => {
        const sev = g.contradiction_severity
          ? `[${g.contradiction_severity}] `
          : "";
        return `  - ${sev}Claim: "${g.listing_claim}" vs Reality: "${g.review_reality}"`;
      });
    if (gapLines.length)
      lines.push(`- **Critical Gaps:**\n${gapLines.join("\n")}`);
  }

  if (Array.isArray(data.verified_claims) && data.verified_claims.length)
    lines.push(
      `- **Verified Claims:** ${arrToInline(data.verified_claims as unknown[], 5)}`,
    );

  if (
    Array.isArray(data.listing_revision_suggestions) &&
    data.listing_revision_suggestions.length
  ) {
    const list = arrToListLines(
      data.listing_revision_suggestions as unknown[],
      4,
    );
    if (list) lines.push(`- **Revision Suggestions:**\n${list}`);
  }

  return lines.join("\n");
};

/**
 * 将单个分析模块数据转换为统一 Markdown 格式。
 * 对于未知模块 id，执行通用的键值平铺，避免 JSON 块混入。
 */
const convertSectionToMarkdown = (targetId: string, data: unknown): string => {
  if (!data || typeof data !== "object") return "";
  const obj = data as Record<string, unknown>;

  switch (targetId) {
    case "title-keywords":
      return titleKeywordsToMarkdown(obj);
    case "selling-points":
      return sellingPointsToMarkdown(obj);
    case "fatal-flaws":
      return fatalFlawsToMarkdown(obj);
    case "wow-moments":
      return wowMomentsToMarkdown(obj);
    case "hesitation-points":
      return hesitationPointsToMarkdown(obj);
    case "buyer-profile":
      return buyerProfileToMarkdown(obj);
    case "vocab-gap":
      return vocabGapToMarkdown(obj);
    case "promise-reality":
      return promiseRealityToMarkdown(obj);
    default: {
      // 通用降级：将对象顶层值以可读文本平铺，不输出原始 JSON
      const lines: string[] = [`#### ${targetId}`];
      for (const [k, v] of Object.entries(obj)) {
        if (v == null) continue;
        if (Array.isArray(v)) {
          lines.push(`- **${k}:** ${arrToInline(v as unknown[])}`);
        } else if (typeof v === "object") {
          lines.push(`- **${k}:** ${JSON.stringify(v)}`);
        } else {
          lines.push(`- **${k}:** ${String(v)}`);
        }
      }
      return lines.join("\n");
    }
  }
};

// ============================================================
// 内部 Helper 函数
// ============================================================

/**
 * 构建竞品/市场分析上下文 (Context Section)
 * 所有分析数据均以统一 Markdown 格式注入，不混入原始 JSON。
 */
const buildContextSection = (
  inputs: PromptInputs,
  analysisReport: AnalysisReport | null,
): string => {
  const { useAnalysisData, selectedReportItems, selectedReportSections } = inputs;

  if (!useAnalysisData || !analysisReport) {
    return "";
  }

  // 向后兼容：优先使用新格式 selectedReportItems，否则使用旧格式 selectedReportSections
  const dimensionsToInclude = selectedReportItems
    ? Object.keys(selectedReportItems).filter(id => selectedReportItems[id]?.enabled)
    : selectedReportSections || [];

  if (dimensionsToInclude.length === 0) {
    return "";
  }

  const cleanReport = JSON.parse(JSON.stringify(analysisReport)) as Record<
    string,
    unknown
  >;

  // ✅ 检测报告格式：新格式（带 metadata 和 analysisReport）vs 旧格式
  const hasMetadata =
    cleanReport.metadata &&
    cleanReport.analysisReport &&
    typeof cleanReport.analysisReport === "object";

  const report: Record<string, unknown> = hasMetadata
    ? (cleanReport.analysisReport as Record<string, unknown>)
    : (() => {
      // 旧格式：删除不必要的元数据字段后直接使用
      [
        "meta",
        "GeneratedByModel",
        "GeneratedAt",
        "templateUsed",
        "raw_response",
        "language",
        "targetMarket",
        "marketplace",
      ].forEach((k) => delete cleanReport[k]);
      return cleanReport;
    })();

  const markdownSections: string[] = [];

  dimensionsToInclude.forEach((targetId) => {
    if (!report[targetId]) return;

    // 新功能：根据细粒度选择过滤子项
    const filteredData = selectedReportItems?.[targetId]
      ? filterSubItems(report[targetId], selectedReportItems[targetId].subItems)
      : report[targetId]; // 向后兼容：包含所有子项

    if (
      filteredData &&
      typeof filteredData === "object" &&
      Object.keys(filteredData as Record<string, unknown>).length === 0
    ) {
      return;
    }

    const md = convertSectionToMarkdown(targetId, filteredData);
    if (md) markdownSections.push(md);
  });

  if (markdownSections.length === 0) return "";

  return `\n## Market Context\n### Competitor Insights Report\n\n${markdownSections.join("\n\n")}\n`;
};

/**
 * 过滤子项数据
 * 根据用户的细粒度选择，只保留选中的子项和具体内容项
 */
function filterSubItems(
  data: unknown,
  subItemSelections: Record<string, boolean | { enabled: boolean; items?: Record<string, boolean> }> | undefined
): unknown {
  if (!data || typeof data !== 'object') return data;
  if (!subItemSelections) return data; // 无过滤配置，返回全部

  const filtered: Record<string, unknown> = {};
  const dataObj = data as Record<string, unknown>;

  for (const [key, value] of Object.entries(dataObj)) {
    const selection = subItemSelections[key];

    // 简单布尔值：直接判断是否选中
    if (typeof selection === 'boolean') {
      if (selection !== false) {
        filtered[key] = value;
      }
      continue;
    }

    // 对象结构：需要检查 enabled 和 items
    if (typeof selection === 'object') {
      if (!selection.enabled) continue; // 子项未启用，跳过

      // 如果是数组且有具体项选择配置
      if (selection.items) {
        const items = selection.items;
        const hasExplicitSelections = Object.keys(items).length > 0;

        if (hasExplicitSelections) {
          // 过滤数组中的具体项
          if (Array.isArray(value)) {
            const filteredArray = value.filter((_, index) => {
              const indexStr = index.toString();
              // 如果 items 中有该索引，使用其值；否则默认选中
              return items[indexStr] !== false;
            });
            if (filteredArray.length > 0) {
              filtered[key] = filteredArray;
            }
          } else if (value && typeof value === 'object') {
            const filteredObject: Record<string, unknown> = {};
            Object.entries(value as Record<string, unknown>).forEach(
              ([objectKey, objectValue], index) => {
                if (items[index.toString()] !== false) {
                  filteredObject[objectKey] = objectValue;
                }
              },
            );
            if (Object.keys(filteredObject).length > 0) {
              filtered[key] = filteredObject;
            }
          } else if (items['0'] !== false) {
            filtered[key] = value;
          }
        } else {
          // 空对象表示全选
          filtered[key] = value;
        }
      } else {
        // 非数组或无具体项配置，直接包含
        filtered[key] = value;
      }
      continue;
    }

    // 未在配置中，默认包含
    if (selection === undefined) {
      filtered[key] = value;
    }
  }

  return filtered;
}
const DUPLICATE_TEXT_MIN_LENGTH = 24;

const normalizeForDuplicateCheck = (value: string): string => value
  .toLowerCase()
  .replace(/^[\s\-*•]+/gm, '')
  .replace(/[-*_`#>[\]()"':.,;!?，。；：、（）|/\\]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const isDuplicateAgainstContext = (value: string, contextText: string): boolean => {
  const normalizedValue = normalizeForDuplicateCheck(value);
  if (normalizedValue.length < DUPLICATE_TEXT_MIN_LENGTH) {
    return false;
  }

  return normalizeForDuplicateCheck(contextText).includes(normalizedValue);
};

const filterDuplicateInlineParts = (value: string, contextText: string): string => {
  const parts = value
    .split(/[,;，；]/)
    .map(part => part.trim())
    .filter(Boolean)
    .filter(part => !isDuplicateAgainstContext(part, contextText));

  return parts.join(', ');
};

const filterDuplicateListLines = (value: string, contextText: string): string => {
  const lines = value
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => !isDuplicateAgainstContext(line, contextText));

  return lines.join('\n');
};

const buildProductSection = (inputs: PromptInputs, contextText = ''): string => {
  const { audience = '', usps = '', specs = '' } = inputs;
  const dnaParts: string[] = [];
  const dedupedAudience = contextText ? filterDuplicateInlineParts(audience, contextText) : audience;
  const dedupedUsps = contextText ? filterDuplicateListLines(usps, contextText) : usps;
  const dedupedSpecs = contextText ? filterDuplicateListLines(specs, contextText) : specs;

  if (dedupedAudience) dnaParts.push(`- **Target Audience**: ${dedupedAudience}`);
  if (dedupedUsps) dnaParts.push(`- **Core USPs**: \n${dedupedUsps}`);
  if (dedupedSpecs) dnaParts.push(`- **Technical Specs**: \n${dedupedSpecs}`);

  return dnaParts.length > 0
    ? `\n## Product DNA Supplement\n${dnaParts.join("\n")}\n`
    : "";
};

/**
 * 构建 SEO 部分 (SEO Section)
 */
const buildSeoSection = (
  inputs: PromptInputs,
  mode: "master" | "visual" = "master",
): string => {
  const { keywordsTier1, keywordsTier2, socialHook, negative } = inputs;
  const seoParts: string[] = [];
  const isVisual = mode === "visual";

  // Tier 1 文案差异处理
  const t1Label = isVisual
    ? "Tier 1 (Main Keyword / Product Definition)"
    : "Tier 1 (Title / Bullet 1 / Product Name)";
  if (keywordsTier1) seoParts.push(`- **${t1Label}**: ${keywordsTier1}`);

  // Tier 2 文案差异处理
  const t2Label = isVisual
    ? "Tier 2 (Longtail Keyword)"
    : "Tier 2 (Bullet 2-5)";
  if (keywordsTier2) seoParts.push(`- **${t2Label}**: ${keywordsTier2}`);

  // Social Hook 逻辑
  if (socialHook) {
    seoParts.push(`- **Social/Marketing Hooks**: ${socialHook}`);
  }

  if (negative) {
    seoParts.push(`- **Negative Keywords**: ${negative}`);
  }

  // 头部指令差异处理
  const introText = isVisual
    ? "Discribe with these SEO keywords naturally:"
    : "Integrate **All** these keywords naturally:";

  return seoParts.length > 0
    ? `\n## SEO Mandate\n${introText}\n${seoParts.join("\n")}\n`
    : "";
};

// ============================================================
// 主服务导出
// ============================================================

export const promptlabService = {
  /**
   * 生成 Listing Prompt
   */
  generateMasterPrompt: (
    inputs: PromptInputs,
    analysisReport: AnalysisReport | null,
  ): string => {
    const { tone, targetMarket, useCosmo, useRufus, useEmoji, customStrategy } =
      inputs;

    // 复用 Helper 函数生成基础模块
    const contextSection = buildContextSection(inputs, analysisReport);
    const productSection = buildProductSection(inputs, contextSection);
    const seoSection = buildSeoSection(inputs, "master");

    // 4. Instructions (Listing Prompt 特有的指令逻辑)
    const styleInstructions: string[] = [];

    // 语言
    if (targetMarket) {
      styleInstructions.push(
        `**LANGUAGE:** Aimming at ${targetMarket} market (Use native idioms and phrasing, correct grammar, and cultural relevance, instead of translating).`,
      );
    }

    // 语气
    if (tone === "professional")
      styleInstructions.push(
        "Tone: Professional, authoritative, yet approachable.",
      );
    if (tone === "exciting")
      styleInstructions.push("Tone: Energetic, exciting.");
    if (tone === "emotional")
      styleInstructions.push("Tone: Emotional, storytelling.");
    if (tone === "minimalist")
      styleInstructions.push("Tone: Clean, minimalist.");

    // COSMO 场景化
    if (useCosmo)
      styleInstructions.push(`**COSMO Framework Application:**
            - **Context**: Don't just list features; describe the *situation* where the user needs it.
            - **Match**: Connect the feature directly to a *User Pain Point* from the Competitor Insights.`);

    // 算法优化 (Rufus)
    if (useRufus)
      styleInstructions.push(`**Amazon Rufus/AI Optimization:**
            - Structure content as direct answers to potential user questions.
            - Avoid fluff. Be concise and fact-based in the first sentence of each block.`);

    if (useEmoji)
      styleInstructions.push("**Formatting:** Use emojis in bullet points.");

    if (customStrategy) {
      styleInstructions.push(`**USER RULES:** ${customStrategy}`);
    }

    // 5. 组装 Listing Prompt
    return `
# ROLE
Act as a Senior **${targetMarket}** Listing Copywriter and E-commerce SEO Specialist with 10+ years of experience in the DACH market.
You combine deep expertise in ${targetMarket} consumer psychology, the COSMO framework (Context, Optimization, Search, Match, Offer), and optimization for conversational AI search (Amazon Rufus/A10 Algorithm).

# GOAL
Create a high-converting, native-level ${targetMarket} Amazon listing that passes strict chars-count limits and directly answers user intents (Rufus-Ready).

# INPUT CONTEXT
${productSection}
${seoSection}
${contextSection}

# CRITICAL GUIDELINES
${styleInstructions.join("\n")}

# EXECUTION STEPS (Chain of Thought)
1. **Analyze**: First, silently review the Competitor Insights and identify the top 3 "Buying Hesitations" to address and "Vocab Gaps" to fill.
2. **Drafting - Title**: Construct the title placing the Main Keyword strictly in the first 5 words.
3. **Drafting - Bullets**: Write 5 bullets using the structure: [Emoji] **[BENEFIT HEADER]:** [Direct Answer/Benefit] + [Contextual Usage] + [Tech Spec].
4. **Drafting - Description**: Create an HTML description using "Answer-First" headers.
5. **Review**: Check all character/byte counts before outputting.

# OUTPUT TASK
Generate the complete Amazon Listing following the structure below:
1. **Title:** (Max 180 chars). format: [Main Keyword] + [USP/Benefit] + [Material/Feature] + [Context/Use Case].
2. **5 Bullet Points:** (150-200 bytes each). Structure: [Emoji] **[Benefit Header in Caps]:** [COSMO-optimized explanation of usage context] + [Technical Proof/Spec].
3. **Backend Search Terms:** (Space-separated, < 249 bytes). specific long-tail keywords not already in the title.
4. **Product Description:** (HTML formatted). Use "Answer-First" logic. Start with the core value proposition, then elaborate. Use persuasive storytelling tailored to the German avatar.

**Action:** Review the Input Context and generate the listing now.
`.trim();
  },

  /**
   * 生成 Visual Blueprint
   */
  generateVisualPrompt: (
    inputs: PromptInputs,
    analysisReport: AnalysisReport | null,
  ): string => {
    const { targetMarket } = inputs;

    // 复用 Helper 函数生成基础模块
    const contextSection = buildContextSection(inputs, analysisReport);
    const productSection = buildProductSection(inputs, contextSection);
    const seoSection = buildSeoSection(inputs, "visual");

    // 2. 组装 Visual Prompt
    return `
# ROLE
Act as an expert **Amazon Visual Merchandiser & Art Director** with 10+ years of experience in High-Conversion A+ Content (EBC) and Brand Story design for the **${targetMarket}** market.
Your goal is to translate text-based product data and competitor insights into a **Visual Conversion Script**.

# INPUT DATA
${productSection}
${seoSection}
${contextSection}

# STRATEGY: THE VISUAL CVR FORMULA
You must map the "Competitor Insights" directly to visual elements:
1. **Negative Deal Breakers** -> Convert into **"Visual Trust/Solution Modules"** (e.g., if users complain about leaks, design a "Triple-Seal Zoom-in" module).
2. **Positive Aha Moments** -> Convert into **"Lifestyle/Scenario Modules"** (Show the specific moment of joy).
3. **Buying Hesitations** -> Convert into **"Comparison Tables"** or **"Info-graphic Breakdowns"**.

# OUTPUT TASK
Create a structured **A+ Content Blueprint** (Standard 5-Module Layout + Brand Story).
For EACH module, provide:
1.  **Module Type**: (e.g., Standard Header Image, Four Image/Text, Comparison Chart).
2.  **Visual Goal**: What psychological trigger are we hitting?
3.  **Art Direction (The Image)**: Detailed description for a photographer or Nano Banana prompt. Describe lighting, angle, props, and models.
4.  **Overlay Copy**: The minimal text text/headline on the image.

# OUTPUT FORMAT (Strict Markdown)

## 1. Brand Story (Background Strategy)
* **Hero Image**: [Describe the mood/setting]
* **Slogan**: [Short, punchy brand statement]
* **Value Cards**: [3 short value props]

## 2. A+ Content Blueprint

### Module 1: The Hook (Hero Banner)
* **Visual Concept**: ...
* **Nano Banana/Photographer Prompt**: \`/imagine prompt: ...\`
* **Copy Overlay**: ...

### Module 2: The Solution (Addressing Deal Breakers)
* **Insight addressed**: [Reference the specific negative review point]
* **Visual Concept**: ...
* **Nano Banana/Photographer Prompt**: ...

### Module 3: The Experience (Aha Moment)
* **Visual Concept**: ...
* **Nano Banana/Photographer Prompt**: ...

### Module 4: The Logic (Specs/Comparison)
* **Visual Concept**: ...
* **Comparison Strategy**: Us vs. Them (Focus on: [Key Spec])

**Action:** Review the Market Insights and generate the Visual Blueprint now.
`.trim();
  },
};

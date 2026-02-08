// src/modules/app_center/master_prompt/constants/prompts.ts
// ================================================================
// Master Prompt 模块 - 提示词常量
// 包含 PromptLab 和 Analysis 功能的所有提示词模板
// ================================================================

/**
 * 分析模块定义
 */
export interface AnalysisModule {
    id: string;
    category: 'listing' | 'reviews' | 'cross';
    label_cn: string;
    desc_cn: string;
    label_en: string;
    desc_en: string;
    extraction_instruction: string;
}

/**
 * 核心 JSON 规则 (所有模板共用)
 */
const CORE_JSON_RULES = `
## Core Rules
1. **Analyze** ONLY the **Raw Data** based on the specific **Analysis Tasks & Logic**, never make up fake things.
2. **Extract** high-density, specific information. Do not summarize; extract facts.
3. **Format** the output into strictly VALID JSON.
4. **Language Rule**: JSON Keys must be in **English**(matches the schema). JSON Values must be in **{{language}}**.
5. If a value is unknown, use null or "N/A".
`;

/**
 * 动态分析模块定义库
 * label_en/extraction_instruction -> 传给 LLM (英文)
 * label_cn/desc_cn -> UI 展示 (中文)
 */
export const ANALYSIS_MODULES: AnalysisModule[] = [
  // --- 1. Listing Base Analysis (文案基建) ---
  {
    id: "title_seo_roots",
    category: "listing",
    label_cn: "标题核心词根",
    desc_cn: "分析竞品标题，剔除品牌与修饰词，提取决定流量属性的绝对核心词根。",
    label_en: "Title Core Root",
    desc_en: "Analyze titles to isolate absolute core keyword roots that determine traffic relevance, stripping brands/modifiers.",
    extraction_instruction: "Strip brand names/measurements. Identify top 3 'Root Nouns' defining the product. Calculate frequency."
  },
  {
    id: "selling_proposition_deconstruction",
    category: "listing",
    label_cn: "卖点结构拆解",
    desc_cn: "将五点描述解构为'功能-场景-痛点'矩阵，识别竞品主打的差异化策略。",
    label_en: "USP",
    desc_en: "Deconstruct bullet points into a 'Feature-Scenario-Pain' matrix to identify competitor differentiation strategies.",
    extraction_instruction: "Identify top 3 common Selling Propositions across ASINs. Map the 'Feature' to the 'Pain Point' it solves."
  },

  // --- 2. Deep Review Intelligence (评论深挖 - 补偿缺失数据) ---
  {
    id: "neg_deal_breakers",
    category: "reviews",
    label_cn: "致命劝退点",
    desc_cn: "从1-3星评论中提炼导致退货的根本原因（非物流），用于规避产品缺陷。",
    label_en: "Deal Breakers",
    desc_en: "Extract root causes for returns/dissatisfaction from 1-3 star reviews (ignoring shipping) to identify fatal flaws.",
    extraction_instruction: "Focus on Product Performance/Design Flaws (Ignore 'shipping' or 'arrived broken'). Top 5 reasons for regret."
  },
  {
    id: "pos_aha_moments",
    category: "reviews",
    label_cn: "惊喜顿悟时刻",
    desc_cn: "提取5星评论中用户表示'超出预期'的具体瞬间，这是高转化率文案的核心素材。",
    label_en: "Aha Moments",
    desc_en: "Extract specific moments from 5-star reviews where value exceeded expectations. These are gold for conversion copy.",
    extraction_instruction: "Extract specific scenarios from 5-star reviews (phrases like 'surprised', 'finally'). Keep verbatim."
  },
  {
    id: "buying_hesitations",
    category: "reviews",
    label_cn: "购买前犹豫点",
    desc_cn: "挖掘'购买前曾担心，但收到后放心了'的评论，用于替代Q&A填补信息盲区。",
    label_en: "Hesitations",
    desc_en: "Identify 'I was worried about X, but...' comments to substitute missing Q&A data and address objections.",
    extraction_instruction: "Extract specific pre-purchase concerns (phrases like 'skeptical', 'hesitated')."
  },
  {
    id: "user_avatar_context",
    category: "reviews",
    label_cn: "画像与场景侧写",
    desc_cn: "基于评论用语推断买家身份（谁在买）和具体使用场景（在哪里用）。",
    label_en: "User Context",
    desc_en: "Infer the buyer's identity (Who) and specific usage environment (Where) based on review vocabulary.",
    extraction_instruction: "Infer 'Who' (Persona) and 'Where' (Use Case) from narratives."
  },

  // --- 3. Cross-Analysis (高维洞察 - 核心优化区) ---
  {
    id: "vocabulary_gap",
    category: "cross",
    label_cn: "词汇鸿沟分析",
    desc_cn: "对比'商家用词'与'买家黑话'，找出Listing未覆盖但买家高频使用的词汇。",
    label_en: "Vocabulary Gap",
    desc_en: "Contrast 'Seller Jargon' vs 'Buyer Slang'. Identify high-frequency buyer terms missing from the listing.",
    extraction_instruction: "Words frequent in Reviews (top 20%) but rare in Listing (<1%)."
  },
  {
    id: "promise_reality_check",
    category: "cross",
    label_cn: "承诺/现实断层",
    desc_cn: "识别Listing过度承诺但Review频繁打脸的功能点，防止虚假宣传。",
    label_en: "Promise-Reality Gap",
    desc_en: "Identify features heavily promoted in listings that are frequently cited as failures in reviews.",
    extraction_instruction: "Listing claims that correlate with negative sentiment."
  }
];

/**
 * 动态主模板 (PromptLab)
 */
export const DYNAMIC_MASTER_TEMPLATE = `
You are a Data Extraction Engine specialized in E-commerce Analysis.
Your sole purpose is to convert unstructured text into a strict JSON object based on the schema provided below.

## Inputs
- Market language: **{{language}}**
- Raw data: {{rawdataStr}}

## Analysis Tasks & Logic
{{dynamic_tasks}}

${CORE_JSON_RULES}

## Strict Output Schema
You must strictly follow this JSON structure. Do not output markdown code blocks (no \`\`\`json). Output raw JSON only.

{
{{dynamic_schema}}
}

`;

/**
 * 翻译模板 (Analysis)
 */
export const TRANSLATE_PROMPT_TEMPLATE = ` 
You are a professional translator and localization expert in Europe. 
Translate the following JSON report from mainly **{{language}}** to Simplified Chinese.

## Input
- Report language: **{{language}}**
- JSON report: {{report}}

## Core Rules
1. **Recursively translate ALL string values** in the JSON, including nested objects and arrays.
2. **Keep JSON Keys in English** (Do NOT translate keys like "feature_points", "strengths").
3. **Preserve formatting**: If a value contains Markdown (like tables, lists), translate the content inside but keep the Markdown syntax structure.
4. **Context**: This is an Amazon e-commerce analysis report. Use professional Amazon e-commerce terminology (e.g., "Listing" -> "Listing", "Bullet Points" -> "五点描述").
5. Output ONLY valid JSON.

## Output
The translated JSON report.
`;

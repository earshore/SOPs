/**
 * Master Prompt - promptlab
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
 * 动态分析模块定义库 Master Prompt - promptlab
 * label_en/extraction_instruction -> 传给 LLM (英文)
 * label_cn/desc_cn -> UI 展示 (中文)
 */
export const ANALYSIS_MODULES = [
  // --- 1. Listing Base Analysis (文案基建) ---
  {


    id: "title_seo_roots",
    category: "listing",
    label_cn: "标题核心词根",
    desc_cn: "分析竞品标题，剔除品牌与修饰词，提取决定流量属性的绝对核心词根。",
    //label_en: "Title Core Root Extraction",
    label_en: "Title Core Root",
    desc_en: "Analyze titles to isolate absolute core keyword roots that determine traffic relevance, stripping brands/modifiers.",
    //extraction_instruction: "Analyze the provided titles. Strip out brand names, measurements, and generic adjectives. Isolate the top 3 'Root Nouns' that define what the product actually IS. Return as a frequency dictionary."
    extraction_instruction: "Strip brand names/measurements. Identify top 3 'Root Nouns' defining the product. Calculate frequency."
  },
  {
    id: "selling_proposition_deconstruction",
    category: "listing",
    label_cn: "卖点结构拆解",
    desc_cn: "将五点描述解构为'功能-场景-痛点'矩阵，识别竞品主打的差异化策略。",
    // label_en: "USP Deconstruction",
    label_en: "USP",
    desc_en: "Deconstruct bullet points into a 'Feature-Scenario-Pain' matrix to identify competitor differentiation strategies.",
    // extraction_instruction: "Analyze all the bullet points. For all ASINs, identify their Top 3 common Primary USP (Unique Selling Proposition). Extract the pattern: What Feature is common highlighted? What specific common Pain Point does it claim to solve?"
    extraction_instruction: "Identify top 3 common Selling Propositions across ASINs. Map the 'Feature' to the 'Pain Point' it solves."
  },

  // --- 2. Deep Review Intelligence (评论深挖 - 补偿缺失数据) ---
  {
    id: "neg_deal_breakers",
    category: "reviews",
    label_cn: "致命劝退点",
    desc_cn: "从1-3星评论中提炼导致退货的根本原因（非物流），用于规避产品缺陷。",
    // label_en: "Deal Breaker Analysis",
    label_en: "Deal Breakers",
    desc_en: "Extract root causes for returns/dissatisfaction from 1-3 star reviews (ignoring shipping) to identify fatal flaws.",
    // extraction_instruction: "Analyze negative reviews. Ignore 'shipping' or 'arrived broken'. Focus on 'Product Performance' and 'Design Flaws'. Output the Top 5 'Deal Breakers' that make customers regret the purchase."
    extraction_instruction: "Focus on Product Performance/Design Flaws (Ignore 'shipping' or 'arrived broken'). Top 5 reasons for regret."
  },
  {
    id: "pos_aha_moments",
    category: "reviews",
    label_cn: "惊喜顿悟时刻",
    desc_cn: "提取5星评论中用户表示'超出预期'的具体瞬间，这是高转化率文案的核心素材。",
    // label_en: "Positive Aha Moments",
    label_en: "Aha Moments",
    desc_en: "Extract specific moments from 5-star reviews where value exceeded expectations. These are gold for conversion copy.",
    // extraction_instruction: "Search for 5-star reviews containing phrases like 'I was surprised', 'Better than expected', or 'Finally'. Extract the specific 'Aha Moment' scenario. Keep the verbatim customer phrasing."
    extraction_instruction: "Extract specific scenarios from 5-star reviews (phrases like 'surprised', 'finally'). Keep verbatim."
  },
  {
    id: "buying_hesitations",
    category: "reviews",
    label_cn: "购买前犹豫点",
    desc_cn: "挖掘'购买前曾担心，但收到后放心了'的评论，用于替代Q&A填补信息盲区。",
    // label_en: "Pre-purchase Hesitations",
    label_en: "Hesitations",
    desc_en: "Identify 'I was worried about X, but...' comments to substitute missing Q&A data and address objections.",
    // extraction_instruction: "Scan reviews for hesitation patterns: 'I was skeptical', 'I hesitated because', 'I thought it might be'. Extract the specific concern they had BEFORE buying. This is crucial for objection handling."
    extraction_instruction: "Extract specific pre-purchase concerns (phrases like 'skeptical', 'hesitated')."
  },
  {
    id: "user_avatar_context",
    category: "reviews",
    label_cn: "画像与场景侧写",
    desc_cn: "基于评论用语推断买家身份（谁在买）和具体使用场景（在哪里用）。",
    // label_en: "User Context Profiling",
    label_en: "User Context",
    desc_en: "Infer the buyer's identity (Who) and specific usage environment (Where) based on review vocabulary.",
    // extraction_instruction: "Based on review narratives, infer the User Persona (e.g., 'First-time Mom', 'Professional Contractor') and the exact Use Case (e.g., 'Small apartment kitchen'). Create a list of 'Who' + 'Where'."
    extraction_instruction: "Infer 'Who' (Persona) and 'Where' (Use Case) from narratives."
  },

  // --- 3. Cross-Analysis (高维洞察 - 核心优化区) ---
  {
    id: "vocabulary_gap",
    category: "cross",
    label_cn: "词汇鸿沟分析",
    desc_cn: "对比'商家用词'与'买家黑话'，找出Listing未覆盖但买家高频使用的词汇。",
    // label_en: "Vocabulary Gap Analysis",
    label_en: "Vocabulary Gap",
    desc_en: "Contrast 'Seller Jargon' vs 'Buyer Slang'. Identify high-frequency buyer terms missing from the listing.",
    // extraction_instruction: "Compare the Listing Text keywords against the Review Text keywords. Identify 'Missed Opportunities': words that appear frequently in Reviews (top 20%) but represent <1% of the Listing text. These are your SEO goldmines."
    extraction_instruction: "Words frequent in Reviews (top 20%) but rare in Listing (<1%)."
  },
  {
    id: "promise_reality_check",
    category: "cross",
    label_cn: "承诺/现实断层",
    desc_cn: "识别Listing过度承诺但Review频繁打脸的功能点，防止虚假宣传。",
    label_en: "Promise-Reality Gap",
    desc_en: "Identify features heavily promoted in listings that are frequently cited as failures in reviews.",
    // extraction_instruction: "Identify the top 3 claims made in the Listing Bullet points. Cross-reference these with Negative Reviews. Flag any claim that has a high correlation with negative sentiment (e.g., Listing says 'Leak-proof', Reviews say 'Leaked immediately')."
    extraction_instruction: "Listing claims that correlate with negative sentiment."
  }
];


/**
* Master Prompt - promptlab
* 动态主模板 
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
* Master Prompt - Analysis
* 翻译模板 (保留) 
*/
export const TRANSLATE_PROMPT_TEMPLATE = ` 
You are a professional translator and localization expert. 
Translate the following JSON report from **{{language}}** to Simplified Chinese.

## Input
- Report language: **{{language}}**
- JSON report: {{report}}

## Core Rules
1. **Recursively translate ALL string values** in the JSON, including nested objects and arrays.
2. **Keep JSON Keys in English** (Do NOT translate keys like "feature_points", "strengths").
3. **Preserve formatting**: If a value contains Markdown (like tables, lists), translate the content inside but keep the Markdown syntax structure.
4. **Context**: This is an Amazon e-commerce analysis report. Use professional e-commerce terminology (e.g., "Listing" -> "Listing", "Bullet Points" -> "五点描述").
5. Output ONLY valid JSON.

## Output
The translated JSON report.
`;


/**
* keyword_tracker
* 翻译模板 (保留) 
*/

export const TRANSLATE_PROMPT_TEMPLATE2 = ` 
You are a professional translator and localization expert. 
Translate the following Amazon Listing from **any language** to Simplified Chinese.

## Core Rules
1. **Preserve formatting**: If a value contains Markdown (like tables, lists), translate the content inside but keep the Markdown syntax structure.
2. **Context**: This is an Amazon e-commerce analysis task. Use professional e-commerce terminology (e.g., "Listing" -> "Listing", "Bullet Points" -> "五点描述").
3. Output segment by segment.

## Output
Simplified Chinese language Amazon Listing.
`;


/**
* keyword_tracker
* 分析模板 (保留) 
*/

export const ANALYSIS_PROMPT_TEMPLATE = ` 
# ROLE
Act as a Senior Amazon Listing Auditor and E-commerce SEO Specialist with 10+ years of experience in the European market. you are known for being STRICT, CRITICAL, and DATA-DRIVEN.

# TASK
Audit and Score the provided Amazon Listing Copy. Your goal is to determine if it meets the standards of a high-converting, native-level listing.

# SCORING RUBRIC (Total 100 Points)
Evaluate strictly based on the following criteria. **Do not give high scores easily. A standard listing should score around 60-70. Only exceptional, native, optimization-perfect listings score 90+.**

1. **LANGUAGE QUALITY (15 pts):**
   - **0-5:** Machine translated, unnatural errors.
   - **6-10:** Understandable but dry/basic vocabulary.
   - **11-15:** Native idioms, persuasive, emotional connection.

2. **TONE & BRANDING (5 pts):**
   - **0-2:** Wrong tone (too casual or robotic).
   - **3-5:** Perfect match for the product category (Professional/Exciting).

3. **COSMO & PSYCHOLOGY (25 pts):**
   - **Context (0-10):** Does it describe the *usage scenario*? (e.g., "during a rainy commute" vs "waterproof").
   - **Match (0-15):** Does it solve a specific pain point?

4. **AI/RUFUS READINESS (20 pts):**
   - **Structure (0-10):** Is it easy for AI to extract answers? (Facts first, fluff later).
   - **Conciseness (0-10):** High information density, low noise.

5. **FORMATTING (4 pts):**
   - Use of emojis, proper capitalization, and readability.

6. **RISK CHECK (1 pt):**
   - **0:** Contains prohibited words. **1:** Clean.

7. **SEO & KEYWORDS (30 pts):**
   - **0-10:** Main keywords missing or stuffed.
   - **11-20:** Good coverage but slightly mechanical.
   - **21-30:** Seamless, natural integration of high-value keywords.

# EXECUTION STEPS
1. **Validation:** If the input is NOT a valid Amazon listing (e.g. just random words, or too short), STOP and return a score of 0 with a warning.
2. **Analysis:** Review the copy against the rubric.
3. **Drafting:** Generate specific suggestions.
4. **Final Output:** Generate the report in Simplified Chinese.

# OUTPUT FORMAT (Simplified Chinese)
Please output the result in the following structured format:

## 1. 评分详情 (Scoring Details)
| 维度 (Dimension) | 得分 (Score) | 评价与不足 (Analysis & Gaps) |
| :--- | :--- | :--- |
| Language | /15 | ... |
| Tone | /5 | ... |
| COSMO (Context/Match) | /25 | ... |
| Rufus/AI Opt | /20 | ... |
| Formatting | /4 | ... |
| Risk Check | /1 | ... |
| SEO Coverage | /30 | ... |
| **总分 (Total)** | **/100** | |

## 2. 优化建议 (Optimization Suggestions)
*   **针对性修改建议:** [Provide specific rewrite examples for the weakest sections]
*   **未覆盖关键词策略:** [How to integrate the **Unmatched Keywords**]

**Action:** Begin the audit now. Be strict.
`;

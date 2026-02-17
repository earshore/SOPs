/**
 * AI 分析提示词模板系统
 * 基于 PromptLab 动态模板架构
 */

import { Product } from '../config/sampleData';

// 核心 JSON 规则
export const CORE_JSON_RULES = `
## Critical JSON Rules
1. Output ONLY valid JSON - no markdown code blocks, no explanations
2. All string values must be properly escaped
3. Arrays cannot have trailing commas
4. Use null for missing/unknown values, never undefined
5. Ensure all brackets and braces are properly closed
`;

// 分析任务定义
export interface AnalysisTaskDefinition {
  id: string;
  name: string;
  taskPrompt: string;
  schemaTemplate: string;
}

// 八大分析任务的提示词定义
export const ANALYSIS_TASK_DEFINITIONS: Record<string, AnalysisTaskDefinition> = {
  'title-keywords': {
    id: 'title-keywords',
    name: '标题核心词根',
    taskPrompt: `
### Task: Title Core Keywords Extraction (标题核心词根)
Analyze the product title to extract absolute core keywords that determine traffic attributes.

Instructions:
1. Remove brand names (e.g., "Ycz", "YCZ") from analysis
2. Remove pure modifier words (e.g., "premium", "best", "perfect")
3. Identify PRIMARY category keywords (what the product IS)
4. Identify SECONDARY feature keywords (key differentiators)
5. Identify SCENE keywords (where/when used)
6. Identify TARGET AUDIENCE keywords (who it's for)
7. Calculate keyword weight based on position and search relevance

Input Title: {{productTitle}}
`,
    schemaTemplate: `
"title-keywords": {
  "primary_keywords": [{"keyword": "string", "weight": "high|medium|low", "search_volume_estimate": "string"}],
  "secondary_keywords": [{"keyword": "string", "type": "feature|material|size", "importance": "string"}],
  "scene_keywords": [{"keyword": "string", "usage_context": "string"}],
  "audience_keywords": [{"keyword": "string", "target_group": "string"}],
  "removed_modifiers": ["string"],
  "removed_brand_terms": ["string"],
  "optimization_suggestions": ["string"]
}
`
  },

  'selling-points': {
    id: 'selling-points',
    name: '卖点结构拆解',
    taskPrompt: `
### Task: Selling Points Structure Analysis (卖点结构拆解)
Deconstruct the 5-bullet description into a "Function-Scene-Pain Point" matrix.

Instructions:
1. Parse each bullet point separately
2. Identify FUNCTION claims (what it does)
3. Identify SCENE positioning (where/when to use)
4. Identify PAIN POINTS addressed (problems solved)
5. Detect differentiation strategy
6. Note any exaggerated or unverifiable claims

Input Bullet Points:
{{featureBullets}}
`,
    schemaTemplate: `
"selling-points": {
  "bullet_analysis": [
    {
      "bullet_index": 1,
      "original_text_summary": "string",
      "functions": ["string"],
      "scenes": ["string"],
      "pain_points_addressed": ["string"],
      "differentiation_angle": "string",
      "credibility_score": "high|medium|low"
    }
  ],
  "overall_strategy": {
    "primary_differentiation": "string",
    "target_positioning": "string",
    "emotional_hooks": ["string"],
    "missing_elements": ["string"]
  },
  "function_scene_matrix": {
    "functions": ["string"],
    "scenes": ["string"],
    "pain_points": ["string"]
  }
}
`
  },

  'fatal-flaws': {
    id: 'fatal-flaws',
    name: '致命劝退点',
    taskPrompt: `
### Task: Fatal Flaws Extraction (致命劝退点)
Extract root causes of returns from 1-3 star reviews (exclude logistics issues).

Instructions:
1. Focus ONLY on reviews with star_rating 1, 2, or 3
2. Ignore shipping/delivery complaints
3. Identify PRODUCT DEFECTS mentioned
4. Identify EXPECTATION GAPS (what they expected vs got)
5. Identify QUALITY ISSUES
6. Categorize severity: critical (causes return), major (causes complaint), minor
7. Extract exact user phrases that indicate dissatisfaction

Input Reviews (filtered 1-3 stars):
{{lowStarReviews}}
`,
    schemaTemplate: `
"fatal-flaws": {
  "critical_issues": [
    {
      "issue": "string",
      "frequency": "number of mentions",
      "user_quotes": ["exact quotes"],
      "severity": "critical|major|minor",
      "category": "quality|performance|value|authenticity|other"
    }
  ],
  "return_triggers": ["string"],
  "expectation_gaps": [
    {
      "expected": "string",
      "reality": "string",
      "disappointment_level": "high|medium|low"
    }
  ],
  "actionable_fixes": ["string"],
  "risk_assessment": {
    "overall_risk_level": "high|medium|low",
    "primary_concern": "string"
  }
}
`
  },

  'wow-moments': {
    id: 'wow-moments',
    name: '惊喜顿悟时刻',
    taskPrompt: `
### Task: Wow Moments Extraction (惊喜顿悟时刻)
Extract specific moments where users expressed "exceeded expectations" from 5-star reviews.

Instructions:
1. Focus ONLY on reviews with star_rating 5
2. Look for expressions of surprise, delight, "better than expected"
3. Identify SPECIFIC moments (not general praise)
4. Extract exact phrases that convey emotion
5. Categorize the type of wow moment
6. Note if these could be used in marketing copy

Input Reviews (5 stars only):
{{highStarReviews}}
`,
    schemaTemplate: `
"wow-moments": {
  "moments": [
    {
      "moment_description": "string",
      "user_quote": "exact quote",
      "emotion_type": "surprise|delight|relief|amazement",
      "aspect": "quality|smell|packaging|value|performance",
      "marketing_potential": "high|medium|low"
    }
  ],
  "emotional_triggers": ["string"],
  "high_conversion_phrases": ["string"],
  "unexpected_benefits": ["string"],
  "copywriting_angles": ["string"]
}
`
  },

  'hesitation-points': {
    id: 'hesitation-points',
    name: '购买前犹豫点',
    taskPrompt: `
### Task: Pre-Purchase Hesitation Points (购买前犹豫点)
Extract "was worried before buying, but relieved after receiving" patterns.

Instructions:
1. Look for phrases indicating pre-purchase doubt
2. Identify what specifically they were worried about
3. Find the resolution/relief expressed
4. These are perfect for Q&A section optimization
5. Note the original concern and how product addressed it

Input Reviews:
{{allReviews}}
`,
    schemaTemplate: `
"hesitation-points": {
  "hesitations": [
    {
      "pre_purchase_worry": "string",
      "post_purchase_resolution": "string",
      "user_evidence": "quote or paraphrase",
      "qa_recommendation": "string"
    }
  ],
  "common_doubts": ["string"],
  "trust_builders": ["string"],
  "qa_optimization_items": [
    {
      "question": "string",
      "suggested_answer": "string"
    }
  ]
}
`
  },

  'buyer-profile': {
    id: 'buyer-profile',
    name: '画像与场景侧写',
    taskPrompt: `
### Task: Buyer Profile & Scene Profiling (画像与场景侧写)
Infer buyer identity and specific usage scenarios from review language.

Instructions:
1. Analyze language style, vocabulary choices
2. Infer WHO is buying (demographics, interests)
3. Infer WHERE/WHEN they use the product
4. Note gift-giving mentions
5. Identify usage occasions mentioned
6. Consider the origin countries of reviewers

Input Reviews:
{{allReviews}}

Reviewer Countries: {{reviewerCountries}}
`,
    schemaTemplate: `
"buyer-profile": {
  "demographics": {
    "likely_gender": "male|female|mixed",
    "age_range_estimate": "string",
    "lifestyle_indicators": ["string"]
  },
  "buyer_types": [
    {
      "type": "string",
      "percentage_estimate": "string",
      "evidence": "string"
    }
  ],
  "usage_scenes": [
    {
      "scene": "string",
      "frequency": "daily|weekly|occasional|special",
      "context": "string"
    }
  ],
  "purchase_motivations": ["string"],
  "geographic_insights": {
    "primary_markets": ["string"],
    "cultural_considerations": ["string"]
  }
}
`
  },

  'vocab-gap': {
    id: 'vocab-gap',
    name: '词汇鸿沟分析',
    taskPrompt: `
### Task: Vocabulary Gap Analysis (词汇鸿沟分析)
Compare "seller vocabulary" vs "buyer slang" to find uncovered high-frequency buyer terms.

Instructions:
1. Extract key terms from Listing (title + bullets)
2. Extract terms buyers actually use in reviews
3. Find terms buyers use that Listing doesn't cover
4. Identify seller jargon vs buyer natural language
5. Suggest terms to add to Listing

Listing Content:
Title: {{productTitle}}
Bullets: {{featureBullets}}

Buyer Reviews:
{{allReviews}}
`,
    schemaTemplate: `
"vocab-gap": {
  "seller_terms": ["string"],
  "buyer_terms": ["string"],
  "uncovered_buyer_terms": [
    {
      "term": "string",
      "frequency": "high|medium|low",
      "context": "string",
      "recommendation": "add to title|add to bullets|add to description"
    }
  ],
  "term_translations": [
    {
      "seller_says": "string",
      "buyer_says": "string"
    }
  ],
  "listing_optimization": {
    "title_additions": ["string"],
    "bullet_additions": ["string"],
    "keyword_opportunities": ["string"]
  }
}
`
  },

  'promise-reality': {
    id: 'promise-reality',
    name: '承诺/现实断层',
    taskPrompt: `
### Task: Promise vs Reality Gap Analysis (承诺/现实断层)
Identify Listing over-promises that Reviews frequently contradict.

Instructions:
1. Extract claims/promises from Listing bullets
2. Check if reviews contradict these claims
3. Rate the severity of each gap
4. Flag potential false advertising risks
5. Suggest claim modifications

Listing Claims:
{{featureBullets}}

Customer Reviews:
{{allReviews}}
`,
    schemaTemplate: `
"promise-reality": {
  "gaps": [
    {
      "listing_claim": "string",
      "review_reality": "string",
      "contradiction_severity": "severe|moderate|minor",
      "evidence_quotes": ["string"],
      "false_advertising_risk": "high|medium|low",
      "recommended_action": "string"
    }
  ],
  "verified_claims": ["claims that reviews support"],
  "unverified_claims": ["claims with no review evidence"],
  "overall_credibility": {
    "score": "1-10",
    "assessment": "string"
  },
  "listing_revision_suggestions": ["string"]
}
`
  }
};

/**
 * 生成动态分析提示词
 */
export function generateAnalysisPrompt(
  taskId: string,
  product: Product,
  language: string = 'en'
): string {
  const taskDef = ANALYSIS_TASK_DEFINITIONS[taskId];
  if (!taskDef) {
    throw new Error(`Unknown task ID: ${taskId}`);
  }

  // 准备数据替换
  const lowStarReviews = product.customer_reviews
    .filter(r => r.star_rating <= 3)
    .map(r => `[${r.star_rating}★] ${r.headline}: ${r.body}`)
    .join('\n');

  const highStarReviews = product.customer_reviews
    .filter(r => r.star_rating === 5)
    .map(r => `[${r.star_rating}★] ${r.headline}: ${r.body}`)
    .join('\n');

  const allReviews = product.customer_reviews
    .map(r => `[${r.star_rating}★ - ${r.origin_country}] ${r.headline}: ${r.body}`)
    .join('\n');

  const reviewerCountries = [...new Set(product.customer_reviews.map(r => r.origin_country))].join(', ');

  const featureBullets = product.feature_bullets
    .map((b, i) => `${i + 1}. ${b}`)
    .join('\n');

  // 替换模板变量
  let taskPrompt = taskDef.taskPrompt
    .replace('{{productTitle}}', product.productTitle)
    .replace('{{featureBullets}}', featureBullets)
    .replace('{{lowStarReviews}}', lowStarReviews || 'No 1-3 star reviews available')
    .replace('{{highStarReviews}}', highStarReviews || 'No 5 star reviews available')
    .replace('{{allReviews}}', allReviews)
    .replace('{{reviewerCountries}}', reviewerCountries);

  // 构建完整提示词
  const fullPrompt = `
You are a Data Extraction Engine specialized in E-commerce Analysis.
Your sole purpose is to convert unstructured text into a strict JSON object based on the schema provided below.

## Inputs
- Market language: **${language}**
- Product ASIN: ${product.asin}

${taskPrompt}

${CORE_JSON_RULES}

## Strict Output Schema
You must strictly follow this JSON structure. Do not output markdown code blocks (no \`\`\`json). Output raw JSON only.

{
${taskDef.schemaTemplate}
}
`;

  return fullPrompt;
}

/**
 * 生成多任务批量分析提示词
 */
export function generateBatchAnalysisPrompt(
  taskIds: string[],
  product: Product,
  language: string = 'en'
): string {
  const tasks = taskIds
    .map(id => ANALYSIS_TASK_DEFINITIONS[id])
    .filter(Boolean);

  if (tasks.length === 0) {
    throw new Error('No valid tasks provided');
  }

  // 准备数据
  const lowStarReviews = product.customer_reviews
    .filter(r => r.star_rating <= 3)
    .map(r => `[${r.star_rating}★] ${r.headline}: ${r.body}`)
    .join('\n');

  const highStarReviews = product.customer_reviews
    .filter(r => r.star_rating === 5)
    .map(r => `[${r.star_rating}★] ${r.headline}: ${r.body}`)
    .join('\n');

  const allReviews = product.customer_reviews
    .map(r => `[${r.star_rating}★ - ${r.origin_country}] ${r.headline}: ${r.body}`)
    .join('\n');

  const reviewerCountries = [...new Set(product.customer_reviews.map(r => r.origin_country))].join(', ');

  const featureBullets = product.feature_bullets
    .map((b, i) => `${i + 1}. ${b}`)
    .join('\n');

  // 构建动态任务
  const dynamicTasks = tasks.map(task => {
    if (!task) return '';
    let prompt = task.taskPrompt
      .replace('{{productTitle}}', product.productTitle)
      .replace('{{featureBullets}}', featureBullets)
      .replace('{{lowStarReviews}}', lowStarReviews || 'No 1-3 star reviews available')
      .replace('{{highStarReviews}}', highStarReviews || 'No 5 star reviews available')
      .replace('{{allReviews}}', allReviews)
      .replace('{{reviewerCountries}}', reviewerCountries);
    return prompt;
  }).join('\n\n---\n\n');

  // 构建动态 Schema
  const dynamicSchema = tasks.map(task => task?.schemaTemplate || '').join(',\n');

  // 完整模板
  const fullPrompt = `
You are a Data Extraction Engine specialized in E-commerce Analysis.
Your sole purpose is to convert unstructured text into a strict JSON object based on the schema provided below.

## Inputs
- Market language: **${language}**
- Product ASIN: ${product.asin}
- Raw data:
  - Title: ${product.productTitle}
  - Bullets: ${featureBullets}
  - Reviews: ${allReviews}

## Analysis Tasks & Logic
${dynamicTasks}

${CORE_JSON_RULES}

## Strict Output Schema
You must strictly follow this JSON structure. Do not output markdown code blocks (no \`\`\`json). Output raw JSON only.

{
${dynamicSchema}
}
`;

  return fullPrompt;
}

// 导出便捷方法
export function getTaskDefinition(taskId: string): AnalysisTaskDefinition | undefined {
  return ANALYSIS_TASK_DEFINITIONS[taskId];
}

export function getAllTaskIds(): string[] {
  return Object.keys(ANALYSIS_TASK_DEFINITIONS);
}

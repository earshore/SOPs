/**
 * AI 分析 Prompt 模板
 * 为每个分析目标定义专门的 Prompt
 */

/**
 * 标题核心词根分析 Prompt
 */
export const TITLE_KEYWORDS_PROMPT = `
请分析以下亚马逊产品数据,提取标题中的核心关键词并分类。

产品数据:
{{PRODUCT_DATA}}

请按照以下 JSON 格式返回分析结果:

{
  "primary_keywords": [
    { "keyword": "关键词", "weight": "high|medium|low", "search_volume_estimate": "搜索量估计" }
  ],
  "secondary_keywords": [
    { "keyword": "关键词", "type": "feature|size|scent", "importance": "重要性说明" }
  ],
  "scene_keywords": [
    { "keyword": "场景词", "usage_context": "使用场景" }
  ],
  "audience_keywords": [
    { "keyword": "人群词", "target_group": "目标人群" }
  ],
  "removed_modifiers": ["修饰词1", "修饰词2"],
  "removed_brand_terms": ["品牌词1", "品牌词2"],
  "optimization_suggestions": ["建议1", "建议2"]
}

分析要点:
1. 识别核心类目词(如 Perfume, Cologne)
2. 提取功能特性词(如 Long Lasting)
3. 识别场景和人群定位词
4. 剔除品牌词和无意义修饰词
5. 提供标题优化建议
`;

/**
 * 卖点结构拆解 Prompt
 */
export const SELLING_POINTS_PROMPT = `
请分析以下亚马逊产品的卖点结构(Bullet Points)。

产品数据:
{{PRODUCT_DATA}}

请按照以下 JSON 格式返回分析结果:

{
  "bullet_analysis": [
    {
      "bullet_index": 1,
      "original_text_summary": "要点摘要",
      "functions": ["功能1", "功能2"],
      "scenes": ["场景1", "场景2"],
      "pain_points_addressed": ["痛点1", "痛点2"],
      "differentiation_angle": "差异化角度",
      "credibility_score": "high|medium|low"
    }
  ],
  "overall_strategy": {
    "primary_differentiation": "核心差异化",
    "target_positioning": "目标定位",
    "emotional_hooks": ["情感钩子1", "情感钩子2"],
    "missing_elements": ["缺失要素1", "缺失要素2"]
  },
  "function_scene_matrix": {
    "functions": ["功能列表"],
    "scenes": ["场景列表"],
    "pain_points": ["痛点列表"]
  }
}

分析要点:
1. 逐条分析每个 Bullet Point
2. 提取功能、场景、痛点
3. 评估可信度
4. 总结整体策略
5. 识别缺失要素
`;

/**
 * 致命劝退点分析 Prompt
 */
export const FATAL_FLAWS_PROMPT = `
请分析以下产品评论,识别致命的劝退点和严重问题。

产品数据:
{{PRODUCT_DATA}}

请按照以下 JSON 格式返回分析结果:

{
  "critical_issues": [
    {
      "issue": "问题描述",
      "frequency": "出现频率",
      "user_quotes": ["用户原话1", "用户原话2"],
      "severity": "critical|major|minor",
      "category": "问题类别"
    }
  ],
  "return_triggers": ["退货触发原因1", "退货触发原因2"],
  "expectation_gaps": [
    {
      "expected": "期望",
      "reality": "现实",
      "disappointment_level": "high|medium|low"
    }
  ],
  "actionable_fixes": ["改进建议1", "改进建议2"],
  "risk_assessment": {
    "overall_risk_level": "high|medium|low",
    "primary_concern": "主要关注点"
  }
}

分析要点:
1. 重点关注 1-2 星差评
2. 识别产品质量、性能、真实性问题
3. 提取用户原话作为证据
4. 评估问题严重程度
5. 提供可行的改进建议
`;

/**
 * 惊喜顿悟时刻 Prompt
 */
export const WOW_MOMENTS_PROMPT = `
请分析以下产品评论,识别用户的惊喜时刻和超预期体验。

产品数据:
{{PRODUCT_DATA}}

请按照以下 JSON 格式返回分析结果:

{
  "moments": [
    {
      "moment_description": "惊喜时刻描述",
      "user_quote": "用户原话",
      "emotion_type": "情感类型",
      "aspect": "相关方面",
      "marketing_potential": "high|medium|low"
    }
  ],
  "emotional_triggers": ["情感触发词1", "情感触发词2"],
  "high_conversion_phrases": ["高转化文案1", "高转化文案2"],
  "unexpected_benefits": ["超预期亮点1", "超预期亮点2"],
  "copywriting_angles": ["文案角度1", "文案角度2"]
}

分析要点:
1. 重点关注 4-5 星好评
2. 识别超预期的体验
3. 提取情感化的表达
4. 发现可用于营销的素材
5. 总结文案创意角度
`;

/**
 * 购买前犹豫点 Prompt
 */
export const HESITATION_POINTS_PROMPT = `
请分析以下产品评论,识别用户购买前的犹豫点及购买后的解决方案。

产品数据:
{{PRODUCT_DATA}}

请按照以下 JSON 格式返回分析结果:

{
  "hesitations": [
    {
      "pre_purchase_worry": "购前担忧",
      "post_purchase_resolution": "购后解决",
      "user_evidence": "用户证据",
      "qa_recommendation": "Q&A建议"
    }
  ],
  "common_doubts": ["常见疑虑1", "常见疑虑2"],
  "trust_builders": ["信任要素1", "信任要素2"],
  "qa_optimization_items": [
    {
      "question": "问题",
      "suggested_answer": "建议回答"
    }
  ]
}

分析要点:
1. 识别用户购买前的担忧
2. 找到评论中的解决证据
3. 提取信任建立要素
4. 生成 Q&A 优化建议
`;

/**
 * 买家画像与场景侧写 Prompt
 */
export const BUYER_PROFILE_PROMPT = `
请分析以下产品评论,构建买家画像和使用场景。

产品数据:
{{PRODUCT_DATA}}

请按照以下 JSON 格式返回分析结果:

{
  "demographics": {
    "likely_gender": "male|female|mixed",
    "age_range_estimate": "年龄范围",
    "lifestyle_indicators": ["生活方式特征1", "生活方式特征2"]
  },
  "buyer_types": [
    {
      "type": "买家类型",
      "percentage_estimate": "占比估计",
      "evidence": "证据"
    }
  ],
  "usage_scenes": [
    {
      "scene": "使用场景",
      "frequency": "频率",
      "context": "场景描述"
    }
  ],
  "purchase_motivations": ["购买动机1", "购买动机2"],
  "geographic_insights": {
    "primary_markets": ["主要市场1", "主要市场2"],
    "cultural_considerations": ["文化考量1", "文化考量2"]
  }
}

分析要点:
1. 从评论推断用户特征
2. 识别不同的买家类型
3. 总结使用场景
4. 分析购买动机
5. 识别地域和文化特点
`;

/**
 * 词汇鸿沟分析 Prompt
 */
export const VOCAB_GAP_PROMPT = `
请对比产品 Listing 和用户评论的用词差异,识别词汇鸿沟。

产品数据:
{{PRODUCT_DATA}}

请按照以下 JSON 格式返回分析结果:

{
  "seller_terms": ["商家高频词1", "商家高频词2"],
  "buyer_terms": ["买家高频词1", "买家高频词2"],
  "uncovered_buyer_terms": [
    {
      "term": "未覆盖的买家词",
      "frequency": "high|medium|low",
      "context": "使用场景",
      "recommendation": "建议"
    }
  ],
  "term_translations": [
    {
      "seller_says": "商家说法",
      "buyer_says": "买家说法"
    }
  ],
  "listing_optimization": {
    "title_additions": ["标题补充词1", "标题补充词2"],
    "bullet_additions": ["要点补充词1", "要点补充词2"],
    "keyword_opportunities": ["关键词机会1", "关键词机会2"]
  }
}

分析要点:
1. 提取 Listing 的高频词
2. 提取评论的高频词
3. 识别未被覆盖的买家词汇
4. 对比商家和买家的表达差异
5. 提供 Listing 优化建议
`;

/**
 * 承诺/现实断层分析 Prompt
 */
export const PROMISE_REALITY_PROMPT = `
请对比产品 Listing 的承诺和用户评论的实际反馈,识别断层。

产品数据:
{{PRODUCT_DATA}}

请按照以下 JSON 格式返回分析结果:

{
  "gaps": [
    {
      "listing_claim": "Listing 宣称",
      "review_reality": "评论现实",
      "contradiction_severity": "severe|moderate|minor",
      "evidence_quotes": ["证据引用1", "证据引用2"],
      "false_advertising_risk": "high|medium|low",
      "recommended_action": "建议行动"
    }
  ],
  "verified_claims": ["已验证的承诺1", "已验证的承诺2"],
  "unverified_claims": ["待验证的承诺1", "待验证的承诺2"],
  "overall_credibility": {
    "score": "评分",
    "assessment": "评估"
  },
  "listing_revision_suggestions": ["修订建议1", "修订建议2"]
}

分析要点:
1. 对比 Listing 承诺和评论反馈
2. 识别严重的矛盾点
3. 评估虚假宣传风险
4. 验证哪些承诺得到证实
5. 提供 Listing 修订建议
`;

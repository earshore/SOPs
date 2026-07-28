/**
 * 真实的 AI 分析报告 JSON 数据
 * 模拟 AI 返回的结构化分析结果
 */

export interface TitleKeywordsReport {
  primary_keywords: {
    keyword: string;
    weight: 'high' | 'medium' | 'low';
    search_volume_estimate: string;
  }[];
  secondary_keywords: { keyword: string; type: string; importance: string }[];
  scene_keywords: { keyword: string; usage_context: string }[];
  audience_keywords: { keyword: string; target_group: string }[];
  removed_modifiers: string[];
  removed_brand_terms: string[];
  optimization_suggestions: string[];
}

export interface SellingPointsReport {
  bullet_analysis: {
    bullet_index: number;
    original_text_summary: string;
    functions: string[];
    scenes: string[];
    pain_points_addressed: string[];
    differentiation_angle: string;
    credibility_score: 'high' | 'medium' | 'low';
  }[];
  overall_strategy: {
    primary_differentiation: string;
    target_positioning: string;
    emotional_hooks: string[];
    missing_elements: string[];
  };
  function_scene_matrix: {
    functions: string[];
    scenes: string[];
    pain_points: string[];
  };
}

export interface FatalFlawsReport {
  critical_issues: {
    issue: string;
    frequency: string;
    user_quotes: string[];
    severity: 'critical' | 'major' | 'minor';
    category: string;
  }[];
  return_triggers: string[];
  expectation_gaps: {
    expected: string;
    reality: string;
    disappointment_level: 'high' | 'medium' | 'low';
  }[];
  actionable_fixes: string[];
  risk_assessment: {
    overall_risk_level: 'high' | 'medium' | 'low';
    primary_concern: string;
  };
}

export interface WowMomentsReport {
  moments: {
    moment_description: string;
    user_quote: string;
    emotion_type: string;
    aspect: string;
    marketing_potential: 'high' | 'medium' | 'low';
  }[];
  emotional_triggers: string[];
  high_conversion_phrases: string[];
  unexpected_benefits: string[];
  copywriting_angles: string[];
}

export interface HesitationPointsReport {
  hesitations: {
    pre_purchase_worry: string;
    post_purchase_resolution: string;
    user_evidence: string;
    qa_recommendation: string;
  }[];
  common_doubts: string[];
  trust_builders: string[];
  qa_optimization_items: {
    question: string;
    suggested_answer: string;
  }[];
}

export interface BuyerProfileReport {
  demographics: {
    likely_gender: string;
    age_range_estimate: string;
    lifestyle_indicators: string[];
  };
  buyer_types: {
    type: string;
    percentage_estimate: string;
    evidence: string;
  }[];
  usage_scenes: {
    scene: string;
    frequency: string;
    context: string;
  }[];
  purchase_motivations: string[];
  geographic_insights: {
    primary_markets: string[];
    cultural_considerations: string[];
  };
}

export interface VocabGapReport {
  seller_terms: string[];
  buyer_terms: string[];
  uncovered_buyer_terms: {
    term: string;
    frequency: 'high' | 'medium' | 'low';
    context: string;
    recommendation: string;
  }[];
  term_translations: {
    seller_says: string;
    buyer_says: string;
  }[];
  listing_optimization: {
    title_additions: string[];
    bullet_additions: string[];
    keyword_opportunities: string[];
  };
}

export interface PromiseRealityReport {
  gaps: {
    listing_claim: string;
    review_reality: string;
    contradiction_severity: 'severe' | 'moderate' | 'minor';
    evidence_quotes: string[];
    false_advertising_risk: 'high' | 'medium' | 'low';
    recommended_action: string;
  }[];
  verified_claims: string[];
  unverified_claims: string[];
  overall_credibility: {
    score: string;
    assessment: string;
  };
  listing_revision_suggestions: string[];
}

/**
 * 分析报告元数据接口
 */
export interface AnalysisReportMetadata {
  confidence: Record<string, number>; // 各报告类型的置信度分数
  overallConfidence: number; // 总体置信度
  analyzedAt: string; // 分析时间
  targetIds: string[]; // 分析的目标ID列表
  language: string; // 分析语言
  /** LLM model id used for this analysis run (for journey summaries). */
  model?: string;
  /** Per-run success/failure counts for partial-complete UX. */
  runSummary?: {
    successCount: number;
    failedCount: number;
    failedTargetIds: string[];
  };
  reviewSampling?: {
    totalReviews: number;
    lowStar: {
      totalReviews: number;
      includedReviews: number;
      omittedReviews: number;
      bodyCharLimit: number;
    };
    highStar: {
      totalReviews: number;
      includedReviews: number;
      omittedReviews: number;
      bodyCharLimit: number;
    };
    general: {
      totalReviews: number;
      includedReviews: number;
      omittedReviews: number;
      bodyCharLimit: number;
      strategy: 'representative';
    };
  }; // Review 采样透明度
  sourceHistoryId?: string | number | null; // 源采集历史记录 ID
  sourceDataFingerprint?: string; // 源采集数据指纹
  sourceAsins?: string[]; // 分析时选中的 ASIN
}

/**
 * 完整分析报告接口
 * 包含分析结果数据和置信度元数据
 */
export interface FullAnalysisReport {
  'title-keywords'?: TitleKeywordsReport;
  'selling-points'?: SellingPointsReport;
  'fatal-flaws'?: FatalFlawsReport;
  'wow-moments'?: WowMomentsReport;
  'hesitation-points'?: HesitationPointsReport;
  'buyer-profile'?: BuyerProfileReport;
  'vocab-gap'?: VocabGapReport;
  'promise-reality'?: PromiseRealityReport;
  _metadata?: AnalysisReportMetadata; // 置信度和分析元数据
}

/**
 * 基于真实产品数据的模拟 AI 分析报告
 * ASIN: B0DNMZ2MLG - Ycz CLUB GENT'S AROMA Perfume
 */
export const SAMPLE_ANALYSIS_REPORT: FullAnalysisReport = {
  'title-keywords': {
    primary_keywords: [
      { keyword: 'Perfume Men', weight: 'high', search_volume_estimate: '极高 - 核心类目词' },
      { keyword: 'Cologne for Men', weight: 'high', search_volume_estimate: '极高 - 美式叫法' },
      { keyword: 'Fragrance', weight: 'medium', search_volume_estimate: '高 - 通用词' },
    ],
    secondary_keywords: [
      { keyword: 'Long Lasting', type: 'feature', importance: '核心卖点词，直击持久需求' },
      { keyword: '50ml/1.7oz', type: 'size', importance: '规格词，便携定位' },
      { keyword: 'Aromatic Woody', type: 'scent', importance: '香调描述，吸引特定偏好' },
      { keyword: 'Mint', type: 'scent', importance: '香调元素' },
      { keyword: 'Lemon', type: 'scent', importance: '香调元素，清新感' },
    ],
    scene_keywords: [
      { keyword: 'Nightclub Essential', usage_context: '夜店场景，差异化定位' },
      { keyword: 'Daily Elegance', usage_context: '日常通勤，扩大使用场景' },
      { keyword: 'Ideal Occasions', usage_context: '泛场景覆盖' },
    ],
    audience_keywords: [
      { keyword: 'Men', target_group: '男性主体用户' },
      { keyword: "Gent's", target_group: '绅士定位，暗示品味' },
    ],
    removed_modifiers: ['Essential', 'Ideal', 'Elegance'],
    removed_brand_terms: ['Ycz', 'YCZ', "CLUB GENT'S AROMA"],
    optimization_suggestions: [
      "建议增加 'Eau de Parfum' 或 'EDT' 规范香水类型词",
      "'Nightclub' 略小众，可考虑增加 'Date Night' 或 'Evening'",
      "可补充 'Gift for Men' 覆盖礼品搜索流量",
      "香调词可前置，如 'Woody Mint Cologne'",
    ],
  },

  'selling-points': {
    bullet_analysis: [
      {
        bullet_index: 1,
        original_text_summary: '50ml便携装，旅行友好，随时补香',
        functions: ['便携容量', '旅行友好'],
        scenes: ['旅行', '出差', '日常携带'],
        pain_points_addressed: ['大瓶不便携带', '出门忘带香水'],
        differentiation_angle: '便携性强调',
        credibility_score: 'high',
      },
      {
        bullet_index: 2,
        original_text_summary: '6小时+持久留香，芳香木质调，彰显自信',
        functions: ['持久留香6小时+', '木质芳香调'],
        scenes: ['全天场合', '重要活动', '社交场景'],
        pain_points_addressed: ['香味消散快', '需要频繁补喷'],
        differentiation_angle: '持久时间承诺 + 情感价值(自信)',
        credibility_score: 'low',
      },
      {
        bullet_index: 3,
        original_text_summary: '黑色包装+蓝色玻璃瓶，神秘优雅，送礼佳选',
        functions: ['精美包装设计'],
        scenes: ['送礼场景', '节日礼物', '生日礼物'],
        pain_points_addressed: ['送礼不知选什么', '包装不够档次'],
        differentiation_angle: '礼品定位，视觉吸引力',
        credibility_score: 'high',
      },
      {
        bullet_index: 4,
        original_text_summary: '温和配方，无残留无污渍，肌肤安全',
        functions: ['温和无刺激', '不留残渍'],
        scenes: ['敏感肌使用', '喷洒衣物'],
        pain_points_addressed: ['香水刺激皮肤', '香水留污渍'],
        differentiation_angle: '安全性承诺',
        credibility_score: 'medium',
      },
      {
        bullet_index: 5,
        original_text_summary: 'YCZ品牌信誉，品质保证，售后服务',
        functions: ['品牌背书', '售后保障'],
        scenes: ['购买决策阶段'],
        pain_points_addressed: ['担心质量', '售后无门'],
        differentiation_angle: '信任建立',
        credibility_score: 'low',
      },
    ],
    overall_strategy: {
      primary_differentiation: '夜店/Club场景定位 + 6小时持久留香承诺',
      target_positioning: '追求社交魅力的年轻男性，礼品购买者',
      emotional_hooks: ['散发自信', '令人难忘', '吸引注意力', '神秘优雅'],
      missing_elements: [
        '缺少具体香调层次描述(前中后调)',
        '缺少与知名香水的气味对标',
        '缺少实际用户好评引用',
        '持久时间承诺与评论反馈有冲突',
      ],
    },
    function_scene_matrix: {
      functions: ['50ml便携', '6小时持久', '木质芳香调', '温和配方', '精美包装'],
      scenes: ['夜店Club', '日常通勤', '旅行出差', '送礼场景', '约会场合'],
      pain_points: ['香味不持久', '不便携带', '送礼选择难', '皮肤刺激', '包装不档次'],
    },
  },

  'fatal-flaws': {
    critical_issues: [
      {
        issue: '产品真实性遭严重质疑',
        frequency: '1次提及，但措辞极端',
        user_quotes: ["Do not get this product. It's a scam.", "It's not perfume"],
        severity: 'critical',
        category: 'authenticity',
      },
      {
        issue: '留香时间与宣传严重不符',
        frequency: '1次明确提及',
        user_quotes: ["The smell is great and the problem is it doesn't stay for long"],
        severity: 'critical',
        category: 'performance',
      },
      {
        issue: '性价比质疑 - 价格与容量不匹配',
        frequency: '1次提及',
        user_quotes: ['Expensive for the amount I got'],
        severity: 'major',
        category: 'value',
      },
    ],
    return_triggers: ['认为是假货/骗局', '留香时间远低于预期', '觉得价格不值'],
    expectation_gaps: [
      {
        expected: '真正的香水产品',
        reality: '被质疑不是真香水',
        disappointment_level: 'high',
      },
      {
        expected: '6小时以上持久留香',
        reality: '留香时间短暂',
        disappointment_level: 'high',
      },
      {
        expected: '物有所值的容量',
        reality: '50ml定价偏高',
        disappointment_level: 'medium',
      },
    ],
    actionable_fixes: [
      '增加正品验证标识和官方授权证明',
      "调整持久时间描述，改为'2-4小时'或删除具体时间",
      "优化容量价值感，强调'浓缩精华'或提供使用次数估算",
      '增加品牌故事和生产工艺介绍，提升可信度',
      '考虑提供小样或无理由退款增强购买信心',
    ],
    risk_assessment: {
      overall_risk_level: 'high',
      primary_concern: '产品真实性和持久时间的双重质疑可能严重影响转化率和复购',
    },
  },

  'wow-moments': {
    moments: [
      {
        moment_description: '开瓶闻香的第一印象',
        user_quote: 'Great smell 👃 👍',
        emotion_type: 'delight',
        aspect: 'smell',
        marketing_potential: 'high',
      },
      {
        moment_description: '香味品质获得认可',
        user_quote: 'Smells great',
        emotion_type: 'satisfaction',
        aspect: 'smell',
        marketing_potential: 'high',
      },
      {
        moment_description: '整体产品满意（尚未使用但满意）',
        user_quote: 'Ich finde das Parfum super',
        emotion_type: 'delight',
        aspect: 'overall',
        marketing_potential: 'medium',
      },
      {
        moment_description: '法语区用户的简洁好评',
        user_quote: 'Très bon',
        emotion_type: 'satisfaction',
        aspect: 'overall',
        marketing_potential: 'medium',
      },
    ],
    emotional_triggers: ['great smell', 'super', 'très bon', 'smells great'],
    high_conversion_phrases: [
      'Great smell - 简单直接的好评',
      'Smells great - 强调嗅觉体验',
      'Parfum super - 德语区认可',
    ],
    unexpected_benefits: ['香味获得多语言/多国用户一致好评', '开瓶即能感受到品质香味'],
    copywriting_angles: [
      '多国用户验证的好闻香味',
      '一开瓶就知道选对了',
      'Great Smell - 来自真实买家的评价',
      '跨越语言的香味认可',
    ],
  },

  'hesitation-points': {
    hesitations: [
      {
        pre_purchase_worry: '香味是否真的好闻？',
        post_purchase_resolution: "多位用户确认 'Great smell' / 'Smells great'",
        user_evidence: '5星评论中多次出现香味好评',
        qa_recommendation: 'Q: 这款香水味道怎么样？A: 多国用户一致好评，木质芳香调清新不俗',
      },
      {
        pre_purchase_worry: '是否是正品？',
        post_purchase_resolution: '部分用户满意，但有1条严重质疑',
        user_evidence: "存在 'It's a scam' 的负面评价",
        qa_recommendation: 'Q: 这是正品吗？A: 建议展示品牌授权和正品验证方式',
      },
      {
        pre_purchase_worry: '50ml够用多久？',
        post_purchase_resolution: '评论未直接回答，但有人觉得贵',
        user_evidence: "'Expensive for the amount'",
        qa_recommendation: 'Q: 50ml能用多久？A: 每日1-2喷约可使用2个月',
      },
      {
        pre_purchase_worry: '留香时间真的有6小时吗？',
        post_purchase_resolution: '有用户反馈留香短暂',
        user_evidence: "'doesn't stay for long'",
        qa_recommendation: 'Q: 能持续多久？A: 建议如实回答2-4小时，因人而异',
      },
    ],
    common_doubts: ['香味是否如描述', '是否正品', '容量是否划算', '留香时间是否达标', '适合送礼吗'],
    trust_builders: ['多国用户的香味好评', '精美的包装设计', '德语本地化的详情页'],
    qa_optimization_items: [
      {
        question: '这款香水适合什么场合？',
        suggested_answer: '适合夜店、约会、日常社交等场合，木质芳香调既有魅力又不失优雅',
      },
      {
        question: '香味持续多长时间？',
        suggested_answer: '根据肤质和环境不同，一般可持续2-4小时，建议关键时刻前补喷',
      },
      {
        question: '这是正品吗？如何验证？',
        suggested_answer: 'YCZ品牌官方授权，可通过包装防伪码验证，支持无理由退换',
      },
      {
        question: '50ml的量够用多久？',
        suggested_answer: '日常使用每次1-2喷，50ml约可使用60-90天',
      },
    ],
  },

  'buyer-profile': {
    demographics: {
      likely_gender: 'male',
      age_range_estimate: '25-40岁',
      lifestyle_indicators: ['社交活跃', '注重个人形象', '夜生活爱好者', '追求品味'],
    },
    buyer_types: [
      {
        type: '社交型男性用户',
        percentage_estimate: '50%',
        evidence: '产品定位夜店场景，评论来自多个社交活跃地区',
      },
      {
        type: '礼品购买者',
        percentage_estimate: '25%',
        evidence: 'Listing强调礼品包装，黑色+蓝色高端设计',
      },
      {
        type: '香水尝鲜者',
        percentage_estimate: '15%',
        evidence: '50ml小容量适合尝试新品牌',
      },
      {
        type: '日常通勤族',
        percentage_estimate: '10%',
        evidence: "'Daily Elegance'场景定位",
      },
    ],
    usage_scenes: [
      {
        scene: '夜店/酒吧社交',
        frequency: 'weekly',
        context: '产品名称直接定位Nightclub Essential',
      },
      {
        scene: '约会场合',
        frequency: 'occasional',
        context: '木质香调适合浪漫场景',
      },
      {
        scene: '日常上班通勤',
        frequency: 'daily',
        context: 'Daily Elegance定位覆盖',
      },
      {
        scene: '送礼场景',
        frequency: 'special',
        context: '精美包装设计适合礼品',
      },
    ],
    purchase_motivations: [
      '打造社交场合的个人魅力',
      '寻找性价比高的香水替代品',
      '尝试新品牌新香型',
      '为朋友/家人选购礼物',
    ],
    geographic_insights: {
      primary_markets: ['德国', '加拿大', '英国'],
      cultural_considerations: [
        '德语区需要本地化详情页(已做)',
        '加拿大用户使用英语评论居多',
        '欧洲市场对香水品质要求较高',
      ],
    },
  },

  'vocab-gap': {
    seller_terms: [
      'Long Lasting',
      'Aromatic Woody',
      'Nightclub Essential',
      'Daily Elegance',
      'Premium',
      'Elegant',
      '6+ hours',
      'Gentle formula',
      'Brand Reputation',
    ],
    buyer_terms: [
      'smell',
      'great',
      'super',
      'scam',
      'expensive',
      "doesn't stay",
      'good',
      'bon',
      'amount',
      'perfume',
    ],
    uncovered_buyer_terms: [
      {
        term: 'scam',
        frequency: 'low',
        context: '负面评价中出现，质疑真实性',
        recommendation: '需在Listing中增加正品证明词汇应对',
      },
      {
        term: "doesn't stay / stay long",
        frequency: 'medium',
        context: '关于持久性的真实反馈',
        recommendation: '需调整持久时间承诺，避免过度宣传',
      },
      {
        term: 'amount',
        frequency: 'low',
        context: '关于容量的价值感知',
        recommendation: '建议增加使用次数说明增强价值感',
      },
    ],
    term_translations: [
      {
        seller_says: 'Long Lasting 6+ hours',
        buyer_says: "doesn't stay for long",
      },
      {
        seller_says: 'Aromatic Woody Notes',
        buyer_says: 'great smell / smells great',
      },
      {
        seller_says: 'Premium Quality',
        buyer_says: 'super / très bon',
      },
      {
        seller_says: 'Elegant Gift Option',
        buyer_says: '(未提及，需验证礼品场景)',
      },
    ],
    listing_optimization: {
      title_additions: ['Authentic', 'Genuine', 'Gift Ready'],
      bullet_additions: [
        '添加正品验证说明',
        '更新持久时间为真实范围',
        '增加使用次数/月估算',
        '引用真实用户好评',
      ],
      keyword_opportunities: [
        'authentic cologne',
        'gift for boyfriend',
        'date night fragrance',
        'office cologne',
      ],
    },
  },

  'promise-reality': {
    gaps: [
      {
        listing_claim: '持久留香超过6小时 (mehr als 6 Stunden)',
        review_reality: '用户反馈留香时间短暂',
        contradiction_severity: 'severe',
        evidence_quotes: ["The smell is great and the problem is it doesn't stay for long"],
        false_advertising_risk: 'high',
        recommended_action: "立即修改为'2-4小时'或删除具体时间承诺",
      },
      {
        listing_claim: '品牌信誉卓越 (Brand Reputation for Excellence)',
        review_reality: '有用户严重质疑产品真实性',
        contradiction_severity: 'severe',
        evidence_quotes: ["Do not get this product. It's a scam.", "It's not perfume"],
        false_advertising_risk: 'high',
        recommended_action: '增加品牌认证、正品验证、生产资质展示',
      },
      {
        listing_claim: '50ml完美容量',
        review_reality: '用户觉得价格与容量不匹配',
        contradiction_severity: 'moderate',
        evidence_quotes: ['Expensive for the amount I got'],
        false_advertising_risk: 'medium',
        recommended_action: '强调浓缩精华/使用次数，或调整定价策略',
      },
    ],
    verified_claims: [
      "香味品质好 - 多条'great smell'好评验证",
      '包装设计精美 - 无负面反馈',
      '温和配方 - 无皮肤刺激投诉',
    ],
    unverified_claims: [
      '礼品场景受欢迎度 - 无评论直接提及',
      "木质薄荷柠檬香调准确性 - 用户只说'smell great'未具体描述",
    ],
    overall_credibility: {
      score: '5/10',
      assessment:
        'Listing存在明显的过度承诺问题，特别是持久时间和品牌信誉方面。香味品质是唯一获得一致验证的卖点。建议大幅修订关键承诺以重建用户信任。',
    },
    listing_revision_suggestions: [
      "【紧急】将'6小时+'持久时间改为'2-4小时'或删除",
      '【紧急】增加正品验证标识和品牌授权说明',
      '【建议】添加50ml使用次数估算(约60-90次)',
      '【建议】引用真实用户的香味好评作为社会证明',
      '【建议】考虑提供满意保证或无理由退款政策',
    ],
  },
};

/**
 * 分析服务 - 处理数据解析和报告生成
 */

import { AnalysisResult } from '../types/analysis';
import { analysisTargets } from '../data/analysisTargets';
import { 
  FullAnalysisReport, 
  SAMPLE_ANALYSIS_REPORT,
  TitleKeywordsReport,
  SellingPointsReport,
  FatalFlawsReport,
  WowMomentsReport,
  HesitationPointsReport,
  BuyerProfileReport,
  VocabGapReport,
  PromiseRealityReport
} from '../data/analysisReportData';

// 获取目标配置
const getTarget = (id: string) => analysisTargets.find(t => t.id === id);

/**
 * 将标题关键词报告转换为展示格式
 */
function parseTitleKeywords(report: TitleKeywordsReport): AnalysisResult {
  const target = getTarget('title-keywords')!;
  
  return {
    targetId: 'title-keywords',
    title: '标题核心词根',
    source: 'Listings',
    icon: target.icon,
    color: target.color,
    stats: [
      { label: '核心词根', value: `${report.primary_keywords.length}个` },
      { label: '场景词', value: `${report.scene_keywords.length}个` },
      { label: '已剔除', value: `${report.removed_brand_terms.length + report.removed_modifiers.length}个` }
    ],
    highlights: [
      ...report.primary_keywords.slice(0, 2).map(k => ({
        text: `${k.keyword} - ${k.search_volume_estimate}`,
        type: 'info' as const
      })),
      ...report.secondary_keywords.slice(0, 2).map(k => ({
        text: `${k.keyword} - ${k.importance}`,
        type: 'success' as const
      }))
    ],
    details: [
      { 
        category: '一级核心词（高权重）', 
        items: report.primary_keywords.map(k => `${k.keyword} [${k.weight}]`)
      },
      { 
        category: '二级功能词', 
        items: report.secondary_keywords.map(k => k.keyword)
      },
      { 
        category: '场景/人群词', 
        items: [...report.scene_keywords.map(k => k.keyword), ...report.audience_keywords.map(k => k.keyword)]
      },
      { 
        category: '已剔除的修饰词和品牌词', 
        items: [...report.removed_brand_terms, ...report.removed_modifiers]
      },
      { 
        category: '优化建议', 
        items: report.optimization_suggestions
      }
    ]
  };
}

/**
 * 将卖点结构报告转换为展示格式
 */
function parseSellingPoints(report: SellingPointsReport): AnalysisResult {
  const target = getTarget('selling-points')!;
  
  const funcCount = report.function_scene_matrix.functions.length;
  const sceneCount = report.function_scene_matrix.scenes.length;
  const painCount = report.function_scene_matrix.pain_points.length;
  
  return {
    targetId: 'selling-points',
    title: '卖点结构拆解',
    source: 'Listings',
    icon: target.icon,
    color: target.color,
    stats: [
      { label: '功能卖点', value: `${funcCount}个` },
      { label: '场景覆盖', value: `${sceneCount}个` },
      { label: '痛点解决', value: `${painCount}个` }
    ],
    highlights: [
      { 
        text: `核心差异化：${report.overall_strategy.primary_differentiation}`, 
        type: 'success' 
      },
      { 
        text: `目标人群：${report.overall_strategy.target_positioning}`, 
        type: 'info' 
      },
      ...report.overall_strategy.missing_elements.slice(0, 2).map(m => ({
        text: `缺失：${m}`,
        type: 'warning' as const
      }))
    ],
    details: [
      { 
        category: '功能维度', 
        items: report.function_scene_matrix.functions
      },
      { 
        category: '场景维度', 
        items: report.function_scene_matrix.scenes
      },
      { 
        category: '痛点解决', 
        items: report.function_scene_matrix.pain_points
      },
      { 
        category: '情感钩子', 
        items: report.overall_strategy.emotional_hooks
      },
      { 
        category: '待改进项', 
        items: report.overall_strategy.missing_elements
      }
    ]
  };
}

/**
 * 将致命劝退点报告转换为展示格式
 */
function parseFatalFlaws(report: FatalFlawsReport): AnalysisResult {
  const target = getTarget('fatal-flaws')!;
  
  const criticalCount = report.critical_issues.filter(i => i.severity === 'critical').length;
  const majorCount = report.critical_issues.filter(i => i.severity === 'major').length;
  
  return {
    targetId: 'fatal-flaws',
    title: '致命劝退点',
    source: 'Reviews',
    icon: target.icon,
    color: target.color,
    stats: [
      { label: '严重问题', value: `${criticalCount}个` },
      { label: '一般问题', value: `${majorCount}个` },
      { label: '风险等级', value: report.risk_assessment.overall_risk_level.toUpperCase() }
    ],
    highlights: report.critical_issues.map(issue => ({
      text: `${issue.issue} - ${issue.user_quotes[0] || ''}`,
      type: issue.severity === 'critical' ? 'danger' as const : 'warning' as const
    })),
    details: [
      { 
        category: '退货触发原因', 
        items: report.return_triggers
      },
      { 
        category: '期望落差', 
        items: report.expectation_gaps.map(g => `期望: ${g.expected} → 现实: ${g.reality}`)
      },
      { 
        category: '用户原话', 
        items: report.critical_issues.flatMap(i => i.user_quotes)
      },
      { 
        category: '改进建议', 
        items: report.actionable_fixes
      }
    ]
  };
}

/**
 * 将惊喜时刻报告转换为展示格式
 */
function parseWowMoments(report: WowMomentsReport): AnalysisResult {
  const target = getTarget('wow-moments')!;
  
  return {
    targetId: 'wow-moments',
    title: '惊喜顿悟时刻',
    source: 'Reviews',
    icon: target.icon,
    color: target.color,
    stats: [
      { label: '惊喜时刻', value: `${report.moments.length}个` },
      { label: '情感触发词', value: `${report.emotional_triggers.length}个` },
      { label: '高转化素材', value: `${report.high_conversion_phrases.length}条` }
    ],
    highlights: report.moments.map(m => ({
      text: `"${m.user_quote}" - ${m.moment_description}`,
      type: 'success' as const
    })),
    details: [
      { 
        category: '情感触发词', 
        items: report.emotional_triggers
      },
      { 
        category: '高转化文案素材', 
        items: report.high_conversion_phrases
      },
      { 
        category: '超预期亮点', 
        items: report.unexpected_benefits
      },
      { 
        category: '文案创意角度', 
        items: report.copywriting_angles
      }
    ]
  };
}

/**
 * 将购买前犹豫点报告转换为展示格式
 */
function parseHesitationPoints(report: HesitationPointsReport): AnalysisResult {
  const target = getTarget('hesitation-points')!;
  
  return {
    targetId: 'hesitation-points',
    title: '购买前犹豫点',
    source: 'Reviews',
    icon: target.icon,
    color: target.color,
    stats: [
      { label: '识别犹豫点', value: `${report.hesitations.length}个` },
      { label: '常见疑虑', value: `${report.common_doubts.length}个` },
      { label: 'Q&A优化项', value: `${report.qa_optimization_items.length}条` }
    ],
    highlights: report.hesitations.slice(0, 4).map(h => ({
      text: `${h.pre_purchase_worry} → ${h.post_purchase_resolution.substring(0, 50)}...`,
      type: 'warning' as const
    })),
    details: [
      { 
        category: '购前常见疑虑', 
        items: report.common_doubts
      },
      { 
        category: '信任建立要素', 
        items: report.trust_builders
      },
      { 
        category: 'Q&A优化建议', 
        items: report.qa_optimization_items.map(q => `Q: ${q.question}`)
      },
      { 
        category: '建议回答要点', 
        items: report.qa_optimization_items.map(q => q.suggested_answer.substring(0, 60) + '...')
      }
    ]
  };
}

/**
 * 将买家画像报告转换为展示格式
 */
function parseBuyerProfile(report: BuyerProfileReport): AnalysisResult {
  const target = getTarget('buyer-profile')!;
  
  return {
    targetId: 'buyer-profile',
    title: '画像与场景侧写',
    source: 'Reviews',
    icon: target.icon,
    color: target.color,
    stats: [
      { label: '买家类型', value: `${report.buyer_types.length}类` },
      { label: '使用场景', value: `${report.usage_scenes.length}个` },
      { label: '覆盖市场', value: `${report.geographic_insights.primary_markets.length}个` }
    ],
    highlights: [
      { 
        text: `核心用户：${report.demographics.age_range_estimate}${report.demographics.likely_gender === 'male' ? '男性' : '女性'}`, 
        type: 'info' 
      },
      ...report.buyer_types.slice(0, 2).map(t => ({
        text: `${t.type} (${t.percentage_estimate}) - ${t.evidence.substring(0, 40)}...`,
        type: 'info' as const
      })),
      { 
        text: `主要市场：${report.geographic_insights.primary_markets.join('、')}`, 
        type: 'success' 
      }
    ],
    details: [
      { 
        category: '生活方式特征', 
        items: report.demographics.lifestyle_indicators
      },
      { 
        category: '买家类型分布', 
        items: report.buyer_types.map(t => `${t.type} (${t.percentage_estimate})`)
      },
      { 
        category: '使用场景', 
        items: report.usage_scenes.map(s => `${s.scene} [${s.frequency}]`)
      },
      { 
        category: '购买动机', 
        items: report.purchase_motivations
      },
      { 
        category: '市场文化洞察', 
        items: report.geographic_insights.cultural_considerations
      }
    ]
  };
}

/**
 * 将词汇鸿沟报告转换为展示格式
 */
function parseVocabGap(report: VocabGapReport): AnalysisResult {
  const target = getTarget('vocab-gap')!;
  
  return {
    targetId: 'vocab-gap',
    title: '词汇鸿沟分析',
    source: 'Reviews',
    icon: target.icon,
    color: target.color,
    stats: [
      { label: '商家词汇', value: `${report.seller_terms.length}个` },
      { label: '买家词汇', value: `${report.buyer_terms.length}个` },
      { label: '待覆盖词', value: `${report.uncovered_buyer_terms.length}个` }
    ],
    highlights: report.term_translations.slice(0, 4).map(t => ({
      text: `商家说 "${t.seller_says}" → 买家说 "${t.buyer_says}"`,
      type: t.buyer_says.includes('scam') || t.buyer_says.includes('doesn\'t') ? 'danger' as const : 'warning' as const
    })),
    details: [
      { 
        category: '商家高频词（Listing）', 
        items: report.seller_terms
      },
      { 
        category: '买家高频词（Reviews）', 
        items: report.buyer_terms
      },
      { 
        category: '未覆盖的买家词（需关注）', 
        items: report.uncovered_buyer_terms.map(t => `${t.term} - ${t.recommendation}`)
      },
      { 
        category: '标题优化建议', 
        items: report.listing_optimization.title_additions
      },
      { 
        category: '关键词机会', 
        items: report.listing_optimization.keyword_opportunities
      }
    ]
  };
}

/**
 * 将承诺/现实断层报告转换为展示格式
 */
function parsePromiseReality(report: PromiseRealityReport): AnalysisResult {
  const target = getTarget('promise-reality')!;
  
  const severeCount = report.gaps.filter(g => g.contradiction_severity === 'severe').length;
  
  return {
    targetId: 'promise-reality',
    title: '承诺/现实断层',
    source: 'Reviews',
    icon: target.icon,
    color: target.color,
    stats: [
      { label: '严重断层', value: `${severeCount}处` },
      { label: '可信度评分', value: report.overall_credibility.score },
      { label: '待验证承诺', value: `${report.unverified_claims.length}个` }
    ],
    highlights: report.gaps.map(gap => ({
      text: `宣称 "${gap.listing_claim.substring(0, 25)}..." → 现实 "${gap.review_reality.substring(0, 30)}..."`,
      type: gap.contradiction_severity === 'severe' ? 'danger' as const : 
            gap.contradiction_severity === 'moderate' ? 'warning' as const : 'info' as const
    })),
    details: [
      { 
        category: '严重断层点', 
        items: report.gaps.filter(g => g.contradiction_severity === 'severe').map(g => g.listing_claim)
      },
      { 
        category: '已验证的真实承诺', 
        items: report.verified_claims
      },
      { 
        category: '待验证的承诺', 
        items: report.unverified_claims
      },
      { 
        category: 'Listing修订建议', 
        items: report.listing_revision_suggestions
      }
    ]
  };
}

/**
 * 从完整分析报告中解析指定的分析结果
 */
export function parseAnalysisReport(
  report: FullAnalysisReport, 
  targetIds: string[]
): AnalysisResult[] {
  const results: AnalysisResult[] = [];
  
  for (const targetId of targetIds) {
    switch (targetId) {
      case 'title-keywords':
        if (report.title_keywords) {
          results.push(parseTitleKeywords(report.title_keywords));
        }
        break;
      case 'selling-points':
        if (report.selling_points) {
          results.push(parseSellingPoints(report.selling_points));
        }
        break;
      case 'fatal-flaws':
        if (report.fatal_flaws) {
          results.push(parseFatalFlaws(report.fatal_flaws));
        }
        break;
      case 'wow-moments':
        if (report.wow_moments) {
          results.push(parseWowMoments(report.wow_moments));
        }
        break;
      case 'hesitation-points':
        if (report.hesitation_points) {
          results.push(parseHesitationPoints(report.hesitation_points));
        }
        break;
      case 'buyer-profile':
        if (report.buyer_profile) {
          results.push(parseBuyerProfile(report.buyer_profile));
        }
        break;
      case 'vocab-gap':
        if (report.vocab_gap) {
          results.push(parseVocabGap(report.vocab_gap));
        }
        break;
      case 'promise-reality':
        if (report.promise_reality) {
          results.push(parsePromiseReality(report.promise_reality));
        }
        break;
    }
  }
  
  return results;
}

/**
 * 获取示例分析报告
 */
export function getSampleReport(): FullAnalysisReport {
  return SAMPLE_ANALYSIS_REPORT;
}

/**
 * 模拟 AI 分析过程（实际场景中这里会调用 AI API）
 */
export async function runAnalysis(
  targetIds: string[],
  _asin: string,
  onProgress: (progress: number, step: string) => void
): Promise<AnalysisResult[]> {
  const steps = [
    { progress: 5, step: '正在连接 AI 分析引擎...' },
    { progress: 15, step: '正在加载产品数据...' },
    { progress: 25, step: '正在解析 Listings 内容...' },
    { progress: 40, step: '正在分析用户评论...' },
    { progress: 55, step: '正在执行自然语言处理...' },
    { progress: 70, step: '正在生成结构化洞察...' },
    { progress: 85, step: '正在组装分析报告...' },
    { progress: 100, step: '分析完成！' }
  ];

  for (const { progress, step } of steps) {
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 400));
    onProgress(progress, step);
  }

  // 解析示例报告数据
  const report = getSampleReport();
  return parseAnalysisReport(report, targetIds);
}

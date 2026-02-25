/**
 * 分析服务 - 处理数据解析和报告生成
 */

import { AnalysisResult } from '../types';
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
} from '../config/analysisReportData';

/**
 * 安全获取数组，如果不存在则返回空数组
 */
const safeArray = <T>(arr: T[] | undefined | null): T[] => arr || [];

/**
 * 安全获取对象，如果不存在则返回空对象
 */
const safeObject = <T extends object>(obj: T | undefined | null): T => obj || ({} as T);

/**
 * 将标题关键词报告转换为展示格式
 */
function parseTitleKeywords(report: TitleKeywordsReport): AnalysisResult {
  // 防御性检查：确保所有必需字段存在
  const primaryKeywords = report.primary_keywords || [];
  const secondaryKeywords = report.secondary_keywords || [];
  const sceneKeywords = report.scene_keywords || [];
  const audienceKeywords = report.audience_keywords || [];
  const removedBrandTerms = report.removed_brand_terms || [];
  const removedModifiers = report.removed_modifiers || [];
  const optimizationSuggestions = report.optimization_suggestions || [];
  
  return {
    targetId: 'title-keywords',
    title: '标题核心词根',
    source: 'Listings',
    stats: [
      { label: '核心词根', value: `${primaryKeywords.length}个` },
      { label: '场景词', value: `${sceneKeywords.length}个` },
      { label: '已剔除', value: `${removedBrandTerms.length + removedModifiers.length}个` }
    ],
    highlights: [
      ...primaryKeywords.slice(0, 2).map(k => ({
        text: `${k.keyword} - ${k.search_volume_estimate}`,
        type: 'info' as const
      })),
      ...secondaryKeywords.slice(0, 2).map(k => ({
        text: `${k.keyword} - ${k.importance}`,
        type: 'success' as const
      }))
    ],
    details: [
      { 
        category: '一级核心词（高权重）', 
        items: primaryKeywords.map(k => `${k.keyword} [${k.weight}]`)
      },
      { 
        category: '二级功能词', 
        items: secondaryKeywords.map(k => k.keyword)
      },
      { 
        category: '场景/人群词', 
        items: [...sceneKeywords.map(k => k.keyword), ...audienceKeywords.map(k => k.keyword)]
      },
      { 
        category: '已剔除的修饰词和品牌词', 
        items: [...removedBrandTerms, ...removedModifiers]
      },
      { 
        category: '优化建议', 
        items: optimizationSuggestions
      }
    ]
  };
}

/**
 * 将卖点结构报告转换为展示格式
 */
function parseSellingPoints(report: SellingPointsReport): AnalysisResult {
  // 防御性检查
  const overallStrategy = safeObject(report.overall_strategy);
  const functionSceneMatrix = safeObject(report.function_scene_matrix);
  
  const funcCount = safeArray(functionSceneMatrix.functions).length;
  const sceneCount = safeArray(functionSceneMatrix.scenes).length;
  const painCount = safeArray(functionSceneMatrix.pain_points).length;
  
  return {
    targetId: 'selling-points',
    title: '卖点结构拆解',
    source: 'Listings',
    stats: [
      { label: '功能卖点', value: `${funcCount}个` },
      { label: '场景覆盖', value: `${sceneCount}个` },
      { label: '痛点解决', value: `${painCount}个` }
    ],
    highlights: [
      { 
        text: `核心差异化：${overallStrategy.primary_differentiation || '未知'}`, 
        type: 'success' 
      },
      { 
        text: `目标人群：${overallStrategy.target_positioning || '未知'}`, 
        type: 'info' 
      },
      ...safeArray(overallStrategy.missing_elements).slice(0, 2).map(m => ({
        text: `缺失：${m}`,
        type: 'warning' as const
      }))
    ],
    details: [
      { 
        category: '功能维度', 
        items: safeArray(functionSceneMatrix.functions)
      },
      { 
        category: '场景维度', 
        items: safeArray(functionSceneMatrix.scenes)
      },
      { 
        category: '痛点解决', 
        items: safeArray(functionSceneMatrix.pain_points)
      },
      { 
        category: '情感钩子', 
        items: safeArray(overallStrategy.emotional_hooks)
      },
      { 
        category: '待改进项', 
        items: safeArray(overallStrategy.missing_elements)
      }
    ]
  };
}

/**
 * 将致命劝退点报告转换为展示格式
 */
function parseFatalFlaws(report: FatalFlawsReport): AnalysisResult {
  // 防御性检查
  const criticalIssues = safeArray(report.critical_issues);
  const returnTriggers = safeArray(report.return_triggers);
  const expectationGaps = safeArray(report.expectation_gaps);
  const actionableFixes = safeArray(report.actionable_fixes);
  const riskAssessment = safeObject(report.risk_assessment);
  
  const criticalCount = criticalIssues.filter(i => i.severity === 'critical').length;
  const majorCount = criticalIssues.filter(i => i.severity === 'major').length;
  
  return {
    targetId: 'fatal-flaws',
    title: '致命劝退点',
    source: 'Reviews',
    stats: [
      { label: '严重问题', value: `${criticalCount}个` },
      { label: '一般问题', value: `${majorCount}个` },
      { label: '风险等级', value: (riskAssessment.overall_risk_level || 'unknown').toUpperCase() }
    ],
    highlights: criticalIssues.map(issue => ({
      text: `${issue.issue} - ${safeArray(issue.user_quotes)[0] || ''}`,
      type: issue.severity === 'critical' ? 'danger' as const : 'warning' as const
    })),
    details: [
      { 
        category: '退货触发原因', 
        items: returnTriggers
      },
      { 
        category: '期望落差', 
        items: expectationGaps.map(g => `期望: ${g.expected} → 现实: ${g.reality}`)
      },
      { 
        category: '用户原话', 
        items: criticalIssues.flatMap(i => safeArray(i.user_quotes))
      },
      { 
        category: '改进建议', 
        items: actionableFixes
      }
    ]
  };
}

/**
 * 将惊喜时刻报告转换为展示格式
 */
function parseWowMoments(report: WowMomentsReport): AnalysisResult {
  // 防御性检查
  const moments = safeArray(report.moments);
  const emotionalTriggers = safeArray(report.emotional_triggers);
  const highConversionPhrases = safeArray(report.high_conversion_phrases);
  const unexpectedBenefits = safeArray(report.unexpected_benefits);
  const copywritingAngles = safeArray(report.copywriting_angles);
  
  return {
    targetId: 'wow-moments',
    title: '惊喜顿悟时刻',
    source: 'Reviews',
    stats: [
      { label: '惊喜时刻', value: `${moments.length}个` },
      { label: '情感触发词', value: `${emotionalTriggers.length}个` },
      { label: '高转化素材', value: `${highConversionPhrases.length}条` }
    ],
    highlights: moments.map(m => ({
      text: `"${m.user_quote}" - ${m.moment_description}`,
      type: 'success' as const
    })),
    details: [
      { 
        category: '情感触发词', 
        items: emotionalTriggers
      },
      { 
        category: '高转化文案素材', 
        items: highConversionPhrases
      },
      { 
        category: '超预期亮点', 
        items: unexpectedBenefits
      },
      { 
        category: '文案创意角度', 
        items: copywritingAngles
      }
    ]
  };
}

/**
 * 将购买前犹豫点报告转换为展示格式
 */
function parseHesitationPoints(report: HesitationPointsReport): AnalysisResult {
  // 防御性检查
  const hesitations = safeArray(report.hesitations);
  const commonDoubts = safeArray(report.common_doubts);
  const trustBuilders = safeArray(report.trust_builders);
  const qaOptimizationItems = safeArray(report.qa_optimization_items);
  
  return {
    targetId: 'hesitation-points',
    title: '购买前犹豫点',
    source: 'Reviews',
    stats: [
      { label: '识别犹豫点', value: `${hesitations.length}个` },
      { label: '常见疑虑', value: `${commonDoubts.length}个` },
      { label: 'Q&A优化项', value: `${qaOptimizationItems.length}条` }
    ],
    highlights: hesitations.slice(0, 4).map(h => ({
      text: `${h.pre_purchase_worry || '未知'} → ${(h.post_purchase_resolution || '').substring(0, 50)}...`,
      type: 'warning' as const
    })),
    details: [
      { 
        category: '购前常见疑虑', 
        items: commonDoubts
      },
      { 
        category: '信任建立要素', 
        items: trustBuilders
      },
      { 
        category: 'Q&A优化建议', 
        items: qaOptimizationItems.map(q => `Q: ${q.question || '未知'}`)
      },
      { 
        category: '建议回答要点', 
        items: qaOptimizationItems.map(q => (q.suggested_answer || '').substring(0, 60) + '...')
      }
    ]
  };
}

/**
 * 将买家画像报告转换为展示格式
 */
function parseBuyerProfile(report: BuyerProfileReport): AnalysisResult {
  // 防御性检查
  const demographics = safeObject(report.demographics);
  const buyerTypes = safeArray(report.buyer_types);
  const usageScenes = safeArray(report.usage_scenes);
  const purchaseMotivations = safeArray(report.purchase_motivations);
  const geographicInsights = safeObject(report.geographic_insights);
  const primaryMarkets = safeArray(geographicInsights.primary_markets);
  const culturalConsiderations = safeArray(geographicInsights.cultural_considerations);
  const lifestyleIndicators = safeArray(demographics.lifestyle_indicators);
  
  return {
    targetId: 'buyer-profile',
    title: '画像与场景侧写',
    source: 'Reviews',
    stats: [
      { label: '买家类型', value: `${buyerTypes.length}类` },
      { label: '使用场景', value: `${usageScenes.length}个` },
      { label: '覆盖市场', value: `${primaryMarkets.length}个` }
    ],
    highlights: [
      { 
        text: `核心用户：${demographics.age_range_estimate || '未知'}${demographics.likely_gender === 'male' ? '男性' : demographics.likely_gender === 'female' ? '女性' : ''}`, 
        type: 'info' 
      },
      ...buyerTypes.slice(0, 2).map(t => ({
        text: `${t.type || '未知'} (${t.percentage_estimate || '未知'}) - ${(t.evidence || '').substring(0, 40)}...`,
        type: 'info' as const
      })),
      { 
        text: `主要市场：${primaryMarkets.join('、') || '未知'}`, 
        type: 'success' 
      }
    ],
    details: [
      { 
        category: '生活方式特征', 
        items: lifestyleIndicators
      },
      { 
        category: '买家类型分布', 
        items: buyerTypes.map(t => `${t.type || '未知'} (${t.percentage_estimate || '未知'})`)
      },
      { 
        category: '使用场景', 
        items: usageScenes.map(s => `${s.scene || '未知'} [${s.frequency || '未知'}]`)
      },
      { 
        category: '购买动机', 
        items: purchaseMotivations
      },
      { 
        category: '市场文化洞察', 
        items: culturalConsiderations
      }
    ]
  };
}

/**
 * 将词汇鸿沟报告转换为展示格式
 */
function parseVocabGap(report: VocabGapReport): AnalysisResult {
  // 防御性检查
  const sellerTerms = safeArray(report.seller_terms);
  const buyerTerms = safeArray(report.buyer_terms);
  const termTranslations = safeArray(report.term_translations);
  const uncoveredBuyerTerms = safeArray(report.uncovered_buyer_terms);
  const listingOptimization = safeObject(report.listing_optimization);
  const titleAdditions = safeArray(listingOptimization.title_additions);
  const keywordOpportunities = safeArray(listingOptimization.keyword_opportunities);
  
  return {
    targetId: 'vocab-gap',
    title: '词汇鸿沟分析',
    source: 'Reviews',
    stats: [
      { label: '商家词汇', value: `${sellerTerms.length}个` },
      { label: '买家词汇', value: `${buyerTerms.length}个` },
      { label: '待覆盖词', value: `${uncoveredBuyerTerms.length}个` }
    ],
    highlights: termTranslations.slice(0, 4).map(t => ({
      text: `商家说 "${t.seller_says || '未知'}" → 买家说 "${t.buyer_says || '未知'}"`,
      type: (t.buyer_says || '').includes('scam') || (t.buyer_says || '').includes('doesn\'t') ? 'danger' as const : 'warning' as const
    })),
    details: [
      { 
        category: '商家高频词（Listing）', 
        items: sellerTerms
      },
      { 
        category: '买家高频词（Reviews）', 
        items: buyerTerms
      },
      { 
        category: '未覆盖的买家词（需关注）', 
        items: uncoveredBuyerTerms.map(t => `${t.term || '未知'} - ${t.recommendation || '未知'}`)
      },
      { 
        category: '标题优化建议', 
        items: titleAdditions
      },
      { 
        category: '关键词机会', 
        items: keywordOpportunities
      }
    ]
  };
}

/**
 * 将承诺/现实断层报告转换为展示格式
 */
function parsePromiseReality(report: PromiseRealityReport): AnalysisResult {
  // 防御性检查
  const gaps = safeArray(report.gaps);
  const verifiedClaims = safeArray(report.verified_claims);
  const unverifiedClaims = safeArray(report.unverified_claims);
  const listingRevisionSuggestions = safeArray(report.listing_revision_suggestions);
  const overallCredibility = safeObject(report.overall_credibility);
  
  const severeCount = gaps.filter(g => g.contradiction_severity === 'severe').length;
  
  return {
    targetId: 'promise-reality',
    title: '承诺/现实断层',
    source: 'Reviews',
    stats: [
      { label: '严重断层', value: `${severeCount}处` },
      { label: '可信度评分', value: overallCredibility.score || '未知' },
      { label: '待验证承诺', value: `${unverifiedClaims.length}个` }
    ],
    highlights: gaps.map(gap => ({
      text: `宣称 "${(gap.listing_claim || '').substring(0, 25)}..." → 现实 "${(gap.review_reality || '').substring(0, 30)}..."`,
      type: gap.contradiction_severity === 'severe' ? 'danger' as const : 
            gap.contradiction_severity === 'moderate' ? 'warning' as const : 'info' as const
    })),
    details: [
      { 
        category: '严重断层点', 
        items: gaps.filter(g => g.contradiction_severity === 'severe').map(g => g.listing_claim || '未知')
      },
      { 
        category: '已验证的真实承诺', 
        items: verifiedClaims
      },
      { 
        category: '待验证的承诺', 
        items: unverifiedClaims
      },
      { 
        category: 'Listing修订建议', 
        items: listingRevisionSuggestions
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
  
  console.log('[AI分析] 开始解析分析报告，目标数量:', targetIds.length);
  console.log('[AI分析] 报告对象键:', Object.keys(report));
  
  for (const targetId of targetIds) {
    try {
      switch (targetId) {
        case 'title-keywords':
          if (report['title-keywords']) {
            console.log('[AI分析] 解析 title-keywords，数据:', report['title-keywords']);
            results.push(parseTitleKeywords(report['title-keywords']));
          } else {
            console.warn('[AI分析] title-keywords 数据不存在');
          }
          break;
        case 'selling-points':
          if (report['selling-points']) {
            results.push(parseSellingPoints(report['selling-points']));
          } else {
            console.warn('[AI分析] selling-points 数据不存在');
          }
          break;
        case 'fatal-flaws':
          if (report['fatal-flaws']) {
            results.push(parseFatalFlaws(report['fatal-flaws']));
          } else {
            console.warn('[AI分析] fatal-flaws 数据不存在');
          }
          break;
        case 'wow-moments':
          if (report['wow-moments']) {
            results.push(parseWowMoments(report['wow-moments']));
          } else {
            console.warn('[AI分析] wow-moments 数据不存在');
          }
          break;
        case 'hesitation-points':
          if (report['hesitation-points']) {
            results.push(parseHesitationPoints(report['hesitation-points']));
          } else {
            console.warn('[AI分析] hesitation-points 数据不存在');
          }
          break;
        case 'buyer-profile':
          if (report['buyer-profile']) {
            results.push(parseBuyerProfile(report['buyer-profile']));
          } else {
            console.warn('[AI分析] buyer-profile 数据不存在');
          }
          break;
        case 'vocab-gap':
          if (report['vocab-gap']) {
            results.push(parseVocabGap(report['vocab-gap']));
          } else {
            console.warn('[AI分析] vocab-gap 数据不存在');
          }
          break;
        case 'promise-reality':
          if (report['promise-reality']) {
            results.push(parsePromiseReality(report['promise-reality']));
          } else {
            console.warn('[AI分析] promise-reality 数据不存在');
          }
          break;
      }
    } catch (error) {
      console.error(`[AI分析] 解析 ${targetId} 时出错:`, error);
      // 继续处理其他目标
    }
  }
  
  console.log('[AI分析] 解析完成，成功解析:', results.length, '个目标');
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

  // 直接报告进度，不使用 setTimeout 延迟
  for (const { progress, step } of steps) {
    onProgress(progress, step);
  }

  // 解析示例报告数据
  const report = getSampleReport();
  return parseAnalysisReport(report, targetIds);
}

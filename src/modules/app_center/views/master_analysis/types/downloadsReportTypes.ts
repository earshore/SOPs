/**
 * Downloads 报告格式类型定义
 * 支持从 Downloads 目录中的实际报告格式提取 DNA
 */

/**
 * Competitor Report（竞品分析报告）格式
 */
export interface CompetitorReport {
  product_summary: string;
  feature_points: string[];
  intents: string[];
  competitor_insights: {
    strengths: string[];
    weaknesses: string[];
    user_profile: string[];
    differentiation_angles: string[];
  };
  keyword_clusters: {
    core: string[];
    attribute: string[];
    long_tail: string[];
    banned?: string[];
  };
  high_frequency_phrases: string[];
  negative_drivers: string[];
  compliance_risks: Array<{
    type: string;
    examples: string[];
    suggestion: string;
  }>;
  qa_opportunities: Array<{
    question: string;
    answer_strategy: string;
  }>;
  meta: {
    targetMarket: string;
    analyzedASINs: string[];
    generatedByModel: string;
    generatedAt: string;
  };
}

/**
 * Product Overview Report（产品概览报告）格式
 */
export interface ProductOverviewReport {
  meta: {
    generatedAt: string;
    engine: string;
    asins: string[];
  };
  productOverview: {
    itemsAnalyzed: number;
    asins: string[];
    market: string;
    category: string;
    summary: string;
  };
  coreFeatures: {
    [key: string]: string | undefined;
  };
  user_profile: {
    demographics: {
      age_ranges: string[];
      locations: string[];
      household: string[];
    };
    goals: string[];
    pain_points: string[];
    scenarios: string[];
    objections: string[];
    price_sensitivity: string;
    decision_drivers: string[];
  };
  strengths: string[];
  weaknesses: string[];
  differentiationAngles: string[];
  keywordClusters: {
    core: string[];
    longTail: string[];
    intent: string[];
  };
  complianceRisks: Array<{
    type: string;
    risk: string;
    suggestion: string;
  }>;
}

/**
 * Semantic Analysis Report（语义分析报告）格式
 */
export interface SemanticAnalysisReport {
  high_frequency_phrases: {
    attribute: string[];
    use_cases: string[];
  };
  pain_point_gaps: {
    top_quality_issues: string[];
    unmet_need: string[];
    differentiation_angles: string[];
  };
  native_voice: {
    native_phrasing: string[];
    emotional_hook: string[];
  };
  meta: {
    targetMarket: string;
    analyzedASINs: string[];
    generatedByModel: string;
    generatedAt: string;
    templateUsed: string;
    templateId: string;
    dataScope: string[];
  };
}

/**
 * 联合类型：所有支持的 Downloads 报告格式
 */
export type DownloadsReport = CompetitorReport | ProductOverviewReport | SemanticAnalysisReport;

/**
 * 报告类型枚举
 */
export enum ReportType {
  FULL_ANALYSIS = 'full_analysis',      // AI 分析生成的报告（应用实际使用）
  COMPETITOR = 'competitor',
  PRODUCT_OVERVIEW = 'product_overview',
  SEMANTIC_ANALYSIS = 'semantic_analysis',
  UNKNOWN = 'unknown'
}

// src/types/modules-business.d.ts
import type { UserProductProfile } from './prompt-profile';
// ================================================================
// 业务模块类型定义
// 为各业务模块提供完整的类型约束
// ================================================================

// ==================== 通用模块类型 ====================

/**
 * 模块接口
 */
export interface IModule {
  mount: (container: HTMLElement) => Promise<void> | void;
  unmount?: () => void;
}

/**
 * 模块加载器函数类型
 */
export type ModuleLoaderFn = () => Promise<IModule>;

/**
 * 模块映射类型
 */
export type ModuleMap = Record<string, ModuleLoaderFn>;

/**
 * 模块注册函数类型
 */
export type ModuleRegisterFn = (routeId: string, loader: ModuleLoaderFn) => void | boolean;

// ==================== Master Analysis 模块类型 ====================

/**
 * 采集站点类型（简短代码）
 */
export type ScraperSite = 'US' | 'DE' | 'FR' | 'IT' | 'ES' | 'NL' | 'SE' | 'PL' | 'BE' | 'IE' | 'UK' | 'CA' | 'JP';

/**
 * 采集状态
 */
export type ScraperStatus = 'pending' | 'scraping' | 'success' | 'failed';

/**
 * 客户评论
 */
export interface CustomerReview {
  id?: string;
  author?: string;
  headline: string;
  body: string;
  star_rating: number;
  is_verified: boolean;
  review_date: string;
  title?: string;
  content?: string;
  rating?: number;
  isVerified?: boolean;
}

/**
 * 采集的产品数据
 */
export interface ScrapedProduct {
  asin: string;
  url: string;
  language: string;
  productTitle: string;
  feature_bullets: string[];
  customer_reviews: CustomerReview[];
  scrape_status: ScraperStatus;
  error: string;
  metadata?: {
    marketplace?: string;
    scrape_timestamp?: string;
    [key: string]: unknown;
  };
  _source_site?: string;
  _filename?: string;
}

/**
 * 代理配置
 */
export interface ProxyConfig {
  type?: 'scraperapi' | 'zenrows' | 'brightdata' | 'custom_api' | 'custom_proxy' | 'custom';
  customUrl?: string;
  enabled?: boolean;
}

/**
 * 抓取选项
 */
export interface FetchOptions {
  retries?: number;
  delay?: number;
  proxyConfig?: ProxyConfig;
  timeout?: number;
}

/**
 * 状态回调函数
 */
export type StatusCallback = (asin: string, status: string, message: string) => void;

/**
 * 产品数据
 */
export interface ProductData {
  asin: string;
  productTitle?: string;
  feature_bullets?: string[];
  customer_reviews?: CustomerReview[];
}

/**
 * 数据选项
 */
export interface DataOptions {
  includeTitle?: boolean;
  includeBullets?: boolean;
  includeReviews?: boolean;
}

/**
 * LLM配置
 */
export interface LLMConfig {
  provider: string;
  endpoint: string;
  apiKey: string;
  model: string;
  models?: Array<{ id: string; context: number; features?: string[] }>;
}

/**
 * 卖点分析 - 单个要点
 */
export interface BulletAnalysis {
  /** 要点索引 */
  bullet_index: number;
  /** 原文摘要 */
  original_text_summary: string;
  /** 功能列表 */
  functions: string[];
  /** 使用场景 */
  scenes: string[];
  /** 可信度评分 */
  credibility_score: 'high' | 'medium' | 'low';
}

/**
 * 整体策略分析
 */
export interface OverallStrategy {
  /** 主要差异化点 */
  primary_differentiation: string;
  /** 情感钩子 */
  emotional_hooks: string[];
  /** 缺失元素 */
  missing_elements: string[];
}

/**
 * 功能场景矩阵
 */
export interface FunctionSceneMatrix {
  /** 痛点列表 */
  pain_points: string[];
}

/**
 * 卖点分析
 */
export interface SellingPoints {
  /** 要点分析列表 */
  bullet_analysis: BulletAnalysis[];
  /** 整体策略 */
  overall_strategy: OverallStrategy;
  /** 功能场景矩阵 */
  function_scene_matrix: FunctionSceneMatrix;
}

/**
 * 致命缺陷 - 单个问题
 */
export interface CriticalIssue {
  /** 问题描述 */
  issue: string;
  /** 出现频率 */
  frequency: number;
  /** 用户引用 */
  user_quotes: string[];
  /** 严重程度 */
  severity: 'critical' | 'major' | 'minor';
}

/**
 * 期望差距
 */
export interface ExpectationGap {
  /** 期望 */
  expected: string;
  /** 现实 */
  reality: string;
  /** 失望程度 */
  disappointment_level: 'high' | 'medium' | 'low';
}

/**
 * 风险评估
 */
export interface RiskAssessment {
  /** 整体风险等级 */
  overall_risk_level: 'high' | 'medium' | 'low';
  /** 主要关注点 */
  primary_concern: string;
}

/**
 * 致命缺陷分析
 */
export interface FatalFlaws {
  /** 关键问题列表 */
  critical_issues: CriticalIssue[];
  /** 退货触发因素 */
  return_triggers: string[];
  /** 期望差距 */
  expectation_gaps: ExpectationGap[];
  /** 风险评估 */
  risk_assessment: RiskAssessment;
}

/**
 * 惊喜时刻
 */
export interface WowMoment {
  /** 时刻描述 */
  moment_description: string;
  /** 用户引用 */
  user_quote: string;
  /** 情感类型 */
  emotion_type: 'surprise' | 'delight' | 'satisfaction' | 'excitement';
  /** 相关方面 */
  aspect: 'smell' | 'value' | 'packaging' | 'quality' | 'service';
  /** 营销潜力 */
  marketing_potential: 'high' | 'medium' | 'low';
}

/**
 * 惊喜时刻分析
 */
export interface WowMoments {
  /** 惊喜时刻列表 */
  moments: WowMoment[];
}

/**
 * 犹豫点
 */
export interface HesitationPoint {
  /** 购买前担忧 */
  pre_purchase_worry: string;
  /** 购买后解决方案 */
  post_purchase_resolution: string;
  /** 转化影响 */
  conversion_impact: 'high' | 'medium' | 'low';
}

/**
 * 犹豫点分析
 */
export interface HesitationPoints {
  /** 犹豫点列表 */
  hesitations: HesitationPoint[];
}

/**
 * 买家类型
 */
export interface BuyerType {
  /** 类型名称 */
  type: string;
  /** 百分比估计 */
  percentage_estimate: string;
  /** 动机 */
  motivation: string;
}

/**
 * 人口统计信息
 */
export interface Demographics {
  /** 可能的性别 */
  likely_gender: 'male' | 'female' | 'mixed' | 'unknown';
  /** 年龄范围估计 */
  age_range_estimate: string;
}

/**
 * 买家画像
 */
export interface BuyerProfile {
  /** 人口统计 */
  demographics: Demographics;
  /** 买家类型列表 */
  buyer_types: BuyerType[];
}

/**
 * 分析报告元数据
 */
export interface AnalysisReportMetadata {
  /** ASIN 列表 */
  asins?: string[];
  /** 市场代码 */
  marketplace?: string;
  /** 生成时间戳 */
  generated_at?: string;
  /** 模板 ID */
  template_id?: string;
  /** 模板名称 */
  template_name?: string;
  /** 语言 */
  language?: string;
  /** 其他元数据 */
  [key: string]: unknown;
}

/**
 * 分析报告
 * 
 * 这是 AI 分析服务生成的完整报告结构。
 * 报告可能包含多个分析模块，每个模块都是可选的。
 * 
 * @example
 * ```typescript
 * const report: AnalysisReport = {
 *   asin: "B0FVM8J662",
 *   product_title: "Example Product",
 *   market: "US",
 *   analysis_timestamp: "2024-01-01T00:00:00Z",
 *   "selling-points": {
 *     bullet_analysis: [...],
 *     overall_strategy: {...}
 *   }
 * };
 * ```
 */
export interface AnalysisReport {
  // ==================== 基础信息 ====================
  
  /** ASIN（单个或逗号分隔的多个） */
  asin?: string;
  
  /** 产品标题 */
  product_title?: string;
  
  /** 分析时间戳（ISO 8601 格式） */
  analysis_timestamp?: string;
  
  /** 市场代码（如 US, DE, UK） */
  market?: string;
  
  /** 目标市场（用于 Promptlab） */
  targetMarket?: string;
  
  /** 语言 */
  language?: string;
  
  /** 使用的模板 */
  templateUsed?: string;
  
  /** 模板 ID */
  templateId?: string;
  
  /** 生成时间（Unix 时间戳） */
  generatedAt?: number;
  
  /** 元数据 */
  meta?: AnalysisReportMetadata;
  
  // ==================== 分析模块 ====================
  
  /** 卖点分析 */
  'selling-points'?: SellingPoints;
  
  /** 致命缺陷分析 */
  'fatal-flaws'?: FatalFlaws;
  
  /** 惊喜时刻分析 */
  'wow-moments'?: WowMoments;
  
  /** 犹豫点分析 */
  'hesitation-points'?: HesitationPoints;
  
  /** 买家画像 */
  'buyer-profile'?: BuyerProfile;
  
  // ==================== 错误处理 ====================
  
  /** 是否解析错误 */
  parse_error?: boolean;
  
  /** 原始响应（当解析失败时） */
  raw_response?: string;
  
  /** 错误详情 */
  error_detail?: string;

  // ==================== 置信度元数据 ====================

  /** 置信度元数据（AI 分析报告质量评估） */
  _metadata?: {
    /** 各报告类型的置信度分数 (0-1) */
    confidence?: Record<string, number>;
    /** 总体置信度 (0-1) */
    overallConfidence?: number;
    /** 分析时间 */
    analyzedAt?: string;
    /** 分析的目标ID列表 */
    targetIds?: string[];
    /** 分析语言 */
    language?: string;
  };

  // ==================== 扩展字段 ====================
  
  /**
   * 允许动态添加其他分析模块
   * 例如：'price-analysis', 'review-sentiment', 'seo-keywords' 等
   */
  [key: string]: unknown;
}

/**
 * 分析模块配置
 */
export interface AnalysisModuleConfig {
  id: string;
  label_cn: string;
  label_en: string;
  desc_cn?: string;
  category: string;
  extraction_instruction: string;
  icon?: string;
  color?: string;
}

/**
 * GridStack节点
 */
export interface GridStackNode {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  el?: HTMLElement;
  noMove?: boolean;
  noResize?: boolean;
}

/**
 * GridStack实例接口
 */
export interface GridStackInstance {
  addWidget: (widget: GridStackWidget) => HTMLElement;
  save: (saveContent?: boolean) => GridStackNode[];
  destroy: (removeDOM?: boolean) => void;
  update: (el: HTMLElement | null, opts: Partial<GridStackNode>) => void;
  enable: () => void;
  disable: () => void;
  batchUpdate: () => void;
  removeAll: (removeDOM?: boolean) => void;
  on: (event: string, callback: (event: Event, el: HTMLElement) => void) => void;
  engine: {
    nodes: GridStackNode[];
  };
}

/**
 * GridStack组件
 */
export interface GridStackWidget {
  id: string;
  x?: number;
  y?: number;
  w: number;
  h: number;
  noMove?: boolean;
  noResize?: boolean;
  content: string;
}

export type GeneratedPromptType = 'listing' | 'visual';

export interface GeneratedPromptProfileSnapshot {
  targetMarket?: string;
  keywordsTier1?: string;
  keywordsTier2?: string;
  audience?: string;
  usps?: string;
  specs?: string;
  socialHook?: string;
  negative?: string;
  tone?: string;
  customStrategy?: string;
  useCosmo?: boolean;
  useRufus?: boolean;
  useEmoji?: boolean;
  selectedReportSections?: string[];
  selectedReportItems?: Record<string, unknown>;
  reportFingerprint?: string;
  charLimit?: number;
}

export interface GeneratedPromptRecord {
  id: string;
  type: GeneratedPromptType;
  prompt: string;
  generatedAt: string;
  historyId?: string | number | null;
  sourceHistoryId?: string | number | null;
  sourceDataFingerprint?: string;
  reportFingerprint?: string;
  asins: string[];
  marketplace?: string;
  profile: GeneratedPromptProfileSnapshot;
}

export interface HistoryPromptResults {
  listing?: GeneratedPromptRecord;
  visual?: GeneratedPromptRecord;
  history: GeneratedPromptRecord[];
  updatedAt: string;
}

/**
 * 历史记录项
 */
export interface HistoryItem {
  id: string | number;
  timestamp: string;
  site: string;
  asins: string[];
  data: ScrapedData;
  dataFingerprint?: string;
  report?: AnalysisReport;
  // 向后兼容旧格式
  asin?: string;
  product?: ScrapedProduct;
  // AI分析状态
  analysisStatus?: {
    isAnalyzed: boolean;           // 是否已分析
    analyzedAt?: string;            // 分析时间戳
    analysisReport?: AnalysisReport;  // 分析报告数据
    sourceHistoryId?: string | number | null;
    sourceDataFingerprint?: string;
    sourceAsins?: string[];
    sourceTargets?: string[];
    reportFingerprint?: string;
  };
  promptResults?: HistoryPromptResults;
  userProductProfile?: UserProductProfile;
}

// ==================== Keyword Hunter History ====================

export type KeywordHunterSnapshotStatus = 'draft' | 'matched' | 'reported';
export type KeywordHunterSnapshotSourceType = 'manual' | 'master-analysis';

export interface KeywordHunterSnapshotSource {
  type: KeywordHunterSnapshotSourceType;
  masterHistoryId?: string | number | null;
  sourceDataFingerprint?: string | null;
  site?: string;
  asins?: string[];
  productTitle?: string;
}

export interface KeywordHunterSnapshotSettings {
  matchPlural: boolean;
  matchStem: boolean;
  matchCase: boolean;
  matchPartial: boolean;
}

export interface KeywordHunterSnapshotParagraph {
  original: string;
  translation?: string;
}

export interface KeywordHunterSnapshotInput {
  keywordsInputText: string;
  copyInputText: string;
  settings: KeywordHunterSnapshotSettings;
}

export interface KeywordHunterSnapshotResult {
  keywords: string[];
  processedCopy: string;
  matchedKeywords: Array<{ keyword: string; count: number }>;
  unmatchedKeywords: string[];
  wordFrequency: Array<[string, number]>;
  paragraphs: Array<string | KeywordHunterSnapshotParagraph>;
  llmAnalysisResult?: string;
  showTranslation?: boolean;
  translationMode?: boolean;
  coverageRate: number;
}

export interface KeywordHunterSnapshotDerived {
  keywordCount: number;
  matchedCount: number;
  unmatchedCount: number;
  copyHash: string;
  snapshotFingerprint: string;
}

export interface KeywordHunterSnapshot {
  id: string;
  schemaVersion: 1;
  title: string;
  status: KeywordHunterSnapshotStatus;
  createdAt: string;
  updatedAt: string;
  source: KeywordHunterSnapshotSource;
  input: KeywordHunterSnapshotInput;
  result: KeywordHunterSnapshotResult;
  derived: KeywordHunterSnapshotDerived;
}

export interface KeywordHunterSnapshotDiff {
  addedKeywords: string[];
  removedKeywords: string[];
  newlyMatchedKeywords: string[];
  newlyUnmatchedKeywords: string[];
  improvedKeywords: Array<{ keyword: string; before: number; after: number }>;
  declinedKeywords: Array<{ keyword: string; before: number; after: number }>;
  coverageDelta: number;
}

/**
 * 抓取数据元数据
 * 包含采集过程的上下文信息
 */
export interface ScrapedDataMetadata {
  /** 采集时间戳（ISO 8601 格式） */
  scrape_timestamp: string;
  
  /** 市场代码（如 US, DE, UK） */
  marketplace: string;
  
  /** Amazon 域名（如 amazon.com, amazon.de） */
  domain: string;
  
  /** 语言名称（如 English, German） */
  language: string;
  
  /** 采集的 ASIN 总数 */
  total_asins: number;
  
  /** 总产品数量（已废弃，使用 total_asins） */
  total_count?: number;
  
  /** 扩展字段：允许添加其他元数据 */
  [key: string]: unknown;
}

/**
 * 抓取数据结构
 * 
 * 这是 Scraper 模块的核心数据结构，包含采集的产品列表和元数据。
 * 
 * @example
 * ```typescript
 * const scrapedData: ScrapedData = {
 *   products: [
 *     {
 *       asin: "B08N5WRWNW",
 *       url: "https://amazon.com/dp/B08N5WRWNW",
 *       language: "English",
 *       productTitle: "Example Product",
 *       feature_bullets: ["Feature 1", "Feature 2"],
 *       customer_reviews: [],
 *       scrape_status: "success",
 *       error: ""
 *     }
 *   ],
 *   metadata: {
 *     scrape_timestamp: "2024-01-01T00:00:00Z",
 *     marketplace: "US",
 *     domain: "amazon.com",
 *     language: "English",
 *     total_asins: 1
 *   }
 * };
 * ```
 */
export interface ScrapedData {
  /** 采集的产品列表 */
  products: ScrapedProduct[];
  
  /** 采集元数据（可选，但强烈建议提供） */
  metadata?: ScrapedDataMetadata;
  
  /** 扩展字段：允许添加其他数据 */
  [key: string]: unknown;
}

// ==================== Keyword Hunter 模块类型 ====================

/**
 * 关键词匹配结果
 */
export interface KeywordMatchResult {
  keyword: string;
  count: number;
}

/**
 * 分析结果
 */
export interface AnalysisResult {
  matched: KeywordMatchResult[];
  unmatched: string[];
}

/**
 * 词频统计
 */
export type WordFrequency = [string, number];

/**
 * 关键词追踪设置
 */
export interface KeywordTrackerSettings {
  matchPlural: boolean;
  matchStem: boolean;
  matchCase: boolean;
  matchPartial: boolean;
}

// ==================== SOPs 模块类型 ====================

/**
 * NPI 产品阶段
 */
export type NPIStage = 'new-test' | 'growth' | 'stable' | 'clearance';

/**
 * 站点代码
 */
export type SiteCode = 'DE' | 'FR' | 'IT' | 'ES' | 'UK' | 'NL' | 'SE' | 'PL' | 'BE' | 'US' | 'JP';

/**
 * 广告策略
 */
export type AdsStrategy = 'auto' | 'manual' | 'mixed';

/**
 * 产品决策
 */
export type ProductDecision = 'keep' | 'kill';

/**
 * NPI 产品记录
 */
export interface NPIProductRecord {
  stage: NPIStage;
  sku: string;
  cn_name: string;
  store: string;
  asin: string;
  site: SiteCode;
  qty_shipped: number;
  inventory_days: number;
  is_pan_eu: boolean;
  check_content: boolean;
  check_sensitive: boolean;
  check_creative: boolean;
  check_ebc: boolean;
  delivery_fee: number;
  break_even: string;
  sessions: number;
  ctr_7d: number;
  cvr_7d: number;
  acoas: number;
  organic_ratio: number;
  vine_status: string;
  ads_strategy: AdsStrategy;
  decision: ProductDecision;
  next_step: string[];
}

/**
 * 阶段配置
 */
export interface StageConfig {
  label: string;
  color: string;
}

/**
 * 阶段配置映射
 */
export type StageConfigMap = Record<NPIStage, StageConfig>;

/**
 * 站点标志映射
 */
export type SiteFlagsMap = Record<SiteCode, string>;

/**
 * 站点域名映射
 */
export type SiteDomainsMap = Record<SiteCode, string>;

/**
 * 合规状态
 */
export interface ComplianceStatus {
  completed: number;
  total: number;
  isComplete: boolean;
}

/**
 * 邮件模板类型
 */
export type EmailTemplateType = 'order_confirmation' | 'shipping_notification' | 'review_request' | 'customer_service' | 'refund_policy';

/**
 * 邮件模板
 */
export interface EmailTemplate {
  id: string;
  type: EmailTemplateType;
  subject: string;
  body: string;
  language: string;
  variables?: string[];
}

/**
 * 限制词类别
 */
export type RestrictedWordCategory = 'medical' | 'safety' | 'performance' | 'legal' | 'environmental';

/**
 * 限制词
 */
export interface RestrictedWord {
  word: string;
  category: RestrictedWordCategory;
  severity: 'high' | 'medium' | 'low';
  alternative?: string;
  description?: string;
}

// ==================== AMZ Hub 模块类型 ====================

/**
 * 知识文章类型
 */
export type KnowledgeArticleType = 'eu_insights' | 'seo_strategy' | 'ecosystem';

/**
 * 知识文章
 */
export interface KnowledgeArticle {
  id: string;
  type: KnowledgeArticleType;
  title: string;
  content: string;
  author?: string;
  publishDate?: string;
  tags?: string[];
}

/**
 * 营销日历事件
 */
export interface MarketingEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  category: 'holiday' | 'promotion' | 'seasonal' | 'custom';
  markets?: string[];
  // AMZ Hub specific fields
  name: string;
  nameEn: string;
  emoji: string;
  month: number;
  type: 'holiday' | 'shopping';
  countries: string[];
  strategy: string;
  tags?: string[];
}

/**
 * 国家信息
 */
export interface CountryInfo {
  code: string;
  name: string;
  flag: string;
}

/**
 * 促销工具
 */
export interface PromotionTool {
  id: string;
  name: string;
  description: string;
  type: 'coupon' | 'deal' | 'lightning' | 'prime';
  requirements?: string[];
}

// ==================== More 模块类型 ====================

/**
 * Agent 类型
 */
export interface AgentInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  icon?: string;
  tags?: string[];
}

/**
 * Prompt 模板
 */
export interface PromptTemplate {
  id: string;
  title: string;
  content: string;
  category: string;
  variables?: string[];
  examples?: string[];
}

/**
 * Workflow 定义
 */
export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  category: string;
}

/**
 * Workflow 步骤
 */
export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  action: string;
  params?: Record<string, unknown>;
}

// ==================== Home 模块类型 ====================

/**
 * 粒子配置
 */
export interface ParticleConfig {
  spacing: number;
  friction: number;
  spring: number;
  mouseForce: number;
  mouseRadius: number;
  connectDist: number;
}

/**
 * 鼠标位置
 */
export interface MousePosition {
  x: number;
  y: number;
}

/**
 * 粒子接口
 */
export interface IParticle {
  readonly id: number;
  readonly ox: number;
  readonly oy: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  update(mouse: MousePosition): void;
  draw(ctx: CanvasRenderingContext2D): void;
}

// ==================== 导出所有类型 ====================

export type {
  ModuleLoaderFn,
  ModuleMap,
  ModuleRegisterFn,
  ScraperSite,
  ScraperStatus,
  CustomerReview,
  ScrapedProduct,
  ScrapedData,
  ScrapedDataMetadata,
  ProxyConfig,
  FetchOptions,
  StatusCallback,
  ProductData,
  DataOptions,
  LLMConfig,
  AnalysisReport,
  AnalysisReportMetadata,
  BulletAnalysis,
  OverallStrategy,
  FunctionSceneMatrix,
  SellingPoints,
  CriticalIssue,
  ExpectationGap,
  RiskAssessment,
  FatalFlaws,
  WowMoment,
  WowMoments,
  HesitationPoint,
  HesitationPoints,
  BuyerType,
  Demographics,
  BuyerProfile,
  AnalysisModuleConfig,
  GridStackNode,
  GridStackInstance,
  GridStackWidget,
  GeneratedPromptType,
  GeneratedPromptProfileSnapshot,
  GeneratedPromptRecord,
  HistoryPromptResults,
  HistoryItem,
  KeywordMatchResult,
  AnalysisResult,
  WordFrequency,
  KeywordTrackerSettings,
  NPIStage,
  SiteCode,
  AdsStrategy,
  ProductDecision,
  NPIProductRecord,
  StageConfig,
  StageConfigMap,
  SiteFlagsMap,
  SiteDomainsMap,
  ComplianceStatus,
  EmailTemplateType,
  EmailTemplate,
  RestrictedWordCategory,
  RestrictedWord,
  KnowledgeArticleType,
  KnowledgeArticle,
  MarketingEvent,
  PromotionTool,
  AgentInfo,
  PromptTemplate,
  WorkflowDefinition,
  WorkflowStep,
  ParticleConfig,
  MousePosition,
  IParticle
};

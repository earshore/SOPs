// src/types/modules-business.d.ts
// ================================================================
// 业务模块类型定义
// 为各业务模块提供完整的类型约束
// ================================================================

// ==================== 通用模块类型 ====================

/**
 * 模块加载器函数类型
 */
export type ModuleLoaderFn = () => Promise<any>;

/**
 * 模块映射类型
 */
export type ModuleMap = Record<string, ModuleLoaderFn>;

/**
 * 模块注册函数类型
 */
export type ModuleRegisterFn = (routeId: string, loader: ModuleLoaderFn) => void | boolean;

// ==================== Master Prompt 模块类型 ====================

/**
 * 采集站点类型
 */
export type ScraperSite = 'amazon.com' | 'amazon.de' | 'amazon.co.uk' | 'amazon.fr' | 'amazon.it' | 'amazon.es' | 'amazon.ca' | 'amazon.co.jp';

/**
 * 采集状态
 */
export type ScraperStatus = 'pending' | 'scraping' | 'success' | 'failed';

/**
 * 客户评论
 */
export interface CustomerReview {
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
  type?: 'allorigins' | 'corsproxy' | 'corsanywhere' | 'scraperapi' | 'zenrows' | 'brightdata' | 'custom_api' | 'custom_proxy' | 'custom';
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
  models?: Array<{ id: string; context: number }>;
}

/**
 * 分析报告
 */
export interface AnalysisReport {
  targetMarket?: string;
  language?: string;
  templateUsed?: string;
  templateId?: string;
  generatedAt?: number;
  meta?: Record<string, unknown>;
  parse_error?: boolean;
  raw_response?: string;
  error_detail?: string;
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

/**
 * 历史记录项
 */
export interface HistoryItem {
  id: string | number;
  timestamp: string;
  site: string;
  asins: string[];
  data: any;
  report: any;
  // 向后兼容旧格式
  asin?: string;
  product?: ScrapedProduct;
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
  params?: Record<string, any>;
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
  ProxyConfig,
  FetchOptions,
  StatusCallback,
  ProductData,
  DataOptions,
  LLMConfig,
  AnalysisReport,
  AnalysisModuleConfig,
  GridStackNode,
  GridStackInstance,
  GridStackWidget,
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

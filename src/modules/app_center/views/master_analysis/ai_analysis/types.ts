/**
 * AI智能分析 - 类型定义
 */

/**
 * 分析目标配置
 */
export interface AnalysisTarget {
  id: string;
  name: string;
  description: string;
  source: 'Listings' | 'Reviews';
  icon: string;
  color: string;
}

/**
 * 分析结果
 * 注意：icon 和 color 已从此接口移除，应通过 targetId 从 analysisTargets 配置中查找
 */
export interface AnalysisResult {
  targetId: string;
  title: string;
  source: 'Listings' | 'Reviews';
  stats: { label: string; value: string }[];
  highlights: { text: string; type: 'danger' | 'success' | 'warning' | 'info' }[];
  details: { category: string; items: string[] }[];
}

/**
 * Scraper 产品数据接口
 */
export interface ScraperProduct {
  asin: string;
  productTitle?: string;
  title?: string;
  feature_bullets?: string[];
  bulletPoints?: string[];
  bullet_points?: string[];
  customer_reviews?: ScraperReview[];
  reviews?: ScraperReview[];
  [key: string]: unknown;
}

/**
 * Scraper 评论数据接口
 */
export interface ScraperReview {
  star_rating?: number;
  rating?: number;
  headline?: string;
  review_title?: string;
  title?: string;
  body?: string;
  review_text?: string;
  text?: string;
  content?: string;
  origin_country?: string;
  review_date?: string;
  _origin_site?: string;
  [key: string]: unknown;
}

/**
 * Scraper 数据接口
 */
export interface ScraperData {
  products: ScraperProduct[];
  metadata?: {
    marketplace?: string;
    scrape_timestamp?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Alpine 组件上下文接口
 */
export interface AlpineContext {
  selectedAsins: string[];
  selectedTargets: string[];
  isAnalyzing: boolean;
  progress: number;
  currentStep: string;
  analysisReport: unknown;
  hasReport: boolean; // 是否有报告（用于强制触发 UI 更新）
  expandedPromptIndex: number | null;
  showPromptPanel: boolean;
  showJsonViewer: boolean;
  useRealData: boolean;
  dataSource: 'sample' | 'scraper';
  showDataSourceBanner: boolean;
  availableAsins: string[];
  hasData: boolean;
  canAnalyze: boolean;
  syncFromModuleState: () => void;
  syncToModuleState: () => void;
  $nextTick: (callback: () => void) => void;
}

/**
 * 历史报告详情
 */
export interface HistoricalReportDetail {
  report: unknown;
  timestamp: string;
}

/**
 * 报告元数据
 */
export interface ReportMetadata {
  asins: string[];
  targets: string[];
  timestamp: string;
  dataSource: string;
  marketplace: string;
  productTitle?: string; // 产品标题（用于显示）
}

/**
 * 完整报告数据
 * 注意：只保留原始 analysisReport，不包含转换后的 results
 */
export interface FullReportData {
  metadata: ReportMetadata;
  analysisReport: unknown;
}

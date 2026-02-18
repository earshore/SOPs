/**
 * 业务模块类型定义
 * 为业务逻辑提供类型安全
 */

// ==================== Scraper 模块 ====================

/**
 * 抓取的产品数据
 */
export interface ScrapedProduct {
  asin: string;
  title?: string;
  price?: string | number;
  rating?: number;
  reviews_count?: number;
  image_url?: string;
  scrape_status?: 'success' | 'failed' | 'pending';
  error?: string;
  [key: string]: unknown;
}

/**
 * 抓取数据结构
 */
export interface ScrapedData {
  products: ScrapedProduct[];
  metadata?: {
    scrape_timestamp?: string;
    marketplace?: string;
    total_count?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// ==================== History 模块 ====================

/**
 * 历史记录项
 */
export interface HistoryItem {
  id: number | string;
  timestamp: string;
  site: string;
  asins: string[];
  data: ScrapedData;
  report?: AnalysisReport;
  analysisStatus?: {
    isAnalyzed: boolean;
    timestamp?: string;
  };
}

/**
 * 缓存的产品数据
 */
export interface CachedProduct {
  product: ScrapedProduct;
  timestamp: string;
}

// ==================== Analysis 模块 ====================

/**
 * 分析报告
 */
export interface AnalysisReport {
  summary?: string;
  insights?: string[];
  recommendations?: string[];
  timestamp?: string;
  [key: string]: unknown;
}

/**
 * 产品分析数据
 */
export interface ProductAnalysis {
  asin: string;
  title?: string;
  price?: string | number;
  rating?: number;
  reviews_count?: number;
  analysis?: AnalysisReport;
  [key: string]: unknown;
}

// ==================== Promotions 模块 ====================

/**
 * 促销表格数据
 */
export interface PromotionTableData {
  headers?: string[];
  rows?: string[][];
  items?: PromotionItem[];
}

/**
 * 促销项
 */
export interface PromotionItem {
  id: string | number;
  name?: string;
  type?: string;
  discount?: string | number;
  startDate?: string;
  endDate?: string;
  [key: string]: unknown;
}

// ==================== Chart 模块 ====================

/**
 * 图表实例类型 (ECharts)
 */
export type ChartInstance = {
  setOption: (option: unknown) => void;
  resize: () => void;
  dispose: () => void;
  clear: () => void;
  [key: string]: unknown;
} | null;

// ==================== 通用类型 ====================

/**
 * 动作注册表
 */
export type ActionRegistry = Record<string, (...args: unknown[]) => void>;

/**
 * 事件详情
 */
export interface EventDetail {
  report?: AnalysisReport;
  timestamp?: string;
  [key: string]: unknown;
}

/**
 * JSON解析结果
 */
export type ParsedJSON = Record<string, unknown> | unknown[] | string | number | boolean | null;

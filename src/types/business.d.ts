/**
 * 业务模块类型定义
 * 为业务逻辑提供类型安全
 */

// 从主类型文件导入 AnalysisReport 和 ScrapedData
import type { AnalysisReport, ScrapedData, ScrapedDataMetadata } from './modules-business';

// 重新导出以保持向后兼容
export type { AnalysisReport, ScrapedData, ScrapedDataMetadata };

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

// ScrapedData 和 ScrapedDataMetadata 已从 modules-business.d.ts 导入并重新导出

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

// AnalysisReport 已从 modules-business.d.ts 导入并重新导出

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

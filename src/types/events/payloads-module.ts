// src/types/events/payloads-module.ts
// ================================================================
// 模块特定事件 Payload 类型定义
// ================================================================
/**
 * SOPs搜索更新事件
 */
export interface SOPsSearchUpdatedEventPayload {
  query: string;
  results: unknown[];
  timestamp: number;
}

/**
 * SOPs分类变更事件
 */
export interface SOPsCategoryChangedEventPayload {
  category: string;
  timestamp: number;
}

/**
 * Scraper抓取开始事件
 */
export interface ScraperScrapeStartEventPayload {
  asins: string[];
  site: string;
  timestamp: number;
}

/**
 * Scraper抓取成功事件
 */
export interface ScraperScrapeSuccessEventPayload {
  data: unknown;
  duration: number;
  timestamp: number;
}

/**
 * Scraper抓取错误事件
 */
export interface ScraperScrapeErrorEventPayload {
  error: Error;
  asins?: string[];
  timestamp: number;
}

/**
 * Analysis分析开始事件
 */
export interface AnalysisAnalyzeStartEventPayload {
  asins: string[];
  type: string;
  timestamp: number;
}

/**
 * Analysis分析成功事件
 */
export interface AnalysisAnalyzeSuccessEventPayload {
  report: unknown;
  duration: number;
  timestamp: number;
}

/**
 * Analysis分析错误事件
 */
export interface AnalysisAnalyzeErrorEventPayload {
  error: Error;
  asins?: string[];
  timestamp: number;
}

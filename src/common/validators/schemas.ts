/**
 * schemas.ts - 运行时类型校验 Schema
 *
 * 使用 Zod 进行运行时类型检查
 */

import { z } from 'zod';

// ==================== 路由相关 Schema ====================

/**
 * 路由配置 Schema
 */
export const RouteConfigSchema = z.object({
  moduleId: z.string(),
  label: z.string(),
  icon: z.string(),
  panelId: z.string(),
  category: z.string().optional(),
});

/**
 * 模块配置 Schema
 */
export const ModuleConfigSchema = z.object({
  id: z.string(),
  contextId: z.string(),
  title: z.string(),
  version: z.string(),
  icon: z.string(),
  description: z.string(),
});

/**
 * 上下文配置 Schema
 */
export const ContextConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
});

// ==================== 状态管理 Schema ====================

/**
 * UI 状态 Schema
 */
export const UIStateSchema = z.object({
  currentTab: z.string(),
  currentDataTab: z.string(),
  currentReportTab: z.string(),
});

/**
 * Scraper 状态 Schema
 */
export const ScraperStateSchema = z.object({
  isScraping: z.boolean(),
  selectedSite: z.string(),
  scrapedData: z.any().nullable(),
  currentHistoryId: z.union([z.string(), z.number(), z.null()]),
});

/**
 * 完整状态对象 Schema
 */
export const StateSchema = z.object({
  ui: UIStateSchema,
  scraper: ScraperStateSchema,
  // 可以继续添加其他命名空间
});

// ==================== LLM 配置 Schema ====================

/**
 * LLM 模型 Schema（字符串或对象）
 */
export const LLMModelSchema = z.union([
  z.string(),
  z.object({
    id: z.string(),
    name: z.string().optional(),
    context: z.number().positive().optional(),
    features: z.array(z.string()).optional(),
    description: z.string().optional(),
  }),
]);

/**
 * LLM 配置 Schema
 */
export const LLMConfigSchema = z.object({
  endpoint: z.string().url(),
  apiKey: z.string().min(1),
  model: z.string(),
  models: z.array(LLMModelSchema),
});

/**
 * LLM 请求选项 Schema
 */
export const LLMRequestOptionsSchema = z.object({
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  jsonMode: z.boolean().optional(),
  timeout: z.number().positive().optional(),
  retries: z.number().int().nonnegative().optional(),
  retryDelay: z.number().positive().optional(),
});

// ==================== 代理配置 Schema ====================

/**
 * 代理配置 Schema
 */
export const ProxyConfigSchema = z.object({
  type: z.enum(['scraperapi', 'zenrows', 'brightdata', 'custom_api', 'custom_proxy']),
  customUrl: z.string().optional(),
});

// ==================== HTTP 请求 Schema ====================

/**
 * HTTP 请求选项 Schema
 */
export const HTTPRequestOptionsSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.any().optional(),
  timeout: z.number().positive().optional(),
  retries: z.number().int().nonnegative().optional(),
});

// ==================== 事件日志 Schema ====================

/**
 * 事件日志条目 Schema
 */
export const EventLogEntrySchema = z.object({
  timestamp: z.string(),
  eventName: z.string(),
  detail: z.any(),
  target: z.string(),
});

// ==================== 导出所有 Schema ====================

export default {
  RouteConfigSchema,
  ModuleConfigSchema,
  ContextConfigSchema,
  UIStateSchema,
  ScraperStateSchema,
  StateSchema,
  LLMModelSchema,
  LLMConfigSchema,
  LLMRequestOptionsSchema,
  ProxyConfigSchema,
  HTTPRequestOptionsSchema,
  EventLogEntrySchema,
};

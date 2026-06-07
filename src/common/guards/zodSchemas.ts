// src/common/guards/zodSchemas.ts
// ================================================================
// Zod Schema 定义
// 为核心类型提供运行时验证
// ================================================================

import { z } from 'zod';

// ==================== State Schemas ====================

/**
 * UserProductProfile Schema
 */
export const UserProductProfileSchema = z.object({
  targetMarket: z.enum(['English', 'German', 'French', 'Italian', 'Spanish', 'Japanese', 'Chinese', '']),
  keywordsTier1: z.string(),
  keywordsTier2: z.string(),
  audience: z.string(),
  usps: z.string(),
  specs: z.string(),
  socialHook: z.string(),
  negative: z.string(),
  tone: z.enum(['professional', 'casual', 'friendly', 'formal', 'enthusiastic', 'persuasive', '']),
  customStrategy: z.string(),
  useRufus: z.boolean(),
  useEmoji: z.boolean(),
  useCosmo: z.boolean(),
  selectedReportSections: z.array(z.string()),
  charLimit: z.number().min(100).max(10000)
});

/**
 * ScrapedDataItem Schema
 */
export const ScrapedDataItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  price: z.number().optional(),
  rating: z.number().optional(),
  reviews: z.number().optional(),
  url: z.string().optional(),
  image: z.string().optional()
}).passthrough(); // 允许额外的字段

/**
 * PromptHistoryItem Schema
 */
export const PromptHistoryItemSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  response: z.string(),
  timestamp: z.number(),
  model: z.string().optional(),
  tokens: z.number().optional()
});

/**
 * KeywordData Schema
 */
export const KeywordDataSchema = z.object({
  keyword: z.string(),
  searchVolume: z.number().optional(),
  competition: z.enum(['low', 'medium', 'high']).optional(),
  cpc: z.number().optional(),
  trend: z.array(z.number()).optional()
});

/**
 * TrackingData Schema
 */
export const TrackingDataSchema = z.object({
  asin: z.string(),
  keywords: z.array(KeywordDataSchema),
  lastUpdated: z.number(),
  coverage: z.number().optional()
});

/**
 * UIState Schema
 */
export const UIStateSchema = z.object({
  currentTab: z.string(),
  currentDataTab: z.string(),
  currentReportTab: z.string(),
  sidebarCollapsed: z.boolean().optional(),
  theme: z.enum(['light', 'dark', 'auto']).optional(),
  loading: z.boolean().optional()
});

/**
 * ScraperState Schema
 */
export const ScraperStateSchema = z.object({
  isScraping: z.boolean(),
  selectedSite: z.union([
    z.enum(['US', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'PL', 'BE', 'IE', 'UK', 'CA', 'JP']),
    z.literal('')
  ]),
  scrapedData: z.union([z.array(ScrapedDataItemSchema), z.any(), z.null()]),
  currentHistoryId: z.union([z.string(), z.number(), z.null()])
});

/**
 * AnalysisState Schema
 */
export const AnalysisStateSchema = z.object({
  selectedAsins: z.array(z.string())
});

/**
 * PromptLabState Schema
 */
export const PromptLabStateSchema = z.object({
  currentPrompt: z.string().optional(),
  history: z.array(PromptHistoryItemSchema).optional(),
  userProductProfile: UserProductProfileSchema.optional()
});

/**
 * LLMProviderConfig Schema
 */
export const LLMProviderConfigSchema = z.object({
  provider: z.string(),
  endpoint: z.string(),
  apiKey: z.string(),
  model: z.string(),
  enabled: z.boolean()
});

/**
 * ProxyConfig Schema
 */
export const ProxyConfigSchema = z.object({
  enabled: z.boolean(),
  host: z.string().optional(),
  port: z.number().optional()
});

// ==================== API Schemas ====================

/**
 * ApiError Schema
 */
export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.string().optional(),
  statusCode: z.number().optional()
});

/**
 * ApiResponse Schema (泛型)
 */
export const createApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: ApiErrorSchema.optional()
  });

/**
 * LLMMessage Schema
 */
export const LLMMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string()
});

/**
 * LLMModel Schema
 */
export const LLMModelSchema = z.object({
  id: z.string(),
  object: z.literal('model')
});

/**
 * LLMChatCompletionResponse Schema
 */
export const LLMChatCompletionResponseSchema = z.object({
  id: z.string(),
  object: z.literal('chat.completion'),
  created: z.number(),
  model: z.string(),
  choices: z.array(
    z.object({
      index: z.number(),
      message: LLMMessageSchema,
      finish_reason: z.union([
        z.literal('stop'),
        z.literal('length'),
        z.literal('function_call'),
        z.literal('content_filter'),
        z.null()
      ])
    })
  ).min(1)
});

/**
 * AmazonProductData Schema
 */
export const AmazonProductDataSchema = z.object({
  asin: z.string(),
  title: z.string(),
  scrapedAt: z.number(),
  price: z.number().optional(),
  rating: z.number().optional(),
  reviewCount: z.number().optional()
});

/**
 * AnalysisSection Schema (递归)
 * 使用 z.lazy 处理递归类型
 */
export const AnalysisSectionSchema: z.ZodType<{
  id: string;
  title: string;
  content: string;
  subsections?: unknown[];
}> = z.lazy(() =>
  z.object({
    id: z.string(),
    title: z.string(),
    content: z.string(),
    subsections: z.array(AnalysisSectionSchema).optional()
  })
);

/**
 * AnalysisReportResponse Schema
 */
export const AnalysisReportResponseSchema = z.object({
  id: z.string(),
  type: z.enum(['overview', 'detailed', 'comparison', 'trend']),
  title: z.string(),
  generatedAt: z.number(),
  sections: z.array(AnalysisSectionSchema)
});

/**
 * AnalysisReport Schema (简化版本)
 */
export const AnalysisReportSchema = z.object({
  marketplace: z.string(),
  results: z.array(z.any())
});

// ==================== Event Schemas ====================

/**
 * RouteChangedEventPayload Schema
 */
export const RouteChangedEventPayloadSchema = z.object({
  routeId: z.string(),
  config: z.any(),
  to: z.object({
    path: z.string()
  })
});

/**
 * ModuleLoadedEventPayload Schema
 */
export const ModuleLoadedEventPayloadSchema = z.object({
  moduleId: z.string(),
  moduleName: z.string(),
  timestamp: z.number(),
  duration: z.number(),
  success: z.boolean()
});

/**
 * StateChangedEventPayload Schema (泛型)
 */
export const createStateChangedEventPayloadSchema = <T extends z.ZodTypeAny>(valueSchema: T) =>
  z.object({
    path: z.string(),
    newValue: valueSchema,
    oldValue: valueSchema,
    timestamp: z.number()
  });

/**
 * ErrorOccurredEventPayload Schema
 */
export const ErrorOccurredEventPayloadSchema = z.object({
  error: z.instanceof(Error),
  timestamp: z.number(),
  module: z.string().optional(),
  action: z.string().optional()
});

/**
 * PerformanceMetricEventPayload Schema
 */
export const PerformanceMetricEventPayloadSchema = z.object({
  name: z.string(),
  duration: z.number(),
  timestamp: z.number(),
  type: z.enum(['module-load', 'api-call', 'render', 'custom'])
});

// ==================== 导出类型推断 ====================

export type UserProductProfile = z.infer<typeof UserProductProfileSchema>;
export type ScrapedDataItem = z.infer<typeof ScrapedDataItemSchema>;
export type PromptHistoryItem = z.infer<typeof PromptHistoryItemSchema>;
export type KeywordData = z.infer<typeof KeywordDataSchema>;
export type TrackingData = z.infer<typeof TrackingDataSchema>;
export type UIState = z.infer<typeof UIStateSchema>;
export type ScraperState = z.infer<typeof ScraperStateSchema>;
export type AnalysisState = z.infer<typeof AnalysisStateSchema>;
export type PromptLabState = z.infer<typeof PromptLabStateSchema>;
export type LLMProviderConfig = z.infer<typeof LLMProviderConfigSchema>;
export type ProxyConfig = z.infer<typeof ProxyConfigSchema>;

export type ApiError = z.infer<typeof ApiErrorSchema>;
export type LLMMessage = z.infer<typeof LLMMessageSchema>;
export type LLMModel = z.infer<typeof LLMModelSchema>;
export type LLMChatCompletionResponse = z.infer<typeof LLMChatCompletionResponseSchema>;
export type AmazonProductData = z.infer<typeof AmazonProductDataSchema>;
export type AnalysisSection = z.infer<typeof AnalysisSectionSchema>;
export type AnalysisReportResponse = z.infer<typeof AnalysisReportResponseSchema>;
export type AnalysisReport = z.infer<typeof AnalysisReportSchema>;

export type RouteChangedEventPayload = z.infer<typeof RouteChangedEventPayloadSchema>;
export type ModuleLoadedEventPayload = z.infer<typeof ModuleLoadedEventPayloadSchema>;
export type ErrorOccurredEventPayload = z.infer<typeof ErrorOccurredEventPayloadSchema>;
export type PerformanceMetricEventPayload = z.infer<typeof PerformanceMetricEventPayloadSchema>;

// src/common/guards/zodSchemas.ts
// ================================================================
// Zod Schema 定义
// 为核心类型提供运行时验证
// ================================================================

import { z } from 'zod';
import { SCRAPER_PROXY_TYPE_VALUES } from '@/common/config/scraperProxies';

// ==================== State Schemas ====================

/**
 * UserProductProfile Schema
 */
export const UserProductProfileSchema = z.object({
  targetMarket: z.enum([
    'English',
    'German',
    'French',
    'Italian',
    'Spanish',
    'Japanese',
    'Chinese',
    '',
  ]),
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
  reportFingerprint: z.string().optional(),
  charLimit: z.number().min(100).max(10000),
});

/**
 * ScrapedDataItem Schema
 */
export const ScrapedDataItemSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    price: z.number().optional(),
    rating: z.number().optional(),
    reviews: z.number().optional(),
    url: z.string().optional(),
    image: z.string().optional(),
  })
  .passthrough(); // 允许额外的字段

/**
 * PromptHistoryItem Schema
 */
export const PromptHistoryItemSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  response: z.string(),
  timestamp: z.number(),
  model: z.string().optional(),
  tokens: z.number().optional(),
  promptType: z.enum(['listing', 'visual']).optional(),
  generatedAt: z.string().optional(),
  historyId: z.union([z.string(), z.number(), z.null()]).optional(),
  sourceHistoryId: z.union([z.string(), z.number(), z.null()]).optional(),
  sourceDataFingerprint: z.string().optional(),
  reportFingerprint: z.string().optional(),
  asins: z.array(z.string()).optional(),
  marketplace: z.string().optional(),
  profile: z.record(z.string(), z.unknown()).optional(),
});

/**
 * KeywordData Schema
 */
export const KeywordDataSchema = z.object({
  keyword: z.string(),
  searchVolume: z.number().optional(),
  competition: z.enum(['low', 'medium', 'high']).optional(),
  cpc: z.number().optional(),
  trend: z.array(z.number()).optional(),
});

/**
 * TrackingData Schema
 */
export const TrackingDataSchema = z.object({
  asin: z.string(),
  keywords: z.array(KeywordDataSchema),
  lastUpdated: z.number(),
  coverage: z.number().optional(),
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
  loading: z.boolean().optional(),
});

/**
 * ScraperState Schema
 */
export const ScraperStateSchema = z.object({
  isScraping: z.boolean(),
  selectedSite: z.union([
    z.enum(['US', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'PL', 'BE', 'IE', 'UK', 'CA', 'JP']),
    z.literal(''),
  ]),
  scrapedData: z.union([z.array(ScrapedDataItemSchema), z.any(), z.null()]),
  currentHistoryId: z.union([z.string(), z.number(), z.null()]),
});

/**
 * AnalysisState Schema
 */
export const AnalysisStateSchema = z.object({
  selectedAsins: z.array(z.string()),
});

/**
 * PromptLabState Schema
 */
export const PromptLabStateSchema = z.object({
  currentPrompt: z.string().optional(),
  history: z.array(PromptHistoryItemSchema).optional(),
  userProductProfile: UserProductProfileSchema.optional(),
});

/**
 * LLMProviderConfig Schema
 */
export const LLMProviderConfigSchema = z.object({
  provider: z.string(),
  endpoint: z.string(),
  apiKey: z.string(),
  model: z.string(),
  models: z
    .array(
      z.union([
        z.string(),
        z.object({
          id: z.string(),
          name: z.string().optional(),
          context: z.number().optional(),
          features: z.array(z.string()).optional(),
        }),
      ])
    )
    .optional(),
  serviceTier: z.enum(['auto', 'default', 'flex', 'priority']).optional(),
  reasoningPrefs: z
    .object({
      enabled: z.boolean(),
      effort: z.enum(['low', 'medium', 'high']),
    })
    .optional(),
  apiPath: z
    .enum(['chat_completions', 'responses', 'anthropic_messages', 'gemini_generate'])
    .optional(),
  enabled: z.boolean(),
});

/**
 * ProxyConfig Schema
 */
export const ProxyConfigSchema = z.object({
  type: z.enum(SCRAPER_PROXY_TYPE_VALUES).optional(),
  customUrl: z.string().optional(),
  enabled: z.boolean().optional(),
  host: z.string().optional(),
  port: z.number().optional(),
  auth: z
    .object({
      username: z.string(),
      password: z.string(),
    })
    .optional(),
});

// ==================== API Schemas ====================

/**
 * ApiError Schema
 */
export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.string().optional(),
  statusCode: z.number().optional(),
});

/**
 * ApiResponse Schema (泛型)
 */
export const createApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: ApiErrorSchema.optional(),
  });

/**
 * LLMMessage Schema — modern OpenAI chat shapes (nullable content, tool_calls).
 */
export const LLMMessageSchema = z
  .object({
    role: z.union([z.enum(['system', 'user', 'assistant', 'tool', 'developer']), z.string()]),
    // Official: string | null | content parts array (some gateways omit / vary).
    content: z.union([z.string(), z.null(), z.array(z.unknown())]).optional(),
    name: z.string().optional(),
    tool_calls: z.array(z.unknown()).optional(),
    tool_call_id: z.string().optional(),
    refusal: z.union([z.string(), z.null()]).optional(),
    reasoning_content: z.union([z.string(), z.null()]).optional(),
    function_call: z
      .object({
        name: z.string(),
        arguments: z.string(),
      })
      .optional(),
  })
  .passthrough();

/**
 * LLMModel Schema
 */
export const LLMModelSchema = z.object({
  id: z.string(),
  object: z.literal('model'),
});

/**
 * LLMChatCompletionResponse Schema — gateways may vary object/extra fields.
 * id/object optional: some proxies omit them on tool-loop hops.
 */
export const LLMChatCompletionResponseSchema = z
  .object({
    id: z.string().optional(),
    object: z.string().optional(),
    created: z.number().optional(),
    model: z.string().optional(),
    choices: z
      .array(
        z
          .object({
            index: z.number().optional(),
            message: LLMMessageSchema,
            finish_reason: z
              .union([
                z.literal('stop'),
                z.literal('length'),
                z.literal('tool_calls'),
                z.literal('function_call'),
                z.literal('content_filter'),
                z.null(),
                z.string(),
              ])
              .optional(),
          })
          .passthrough()
      )
      .min(1),
  })
  .passthrough();

/**
 * AmazonProductData Schema
 */
export const AmazonProductDataSchema = z.object({
  asin: z.string(),
  title: z.string(),
  scrapedAt: z.number(),
  price: z.number().optional(),
  rating: z.number().optional(),
  reviewCount: z.number().optional(),
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
    subsections: z.array(AnalysisSectionSchema).optional(),
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
  sections: z.array(AnalysisSectionSchema),
});

/**
 * AnalysisReport Schema (简化版本)
 */
export const AnalysisReportSchema = z.object({
  marketplace: z.string(),
  results: z.array(z.any()),
});

// ==================== Event Schemas ====================

/**
 * RouteChangedEventPayload Schema
 */
export const RouteChangedEventPayloadSchema = z.object({
  routeId: z.string(),
  config: z.any(),
  to: z.object({
    path: z.string(),
  }),
});

/**
 * ModuleLoadedEventPayload Schema
 */
export const ModuleLoadedEventPayloadSchema = z.object({
  moduleId: z.string(),
  moduleName: z.string(),
  timestamp: z.number(),
  duration: z.number(),
  success: z.boolean(),
});

/**
 * StateChangedEventPayload Schema (泛型)
 */
export const createStateChangedEventPayloadSchema = <T extends z.ZodTypeAny>(valueSchema: T) =>
  z.object({
    path: z.string(),
    newValue: valueSchema,
    oldValue: valueSchema,
    timestamp: z.number(),
  });

/**
 * ErrorOccurredEventPayload Schema
 */
export const ErrorOccurredEventPayloadSchema = z.object({
  error: z.instanceof(Error),
  timestamp: z.number(),
  module: z.string().optional(),
  action: z.string().optional(),
});

/**
 * PerformanceMetricEventPayload Schema
 */
export const PerformanceMetricEventPayloadSchema = z.object({
  name: z.string(),
  duration: z.number(),
  timestamp: z.number(),
  type: z.enum(['module-load', 'api-call', 'render', 'custom']),
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

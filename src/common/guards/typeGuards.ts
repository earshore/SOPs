// src/common/guards/typeGuards.ts
// ================================================================
// 类型守卫函数
// 为核心类型提供运行时类型检查
// 集成 Zod 进行运行时验证
// ================================================================

import type {
  UserProductProfile,
  ScrapedDataItem,
  PromptHistoryItem,
  KeywordData,
  TrackingData,
  UIState,
  ScraperState,
  AnalysisState,
  PromptLabState,
  LLMProviderConfig,
  ProxyConfig
} from '../../types/state';

import type {
  ApiResponse,
  ApiError,
  LLMChatCompletionResponse,
  LLMMessage,
  LLMModel,
  AmazonProductData,
  AnalysisReportResponse,
  AnalysisSection
} from '../../types/api';

import type {
  RouteChangedEventPayload,
  ModuleLoadedEventPayload,
  StateChangedEventPayload,
  ErrorOccurredEventPayload,
  PerformanceMetricEventPayload
} from '../../types/events';

import type { AnalysisReport } from '../../types/modules-business';

// 导入 Zod schemas
import {
  UserProductProfileSchema,
  ScrapedDataItemSchema,
  PromptHistoryItemSchema,
  KeywordDataSchema,
  TrackingDataSchema,
  UIStateSchema,
  ScraperStateSchema,
  AnalysisStateSchema,
  PromptLabStateSchema,
  LLMProviderConfigSchema,
  ProxyConfigSchema,
  ApiErrorSchema,
  LLMMessageSchema,
  LLMModelSchema,
  LLMChatCompletionResponseSchema,
  AmazonProductDataSchema,
  AnalysisSectionSchema,
  AnalysisReportResponseSchema,
  AnalysisReportSchema,
  RouteChangedEventPayloadSchema,
  ModuleLoadedEventPayloadSchema,
  ErrorOccurredEventPayloadSchema,
  PerformanceMetricEventPayloadSchema
} from './zodSchemas';

// ==================== 基础类型守卫工具 ====================

/**
 * 检查值是否为对象
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 检查值是否为字符串
 */
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * 检查值是否为数字
 */
function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * 检查值是否为布尔值
 */
function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * 检查值是否为数组
 */
function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * 检查对象是否包含指定的键
 */
function hasKey<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, unknown> {
  return isObject(obj) && key in obj;
}

/**
 * 检查对象是否包含所有指定的键
 */
function hasKeys<K extends string>(
  obj: unknown,
  keys: K[]
): obj is Record<K, unknown> {
  return isObject(obj) && keys.every(key => key in obj);
}

// ==================== State 类型守卫 ====================

/**
 * 检查是否为 UserProductProfile
 * 使用 Zod 进行运行时验证
 */
export function isUserProductProfile(value: unknown): value is UserProductProfile {
  const result = UserProductProfileSchema.safeParse(value);
  return result.success;
}

/**
 * 检查是否为 ScrapedDataItem
 * 使用 Zod 进行运行时验证
 */
export function isScrapedDataItem(value: unknown): value is ScrapedDataItem {
  const result = ScrapedDataItemSchema.safeParse(value);
  return result.success;
}

/**
 * 检查是否为 PromptHistoryItem
 * 使用 Zod 进行运行时验证
 */
export function isPromptHistoryItem(value: unknown): value is PromptHistoryItem {
  const result = PromptHistoryItemSchema.safeParse(value);
  return result.success;
}

/**
 * 检查是否为 KeywordData
 * 使用 Zod 进行运行时验证
 */
export function isKeywordData(value: unknown): value is KeywordData {
  const result = KeywordDataSchema.safeParse(value);
  return result.success;
}

/**
 * 检查是否为 TrackingData
 * 使用 Zod 进行运行时验证
 */
export function isTrackingData(value: unknown): value is TrackingData {
  const result = TrackingDataSchema.safeParse(value);
  return result.success;
}

/**
 * 检查是否为 UIState
 * 使用 Zod 进行运行时验证
 */
export function isUIState(value: unknown): value is UIState {
  const result = UIStateSchema.safeParse(value);
  return result.success;
}

/**
 * 检查是否为 ScraperState
 * 使用 Zod 进行运行时验证
 */
export function isScraperState(value: unknown): value is ScraperState {
  const result = ScraperStateSchema.safeParse(value);
  return result.success;
}

/**
 * 检查是否为 AnalysisState
 * 使用 Zod 进行运行时验证
 */
export function isAnalysisState(value: unknown): value is AnalysisState {
  const result = AnalysisStateSchema.safeParse(value);
  return result.success;
}

/**
 * 检查是否为 PromptLabState
 * 使用 Zod 进行运行时验证
 */
export function isPromptLabState(value: unknown): value is PromptLabState {
  const result = PromptLabStateSchema.safeParse(value);
  return result.success;
}

/**
 * 检查是否为 LLMProviderConfig
 * 使用 Zod 进行运行时验证
 */
export function isLLMProviderConfig(value: unknown): value is LLMProviderConfig {
  const result = LLMProviderConfigSchema.safeParse(value);
  return result.success;
}

/**
 * 检查是否为 ProxyConfig
 * 使用 Zod 进行运行时验证
 */
export function isProxyConfig(value: unknown): value is ProxyConfig {
  const result = ProxyConfigSchema.safeParse(value);
  return result.success;
}

// ==================== API 类型守卫 ====================

/**
 * 检查是否为 ApiError
 * 使用 Zod 进行运行时验证
 */
export function isApiError(value: unknown): value is ApiError {
  const result = ApiErrorSchema.safeParse(value);
  return result.success;
}

/**
 * 检查是否为 ApiResponse
 */
export function isApiResponse<T = any>(
  value: unknown,
  dataGuard?: (data: unknown) => data is T
): value is ApiResponse<T> {
  if (!isObject(value)) return false;

  const hasSuccess = hasKey(value, 'success') && isBoolean(value.success);
  const hasValidData = !hasKey(value, 'data') || value.data === undefined || 
    (dataGuard ? dataGuard(value.data) : true);
  const hasValidError = !hasKey(value, 'error') || value.error === undefined || isApiError(value.error);

  return hasSuccess && hasValidData && hasValidError;
}

/**
 * 检查是否为 LLMMessage
 * 使用 Zod 进行运行时验证
 */
export function isLLMMessage(value: unknown): value is LLMMessage {
  const result = LLMMessageSchema.safeParse(value);
  return result.success;
}

/**
 * 检查是否为 LLMModel
 * 使用 Zod 进行运行时验证
 */
export function isLLMModel(value: unknown): value is LLMModel {
  const result = LLMModelSchema.safeParse(value);
  return result.success;
}

/**
 * 检查是否为 LLMChatCompletionResponse
 * 使用 Zod 进行运行时验证
 */
export function isLLMChatCompletionResponse(value: unknown): value is LLMChatCompletionResponse {
  const result = LLMChatCompletionResponseSchema.safeParse(value);
  return result.success;
}

/**
 * 检查是否为 AmazonProductData
 * 使用 Zod 进行运行时验证
 */
export function isAmazonProductData(value: unknown): value is AmazonProductData {
  const result = AmazonProductDataSchema.safeParse(value);
  return result.success;
}

/**
 * 检查是否为 AnalysisSection
 * 使用 Zod 进行运行时验证
 */
export function isAnalysisSection(value: unknown): value is AnalysisSection {
  const result = AnalysisSectionSchema.safeParse(value);
  return result.success;
}

/**
 * 检查是否为 AnalysisReportResponse
 * 使用 Zod 进行运行时验证
 */
export function isAnalysisReportResponse(value: unknown): value is AnalysisReportResponse {
  const result = AnalysisReportResponseSchema.safeParse(value);
  return result.success;
}

/**
 * 检查是否为 AnalysisReport (从 modules-business 导入的类型)
 * 使用 Zod 进行运行时验证
 */
export function isAnalysisReport(value: unknown): value is AnalysisReport {
  const result = AnalysisReportSchema.safeParse(value);
  return result.success;
}

// ==================== Event 类型守卫 ====================

/**
 * 检查是否为 RouteChangedEventPayload
 * 使用 Zod 进行运行时验证
 */
export function isRouteChangedEventPayload(value: unknown): value is RouteChangedEventPayload {
  const result = RouteChangedEventPayloadSchema.safeParse(value);
  return result.success;
}

/**
 * 检查是否为 ModuleLoadedEventPayload
 * 使用 Zod 进行运行时验证
 */
export function isModuleLoadedEventPayload(value: unknown): value is ModuleLoadedEventPayload {
  const result = ModuleLoadedEventPayloadSchema.safeParse(value);
  return result.success;
}

/**
 * 检查是否为 StateChangedEventPayload
 */
export function isStateChangedEventPayload<T = any>(
  value: unknown,
  valueGuard?: (val: unknown) => val is T
): value is StateChangedEventPayload<T> {
  if (!isObject(value)) return false;

  const hasValidValues = !valueGuard || 
    (hasKey(value, 'newValue') && valueGuard(value.newValue) &&
     hasKey(value, 'oldValue') && valueGuard(value.oldValue));

  return (
    hasKey(value, 'path') && isString(value.path) &&
    hasKey(value, 'timestamp') && isNumber(value.timestamp) &&
    hasValidValues
  );
}

/**
 * 检查是否为 ErrorOccurredEventPayload
 * 使用 Zod 进行运行时验证
 */
export function isErrorOccurredEventPayload(value: unknown): value is ErrorOccurredEventPayload {
  const result = ErrorOccurredEventPayloadSchema.safeParse(value);
  return result.success;
}

/**
 * 检查是否为 PerformanceMetricEventPayload
 * 使用 Zod 进行运行时验证
 */
export function isPerformanceMetricEventPayload(value: unknown): value is PerformanceMetricEventPayload {
  const result = PerformanceMetricEventPayloadSchema.safeParse(value);
  return result.success;
}

// ==================== 组合类型守卫 ====================

/**
 * 检查数组中的所有元素是否符合类型守卫
 */
export function isArrayOf<T>(
  value: unknown,
  guard: (item: unknown) => item is T
): value is T[] {
  return isArray(value) && value.every(guard);
}

/**
 * 检查是否为可选类型（undefined 或符合守卫）
 */
export function isOptional<T>(
  value: unknown,
  guard: (val: unknown) => val is T
): value is T | undefined {
  return value === undefined || guard(value);
}

/**
 * 检查是否为可空类型（null 或符合守卫）
 */
export function isNullable<T>(
  value: unknown,
  guard: (val: unknown) => val is T
): value is T | null {
  return value === null || guard(value);
}

/**
 * 检查是否为可选可空类型（undefined、null 或符合守卫）
 */
export function isOptionalNullable<T>(
  value: unknown,
  guard: (val: unknown) => val is T
): value is T | null | undefined {
  return value === undefined || value === null || guard(value);
}

// ==================== 导出所有类型守卫 ====================

export {
  // 基础工具
  isObject,
  isString,
  isNumber,
  isBoolean,
  isArray,
  hasKey,
  hasKeys
};

// 默认导出所有类型守卫
export default {
  // 基础工具
  isObject,
  isString,
  isNumber,
  isBoolean,
  isArray,
  hasKey,
  hasKeys,
  
  // State 类型守卫
  isUserProductProfile,
  isScrapedDataItem,
  isPromptHistoryItem,
  isKeywordData,
  isTrackingData,
  isUIState,
  isScraperState,
  isAnalysisState,
  isPromptLabState,
  isLLMProviderConfig,
  isProxyConfig,
  
  // API 类型守卫
  isApiError,
  isApiResponse,
  isLLMMessage,
  isLLMModel,
  isLLMChatCompletionResponse,
  isAmazonProductData,
  isAnalysisSection,
  isAnalysisReportResponse,
  isAnalysisReport,
  
  // Event 类型守卫
  isRouteChangedEventPayload,
  isModuleLoadedEventPayload,
  isStateChangedEventPayload,
  isErrorOccurredEventPayload,
  isPerformanceMetricEventPayload,
  
  // 组合类型守卫
  isArrayOf,
  isOptional,
  isNullable,
  isOptionalNullable
};

// src/common/utils/typeGuards.ts
// ================================================================
// 🎯 类型守卫工具 (TypeScript版本)
// 提供运行时类型校验和安全类型转换
// ================================================================

import type { ZodSchema } from 'zod';
import { ValidationError } from '@/common/errors/AppError';
import {
  RouteConfigSchema,
  ModuleConfigSchema,
  LLMConfigSchema,
  ProxyConfigSchema,
  HTTPRequestOptionsSchema,
  LLMRequestOptionsSchema,
} from '../validators/schemas';

const nativeLoggerConsole = globalThis.console;

// ==================== 类型定义 ====================

/**
 * HTTP请求选项
 */
export interface HTTPRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

/**
 * LLM请求选项
 */
export interface LLMRequestOptions {
  temperature?: number;
  jsonMode?: boolean;
  maxTokens?: number;
  serviceTier?: 'auto' | 'default' | 'flex' | 'priority';
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

// ==================== 配置验证函数 ====================

/**
 * 验证路由配置
 * @param config - 待验证的配置
 * @returns 验证是否成功
 * @throws {ValidationError} 验证失败时抛出详细错误
 */
export function validateRouteConfig(config: unknown): boolean {
  try {
    RouteConfigSchema.parse(config);
    return true;
  } catch (error: unknown) {
    const zodError = error as { errors?: unknown[]; message?: string };
    console.error('[TypeGuard] Invalid route config:', zodError.errors);
    throw new ValidationError(
      `Route config validation failed: ${zodError.message || 'Unknown error'}`,
      'ROUTE_CONFIG_VALIDATION_FAILED',
      'config',
      config,
      { module: 'typeGuards', action: 'validateRouteConfig', zodErrors: zodError.errors }
    );
  }
}

/**
 * 验证模块配置
 * @param config - 待验证的配置
 * @returns 验证是否成功
 * @throws {ValidationError} 验证失败时抛出详细错误
 */
export function validateModuleConfig(config: unknown): boolean {
  try {
    ModuleConfigSchema.parse(config);
    return true;
  } catch (error: unknown) {
    const zodError = error as { errors?: unknown[]; message?: string };
    console.error('[TypeGuard] Invalid module config:', zodError.errors);
    throw new ValidationError(
      `Module config validation failed: ${zodError.message || 'Unknown error'}`,
      'MODULE_CONFIG_VALIDATION_FAILED',
      'config',
      config,
      { module: 'typeGuards', action: 'validateModuleConfig', zodErrors: zodError.errors }
    );
  }
}

/**
 * 验证 LLM 配置
 * @param config - 待验证的配置
 * @returns 验证是否成功
 * @throws {ValidationError} 验证失败时抛出详细错误
 */
export function validateLLMConfig(config: unknown): boolean {
  try {
    LLMConfigSchema.parse(config);
    return true;
  } catch (error: unknown) {
    const zodError = error as { errors?: unknown[]; message?: string };
    console.error('[TypeGuard] Invalid LLM config:', zodError.errors);
    throw new ValidationError(
      `LLM config validation failed: ${zodError.message || 'Unknown error'}`,
      'LLM_CONFIG_VALIDATION_FAILED',
      'config',
      config,
      { module: 'typeGuards', action: 'validateLLMConfig', zodErrors: zodError.errors }
    );
  }
}

/**
 * 验证代理配置
 * @param config - 待验证的配置
 * @returns 验证是否成功
 * @throws {ValidationError} 验证失败时抛出详细错误
 */
export function validateProxyConfig(config: unknown): boolean {
  try {
    ProxyConfigSchema.parse(config);
    return true;
  } catch (error: unknown) {
    const zodError = error as { errors?: unknown[]; message?: string };
    console.error('[TypeGuard] Invalid proxy config:', zodError.errors);
    throw new ValidationError(
      `Proxy config validation failed: ${zodError.message || 'Unknown error'}`,
      'PROXY_CONFIG_VALIDATION_FAILED',
      'config',
      config,
      { module: 'typeGuards', action: 'validateProxyConfig', zodErrors: zodError.errors }
    );
  }
}

// ==================== 安全解析函数 ====================

/**
 * 安全的类型转换
 * @template T
 * @param value - 待转换的值
 * @param schema - Zod Schema
 * @param defaultValue - 默认值
 * @returns 解析后的值或默认值
 *
 * @example
 * const config = safeParse(userInput, LLMConfigSchema, defaultConfig);
 */
export function safeParse<T>(value: unknown, schema: ZodSchema<T>, defaultValue: T): T {
  const result = schema.safeParse(value);
  if (result.success) {
    return result.data;
  }
  nativeLoggerConsole.warn('[TypeGuard] Parse failed, using default:', result.error);
  return defaultValue;
}

/**
 * 安全的 HTTP 请求选项解析
 * @param options - 待解析的选项
 * @returns 解析后的选项
 */
export function safeParseHTTPOptions(options: unknown): HTTPRequestOptions {
  return safeParse(options, HTTPRequestOptionsSchema, {
    method: 'GET',
    headers: {},
    timeout: 30000,
    retries: 0,
  });
}

/**
 * 安全的 LLM 请求选项解析
 * @param options - 待解析的选项
 * @returns 解析后的选项
 */
export function safeParseLLMOptions(options: unknown): LLMRequestOptions {
  return safeParse(options, LLMRequestOptionsSchema, {
    temperature: 0.7,
    jsonMode: false,
    timeout: 30000,
    retries: 2,
    retryDelay: 1000,
  });
}

// ==================== 类型守卫函数 ====================

/**
 * 类型断言 - 检查值是否为字符串
 * @param value - 待检查的值
 * @returns 类型守卫结果
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * 类型断言 - 检查值是否为数字
 * @param value - 待检查的值
 * @returns 类型守卫结果
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * 类型断言 - 检查值是否为对象
 * @param value - 待检查的值
 * @returns 类型守卫结果
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * 类型断言 - 检查值是否为数组
 * @param value - 待检查的值
 * @returns 类型守卫结果
 */
export function isArray(value: unknown): value is Array<unknown> {
  return Array.isArray(value);
}

/**
 * 类型断言 - 检查值是否为函数
 * @param value - 待检查的值
 * @returns 类型守卫结果
 */
export function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === 'function';
}

/**
 * 类型断言 - 检查值是否为 Promise
 * @param value - 待检查的值
 * @returns 类型守卫结果
 */
export function isPromise(value: unknown): value is Promise<unknown> {
  return (
    value instanceof Promise ||
    (isObject(value) && isFunction((value as Record<string, unknown>).then))
  );
}

/**
 * 类型断言 - 检查值是否为 HTMLElement
 * @param value - 待检查的值
 * @returns 类型守卫结果
 */
export function isHTMLElement(value: unknown): value is HTMLElement {
  return value instanceof HTMLElement;
}

// ==================== 向后兼容 ====================

/**
 * TypeGuards工具集合
 */
export const TypeGuards = {
  validateRouteConfig,
  validateModuleConfig,
  validateLLMConfig,
  validateProxyConfig,
  safeParse,
  safeParseHTTPOptions,
  safeParseLLMOptions,
  isString,
  isNumber,
  isObject,
  isArray,
  isFunction,
  isPromise,
  isHTMLElement,
};

// 暴露到 window（浏览器环境）
if (typeof window !== 'undefined') {
  (window as Window & { TypeGuards?: typeof TypeGuards }).TypeGuards = TypeGuards;
}

// 默认导出
export default TypeGuards;

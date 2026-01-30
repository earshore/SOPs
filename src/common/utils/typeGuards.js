// src/common/utils/typeGuards.js
// ================================================================
// 🎯 类型守卫工具
// 提供运行时类型校验和安全类型转换
// ================================================================

import {
  RouteConfigSchema,
  ModuleConfigSchema,
  LLMConfigSchema,
  ProxyConfigSchema,
  HTTPRequestOptionsSchema,
  LLMRequestOptionsSchema
} from '../validators/schemas.js';

/**
 * 验证路由配置
 * @param {unknown} config - 待验证的配置
 * @returns {boolean}
 * @throws {Error} 验证失败时抛出详细错误
 */
export function validateRouteConfig(config) {
  try {
    RouteConfigSchema.parse(config);
    return true;
  } catch (error) {
    console.error('[TypeGuard] Invalid route config:', error.errors);
    throw new Error(`Route config validation failed: ${error.message}`);
  }
}

/**
 * 验证模块配置
 * @param {unknown} config - 待验证的配置
 * @returns {boolean}
 * @throws {Error} 验证失败时抛出详细错误
 */
export function validateModuleConfig(config) {
  try {
    ModuleConfigSchema.parse(config);
    return true;
  } catch (error) {
    console.error('[TypeGuard] Invalid module config:', error.errors);
    throw new Error(`Module config validation failed: ${error.message}`);
  }
}

/**
 * 验证 LLM 配置
 * @param {unknown} config - 待验证的配置
 * @returns {boolean}
 * @throws {Error} 验证失败时抛出详细错误
 */
export function validateLLMConfig(config) {
  try {
    LLMConfigSchema.parse(config);
    return true;
  } catch (error) {
    console.error('[TypeGuard] Invalid LLM config:', error.errors);
    throw new Error(`LLM config validation failed: ${error.message}`);
  }
}

/**
 * 验证代理配置
 * @param {unknown} config - 待验证的配置
 * @returns {boolean}
 * @throws {Error} 验证失败时抛出详细错误
 */
export function validateProxyConfig(config) {
  try {
    ProxyConfigSchema.parse(config);
    return true;
  } catch (error) {
    console.error('[TypeGuard] Invalid proxy config:', error.errors);
    throw new Error(`Proxy config validation failed: ${error.message}`);
  }
}

/**
 * 安全的类型转换
 * @template T
 * @param {unknown} value - 待转换的值
 * @param {import('zod').ZodSchema<T>} schema - Zod Schema
 * @param {T} defaultValue - 默认值
 * @returns {T}
 * 
 * @example
 * const config = safeParse(userInput, LLMConfigSchema, defaultConfig);
 */
export function safeParse(value, schema, defaultValue) {
  const result = schema.safeParse(value);
  if (result.success) {
    return result.data;
  }
  console.warn('[TypeGuard] Parse failed, using default:', result.error);
  return defaultValue;
}

/**
 * 安全的 HTTP 请求选项解析
 * @param {unknown} options - 待解析的选项
 * @returns {Object} 解析后的选项
 */
export function safeParseHTTPOptions(options) {
  return safeParse(options, HTTPRequestOptionsSchema, {
    method: 'GET',
    headers: {},
    timeout: 30000,
    retries: 0
  });
}

/**
 * 安全的 LLM 请求选项解析
 * @param {unknown} options - 待解析的选项
 * @returns {Object} 解析后的选项
 */
export function safeParseLLMOptions(options) {
  return safeParse(options, LLMRequestOptionsSchema, {
    temperature: 0.7,
    jsonMode: false,
    timeout: 30000,
    retries: 2,
    retryDelay: 1000
  });
}

/**
 * 类型断言 - 检查值是否为字符串
 * @param {unknown} value - 待检查的值
 * @returns {value is string}
 */
export function isString(value) {
  return typeof value === 'string';
}

/**
 * 类型断言 - 检查值是否为数字
 * @param {unknown} value - 待检查的值
 * @returns {value is number}
 */
export function isNumber(value) {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * 类型断言 - 检查值是否为对象
 * @param {unknown} value - 待检查的值
 * @returns {value is object}
 */
export function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * 类型断言 - 检查值是否为数组
 * @param {unknown} value - 待检查的值
 * @returns {value is Array}
 */
export function isArray(value) {
  return Array.isArray(value);
}

/**
 * 类型断言 - 检查值是否为函数
 * @param {unknown} value - 待检查的值
 * @returns {value is Function}
 */
export function isFunction(value) {
  return typeof value === 'function';
}

/**
 * 类型断言 - 检查值是否为 Promise
 * @param {unknown} value - 待检查的值
 * @returns {value is Promise}
 */
export function isPromise(value) {
  return value instanceof Promise || (isObject(value) && isFunction(value.then));
}

/**
 * 类型断言 - 检查值是否为 HTMLElement
 * @param {unknown} value - 待检查的值
 * @returns {value is HTMLElement}
 */
export function isHTMLElement(value) {
  return value instanceof HTMLElement;
}

// ================================================================
// 🔄 向后兼容：暴露到 window
// ================================================================
if (typeof window !== 'undefined') {
  window.TypeGuards = {
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
    isHTMLElement
  };
}

// 默认导出
export default {
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
  isHTMLElement
};

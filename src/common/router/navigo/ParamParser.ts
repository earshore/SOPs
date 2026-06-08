/**
 * ParamParser.ts - 路由参数解析器
 *
 * 负责解析和验证路由参数（路径参数和查询参数）
 */

import type { RouteParamConfig, RouteParams } from './types';

type PathParamValue = string | number | boolean;

type ParsedPathParam =
  | { status: 'set'; value: PathParamValue }
  | { status: 'error'; error: string }
  | { status: 'skip' };

/**
 * 解析后的参数结果
 */
export interface ParsedParams {
  /** 路径参数 */
  path: Record<string, string | number | boolean>;
  /** 查询参数 */
  query: Record<string, string | string[]>;
  /** 验证错误 */
  errors: string[];
}

/**
 * 路由参数解析器
 */
export class ParamParser {
  /**
   * 解析路径参数
   *
   * @param rawParams - Navigo 提供的原始参数
   * @param config - 参数配置
   * @returns 解析后的参数
   *
   * @example
   * ```typescript
   * const params = parser.parsePathParams(
   *   { id: '123', status: 'active' },
   *   {
   *     id: { type: 'number', required: true },
   *     status: { type: 'string', required: false, default: 'pending' }
   *   }
   * );
   * // => { id: 123, status: 'active' }
   * ```
   */
  parsePathParams(
    rawParams: Record<string, string> | null,
    config?: RouteParams
  ): { params: Record<string, string | number | boolean>; errors: string[] } {
    const params: Record<string, string | number | boolean> = {};
    const errors: string[] = [];

    // 如果没有配置，直接返回原始参数
    if (!config) {
      return {
        params: rawParams || {},
        errors: [],
      };
    }

    // 验证和转换每个参数
    for (const [key, paramConfig] of Object.entries(config)) {
      const parsed = this._parsePathParam(key, rawParams?.[key], paramConfig);
      if (parsed.status === 'error') {
        errors.push(parsed.error);
      }
      if (parsed.status === 'set') {
        params[key] = parsed.value;
      }
    }

    return { params, errors };
  }

  private _parsePathParam(
    key: string,
    rawValue: string | undefined,
    paramConfig: RouteParamConfig
  ): ParsedPathParam {
    if (paramConfig.required && !rawValue) {
      return { status: 'error', error: `Missing required parameter: ${key}` };
    }

    if (!rawValue && paramConfig.default !== undefined) {
      return { status: 'set', value: paramConfig.default };
    }

    if (!rawValue) {
      return { status: 'skip' };
    }

    const converted = this._convertType(rawValue, paramConfig.type);
    if (converted === null) {
      return { status: 'error', error: `Invalid type for parameter "${key}": expected ${paramConfig.type}` };
    }

    if (paramConfig.validate && !paramConfig.validate(converted)) {
      return { status: 'error', error: `Validation failed for parameter: ${key}` };
    }

    return { status: 'set', value: converted };
  }

  /**
   * 解析查询字符串
   *
   * @param queryString - URL 查询字符串
   * @returns 解析后的查询参数
   *
   * @example
   * ```typescript
   * parser.parseQueryString('?page=1&tags=a&tags=b&filter[status]=active');
   * // => { page: '1', tags: ['a', 'b'], 'filter[status]': 'active' }
   * ```
   */
  parseQueryString(queryString: string): Record<string, string | string[]> {
    const query: Record<string, string | string[]> = {};

    if (!queryString) {
      return query;
    }

    // 移除开头的 ?
    const cleanQuery = queryString.startsWith('?') ? queryString.slice(1) : queryString;

    if (!cleanQuery) {
      return query;
    }

    // 解析参数
    const pairs = cleanQuery.split('&');
    for (const pair of pairs) {
      const [key, value] = pair.split('=').map(decodeURIComponent);

      if (!key) continue;

      const decodedValue = value || '';

      // 处理数组参数（同名参数）
      if (query[key]) {
        if (Array.isArray(query[key])) {
          (query[key] as string[]).push(decodedValue);
        } else {
          query[key] = [query[key] as string, decodedValue];
        }
      } else {
        query[key] = decodedValue;
      }
    }

    return query;
  }

  /**
   * 解析完整的 URL 参数
   *
   * @param url - 完整 URL
   * @param pathParams - Navigo 提供的路径参数
   * @param paramConfig - 参数配置
   * @returns 解析结果
   */
  parseUrl(
    url: string,
    pathParams: Record<string, string> | null,
    paramConfig?: RouteParams
  ): ParsedParams {
    // 分离路径和查询字符串
    const [, queryString] = url.split('?');

    // 解析路径参数
    const { params: path, errors: pathErrors } = this.parsePathParams(pathParams, paramConfig);

    // 解析查询参数
    const query = this.parseQueryString(queryString || '');

    return {
      path,
      query,
      errors: pathErrors,
    };
  }

  /**
   * 构建查询字符串
   *
   * @param query - 查询参数对象
   * @returns 查询字符串
   *
   * @example
   * ```typescript
   * parser.buildQueryString({ page: '1', tags: ['a', 'b'] });
   * // => 'page=1&tags=a&tags=b'
   * ```
   */
  buildQueryString(query: Record<string, string | string[] | number | boolean>): string {
    const pairs: string[] = [];

    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) {
        continue;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`);
        }
      } else {
        pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
      }
    }

    return pairs.join('&');
  }

  /**
   * 类型转换
   *
   * @param value - 原始值
   * @param type - 目标类型
   * @returns 转换后的值，失败返回 null
   */
  private _convertType(
    value: string,
    type: 'string' | 'number' | 'boolean'
  ): string | number | boolean | null {
    switch (type) {
      case 'string':
        return value;

      case 'number': {
        const num = Number(value);
        return isNaN(num) ? null : num;
      }

      case 'boolean': {
        const lower = value.toLowerCase();
        if (lower === 'true' || lower === '1') return true;
        if (lower === 'false' || lower === '0') return false;
        return null;
      }

      default:
        return null;
    }
  }
}

/**
 * 创建参数解析器实例
 */
export function createParamParser(): ParamParser {
  return new ParamParser();
}

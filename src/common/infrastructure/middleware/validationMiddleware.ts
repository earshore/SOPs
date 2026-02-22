// src/common/infrastructure/middleware/validationMiddleware.ts
// ================================================================
// 验证中间件
// 在状态更新前验证数据的有效性
// ================================================================

import type { Middleware } from '../StateManager';

/**
 * 验证规则函数类型
 */
export type ValidationRule = (payload: any) => boolean | string;

/**
 * 验证规则映射
 */
export type ValidationRules = Record<string, ValidationRule | ValidationRule[]>;

/**
 * 验证中间件配置选项
 */
export interface ValidationMiddlewareOptions {
  /** 验证规则映射（action -> 验证函数） */
  rules: ValidationRules;
  /** 验证失败时是否抛出错误，默认为 true */
  throwOnError?: boolean;
  /** 验证失败时的回调函数 */
  onValidationError?: (action: string, error: string) => void;
  /** 是否在开发环境启用严格模式，默认为 true */
  strictMode?: boolean;
}

/**
 * 创建验证中间件
 * 
 * @param options - 配置选项
 * @returns 验证中间件函数
 * 
 * @example
 * ```typescript
 * const validation = createValidationMiddleware({
 *   rules: {
 *     setAnalysisReport: (payload) => {
 *       if (!payload || typeof payload !== 'object') {
 *         return 'Invalid analysis report';
 *       }
 *       return true;
 *     },
 *     setSelectedAsins: [
 *       (payload) => Array.isArray(payload) || 'Must be an array',
 *       (payload) => payload.every(asin => typeof asin === 'string') || 'All items must be strings'
 *     ]
 *   }
 * });
 * 
 * stateManager.use(validation);
 * ```
 */
export function createValidationMiddleware(
  options: ValidationMiddlewareOptions
): Middleware {
  const {
    rules,
    throwOnError = true,
    onValidationError,
    strictMode = true
  } = options;

  return (_state: any, action: string, payload: any) => {
    // 获取该 action 的验证规则
    const rule = rules[action];
    
    if (!rule) {
      // 没有验证规则
      if (strictMode && process.env.NODE_ENV === 'development') {
        console.warn(`[ValidationMiddleware] No validation rule for action: ${action}`);
      }
      return;
    }

    // 执行验证
    const validationRules = Array.isArray(rule) ? rule : [rule];
    
    for (const validationFn of validationRules) {
      const result = validationFn(payload);
      
      if (result !== true) {
        const errorMessage = typeof result === 'string' 
          ? result 
          : `Validation failed for action: ${action}`;
        
        // 调用错误回调
        if (onValidationError) {
          onValidationError(action, errorMessage);
        }
        
        // 抛出错误或记录日志
        if (throwOnError) {
          throw new Error(`[ValidationMiddleware] ${errorMessage}`);
        } else {
          console.error(`[ValidationMiddleware] ${errorMessage}`, { action, payload });
        }
        
        return;
      }
    }
  };
}

/**
 * 常用验证函数
 */
export const validators = {
  /**
   * 验证是否为非空值
   */
  required: (payload: any): boolean | string => {
    return payload !== null && payload !== undefined || 'Value is required';
  },

  /**
   * 验证是否为字符串
   */
  isString: (payload: any): boolean | string => {
    return typeof payload === 'string' || 'Value must be a string';
  },

  /**
   * 验证是否为数字
   */
  isNumber: (payload: any): boolean | string => {
    return typeof payload === 'number' && !isNaN(payload) || 'Value must be a number';
  },

  /**
   * 验证是否为布尔值
   */
  isBoolean: (payload: any): boolean | string => {
    return typeof payload === 'boolean' || 'Value must be a boolean';
  },

  /**
   * 验证是否为数组
   */
  isArray: (payload: any): boolean | string => {
    return Array.isArray(payload) || 'Value must be an array';
  },

  /**
   * 验证是否为对象
   */
  isObject: (payload: any): boolean | string => {
    return typeof payload === 'object' && payload !== null && !Array.isArray(payload) 
      || 'Value must be an object';
  },

  /**
   * 验证字符串最小长度
   */
  minLength: (min: number) => (payload: any): boolean | string => {
    return typeof payload === 'string' && payload.length >= min 
      || `String must be at least ${min} characters`;
  },

  /**
   * 验证字符串最大长度
   */
  maxLength: (max: number) => (payload: any): boolean | string => {
    return typeof payload === 'string' && payload.length <= max 
      || `String must be at most ${max} characters`;
  },

  /**
   * 验证数字范围
   */
  inRange: (min: number, max: number) => (payload: any): boolean | string => {
    return typeof payload === 'number' && payload >= min && payload <= max 
      || `Number must be between ${min} and ${max}`;
  },

  /**
   * 验证数组长度
   */
  arrayLength: (min: number, max?: number) => (payload: any): boolean | string => {
    if (!Array.isArray(payload)) {
      return 'Value must be an array';
    }
    if (payload.length < min) {
      return `Array must have at least ${min} items`;
    }
    if (max !== undefined && payload.length > max) {
      return `Array must have at most ${max} items`;
    }
    return true;
  },

  /**
   * 验证对象是否包含指定字段
   */
  hasFields: (...fields: string[]) => (payload: any): boolean | string => {
    if (typeof payload !== 'object' || payload === null) {
      return 'Value must be an object';
    }
    const missingFields = fields.filter(field => !(field in payload));
    return missingFields.length === 0 
      || `Object is missing required fields: ${missingFields.join(', ')}`;
  },

  /**
   * 验证是否匹配正则表达式
   */
  matches: (pattern: RegExp) => (payload: any): boolean | string => {
    return typeof payload === 'string' && pattern.test(payload) 
      || `Value does not match pattern: ${pattern}`;
  },

  /**
   * 验证是否为有效的 ASIN
   */
  isValidAsin: (payload: any): boolean | string => {
    return typeof payload === 'string' && /^B[0-9A-Z]{9}$/.test(payload) 
      || 'Invalid ASIN format';
  },

  /**
   * 验证是否为有效的 URL
   */
  isValidUrl: (payload: any): boolean | string => {
    try {
      new URL(payload);
      return true;
    } catch {
      return 'Invalid URL format';
    }
  },

  /**
   * 验证是否为有效的 Email
   */
  isValidEmail: (payload: any): boolean | string => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return typeof payload === 'string' && emailPattern.test(payload) 
      || 'Invalid email format';
  },

  /**
   * 组合多个验证器（AND 逻辑）
   */
  all: (...validators: ValidationRule[]) => (payload: any): boolean | string => {
    for (const validator of validators) {
      const result = validator(payload);
      if (result !== true) {
        return result;
      }
    }
    return true;
  },

  /**
   * 组合多个验证器（OR 逻辑）
   */
  any: (...validators: ValidationRule[]) => (payload: any): boolean | string => {
    const errors: string[] = [];
    for (const validator of validators) {
      const result = validator(payload);
      if (result === true) {
        return true;
      }
      if (typeof result === 'string') {
        errors.push(result);
      }
    }
    return `All validations failed: ${errors.join('; ')}`;
  }
};

/**
 * 默认验证中间件（包含基本的类型验证）
 */
export const validationMiddleware = createValidationMiddleware({
  rules: {
    // Analysis 相关验证
    setAnalysisReport: validators.required,
    setSelectedAsins: validators.all(
      validators.isArray,
      validators.arrayLength(0, 100)
    ),
    setTranslatedReport: validators.required,
    setIsAnalyzing: validators.isBoolean,
    setExpandedAsin: (payload) => {
      if (payload === null) return true;
      return validators.isValidAsin(payload);
    },
    setIsEditing: validators.isBoolean,
    setShowTranslation: validators.isBoolean,

    // Scraper 相关验证
    setScrapedData: validators.required,
    setIsScraping: validators.isBoolean,
    setScraperProgress: validators.all(
      validators.isNumber,
      validators.inRange(0, 100)
    ),
    setInputAsins: validators.isString,

    // PromptLab 相关验证
    setUserProductProfile: validators.required,
    setCurrentPrompt: validators.isString,
    setSelectedModel: validators.isString,
    setTemperature: validators.all(
      validators.isNumber,
      validators.inRange(0, 2)
    ),
    setMaxTokens: validators.all(
      validators.isNumber,
      validators.inRange(1, 100000)
    ),

    // UI 相关验证
    setCurrentTab: validators.isString,
    setTheme: (payload) => {
      return ['light', 'dark', 'auto'].includes(payload) 
        || 'Theme must be one of: light, dark, auto';
    },
    setLoading: validators.isBoolean
  },
  throwOnError: false,
  strictMode: true
});

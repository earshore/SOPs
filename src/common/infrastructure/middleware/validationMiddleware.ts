// src/common/infrastructure/middleware/validationMiddleware.ts
// ================================================================
// 验证中间件
// 在状态更新前验证数据的有效性
// 集成 Zod 进行运行时验证
// ================================================================

import type { Middleware } from '../StateManager';
import { z, type ZodSchema } from 'zod';
import {
  UserProductProfileSchema,
  ScrapedDataItemSchema,
  PromptHistoryItemSchema,
  UIStateSchema,
  ScraperStateSchema,
  AnalysisStateSchema,
  PromptLabStateSchema,
  AnalysisReportSchema
} from '../../guards/zodSchemas';

/**
 * 验证规则函数类型
 */
export type ValidationRule = (payload: any) => boolean | string;

/**
 * Zod Schema 验证规则类型
 */
export type ZodValidationRule = ZodSchema<any>;

/**
 * 验证规则映射
 * 支持传统验证函数或 Zod Schema
 */
export type ValidationRules = Record<string, ValidationRule | ValidationRule[] | ZodValidationRule>;

/**
 * 验证中间件配置选项
 */
export interface ValidationMiddlewareOptions {
  /** 验证规则映射（action -> 验证函数或 Zod Schema） */
  rules: ValidationRules;
  /** 验证失败时是否抛出错误，默认为 true */
  throwOnError?: boolean;
  /** 验证失败时的回调函数 */
  onValidationError?: (action: string, error: string) => void;
  /** 是否在开发环境启用严格模式，默认为 true */
  strictMode?: boolean;
  /** 是否优先使用 Zod 验证，默认为 true */
  preferZod?: boolean;
}

/**
 * 创建验证中间件
 * 
 * @param options - 配置选项
 * @returns 验证中间件函数
 * 
 * @example
 * ```typescript
 * // 使用传统验证函数
 * const validation = createValidationMiddleware({
 *   rules: {
 *     setAnalysisReport: (payload) => {
 *       if (!payload || typeof payload !== 'object') {
 *         return 'Invalid analysis report';
 *       }
 *       return true;
 *     }
 *   }
 * });
 * 
 * // 使用 Zod Schema
 * const zodValidation = createValidationMiddleware({
 *   rules: {
 *     setUserProductProfile: UserProductProfileSchema,
 *     setScrapedData: z.array(ScrapedDataItemSchema)
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

    // 检查是否为 Zod Schema
    if (isZodSchema(rule)) {
      const result = rule.safeParse(payload);
      
      if (!result.success) {
        const errorMessage = formatZodError(result.error, action);
        
        // 调用错误回调
        if (onValidationError) {
          onValidationError(action, errorMessage);
        }
        
        // 抛出错误或记录日志
        if (throwOnError) {
          throw new Error(`[ValidationMiddleware] ${errorMessage}`);
        } else {
          console.error(`[ValidationMiddleware] ${errorMessage}`, { 
            action, 
            payload,
            zodErrors: result.error.issues 
          });
        }
        
        return;
      }
      
      // Zod 验证成功
      return;
    }

    // 执行传统验证函数
    const validationRules = Array.isArray(rule) ? rule : [rule];
    
    for (const validationFn of validationRules) {
      // 类型守卫：确保是函数
      if (typeof validationFn !== 'function') {
        continue;
      }
      
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
 * 检查是否为 Zod Schema
 */
function isZodSchema(value: any): value is ZodSchema {
  return value && typeof value === 'object' && '_def' in value && 'safeParse' in value;
}

/**
 * 格式化 Zod 错误信息
 */
function formatZodError(error: z.ZodError, action: string): string {
  const issues = error.issues.map((issue: z.ZodIssue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
    return `${path}: ${issue.message}`;
  });
  
  return `Validation failed for action "${action}": ${issues.join('; ')}`;
}

/**
 * 常用验证函数
 */
export const validators = {
  /**
   * 从 Zod Schema 创建验证函数
   * 
   * @param schema - Zod Schema
   * @returns 验证函数
   * 
   * @example
   * ```typescript
   * const validateProfile = validators.fromZod(UserProductProfileSchema);
   * const result = validateProfile(data);
   * ```
   */
  fromZod: (schema: ZodSchema) => (payload: any): boolean | string => {
    const result = schema.safeParse(payload);
    if (result.success) {
      return true;
    }
    return formatZodError(result.error, 'validation');
  },

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
 * 默认验证中间件（使用 Zod Schema 进行验证）
 * 
 * 优先使用 Zod Schema 进行类型安全的运行时验证
 * 对于没有 Zod Schema 的类型，使用传统验证函数
 */
export const validationMiddleware = createValidationMiddleware({
  rules: {
    // Analysis 相关验证（使用 Zod Schema）
    setAnalysisReport: AnalysisReportSchema,
    setSelectedAsins: z.array(z.string()),
    setTranslatedReport: AnalysisReportSchema,
    setIsAnalyzing: z.boolean(),
    setExpandedAsin: z.string().nullable(),
    setIsEditing: z.boolean(),
    setShowTranslation: z.boolean(),
    setReportData: z.any(), // 报告数据结构复杂，暂时使用 any

    // Scraper 相关验证（使用 Zod Schema）
    setScrapedData: z.union([
      z.array(ScrapedDataItemSchema),
      z.any(),
      z.null()
    ]),
    setIsScraping: z.boolean(),
    setScraperProgress: z.number().min(0).max(100),
    setInputAsins: z.string(),
    setScraperStatus: z.enum(['idle', 'scraping', 'success', 'error']).optional(),
    setSelectedSite: z.union([
      z.enum(['US', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'PL', 'BE', 'IE', 'UK', 'CA', 'JP']),
      z.literal('')
    ]),
    setCurrentHistoryId: z.union([z.string(), z.number(), z.null()]),
    setScraperError: z.string().optional(),
    setScraperExpandedAsin: z.string().nullable(),
    setCurrentDataTab: z.enum(['preview', 'json']),

    // PromptLab 相关验证（使用 Zod Schema）
    setUserProductProfile: UserProductProfileSchema,
    setCurrentPrompt: z.string(),
    setSelectedModel: z.string(),
    setTemperature: z.number().min(0).max(2),
    setMaxTokens: z.number().min(1).max(100000),
    addPromptHistory: PromptHistoryItemSchema,

    // KeywordTracker 相关验证
    setKeywords: z.array(z.string()),
    setProcessedCopy: z.string(),

    // UI 相关验证（使用 Zod Schema）
    setCurrentTab: z.string(),
    setTheme: z.enum(['light', 'dark', 'auto']),
    setLoading: z.boolean(),

    // 批量更新操作（使用 partial schemas）
    updateScraper: ScraperStateSchema.partial(),
    updateAnalysis: AnalysisStateSchema.partial(),
    updatePromptLab: PromptLabStateSchema.partial(),
    updateUI: UIStateSchema.partial()
  },
  throwOnError: false,
  strictMode: true,
  preferZod: true
});

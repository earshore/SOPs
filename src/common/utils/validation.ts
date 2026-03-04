// src/common/utils/validation.ts
// ================================================================
// 🎯 P0-3: 输入验证工具
// 提供统一的输入验证和清理功能
// ================================================================

/**
 * 验证结果类型
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: string;
}

/**
 * 验证规则类型
 */
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => boolean;
  errorMessage?: string;
}

/**
 * 验证字符串输入
 * @param value - 输入值
 * @param rules - 验证规则
 * @returns 验证结果
 */
export function validateString(value: string, rules: ValidationRule = {}): ValidationResult {
  // 必填检查
  if (rules.required && (!value || value.trim() === '')) {
    return {
      valid: false,
      error: rules.errorMessage || '此字段为必填项'
    };
  }

  // 如果不是必填且为空,直接返回有效
  if (!value || value.trim() === '') {
    return { valid: true, sanitized: '' };
  }

  const trimmed = value.trim();

  // 长度检查
  if (rules.minLength !== undefined && trimmed.length < rules.minLength) {
    return {
      valid: false,
      error: rules.errorMessage || `最少需要 ${rules.minLength} 个字符`
    };
  }

  if (rules.maxLength !== undefined && trimmed.length > rules.maxLength) {
    return {
      valid: false,
      error: rules.errorMessage || `最多允许 ${rules.maxLength} 个字符`
    };
  }

  // 正则验证
  if (rules.pattern && !rules.pattern.test(trimmed)) {
    return {
      valid: false,
      error: rules.errorMessage || '输入格式不正确'
    };
  }

  // 自定义验证
  if (rules.custom && !rules.custom(trimmed)) {
    return {
      valid: false,
      error: rules.errorMessage || '输入不符合要求'
    };
  }

  return { valid: true, sanitized: trimmed };
}

/**
 * 验证邮箱地址
 * @param email - 邮箱地址
 * @returns 验证结果
 */
export function validateEmail(email: string): ValidationResult {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return validateString(email, {
    required: true,
    pattern: emailPattern,
    errorMessage: '请输入有效的邮箱地址'
  });
}

/**
 * 验证URL
 * @param url - URL地址
 * @returns 验证结果
 */
export function validateUrl(url: string): ValidationResult {
  try {
    new URL(url);
    return { valid: true, sanitized: url };
  } catch {
    return {
      valid: false,
      error: '请输入有效的URL地址'
    };
  }
}

/**
 * 验证API Key格式
 * @param apiKey - API密钥
 * @returns 验证结果
 */
export function validateApiKey(apiKey: string): ValidationResult {
  // 必填检查
  if (!apiKey || apiKey.trim() === '') {
    return {
      valid: false,
      error: 'API Key为必填项'
    };
  }

  const trimmed = apiKey.trim();

  // 长度检查
  if (trimmed.length < 10) {
    return {
      valid: false,
      error: 'API Key最少需要 10 个字符'
    };
  }

  // 格式检查
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return {
      valid: false,
      error: 'API Key格式不正确'
    };
  }

  return { valid: true, sanitized: trimmed };
}

/**
 * 清理文件名
 * 移除危险字符,防止路径遍历攻击
 * @param filename - 文件名
 * @returns 清理后的文件名
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '') // 移除Windows不允许的字符
    .replace(/^\.+/, '') // 移除开头的点
    .replace(/\.+$/, '') // 移除结尾的点
    .trim();
}

/**
 * 清理路径
 * 防止路径遍历攻击
 * @param path - 路径
 * @returns 清理后的路径
 */
export function sanitizePath(path: string): string {
  return path
    .replace(/\.\./g, '') // 移除 ..
    .replace(/[<>:"|?*\x00-\x1F]/g, '') // 移除危险字符
    .replace(/^\/+/, '') // 移除开头的斜杠
    .trim();
}

/**
 * 验证JSON字符串
 * @param jsonString - JSON字符串
 * @returns 验证结果
 */
export function validateJson(jsonString: string): ValidationResult {
  try {
    JSON.parse(jsonString);
    return { valid: true, sanitized: jsonString };
  } catch (error) {
    return {
      valid: false,
      error: 'JSON格式不正确: ' + (error as Error).message
    };
  }
}

/**
 * 验证数字范围
 * @param value - 数值
 * @param min - 最小值
 * @param max - 最大值
 * @returns 验证结果
 */
export function validateNumber(
  value: number,
  min?: number,
  max?: number
): ValidationResult {
  if (typeof value !== 'number' || isNaN(value)) {
    return {
      valid: false,
      error: '请输入有效的数字'
    };
  }

  if (min !== undefined && value < min) {
    return {
      valid: false,
      error: `数值不能小于 ${min}`
    };
  }

  if (max !== undefined && value > max) {
    return {
      valid: false,
      error: `数值不能大于 ${max}`
    };
  }

  return { valid: true };
}

/**
 * 批量验证对象字段
 * @param data - 数据对象
 * @param rules - 字段验证规则
 * @returns 验证结果映射
 */
export function validateObject(
  data: Record<string, unknown>,
  rules: Record<string, ValidationRule>
): Record<string, ValidationResult> {
  const results: Record<string, ValidationResult> = {};

  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field];
    results[field] = validateString(String(value || ''), rule);
  }

  return results;
}

/**
 * 检查验证结果是否全部通过
 * @param results - 验证结果映射
 * @returns 是否全部通过
 */
export function isAllValid(results: Record<string, ValidationResult>): boolean {
  return Object.values(results).every(result => result.valid);
}

/**
 * 获取第一个错误信息
 * @param results - 验证结果映射
 * @returns 错误信息或null
 */
export function getFirstError(results: Record<string, ValidationResult>): string | null {
  for (const result of Object.values(results)) {
    if (!result.valid && result.error) {
      return result.error;
    }
  }
  return null;
}

/**
 * 验证工具集合
 */
export const ValidationUtils = {
  validateString,
  validateEmail,
  validateUrl,
  validateApiKey,
  validateJson,
  validateNumber,
  validateObject,
  isAllValid,
  getFirstError,
  sanitizeFilename,
  sanitizePath
};

export default ValidationUtils;

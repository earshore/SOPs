/**
 * 数据验证工具
 */

import type { ProductData, ValidationResult, ScrapedData } from '../types';

type BasicValidationResult = { valid: boolean; error?: string };

function invalid(error: string): ValidationResult {
  return { valid: false, error };
}

function invalidBasic(error: string): BasicValidationResult {
  return { valid: false, error };
}

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function validateRequiredMetadataFields(
  meta: Record<string, unknown>
): BasicValidationResult | null {
  const requiredFields = ['scrape_timestamp', 'marketplace', 'domain', 'language', 'total_asins'];
  for (const field of requiredFields) {
    if (!(field in meta)) {
      return invalidBasic(`metadata 缺少必需字段: ${field}`);
    }
  }
  return null;
}

function validateMetadataFieldTypes(meta: Record<string, unknown>): BasicValidationResult | null {
  const stringFields = ['scrape_timestamp', 'marketplace', 'domain', 'language'];
  for (const field of stringFields) {
    if (typeof meta[field] !== 'string') {
      return invalidBasic(`metadata.${field} 必须是字符串`);
    }
  }

  if (typeof meta.total_asins !== 'number') {
    return invalidBasic('metadata.total_asins 必须是数字');
  }

  return null;
}

function validateMetadataTimestamp(timestamp: unknown): BasicValidationResult | null {
  try {
    const date = new Date(timestamp as string);
    if (isNaN(date.getTime())) {
      return invalidBasic('metadata.scrape_timestamp 不是有效的 ISO 8601 时间戳');
    }
  } catch {
    return invalidBasic('metadata.scrape_timestamp 格式无效');
  }

  return null;
}

function validateMetadataValues(meta: Record<string, unknown>): BasicValidationResult | null {
  const timestampValidation = validateMetadataTimestamp(meta.scrape_timestamp);
  if (timestampValidation) return timestampValidation;

  if ((meta.total_asins as number) < 0) {
    return invalidBasic('metadata.total_asins 必须是非负数');
  }

  return null;
}

/**
 * 验证 ScrapedData 的 metadata 字段
 */
export function validateMetadata(metadata: unknown): { valid: boolean; error?: string } {
  if (!isObjectLike(metadata)) {
    return invalidBasic('metadata 必须是对象');
  }

  const requiredValidation = validateRequiredMetadataFields(metadata);
  if (requiredValidation) return requiredValidation;

  const typeValidation = validateMetadataFieldTypes(metadata);
  if (typeValidation) return typeValidation;

  const valueValidation = validateMetadataValues(metadata);
  if (valueValidation) return valueValidation;

  return { valid: true };
}

/**
 * 类型守卫：检查对象是否为有效的 ScrapedData
 */
export function isScrapedData(data: unknown): data is ScrapedData {
  if (!isObjectLike(data)) {
    return false;
  }

  // 必须有 products 字段且为数组
  if (!('products' in data) || !Array.isArray(data.products)) {
    return false;
  }

  // 如果有 metadata，验证其结构
  if ('metadata' in data && data.metadata !== undefined) {
    const metadataValidation = validateMetadata(data.metadata);
    if (!metadataValidation.valid) {
      return false;
    }
  }

  return true;
}

function validateProductAsin(prod: Record<string, unknown>): ValidationResult | null {
  if (!prod.asin || typeof prod.asin !== 'string') {
    return invalid('缺少必需字段: asin');
  }

  if (!isValidAsin(prod.asin)) {
    return invalid(`ASIN格式无效: ${prod.asin}`);
  }

  return null;
}

function validateProductTitle(prod: Record<string, unknown>): ValidationResult | null {
  if (prod.productTitle && typeof prod.productTitle !== 'string') {
    return invalid('productTitle必须是字符串');
  }
  return null;
}

function validateFeatureBullets(featureBullets: unknown): ValidationResult | null {
  if (!featureBullets) return null;

  if (!Array.isArray(featureBullets)) {
    return invalid('feature_bullets必须是数组');
  }

  if (!featureBullets.every((b: unknown) => typeof b === 'string')) {
    return invalid('feature_bullets中的元素必须是字符串');
  }

  return null;
}

function validateCustomerReviews(customerReviews: unknown): ValidationResult | null {
  if (!customerReviews) return null;

  if (!Array.isArray(customerReviews)) {
    return invalid('customer_reviews必须是数组');
  }

  for (let i = 0; i < customerReviews.length; i++) {
    const review = customerReviews[i];
    if (!isObjectLike(review)) {
      return invalid(`评论[${i}]不是有效对象`);
    }
  }

  return null;
}

/**
 * 验证产品数据结构
 */
export function validateProduct(product: unknown): ValidationResult {
  if (!isObjectLike(product)) {
    return invalid('产品数据不是有效对象');
  }

  const validations = [
    validateProductAsin(product),
    validateProductTitle(product),
    validateFeatureBullets(product.feature_bullets),
    validateCustomerReviews(product.customer_reviews),
  ];

  for (const validation of validations) {
    if (validation) return validation;
  }

  return { valid: true };
}

function validateStrictMetadata(
  data: Record<string, unknown>,
  strictMetadata: boolean
): ValidationResult | null {
  if (strictMetadata && 'metadata' in data && data.metadata) {
    const metadataValidation = validateMetadata(data.metadata);
    if (!metadataValidation.valid) {
      return invalid(`metadata 验证失败: ${metadataValidation.error}`);
    }
  }

  return null;
}

function resolveProducts(data: unknown, strictMetadata: boolean): ValidationResult {
  if (Array.isArray(data)) {
    return { valid: true, products: data };
  }

  if (!isObjectLike(data)) {
    return invalid('数据不是有效对象');
  }

  if ('products' in data && Array.isArray(data.products)) {
    const metadataValidation = validateStrictMetadata(data, strictMetadata);
    if (metadataValidation) return metadataValidation;
    return { valid: true, products: data.products };
  }

  if ('asin' in data) {
    return { valid: true, products: [data as unknown as ProductData] };
  }

  return invalid('无法识别的数据格式，需要包含products数组或单个产品对象');
}

function formatInvalidProducts(invalidProducts: string[]): string {
  const visibleErrors = invalidProducts.slice(0, 3).join('\n');
  const suffix = invalidProducts.length > 3 ? '\n...' : '';
  return `发现 ${invalidProducts.length} 个无效产品:\n${visibleErrors}${suffix}`;
}

function validateProducts(products: ProductData[]): ValidationResult | null {
  if (products.length === 0) {
    return invalid('数据中没有产品信息');
  }

  const invalidProducts: string[] = [];
  for (let i = 0; i < products.length; i++) {
    const validation = validateProduct(products[i]);
    if (!validation.valid) {
      invalidProducts.push(`产品[${i}] ${products[i]?.asin || '未知'}: ${validation.error}`);
    }
  }

  if (invalidProducts.length > 0) {
    return invalid(formatInvalidProducts(invalidProducts));
  }

  return null;
}

/**
 * 验证导入的数据结构
 *
 * @param data - 待验证的数据
 * @param strictMetadata - 是否严格验证 metadata（默认 false，兼容旧数据）
 */
export function validateScrapedData(
  data: unknown,
  strictMetadata: boolean = false
): ValidationResult {
  const productResolution = resolveProducts(data, strictMetadata);
  if (!productResolution.valid || !productResolution.products) return productResolution;

  const productValidation = validateProducts(productResolution.products);
  if (productValidation) return productValidation;

  return { valid: true, products: productResolution.products };
}

/**
 * 验证ASIN格式
 */
export function isValidAsin(asin: string): boolean {
  return /^[A-Z0-9]{10}$/.test(asin);
}

/**
 * 从输入文本中提取有效的ASIN列表
 */
export function extractValidAsins(input: string): string[] {
  if (!input) return [];
  return input
    .split(/[,,\n\s]+/)
    .map(a => a.trim().toUpperCase())
    .filter(a => isValidAsin(a));
}

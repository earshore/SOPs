/**
 * 数据验证工具
 */

import type { ProductData, ValidationResult, ScrapedData } from '../types';

/**
 * 验证 ScrapedData 的 metadata 字段
 */
export function validateMetadata(metadata: any): { valid: boolean; error?: string } {
    if (!metadata || typeof metadata !== 'object') {
        return { valid: false, error: 'metadata 必须是对象' };
    }

    // 验证必需字段
    const requiredFields = ['scrape_timestamp', 'marketplace', 'domain', 'language', 'total_asins'];
    for (const field of requiredFields) {
        if (!(field in metadata)) {
            return { valid: false, error: `metadata 缺少必需字段: ${field}` };
        }
    }

    // 验证字段类型
    if (typeof metadata.scrape_timestamp !== 'string') {
        return { valid: false, error: 'metadata.scrape_timestamp 必须是字符串' };
    }

    if (typeof metadata.marketplace !== 'string') {
        return { valid: false, error: 'metadata.marketplace 必须是字符串' };
    }

    if (typeof metadata.domain !== 'string') {
        return { valid: false, error: 'metadata.domain 必须是字符串' };
    }

    if (typeof metadata.language !== 'string') {
        return { valid: false, error: 'metadata.language 必须是字符串' };
    }

    if (typeof metadata.total_asins !== 'number') {
        return { valid: false, error: 'metadata.total_asins 必须是数字' };
    }

    // 验证时间戳格式（ISO 8601）
    try {
        const date = new Date(metadata.scrape_timestamp);
        if (isNaN(date.getTime())) {
            return { valid: false, error: 'metadata.scrape_timestamp 不是有效的 ISO 8601 时间戳' };
        }
    } catch {
        return { valid: false, error: 'metadata.scrape_timestamp 格式无效' };
    }

    // 验证 total_asins 为正数
    if (metadata.total_asins < 0) {
        return { valid: false, error: 'metadata.total_asins 必须是非负数' };
    }

    return { valid: true };
}

/**
 * 类型守卫：检查对象是否为有效的 ScrapedData
 */
export function isScrapedData(data: any): data is ScrapedData {
    if (!data || typeof data !== 'object') {
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

/**
 * 验证产品数据结构
 */
export function validateProduct(product: any): ValidationResult {
    if (!product || typeof product !== 'object') {
        return { valid: false, error: '产品数据不是有效对象' };
    }

    // 验证必需字段：ASIN
    if (!product.asin || typeof product.asin !== 'string') {
        return { valid: false, error: '缺少必需字段: asin' };
    }

    // 验证ASIN格式
    if (!/^B0[A-Z0-9]{8}$/.test(product.asin)) {
        return { valid: false, error: `ASIN格式无效: ${product.asin}` };
    }

    // 验证产品标题
    if (product.productTitle && typeof product.productTitle !== 'string') {
        return { valid: false, error: 'productTitle必须是字符串' };
    }

    // 验证五点描述
    if (product.feature_bullets) {
        if (!Array.isArray(product.feature_bullets)) {
            return { valid: false, error: 'feature_bullets必须是数组' };
        }
        if (!product.feature_bullets.every((b: any) => typeof b === 'string')) {
            return { valid: false, error: 'feature_bullets中的元素必须是字符串' };
        }
    }

    // 验证评论数据
    if (product.customer_reviews) {
        if (!Array.isArray(product.customer_reviews)) {
            return { valid: false, error: 'customer_reviews必须是数组' };
        }
        // 验证每个评论的基本结构
        for (let i = 0; i < product.customer_reviews.length; i++) {
            const review = product.customer_reviews[i];
            if (!review || typeof review !== 'object') {
                return { valid: false, error: `评论[${i}]不是有效对象` };
            }
        }
    }

    return { valid: true };
}

/**
 * 验证导入的数据结构
 * 
 * @param data - 待验证的数据
 * @param strictMetadata - 是否严格验证 metadata（默认 false，兼容旧数据）
 */
export function validateScrapedData(data: any, strictMetadata: boolean = false): ValidationResult {
    if (!data || typeof data !== 'object') {
        return { valid: false, error: '数据不是有效对象' };
    }

    let products: ProductData[] = [];

    // 处理不同的数据格式
    if (Array.isArray(data)) {
        // 格式1: 直接是产品数组
        products = data;
    } else if ('products' in data && Array.isArray(data.products)) {
        // 格式2: 包含products字段的对象
        products = data.products;
        
        // 如果启用严格模式，验证 metadata
        if (strictMetadata && 'metadata' in data && data.metadata) {
            const metadataValidation = validateMetadata(data.metadata);
            if (!metadataValidation.valid) {
                return { valid: false, error: `metadata 验证失败: ${metadataValidation.error}` };
            }
        }
    } else if ('asin' in data) {
        // 格式3: 单个产品对象
        products = [data];
    } else {
        return { valid: false, error: '无法识别的数据格式，需要包含products数组或单个产品对象' };
    }

    // 验证至少有一个产品
    if (products.length === 0) {
        return { valid: false, error: '数据中没有产品信息' };
    }

    // 验证每个产品
    const invalidProducts: string[] = [];
    for (let i = 0; i < products.length; i++) {
        const validation = validateProduct(products[i]);
        if (!validation.valid) {
            invalidProducts.push(`产品[${i}] ${products[i]?.asin || '未知'}: ${validation.error}`);
        }
    }

    if (invalidProducts.length > 0) {
        return { 
            valid: false, 
            error: `发现 ${invalidProducts.length} 个无效产品:\n${invalidProducts.slice(0, 3).join('\n')}${invalidProducts.length > 3 ? '\n...' : ''}` 
        };
    }

    return { valid: true, products };
}

/**
 * 验证ASIN格式
 */
export function isValidAsin(asin: string): boolean {
    return /^B0[A-Z0-9]{8}$/.test(asin);
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

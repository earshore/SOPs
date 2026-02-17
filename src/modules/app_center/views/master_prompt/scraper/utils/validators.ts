/**
 * 数据验证工具
 */

import type { ProductData, ValidationResult } from '../types';

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
 */
export function validateScrapedData(data: any): ValidationResult {
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

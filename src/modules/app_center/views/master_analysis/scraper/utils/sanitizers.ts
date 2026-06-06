/**
 * 安全防护工具 - XSS防护
 */

import type { ProductData } from '../types';

/**
 * HTML转义函数 - 防止XSS攻击
 * 将特殊字符转换为HTML实体
 */
export function escapeHtml(unsafe: string): string {
    if (!unsafe || typeof unsafe !== 'string') {
        return '';
    }
    
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * 清理和验证URL - 防止JavaScript伪协议注入
 */
export function sanitizeUrl(url: string): string {
    if (!url || typeof url !== 'string') {
        return '#';
    }
    
    // 移除前后空格
    url = url.trim();
    
    // 只允许http和https协议
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    
    // 如果没有协议，默认添加https
    if (!url.includes('://')) {
        return 'https://' + url;
    }
    
    // 拒绝危险的协议（javascript:, data:, vbscript:等）
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:', 'about:'];
    const lowerUrl = url.toLowerCase();
    for (const protocol of dangerousProtocols) {
        if (lowerUrl.startsWith(protocol)) {
            console.warn('[Scraper] 检测到危险URL协议:', url);
            return '#';
        }
    }
    
    return url;
}

/**
 * 清理产品数据 - 对所有用户可控的字段进行HTML转义
 */
export function sanitizeProductData(product: any): ProductData {
    if (!product || typeof product !== 'object') {
        return product;
    }
    
    const sanitized = { ...product };
    
    // 转义产品标题
    if (sanitized.productTitle) {
        sanitized.productTitle = escapeHtml(sanitized.productTitle);
    }
    
    // 转义五点描述
    if (Array.isArray(sanitized.feature_bullets)) {
        sanitized.feature_bullets = sanitized.feature_bullets.map((bullet: string) => 
            escapeHtml(bullet)
        );
    }
    
    // 转义评论内容
    if (Array.isArray(sanitized.customer_reviews)) {
        sanitized.customer_reviews = sanitized.customer_reviews.map((review: any) => ({
            ...review,
            headline: review.headline ? escapeHtml(review.headline) : '',
            body: review.body ? escapeHtml(review.body) : '',
            author: review.author ? escapeHtml(review.author) : ''
        }));
    }
    
    // 清理URL
    if (sanitized.url) {
        sanitized.url = sanitizeUrl(sanitized.url);
    }
    
    // 转义错误信息
    if (sanitized.error) {
        sanitized.error = escapeHtml(sanitized.error);
    }
    
    return sanitized;
}

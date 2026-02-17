/**
 * Scraper 模块类型定义
 * 
 * 注意：ProductData、ScrapedData等核心类型使用全局类型定义
 * 参见：src/types/modules-business.d.ts
 */

import type { ScrapedData, ScrapedProduct, CustomerReview } from '@/types/modules-business';

// 重新导出全局类型，方便本地使用
export type { ScrapedData, ScrapedProduct as ProductData, CustomerReview as ReviewData };

export interface Task {
    asin: string;
    status: 'pending' | 'scraping' | 'success' | 'failed';
    message: string;
    richMsg?: string;
}

export interface ProxyConfig {
    type: string;
    customUrl?: string;
}

export interface ValidationResult {
    valid: boolean;
    error?: string;
    products?: ScrapedProduct[];
}

export type DataTab = 'preview' | 'json';

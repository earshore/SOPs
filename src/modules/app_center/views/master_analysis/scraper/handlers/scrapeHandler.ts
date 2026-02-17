/**
 * 采集流程处理器
 */

import type { Task, ScrapedData } from '../types';
import { scrapeAsin } from '../../services/scraperService';
import { HistoryService } from '../../services/historyService';
import { LANGUAGE_HEADERS } from '../../../../../../common/constants/constants';
import { sleep } from '../../../../../../common/ui';

/**
 * 更新任务状态
 */
export function updateTask(
    tasks: Task[], 
    asin: string, 
    status: Task['status'], 
    message: string
): void {
    const task = tasks.find(t => t.asin === asin);
    if (task) {
        task.status = status;
        task.message = message;
        // 富文本消息用于成功状态
        if (status === 'success' && message.includes('<div')) {
            task.richMsg = message;
        }
    }
}

/**
 * 启动采集流程
 */
export async function startScrape(
    validAsins: string[],
    site: string,
    scrapeReviews: boolean,
    _tasks: Task[],
    onTaskUpdate: (asin: string, status: Task['status'], message: string) => void
): Promise<any[]> {
    const promises = validAsins.map(async (asin, index) => {
        // 更新任务状态为采集中
        onTaskUpdate(asin, 'scraping', '正在采集...');

        // 错开请求时间
        if (index > 0) await sleep(index * 800);

        return scrapeAsin(asin, site as any, scrapeReviews, (a: string, status: string, msg: string) => {
            onTaskUpdate(a, status as any, msg);
        });
    });

    return await Promise.all(promises);
}

/**
 * 处理采集完成
 */
export function handleScrapeComplete(
    products: any[],
    validAsins: string[],
    selectedSite: string
): ScrapedData {
    // 处理失败或空结果
    if (!products || products.length === 0) {
        products = validAsins.map(asin => ({
            asin, scrape_status: 'failed', error: 'Unknown Error'
        }));
    }

    const siteConfig = (LANGUAGE_HEADERS as any)[selectedSite] || {};

    const scrapedData: ScrapedData = {
        metadata: {
            scrape_timestamp: new Date().toISOString(),
            marketplace: selectedSite,
            domain: siteConfig.domain || "unknown",
            language: siteConfig.name || "unknown",
            total_asins: validAsins.length,
        },
        products,
    };

    // 保存历史记录
    HistoryService.save(scrapedData);

    return scrapedData;
}

/**
 * 采集流程处理器
 */

import { LANGUAGE_HEADERS } from '@/common/constants/constants';
import { sleep } from '@/common/ui';

import { HistoryService } from '../../services/historyService';
import { scrapeAsin } from '../../services/scraperService';

import type { Task, ScrapedData, TaskStatusCallback } from '../types';
import type { ScrapedProduct, ScraperSite } from '@/types/modules-business';


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
  site: ScraperSite,
  scrapeReviews: boolean,
  _tasks: Task[],
  onTaskUpdate: TaskStatusCallback
): Promise<ScrapedProduct[]> {
  const promises = validAsins.map(async (asin, index) => {
    // 更新任务状态为采集中
    onTaskUpdate(asin, 'scraping', '正在采集...');

    // 错开请求时间
    if (index > 0) await sleep(index * 800);

    return scrapeAsin(asin, site, scrapeReviews, (a: string, status: string, msg: string) => {
      onTaskUpdate(a, status as Task['status'], msg);
    });
  });

  return await Promise.all(promises);
}

/**
 * 处理采集完成
 */
export function handleScrapeComplete(
  products: ScrapedProduct[],
  validAsins: string[],
  selectedSite: ScraperSite
): ScrapedData {
  // 处理失败或空结果
  let finalProducts = products;
  if (!products || products.length === 0) {
    finalProducts = validAsins.map(asin => ({
      asin,
      url: '',
      language: '',
      productTitle: '',
      feature_bullets: [],
      customer_reviews: [],
      scrape_status: 'failed' as const,
      error: 'Unknown Error',
    }));
  }

  const siteConfig = (LANGUAGE_HEADERS as Record<string, { domain: string; name: string }>)[
    selectedSite
  ] || { domain: 'unknown', name: 'unknown' };

  const scrapedData: ScrapedData = {
    metadata: {
      scrape_timestamp: new Date().toISOString(),
      marketplace: selectedSite,
      domain: siteConfig.domain || 'unknown',
      language: siteConfig.name || 'unknown',
      total_asins: validAsins.length,
      // Used by 最近作业 journey captions (数据采集 → 数据来源).
      data_source: 'scrape',
    },
    products: finalProducts,
  };

  return scrapedData;
}

export async function saveScrapeSnapshot(scrapedData: ScrapedData): Promise<void> {
  try {
    await HistoryService.saveAsync(scrapedData);
  } catch {
    HistoryService.save(scrapedData);
  }
}

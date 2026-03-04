// src/modules/app_center/views/master_analysis/services/historyService.ts
// ================================================================
// 🎯 Phase 4: 已迁移使用 StorageService
// ================================================================

import { appStore } from '@/stores/useAppStore';
import { StorageService, STORAGE_KEYS } from "../../../../../services/storageService";
import { configCenter } from '../../../../../common/config/ConfigCenter';
import type { HistoryItem, ScrapedProduct, ScrapedData, AnalysisReport } from "../../../../../types/modules-business";

import { Logger } from '../../../../../services/loggerService';
const MAX_HISTORY_ITEMS = configCenter.get<number>('history.maxItems') || 20;

// ----------------------------------------
// 类型定义
// ----------------------------------------

interface CachedProduct {
  product: ScrapedProduct;
  timestamp: string;
}

// ----------------------------------------
// History Service
// ----------------------------------------

export const HistoryService = {
  /**
   * 获取所有历史记录
   * @returns 历史记录数组
   */
  getAll(): HistoryItem[] {
    try {
      return StorageService.getScrapeHistory();
    } catch (e) {
      Logger.error("读取历史记录失败", e);
      return [];
    }
  },

  /**
   * 保存一次抓取记录
   * @param data 抓取的数据
   * @param report 分析报告(可选)
   */
  save(data: ScrapedData, report?: AnalysisReport): HistoryItem[] {
    const history = this.getAll();
    const currentState = appStore.getState();
    // 使用当前 state 中的 ID，如果是新抓取则用时间戳生成新 ID
    const rawId = currentState.scraper.currentHistoryId || Date.now();
    const id = typeof rawId === 'number' ? rawId : Number(rawId);

    const historyItem: HistoryItem = {
      id: id,
      timestamp: data.metadata?.scrape_timestamp || new Date().toISOString(),
      site: data.metadata?.marketplace || currentState.scraper?.selectedSite || 'US',
      asins: data.products?.map(p => p.asin) || [],
      data,
      report,
    };

    // 检查是更新现有记录还是插入新记录
    const existingIndex = history.findIndex((h) => h.id === id);
    if (existingIndex !== -1) {
      history[existingIndex] = historyItem;
    } else {
      // 新记录插到最前面
      history.unshift(historyItem);
      appStore.getState().setCurrentHistoryId(historyItem.id);
    }

    // 保持存储空间整洁，只留最新的
    const trimmedHistory = history.slice(0, MAX_HISTORY_ITEMS);
    StorageService.setScrapeHistory(trimmedHistory);

    return trimmedHistory;
  },

  /**
   * 根据ID获取单条记录
   * @param id - 历史记录ID
   */
  getById(id: number): HistoryItem | undefined {
    const history = this.getAll();
    return history.find((h) => h.id === Number(id)); // 确保类型匹配
  },

  /**
   * 清空所有记录
   */
  clear(): void {
    StorageService.remove(STORAGE_KEYS.SCRAPE_HISTORY);
  },

  /**
   * ✅ 新增：根据 ASIN 和站点查找最近的有效缓存
   * 用于 scraperService 在抓取前进行查询
   */
  getByAsin(asin: string, site: string): CachedProduct | null {
    const history = this.getAll();

    // 遍历所有历史任务
    for (const record of history) {
      // 1. 站点必须匹配
      if (record.site !== site) continue;

      // 2. 检查该任务是否包含此 ASIN 且状态为 success
      if (record.data && record.data.products) {
        const product = record.data.products.find(
          p => p.asin === asin && p.scrape_status === "success"
        );

        if (product) {
          // 返回找到的产品数据和该条记录的时间戳
          return {
            product: product,
            timestamp: record.timestamp
          };
        }
      }
    }
    return null;
  },

  /**
   * ✅ 新增：更新历史记录的分析状态
   * @param id - 历史记录ID
   * @param analysisReport - 分析报告数据
   */
  updateAnalysisStatus(id: number | string, analysisReport: AnalysisReport): boolean {
    try {
      const history = this.getAll();
      const targetIndex = history.findIndex((h) => h.id === Number(id));

      if (targetIndex === -1) {
        Logger.warn(`[HistoryService] 未找到ID为 ${id} 的历史记录`);
        return false;
      }

      // 获取目标历史记录
      const targetItem = history[targetIndex];
      if (!targetItem) {
        Logger.warn(`[HistoryService] 历史记录项为空`);
        return false;
      }

      // 更新分析状态
      targetItem.analysisStatus = {
        isAnalyzed: true,
        analyzedAt: new Date().toISOString(),
        analysisReport: analysisReport
      };

      // 保存更新后的历史记录
      StorageService.setScrapeHistory(history);

      Logger.debug(`[HistoryService] 已更新历史记录 ${id} 的分析状态`);
      return true;
    } catch (error) {
      Logger.error(`[HistoryService] 更新分析状态失败:`, error);
      return false;
    }
  }
};

// src/modules/app_center/views/master_analysis/services/historyService.ts
// ================================================================
// 🎯 Phase 4: 已迁移使用 StorageService
// ================================================================

import { appStore } from '@/stores/useAppStore';
import { StorageService, STORAGE_KEYS } from "../../../../../services/storageService";
import { configCenter } from '../../../../../common/config/ConfigCenter';
import type { HistoryItem, ScrapedProduct, ScrapedData, AnalysisReport } from "../../../../../types/modules-business";

const MAX_HISTORY_ITEMS =
  configCenter.get<number>('storage.historyMaxItems') ||
  configCenter.get<number>('history.maxItems') ||
  50;

let historyCache: HistoryItem[] | null = null;

function isSameHistoryId(left: HistoryItem['id'], right: HistoryItem['id']): boolean {
  return String(left) === String(right);
}

function createHistoryId(history: HistoryItem[]): number {
  let id = Date.now();
  while (history.some((item) => isSameHistoryId(item.id, id))) {
    id += 1;
  }
  return id;
}

function getHistoryTime(item: HistoryItem): number {
  const time = new Date(item.timestamp).getTime();
  return Number.isFinite(time) ? time : 0;
}

type AppState = ReturnType<typeof appStore.getState>;

interface HistoryDraft {
  historyItem: HistoryItem;
  currentHistoryIndex: number;
  shouldUpdateCurrent: boolean;
}

function getCurrentHistoryIndex(history: HistoryItem[], currentHistoryId: HistoryItem['id'] | null): number {
  return currentHistoryId !== null
    ? history.findIndex((h) => isSameHistoryId(h.id, currentHistoryId))
    : -1;
}

function getHistoryItemId(
  shouldUpdateCurrent: boolean,
  currentHistoryItem: HistoryItem | undefined,
  history: HistoryItem[]
): HistoryItem['id'] {
  return shouldUpdateCurrent && currentHistoryItem
    ? currentHistoryItem.id
    : createHistoryId(history);
}

function createHistoryDraft(
  data: ScrapedData,
  report: AnalysisReport | undefined,
  history: HistoryItem[],
  currentState: AppState
): HistoryDraft {
  const timestamp = data.metadata?.scrape_timestamp || new Date().toISOString();
  const currentHistoryId = currentState.scraper.currentHistoryId;
  const currentHistoryIndex = getCurrentHistoryIndex(history, currentHistoryId);
  const currentHistoryItem = currentHistoryIndex >= 0 ? history[currentHistoryIndex] : undefined;
  const shouldUpdateCurrent = !!currentHistoryItem && currentHistoryItem.timestamp === timestamp;
  const id = getHistoryItemId(shouldUpdateCurrent, currentHistoryItem, history);

  return {
    currentHistoryIndex,
    shouldUpdateCurrent,
    historyItem: {
      id,
      timestamp,
      site: data.metadata?.marketplace || currentState.scraper?.selectedSite || 'US',
      asins: data.products?.map(p => p.asin) || [],
      data,
      report,
    }
  };
}

function upsertHistoryItem(history: HistoryItem[], draft: HistoryDraft): void {
  if (draft.shouldUpdateCurrent && draft.currentHistoryIndex >= 0) {
    history[draft.currentHistoryIndex] = draft.historyItem;
    return;
  }

  history.unshift(draft.historyItem);
}

function trimHistory(history: HistoryItem[]): HistoryItem[] {
  return history
    .sort((a, b) => getHistoryTime(b) - getHistoryTime(a))
    .slice(0, MAX_HISTORY_ITEMS);
}

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
      return historyCache || StorageService.getScrapeHistory();
    } catch (e) {
      console.error("读取历史记录失败", e);
      return [];
    }
  },

  /**
   * 异步获取历史记录（IndexedDB 主存储）
   */
  async getAllAsync(): Promise<HistoryItem[]> {
    try {
      historyCache = await StorageService.getScrapeHistoryAsync();
      return historyCache;
    } catch (e) {
      console.error("读取 IndexedDB 历史记录失败", e);
      historyCache = StorageService.getScrapeHistory();
      return historyCache;
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
    const draft = createHistoryDraft(data, report, history, currentState);

    upsertHistoryItem(history, draft);
    appStore.getState().setCurrentHistoryId(draft.historyItem.id);

    // 保持存储空间整洁，只留最新的
    const trimmedHistory = trimHistory(history);
    const saved = StorageService.setScrapeHistory(trimmedHistory);
    if (!saved) {
      throw new Error('保存历史记录失败：本地存储空间不足');
    }
    historyCache = trimmedHistory;

    return trimmedHistory;
  },

  /**
   * 异步保存历史记录（IndexedDB 主存储）
   */
  async saveAsync(data: ScrapedData, report?: AnalysisReport): Promise<HistoryItem[]> {
    const history = await this.getAllAsync();
    const currentState = appStore.getState();
    const draft = createHistoryDraft(data, report, history, currentState);

    upsertHistoryItem(history, draft);
    appStore.getState().setCurrentHistoryId(draft.historyItem.id);

    const trimmedHistory = trimHistory(history);

    const saved = await StorageService.setScrapeHistoryAsync(trimmedHistory);
    if (!saved) {
      throw new Error('保存历史记录失败：本地存储空间不足，请导出备份后清理缓存');
    }

    historyCache = trimmedHistory;
    return trimmedHistory;
  },

  /**
   * 根据ID获取单条记录
   * @param id - 历史记录ID
   */
  getById(id: number | string): HistoryItem | undefined {
    const history = this.getAll();
    return history.find((h) => isSameHistoryId(h.id, id));
  },

  /**
   * 清空所有记录
   */
  clear(): void {
    StorageService.remove(STORAGE_KEYS.SCRAPE_HISTORY);
    historyCache = [];
  },

  async clearAsync(): Promise<void> {
    await StorageService.removeScrapeHistoryAsync();
    historyCache = [];
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

  async getByAsinAsync(asin: string, site: string): Promise<CachedProduct | null> {
    await this.getAllAsync();
    return this.getByAsin(asin, site);
  },

  /**
   * ✅ 新增：更新历史记录的分析状态
   * @param id - 历史记录ID
   * @param analysisReport - 分析报告数据
   */
  updateAnalysisStatus(id: number | string, analysisReport: AnalysisReport): boolean {
    try {
      const history = this.getAll();
      const targetIndex = history.findIndex((h) => isSameHistoryId(h.id, id));

      if (targetIndex === -1) {
        console.warn(`[HistoryService] 未找到ID为 ${id} 的历史记录`);
        return false;
      }

      // 获取目标历史记录
      const targetItem = history[targetIndex];
      if (!targetItem) {
        console.warn(`[HistoryService] 历史记录项为空`);
        return false;
      }

      // 更新分析状态
      targetItem.analysisStatus = {
        isAnalyzed: true,
        analyzedAt: new Date().toISOString(),
        analysisReport: analysisReport
      };

      // 保存更新后的历史记录
      const saved = StorageService.setScrapeHistory(history);
      if (!saved) return false;
      historyCache = history;

      console.log(`[HistoryService] 已更新历史记录 ${id} 的分析状态`);
      return true;
    } catch (error) {
      console.error(`[HistoryService] 更新分析状态失败:`, error);
      return false;
    }
  },

  async updateAnalysisStatusAsync(id: number | string, analysisReport: AnalysisReport): Promise<boolean> {
    try {
      const history = await this.getAllAsync();
      const targetIndex = history.findIndex((h) => isSameHistoryId(h.id, id));

      if (targetIndex === -1) {
        console.warn(`[HistoryService] 未找到ID为 ${id} 的历史记录`);
        return false;
      }

      const targetItem = history[targetIndex];
      if (!targetItem) {
        console.warn(`[HistoryService] 历史记录项为空`);
        return false;
      }

      targetItem.analysisStatus = {
        isAnalyzed: true,
        analyzedAt: new Date().toISOString(),
        analysisReport
      };

      const saved = await StorageService.setScrapeHistoryAsync(history);
      if (!saved) return false;
      historyCache = history;

      console.log(`[HistoryService] 已更新历史记录 ${id} 的分析状态`);
      return true;
    } catch (error) {
      console.error(`[HistoryService] 更新分析状态失败:`, error);
      return false;
    }
  }
};

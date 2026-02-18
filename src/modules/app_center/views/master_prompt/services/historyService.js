// src/modules/master_prompt/services/historyService.js
// ================================================================
// 🎯 Phase 4: 已迁移使用 StorageService
// ================================================================

import state from "../../../../../common/state";
import { StorageService, STORAGE_KEYS } from "../../../../../services/storageService.ts";

const MAX_HISTORY_ITEMS = 20; // 限制只存最近20条

export const HistoryService = {
  /**
   * 获取所有历史记录
   * @returns {Array} 历史记录数组
   */
  getAll() {
    try {
      return StorageService.getScrapeHistory();
    } catch (e) {
      console.error("读取历史记录失败", e);
      return [];
    }
  },

  /**
   * 保存一次抓取记录
   * @param {Object} data 抓取的数据
   * @param {Object} report 分析报告(可选)
   */
  save(data, report) {
    const history = this.getAll();
    // 使用当前 state 中的 ID，如果是新抓取则用时间戳生成新 ID
    const id = state.currentHistoryId || Date.now();

    const historyItem = {
      id: id,
      timestamp: data.metadata?.scrape_timestamp || new Date().toISOString(),
      site: data.metadata?.marketplace || state.scraper?.selectedSite || 'US',
      asins: data.products?.map((p) => p.asin) || [],
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
      state.currentHistoryId = historyItem.id;
    }

    // 保持存储空间整洁，只留最新的
    const trimmedHistory = history.slice(0, MAX_HISTORY_ITEMS);
    StorageService.setScrapeHistory(trimmedHistory);

    return trimmedHistory;
  },

  /**
   * 根据ID获取单条记录
   * @param {number} id
   */
  getById(id) {
    const history = this.getAll();
    return history.find((h) => h.id === Number(id)); // 确保类型匹配
  },

  /**
   * 清空所有记录
   */
  clear() {
    StorageService.remove(STORAGE_KEYS.SCRAPE_HISTORY);
  },

  /**
   * ✅ 新增：根据 ASIN 和站点查找最近的有效缓存
   * 用于 scraperService 在抓取前进行查询
   */
  getByAsin(asin, site) {
    const history = this.getAll();

    // 遍历所有历史任务
    for (const record of history) {
      // 1. 站点必须匹配
      if (record.site !== site) continue;

      // 2. 检查该任务是否包含此 ASIN 且状态为 success
      if (record.data && record.data.products) {
        const product = record.data.products.find(
          (p) => p.asin === asin && p.scrape_status === "success"
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
  }
};
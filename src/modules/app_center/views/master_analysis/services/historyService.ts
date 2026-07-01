// src/modules/app_center/views/master_analysis/services/historyService.ts
// ================================================================
// 🎯 Phase 4: 已迁移使用 StorageService
// ================================================================

import { appStore } from '@/stores/useAppStore';
import { StorageService, STORAGE_KEYS } from "../../../../../services/storageService";
import { configCenter } from '../../../../../common/config/ConfigCenter';
import type {
  GeneratedPromptRecord,
  HistoryItem,
  HistoryPromptResults,
  ScrapedProduct,
  ScrapedData,
  AnalysisReport
} from "../../../../../types/modules-business";
import type { UserProductProfile } from "../../../../../types/state";
import { getReportFingerprint, getScrapedDataFingerprint } from './reportIdentity';

const MAX_HISTORY_ITEMS =
  configCenter.get<number>('storage.historyMaxItems') ||
  configCenter.get<number>('history.maxItems') ||
  50;
const MAX_PROMPT_RESULT_HISTORY = 20;

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

interface CreateHistoryItemInput {
  data: ScrapedData;
  report: AnalysisReport | undefined;
  options: SaveHistoryOptions | undefined;
  currentState: AppState;
  previousItem: HistoryItem | undefined;
  id: HistoryItem['id'];
  timestamp: string;
}

interface SaveHistoryOptions {
  invalidateDerived?: boolean;
}

interface AnalysisSourceBinding {
  sourceHistoryId?: HistoryItem['id'] | null;
  sourceDataFingerprint?: string | null;
  sourceAsins?: string[];
  sourceTargets?: string[];
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

function getHistoryItemAt(history: HistoryItem[], index: number): HistoryItem | undefined {
  return index >= 0 ? history[index] : undefined;
}

function shouldUpdateHistoryItem(currentHistoryItem: HistoryItem | undefined, timestamp: string): boolean {
  return currentHistoryItem !== undefined && currentHistoryItem.timestamp === timestamp;
}

function getHistoryDataFingerprint(item: Pick<HistoryItem, 'data' | 'dataFingerprint'>): string | null {
  return item.dataFingerprint || getScrapedDataFingerprint(item.data);
}

function clearSnapshotDerivedState(item: HistoryItem): void {
  delete item.report;
  delete item.analysisStatus;
  delete item.promptResults;
  delete item.userProductProfile;
}

function hasSameSnapshotData(previousItem: HistoryItem | undefined, dataFingerprint: string | null): boolean {
  if (!previousItem || !dataFingerprint) {
    return false;
  }

  return getHistoryDataFingerprint(previousItem) === dataFingerprint;
}

function promptMatchesSnapshot(
  prompt: GeneratedPromptRecord | undefined,
  dataFingerprint: string | null,
  reportFingerprint?: string | null
): prompt is GeneratedPromptRecord {
  if (!prompt) {
    return false;
  }

  if (prompt.sourceDataFingerprint && dataFingerprint && prompt.sourceDataFingerprint !== dataFingerprint) {
    return false;
  }

  if (prompt.reportFingerprint && reportFingerprint && prompt.reportFingerprint !== reportFingerprint) {
    return false;
  }

  return true;
}

function filterPromptResultsForSnapshot(
  item: HistoryItem,
  reportFingerprint?: string | null
): HistoryPromptResults | null {
  const previousResults = item.promptResults;
  if (!previousResults) {
    return null;
  }

  const dataFingerprint = getHistoryDataFingerprint(item);
  const history = previousResults.history.filter((entry) =>
    promptMatchesSnapshot(entry, dataFingerprint, reportFingerprint)
  );
  const listing = promptMatchesSnapshot(previousResults.listing, dataFingerprint, reportFingerprint)
    ? previousResults.listing
    : history.find((entry) => entry.type === 'listing');
  const visual = promptMatchesSnapshot(previousResults.visual, dataFingerprint, reportFingerprint)
    ? previousResults.visual
    : history.find((entry) => entry.type === 'visual');

  if (!listing && !visual && history.length === 0) {
    return null;
  }

  return {
    listing,
    visual,
    history,
    updatedAt: previousResults.updatedAt
  };
}

function canAttachPromptToSnapshot(item: HistoryItem, prompt: GeneratedPromptRecord): boolean {
  const dataFingerprint = getHistoryDataFingerprint(item);
  const itemReportFingerprint = getSnapshotReportFingerprint(item);

  if (prompt.sourceDataFingerprint && dataFingerprint && prompt.sourceDataFingerprint !== dataFingerprint) {
    return false;
  }

  if (prompt.reportFingerprint && itemReportFingerprint && prompt.reportFingerprint !== itemReportFingerprint) {
    return false;
  }

  return true;
}

function resolveHistorySite(data: ScrapedData, previousItem: HistoryItem | undefined, currentState: AppState): string {
  return data.metadata?.marketplace || previousItem?.site || currentState.scraper?.selectedSite || 'US';
}

function getHistoryAsins(data: ScrapedData): string[] {
  return data.products?.map(p => p.asin) || [];
}

function resolveHistoryReport(
  report: AnalysisReport | undefined,
  previousItem: HistoryItem | undefined,
  shouldPreserveDerived: boolean
): AnalysisReport | undefined {
  if (report) {
    return report;
  }

  return shouldPreserveDerived ? previousItem?.report : undefined;
}

function getSnapshotReportFingerprint(item: HistoryItem): string | null {
  return item.analysisStatus?.reportFingerprint
    || getReportFingerprint(item.analysisStatus?.analysisReport)
    || getReportFingerprint(item.report);
}

function hasBindingDataMismatch(
  currentDataFingerprint: string | null,
  binding?: AnalysisSourceBinding
): boolean {
  return !!binding?.sourceDataFingerprint && binding.sourceDataFingerprint !== currentDataFingerprint;
}

function clearPromptResultsIfReportChanged(item: HistoryItem, reportFingerprint: string | undefined): void {
  const previousReportFingerprint = getSnapshotReportFingerprint(item);
  if (previousReportFingerprint && reportFingerprint && previousReportFingerprint !== reportFingerprint) {
    delete item.promptResults;
  }
}

function applyAnalysisStatus(
  item: HistoryItem,
  analysisReport: AnalysisReport,
  binding?: AnalysisSourceBinding
): boolean {
  const currentDataFingerprint = getHistoryDataFingerprint(item);
  if (hasBindingDataMismatch(currentDataFingerprint, binding)) {
    return false;
  }

  const sourceDataFingerprint = binding?.sourceDataFingerprint || currentDataFingerprint || undefined;
  const reportFingerprint = getReportFingerprint(analysisReport) || undefined;
  clearPromptResultsIfReportChanged(item, reportFingerprint);

  item.analysisStatus = {
    isAnalyzed: true,
    analyzedAt: new Date().toISOString(),
    analysisReport,
    sourceHistoryId: binding?.sourceHistoryId ?? item.id,
    sourceDataFingerprint,
    sourceAsins: binding?.sourceAsins ?? item.asins,
    sourceTargets: binding?.sourceTargets,
    reportFingerprint
  };

  return true;
}

function createHistoryItem(input: CreateHistoryItemInput): HistoryItem {
  const { data, report, options, currentState, previousItem, id, timestamp } = input;
  const dataFingerprint = getScrapedDataFingerprint(data) || undefined;
  const shouldPreserveDerived = !options?.invalidateDerived && hasSameSnapshotData(previousItem, dataFingerprint || null);

  const historyItem: HistoryItem = {
    ...(previousItem || {}),
    id,
    timestamp,
    site: resolveHistorySite(data, previousItem, currentState),
    asins: getHistoryAsins(data),
    data,
    dataFingerprint,
    report: resolveHistoryReport(report, previousItem, shouldPreserveDerived),
  };

  if (!shouldPreserveDerived) {
    clearSnapshotDerivedState(historyItem);
    if (report) {
      historyItem.report = report;
    }
  }

  return historyItem;
}

function createHistoryDraft(
  data: ScrapedData,
  report: AnalysisReport | undefined,
  history: HistoryItem[],
  currentState: AppState,
  options?: SaveHistoryOptions
): HistoryDraft {
  const timestamp = data.metadata?.scrape_timestamp || new Date().toISOString();
  const currentHistoryId = currentState.scraper.currentHistoryId;
  const currentHistoryIndex = getCurrentHistoryIndex(history, currentHistoryId);
  const currentHistoryItem = getHistoryItemAt(history, currentHistoryIndex);
  const shouldUpdateCurrent = shouldUpdateHistoryItem(currentHistoryItem, timestamp);
  const id = getHistoryItemId(shouldUpdateCurrent, currentHistoryItem, history);
  const previousItem = shouldUpdateCurrent ? currentHistoryItem : undefined;

  return {
    currentHistoryIndex,
    shouldUpdateCurrent,
    historyItem: createHistoryItem({ data, report, options, currentState, previousItem, id, timestamp })
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

function removeHistoryItem(history: HistoryItem[], id: HistoryItem['id']): HistoryItem[] | null {
  const nextHistory = history.filter((item) => !isSameHistoryId(item.id, id));
  return nextHistory.length === history.length ? null : nextHistory;
}

function clearCurrentSnapshotState(): void {
  const state = appStore.getState();

  state.setCurrentHistoryId(null);
  state.setScrapedData(null);
  state.setAnalysisReport(null);
  state.setTranslatedReport(null);
}

function clearCurrentSnapshotStateIfMatches(id: HistoryItem['id']): void {
  const state = appStore.getState();
  const currentHistoryId = state.scraper.currentHistoryId;

  if (currentHistoryId !== null && isSameHistoryId(currentHistoryId, id)) {
    clearCurrentSnapshotState();
  }
}

function upsertPromptResult(item: HistoryItem, prompt: GeneratedPromptRecord): void {
  const dataFingerprint = getHistoryDataFingerprint(item) || undefined;
  const promptRecord: GeneratedPromptRecord = {
    ...prompt,
    historyId: item.id,
    sourceHistoryId: prompt.sourceHistoryId ?? item.id,
    sourceDataFingerprint: prompt.sourceDataFingerprint ?? dataFingerprint
  };
  const previousResults = item.promptResults;
  const previousHistory = previousResults?.history || [];
  const nextResults: HistoryPromptResults = {
    listing: previousResults?.listing,
    visual: previousResults?.visual,
    history: [
      promptRecord,
      ...previousHistory.filter((entry) => entry.id !== promptRecord.id)
    ].slice(0, MAX_PROMPT_RESULT_HISTORY),
    updatedAt: promptRecord.generatedAt
  };

  if (promptRecord.type === 'listing') {
    nextResults.listing = promptRecord;
  } else {
    nextResults.visual = promptRecord;
  }

  item.promptResults = nextResults;
}

function deletePromptResultFromItem(item: HistoryItem, promptId: string): boolean {
  const previousResults = item.promptResults;
  if (!previousResults) {
    return false;
  }

  const nextHistory = previousResults.history.filter((entry) => entry.id !== promptId);
  const removedListing = previousResults.listing?.id === promptId;
  const removedVisual = previousResults.visual?.id === promptId;
  const removedFromHistory = nextHistory.length !== previousResults.history.length;

  if (!removedListing && !removedVisual && !removedFromHistory) {
    return false;
  }

  const nextResults: HistoryPromptResults = {
    ...previousResults,
    listing: removedListing
      ? nextHistory.find((entry) => entry.type === 'listing')
      : previousResults.listing,
    visual: removedVisual
      ? nextHistory.find((entry) => entry.type === 'visual')
      : previousResults.visual,
    history: nextHistory,
    updatedAt: new Date().toISOString()
  };

  if (!nextResults.listing && !nextResults.visual && nextHistory.length === 0) {
    delete item.promptResults;
    return true;
  }

  item.promptResults = nextResults;
  return true;
}

function cloneUserProductProfile(profile: UserProductProfile): UserProductProfile {
  return JSON.parse(JSON.stringify(profile)) as UserProductProfile;
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
  save(data: ScrapedData, report?: AnalysisReport, options?: SaveHistoryOptions): HistoryItem[] {
    const history = this.getAll();
    const currentState = appStore.getState();
    const draft = createHistoryDraft(data, report, history, currentState, options);

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
  async saveAsync(data: ScrapedData, report?: AnalysisReport, options?: SaveHistoryOptions): Promise<HistoryItem[]> {
    const history = await this.getAllAsync();
    const currentState = appStore.getState();
    const draft = createHistoryDraft(data, report, history, currentState, options);

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
    clearCurrentSnapshotState();
  },

  async clearAsync(): Promise<void> {
    await StorageService.removeScrapeHistoryAsync();
    historyCache = [];
    clearCurrentSnapshotState();
  },

  /**
   * 根据ID删除单条历史快照
   */
  deleteById(id: HistoryItem['id']): boolean {
    const history = this.getAll();
    const nextHistory = removeHistoryItem(history, id);

    if (!nextHistory) {
      return false;
    }

    const saved = StorageService.setScrapeHistory(nextHistory);
    if (!saved) {
      throw new Error('删除历史记录失败：本地存储空间不足，请导出备份后清理缓存');
    }

    historyCache = nextHistory;
    clearCurrentSnapshotStateIfMatches(id);
    return true;
  },

  async deleteByIdAsync(id: HistoryItem['id']): Promise<boolean> {
    const history = await this.getAllAsync();
    const nextHistory = removeHistoryItem(history, id);

    if (!nextHistory) {
      return false;
    }

    const saved = await StorageService.setScrapeHistoryAsync(nextHistory);
    if (!saved) {
      throw new Error('删除历史记录失败：本地存储空间不足，请导出备份后清理缓存');
    }

    historyCache = nextHistory;
    clearCurrentSnapshotStateIfMatches(id);
    return true;
  },

  async updateSnapshotDataAsync(id: HistoryItem['id'], data: ScrapedData): Promise<boolean> {
    try {
      const history = await this.getAllAsync();
      const targetIndex = history.findIndex((h) => isSameHistoryId(h.id, id));

      if (targetIndex === -1) {
        return false;
      }

      const targetItem = history[targetIndex];
      if (!targetItem) {
        return false;
      }

      const previousFingerprint = getHistoryDataFingerprint(targetItem);
      const nextFingerprint = getScrapedDataFingerprint(data) || undefined;

      targetItem.data = data;
      targetItem.dataFingerprint = nextFingerprint;
      targetItem.timestamp = data.metadata?.scrape_timestamp || targetItem.timestamp;
      targetItem.site = data.metadata?.marketplace || targetItem.site;
      targetItem.asins = data.products?.map((product) => product.asin) || targetItem.asins;

      if (previousFingerprint !== nextFingerprint) {
        clearSnapshotDerivedState(targetItem);
      }

      const saved = await StorageService.setScrapeHistoryAsync(history);
      if (!saved) return false;
      historyCache = history;

      return true;
    } catch (error) {
      console.error(`[HistoryService] 更新快照数据失败:`, error);
      return false;
    }
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

  getPromptResultsById(id: HistoryItem['id'], reportFingerprint?: string | null): HistoryPromptResults | null {
    const item = this.getById(id);
    return item ? filterPromptResultsForSnapshot(item, reportFingerprint) : null;
  },

  getUserProductProfileById(id: HistoryItem['id']): UserProductProfile | null {
    const item = this.getById(id);
    return item?.userProductProfile
      ? cloneUserProductProfile(item.userProductProfile)
      : null;
  },

  updateUserProductProfile(id: HistoryItem['id'], profile: UserProductProfile): boolean {
    try {
      const history = this.getAll();
      const targetIndex = history.findIndex((h) => isSameHistoryId(h.id, id));

      if (targetIndex === -1) {
        return false;
      }

      const targetItem = history[targetIndex];
      if (!targetItem) {
        return false;
      }

      targetItem.userProductProfile = cloneUserProductProfile(profile);

      const saved = StorageService.setScrapeHistory(history);
      if (!saved) return false;
      historyCache = history;

      return true;
    } catch (error) {
      console.error(`[HistoryService] 更新产品 DNA 快照失败:`, error);
      return false;
    }
  },

  async updateUserProductProfileAsync(id: HistoryItem['id'], profile: UserProductProfile): Promise<boolean> {
    try {
      const history = await this.getAllAsync();
      const targetIndex = history.findIndex((h) => isSameHistoryId(h.id, id));

      if (targetIndex === -1) {
        return false;
      }

      const targetItem = history[targetIndex];
      if (!targetItem) {
        return false;
      }

      targetItem.userProductProfile = cloneUserProductProfile(profile);

      const saved = await StorageService.setScrapeHistoryAsync(history);
      if (!saved) return false;
      historyCache = history;

      return true;
    } catch (error) {
      console.error(`[HistoryService] 更新产品 DNA 快照失败:`, error);
      return false;
    }
  },

  updatePromptResult(id: HistoryItem['id'], prompt: GeneratedPromptRecord): boolean {
    try {
      const history = this.getAll();
      const targetIndex = history.findIndex((h) => isSameHistoryId(h.id, id));

      if (targetIndex === -1) {
        return false;
      }

      const targetItem = history[targetIndex];
      if (!targetItem) {
        return false;
      }

      if (!canAttachPromptToSnapshot(targetItem, prompt)) {
        return false;
      }

      upsertPromptResult(targetItem, prompt);

      const saved = StorageService.setScrapeHistory(history);
      if (!saved) return false;
      historyCache = history;

      return true;
    } catch (error) {
      console.error(`[HistoryService] 更新 Prompt 结果失败:`, error);
      return false;
    }
  },

  deletePromptResult(promptId: string): boolean {
    try {
      const history = this.getAll();
      let changed = false;
      history.forEach((item) => {
        changed = deletePromptResultFromItem(item, promptId) || changed;
      });

      if (!changed) {
        return false;
      }

      const saved = StorageService.setScrapeHistory(history);
      if (!saved) return false;
      historyCache = history;

      return true;
    } catch (error) {
      console.error(`[HistoryService] 删除 Prompt 结果失败:`, error);
      return false;
    }
  },

  async deletePromptResultAsync(promptId: string): Promise<boolean> {
    try {
      const history = await this.getAllAsync();
      let changed = false;
      history.forEach((item) => {
        changed = deletePromptResultFromItem(item, promptId) || changed;
      });

      if (!changed) {
        return false;
      }

      const saved = await StorageService.setScrapeHistoryAsync(history);
      if (!saved) return false;
      historyCache = history;

      return true;
    } catch (error) {
      console.error(`[HistoryService] 删除 Prompt 结果失败:`, error);
      return false;
    }
  },

  async updatePromptResultAsync(id: HistoryItem['id'], prompt: GeneratedPromptRecord): Promise<boolean> {
    try {
      const history = await this.getAllAsync();
      const targetIndex = history.findIndex((h) => isSameHistoryId(h.id, id));

      if (targetIndex === -1) {
        return false;
      }

      const targetItem = history[targetIndex];
      if (!targetItem) {
        return false;
      }

      if (!canAttachPromptToSnapshot(targetItem, prompt)) {
        return false;
      }

      upsertPromptResult(targetItem, prompt);

      const saved = await StorageService.setScrapeHistoryAsync(history);
      if (!saved) return false;
      historyCache = history;

      return true;
    } catch (error) {
      console.error(`[HistoryService] 更新 Prompt 结果失败:`, error);
      return false;
    }
  },

  /**
   * ✅ 新增：更新历史记录的分析状态
   * @param id - 历史记录ID
   * @param analysisReport - 分析报告数据
   */
  updateAnalysisStatus(id: number | string, analysisReport: AnalysisReport, binding?: AnalysisSourceBinding): boolean {
    try {
      const history = this.getAll();
      const targetIndex = history.findIndex((h) => isSameHistoryId(h.id, id));

      if (targetIndex === -1) {
        return false;
      }

      // 获取目标历史记录
      const targetItem = history[targetIndex];
      if (!targetItem) {
        return false;
      }

      if (!applyAnalysisStatus(targetItem, analysisReport, binding)) {
        return false;
      }

      // 保存更新后的历史记录
      const saved = StorageService.setScrapeHistory(history);
      if (!saved) return false;
      historyCache = history;

      return true;
    } catch (error) {
      console.error(`[HistoryService] 更新分析状态失败:`, error);
      return false;
    }
  },

  async updateAnalysisStatusAsync(id: number | string, analysisReport: AnalysisReport, binding?: AnalysisSourceBinding): Promise<boolean> {
    try {
      const history = await this.getAllAsync();
      const targetIndex = history.findIndex((h) => isSameHistoryId(h.id, id));

      if (targetIndex === -1) {
        return false;
      }

      const targetItem = history[targetIndex];
      if (!targetItem) {
        return false;
      }

      if (!applyAnalysisStatus(targetItem, analysisReport, binding)) {
        return false;
      }

      const saved = await StorageService.setScrapeHistoryAsync(history);
      if (!saved) return false;
      historyCache = history;

      return true;
    } catch (error) {
      console.error(`[HistoryService] 更新分析状态失败:`, error);
      return false;
    }
  }
};

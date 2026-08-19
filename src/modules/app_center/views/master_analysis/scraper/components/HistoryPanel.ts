/**
 * 历史记录面板组件
 */

import { LANGUAGE_HEADERS } from '@/common/constants/constants';
import { MODULE_EVENTS } from '@/common/constants/eventConstants';
import { SystemError } from '@/common/errors/AppError';
import eventBus from '@/common/EventBus';
import { navigateToRouteId } from '@/common/router/initRouter';
import { showToast } from '@/common/ui';
import { appStore } from '@/stores/useAppStore';

import { emitHistoryUpdated } from '../../services/historyEvents';
import { HistoryService } from '../../services/historyService';
import { getScrapedDataFingerprint } from '../../services/reportIdentity';
import { confirmWithModal } from '../../utils/confirmModal';

import type { HistoryItem, ScraperSite } from '@/types/modules-business';

const nativeLoggerConsole = globalThis.console;
/**
 * 历史记录面板类
 */
export class HistoryPanel {
  private history: HistoryItem[] = [];

  constructor() {
    this.loadHistory();
  }

  /**
   * 加载历史记录
   */
  loadHistory(): void {
    this.history = HistoryService.getAll();
  }

  async loadHistoryAsync(): Promise<HistoryItem[]> {
    this.history = await HistoryService.getAllAsync();
    return this.history;
  }

  /**
   * 获取历史记录列表
   */
  getHistory(): HistoryItem[] {
    return this.history;
  }

  /**
   * 删除历史记录项
   */
  async deleteHistoryItem(id: HistoryItem['id']): Promise<boolean> {
    const confirmed = await confirmWithModal(
      '删除历史快照',
      '确定要删除这个历史快照吗？<br/><span class="text-xs text-red-400 mt-1 block">此操作无法撤销</span>',
      'ignore_delete_history_snapshot',
      '删除快照'
    );
    if (!confirmed) return false;

    try {
      const deleted = await HistoryService.deleteByIdAsync(id);
      await this.loadHistoryAsync();

      if (!deleted) {
        showToast('记录不存在或已删除', { type: 'warning' });
        return false;
      }

      showToast('快照已删除', { type: 'success' });
      emitHistoryUpdated();
      return true;
    } catch (error) {
      console.error('[Scraper] 删除历史快照失败:', error);
      const message = error instanceof Error ? error.message : '删除历史快照失败';
      showToast(message, { type: 'error' });
      return false;
    }
  }

  /**
   * 清空所有历史记录
   */
  async clearAllHistory(): Promise<void> {
    const confirmed = await confirmWithModal(
      '清空历史记录',
      '确定清空所有历史记录？<br/><span class="text-xs text-red-400 mt-1 block">清空后无法从本地历史恢复</span>',
      '',
      '清空历史'
    );
    if (!confirmed) return;

    await HistoryService.clearAsync();
    await this.loadHistoryAsync();
    emitHistoryUpdated();
    showToast('历史已清空', { type: 'success' });
  }

  /**
   * 加载历史快照
   */
  async loadHistoryItem(item: HistoryItem, isScraping: boolean): Promise<boolean> {
    if (await this.shouldCancelSnapshotLoad(isScraping)) return false;

    const metadataChanged = this.ensureSnapshotMetadata(item);
    if (metadataChanged) {
      void this.persistNormalizedSnapshot(item);
    }
    this.restoreSnapshotState(item);

    // 通知其他模块数据已更新
    eventBus.emit(MODULE_EVENTS.SCRAPER.SCRAPE_SUCCESS, item.data);

    // 显示加载成功提示
    showToast(this.getSnapshotLoadMessage(item), { type: 'success' });

    return true;
  }

  private async shouldCancelSnapshotLoad(isScraping: boolean): Promise<boolean> {
    if (!isScraping) return false;

    const confirmed = await confirmWithModal(
      '覆盖当前任务',
      '任务进行中，确定用历史快照覆盖当前数据？',
      '',
      '覆盖'
    );

    return !confirmed;
  }

  private ensureSnapshotMetadata(item: HistoryItem): boolean {
    if (!item.data) return false;

    if (!item.data.metadata) {
      const languageHeader = this.getLanguageHeader(item.site);
      item.data.metadata = {
        scrape_timestamp: item.timestamp || new Date().toISOString(),
        marketplace: item.site || 'US',
        domain: languageHeader?.domain || 'amazon.com',
        language: languageHeader?.name || 'English (US)',
        total_asins: item.asins?.length || 0,
      };
      return true;
    }

    if (!item.data.metadata.marketplace) {
      // 如果 metadata 存在但缺少 marketplace 字段
      item.data.metadata.marketplace = item.site || 'US';
      return true;
    }

    return false;
  }

  private async persistNormalizedSnapshot(item: HistoryItem): Promise<void> {
    try {
      await HistoryService.updateSnapshotDataAsync(item.id, item.data);
    } catch (error) {
      nativeLoggerConsole.warn('[Scraper] 持久化历史快照 metadata 失败:', error);
    }
  }

  private getLanguageHeader(site: string): { domain: string; name: string } | undefined {
    return (LANGUAGE_HEADERS as Record<string, { domain: string; name: string }>)[site];
  }

  private restoreSnapshotState(item: HistoryItem): void {
    const state = appStore.getState();

    // 恢复全局状态（供所有页面使用）
    state.setCurrentHistoryId(item.id);
    state.setScrapedData(item.data);
    state.setUserProductProfile(
      item.userProductProfile ? JSON.parse(JSON.stringify(item.userProductProfile)) : undefined
    );
    this.restoreAnalysisReport(item);
    state.setTranslatedReport(null);
    state.setSelectedSite(item.site as ScraperSite);
  }

  private restoreAnalysisReport(item: HistoryItem): void {
    const state = appStore.getState();
    const dataFingerprint = item.dataFingerprint || getScrapedDataFingerprint(item.data);
    const analysisStatusMatchesData =
      !item.analysisStatus?.sourceDataFingerprint ||
      item.analysisStatus.sourceDataFingerprint === dataFingerprint;

    // 优先加载"AI智能分析"的报告，如果不存在则回退到旧的"AI分析"报告
    if (
      analysisStatusMatchesData &&
      item.analysisStatus?.isAnalyzed &&
      item.analysisStatus?.analysisReport
    ) {
      state.setAnalysisReport(item.analysisStatus.analysisReport);
      return;
    }

    if (item.report) {
      state.setAnalysisReport(item.report);
      return;
    }

    state.setAnalysisReport(null);
  }

  private getSnapshotLoadMessage(item: HistoryItem): string {
    const hasReport = item.analysisStatus?.isAnalyzed || item.report;
    return hasReport ? `历史快照已加载（包含分析报告）` : `历史快照已加载`;
  }

  /**
   * 从历史快照载入分析报告（跳转到AI智能分析页面查看）
   */
  async loadAnalysisReport(item: HistoryItem): Promise<void> {
    const dataFingerprint = item.dataFingerprint || getScrapedDataFingerprint(item.data);
    const analysisStatusMatchesData =
      !item.analysisStatus?.sourceDataFingerprint ||
      item.analysisStatus.sourceDataFingerprint === dataFingerprint;

    if (!item.analysisStatus || !item.analysisStatus.isAnalyzed || !analysisStatusMatchesData) {
      showToast('该快照没有分析报告', { type: 'warning' });
      return;
    }

    try {
      // 1. 先加载历史快照数据到全局状态
      await this.loadHistoryItem(item, false);

      // 2. 确保报告数据已正确加载到全局状态
      if (!appStore.getState().analysis.analysisReport) {
        throw new SystemError('报告数据加载失败', 'HISTORY_PANEL_001', {
          module: 'HistoryPanel',
          action: 'viewAnalysisReport',
          itemId: item.id,
        });
      }

      // 3. 跳转到 AI智能分析页面查看报告
      await navigateToRouteId('ai_analysis');

      showToast('已跳转到 AI智能分析查看报告', { type: 'success' });
    } catch (error) {
      console.error('[Scraper] 载入分析报告失败:', error);
      showToast('载入分析报告失败', { type: 'error' });
    }
  }
}

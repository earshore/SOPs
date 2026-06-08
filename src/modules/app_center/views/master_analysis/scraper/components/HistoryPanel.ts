/**
 * 历史记录面板组件
 */

import type { HistoryItem, ScraperSite } from '@/types/modules-business';
import { HistoryService } from '../../services/historyService';
import { StorageService } from '../../../../../../services/storageService';
import { showToast } from '../../../../../../common/ui';
import { LANGUAGE_HEADERS } from '../../../../../../common/constants/constants';
import { appStore } from '@/stores/useAppStore';
import eventBus from '../../../../../../common/EventBus';
import { MODULE_EVENTS } from '../../../../../../common/constants/eventConstants';
import { SystemError } from '@common/errors/AppError';
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
    async deleteHistoryItem(id: HistoryItem['id']): Promise<void> {
        if (!confirm("确定要删除这条历史记录吗？")) return;

        const newHistory = this.history.filter(h => String(h.id) !== String(id));
        const saved = await StorageService.setScrapeHistoryAsync(newHistory);
        if (!saved) {
            showToast("保存失败：空间不足，请导出备份后清理缓存", { type: 'error' });
            return;
        }
        await this.loadHistoryAsync();
        showToast("记录已删除", { type: 'success' });
    }

    /**
     * 清空所有历史记录
     */
    async clearAllHistory(): Promise<void> {
        if (!confirm("确定清空所有历史记录？")) return;
        await HistoryService.clearAsync();
        await this.loadHistoryAsync();
        showToast("历史已清空", { type: 'success' });
    }

    /**
     * 加载历史快照
     */
    loadHistoryItem(item: HistoryItem, isScraping: boolean): boolean {
        if (this.shouldCancelSnapshotLoad(isScraping)) return false;

        this.ensureSnapshotMetadata(item);
        this.restoreSnapshotState(item);

        // 通知其他模块数据已更新
        eventBus.emit(MODULE_EVENTS.SCRAPER.SCRAPE_SUCCESS, item.data);

        // 显示加载成功提示
        showToast(this.getSnapshotLoadMessage(item), { type: 'success' });

        return true;
    }

    private shouldCancelSnapshotLoad(isScraping: boolean): boolean {
        return isScraping && !confirm("任务进行中，确定覆盖？");
    }

    private ensureSnapshotMetadata(item: HistoryItem): void {
        if (!item.data) return;

        if (!item.data.metadata) {
            const languageHeader = this.getLanguageHeader(item.site);
            item.data.metadata = {
                scrape_timestamp: item.timestamp || new Date().toISOString(),
                marketplace: item.site || 'US',
                domain: languageHeader?.domain || 'amazon.com',
                language: languageHeader?.name || 'English (US)',
                total_asins: item.asins?.length || 0,
            };
            return;
        }

        if (!item.data.metadata.marketplace) {
            // 如果 metadata 存在但缺少 marketplace 字段
            item.data.metadata.marketplace = item.site || 'US';
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
        this.restoreAnalysisReport(item);
        state.setTranslatedReport(null);
        state.scraper.selectedSite = item.site as ScraperSite;
    }

    private restoreAnalysisReport(item: HistoryItem): void {
        const state = appStore.getState();

        // 优先加载"AI智能分析"的报告，如果不存在则回退到旧的"AI分析"报告
        if (item.analysisStatus?.isAnalyzed && item.analysisStatus?.analysisReport) {
            state.setAnalysisReport(item.analysisStatus.analysisReport);
            console.log('[Scraper] 已加载"AI智能分析"报告到全局状态');
            return;
        }

        if (item.report) {
            state.setAnalysisReport(item.report);
            console.log('[Scraper] 已加载旧版"AI分析"报告到全局状态');
            return;
        }

        state.setAnalysisReport(null);
        console.log('[Scraper] 该快照无分析报告');
    }

    private getSnapshotLoadMessage(item: HistoryItem): string {
        const hasReport = item.analysisStatus?.isAnalyzed || item.report;
        return hasReport
            ? `历史快照已加载（包含分析报告）`
            : `历史快照已加载`;
    }

    /**
     * 从历史快照载入分析报告（跳转到AI智能分析页面查看）
     */
    async loadAnalysisReport(item: HistoryItem): Promise<void> {
        if (!item.analysisStatus || !item.analysisStatus.isAnalyzed) {
            showToast("该快照没有分析报告", { type: 'warning' });
            return;
        }

        try {
            // 1. 先加载历史快照数据到全局状态
            this.loadHistoryItem(item, false);

            // 2. 确保报告数据已正确加载到全局状态
            if (!appStore.getState().analysis.analysisReport) {
                throw new SystemError(
                    '报告数据加载失败',
                    'HISTORY_PANEL_001',
                    { module: 'HistoryPanel', action: 'viewAnalysisReport', itemId: item.id }
                );
            }

            console.log('[Scraper] 📊 已将"AI智能分析"报告加载到全局状态');

            // 3. 跳转到 AI智能分析页面查看报告
            await window.navigateTo('/app-center/ai-analysis');

            showToast("已跳转到 AI智能分析查看报告", { type: 'success' });
        } catch (error) {
            console.error('[Scraper] 载入分析报告失败:', error);
            showToast("载入分析报告失败", { type: 'error' });
        }
    }
}

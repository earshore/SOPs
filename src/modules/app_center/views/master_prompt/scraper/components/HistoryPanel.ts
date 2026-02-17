/**
 * 历史记录面板组件
 */

import { HistoryService } from '../../services/historyService';
import { StorageService } from '../../../../../../services/storageService';
import { showToast } from '../../../../../../common/ui';
import { LANGUAGE_HEADERS } from '../../../../../../common/constants/constants';
import state from '../../../../../../common/state';
import eventBus from '../../../../../../common/EventBus';
import { MODULE_EVENTS } from '../../../../../../common/constants/eventConstants';

/**
 * 历史记录面板类
 */
export class HistoryPanel {
    private history: any[] = [];

    constructor() {
        this.loadHistory();
    }

    /**
     * 加载历史记录
     */
    loadHistory(): void {
        this.history = HistoryService.getAll();
    }

    /**
     * 获取历史记录列表
     */
    getHistory(): any[] {
        return this.history;
    }

    /**
     * 删除历史记录项
     */
    deleteHistoryItem(id: string): void {
        if (!confirm("确定要删除这条历史记录吗？")) return;

        const newHistory = this.history.filter(h => h.id !== id);
        StorageService.setScrapeHistory(newHistory);
        this.loadHistory();
        showToast("记录已删除", "success");
    }

    /**
     * 清空所有历史记录
     */
    clearAllHistory(): void {
        if (!confirm("确定清空所有历史记录？")) return;
        HistoryService.clear();
        this.loadHistory();
        showToast("历史已清空", "success");
    }

    /**
     * 加载历史快照
     */
    loadHistoryItem(item: any, isScraping: boolean): boolean {
        if (isScraping) {
            if (!confirm("任务进行中，确定覆盖？")) return false;
        }

        // 确保历史数据的 metadata 结构完整
        if (item.data && !item.data.metadata) {
            item.data.metadata = {
                scrape_timestamp: item.timestamp || new Date().toISOString(),
                marketplace: item.site || 'US',
                domain: LANGUAGE_HEADERS[item.site]?.domain || 'amazon.com',
                language: LANGUAGE_HEADERS[item.site]?.name || 'English (US)',
                total_asins: item.asins?.length || 0,
            };
        } else if (item.data && item.data.metadata && !item.data.metadata.marketplace) {
            // 如果 metadata 存在但缺少 marketplace 字段
            item.data.metadata.marketplace = item.site || 'US';
        }

        // 恢复全局状态（供所有页面使用）
        state.scraper.currentHistoryId = item.id;
        state.scraper.scrapedData = item.data;

        // 优先加载"AI智能分析"的报告，如果不存在则回退到旧的"AI分析"报告
        if (item.analysisStatus?.isAnalyzed && item.analysisStatus?.analysisReport) {
            state.analysis.analysisReport = item.analysisStatus.analysisReport;
            console.log('[Scraper] 已加载"AI智能分析"报告到全局状态');
        } else if (item.report) {
            state.analysis.analysisReport = item.report;
            console.log('[Scraper] 已加载旧版"AI分析"报告到全局状态');
        } else {
            state.analysis.analysisReport = null;
            console.log('[Scraper] 该快照无分析报告');
        }

        state.analysis.translatedReport = null;
        state.scraper.selectedSite = item.site as any;

        // 通知其他模块数据已更新
        eventBus.emit(MODULE_EVENTS.SCRAPER.SCRAPE_SUCCESS, item.data);

        // 显示加载成功提示
        const hasReport = item.analysisStatus?.isAnalyzed || item.report;
        const message = hasReport
            ? `历史快照已加载（包含分析报告）`
            : `历史快照已加载`;
        showToast(message, "success");

        return true;
    }

    /**
     * 从历史快照载入分析报告（跳转到AI智能分析页面查看）
     */
    async loadAnalysisReport(item: any): Promise<void> {
        if (!item.analysisStatus || !item.analysisStatus.isAnalyzed) {
            showToast("该快照没有分析报告", "warning");
            return;
        }

        try {
            // 1. 先加载历史快照数据到全局状态
            this.loadHistoryItem(item, false);

            // 2. 确保报告数据已正确加载到全局状态
            if (!state.analysis.analysisReport) {
                throw new Error('报告数据加载失败');
            }

            console.log('[Scraper] 📊 已将"AI智能分析"报告加载到全局状态');

            // 3. 等待状态更新
            await new Promise(resolve => setTimeout(resolve, 100));

            // 4. 跳转到 AI智能分析页面查看报告
            if (window.switchTab) {
                await window.switchTab('ai_analysis', true);
            }

            showToast("已跳转到 AI智能分析查看报告", "success");
        } catch (error) {
            console.error('[Scraper] 载入分析报告失败:', error);
            showToast("载入分析报告失败", "error");
        }
    }
}

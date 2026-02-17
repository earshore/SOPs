/**
 * Scraper 子模块 - 主入口
 * 负责亚马逊数据采集功能
 * 
 * 架构说明：
 * - 使用 Alpine.js 进行响应式 UI 管理
 * - 状态保存到 state.scraper 命名空间
 * - 通过 EventBus 与其他模块通信
 */

import { loadTemplate } from '../../../../../common/utils/viewLoader';
import { createScraperPanel } from './components/ScraperPanel';
import '../master_analysis_style.css';

// ========================================== 
// Module Exports (统一架构接口)
// ========================================== 

/**
 * 挂载子模块
 * @param container - 容器元素
 */
export async function mount(container: HTMLElement): Promise<void> {
    console.log('[Scraper] 🔧 开始挂载子模块');

    try {
        // 1. 加载模板
        const html = await loadTemplate('src/modules/app_center/views/master_analysis/scraper/template.html');
        container.innerHTML = html;

        // 2. 初始化 Alpine.js 组件
        if (window.Alpine) {
            // 注册 Alpine 组件
            window.Alpine.data('scraperPanel', createScraperPanel);
        } else {
            console.warn('[Scraper] ⚠️ Alpine.js 未加载');
        }

        console.log('[Scraper] ✅ 子模块挂载成功');
    } catch (error) {
        console.error('[Scraper] ❌ 子模块挂载失败:', error);
        throw error;
    }
}

/**
 * 卸载子模块
 */
export function unmount(): void {
    console.log('[Scraper] 🔄 开始卸载子模块');

    try {
        // 清理事件监听器
        const cardsContainer = document.getElementById('data-cards');
        if (cardsContainer) {
            // 获取 Alpine 组件实例
            const alpineData = (window as any).Alpine?.$data(cardsContainer.closest('[x-data="scraperPanel"]'));
            if (alpineData?.dataPreview) {
                alpineData.dataPreview.cleanup();
            }
        }

        console.log('[Scraper] ✅ 子模块卸载成功');
    } catch (error) {
        console.error('[Scraper] ❌ 子模块卸载失败:', error);
    }
}

// ========================================== 
// Legacy Bridges (向后兼容)
// ========================================== 

/**
 * 获取 Alpine 组件实例的辅助函数
 */
function getScraperPanelInstance(): any {
    const element = document.querySelector('[x-data="scraperPanel"]');
    if (!element) {
        console.warn('[Scraper] Alpine 组件实例未找到');
        return null;
    }
    return (window as any).Alpine?.$data(element);
}

/**
 * 初始化 Alpine Scraper 组件（向后兼容）
 */
export function initAlpineScraper(): void {
    if (window.Alpine) {
        window.Alpine.data('scraperPanel', createScraperPanel);
    }
}

/**
 * 渲染历史记录（向后兼容）
 */
export const renderHistory = (): void => {
    const panel = getScraperPanelInstance();
    if (panel && typeof panel.loadHistory === 'function') {
        panel.loadHistory();
    }
};

/**
 * 初始化 Scraper 监听器（向后兼容）
 */
export const initScraperListeners = (): void => {
    // No-op，由 Alpine 处理
};

/**
 * 选择站点（向后兼容）
 */
export const selectSite = (): void => {
    // No-op，由 Alpine 处理
};

/**
 * 渲染数据面板（向后兼容）
 */
export const renderDataPanel = (): void => {
    const panel = getScraperPanelInstance();
    if (panel && typeof panel.renderDataPanel === 'function') {
        panel.renderDataPanel();
    } else {
        console.warn('[Scraper] renderDataPanel 方法不可用');
    }
};

/**
 * 触发文件导入（向后兼容）
 */
export const triggerImport = (): void => {
    const panel = getScraperPanelInstance();
    if (panel && typeof panel.triggerImport === 'function') {
        panel.triggerImport();
    } else {
        console.warn('[Scraper] triggerImport 方法不可用');
    }
};

/**
 * 切换数据标签页（向后兼容）
 */
export const switchDataTab = (tab: string): void => {
    const panel = getScraperPanelInstance();
    if (panel && typeof panel.switchDataTab === 'function') {
        panel.switchDataTab(tab as 'preview' | 'json');
    } else {
        console.warn('[Scraper] switchDataTab 方法不可用');
    }
};

/**
 * 处理文件导入（向后兼容）
 */
export const handleImportFiles = (e: Event): void => {
    const panel = getScraperPanelInstance();
    if (panel && typeof panel.handleImportFiles === 'function') {
        panel.handleImportFiles(e);
    } else {
        console.warn('[Scraper] handleImportFiles 方法不可用');
    }
};

/**
 * 切换卡片展开状态（向后兼容）
 */
export const toggleCardExpand = (asin: string): void => {
    const panel = getScraperPanelInstance();
    if (panel && typeof panel.toggleCardExpand === 'function') {
        panel.toggleCardExpand(asin);
    } else {
        console.warn('[Scraper] toggleCardExpand 方法不可用');
    }
};

/**
 * 删除产品（向后兼容）
 */
export const deleteProduct = (asin: string): void => {
    const panel = getScraperPanelInstance();
    if (panel && typeof panel.deleteProduct === 'function') {
        panel.deleteProduct(asin);
    } else {
        console.warn('[Scraper] deleteProduct 方法不可用');
    }
};

/**
 * 删除评论（向后兼容）
 */
export const deleteReview = (asin: string, index: number): void => {
    const panel = getScraperPanelInstance();
    if (panel && typeof panel.deleteReview === 'function') {
        panel.deleteReview(asin, index);
    } else {
        console.warn('[Scraper] deleteReview 方法不可用');
    }
};

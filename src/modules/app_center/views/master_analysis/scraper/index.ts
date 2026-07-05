/**
 * Scraper 子模块 - 主入口
 * 负责亚马逊数据采集功能
 *
 * 架构说明：
 * - 使用 Alpine.js 进行响应式 UI 管理
 * - 状态保存到 state.scraper 命名空间
 * - 通过 EventBus 与其他模块通信
 * - 使用 AlpineRegistry 统一管理组件注册
 */

import { SafeTemplateLoader } from '../../../../../common/infrastructure/SafeModuleLoader';
import { SafeRenderer } from '../../../../../common/infrastructure/SafeRenderer';
import { AlpineRegistry } from '../../../../../common/infrastructure/AlpineRegistry';
import { createScraperPanel } from './components/ScraperPanel';
import { destroyAlpineComponent, getAlpineData } from '../utils/alpineLifecycle';
import '../master_analysis_style.css';
import './scraper_style.css';

// ==========================================
// Module Exports (统一架构接口)
// ==========================================

/**
 * 挂载子模块
 * @param container - 容器元素
 */
export async function mount(container: HTMLElement): Promise<void> {
  try {
    // 1. 使用 SafeTemplateLoader 加载模板
    const loader = SafeTemplateLoader.getInstance();
    const renderer = SafeRenderer.getInstance();

    const html = await loader.loadTemplate(
      'src/modules/app_center/views/master_analysis/scraper/template.html',
      {
        onError: error => {
          console.error('[Scraper] 模板加载失败:', error);
        },
      }
    );

    // 2. 使用 SafeRenderer 渲染模板（静态模板，已审计）
    // 添加淡入动画（在渲染前添加）
    container.classList.add('fade-in');
    renderer.renderTemplate(container, html);

    // 3. 使用 AlpineRegistry 注册组件
    const registry = AlpineRegistry.getInstance();
    registry.register('scraperPanel', createScraperPanel);
  } catch (error) {
    console.error('[Scraper] ❌ 子模块挂载失败:', error);
    throw error;
  }
}

/**
 * 卸载子模块
 */
export function unmount(): void {
  try {
    destroyAlpineComponent('[x-data="scraperPanel"]');

    // 使用 AlpineRegistry 卸载组件
    const registry = AlpineRegistry.getInstance();
    registry.unregister('scraperPanel');
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
function getScraperPanelInstance(): Record<string, unknown> | null {
  const element = document.querySelector('[x-data="scraperPanel"]');
  if (!element) {
    return null;
  }
  const alpineData = getAlpineData(element);
  return alpineData && typeof alpineData === 'object'
    ? (alpineData as Record<string, unknown>)
    : null;
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
 * 渲染数据面板（向后兼容）
 */
export const renderDataPanel = (): void => {
  const panel = getScraperPanelInstance();
  if (panel && typeof panel.renderDataPanel === 'function') {
    panel.renderDataPanel();
  }
};

/**
 * 触发文件导入（向后兼容）
 */
export const triggerImport = (): void => {
  const panel = getScraperPanelInstance();
  if (panel && typeof panel.triggerImport === 'function') {
    panel.triggerImport();
  }
};

/**
 * 切换数据标签页（向后兼容）
 */
export const switchDataTab = (tab: string): void => {
  const panel = getScraperPanelInstance();
  if (panel && typeof panel.switchDataTab === 'function') {
    panel.switchDataTab(tab as 'preview' | 'json');
  }
};

/**
 * 处理文件导入（向后兼容）
 */
export const handleImportFiles = (e: Event): void => {
  const panel = getScraperPanelInstance();
  if (panel && typeof panel.handleImportFiles === 'function') {
    panel.handleImportFiles(e);
  }
};

/**
 * 切换卡片展开状态（向后兼容）
 */
export const toggleCardExpand = (asin: string): void => {
  const panel = getScraperPanelInstance();
  if (panel && typeof panel.toggleCardExpand === 'function') {
    panel.toggleCardExpand(asin);
  }
};

/**
 * 删除产品（向后兼容）
 */
export const deleteProduct = (asin: string): void => {
  const panel = getScraperPanelInstance();
  if (panel && typeof panel.deleteProduct === 'function') {
    panel.deleteProduct(asin);
  }
};

/**
 * 删除评论（向后兼容）
 */
export const deleteReview = (asin: string, index: number): void => {
  const panel = getScraperPanelInstance();
  if (panel && typeof panel.deleteReview === 'function') {
    panel.deleteReview(asin, index);
  }
};

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

import { showToast } from '@/common/ui/notifications';
import { openFilePicker } from '@/common/utils/filePicker';
import { createScraperPanel } from './components/ScraperPanel';
import { createAlpinePanelModule } from '../utils/createAlpinePanelModule';
import { getAlpineData } from '../utils/alpineLifecycle';
import '../master_analysis_style.css';
import './scraper_style.css';

const scraperModule = createAlpinePanelModule({
  moduleId: 'scraper',
  panelName: 'scraperPanel',
  factory: createScraperPanel,
  templatePath: 'src/modules/app_center/views/master_analysis/scraper/template.html',
  templateOptions: {
    onError: error => {
      console.error('[Scraper] 模板加载失败:', error);
    },
  },
  onInit: (container, module) => {
    const input = container.querySelector<HTMLInputElement>('#import-file-input');
    container.querySelectorAll<HTMLElement>('[data-scraper-import-trigger]').forEach(trigger => {
      module.bindEventListener(trigger, 'click', () => {
        if (!openFilePicker(input)) {
          showToast('无法打开文件选择器', {
            type: 'error',
            description: '请刷新页面后重试，或重新进入数据采集页面。',
          });
        }
      });
    });

    // 导入新的：打开替换模式隐藏文件输入框
    const overwriteInput = container.querySelector<HTMLInputElement>('#overwrite-file-input');
    container.querySelectorAll<HTMLElement>('[data-scraper-overwrite-trigger]').forEach(trigger => {
      module.bindEventListener(trigger, 'click', () => {
        if (!openFilePicker(overwriteInput)) {
          showToast('无法打开文件选择器', {
            type: 'error',
            description: '请刷新页面后重试，或重新进入数据采集页面。',
          });
        }
      });
    });

    // 合并导入：打开合并模式隐藏文件输入框
    container.querySelectorAll<HTMLElement>('[data-scraper-merge-trigger]').forEach(trigger => {
      module.bindEventListener(trigger, 'click', () => {
        if (!openFilePicker(input)) {
          showToast('无法打开文件选择器', {
            type: 'error',
            description: '请刷新页面后重试，或重新进入数据采集页面。',
          });
        }
      });
    });
  },
  logPrefix: 'Scraper',
});

export const mount = (container: HTMLElement): Promise<void> => scraperModule.mount(container);
export const unmount = (): void => {
  if (scraperModule.isMounted) {
    scraperModule.unmount();
    return;
  }

  try {
    scraperModule.cleanupPanel();
  } catch (error) {
    console.error('[Scraper] ❌ 子模块卸载失败:', error);
  }
};

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

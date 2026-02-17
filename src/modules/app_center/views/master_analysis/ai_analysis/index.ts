/**
 * AI智能分析模块
 * 集成到 Master Analysis 的子页面
 */

import { loadTemplate } from '../../../../../common/utils/viewLoader';
import { createInitialState, initializeAsinsFromScraperData, ModuleState } from './state/moduleState';
import { createAiAnalysisPanel } from './components/AlpinePanel';
import state from '../../../../../common/state';

import '../master_analysis_style.css';
import './ai_analysis_style.css';

// 模块状态
let moduleState: ModuleState = createInitialState();

/**
 * 挂载模块
 */
export async function mount(container: HTMLElement): Promise<void> {
  console.log('[AI智能分析] 🔧 开始挂载模块');

  try {
    // 1. 初始化状态 - 从 scraper 数据加载
    const scrapedData = state.scraper?.scrapedData;
    initializeAsinsFromScraperData(moduleState, scrapedData);

    // 2. 加载模板
    const html = await loadTemplate('src/modules/app_center/views/master_analysis/ai_analysis/template.html');
    container.innerHTML = html;

    // 3. 初始化 Alpine.js 组件
    if (window.Alpine) {
      window.Alpine.data('aiAnalysisPanel', () => createAiAnalysisPanel(moduleState));
    }

    console.log('[AI智能分析] ✅ 模块挂载成功');
  } catch (error) {
    console.error('[AI智能分析] ❌ 模块挂载失败:', error);
    throw error;
  }
}

/**
 * 卸载模块
 */
export function unmount(): void {
  console.log('[AI智能分析] 🔄 开始卸载模块');
  // 重置状态
  moduleState = createInitialState();
  console.log('[AI智能分析] ✅ 模块卸载成功');
}

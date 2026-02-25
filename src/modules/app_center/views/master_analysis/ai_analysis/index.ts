/**
 * AI智能分析模块
 * 集成到 Master Analysis 的子页面
 */

import { SafeModuleLoader } from '../../../../../common/infrastructure/SafeModuleLoader';
import { SafeRenderer } from '../../../../../common/infrastructure/SafeRenderer';
import { createInitialState, initializeAsinsFromScraperData, ModuleState } from './state/moduleState';
import { createAiAnalysisPanel } from './components/AlpinePanel';
import { AlpineRegistry } from '../../../../../common/infrastructure/AlpineRegistry';
import { appStore } from '@/stores/useAppStore';

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
    const scrapedData = appStore.getState().scraper?.scrapedData;
    initializeAsinsFromScraperData(moduleState, scrapedData);

    // 2. 使用 SafeModuleLoader 加载模板
    const loader = SafeModuleLoader.getInstance();
    const html = await loader.loadTemplate(
      'src/modules/app_center/views/master_analysis/ai_analysis/template.html',
      {
        retryCount: 3,
        timeout: 5000,
        onError: (error) => {
          console.error('[AI智能分析] 模板加载失败:', error);
        }
      }
    );
    
    // 使用 SafeRenderer 渲染模板（静态模板，已审计）
    const renderer = SafeRenderer.getInstance();
    renderer.renderTemplate(container, html);

    // 3. 使用 AlpineRegistry 注册组件
    const registry = AlpineRegistry.getInstance();
    registry.register('aiAnalysisPanel', () => createAiAnalysisPanel(moduleState));
    
    // 初始化注册器（如果尚未初始化）
    registry.init();

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

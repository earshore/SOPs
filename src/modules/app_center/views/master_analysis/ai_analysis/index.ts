/**
 * AI智能分析模块
 * 集成到 Master Analysis 的子页面
 */

import { SafeModuleLoader } from '../../../../../common/infrastructure/SafeModuleLoader';
import { SafeRenderer } from '../../../../../common/infrastructure/SafeRenderer';
import { createAiAnalysisPanel } from './components/AlpinePanel';
import { AlpineRegistry } from '../../../../../common/infrastructure/AlpineRegistry';
import { destroyAlpineComponent } from '../utils/alpineLifecycle';

import '../master_analysis_style.css';
import './ai_analysis_style.css';

/**
 * 挂载模块
 */
export async function mount(container: HTMLElement): Promise<void> {
  console.log('[AI智能分析] 🔧 开始挂载模块');

  try {
    // 1. 使用 SafeModuleLoader 加载模板
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

    // 2. 使用 SafeRenderer 渲染模板（静态模板，已审计）
    const renderer = SafeRenderer.getInstance();
    container.classList.add('fade-in');
    renderer.renderTemplate(container, html);

    // 3. 使用 AlpineRegistry 注册组件（直接使用 Zustand 作为数据源）
    const registry = AlpineRegistry.getInstance();
    registry.register('aiAnalysisPanel', createAiAnalysisPanel);

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
  console.log('[AI智能分析] 🔄 模块卸载');

  try {
    destroyAlpineComponent('[x-data="aiAnalysisPanel"]');
    AlpineRegistry.getInstance().unregister('aiAnalysisPanel');
  } catch (error) {
    console.error('[AI智能分析] ❌ 模块卸载失败:', error);
  }
}

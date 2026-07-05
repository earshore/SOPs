/**
 * AI智能分析模块
 * 集成到 Master Analysis 的子页面
 */

import BaseModule from '../../../../../common/BaseModule';
import { SafeTemplateLoader } from '../../../../../common/infrastructure/SafeModuleLoader';
import { SafeRenderer } from '../../../../../common/infrastructure/SafeRenderer';
import { createAiAnalysisPanel } from './components/AlpinePanel';
import { AlpineRegistry } from '../../../../../common/infrastructure/AlpineRegistry';
import { destroyAlpineComponent } from '../utils/alpineLifecycle';

import '../master_analysis_style.css';
import './ai_analysis_style.css';

class AiAnalysisModule extends BaseModule {
  constructor() {
    super('ai_analysis');
  }

  protected async render(): Promise<void> {
    const container = this.container;
    if (!container) return;

    const registry = AlpineRegistry.getInstance();
    registry.register('aiAnalysisPanel', createAiAnalysisPanel);

    // 1. 使用 SafeTemplateLoader 加载模板
    const loader = SafeTemplateLoader.getInstance();
    const html = await loader.loadTemplate(
      'src/modules/app_center/views/master_analysis/ai_analysis/template.html',
      {
        retryCount: 3,
        timeout: 5000,
        onError: error => {
          console.error('[AI智能分析] 模板加载失败:', error);
        },
      }
    );

    // 2. 使用 SafeRenderer 渲染模板（静态模板，已审计）
    const renderer = SafeRenderer.getInstance();
    container.classList.add('fade-in');
    renderer.renderTemplate(container, html);
  }

  protected onUnmount(): void {
    try {
      destroyAlpineComponent('[x-data="aiAnalysisPanel"]');
      AlpineRegistry.getInstance().unregister('aiAnalysisPanel');
    } catch (error) {
      console.error('[AI智能分析] ❌ 模块卸载失败:', error);
    }
  }
}

const aiAnalysisModule = new AiAnalysisModule();

export const mount = (container: HTMLElement): Promise<void> => aiAnalysisModule.mount(container);
export const unmount = (): void => {
  aiAnalysisModule.unmount();
};

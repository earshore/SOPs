/**
 * Promptlab 子模块
 * 负责 Prompt 拼接生成功能
 *
 * 架构说明：
 * - 使用 Alpine.js 进行响应式 UI 管理
 * - 状态保存到 appStore.promptlab 命名空间
 * - 通过 EventBus 与其他模块通信
 * - 使用 AlpineRegistry 统一管理组件注册
 */

import BaseModule from '../../../../../common/BaseModule';
import { SafeTemplateLoader } from '../../../../../common/infrastructure/SafeModuleLoader';
import { SafeRenderer } from '../../../../../common/infrastructure/SafeRenderer';
import { AlpineRegistry } from '../../../../../common/infrastructure/AlpineRegistry';
import { createPromptlabPanel } from './components/PromptlabPanel';
import { destroyAlpineComponent } from '../utils/alpineLifecycle';
import '../master_analysis_style.css';

function cleanupPromptlabPanel(): void {
  destroyAlpineComponent('[x-data="promptlabPanel"]');

  // 使用 AlpineRegistry 卸载组件
  const registry = AlpineRegistry.getInstance();
  registry.unregister('promptlabPanel');
}

class PromptlabModule extends BaseModule {
  constructor() {
    super('promptlab');
  }

  protected async render(): Promise<void> {
    const container = this.container;
    if (!container) return;

    const registry = AlpineRegistry.getInstance();
    registry.register('promptlabPanel', createPromptlabPanel);

    // 运行时检查: 确保没有 CSP meta 标签
    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (cspMeta) {
      console.error('[Promptlab] ❌ 检测到 CSP meta 标签,这不应该存在!', cspMeta);
      console.error('[Promptlab] meta 标签位置:', cspMeta.parentElement?.tagName);
    }

    const loader = SafeTemplateLoader.getInstance();
    const html = await loader.loadTemplate(
      'src/modules/app_center/views/master_analysis/promptlab/template.html'
    );

    const renderer = SafeRenderer.getInstance();
    container.classList.add('fade-in');
    renderer.renderTemplate(container, html);
  }

  protected onUnmount(): void {
    try {
      cleanupPromptlabPanel();
    } catch (error) {
      console.error('[Promptlab] ❌ 子模块卸载失败:', error);
    }
  }
}

const promptlabModule = new PromptlabModule();

export const mount = (container: HTMLElement): Promise<void> => promptlabModule.mount(container);
export const unmount = (): void => {
  if (promptlabModule.isMounted) {
    promptlabModule.unmount();
    return;
  }

  try {
    cleanupPromptlabPanel();
  } catch (error) {
    console.error('[Promptlab] ❌ 子模块卸载失败:', error);
  }
};

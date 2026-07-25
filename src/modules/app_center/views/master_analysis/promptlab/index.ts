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

import { createPromptlabPanel } from './components/PromptlabPanel';
import { createAlpinePanelModule } from '../utils/createAlpinePanelModule';
import '../master_analysis_style.css';

const promptlabModule = createAlpinePanelModule({
  moduleId: 'promptlab',
  panelName: 'promptlabPanel',
  factory: createPromptlabPanel,
  templatePath: 'src/modules/app_center/views/master_analysis/promptlab/template.html',
  onBeforeRender: () => {
    // 运行时检查: 确保没有 CSP meta 标签
    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (cspMeta) {
      console.error('[Promptlab] ❌ 检测到 CSP meta 标签,这不应该存在!', cspMeta);
      console.error('[Promptlab] meta 标签位置:', cspMeta.parentElement?.tagName);
    }
  },
  logPrefix: 'Promptlab',
});

export const mount = (container: HTMLElement): Promise<void> => promptlabModule.mount(container);
export const unmount = (): void => {
  if (promptlabModule.isMounted) {
    promptlabModule.unmount();
    return;
  }

  try {
    promptlabModule.cleanupPanel();
  } catch (error) {
    console.error('[Promptlab] ❌ 子模块卸载失败:', error);
  }
};

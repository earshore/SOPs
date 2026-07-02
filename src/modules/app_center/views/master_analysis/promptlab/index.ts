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

import { SafeRenderer } from '../../../../../common/infrastructure/SafeRenderer';
import { AlpineRegistry } from '../../../../../common/infrastructure/AlpineRegistry';
import { createPromptlabPanel } from './components/PromptlabPanel';
import { destroyAlpineComponent } from '../utils/alpineLifecycle';
import templateHTML from './template.html?raw&inline';
import '../master_analysis_style.css';

// ==========================================
// Module Exports (统一架构接口)
// ==========================================

/**
 * 挂载子模块
 * @param {HTMLElement} container - 容器元素
 */
export async function mount(container: HTMLElement): Promise<void> {
  // 运行时检查: 确保没有 CSP meta 标签
  const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (cspMeta) {
    console.error('[Promptlab] ❌ 检测到 CSP meta 标签,这不应该存在!', cspMeta);
    console.error('[Promptlab] meta 标签位置:', cspMeta.parentElement?.tagName);
  }

  try {
    // 1. 使用构建期 raw import，避免生产环境独立模板 chunk 被 SPA fallback 缓存污染
    const renderer = SafeRenderer.getInstance();

    // 2. 使用 SafeRenderer 渲染模板（静态模板，已审计）
    // 添加淡入动画（在渲染前添加）
    container.classList.add('fade-in');
    renderer.renderTemplate(container, templateHTML);

    // 3. 使用 AlpineRegistry 注册组件
    const registry = AlpineRegistry.getInstance();
    registry.register('promptlabPanel', createPromptlabPanel);
  } catch (error) {
    console.error('[Promptlab] ❌ 子模块挂载失败:', error);
    throw error;
  }
}

/**
 * 卸载子模块
 */
export function unmount(): void {
  try {
    destroyAlpineComponent('[x-data="promptlabPanel"]');

    // 使用 AlpineRegistry 卸载组件
    const registry = AlpineRegistry.getInstance();
    registry.unregister('promptlabPanel');
  } catch (error) {
    console.error('[Promptlab] ❌ 子模块卸载失败:', error);
  }
}

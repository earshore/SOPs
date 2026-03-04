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

import { SafeModuleLoader } from '../../../../../common/infrastructure/SafeModuleLoader';
import { SafeRenderer } from '../../../../../common/infrastructure/SafeRenderer';
import { AlpineRegistry } from '../../../../../common/infrastructure/AlpineRegistry';
import { createPromptlabPanel } from './components/PromptlabPanel';
import { Logger } from '../../../../../services/loggerService';
import '../master_analysis_style.css';

// ========================================== 
// Module Exports (统一架构接口)
// ========================================== 

/**
 * 挂载子模块
 * @param {HTMLElement} container - 容器元素
 */
export async function mount(container: HTMLElement): Promise<void> {
    Logger.debug('[Promptlab] 🔧 开始挂载子模块');

    // 运行时检查: 确保没有 CSP meta 标签
    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (cspMeta) {
        Logger.error('[Promptlab] ❌ 检测到 CSP meta 标签,这不应该存在!', cspMeta);
        Logger.error('[Promptlab] meta 标签位置:', cspMeta.parentElement?.tagName);
    } else {
        Logger.debug('[Promptlab] ✅ 未检测到 CSP meta 标签');
    }

    try {
        // 1. 使用 SafeModuleLoader 加载模板
        const loader = SafeModuleLoader.getInstance();
        const renderer = SafeRenderer.getInstance();

        const html = await loader.loadTemplate(
            'src/modules/app_center/views/master_analysis/promptlab/template.html',
            {
                onError: (error) => {
                    Logger.error('[Promptlab] 模板加载失败:', error);
                }
            }
        );

        // 2. 使用 SafeRenderer 渲染模板（静态模板，已审计）
        // 添加淡入动画（在渲染前添加）
        container.classList.add('fade-in');
        renderer.renderTemplate(container, html);

        // 3. 使用 AlpineRegistry 注册组件
        const registry = AlpineRegistry.getInstance();
        registry.register('promptlabPanel', createPromptlabPanel);

        Logger.debug('[Promptlab] ✅ Alpine 组件已通过 AlpineRegistry 注册');
        Logger.debug('[Promptlab] ✅ 子模块挂载成功');
    } catch (error) {
        Logger.error('[Promptlab] ❌ 子模块挂载失败:', error);
        throw error;
    }
}

/**
 * 卸载子模块
 */
export function unmount(): void {
    Logger.debug('[Promptlab] 🔄 开始卸载子模块');

    try {
        // 使用 AlpineRegistry 卸载组件
        const registry = AlpineRegistry.getInstance();
        registry.unregister('promptlabPanel');

        Logger.debug('[Promptlab] ✅ 子模块卸载成功');
    } catch (error) {
        Logger.error('[Promptlab] ❌ 子模块卸载失败:', error);
    }
}

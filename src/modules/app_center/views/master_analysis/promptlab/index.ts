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
import '../master_analysis_style.css';

// ========================================== 
// Module Exports (统一架构接口)
// ========================================== 

/**
 * 挂载子模块
 * @param {HTMLElement} container - 容器元素
 */
export async function mount(container: HTMLElement): Promise<void> {
    console.log('[Promptlab] 🔧 开始挂载子模块');

    try {
        // 1. 使用 SafeModuleLoader 加载模板
        const loader = SafeModuleLoader.getInstance();
        const renderer = SafeRenderer.getInstance();
        
        const html = await loader.loadTemplate(
            'src/modules/app_center/views/master_analysis/promptlab/template.html',
            {
                onError: (error) => {
                    console.error('[Promptlab] 模板加载失败:', error);
                }
            }
        );
        
        // 2. 使用 SafeRenderer 渲染模板（静态模板，已审计）
        renderer.renderTemplate(container, html);

        // 3. 使用 AlpineRegistry 注册组件
        const registry = AlpineRegistry.getInstance();
        registry.register('promptlabPanel', createPromptlabPanel);
        
        console.log('[Promptlab] ✅ Alpine 组件已通过 AlpineRegistry 注册');
        console.log('[Promptlab] ✅ 子模块挂载成功');
    } catch (error) {
        console.error('[Promptlab] ❌ 子模块挂载失败:', error);
        throw error;
    }
}

/**
 * 卸载子模块
 */
export function unmount(): void {
    console.log('[Promptlab] 🔄 开始卸载子模块');

    try {
        // 使用 AlpineRegistry 卸载组件
        const registry = AlpineRegistry.getInstance();
        registry.unregister('promptlabPanel');
        
        console.log('[Promptlab] ✅ 子模块卸载成功');
    } catch (error) {
        console.error('[Promptlab] ❌ 子模块卸载失败:', error);
    }
}

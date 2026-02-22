/**
 * QA Lab 子模块入口
 * 负责 Rufus Q&A 智能预研系统功能
 * 
 * 架构说明：
 * - 使用 SafeModuleLoader 加载模板
 * - 使用 SafeRenderer 进行安全渲染
 * - 状态保存到 qalabState 单例
 * - 通过 EventBus 与其他模块通信
 * - 使用 registerActionsWithLegacy 注册全局操作
 */

import { SafeModuleLoader } from '../../../../../common/infrastructure/SafeModuleLoader';
import { SafeRenderer } from '../../../../../common/infrastructure/SafeRenderer';
import state from "../../../../../common/state";
import { registerActionsWithLegacy, unregisterActions } from '../../../../../common/utils/actionRegistry';
import { MODULE_EVENTS } from '../../../../../common/constants/eventConstants';
import eventBus from '../../../../../common/EventBus';

import { qalabState } from './state';
import {
    startAnalysis,
    loadSample,
    clearInput,
    toggleExpandAll,
    exportJSON,
    exportCSV,
    exportText
} from './actions';

import './qalab.css';
import '../master_analysis_style.css';

/**
 * 挂载子模块
 */
export async function mount(container: HTMLElement): Promise<void> {
    console.log('[QALab] 🔧 开始挂载子模块');

    try {
        // 1. 使用 SafeModuleLoader 加载模板
        const loader = SafeModuleLoader.getInstance();
        const renderer = SafeRenderer.getInstance();
        
        const html = await loader.loadTemplate(
            'src/modules/app_center/views/master_analysis/qalab/template.html',
            {
                retryCount: 3,
                timeout: 5000,
                onError: (error) => {
                    console.error('[QALab] 模板加载失败:', error);
                }
            }
        );
        
        // 使用 SafeRenderer 渲染模板（静态模板，已审计）
        renderer.renderTemplate(container, html);

        // 2. 注册全局操作
        const actionNames = registerActionsWithLegacy({
            amz_qalab_startAnalysis: () => startAnalysis(),
            amz_qalab_loadSample: () => loadSample(),
            amz_qalab_clearInput: () => clearInput(),
            amz_qalab_toggleExpandAll: () => toggleExpandAll(),
            amz_qalab_exportJSON: () => exportJSON(),
            amz_qalab_exportCSV: () => exportCSV(),
            amz_qalab_exportText: () => exportText()
        });
        
        qalabState.registeredActions = actionNames;

        // 3. 设置事件监听器 - 使用事件委托处理data-action
        qalabState.eventManager.addEventListener(container, 'click', ((e: Event) => {
            const target = e.target as HTMLElement;
            const actionBtn = target.closest('[data-action]') as HTMLElement;
            
            if (actionBtn) {
                const action = actionBtn.dataset.action;
                if (action) {
                    const actionFn = (window as any)[action];
                    if (typeof actionFn === 'function') {
                        actionFn();
                    }
                }
            }
        }) as EventListener);

        // 4. 监听数据更新事件
        qalabState.dataUpdateHandler = () => {
            console.log('[QALab] 检测到数据更新');
            const input = document.getElementById('jsonInput') as HTMLTextAreaElement;
            if (input && state.analysis?.analysisReport) {
                console.log('[QALab] 检测到新的分析报告');
            }
        };
        
        eventBus.on(MODULE_EVENTS.SCRAPER.SCRAPE_SUCCESS, qalabState.dataUpdateHandler);

        console.log('[QALab] ✅ 子模块挂载成功');
    } catch (error) {
        console.error('[QALab] ❌ 子模块挂载失败:', error);
        throw error;
    }
}

/**
 * 卸载子模块
 */
export function unmount(): void {
    console.log('[QALab] 🔄 开始卸载子模块');

    try {
        // 1. 清理 EventBus 监听器
        if (qalabState.dataUpdateHandler) {
            eventBus.off(MODULE_EVENTS.SCRAPER.SCRAPE_SUCCESS, qalabState.dataUpdateHandler);
        }

        // 2. 清理注册的动作
        if (qalabState.registeredActions.length > 0) {
            unregisterActions(qalabState.registeredActions);
            console.log(`[QALab] 已清理 ${qalabState.registeredActions.length} 个动作`);
        }

        // 3. 清理状态
        qalabState.cleanup();

        console.log('[QALab] ✅ 子模块卸载成功');
    } catch (error) {
        console.error('[QALab] ❌ 子模块卸载失败:', error);
    }
}

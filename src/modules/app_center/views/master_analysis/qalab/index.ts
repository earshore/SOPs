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
import { registerActionsWithLegacy, unregisterActions } from '../../../../../common/utils/actionRegistry';
import { MODULE_EVENTS } from '../../../../../common/constants/eventConstants';
import eventBus from '../../../../../common/EventBus';
import { appStore } from '@/stores/useAppStore';

import {
    startAnalysis,
    clearInput,
    toggleExpandAll,
    exportJSON,
    exportCSV,
    exportText,
    autoLoadAnalysisReport,
    sendRufusQuestion,
    clearRufusChat,
    toggleRufusMode,
    updateRufusModeToggle
} from './actions';
import { rufusSimulator } from './rufusSimulator';

import './qalab.css';
import '../master_analysis_style.css';

/**
 * 挂载子模块
 */
export async function mount(container: HTMLElement): Promise<void> {
    console.log('[QALab] ========================================');
    console.log('[QALab] 🔧 开始挂载子模块');
    console.log('[QALab] 时间:', new Date().toLocaleTimeString());

    try {
        // 0. 获取qalab状态
        const qalabState = appStore.getState().qalab;
        
        // 立即暴露全局对象（在任何异步操作之前）
        (window as any).qalabState = qalabState;
        (window as any).rufusSimulator = rufusSimulator;
        console.log('[QALab] ✅ 已暴露全局对象: window.qalabState, window.rufusSimulator');
        console.log('[QALab] - qalabState.rufusMode:', qalabState.rufusMode);
        console.log('[QALab] - qalabState.reportData:', qalabState.reportData ? '已加载' : '未加载');
        
        // 1. 使用 SafeModuleLoader 加载模板
        console.log('[QALab] 📄 开始加载模板...');
        const loader = SafeModuleLoader.getInstance();
        const renderer = SafeRenderer.getInstance();
        
        const html = await loader.loadTemplate(
            'src/modules/app_center/views/master_analysis/qalab/template.html',
            {
                retryCount: 3,
                timeout: 5000,
                onError: (error) => {
                    console.error('[QALab] ❌ 模板加载失败:', error);
                }
            }
        );
        
        console.log('[QALab] ✅ 模板加载成功，长度:', html.length);
        
        // 使用 SafeRenderer 渲染模板（静态模板，已审计）
        renderer.renderTemplate(container, html);
        console.log('[QALab] ✅ 模板渲染完成');

        // 2. 注册全局操作
        console.log('[QALab] 🔧 开始注册全局操作...');
        const registeredActions = registerActionsWithLegacy({
            amz_qalab_startAnalysis: () => startAnalysis(),
            amz_qalab_clearInput: () => clearInput(),
            amz_qalab_toggleExpandAll: () => toggleExpandAll(),
            amz_qalab_exportJSON: () => exportJSON(),
            amz_qalab_exportCSV: () => exportCSV(),
            amz_qalab_exportText: () => exportText(),
            amz_qalab_sendRufusQuestion: () => {
                const input = document.getElementById('rufusInput') as HTMLTextAreaElement;
                if (input && input.value.trim()) {
                    sendRufusQuestion(input.value.trim());
                }
            },
            amz_qalab_clearRufusChat: () => clearRufusChat(),
            amz_qalab_toggleRufusMode: () => toggleRufusMode()
        });
        
        console.log('[QALab] ✅ 已注册', registeredActions.length, '个全局操作');
        console.log('[QALab] 注册的操作:', registeredActions);
        
        // 验证关键操作是否注册成功
        const toggleAction = (window as any).amz_qalab_toggleRufusMode;
        if (typeof toggleAction === 'function') {
            console.log('[QALab] ✅ amz_qalab_toggleRufusMode 已成功注册');
        } else {
            console.error('[QALab] ❌ amz_qalab_toggleRufusMode 注册失败!');
        }

        // 3. 设置事件监听器 - 使用事件委托处理data-action
        console.log('[QALab] 🔧 设置事件监听器...');
        const eventManager = { listeners: [] as Array<{ element: any; event: string; handler: any }> };
        
        const clickHandler = (e: Event) => {
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
        };
        
        container.addEventListener('click', clickHandler);
        eventManager.listeners.push({ element: container, event: 'click', handler: clickHandler });
        console.log('[QALab] ✅ 点击事件监听器已设置');
        
        // 监听 Rufus 输入框的回车键
        const keydownHandler = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.id === 'rufusInput' && e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const input = target as HTMLTextAreaElement;
                if (input.value.trim()) {
                    sendRufusQuestion(input.value.trim());
                }
            }
        };
        
        container.addEventListener('keydown', keydownHandler);
        eventManager.listeners.push({ element: container, event: 'keydown', handler: keydownHandler });
        console.log('[QALab] ✅ 键盘事件监听器已设置');

        // 4. 监听数据更新事件 - 自动加载分析报告
        console.log('[QALab] 🔧 设置数据更新监听器...');
        const dataUpdateHandler = () => {
            console.log('[QALab] 检测到数据更新事件');
            autoLoadAnalysisReport();
        };
        
        eventBus.on(MODULE_EVENTS.SCRAPER.SCRAPE_SUCCESS, dataUpdateHandler);
        eventBus.on(MODULE_EVENTS.ANALYSIS.ANALYZE_SUCCESS, dataUpdateHandler);
        console.log('[QALab] ✅ 数据更新监听器已设置');
        
        // 保存清理函数到容器
        (container as any).__qalabCleanup = {
            registeredActions,
            eventManager,
            dataUpdateHandler
        };
        
        // 5. 模块挂载时检查是否有现有报告
        console.log('[QALab] 🔍 检查现有报告...');
        autoLoadAnalysisReport();
        
        // 6. 初始化 Rufus 模式切换按钮显示
        console.log('[QALab] 🎨 初始化模式切换按钮...');
        // 使用 setTimeout 确保 DOM 完全渲染后再更新
        setTimeout(() => {
            updateRufusModeToggle();
            console.log('[QALab] ✅ 模式切换按钮初始化完成');
        }, 100);

        console.log('[QALab] ========================================');
        console.log('[QALab] ✅ 子模块挂载成功');
        console.log('[QALab] ========================================');
    } catch (error) {
        console.error('[QALab] ❌ 子模块挂载失败:', error);
        throw error;
    }
}

/**
 * 卸载子模块
 */
export function unmount(container?: HTMLElement): void {
    console.log('[QALab] 🔄 开始卸载子模块');

    try {
        if (!container) {
            console.warn('[QALab] 未提供container，跳过清理');
            return;
        }
        
        const cleanup = (container as any).__qalabCleanup;
        if (!cleanup) {
            console.warn('[QALab] 未找到清理数据');
            return;
        }
        
        // 1. 清理 EventBus 监听器
        if (cleanup.dataUpdateHandler) {
            eventBus.off(MODULE_EVENTS.SCRAPER.SCRAPE_SUCCESS, cleanup.dataUpdateHandler);
            eventBus.off(MODULE_EVENTS.ANALYSIS.ANALYZE_SUCCESS, cleanup.dataUpdateHandler);
        }

        // 2. 清理DOM事件监听器
        if (cleanup.eventManager && cleanup.eventManager.listeners) {
            cleanup.eventManager.listeners.forEach((listener: any) => {
                listener.element.removeEventListener(listener.event, listener.handler);
            });
        }

        // 3. 清理注册的动作
        if (cleanup.registeredActions && cleanup.registeredActions.length > 0) {
            unregisterActions(cleanup.registeredActions);
            console.log(`[QALab] 已清理 ${cleanup.registeredActions.length} 个动作`);
        }

        // 4. 清理容器数据
        delete (container as any).__qalabCleanup;

        console.log('[QALab] ✅ 子模块卸载成功');
    } catch (error) {
        console.error('[QALab] ❌ 子模块卸载失败:', error);
    }
}

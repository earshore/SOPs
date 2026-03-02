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
    switchDataTab,
    refreshDataPreview,
    triggerImport
} from './components/actions';
import { rufusSimulator } from './services/rufusSimulator';

import './qalab_style.css';
import '../master_analysis_style.css';

/**
 * 挂载子模块
 */
export async function mount(container: HTMLElement): Promise<void> {
    console.log('[QALab] 🔧 开始挂载子模块');

    try {
        // 1. 获取qalab状态
        const qalabState = appStore.getState().qalab;

        // 暴露全局对象（在任何异步操作之前）
        (window as any).qalabState = qalabState;
        (window as any).rufusSimulator = rufusSimulator;

        // 2. 使用 SafeModuleLoader 加载模板
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

        // 使用 SafeRenderer 渲染模板（静态模板，已审计）
        container.classList.add('fade-in');
        renderer.renderTemplate(container, html);

        // 3. 注册全局操作
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
            amz_qalab_switchDataTab: () => {
                // Tab切换通过事件委托处理
            }
        });

        // 暴露triggerImport到全局，供HTML onclick使用
        (window as any).qalabTriggerImport = triggerImport;

        // 4. 设置事件监听器 - 使用事件委托处理data-action
        const eventManager = { listeners: [] as Array<{ element: any; event: string; handler: any }> };

        const clickHandler = (e: Event) => {
            const target = e.target as HTMLElement;
            const actionBtn = target.closest('[data-action]') as HTMLElement;

            if (actionBtn) {
                const action = actionBtn.dataset.action;

                // 特殊处理Tab切换
                if (action === 'amz_qalab_switchDataTab') {
                    const tab = actionBtn.dataset.tab as 'preview' | 'json';
                    if (tab) {
                        switchDataTab(tab);
                    }
                    return;
                }

                // 其他动作
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

        // 监听 Rufus 输入框的焦点事件 - 首次焦点时显示欢迎语
        let hasShownWelcome = false;
        const focusHandler = (e: FocusEvent) => {
            const target = e.target as HTMLElement;
            if (target.id === 'rufusInput' && !hasShownWelcome) {
                hasShownWelcome = true;
                const qalabState = appStore.getState().qalab;

                // 只在没有消息历史时显示欢迎语
                if (qalabState.rufusMessages.length === 0) {
                    const welcomeMessage = {
                        role: 'assistant' as const,
                        content: '👋 您好！我是 Rufus AI，您的智能产品问答助手。\n\n我可以帮您：\n• 从卖家视角回答买家的产品问题\n• 基于竞品分析报告智能生成回答\n• 扬长避短，促进产品转化\n\n请随时向我提问！',
                        timestamp: Date.now()
                    };

                    qalabState.rufusMessages.push(welcomeMessage);

                    // 动态导入 renderRufusMessages
                    import('./components/actions').then(({ renderRufusMessages }) => {
                        renderRufusMessages();
                        console.log('[QALab] ✅ 已显示欢迎语');
                    });
                }
            }
        };

        container.addEventListener('focus', focusHandler, true); // 使用捕获阶段
        eventManager.listeners.push({ element: container, event: 'focus', handler: focusHandler });

        // 监听数据导入事件
        const dataImportHandler = () => {
            console.log('[QALab] 检测到数据导入事件');
            refreshDataPreview();
        };

        window.addEventListener('qalab:data-imported', dataImportHandler);
        eventManager.listeners.push({ element: window, event: 'qalab:data-imported', handler: dataImportHandler });

        // 5. 监听数据更新事件 - 自动加载分析报告
        const dataUpdateHandler = () => {
            console.log('[QALab] 检测到数据更新事件');
            autoLoadAnalysisReport();
        };

        eventBus.on(MODULE_EVENTS.SCRAPER.SCRAPE_SUCCESS, dataUpdateHandler);
        eventBus.on(MODULE_EVENTS.ANALYSIS.ANALYZE_SUCCESS, dataUpdateHandler);

        // 保存清理函数到容器
        (container as any).__qalabCleanup = {
            registeredActions,
            eventManager,
            dataUpdateHandler
        };

        // 6. 模块挂载时检查是否有现有报告
        // 延迟执行，避免干扰页面初始动画
        requestAnimationFrame(() => {
            autoLoadAnalysisReport();
        });

        // 7. 初始化数据预览
        // 延迟执行，避免干扰页面初始动画
        requestAnimationFrame(() => {
            refreshDataPreview();
        });

        // 8. 确保按钮容器在数据预览渲染后仍然可见
        // 使用 Promise.resolve() 确保在当前微任务队列清空后执行
        Promise.resolve().then(() => {
            const sectionActions = container.querySelector('.section-actions') as HTMLElement;
            if (sectionActions) {
                // 检查按钮容器的计算样式
                const computedStyle = window.getComputedStyle(sectionActions);
                const isHidden = computedStyle.display === 'none' ||
                    computedStyle.visibility === 'hidden' ||
                    computedStyle.opacity === '0';

                if (isHidden) {
                    console.warn('[QALab] ⚠️ 检测到按钮容器被隐藏，强制显示');
                    sectionActions.style.display = 'flex';
                    sectionActions.style.visibility = 'visible';
                    sectionActions.style.opacity = '1';
                }
            }
        });

        console.log('[QALab] ✅ 子模块挂载成功');
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
            console.warn('[QALab] ⚠️ 未提供container，跳过清理');
            return;
        }

        const cleanup = (container as any).__qalabCleanup;
        if (!cleanup) {
            console.warn('[QALab] ⚠️ 未找到清理数据');
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
        }

        // 4. 清空容器DOM
        container.innerHTML = '';

        // 5. 清理容器数据
        delete (container as any).__qalabCleanup;

        console.log('[QALab] ✅ 子模块卸载成功');
    } catch (error) {
        console.error('[QALab] ❌ 子模块卸载失败:', error);
    }
}

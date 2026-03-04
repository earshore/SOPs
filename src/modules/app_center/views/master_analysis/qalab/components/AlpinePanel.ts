/**
 * QA Lab Alpine.js 组件
 * 统一使用 Alpine 响应式架构管理状态
 */

import { createMultipleStateSyncs, cleanupSubscriptions } from '@common/utils/stateSync';
import { Logger } from '../../../../../../services/loggerService';
import {
    startAnalysis,
    clearInput,
    toggleExpandAll,
    exportJSON,
    exportCSV,
    exportText,
    sendRufusQuestion,
    clearRufusChat,
    switchDataTab,
    refreshDataPreview,
    autoLoadAnalysisReport
} from './actions';

/**
 * Alpine 组件上下文类型
 */
interface QalabAlpineContext {
    // ========== State ==========
    currentLang: string;
    currentCategory: string;
    allExpanded: boolean;
    reportData: unknown;
    generatedQAs: unknown[];
    activeTab: 'preview' | 'json';
    
    // ========== 订阅清理函数 ==========
    _unsubscribes: Array<() => void>;
    
    // ========== Lifecycle ==========
    init(): void;
    destroy(): void;
    
    // ========== Actions ==========
    handleStartAnalysis(): void;
    handleClearInput(): void;
    handleToggleExpandAll(): void;
    handleExportJSON(): void;
    handleExportCSV(): void;
    handleExportText(): void;
    handleSendRufusQuestion(question: string): void;
    handleClearRufusChat(): void;
    handleSwitchDataTab(tab: 'preview' | 'json'): void;
}

/**
 * 创建 QA Lab Alpine 面板组件
 */
export function createQalabPanel(): QalabAlpineContext & Record<string, unknown> {
    const panel = {
        // ========== State (从 Zustand 同步) ==========
        currentLang: 'en',
        currentCategory: 'all',
        allExpanded: false,
        reportData: null as any,
        generatedQAs: [] as any[],
        activeTab: 'preview' as 'preview' | 'json',
        
        // ========== 订阅清理函数 ==========
        _unsubscribes: [] as Array<() => void>,
        
        // ========== Lifecycle ==========
        init(this: QalabAlpineContext & Record<string, unknown>) {
            Logger.debug('[QALab Alpine] 🚀 组件初始化');
            
            // 设置自动状态同步（Zustand → Alpine）
            this._unsubscribes = createMultipleStateSyncs([
                {
                    selector: (state) => state.qalab.currentLang,
                    onChange: (lang) => { this.currentLang = lang as string; },
                    immediate: true
                },
                {
                    selector: (state) => state.qalab.currentCategory,
                    onChange: (category) => { this.currentCategory = category as string; },
                    immediate: true
                },
                {
                    selector: (state) => state.qalab.allExpanded,
                    onChange: (expanded) => { this.allExpanded = expanded as boolean; },
                    immediate: true
                },
                {
                    selector: (state) => state.qalab.reportData,
                    onChange: (data) => { this.reportData = data; },
                    immediate: true
                },
                {
                    selector: (state) => state.qalab.generatedQAs,
                    onChange: (qas) => { this.generatedQAs = [...(qas as unknown[])]; },
                    immediate: true
                }
            ]);
            
            // 初始化时自动加载分析报告
            requestAnimationFrame(() => {
                autoLoadAnalysisReport();
            });
            
            // 初始化数据预览
            requestAnimationFrame(() => {
                refreshDataPreview();
            });
            
            Logger.debug('[QALab Alpine] ✅ 组件初始化完成');
        },
        
        // ========== 清理 ==========
        destroy(this: QalabAlpineContext & Record<string, unknown>) {
            Logger.debug('[QALab Alpine] 🧹 组件销毁，清理订阅');
            if (Array.isArray(this._unsubscribes)) {
                cleanupSubscriptions(this._unsubscribes);
            }
        },
        
        // ========== Actions ==========
        handleStartAnalysis() {
            Logger.debug('[QALab Alpine] 🚀 开始分析');
            startAnalysis();
        },
        
        handleClearInput() {
            Logger.debug('[QALab Alpine] 🗑️ 清空输入');
            clearInput();
        },
        
        handleToggleExpandAll() {
            Logger.debug('[QALab Alpine] 📖 切换展开/收起');
            toggleExpandAll();
        },
        
        handleExportJSON() {
            Logger.debug('[QALab Alpine] 📥 导出 JSON');
            exportJSON();
        },
        
        handleExportCSV() {
            Logger.debug('[QALab Alpine] 📥 导出 CSV');
            exportCSV();
        },
        
        handleExportText() {
            Logger.debug('[QALab Alpine] 📥 导出文本');
            exportText();
        },
        
        handleSendRufusQuestion(question: string) {
            Logger.debug('[QALab Alpine] 💬 发送 Rufus 问题:', question);
            sendRufusQuestion(question);
        },
        
        handleClearRufusChat() {
            Logger.debug('[QALab Alpine] 🗑️ 清空 Rufus 聊天');
            clearRufusChat();
        },
        
        handleSwitchDataTab(tab: 'preview' | 'json') {
            Logger.debug('[QALab Alpine] 🔄 切换数据标签:', tab);
            this.activeTab = tab;
            switchDataTab(tab);
        }
    };
    
    return panel as QalabAlpineContext & Record<string, unknown>;
}

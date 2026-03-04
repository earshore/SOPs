/**
 * Analysis 子模块
 * 负责关键词分析、统计和 AI 诊断报告功能
 * 
 * 架构说明：
 * - 状态保存到 state.keywordTracker 命名空间
 * - 通过 EventBus 与其他模块通信
 * - 使用 registerActionsWithLegacy 注册全局操作
 */

import { SafeModuleLoader } from '../../../../../common/infrastructure/SafeModuleLoader';
import { SafeRenderer } from '../../../../../common/infrastructure/SafeRenderer';
import { showToast } from '../../../../../common/ui';
import * as KeywordService from '../services/trackerService';
import { appStore } from '@/stores/useAppStore';
import { ErrorService } from '../../../../../services/errorService';
import { registerActionsWithLegacy, unregisterActions } from '../../../../../common/utils/actionRegistry';

import { Logger } from '../../../../../services/loggerService';
import '../keyword_hunter_style.css';

// ========================================== 
// Module State
// ========================================== 

interface EventListener {
    element: HTMLElement | Document;
    event: string;
    handler: EventListener;
}

let eventListeners: EventListener[] = []; // 用于清理事件监听器
let timeouts: number[] = []; // 用于清理定时器
let registeredActionNames: string[] = []; // 用于清理已注册的动作

// ========================================== 
// Helper Functions
// ========================================== 

/**
 * 添加事件监听器（带自动清理）
 */
function addEventListener(element: HTMLElement | Document, event: string, handler: EventListener): void {
    element.addEventListener(event, handler as any);
    eventListeners.push({ element, event, handler });
}

/**
 * 清理所有事件监听器和定时器
 */
function cleanup(): void {
    // 清理事件监听器
    eventListeners.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler as any);
    });
    eventListeners = [];

    // 清理定时器
    timeouts.forEach(id => clearTimeout(id));
    timeouts = [];

    // 清理已注册的动作
    if (registeredActionNames.length > 0) {
        unregisterActions(registeredActionNames);
        Logger.debug(`[Analysis] 已清理 ${registeredActionNames.length} 个动作`);
        registeredActionNames = [];
    }
}

// ========================================== 
// State Management
// ========================================== 

/**
 * 保存分析状态到 state
 */
function saveAnalysisStateToState(): void {
    const currentState = appStore.getState();
    if (!currentState.keywordTracker) {
        currentState.updateKeywordTracker({} as any);
    }

    // 保存 AI 分析报告内容
    const resultDiv = document.getElementById('kt-llm-analysis-result');
    if (resultDiv) {
        // ✅ 安全: 静态HTML模板，无用户输入
        appStore.getState().updateKeywordTracker({ llmAnalysisResult: resultDiv.innerHTML });
    }
}

/**
 * 从 state 恢复分析状态
 */
function restoreAnalysisStateFromState(): void {
    // 恢复 AI 分析报告
    const resultDiv = document.getElementById('kt-llm-analysis-result');
    const currentState = appStore.getState();
    if (resultDiv && currentState.keywordTracker && currentState.keywordTracker.llmAnalysisResult) {
        const renderer = SafeRenderer.getInstance();
        renderer.renderTemplate(resultDiv, currentState.keywordTracker.llmAnalysisResult);
        highlightScores(resultDiv);
    }

    // 渲染分析模块
    renderAnalysisModule();
}

// ========================================== 
// UI Rendering Functions
// ========================================== 

/**
 * 渲染分析模块
 */
function renderAnalysisModule(): void {
    // 更新生成报告按钮状态
    updateAnalyzeButtonState();
}

/**
 * 更新生成报告按钮状态
 */
function updateAnalyzeButtonState(): void {
    const btn = document.getElementById('kt-analyze-btn') as HTMLButtonElement | null;
    const hasContent = appStore.getState().keywordTracker.processedCopy && appStore.getState().keywordTracker.processedCopy.trim().length > 0;

    if (btn) {
        if (hasContent) {
            btn.disabled = false;
            btn.classList.remove('bg-slate-100', 'text-slate-400', 'border-slate-200', 'cursor-not-allowed');
            btn.classList.add('bg-gradient-to-r', 'from-purple-600', 'via-purple-500', 'to-pink-600', 'hover:from-purple-500', 'hover:via-purple-400', 'hover:to-pink-500', 'text-white', 'border-purple-500', 'shadow-md', 'shadow-purple-500/20', 'hover:shadow-lg', 'hover:shadow-purple-500/30', 'cursor-pointer', 'hover:scale-[1.02]', 'hover:-translate-y-0.5');
        } else {
            btn.disabled = true;
            btn.classList.remove('bg-gradient-to-r', 'from-purple-600', 'via-purple-500', 'to-pink-600', 'hover:from-purple-500', 'hover:via-purple-400', 'hover:to-pink-500', 'text-white', 'border-purple-500', 'shadow-md', 'shadow-purple-500/20', 'hover:shadow-lg', 'hover:shadow-purple-500/30', 'cursor-pointer', 'hover:scale-[1.02]', 'hover:-translate-y-0.5');
            btn.classList.add('bg-slate-100', 'text-slate-400', 'border-slate-200', 'cursor-not-allowed');
        }
    }
}

// ========================================== 
// Action Functions
// ========================================== 

/**
 * 运行 LLM 分析
 */
async function runLLMAnalysis(): Promise<void> {
    const btn = document.getElementById('kt-analyze-btn') as HTMLButtonElement | null;

    if (!appStore.getState().keywordTracker.processedCopy || !appStore.getState().keywordTracker.processedCopy.trim()) {
        showToast("文案内容为空，无法进行AI分析", { type: 'warning' });
        return;
    }

    const resultDiv = document.getElementById('kt-llm-analysis-result');

    // 更新按钮状态 - 分析中（灰度冻结）
    if (btn) {
        btn.disabled = true;
        btn.classList.remove('bg-gradient-to-r', 'from-purple-600', 'via-purple-500', 'to-pink-600', 'hover:from-purple-500', 'hover:via-purple-400', 'hover:to-pink-500', 'text-white', 'border-purple-500', 'shadow-md', 'shadow-purple-500/20', 'hover:shadow-lg', 'hover:shadow-purple-500/30', 'cursor-pointer', 'hover:scale-[1.02]', 'hover:-translate-y-0.5');
        btn.classList.add('bg-slate-300', 'text-slate-500', 'border-slate-300', 'cursor-wait');
    }

    // 显示加载状态
    if (resultDiv) {
        const renderer = SafeRenderer.getInstance();
        const loadingHtml = `
            <div class="text-center py-10">
                <i class="fas fa-spinner fa-spin text-purple-500 text-2xl"></i>
                <p class="mt-2 text-slate-500">AI 正在深度分析您的 Listing ...</p>
            </div>
        `;
        renderer.renderTemplate(resultDiv, loadingHtml);
    }

    try {
        const response = await KeywordService.fetchListingAnalysis(
            appStore.getState().keywordTracker.processedCopy,
            appStore.getState().keywordTracker.keywords,
            appStore.getState().keywordTracker.matchedKeywords,
            appStore.getState().keywordTracker.unmatchedKeywords
        );

        // 渲染分析结果
        if (resultDiv) {
            const renderer = SafeRenderer.getInstance();
            if ((window as any).marked) {
                const parsedHtml = (window as any).marked.parse(response);
                renderer.renderTemplate(resultDiv, parsedHtml);
                highlightScores(resultDiv);
            } else {
                resultDiv.textContent = response;
            }
        }

        // 更新按钮状态为已完成（绿色）
        if (btn) {
            btn.disabled = true;
            btn.classList.remove('bg-slate-300', 'text-slate-500', 'border-slate-300', 'cursor-wait');
            btn.classList.add('bg-emerald-500', 'text-white', 'border-emerald-500', 'cursor-not-allowed');
        }

        // 保存状态
        saveAnalysisStateToState();

        showToast("报告生成成功", { type: 'success' });

    } catch (e) {
        const error = e as Error;
        const isValidationError = error.message.includes("输入内容过短") || error.message.includes("文案内容为空");

        if (!isValidationError) {
            ErrorService.handle(error, { action: 'runLLMAnalysis', module: 'keywordTracker', notify: false });
        }

        let errorMsg = error.message;
        if (errorMsg.includes('503')) {
            errorMsg = "服务暂时不可用 (503)。可能是模型过载，请稍后重试。";
        }

        // 显示错误信息
        if (resultDiv) {
            const colorClass = isValidationError ? "yellow" : "red";
            const icon = isValidationError ? "fa-exclamation-circle" : "fa-exclamation-triangle";
            const title = isValidationError ? "无法进行分析" : "分析失败";

            const errorDiv = document.createElement('div');
            errorDiv.className = `p-4 bg-${colorClass}-50 border border-${colorClass}-200 rounded-lg`;

            const headerDiv = document.createElement('div');
            headerDiv.className = `flex items-center gap-2 text-${colorClass}-700 font-bold mb-2`;
            const iconEl = document.createElement('i');
            iconEl.className = `fas ${icon}`;
            headerDiv.appendChild(iconEl);
            headerDiv.appendChild(document.createTextNode(` ${title}`));

            const msgP = document.createElement('p');
            msgP.className = `text-sm text-${colorClass}-800`;
            msgP.textContent = errorMsg;

            const retryBtn = document.createElement('button');
            retryBtn.className = `mt-3 px-3 py-1 bg-white border border-${colorClass}-200 text-${colorClass}-700 text-xs rounded hover:bg-${colorClass}-50`;
            retryBtn.textContent = '重试';
            retryBtn.onclick = () => (window as any).kt_runLLMAnalysis();

            errorDiv.appendChild(headerDiv);
            errorDiv.appendChild(msgP);
            errorDiv.appendChild(retryBtn);

            resultDiv.innerHTML = '';
            resultDiv.appendChild(errorDiv);
        }

        // 恢复按钮状态为可点击（紫色渐变）
        if (btn) {
            btn.disabled = false;
            btn.classList.remove('bg-slate-300', 'text-slate-500', 'border-slate-300', 'cursor-wait', 'cursor-not-allowed', 'bg-emerald-500', 'border-emerald-500');
            btn.classList.add('bg-gradient-to-r', 'from-purple-600', 'via-purple-500', 'to-pink-600', 'hover:from-purple-500', 'hover:via-purple-400', 'hover:to-pink-500', 'text-white', 'border-purple-500', 'shadow-md', 'shadow-purple-500/20', 'hover:shadow-lg', 'hover:shadow-purple-500/30', 'cursor-pointer', 'hover:scale-[1.02]', 'hover:-translate-y-0.5');
        }
    }
}

// ========================================== 
// Event Listeners Setup
// ========================================== 

/**
 * 设置事件监听器
 */
function setupEventListeners(container: HTMLElement): void {
    if (!container) return;

    // 生成报告按钮
    const btnAnalyze = document.getElementById('kt-analyze-btn');
    if (btnAnalyze) {
        addEventListener(btnAnalyze, 'click', (async () => await runLLMAnalysis()) as any);
    }
}


// ==========================================
// Score Highlighting (Fixed)
// ==========================================

function highlightScores(container: HTMLElement): void {
    if (!container) return;

    const rows = container.querySelectorAll('tbody tr');
    if (!rows.length) return;

    rows.forEach((tr, index) => {
        const tds = tr.querySelectorAll('td');
        if (tds.length < 2) return;

        const td2 = tds[1] as HTMLElement; // 分数
        const text = td2.textContent?.trim() || '';
        const isLastRow = index === rows.length - 1;

        // 清除旧状态
        tr.classList.remove('row-total', 'row-low', 'row-risk');

        // ——— 总分行（最后一行） ———
        if (isLastRow) {
            tr.classList.add('row-total');
            const totalMatch = text.match(/(\d+)\s*\/\s*(\d+)/);
            if (totalMatch) {
                const score = parseInt(totalMatch[1]!, 10);
                const span = document.createElement('span');
                span.className = 'score-badge score-badge-total';
                span.textContent = `⭐ ${score}/${totalMatch[2]}`;
                td2.innerHTML = '';
                td2.appendChild(span);
            }
            return;
        }

        // ——— 违规行 ———
        if (text.includes('-10') || text.includes('🚨')) {
            tr.classList.add('row-risk');
            const span = document.createElement('span');
            span.className = 'score-badge score-badge-risk';
            span.textContent = '🚨 -10';
            td2.innerHTML = '';
            td2.appendChild(span);
            return;
        }

        // ——— 通过行（违规检查通过） ———
        if (text.includes('✅') || text.includes('+0') || text.includes('通过')) {
            const span = document.createElement('span');
            span.className = 'score-badge score-badge-pass';
            span.textContent = '✅ 通过';
            td2.innerHTML = '';
            td2.appendChild(span);
            return;
        }

        // ——— 数字分数行 ———
        const match = text.match(/(\d+)\s*\/\s*(\d+)/);
        if (!match) return;

        const score = parseInt(match[1]!, 10);
        const max = parseInt(match[2]!, 10);
        if (max === 0) return;

        const ratio = score / max;

        let badgeClass: string, icon: string;
        if (ratio >= 0.75) {
            badgeClass = 'score-badge-high';
            icon = '🟢';
        } else if (ratio >= 0.5) {
            badgeClass = 'score-badge-mid';
            icon = '🟡';
        } else {
            badgeClass = 'score-badge-low';
            icon = '🔴';
            tr.classList.add('row-low');
        }

        const span = document.createElement('span');
        span.className = `score-badge ${badgeClass}`;
        span.textContent = `${icon} ${score}/${max}`;
        td2.innerHTML = '';
        td2.appendChild(span);
    });

    // ——— 总分标题处理 ———
    const h2 = container.querySelector('h2');
    if (!h2) return;

    const h2Text = h2.textContent || '';
    const totalMatch = h2Text.match(/(\d+)\s*\/\s*100/);
    if (!totalMatch) return;

    const total = parseInt(totalMatch[1]!, 10);
    let gradientColors: string;

    if (total >= 85) {
        gradientColors = 'linear-gradient(135deg, #065f46, #059669, #34d399)';
    } else if (total >= 75) {
        gradientColors = 'linear-gradient(135deg, #1e1b4b, #4c1d95, #7c3aed)';
    } else if (total >= 70) {
        gradientColors = 'linear-gradient(135deg, #78350f, #d97706, #fbbf24)';
    } else {
        gradientColors = 'linear-gradient(135deg, #7f1d1d, #dc2626, #f87171)';
    }

    h2.style.background = gradientColors;
    h2.style.color = '#ffffff';

    // 移除旧进度条（防止重复追加）
    const oldBar = h2.querySelector('.score-progress-bar');
    if (oldBar) oldBar.remove();

    // 注入进度条
    const progressBar = document.createElement('div');
    progressBar.className = 'score-progress-bar';
    progressBar.style.cssText = 'margin-top:0.75rem;background:rgba(255,255,255,0.15);border-radius:1rem;height:6px;overflow:hidden;width:100%;';

    const progressFill = document.createElement('div');
    progressFill.style.cssText = 'width:0%;height:100%;background:rgba(255,255,255,0.7);border-radius:1rem;transition:width 1s ease-out;';
    progressBar.appendChild(progressFill);
    h2.appendChild(progressBar);

    // 延迟触发动画
    requestAnimationFrame(function () {
        requestAnimationFrame(function () {
            progressFill.style.width = total + '%';
        });
    });
}


// ========================================== 
// Module Exports (统一架构接口)
// ========================================== 

/**
 * 挂载子模块
 * @param {HTMLElement} container - 容器元素
 */
export async function mount(container: HTMLElement): Promise<void> {
    Logger.debug('[Analysis] 🔧 开始挂载子模块');

    try {
        // 1. 使用 SafeModuleLoader 加载模板
        const loader = SafeModuleLoader.getInstance();
        const renderer = SafeRenderer.getInstance();

        const html = await loader.loadTemplate(
            'src/modules/app_center/views/keyword_hunter/analysis/template.html',
            {
                retryCount: 3,
                timeout: 5000,
                onError: (error) => {
                    Logger.error('[Analysis] 模板加载失败:', error);
                }
            }
        );

        // 使用 SafeRenderer 渲染模板
        // 添加淡入动画（在渲染前添加）
        container.classList.add('fade-in');
        renderer.renderTemplate(container, html);

        // 2. 注册全局操作（用于 HTML onclick 兼容）
        registerActionsWithLegacy({
            kt_runLLMAnalysis: () => runLLMAnalysis(),
        });

        // 3. 设置事件监听器
        setupEventListeners(container);

        // 4. 从 state 恢复状态
        restoreAnalysisStateFromState();

        Logger.debug('[Analysis] ✅ 子模块挂载成功');
    } catch (error) {
        Logger.error('[Analysis] ❌ 子模块挂载失败:', error);
        throw error;
    }
}

/**
 * 卸载子模块
 */
export function unmount(): void {
    Logger.debug('[Analysis] 🔄 开始卸载子模块');

    try {
        // 1. 保存状态到 state
        saveAnalysisStateToState();

        // 2. 清理事件监听器和定时器
        cleanup();

        Logger.debug('[Analysis] ✅ 子模块卸载成功');
    } catch (error) {
        Logger.error('[Analysis] ❌ 子模块卸载失败:', error);
    }
}

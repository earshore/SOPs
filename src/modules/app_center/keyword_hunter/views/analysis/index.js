/**
 * Analysis 子模块
 * 负责关键词分析、统计和 AI 诊断报告功能
 * 
 * 架构说明：
 * - 状态保存到 state.keywordTracker 命名空间
 * - 通过 EventBus 与其他模块通信
 * - 使用 registerActionsWithLegacy 注册全局操作
 */

import { loadTemplate } from '../../../../../common/utils/viewLoader.js';
import { showToast } from '../../../../../common/utils/ui.js';
import * as KeywordService from '../../../keyword_tracker/trackerService.js';
import state from '../../../../../common/state.js';
import { ErrorService } from '../../../../../services/errorService.js';
import { registerActionsWithLegacy } from '../../../../../common/utils/actionRegistry.js';

// ========================================== 
// Module State
// ========================================== 

let eventListeners = []; // 用于清理事件监听器
let timeouts = []; // 用于清理定时器

// ========================================== 
// Helper Functions
// ========================================== 

/**
 * 添加事件监听器（带自动清理）
 */
function addEventListener(element, event, handler) {
    element.addEventListener(event, handler);
    eventListeners.push({ element, event, handler });
}

/**
 * 添加定时器（带自动清理）
 */
function addTimeout(callback, delay) {
    const id = setTimeout(callback, delay);
    timeouts.push(id);
    return id;
}

/**
 * 清理所有事件监听器和定时器
 */
function cleanup() {
    // 清理事件监听器
    eventListeners.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler);
    });
    eventListeners = [];

    // 清理定时器
    timeouts.forEach(id => clearTimeout(id));
    timeouts = [];
}

/**
 * HTML 转义
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========================================== 
// State Management
// ========================================== 

/**
 * 保存分析状态到 state
 */
function saveAnalysisStateToState() {
    if (!state.keywordTracker) {
        state.keywordTracker = {};
    }

    // 保存 AI 分析报告内容
    const resultDiv = document.getElementById('kt-llm-analysis-result');
    if (resultDiv) {
        state.keywordTracker.llmAnalysisResult = resultDiv.innerHTML;
    }
}

/**
 * 从 state 恢复分析状态
 */
function restoreAnalysisStateFromState() {
    // 恢复 AI 分析报告
    const resultDiv = document.getElementById('kt-llm-analysis-result');
    if (resultDiv && state.keywordTracker && state.keywordTracker.llmAnalysisResult) {
        resultDiv.innerHTML = state.keywordTracker.llmAnalysisResult;
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
function renderAnalysisModule() {
    if (!state.keywordTracker) {
        state.keywordTracker = {};
    }

    const total = state.keywordTracker.keywords ? state.keywordTracker.keywords.length : 0;
    const matched = state.keywordTracker.matchedKeywords ? state.keywordTracker.matchedKeywords.length : 0;
    const rate = total === 0 ? 0 : Math.round((matched / total) * 100);

    // 更新覆盖率
    const rateEl = document.getElementById('kt-coverage-rate');
    if (rateEl) rateEl.textContent = rate + '%';

    const barEl = document.getElementById('kt-coverage-bar');
    if (barEl) barEl.style.width = rate + '%';

    // 更新统计数据
    const matchedEl = document.getElementById('kt-stat-matched');
    if (matchedEl) matchedEl.textContent = matched;

    const unmatchedEl = document.getElementById('kt-stat-unmatched');
    if (unmatchedEl) {
        const unmatchedCount = state.keywordTracker.unmatchedKeywords ? state.keywordTracker.unmatchedKeywords.length : 0;
        unmatchedEl.textContent = unmatchedCount;
    }

    const totalEl = document.getElementById('kt-stat-total');
    if (totalEl) totalEl.textContent = total;

    // 渲染高频词云
    const freqList = document.getElementById('kt-word-frequency-list');
    if (freqList && state.keywordTracker.wordFrequency) {
        freqList.innerHTML = state.keywordTracker.wordFrequency.map(([w, c]) => `
            <span class="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md">
                ${escapeHtml(w)} <span class="text-slate-400">(${c})</span>
            </span>
        `).join('');
    }

    // 更新生成报告按钮状态
    updateAnalyzeButtonState();
}

/**
 * 更新生成报告按钮状态
 */
function updateAnalyzeButtonState() {
    const btn = document.getElementById('kt-analyze-btn');
    const hasContent = state.keywordTracker.processedCopy && state.keywordTracker.processedCopy.trim().length > 0;

    if (btn) {
        if (hasContent) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-magic"></i> 生成报告';
            btn.classList.remove('bg-gray-300', 'text-gray-500', 'cursor-not-allowed');
            btn.classList.add('bg-purple-600', 'text-white', 'hover:bg-purple-700', 'shadow-sm');
        } else {
            btn.disabled = true;
            btn.classList.add('bg-gray-300', 'text-gray-500', 'cursor-not-allowed');
            btn.classList.remove('bg-purple-600', 'text-white', 'hover:bg-purple-700', 'shadow-sm');
        }
    }
}

// ========================================== 
// Action Functions
// ========================================== 

/**
 * 运行 LLM 分析
 */
async function runLLMAnalysis() {
    const btn = document.getElementById('kt-analyze-btn');

    if (!state.keywordTracker.processedCopy || !state.keywordTracker.processedCopy.trim()) {
        showToast("文案内容为空，无法进行AI分析", "warning");
        return;
    }

    const resultDiv = document.getElementById('kt-llm-analysis-result');

    // 更新按钮状态
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> 分析中...';
        btn.classList.add('opacity-75', 'cursor-wait');
    }

    // 显示加载状态
    if (resultDiv) {
        resultDiv.innerHTML = `
            <div class="text-center py-10">
                <i class="fas fa-circle-notch fa-spin text-purple-500 text-2xl"></i>
                <p class="mt-2 text-slate-500">AI 正在深度分析您的 Listing ...</p>
            </div>
        `;
    }

    try {
        const response = await KeywordService.fetchListingAnalysis(
            state.keywordTracker.processedCopy,
            state.keywordTracker.keywords,
            state.keywordTracker.matchedKeywords,
            state.keywordTracker.unmatchedKeywords
        );

        // 渲染分析结果
        if (resultDiv) {
            if (window.marked) {
                resultDiv.innerHTML = window.marked.parse(response);
            } else {
                resultDiv.textContent = response;
            }
        }

        // 更新按钮状态为已完成
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-check"></i> 报告已生成';
            btn.classList.remove('from-blue-500', 'to-purple-600', 'text-white', 'hover:from-blue-400', 'hover:to-purple-500', 'opacity-75', 'cursor-wait');
            btn.classList.add('text-gray-500', 'cursor-not-allowed');
        }

        // 保存状态
        saveAnalysisStateToState();

        showToast("报告生成成功", "success");

    } catch (e) {
        const isValidationError = e.message.includes("输入内容过短") || e.message.includes("文案内容为空");

        if (!isValidationError) {
            ErrorService.handle(e, { action: 'runLLMAnalysis', module: 'keywordTracker', notify: false });
        }

        let errorMsg = e.message;
        if (errorMsg.includes('503')) {
            errorMsg = "服务暂时不可用 (503)。可能是模型过载，请稍后重试。";
        }

        // 显示错误信息
        if (resultDiv) {
            const colorClass = isValidationError ? "yellow" : "red";
            const icon = isValidationError ? "fa-exclamation-circle" : "fa-exclamation-triangle";
            const title = isValidationError ? "无法进行分析" : "分析失败";

            resultDiv.innerHTML = `
                <div class="p-4 bg-${colorClass}-50 border border-${colorClass}-200 rounded-lg">
                    <div class="flex items-center gap-2 text-${colorClass}-700 font-bold mb-2">
                        <i class="fas ${icon}"></i> ${title}
                    </div>
                    <p class="text-sm text-${colorClass}-800">${escapeHtml(errorMsg)}</p>
                    <button onclick="window.kt_runLLMAnalysis()" class="mt-3 px-3 py-1 bg-white border border-${colorClass}-200 text-${colorClass}-700 text-xs rounded hover:bg-${colorClass}-50">重试</button>
                </div>
            `;
        }

        // 恢复按钮状态
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-magic"></i> 重试生成';
            btn.classList.remove('bg-gray-300', 'text-gray-500', 'cursor-not-allowed', 'opacity-75', 'cursor-wait');
            btn.classList.add('bg-purple-600', 'text-white', 'hover:bg-purple-700');
        }
    }
}

// ========================================== 
// Event Listeners Setup
// ========================================== 

/**
 * 设置事件监听器
 */
function setupEventListeners(container) {
    if (!container) return;

    // 生成报告按钮
    const btnAnalyze = document.getElementById('kt-analyze-btn');
    if (btnAnalyze) {
        addEventListener(btnAnalyze, 'click', async () => await runLLMAnalysis());
    }
}

// ========================================== 
// Module Exports (统一架构接口)
// ========================================== 

/**
 * 挂载子模块
 * @param {HTMLElement} container - 容器元素
 */
export async function mount(container) {
    console.log('[Analysis] 🔧 开始挂载子模块');

    try {
        // 1. 加载模板
        const html = await loadTemplate('src/modules/app_center/keyword_hunter/views/analysis/template.html');
        container.innerHTML = html;

        // 2. 注册全局操作（用于 HTML onclick 兼容）
        registerActionsWithLegacy({
            kt_runLLMAnalysis: () => runLLMAnalysis(),
        });

        // 3. 设置事件监听器
        setupEventListeners(container);

        // 4. 从 state 恢复状态
        restoreAnalysisStateFromState();

        console.log('[Analysis] ✅ 子模块挂载成功');
    } catch (error) {
        console.error('[Analysis] ❌ 子模块挂载失败:', error);
        throw error;
    }
}

/**
 * 卸载子模块
 */
export function unmount() {
    console.log('[Analysis] 🔄 开始卸载子模块');

    try {
        // 1. 保存状态到 state
        saveAnalysisStateToState();

        // 2. 清理事件监听器和定时器
        cleanup();

        console.log('[Analysis] ✅ 子模块卸载成功');
    } catch (error) {
        console.error('[Analysis] ❌ 子模块卸载失败:', error);
    }
}

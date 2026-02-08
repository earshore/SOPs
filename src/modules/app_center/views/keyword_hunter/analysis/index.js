/**
 * Analysis 子模块
 * 负责关键词分析、统计和 AI 诊断报告功能
 * 
 * 架构说明：
 * - 状态保存到 state.keywordTracker 命名空间
 * - 通过 EventBus 与其他模块通信
 * - 使用 registerActionsWithLegacy 注册全局操作
 */

import { loadTemplate } from '../../../../../common/utils/viewLoader';
import { showToast } from '../../../../../common/utils/ui.js';
import * as KeywordService from '../services/trackerService.js';
import state from "../../../../../common/state";
import { APP_EVENTS } from '../../../../../common/constants/eventConstants';
import { ErrorService } from '../../../../../services/errorService';
import { registerActionsWithLegacy } from '../../../../../common/utils/actionRegistry';

import '../keyword_hunter_style.css';

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
        // ✅ 安全: 静态HTML模板，无用户输入
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
        // ✅ 安全: 静态HTML模板，无用户输入
        resultDiv.innerHTML = state.keywordTracker.llmAnalysisResult;
        highlightScores(resultDiv); // ← 改动：恢复状态时也染色
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
            btn.classList.remove('bg-gray-300', 'text-gray-500', 'cursor-not-allowed', 'opacity-50', 'grayscale');
            btn.classList.add('bg-purple-600', 'text-white', 'hover:bg-purple-700', 'shadow-sm', 'cursor-pointer');
        } else {
            btn.disabled = true;
            btn.classList.remove('bg-purple-600', 'text-white', 'hover:bg-purple-700', 'shadow-sm', 'cursor-pointer');
            btn.classList.add('bg-gray-300', 'text-gray-500', 'cursor-not-allowed', 'opacity-50', 'grayscale');
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

    // 更新按钮状态 - 分析中（灰度冻结）
    if (btn) {
        btn.disabled = true;
        btn.classList.remove('bg-purple-600', 'hover:bg-purple-700', 'cursor-pointer');
        btn.classList.add('bg-gray-400', 'cursor-wait', 'opacity-75', 'grayscale');
    }

    // 显示加载状态
    if (resultDiv) {
        // ✅ 安全: 静态HTML模板，无用户输入
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
                highlightScores(resultDiv);
            } else {
                resultDiv.textContent = response;
            }
        }

        // 更新按钮状态为已完成（绿色）
        if (btn) {
            btn.disabled = true;
            btn.classList.remove('bg-gray-400', 'cursor-wait', 'opacity-75', 'grayscale');
            btn.classList.add('bg-green-500', 'text-white', 'cursor-not-allowed');
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

        // 恢复按钮状态为可点击（紫色）
        if (btn) {
            btn.disabled = false;
            btn.classList.remove('bg-gray-400', 'cursor-wait', 'opacity-75', 'grayscale', 'cursor-not-allowed');
            btn.classList.add('bg-purple-600', 'text-white', 'hover:bg-purple-700', 'cursor-pointer');
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
// Score Highlighting (Fixed)
// ==========================================

function highlightScores(container) {
    if (!container) return;

    const rows = container.querySelectorAll('tbody tr');
    if (!rows.length) return;

    rows.forEach((tr, index) => {
        const tds = tr.querySelectorAll('td');
        if (tds.length < 2) return;

        const td1 = tds[0]; // 维度名
        const td2 = tds[1]; // 分数
        const text = td2.textContent.trim();
        const isLastRow = index === rows.length - 1;

        // 清除旧状态
        tr.classList.remove('row-total', 'row-low', 'row-risk');

        // ——— 总分行（最后一行） ———
        if (isLastRow) {
            tr.classList.add('row-total');
            const totalMatch = text.match(/(\d+)\s*\/\s*(\d+)/);
            if (totalMatch) {
                const score = parseInt(totalMatch[1]);
                td2.innerHTML = '<span class="score-badge score-badge-total">⭐ ' + score + '/' + totalMatch[2] + '</span>';
            }
            return;
        }

        // ——— 违规行 ———
        if (text.includes('-10') || text.includes('🚨')) {
            tr.classList.add('row-risk');
            td2.innerHTML = '<span class="score-badge score-badge-risk">🚨 -10</span>';
            return;
        }

        // ——— 通过行（违规检查通过） ———
        if (text.includes('✅') || text.includes('+0') || text.includes('通过')) {
            td2.innerHTML = '<span class="score-badge score-badge-pass">✅ 通过</span>';
            return;
        }

        // ——— 数字分数行 ———
        const match = text.match(/(\d+)\s*\/\s*(\d+)/);
        if (!match) return;

        const score = parseInt(match[1]);
        const max = parseInt(match[2]);
        if (max === 0) return;

        const ratio = score / max;

        let badgeClass, icon;
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

        td2.innerHTML = '<span class="score-badge ' + badgeClass + '">' + icon + ' ' + score + '/' + max + '</span>';
    });

    // ——— 总分标题处理 ———
    const h2 = container.querySelector('h2');
    if (!h2) return;

    const h2Text = h2.textContent;
    const totalMatch = h2Text.match(/(\d+)\s*\/\s*100/);
    if (!totalMatch) return;

    const total = parseInt(totalMatch[1]);
    let gradientColors;

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
export async function mount(container) {
    console.log('[Analysis] 🔧 开始挂载子模块');

    try {
        // 1. 加载模板
        const html = await loadTemplate('src/modules/app_center/views/keyword_hunter/analysis/template.html');
        // ✅ 安全: 静态HTML模板，无用户输入
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

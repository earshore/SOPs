/**
 * Process 子模块
 * 负责文案处理、翻译和关键词匹配显示功能
 * 
 * 架构说明：
 * - 状态保存到 state.keywordTracker 命名空间
 * - 通过 EventBus 与其他模块通信
 * - 使用 registerActionsWithLegacy 注册全局操作
 * - 管理浮动关键词窗口的显示和交互
 */

import { loadTemplate } from '../../../../../common/utils/viewLoader.js';
import { showToast, showProgress } from '../../../../../common/utils/ui.js';
import * as KeywordService from '../services/trackerService.js';
import state from '../../../../../common/state.js';
import { ErrorService } from '../../../../../services/errorService.js';
import { registerActionsWithLegacy } from '../../../../../common/utils/actionRegistry.js';

// ========================================== 
// Module State
// ========================================== 

let eventListeners = []; // 用于清理事件监听器
let timeouts = []; // 用于清理定时器
let registeredActionNames = []; // 用于清理已注册的动作
let floatWinState = {
    isDragging: false,
    offsetX: 0,
    offsetY: 0
};

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

    // 清理已注册的动作
    if (registeredActionNames.length > 0) {
        import('../../../../../common/utils/actionRegistry.js').then(({ unregisterActions }) => {
            unregisterActions(registeredActionNames);
            console.log(`[Process] 已清理 ${registeredActionNames.length} 个动作`);
            registeredActionNames = [];
        });
    }

    // 重置浮动窗口状态
    floatWinState = {
        isDragging: false,
        offsetX: 0,
        offsetY: 0
    };
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

/**
 * 属性转义
 */
function escapeAttr(text) {
    if (!text) return '';
    return text.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

/**
 * 正则表达式转义
 */
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ========================================== 
// State Management
// ========================================== 

/**
 * 保存处理状态到 state
 */
function saveProcessStateToState() {
    if (!state.keywordTracker) {
        state.keywordTracker = {};
    }

    // 保存文案显示内容
    const displayEl = document.getElementById('kt-copy-display');
    if (displayEl) {
        state.keywordTracker.processedCopy = displayEl.innerText;
    }

    // 保存翻译显示状态
    const showTransCheckbox = document.getElementById('kt-show-translation');
    if (showTransCheckbox) {
        state.keywordTracker.showTranslation = showTransCheckbox.checked;
    }
}

/**
 * 从 state 恢复处理状态
 */
function restoreProcessStateFromState() {
    // 恢复翻译显示状态
    const showTransCheckbox = document.getElementById('kt-show-translation');
    if (showTransCheckbox && state.keywordTracker) {
        if (state.keywordTracker.showTranslation !== undefined) {
            showTransCheckbox.checked = state.keywordTracker.showTranslation;
        }
        
        // 根据是否有翻译数据启用/禁用复选框
        const hasTranslationData = state.keywordTracker.paragraphs && state.keywordTracker.paragraphs.length > 0;
        showTransCheckbox.disabled = !hasTranslationData;
    }

    // 渲染处理模块
    renderProcessModule();
}

// ========================================== 
// UI Rendering Functions
// ========================================== 

/**
 * 渲染处理模块
 */
function renderProcessModule() {
    updateTranslateButton();
    renderCopyDisplay();
    renderFloatingKeywords();
    updateMinimizedBadge();
}

/**
 * 更新翻译按钮状态
 */
function updateTranslateButton() {
    const transBtn = document.getElementById('kt-translate-btn');
    const transBtnText = document.getElementById('kt-translate-btn-text');
    const transCheckbox = document.getElementById('kt-show-translation');

    const hasContent = state.keywordTracker.processedCopy && state.keywordTracker.processedCopy.trim().length > 0;
    const hasTranslationData = state.keywordTracker.paragraphs && state.keywordTracker.paragraphs.length > 0;

    // A. 翻译按钮
    if (transBtn && transBtnText) {
        if (hasContent && !hasTranslationData) {
            transBtn.disabled = false;
            transBtnText.textContent = "AI 沉浸式翻译";
            transBtn.classList.remove('bg-gray-300', 'text-gray-500', 'cursor-not-allowed');
            transBtn.classList.add('bg-gradient-to-r', 'from-purple-500', 'to-pink-500', 'text-white', 'shadow-md', 'hover:shadow-lg');
        } else {
            transBtn.disabled = true;
            transBtnText.textContent = hasTranslationData ? "翻译已完成" : "AI 沉浸式翻译";
            transBtn.classList.add('bg-gray-300', 'text-gray-500', 'cursor-not-allowed');
            transBtn.classList.remove('bg-gradient-to-r', 'from-purple-500', 'to-pink-500', 'text-white', 'shadow-md', 'hover:shadow-lg');
        }
    }

    // B. 复选框
    if (transCheckbox) {
        if (hasTranslationData) {
            transCheckbox.disabled = false;
            if (state.keywordTracker.translationMode) {
                transCheckbox.checked = true;
            }
        } else {
            transCheckbox.disabled = true;
            transCheckbox.checked = false;
        }
    }
}

/**
 * 渲染文案显示区域
 */
function renderCopyDisplay() {
    const display = document.getElementById('kt-copy-display');
    if (!display) return;

    const showTrans = document.getElementById('kt-show-translation')?.checked;

    // 如果是翻译模式且有翻译数据
    if (state.keywordTracker.translationMode && state.keywordTracker.paragraphs && state.keywordTracker.paragraphs.length > 0) {
        let html = '';
        state.keywordTracker.paragraphs.forEach(p => {
            const highlightedOriginal = highlightText(p.original);
            html += `<div class="mb-4">`;
            html += `<div class="paragraph-original leading-relaxed">${highlightedOriginal}</div>`;
            if (showTrans && p.translation) {
                html += `<div class="sentence-translation">${escapeHtml(p.translation)}</div>`;
            }
            html += `</div>`;
        });
        // ✅ 安全: 静态HTML模板，无用户输入
        display.innerHTML = html;
        return;
    }

    // 普通模式：显示高亮的文案
    if (state.keywordTracker.processedCopy) {
        // ✅ 安全: 静态HTML模板，无用户输入
        display.innerHTML = highlightText(state.keywordTracker.processedCopy);
    } else {
        // 没有内容时清空,让 CSS placeholder 显示
        // ✅ 安全: 静态HTML模板，无用户输入
        display.innerHTML = '';
    }
}

/**
 * 高亮文本中的关键词
 */
function highlightText(text) {
    if (!text) return '';
    if (!state.keywordTracker.matchedKeywords || state.keywordTracker.matchedKeywords.length === 0) {
        return escapeHtml(text).replace(/\n/g, '<br>');
    }

    const sortedKw = [...state.keywordTracker.matchedKeywords].sort((a, b) => b.keyword.length - a.keyword.length);
    const pattern = sortedKw.map(item => escapeRegex(item.keyword)).join('|');
    const regex = new RegExp(`(${pattern})`, 'gi');
    const parts = text.split(regex);

    const htmlParts = parts.map((part, index) => {
        if (index % 2 === 1) {
            const lowerKw = part.toLowerCase();
            return `<span class="keyword-bold highlightable" data-kw="${escapeAttr(lowerKw)}">${escapeHtml(part)}</span>`;
        } else {
            return escapeHtml(part);
        }
    });

    return htmlParts.join('').replace(/\n/g, '<br>');
}

/**
 * 渲染浮动关键词窗口
 */
function renderFloatingKeywords() {
    const matchedContainer = document.getElementById('kt-matched-keywords');
    const unmatchedContainer = document.getElementById('kt-unmatched-keywords');

    if (matchedContainer && state.keywordTracker.matchedKeywords) {
        matchedContainer.innerHTML = state.keywordTracker.matchedKeywords.map(item => `
            <div class="bg-green-50 border border-green-200 rounded p-2 flex justify-between items-center cursor-pointer hover:bg-green-100 transition-colors"
                 onclick="window.kt_locateKeyword('${escapeAttr(item.keyword)}')">
                <span class="text-sm text-green-800 font-medium">${escapeHtml(item.keyword)}</span>
                <span class="text-xs bg-green-200 text-green-800 px-1.5 rounded-full">${item.count}</span>
            </div>
        `).join('');
    }

    if (unmatchedContainer && state.keywordTracker.unmatchedKeywords) {
        unmatchedContainer.innerHTML = state.keywordTracker.unmatchedKeywords.map(kw => `
            <div class="bg-red-50 border border-red-200 rounded p-2 text-sm text-red-800">
                ${escapeHtml(kw)}
            </div>
        `).join('');
    }

    // 更新标签计数
    const matchedCount = document.getElementById('kt-tab-matched-count');
    if (matchedCount && state.keywordTracker.matchedKeywords) {
        matchedCount.textContent = state.keywordTracker.matchedKeywords.length;
    }

    const unmatchedCount = document.getElementById('kt-tab-unmatched-count');
    if (unmatchedCount && state.keywordTracker.unmatchedKeywords) {
        unmatchedCount.textContent = state.keywordTracker.unmatchedKeywords.length;
    }
}

/**
 * 更新最小化徽章
 */
function updateMinimizedBadge() {
    const badge = document.getElementById('kt-minimized-badge');
    if (badge && state.keywordTracker.matchedKeywords) {
        badge.textContent = state.keywordTracker.matchedKeywords.length;
    }
}

// ========================================== 
// Action Functions
// ========================================== 

/**
 * 同步到输入模块
 */
function syncToInput() {
    const display = document.getElementById('kt-copy-display');
    const text = display ? display.innerText : '';

    // 保存到 state
    if (text) {
        state.keywordTracker.processedCopy = text;
        state.keywordTracker.copyInputText = text;
    }

    // 切换到输入模块
    if (window.switchTab) {
        window.switchTab('kw_input');
    }

    showToast("已同步");
}

/**
 * AI 沉浸式翻译
 */
async function translateCopyImmersive() {
    const btn = document.getElementById('kt-translate-btn');
    const progress = document.getElementById('kt-translate-progress');
    const btnText = document.getElementById('kt-translate-btn-text');

    if (btn) btn.disabled = true;
    if (progress) {
        progress.classList.remove('hidden');
        progress.style.width = '30%';
    }
    if (btnText) btnText.textContent = "正在翻译...";

    try {
        const response = await KeywordService.fetchImmersionTranslation(state.keywordTracker.processedCopy);

        const transLines = response.split(/\n+/).filter(t => t.trim());
        state.keywordTracker.paragraphs = state.keywordTracker.processedCopy.split(/\n+/).filter(t => t.trim()).map((original, i) => ({
            original,
            translation: transLines[i] || ""
        }));

        state.keywordTracker.translationMode = true;

        renderProcessModule();

        if (progress) progress.style.width = '100%';
        addTimeout(() => progress?.classList.add('hidden'), 500);

    } catch (e) {
        ErrorService.handle(e, { action: 'translateCopyImmersive', module: 'keywordTracker' });
        if (progress) progress.classList.add('hidden');
        if (btnText) btnText.textContent = "AI 沉浸式翻译";
        if (btn) btn.disabled = false;
    }
}

/**
 * 切换关键词标签
 */
function showKeywordTab(type) {
    const mBtn = document.getElementById('kt-kw-tab-matched');
    const uBtn = document.getElementById('kt-kw-tab-unmatched');
    const mDiv = document.getElementById('kt-matched-keywords');
    const uDiv = document.getElementById('kt-unmatched-keywords');

    if (!mBtn || !uBtn) return;

    if (type === 'matched') {
        mBtn.className = "flex-1 py-2 text-sm font-medium bg-green-100 text-green-700 shadow-sm rounded-lg smooth-transition";
        uBtn.className = "flex-1 py-2 text-sm font-medium text-slate-500 hover:text-red-600 rounded-lg smooth-transition";
        mDiv?.classList.remove('hidden');
        uDiv?.classList.add('hidden');
    } else {
        uBtn.className = "flex-1 py-2 text-sm font-medium bg-red-100 text-red-700 shadow-sm rounded-lg smooth-transition";
        mBtn.className = "flex-1 py-2 text-sm font-medium text-slate-500 hover:text-green-600 rounded-lg smooth-transition";
        uDiv?.classList.remove('hidden');
        mDiv?.classList.add('hidden');
    }
}

/**
 * 定位关键词在文案中的位置
 */
function locateKeywordInCopy(keyword) {
    const container = document.getElementById('kt-copy-display');
    if (!container) return;
    const targetKw = keyword.toLowerCase();

    let spans = Array.from(container.querySelectorAll(`.highlightable`)).filter(el =>
        el.getAttribute('data-kw') === targetKw
    );

    if (spans.length === 0) {
        spans = Array.from(container.querySelectorAll(`.highlightable`)).filter(el => {
            const elKw = el.getAttribute('data-kw');
            return elKw && elKw.includes(targetKw);
        });
    }

    if (spans.length === 0) {
        showToast(`未找到关键词: ${keyword}`, 'warning');
        return;
    }

    if (!state.keywordTracker.keywordLocationIndex) {
        state.keywordTracker.keywordLocationIndex = {};
    }
    let idx = state.keywordTracker.keywordLocationIndex[targetKw] || 0;
    if (idx >= spans.length) idx = 0;

    container.querySelectorAll('.highlight-focus').forEach(el => el.classList.remove('highlight-focus'));

    const targetSpan = spans[idx];
    targetSpan.classList.add('highlight-focus');

    targetSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });

    state.keywordTracker.keywordLocationIndex[targetKw] = (idx + 1) % spans.length;

    showToast(`定位: ${keyword} (${idx + 1}/${spans.length})`);
}

/**
 * 最小化关键词窗口
 */
function minimizeKeywordsWindow() {
    const floatWinEl = document.getElementById('kt-keywords-floating');
    const minBtn = document.getElementById('kt-keywords-minimized');

    if (floatWinEl) {
        floatWinEl.classList.add('opacity-0', 'scale-95');
        addTimeout(() => {
            floatWinEl.classList.remove('show');
            floatWinEl.classList.remove('opacity-0', 'scale-95');

            if (minBtn) {
                minBtn.classList.add('show');
                state.keywordTracker.isWindowMinimized = true;
            }
        }, 200);
    }
}

/**
 * 恢复关键词窗口
 */
function restoreKeywordsWindow() {
    const floatWinEl = document.getElementById('kt-keywords-floating');
    const minBtn = document.getElementById('kt-keywords-minimized');

    if (minBtn) minBtn.classList.remove('show');
    if (floatWinEl) {
        floatWinEl.classList.add('show');
        floatWinEl.classList.add('opacity-0', 'scale-95');
        requestAnimationFrame(() => {
            floatWinEl.classList.remove('opacity-0', 'scale-95');
            floatWinEl.classList.add('transition-all', 'duration-200');
        });
    }

    state.keywordTracker.isWindowMinimized = false;
}

// ========================================== 
// Floating Window Management
// ========================================== 

/**
 * 设置浮动窗口拖拽功能
 */
function setupFloatingWindow() {
    const el = document.getElementById('kt-keywords-floating');
    if (!el) return;
    const header = el.querySelector('.floating-header');
    if (!header) return;

    addEventListener(header, 'mousedown', (e) => {
        floatWinState.isDragging = true;
        floatWinState.offsetX = e.clientX - el.getBoundingClientRect().left;
        floatWinState.offsetY = e.clientY - el.getBoundingClientRect().top;

        el.style.opacity = '0.9';
        el.style.transition = 'none';
        e.preventDefault();
    });

    addEventListener(document, 'mousemove', (e) => {
        if (!floatWinState.isDragging) return;

        let newX = e.clientX - floatWinState.offsetX;
        let newY = e.clientY - floatWinState.offsetY;

        const maxX = window.innerWidth - el.offsetWidth;
        const maxY = window.innerHeight - el.offsetHeight;

        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));

        el.style.left = newX + 'px';
        el.style.top = newY + 'px';
        el.style.right = 'auto';
    });

    addEventListener(document, 'mouseup', () => {
        if (!floatWinState.isDragging) return;
        floatWinState.isDragging = false;

        el.style.opacity = '1';
        el.style.transition = 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';

        const rect = el.getBoundingClientRect();
        const screenWidth = window.innerWidth;
        const threshold = 100;

        // 修改: 优先吸附到右侧，避免遮挡左侧边栏
        if (rect.right > screenWidth - threshold) {
            el.style.left = (screenWidth - rect.width - 20) + 'px';
        } else if (rect.left < threshold) {
            el.style.left = '20px';
        }
    });
}

/**
 * 管理浮动窗口的显示/隐藏
 */
function manageFloatingWindowVisibility() {
    const floatWin = document.getElementById('kt-keywords-floating');
    const minBtn = document.getElementById('kt-keywords-minimized');

    if (!floatWin || !minBtn) return;

    // 确保状态初始化
    if (state.keywordTracker.isWindowMinimized === undefined) {
        state.keywordTracker.isWindowMinimized = false;
    }

    // 只有在有分析数据时才显示浮动窗口
    const hasAnalysisData = state.keywordTracker.matchedKeywords && 
                           state.keywordTracker.matchedKeywords.length > 0;

    if (!hasAnalysisData) {
        // 没有数据时隐藏浮动窗口和最小化按钮
        floatWin.classList.remove('show');
        minBtn.classList.remove('show');
        return;
    }

    // Process 模块显示浮动窗口
    if (state.keywordTracker.isWindowMinimized) {
        floatWin.classList.remove('show');
        minBtn.classList.add('show');
    } else {
        floatWin.classList.add('show');
        minBtn.classList.remove('show');
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

    // 翻译显示复选框
    const checkTrans = document.getElementById('kt-show-translation');
    if (checkTrans) {
        addEventListener(checkTrans, 'change', () => {
            saveProcessStateToState();
            renderCopyDisplay();
        });
    }

    // 设置浮动窗口拖拽
    setupFloatingWindow();
}

// ========================================== 
// Module Exports (统一架构接口)
// ========================================== 

/**
 * 挂载子模块
 * @param {HTMLElement} container - 容器元素
 */
export async function mount(container) {
    console.log('[Process] 🔧 开始挂载子模块');

    try {
        // 1. 加载模板
        const html = await loadTemplate('src/modules/app_center/views/keyword_hunter/process/template.html');
        // ✅ 安全: 静态HTML模板，无用户输入
        container.innerHTML = html;

        // 2. 将浮动窗口移到 body 级别(避免被容器限制)
        const floatWin = document.getElementById('kt-keywords-floating');
        const minBtn = document.getElementById('kt-keywords-minimized');
        
        // 如果浮动窗口不在 body 中，则移动到 body
        if (floatWin && floatWin.parentElement !== document.body) {
            document.body.appendChild(floatWin);
        }
        if (minBtn && minBtn.parentElement !== document.body) {
            document.body.appendChild(minBtn);
        }

        // 3. 注册全局操作（用于 HTML onclick 兼容）
        registeredActionNames = registerActionsWithLegacy({
            kt_syncToInput: () => syncToInput(),
            kt_translateCopyImmersive: () => translateCopyImmersive(),
            kt_showKeywordTab: (type) => showKeywordTab(type),
            kt_locateKeyword: (keyword) => locateKeywordInCopy(keyword),
            kt_minimizeKeywordsWindow: () => minimizeKeywordsWindow(),
            kt_restoreKeywordsWindow: () => restoreKeywordsWindow(),
        });

        // 4. 设置事件监听器
        setupEventListeners(container);

        // 5. 从 state 恢复状态
        restoreProcessStateFromState();

        // 6. 管理浮动窗口显示 - 延迟执行确保 DOM 已渲染
        setTimeout(() => {
            manageFloatingWindowVisibility();
            console.log('[Process] 浮动窗口状态:', {
                hasMatchedKeywords: state.keywordTracker.matchedKeywords?.length > 0,
                isMinimized: state.keywordTracker.isWindowMinimized,
                floatWinExists: !!document.getElementById('kt-keywords-floating'),
                minBtnExists: !!document.getElementById('kt-keywords-minimized'),
                floatWinParent: document.getElementById('kt-keywords-floating')?.parentElement?.tagName
            });
        }, 100);

        console.log('[Process] ✅ 子模块挂载成功');
    } catch (error) {
        console.error('[Process] ❌ 子模块挂载失败:', error);
        throw error;
    }
}

/**
 * 卸载子模块
 */
export function unmount() {
    console.log('[Process] 🔄 开始卸载子模块');

    try {
        // 1. 保存状态到 state
        saveProcessStateToState();

        // 2. 移除浮动窗口和最小化按钮（从 DOM 中完全移除）
        const floatWin = document.getElementById('kt-keywords-floating');
        const minBtn = document.getElementById('kt-keywords-minimized');
        if (floatWin) {
            floatWin.remove();
        }
        if (minBtn) {
            minBtn.remove();
        }

        // 3. 清理事件监听器和定时器
        cleanup();

        console.log('[Process] ✅ 子模块卸载成功');
    } catch (error) {
        console.error('[Process] ❌ 子模块卸载失败:', error);
    }
}

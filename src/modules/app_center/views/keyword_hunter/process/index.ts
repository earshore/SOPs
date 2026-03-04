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

import { SafeModuleLoader } from '../../../../../common/infrastructure/SafeModuleLoader';
import { SafeRenderer } from '../../../../../common/infrastructure/SafeRenderer';
import { showToast } from '../../../../../common/ui';
import * as KeywordService from '../services/trackerService';
import { appStore } from '../../../../../stores/useAppStore';
import { ErrorService } from '../../../../../services/errorService';
import { registerActionsWithLegacy, unregisterActions } from '../../../../../common/utils/actionRegistry';

import { Logger } from '../../../../../services/loggerService';
import '../keyword_hunter_style.css';

// ========================================== 
// Module State
// ========================================== 

interface EventListenerRecord {
    element: HTMLElement | Document;
    event: string;
    handler: EventListenerOrEventListenerObject;
}

interface FloatWinState {
    isDragging: boolean;
    offsetX: number;
    offsetY: number;
}

let eventListeners: EventListenerRecord[] = []; // 用于清理事件监听器
let timeouts: number[] = []; // 用于清理定时器
let registeredActionNames: string[] = []; // 用于清理已注册的动作
let floatWinState: FloatWinState = {
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
function addEventListener(element: HTMLElement | Document, event: string, handler: EventListenerOrEventListenerObject): void {
    element.addEventListener(event, handler);
    eventListeners.push({ element, event, handler });
}

/**
 * 添加定时器（带自动清理）
 */
function addTimeout(callback: () => void, delay: number): number {
    const id = window.setTimeout(callback, delay);
    timeouts.push(id);
    return id;
}

/**
 * 清理所有事件监听器和定时器
 */
function cleanup(): void {
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
        unregisterActions(registeredActionNames);
        Logger.debug(`[Process] 已清理 ${registeredActionNames.length} 个动作`);
        registeredActionNames = [];
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
function escapeHtml(text: string): string {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 属性转义（完善版：覆盖所有 HTML 属性危险字符）
 */
function escapeAttr(text: string): string {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}


/**
 * 正则表达式转义
 */
function escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ========================================== 
// State Management
// ========================================== 

/**
 * 保存处理状态到 state
 */
function saveProcessStateToState(): void {
    const currentState = appStore.getState();
    if (!currentState.keywordTracker) {
        currentState.updateKeywordTracker({
            keywords: [],
            processedCopy: '',
            formattedCopy: '',
            matchedKeywords: [],
            unmatchedKeywords: [],
            wordFrequency: [],
            paragraphs: [],
            translationMode: false,
            keywordLocationIndex: {},
            settings: {
                matchPlural: false,
                matchStem: false,
                matchCase: false,
                matchPartial: false
            },
            isWindowMinimized: false
        });
    }

    // 保存文案显示内容
    const displayEl = document.getElementById('kt-copy-display');
    if (displayEl) {
        appStore.getState().setProcessedCopy(displayEl.innerText);
    }

    // 保存翻译显示状态
    const showTransCheckbox = document.getElementById('kt-show-translation') as HTMLInputElement | null;
    if (showTransCheckbox) {
        appStore.getState().updateKeywordTracker({ showTranslation: showTransCheckbox.checked });
    }
}

/**
 * 从 state 恢复处理状态
 */
function restoreProcessStateFromState(): void {
    // 恢复翻译显示状态
    const showTransCheckbox = document.getElementById('kt-show-translation') as HTMLInputElement | null;
    const currentState = appStore.getState();
    if (showTransCheckbox && currentState.keywordTracker) {
        if (currentState.keywordTracker.showTranslation !== undefined) {
            showTransCheckbox.checked = currentState.keywordTracker.showTranslation;
        }

        // 根据是否有翻译数据启用/禁用复选框
        const hasTranslationData = appStore.getState().keywordTracker.paragraphs && appStore.getState().keywordTracker.paragraphs.length > 0;
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
function renderProcessModule(): void {
    updateTranslateButton();
    renderCopyDisplay();
    renderFloatingKeywords();
    updateMinimizedBadge();
    renderAnalysisStats(); // 新增：渲染统计数据
}

/**
 * 渲染分析统计数据（从 analysis 模块移动过来）
 */
function renderAnalysisStats(): void {
    const currentState = appStore.getState();
    if (!currentState.keywordTracker) {
        currentState.updateKeywordTracker({
            keywords: [],
            processedCopy: '',
            formattedCopy: '',
            matchedKeywords: [],
            unmatchedKeywords: [],
            wordFrequency: [],
            paragraphs: [],
            translationMode: false,
            keywordLocationIndex: {},
            settings: {
                matchPlural: false,
                matchStem: false,
                matchCase: false,
                matchPartial: false
            },
            isWindowMinimized: false
        });
    }

    const total = appStore.getState().keywordTracker.keywords ? appStore.getState().keywordTracker.keywords.length : 0;
    const matched = appStore.getState().keywordTracker.matchedKeywords ? appStore.getState().keywordTracker.matchedKeywords.length : 0;
    const rate = total === 0 ? 0 : Math.round((matched / total) * 100);

    // 更新覆盖率
    const rateEl = document.getElementById('kt-coverage-rate');
    if (rateEl) rateEl.textContent = rate + '%';

    const barEl = document.getElementById('kt-coverage-bar') as HTMLElement | null;
    if (barEl) barEl.style.width = rate + '%';

    // 更新统计数据
    const matchedEl = document.getElementById('kt-stat-matched');
    if (matchedEl) matchedEl.textContent = matched.toString();

    const unmatchedEl = document.getElementById('kt-stat-unmatched');
    if (unmatchedEl) {
        const unmatchedCount = appStore.getState().keywordTracker.unmatchedKeywords ? appStore.getState().keywordTracker.unmatchedKeywords.length : 0;
        unmatchedEl.textContent = unmatchedCount.toString();
    }

    const totalEl = document.getElementById('kt-stat-total');
    if (totalEl) totalEl.textContent = total.toString();

    // 渲染高频词云（带关键词命中标注）
    const freqList = document.getElementById('kt-word-frequency-list');
    if (freqList && appStore.getState().keywordTracker.wordFrequency) {
        // 构建已匹配关键词的词根集合
        const matchedKeywordRoots = new Set<string>();
        if (appStore.getState().keywordTracker.matchedKeywords && appStore.getState().keywordTracker.matchedKeywords.length > 0) {
            appStore.getState().keywordTracker.matchedKeywords.forEach(item => {
                const kw = typeof item === 'object' ? item.keyword : item;
                if (kw) {
                    const words = kw.toLowerCase().match(/[\p{L}\p{M}]+/gu) || [];
                    words.forEach((w: string) => {
                        if (w.length > 2) {
                            matchedKeywordRoots.add(w);
                        }
                    });
                }
            });
        }

        // 构建未匹配关键词的词根集合
        const unmatchedKeywordRoots = new Set<string>();
        const highFreqWordsSet = new Set(appStore.getState().keywordTracker.wordFrequency.map(([w]) => w.toLowerCase()));

        if (appStore.getState().keywordTracker.unmatchedKeywords && appStore.getState().keywordTracker.unmatchedKeywords.length > 0) {
            appStore.getState().keywordTracker.unmatchedKeywords.forEach(kw => {
                if (kw) {
                    const words = kw.toLowerCase().match(/[\p{L}\p{M}]+/gu) || [];
                    words.forEach((w: string) => {
                        if (w.length > 2 && !highFreqWordsSet.has(w)) {
                            unmatchedKeywordRoots.add(w);
                        }
                    });
                }
            });
        }

        Logger.debug('[Process] 已匹配词根:', Array.from(matchedKeywordRoots));
        Logger.debug('[Process] 未匹配词根:', Array.from(unmatchedKeywordRoots));

        // 清空容器
        freqList.innerHTML = '';

        // 渲染高频词云
        const wordCloudDiv = document.createElement('div');
        wordCloudDiv.className = 'flex flex-wrap gap-3';
        const wordFragment = document.createDocumentFragment();

        appStore.getState().keywordTracker.wordFrequency.forEach(([w, c]: [string, number]) => {
            const span = document.createElement('span');
            const isMatched = matchedKeywordRoots.has(w.toLowerCase());

            if (isMatched) {
                span.className = 'px-2 py-1 bg-green-100 text-green-700 text-xs rounded-md flex items-center gap-1';
                const checkIcon = document.createElement('span');
                checkIcon.className = 'font-bold';
                checkIcon.textContent = '✓';
                span.appendChild(checkIcon);
                span.appendChild(document.createTextNode(` ${w} `));
                const countSpan = document.createElement('span');
                countSpan.className = 'opacity-60';
                countSpan.textContent = `(${c})`;
                span.appendChild(countSpan);
            } else {
                span.className = 'px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md';
                span.textContent = `${w} `;
                const countSpan = document.createElement('span');
                countSpan.className = 'text-slate-400';
                countSpan.textContent = `(${c})`;
                span.appendChild(countSpan);
            }

            wordFragment.appendChild(span);
        });

        wordCloudDiv.appendChild(wordFragment);
        freqList.appendChild(wordCloudDiv);

        // 如果有未命中的词根，在下方单独展示
        if (unmatchedKeywordRoots.size > 0) {
            const unmatchedRootsArray = Array.from(unmatchedKeywordRoots).sort();
            Logger.debug('[Process] 准备渲染未匹配词根:', unmatchedRootsArray);

            const unmatchedSection = document.createElement('div');
            unmatchedSection.className = 'mt-4 pt-4 border-t border-slate-200';

            const header = document.createElement('div');
            header.className = 'text-xs text-slate-500 mb-2 font-medium flex items-center gap-2';
            const icon = document.createElement('i');
            icon.className = 'fas fa-exclamation-triangle text-red-500';
            header.appendChild(icon);
            const headerText = document.createElement('span');
            headerText.textContent = `未在文案中出现的关键词词根 (${unmatchedRootsArray.length})`;
            header.appendChild(headerText);
            unmatchedSection.appendChild(header);

            const rootsContainer = document.createElement('div');
            rootsContainer.className = 'flex flex-wrap gap-2';
            const rootsFragment = document.createDocumentFragment();

            unmatchedRootsArray.forEach((root: string) => {
                const span = document.createElement('span');
                span.className = 'px-2 py-1 bg-red-100 text-red-700 text-xs rounded-md inline-flex items-center gap-1 cursor-pointer hover:bg-red-200 transition-colors';
                span.title = '点击在关键词监控中定位';
                span.onclick = () => (window as any).kt_locateUnmatchedRoot(root);

                const icon = document.createElement('span');
                icon.className = 'font-bold';
                icon.textContent = '✗';
                span.appendChild(icon);

                const text = document.createElement('span');
                text.textContent = root;
                span.appendChild(text);

                rootsFragment.appendChild(span);
            });

            rootsContainer.appendChild(rootsFragment);
            unmatchedSection.appendChild(rootsContainer);
            freqList.appendChild(unmatchedSection);
        } else {
            Logger.debug('[Process] 没有未匹配词根需要显示');
        }
    }
}

/**
 * 更新翻译按钮状态
 */
function updateTranslateButton(): void {
    const transBtn = document.getElementById('kt-translate-btn') as HTMLButtonElement | null;
    const transBtnText = document.getElementById('kt-translate-btn-text');
    const transCheckbox = document.getElementById('kt-show-translation') as HTMLInputElement | null;

    const hasContent = appStore.getState().keywordTracker.processedCopy && appStore.getState().keywordTracker.processedCopy.trim().length > 0;
    const hasTranslationData = appStore.getState().keywordTracker.paragraphs && appStore.getState().keywordTracker.paragraphs.length > 0;

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
            if (appStore.getState().keywordTracker.translationMode) {
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
function renderCopyDisplay(): void {
    const display = document.getElementById('kt-copy-display');
    if (!display) return;

    const renderer = SafeRenderer.getInstance();
    const showTrans = (document.getElementById('kt-show-translation') as HTMLInputElement | null)?.checked;

    // 如果是翻译模式且有翻译数据
    if (appStore.getState().keywordTracker.translationMode && appStore.getState().keywordTracker.paragraphs && appStore.getState().keywordTracker.paragraphs.length > 0) {
        const paragraphs = appStore.getState().keywordTracker.paragraphs
            .filter(p => typeof p === 'object' && 'original' in p)
            .map(p => ({
                original: highlightText(p.original),
                translation: showTrans && p.translation ? p.translation : null
            }));

        // 清空容器
        display.innerHTML = '';
        const fragment = document.createDocumentFragment();

        paragraphs.forEach(para => {
            const div = document.createElement('div');
            div.className = 'mb-4';

            const originalDiv = document.createElement('div');
            originalDiv.className = 'paragraph-original leading-relaxed';
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = para.original;
            while (tempDiv.firstChild) {
                originalDiv.appendChild(tempDiv.firstChild);
            }
            div.appendChild(originalDiv);

            if (para.translation) {
                const transDiv = document.createElement('div');
                transDiv.className = 'sentence-translation';
                transDiv.textContent = para.translation;
                div.appendChild(transDiv);
            }

            fragment.appendChild(div);
        });

        display.appendChild(fragment);
        return;
    }

    // 普通模式：显示高亮的文案
    if (appStore.getState().keywordTracker.processedCopy) {
        const highlighted = highlightText(appStore.getState().keywordTracker.processedCopy);
        renderer.renderTemplate(display, highlighted);
    } else {
        display.innerHTML = '';
    }
}

/**
 * 高亮文本中的关键词
 */
function highlightText(text: string): string {
    if (!text) return '';
    if (!appStore.getState().keywordTracker.matchedKeywords || appStore.getState().keywordTracker.matchedKeywords.length === 0) {
        return escapeHtml(text).replace(/\n/g, '<br>');
    }

    const len = text.length;
    const SEP = '\x01';

    // 为每个字符位置记录它属于哪些关键词
    const charKeywords: Set<string>[] = [];
    for (let i = 0; i < len; i++) {
        charKeywords[i] = new Set();
    }

    // 对每个关键词，找出它在文本中的所有匹配位置
    appStore.getState().keywordTracker.matchedKeywords.forEach(item => {
        const kw = item.keyword;
        const kwLower = kw.toLowerCase();
        const regex = new RegExp(escapeRegex(kw), 'gi');
        let match;
        while ((match = regex.exec(text)) !== null) {
            const start = match.index;
            const end = start + match[0].length;
            for (let i = start; i < end; i++) {
                charKeywords[i]!.add(kwLower);
            }
        }
    });

    // 将文本按照"关键词集合相同的连续字符"分段
    interface Segment {
        text: string;
        keywords: Set<string>;
        isHighlight: boolean;
    }

    const segments: Segment[] = [];
    let segStart = 0;

    for (let i = 1; i <= len; i++) {
        if (i === len || !setsEqual(charKeywords[i]!, charKeywords[i - 1]!)) {
            segments.push({
                text: text.substring(segStart, i),
                keywords: charKeywords[segStart]!,
                isHighlight: charKeywords[segStart]!.size > 0
            });
            segStart = i;
        }
    }

    // 渲染各段，为连续高亮段标记位置
    const htmlParts = segments.map((seg, idx) => {
        if (!seg.isHighlight) {
            return escapeHtml(seg.text);
        }

        const allKw = Array.from(seg.keywords).join(SEP);
        const prevIsHighlight = idx > 0 && segments[idx - 1]!.isHighlight;
        const nextIsHighlight = idx < segments.length - 1 && segments[idx + 1]!.isHighlight;

        // 确定在连续高亮区域中的位置
        let posClass = '';
        if (!prevIsHighlight && !nextIsHighlight) {
            posClass = 'kw-solo';      // 独立段
        } else if (!prevIsHighlight && nextIsHighlight) {
            posClass = 'kw-start';     // 起始段
        } else if (prevIsHighlight && nextIsHighlight) {
            posClass = 'kw-mid';       // 中间段
        } else {
            posClass = 'kw-end';       // 结束段
        }

        return `<span class="keyword-bold highlightable ${posClass}" data-kw-all="${escapeAttr(allKw)}">${escapeHtml(seg.text)}</span>`;
    });

    return htmlParts.join('').replace(/\n/g, '<br>');
}


/**
 * 判断两个 Set 是否相等
 */
function setsEqual(a: Set<string>, b: Set<string>): boolean {
    if (a.size !== b.size) return false;
    for (const item of a) {
        if (!b.has(item)) return false;
    }
    return true;
}

/**
 * 渲染浮动关键词窗口（统一展示已匹配和未匹配）
 */
function renderFloatingKeywords(): void {
    const allContainer = document.getElementById('kt-all-keywords');

    if (!allContainer) return;

    // 合并已匹配和未匹配的关键词
    interface KeywordItem {
        keyword: string;
        count: number;
        matched: boolean;
    }

    const allKeywords: KeywordItem[] = [];

    // 添加已匹配的关键词
    if (appStore.getState().keywordTracker.matchedKeywords && appStore.getState().keywordTracker.matchedKeywords.length > 0) {
        appStore.getState().keywordTracker.matchedKeywords.forEach(item => {
            allKeywords.push({
                keyword: item.keyword,
                count: item.count,
                matched: true
            });
        });
    }

    // 添加未匹配的关键词
    if (appStore.getState().keywordTracker.unmatchedKeywords && appStore.getState().keywordTracker.unmatchedKeywords.length > 0) {
        appStore.getState().keywordTracker.unmatchedKeywords.forEach(kw => {
            allKeywords.push({
                keyword: kw,
                count: 0,
                matched: false
            });
        });
    }

    // 渲染统一列表
    if (allKeywords.length > 0) {
        // 清空容器
        allContainer.innerHTML = '';
        const fragment = document.createDocumentFragment();

        allKeywords.forEach((item: KeywordItem) => {
            const div = document.createElement('div');
            div.className = 'keyword-item';
            div.dataset.keyword = item.keyword.toLowerCase();

            if (item.matched) {
                // 已匹配 - 绿色背景，可点击定位
                div.className += ' bg-green-50 border-l-4 border-green-500 rounded p-2 flex justify-between items-center cursor-pointer hover:bg-green-100 transition-colors shadow-sm';
                div.onclick = () => (window as any).kt_locateKeyword(item.keyword);

                const span = document.createElement('span');
                span.className = 'text-sm text-green-800 font-medium flex items-center gap-2';
                const icon = document.createElement('i');
                icon.className = 'fas fa-check-circle text-green-600';
                span.appendChild(icon);
                span.appendChild(document.createTextNode(item.keyword));

                const badge = document.createElement('span');
                badge.className = 'text-xs bg-green-600 text-white px-2 py-0.5 rounded-full font-semibold';
                badge.textContent = item.count.toString();

                div.appendChild(span);
                div.appendChild(badge);
            } else {
                // 未匹配 - 红色背景
                div.className += ' keyword-unmatched bg-red-50 border-l-4 border-red-500 rounded p-2 flex items-center gap-2 shadow-sm';

                const icon = document.createElement('i');
                icon.className = 'fas fa-times-circle text-red-600';

                const span = document.createElement('span');
                span.className = 'text-sm text-red-800 font-medium';
                span.textContent = item.keyword;

                div.appendChild(icon);
                div.appendChild(span);
            }

            fragment.appendChild(div);
        });

        allContainer.appendChild(fragment);
    } else {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'text-center text-slate-400 py-8';
        const icon = document.createElement('i');
        icon.className = 'fas fa-inbox text-3xl mb-2';
        const text = document.createElement('p');
        text.className = 'text-sm';
        text.textContent = '暂无关键词数据';
        emptyDiv.appendChild(icon);
        emptyDiv.appendChild(text);
        allContainer.innerHTML = '';
        allContainer.appendChild(emptyDiv);
    }

    // 更新计数显示
    const matchedCount = document.getElementById('kt-tab-matched-count');
    if (matchedCount && appStore.getState().keywordTracker.matchedKeywords) {
        matchedCount.textContent = appStore.getState().keywordTracker.matchedKeywords.length.toString();
    }

    const unmatchedCount = document.getElementById('kt-tab-unmatched-count');
    if (unmatchedCount && appStore.getState().keywordTracker.unmatchedKeywords) {
        unmatchedCount.textContent = appStore.getState().keywordTracker.unmatchedKeywords.length.toString();
    }
}

/**
 * 更新最小化徽章
 */
function updateMinimizedBadge(): void {
    const badge = document.getElementById('kt-minimized-badge');
    if (badge && appStore.getState().keywordTracker.matchedKeywords) {
        badge.textContent = appStore.getState().keywordTracker.matchedKeywords.length.toString();
    }
}

// ========================================== 
// Action Functions
// ========================================== 

/**
 * 同步到输入模块
 */
async function syncToInput(): Promise<void> {
    let text = '';

    // 如果是翻译模式，只提取原文
    if (appStore.getState().keywordTracker.translationMode && appStore.getState().keywordTracker.paragraphs && appStore.getState().keywordTracker.paragraphs.length > 0) {
        // 从 paragraphs 中提取所有原文
        text = appStore.getState().keywordTracker.paragraphs
            .map(p => typeof p === 'object' && 'original' in p ? p.original : p)
            .filter(t => t && t.trim())
            .join('\n');

        Logger.debug('[Process] 翻译模式：只同步原文，不包含译文');
    } else {
        // 普通模式：直接获取显示区域的文本
        const display = document.getElementById('kt-copy-display');
        text = display ? display.innerText : '';

        Logger.debug('[Process] 普通模式：同步显示区域文本');
    }

    // 保存到 state
    if (text && text.trim()) {
        appStore.getState().setProcessedCopy(text);
        appStore.getState().updateKeywordTracker({ copyInputText: text });

        Logger.debug('[Process] 同步的文本长度:', text.length);
    } else {
        Logger.warn('[Process] 没有可同步的文本');
        showToast("没有可同步的内容", { type: 'warning' });
        return;
    }

    // 切换到输入模块
    await window.navigateTo('/kw_input');

    showToast("已同步原文到输入模块");
}

/**
 * AI 沉浸式翻译
 */
async function translateCopyImmersive(): Promise<void> {
    const btn = document.getElementById('kt-translate-btn') as HTMLButtonElement | null;
    const progress = document.getElementById('kt-translate-progress') as HTMLElement | null;
    const btnText = document.getElementById('kt-translate-btn-text');

    if (btn) btn.disabled = true;
    if (progress) {
        progress.classList.remove('hidden');
        progress.style.width = '30%';
    }
    if (btnText) btnText.textContent = "正在翻译...";

    try {
        const response = await KeywordService.fetchImmersionTranslation(appStore.getState().keywordTracker.processedCopy);

        const transLines = response.split(/\n+/).filter(t => t.trim());
        appStore.getState().keywordTracker.paragraphs = appStore.getState().keywordTracker.processedCopy.split(/\n+/).filter(t => t.trim()).map((original, i) => ({
            original,
            translation: transLines[i] || ""
        }));

        appStore.getState().setTranslationMode(true);

        renderProcessModule();

        if (progress) progress.style.width = '100%';
        addTimeout(() => progress?.classList.add('hidden'), 500);

    } catch (e) {
        ErrorService.handle(e as Error, { action: 'translateCopyImmersive', module: 'keywordTracker' });
        if (progress) progress.classList.add('hidden');
        if (btnText) btnText.textContent = "AI 沉浸式翻译";
        if (btn) btn.disabled = false;
    }
}

/**
 * 定位关键词在文案中的位置
 */
function locateKeywordInCopy(keyword: string): void {
    const container = document.getElementById('kt-copy-display');
    if (!container) return;
    const targetKw = keyword.toLowerCase();
    const SEP = '\x01';

    // 查找所有 data-kw-all 中包含目标关键词的 span
    const allSpans = Array.from(container.querySelectorAll('.highlightable'));
    const spans = allSpans.filter(el => {
        const kwAll = el.getAttribute('data-kw-all');
        if (!kwAll) return false;
        const kwList = kwAll.split(SEP);
        return kwList.includes(targetKw);
    });

    if (spans.length === 0) {
        showToast(`未找到关键词: ${keyword}`, { type: 'warning' });
        return;
    }

    // 将属于同一次匹配的连续 span 分组
    // 只有 DOM 中直接相邻（nextSibling）才视为同一组
    const groups: Element[][] = [];
    let currentGroup = [spans[0]!];

    for (let i = 1; i < spans.length; i++) {
        const prev = spans[i - 1]!;
        const curr = spans[i]!;
        // 修复：只用 nextSibling，不用 nextElementSibling
        // nextElementSibling 会跳过文本节点导致误判
        if (prev.nextSibling === curr) {
            currentGroup.push(curr);
        } else {
            groups.push(currentGroup);
            currentGroup = [curr];
        }
    }
    groups.push(currentGroup);

    // 管理循环定位索引
    if (!appStore.getState().keywordTracker.keywordLocationIndex) {
        appStore.getState().updateKeywordTracker({ keywordLocationIndex: {} });
    }
    let idx = appStore.getState().keywordTracker.keywordLocationIndex[targetKw] as number || 0;
    if (idx >= groups.length) idx = 0;

    // 移除之前的聚焦高亮
    container.querySelectorAll('.highlight-focus').forEach(el =>
        el.classList.remove('highlight-focus')
    );

    // 聚焦当前组的所有 span
    const targetGroup = groups[idx]!;
    targetGroup.forEach((span: Element) => {
        (span as HTMLElement).classList.add('highlight-focus');
    });

    // 滚动到第一个 span
    (targetGroup[0] as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });

    // 更新索引
    appStore.getState().keywordTracker.keywordLocationIndex[targetKw] = (idx + 1) % groups.length;

    showToast(`定位: ${keyword} (${idx + 1}/${groups.length})`);
}

/**
 * 定位未匹配词根在关键词监控列表中的位置
 * 点击词根后，在浮动窗口中高亮显示所有包含该词根的未匹配关键词
 */
function locateUnmatchedRootInList(root: string): void {
    const floatWin = document.getElementById('kt-keywords-floating');
    const allKeywordsContainer = document.getElementById('kt-all-keywords');

    if (!allKeywordsContainer) {
        Logger.error('[Process] 未找到关键词容器');
        return;
    }

    // 确保浮动窗口可见
    if (!floatWin || !floatWin.classList.contains('show')) {
        restoreKeywordsWindow();
        // 等待窗口显示动画完成
        addTimeout(() => highlightRootKeywords(root, allKeywordsContainer), 300);
    } else {
        highlightRootKeywords(root, allKeywordsContainer);
    }
}

/**
 * 高亮包含指定词根的关键词
 */
function highlightRootKeywords(root: string, container: HTMLElement): void {
    // 移除之前的高亮
    const previousHighlights = container.querySelectorAll('.keyword-root-highlight');
    Logger.debug('[Process] 移除之前的高亮数量:', previousHighlights.length);
    previousHighlights.forEach(el => el.classList.remove('keyword-root-highlight'));

    const rootLower = root.toLowerCase();
    Logger.debug('[Process] 查找词根:', rootLower);

    // 查找所有未匹配的关键词元素
    const unmatchedKeywordDivs = container.querySelectorAll('.keyword-unmatched');
    Logger.debug('[Process] 找到未匹配关键词元素数量:', unmatchedKeywordDivs.length);

    const matchedDivs: Element[] = [];

    unmatchedKeywordDivs.forEach((div, index) => {
        const keyword = div.getAttribute('data-keyword');
        Logger.debug(`[Process] 检查第${index + 1}个关键词:`, keyword);

        if (!keyword) {
            Logger.warn('[Process] 关键词为空，跳过');
            return;
        }

        // 将关键词拆分为单词进行匹配
        const words = keyword.match(/[\p{L}\p{M}]+/gu) || [];
        Logger.debug('[Process] 拆分的单词:', words);

        const hasRoot = words.some(w => {
            const wordLower = w.toLowerCase();
            const matched = wordLower === rootLower || wordLower.includes(rootLower);
            if (matched) {
                Logger.debug(`[Process] 词根匹配成功: ${w} 包含 ${rootLower}`);
            }
            return matched;
        });

        if (hasRoot) {
            Logger.debug('[Process] ✓ 匹配到关键词:', keyword);
            div.classList.add('keyword-root-highlight');
            Logger.debug('[Process] 已添加高亮类，当前类列表:', div.className);
            matchedDivs.push(div);
        }
    });

    Logger.debug('[Process] 总共匹配到的关键词数量:', matchedDivs.length);

    if (matchedDivs.length === 0) {
        Logger.warn('[Process] 未找到包含词根的关键词');
        showToast(`未找到包含词根 "${root}" 的关键词`, { type: 'warning' });
        return;
    }

    // 滚动到第一个匹配的关键词
    Logger.debug('[Process] 滚动到第一个匹配的关键词');
    matchedDivs[0]!.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // 显示提示
    showToast(`找到 ${matchedDivs.length} 个包含 "${root}" 的关键词`);

    // 3秒后移除高亮效果
    addTimeout(() => {
        Logger.debug('[Process] 3秒后移除高亮效果');
        matchedDivs.forEach(div => div.classList.remove('keyword-root-highlight'));
    }, 3000);
}

/**
 * 最小化关键词窗口
 */
function minimizeKeywordsWindow(): void {
    const floatWinEl = document.getElementById('kt-keywords-floating');
    const minBtn = document.getElementById('kt-keywords-minimized');

    if (floatWinEl) {
        floatWinEl.classList.add('opacity-0', 'scale-95');
        addTimeout(() => {
            floatWinEl.classList.remove('show');
            floatWinEl.classList.remove('opacity-0', 'scale-95');

            if (minBtn) {
                minBtn.classList.add('show');
                appStore.getState().updateKeywordTracker({ isWindowMinimized: true });
            }
        }, 200);
    }
}

/**
 * 恢复关键词窗口
 */
function restoreKeywordsWindow(): void {
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

    appStore.getState().updateKeywordTracker({ isWindowMinimized: false });
}

// ========================================== 
// Floating Window Management
// ========================================== 

/**
 * 设置浮动窗口拖拽功能
 */
function setupFloatingWindow(): void {
    const el = document.getElementById('kt-keywords-floating') as HTMLElement | null;
    if (!el) return;
    const header = el.querySelector('.floating-header') as HTMLElement | null;
    if (!header) return;

    addEventListener(header, 'mousedown', (e: Event) => {
        const mouseEvent = e as MouseEvent;
        floatWinState.isDragging = true;
        floatWinState.offsetX = mouseEvent.clientX - el.getBoundingClientRect().left;
        floatWinState.offsetY = mouseEvent.clientY - el.getBoundingClientRect().top;

        el.style.opacity = '0.9';
        el.style.transition = 'none';
        mouseEvent.preventDefault();
    });

    addEventListener(document, 'mousemove', (e: Event) => {
        const mouseEvent = e as MouseEvent;
        if (!floatWinState.isDragging) return;

        let newX = mouseEvent.clientX - floatWinState.offsetX;
        let newY = mouseEvent.clientY - floatWinState.offsetY;

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
function manageFloatingWindowVisibility(): void {
    const floatWin = document.getElementById('kt-keywords-floating');
    const minBtn = document.getElementById('kt-keywords-minimized');

    if (!floatWin || !minBtn) return;

    // 确保状态初始化
    if (appStore.getState().keywordTracker.isWindowMinimized === undefined) {
        appStore.getState().updateKeywordTracker({ isWindowMinimized: false });
    }

    // 只有在有分析数据时才显示浮动窗口
    const hasAnalysisData = appStore.getState().keywordTracker.matchedKeywords &&
        appStore.getState().keywordTracker.matchedKeywords.length > 0;

    if (!hasAnalysisData) {
        // 没有数据时隐藏浮动窗口和最小化按钮
        floatWin.classList.remove('show');
        minBtn.classList.remove('show');
        return;
    }

    // Process 模块显示浮动窗口
    if (appStore.getState().keywordTracker.isWindowMinimized) {
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
function setupEventListeners(container: HTMLElement): void {
    if (!container) return;

    // 翻译显示复选框
    const checkTrans = document.getElementById('kt-show-translation') as HTMLInputElement | null;
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
export async function mount(container: HTMLElement): Promise<void> {
    Logger.debug('[Process] 🔧 开始挂载子模块');

    try {
        // 1. 使用 SafeModuleLoader 加载模板
        const loader = SafeModuleLoader.getInstance();
        const renderer = SafeRenderer.getInstance();

        const html = await loader.loadTemplate(
            'src/modules/app_center/views/keyword_hunter/process/template.html',
            {
                retryCount: 3,
                timeout: 5000,
                onError: (error) => {
                    Logger.error('[Process] 模板加载失败:', error);
                }
            }
        );

        // 使用 SafeRenderer 渲染模板
        // 添加淡入动画（在渲染前添加）
        container.classList.add('fade-in');
        renderer.renderTemplate(container, html);

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
            kt_locateKeyword: (params: string | Record<string, unknown>) => {
                const keyword = typeof params === 'string' ? params : (params.param as string || params.keyword as string || '');
                return locateKeywordInCopy(keyword);
            },
            kt_locateUnmatchedRoot: (params: string | Record<string, unknown>) => {
                const root = typeof params === 'string' ? params : (params.param as string || params.root as string || '');
                return locateUnmatchedRootInList(root);
            },
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
            Logger.debug('[Process] 浮动窗口状态:', {
                hasMatchedKeywords: appStore.getState().keywordTracker.matchedKeywords?.length > 0,
                isMinimized: appStore.getState().keywordTracker.isWindowMinimized,
                floatWinExists: !!document.getElementById('kt-keywords-floating'),
                minBtnExists: !!document.getElementById('kt-keywords-minimized'),
                floatWinParent: document.getElementById('kt-keywords-floating')?.parentElement?.tagName
            });
        }, 100);

        Logger.debug('[Process] ✅ 子模块挂载成功');
    } catch (error) {
        Logger.error('[Process] ❌ 子模块挂载失败:', error);
        throw error;
    }
}

/**
 * 卸载子模块
 */
export function unmount(): void {
    Logger.debug('[Process] 🔄 开始卸载子模块');

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

        Logger.debug('[Process] ✅ 子模块卸载成功');
    } catch (error) {
        Logger.error('[Process] ❌ 子模块卸载失败:', error);
    }
}

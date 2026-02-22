/**
 * Input 子模块
 * 负责关键词和文案的输入功能
 * 
 * 架构说明：
 * - 状态保存到 state.keywordTracker 命名空间
 * - 通过 EventBus 与其他模块通信
 * - 使用 registerActionsWithLegacy 注册全局操作
 */

import { SafeModuleLoader } from '../../../../../common/infrastructure/SafeModuleLoader';
import { SafeRenderer } from '../../../../../common/infrastructure/SafeRenderer';
import { showToast, showProgress } from '../../../../../common/ui';
import * as KeywordService from '../services/trackerService';
import state from "../../../../../common/state";
import { registerActionsWithLegacy, unregisterActions } from '../../../../../common/utils/actionRegistry';

import '../keyword_hunter_style.css';

// ========================================== 
// Module State
// ========================================== 

interface EventListenerRecord {
    element: HTMLElement | Document;
    event: string;
    handler: EventListenerOrEventListenerObject;
}

let eventListeners: EventListenerRecord[] = []; // 用于清理事件监听器
let timeouts: number[] = []; // 用于清理定时器
let debouncedInputHandler: ((...args: unknown[]) => void) | null = null; // Debounced function reference
let registeredActions: string[] = []; // 用于清理已注册的动作

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

    // 清理 debounced handler
    debouncedInputHandler = null;
    
    // 清理已注册的动作
    if (registeredActions.length > 0) {
        unregisterActions(registeredActions);
        console.log(`[Input] 已清理 ${registeredActions.length} 个动作`);
        registeredActions = [];
    }
}

/**
 * Debounce 函数
 */
function debounce<T extends (...args: unknown[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
    let timeout: number;
    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = addTimeout(() => func.apply(null, args), wait);
    };
}

// ========================================== 
// State Management
// ========================================== 

/**
 * 保存输入到 state
 */
function saveInputsToState(): void {
    const kwInput = document.getElementById('kt-keywords-input') as HTMLTextAreaElement | null;
    const copyInput = document.getElementById('kt-copy-input') as HTMLTextAreaElement | null;

    if (!state.keywordTracker) {
        state.keywordTracker = {
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
        };
    }

    if (kwInput) {
        state.keywordTracker.keywordsInputText = kwInput.value;
    }
    if (copyInput) {
        state.keywordTracker.copyInputText = copyInput.value;
    }
}

/**
 * 从 state 恢复输入
 */
function restoreInputsFromState(): void {
    const kwInput = document.getElementById('kt-keywords-input') as HTMLTextAreaElement | null;
    const copyInput = document.getElementById('kt-copy-input') as HTMLTextAreaElement | null;

    if (state.keywordTracker) {
        if (kwInput && state.keywordTracker.keywordsInputText !== undefined) {
            kwInput.value = state.keywordTracker.keywordsInputText;
        }
        if (copyInput && state.keywordTracker.copyInputText !== undefined) {
            copyInput.value = state.keywordTracker.copyInputText;
        }
    }

    // 更新统计信息
    updateInputStats();
    highlightDuplicatesInInput();
    updateCopyCharCount();
}

// ========================================== 
// UI Functions
// ========================================== 

/**
 * 更新关键词输入统计
 */
function updateInputStats(): void {
    const inputEl = document.getElementById('kt-keywords-input') as HTMLTextAreaElement | null;
    if (!inputEl) return;

    const text = inputEl.value;
    const keywords = KeywordService.parseKeywords(text);
    const countEl = document.getElementById('kt-keyword-count');
    if (countEl) countEl.textContent = keywords.length.toString();

    const dups = KeywordService.findDuplicateKeywords(text);
    const badge = document.getElementById('kt-duplicate-badge');
    const dupCountEl = document.getElementById('kt-duplicate-count');

    if (badge && dupCountEl) {
        if (dups.size > 0) {
            badge.classList.remove('hidden');
            dupCountEl.textContent = dups.size.toString();
        } else {
            badge.classList.add('hidden');
        }
    }
}

/**
 * 高亮显示重复关键词
 */
function highlightDuplicatesInInput(): void {
    const input = document.getElementById('kt-keywords-input') as HTMLTextAreaElement | null;
    const layer = document.getElementById('kt-keyword-highlight-layer');
    if (!input || !layer) return;

    const dups = KeywordService.findDuplicateKeywords(input.value);
    const lines = input.value.split('\n');
    
    // 清空容器
    layer.innerHTML = '';
    const fragment = document.createDocumentFragment();
    
    lines.forEach((line, i) => {
        const trimmed = line.trim().toLowerCase();
        const isDuplicate = trimmed && dups.has(trimmed);
        
        const span = document.createElement('span');
        if (isDuplicate) span.className = 'duplicate';
        span.textContent = line;
        fragment.appendChild(span);
        
        if (i < lines.length - 1) {
            fragment.appendChild(document.createTextNode('\n'));
        }
    });
    
    layer.appendChild(fragment);
}

/**
 * 更新文案字符计数
 */
function updateCopyCharCount(): void {
    const copyInput = document.getElementById('kt-copy-input') as HTMLTextAreaElement | null;
    const counter = document.getElementById('copy-char-count');
    if (copyInput && counter) {
        counter.textContent = copyInput.value.length.toString();
    }
}

// ========================================== 
// Action Functions
// ========================================== 

/**
 * 清理关键词格式（包含去重）
 */
function cleanKeywordsUI(): void {
    const inputEl = document.getElementById('kt-keywords-input') as HTMLTextAreaElement | null;
    if (!inputEl || !inputEl.value.trim()) {
        showToast("关键词列表为空", "warning");
        return;
    }

    const originalText = inputEl.value;
    const originalKeywords = KeywordService.parseKeywords(originalText);
    
    // 先清理格式，再去重
    let cleanedText = KeywordService.cleanKeywordsText(originalText);
    cleanedText = KeywordService.deduplicateKeywordsText(cleanedText);
    
    inputEl.value = cleanedText;
    updateInputStats();
    highlightDuplicatesInInput();
    saveInputsToState();
    
    const finalKeywords = KeywordService.parseKeywords(cleanedText);
    const removedCount = originalKeywords.length - finalKeywords.length;
    
    if (removedCount > 0) {
        showToast(`已清理格式并去重，移除 ${removedCount} 个重复项`, "success");
    } else {
        showToast("已清理格式", "success");
    }
}

/**
 * 去除重复关键词（已合并到 cleanKeywordsUI）
 */
function removeDuplicatesUI(): void {
    const inputEl = document.getElementById('kt-keywords-input') as HTMLTextAreaElement | null;
    if (!inputEl) return;
    inputEl.value = KeywordService.deduplicateKeywordsText(inputEl.value);
    updateInputStats();
    highlightDuplicatesInInput();
    saveInputsToState();
    showToast("已去重");
}

/**
 * 从剪贴板粘贴
 */
async function pasteFromClipboard(): Promise<void> {
    try {
        const text = await navigator.clipboard.readText();
        const copyInput = document.getElementById('kt-copy-input') as HTMLTextAreaElement | null;
        if (copyInput) {
            copyInput.value = text;
            updateCopyCharCount();
            saveInputsToState();
        }
        showToast("已粘贴");
    } catch (e) {
        showToast("无法访问剪贴板", "error");
    }
}

/**
 * 清空文案输入
 */
function clearCopyInput(): void {
    const copyInput = document.getElementById('kt-copy-input') as HTMLTextAreaElement | null;
    if (copyInput) {
        copyInput.value = '';
        updateCopyCharCount();
        saveInputsToState();
    }
}

/**
 * 清理文案格式
 * 去除大模型生成的 Markdown 格式符号，如 *、`、** 等
 */
function cleanCopyFormat(): void {
    const copyInput = document.getElementById('kt-copy-input') as HTMLTextAreaElement | null;
    if (!copyInput || !copyInput.value.trim()) {
        showToast("文案为空，无需清理", "warning");
        return;
    }

    let text = copyInput.value;
    const originalLength = text.length;

    // 去除 Markdown 格式符号
    // 1. 去除粗体标记 **text** 或 __text__
    text = text.replace(/\*\*(.+?)\*\*/g, '$1');
    text = text.replace(/__(.+?)__/g, '$1');
    
    // 2. 去除斜体标记 *text* 或 _text_
    text = text.replace(/\*(.+?)\*/g, '$1');
    text = text.replace(/_(.+?)_/g, '$1');
    
    // 3. 去除代码标记 `text`
    text = text.replace(/`(.+?)`/g, '$1');
    
    // 4. 去除删除线 ~~text~~
    text = text.replace(/~~(.+?)~~/g, '$1');
    
    // 5. 去除多余的星号和反引号（未配对的）
    text = text.replace(/[*`~_]+/g, '');
    
    // 6. 清理多余的空行（保留最多一个空行）
    text = text.replace(/\n{3,}/g, '\n\n');
    
    // 7. 清理行首行尾的空格
    text = text.split('\n').map(line => line.trim()).join('\n');
    
    // 8. 清理首尾空白
    text = text.trim();

    copyInput.value = text;
    updateCopyCharCount();
    saveInputsToState();

    const cleanedCount = originalLength - text.length;
    if (cleanedCount > 0) {
        showToast(`已清理 ${cleanedCount} 个格式字符`, "success");
    } else {
        showToast("未发现需要清理的格式", "info");
    }
}

/**
 * 开始分析
 */
async function startAnalysis(): Promise<void> {
    const kwText = (document.getElementById('kt-keywords-input') as HTMLTextAreaElement | null)?.value;
    const copyText = (document.getElementById('kt-copy-input') as HTMLTextAreaElement | null)?.value;

    if (!kwText || !kwText.trim() || !copyText || !copyText.trim()) {
        showToast(`请先输入关键词和文案`, "warning");
        return;
    }

    // 保存状态到 state
    saveInputsToState();

    // 更新全局状态
    state.keywordTracker.keywords = KeywordService.parseKeywords(kwText);
    state.keywordTracker.processedCopy = copyText;
    state.keywordTracker.translationMode = false;
    state.keywordTracker.paragraphs = [];

    showProgress(true, 50);

    // 使用 Worker 进行分析（如果可用）
    // 注意：Worker 的初始化在核心模块中完成，这里我们使用主线程回退
    try {
        const analysisResult = KeywordService.analyzeKeywordMatching(
            state.keywordTracker.processedCopy,
            state.keywordTracker.keywords
        );
        state.keywordTracker.matchedKeywords = analysisResult.matched;
        state.keywordTracker.unmatchedKeywords = analysisResult.unmatched;
        state.keywordTracker.wordFrequency = KeywordService.calculateWordFrequency(state.keywordTracker.processedCopy);

        // 重置分析报告状态
        state.keywordTracker.isWindowMinimized = false;

        showProgress(false);
        showToast("分析完成", "success");

        // 切换到 process 模块
        if (window.switchTab) {
            window.switchTab('kw_process');
        }
    } catch (error) {
        showProgress(false);
        showToast("分析失败: " + (error as Error).message, "error");
        console.error('[Input] 分析失败:', error);
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

    const kwInput = document.getElementById('kt-keywords-input') as HTMLTextAreaElement | null;
    const copyInput = document.getElementById('kt-copy-input') as HTMLTextAreaElement | null;

    // Debounce Logic for keyword input
    debouncedInputHandler = debounce(() => {
        updateInputStats();
        highlightDuplicatesInInput();
        saveInputsToState();
    }, 300);

    if (kwInput) {
        addEventListener(kwInput, 'input', debouncedInputHandler);
        addEventListener(kwInput, 'scroll', () => {
            const highlight = document.getElementById('kt-keyword-highlight-layer');
            if (highlight) highlight.scrollTop = kwInput.scrollTop;
        });
    }

    if (copyInput) {
        addEventListener(copyInput, 'input', () => {
            updateCopyCharCount();
            saveInputsToState();
        });
    }

    // Button event listeners
    const btnClean = document.getElementById('kt-btn-clean-kw');
    if (btnClean) addEventListener(btnClean, 'click', () => cleanKeywordsUI());

    const btnCleanCopy = document.getElementById('kt-btn-clean-copy');
    if (btnCleanCopy) addEventListener(btnCleanCopy, 'click', () => cleanCopyFormat());

    const btnClearCopy = document.getElementById('kt-btn-clear-copy');
    if (btnClearCopy) addEventListener(btnClearCopy, 'click', () => clearCopyInput());

    const btnPaste = document.getElementById('kt-btn-paste');
    if (btnPaste) addEventListener(btnPaste, 'click', async () => await pasteFromClipboard());

    const btnStartAnalysis = document.getElementById('kt-btn-start-analysis');
    if (btnStartAnalysis) addEventListener(btnStartAnalysis, 'click', async () => await startAnalysis());
}

// ========================================== 
// Module Exports (统一架构接口)
// ========================================== 

/**
 * 挂载子模块
 * @param {HTMLElement} container - 容器元素
 */
export async function mount(container: HTMLElement): Promise<void> {
    console.log('[Input] 🔧 开始挂载子模块');

    try {
        // 1. 使用 SafeModuleLoader 加载模板
        const loader = SafeModuleLoader.getInstance();
        const renderer = SafeRenderer.getInstance();
        
        const html = await loader.loadTemplate(
            'src/modules/app_center/views/keyword_hunter/input/template.html',
            {
                retryCount: 3,
                timeout: 5000,
                onError: (error) => {
                    console.error('[Input] 模板加载失败:', error);
                }
            }
        );
        
        // 使用 SafeRenderer 渲染模板
        renderer.renderTemplate(container, html);

        // 2. 注册全局操作（用于 HTML onclick 兼容）
        const actionNames = registerActionsWithLegacy({
            kt_cleanKeywords: () => cleanKeywordsUI(),
            kt_removeDuplicates: () => removeDuplicatesUI(),
            kt_cleanCopyFormat: () => cleanCopyFormat(),
            kt_pasteFromClipboard: () => pasteFromClipboard(),
            kt_clearCopyInput: () => clearCopyInput(),
            kt_startAnalysis: () => startAnalysis(),
        });
        
        // 保存已注册的动作名称，用于卸载时清理
        registeredActions = actionNames;

        // 3. 设置事件监听器
        setupEventListeners(container);

        // 4. 从 state 恢复状态
        restoreInputsFromState();

        console.log('[Input] ✅ 子模块挂载成功');
    } catch (error) {
        console.error('[Input] ❌ 子模块挂载失败:', error);
        throw error;
    }
}

/**
 * 卸载子模块
 */
export function unmount(): void {
    console.log('[Input] 🔄 开始卸载子模块');

    try {
        // 1. 保存状态到 state
        saveInputsToState();

        // 2. 清理事件监听器和定时器
        cleanup();

        console.log('[Input] ✅ 子模块卸载成功');
    } catch (error) {
        console.error('[Input] ❌ 子模块卸载失败:', error);
    }
}

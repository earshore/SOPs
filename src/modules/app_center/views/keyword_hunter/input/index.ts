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
import { KeywordHunterSnapshotService } from '../services/snapshotService';
import { appStore } from '../../../../../stores/useAppStore';
import { registerActionsWithLegacy, unregisterActions } from '../../../../../common/utils/actionRegistry';
import type { KeywordHunterSnapshot } from '../../../../../types/modules-business';
import type { KeywordTrackerState } from '../../../../../types/state';

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
let lastKeywordInputSnapshot: string | null = null; // 用于撤回关键词清理操作
let inputSnapshots: KeywordHunterSnapshot[] = [];
let inputSnapshotsLoading = false;
let inputSnapshotLoadSeq = 0;
let snapshotSaveInProgress = false;

interface InputValues {
    keywordsInputText: string;
    copyInputText: string;
}

interface SnapshotStatusView {
    label: string;
    detail: string;
    className: string;
}

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
    lastKeywordInputSnapshot = null;
    inputSnapshots = [];
    inputSnapshotsLoading = false;
    inputSnapshotLoadSeq += 1;
    snapshotSaveInProgress = false;

    // 清理已注册的动作
    if (registeredActions.length > 0) {
        unregisterActions(registeredActions);
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

function getCurrentInputValues(): InputValues {
    const kwInput = document.getElementById('kt-keywords-input') as HTMLTextAreaElement | null;
    const copyInput = document.getElementById('kt-copy-input') as HTMLTextAreaElement | null;

    return {
        keywordsInputText: kwInput?.value || '',
        copyInputText: copyInput?.value || '',
    };
}

function hasInputValues(values: InputValues = getCurrentInputValues()): boolean {
    return !!values.keywordsInputText.trim() || !!values.copyInputText.trim();
}

function parseUniqueKeywords(text: string): string[] {
    const seen = new Set<string>();
    return KeywordService.parseKeywords(text).filter((keyword) => {
        const normalized = keyword.trim().toLowerCase();
        if (!normalized || seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
    });
}

function getCurrentSnapshot(): KeywordHunterSnapshot | undefined {
    const currentSnapshotId = appStore.getState().keywordTracker.currentSnapshotId;
    if (!currentSnapshotId) return undefined;
    return inputSnapshots.find((snapshot) => snapshot.id === currentSnapshotId);
}

function isInputDifferentFromSnapshot(snapshot: KeywordHunterSnapshot, values: InputValues = getCurrentInputValues()): boolean {
    return (
        snapshot.input.keywordsInputText !== values.keywordsInputText ||
        snapshot.input.copyInputText !== values.copyInputText
    );
}

function getSnapshotStatusView(): SnapshotStatusView {
    if (snapshotSaveInProgress) {
        return { label: '保存中', detail: '正在写入快照', className: 'saving' };
    }

    if (inputSnapshotsLoading) {
        return { label: '加载中', detail: '读取本机历史', className: 'loading' };
    }

    const values = getCurrentInputValues();
    const currentSnapshot = getCurrentSnapshot();

    if (currentSnapshot) {
        const isDirty = isInputDifferentFromSnapshot(currentSnapshot, values);
        return {
            label: isDirty ? '有修改' : '已载入',
            detail: currentSnapshot.title,
            className: isDirty ? 'dirty' : 'current',
        };
    }

    if (hasInputValues(values)) {
        return { label: '自动保存', detail: '本机草稿', className: 'draft' };
    }

    return { label: '空白', detail: '本机草稿为空', className: 'idle' };
}

function updateSnapshotPanelState(): void {
    const status = document.getElementById('kt-input-draft-status');
    const statusLabel = document.getElementById('kt-input-draft-label');
    const statusDetail = document.getElementById('kt-input-draft-detail');
    const saveButton = document.getElementById('kt-input-snapshot-save') as HTMLButtonElement | null;
    const statusView = getSnapshotStatusView();
    const accessibleText = `${statusView.label}，${statusView.detail}`;

    if (status) {
        if (statusLabel && statusDetail) {
            statusLabel.textContent = statusView.label;
            statusDetail.textContent = statusView.detail;
        } else {
            status.textContent = `${statusView.label} ${statusView.detail}`;
        }
        status.className = `kh-input-draft-status ${statusView.className}`;
        status.setAttribute('aria-label', accessibleText);
        status.title = statusView.detail;
    }

    if (saveButton) {
        const disabled = inputSnapshotsLoading || snapshotSaveInProgress;
        const label = getCurrentSnapshot() ? '更新快照' : '保存当前快照';
        saveButton.disabled = disabled;
        saveButton.title = disabled ? accessibleText : label;
        saveButton.setAttribute('aria-label', disabled ? accessibleText : label);
    }
}

// ========================================== 
// State Management
// ========================================== 

/**
 * 保存输入到 state
 */
function saveInputsToState(): void {
    const values = getCurrentInputValues();
    const tracker = appStore.getState().keywordTracker;
    const inputChanged =
        values.keywordsInputText !== (tracker.keywordsInputText || '') ||
        values.copyInputText !== (tracker.copyInputText || '');
    const updates: Partial<KeywordTrackerState> = {
        keywordsInputText: values.keywordsInputText,
        copyInputText: values.copyInputText,
    };

    if (inputChanged) {
        const parsedKeywords = parseUniqueKeywords(values.keywordsInputText);
        Object.assign(updates, {
            keywords: parsedKeywords,
            processedCopy: values.copyInputText,
            formattedCopy: '',
            matchedKeywords: [],
            unmatchedKeywords: parsedKeywords,
            wordFrequency: [],
            paragraphs: [],
            translationMode: false,
            showTranslation: false,
            llmAnalysisResult: '',
            keywordLocationIndex: {},
            currentSnapshotId: null,
            snapshotSource: { type: 'manual' },
        });
    }

    appStore.getState().updateKeywordTracker(updates);
    updateSnapshotPanelState();
}

/**
 * 从 state 恢复输入
 */
function restoreInputsFromState(): void {
    const kwInput = document.getElementById('kt-keywords-input') as HTMLTextAreaElement | null;
    const copyInput = document.getElementById('kt-copy-input') as HTMLTextAreaElement | null;
    const tracker = appStore.getState().keywordTracker;

    if (kwInput && tracker.keywordsInputText !== undefined) {
        kwInput.value = tracker.keywordsInputText;
    }
    if (copyInput && tracker.copyInputText !== undefined) {
        copyInput.value = tracker.copyInputText;
    }

    // 更新统计信息
    updateInputStats();
    highlightDuplicatesInInput();
    updateCopyCharCount();
    updateSnapshotPanelState();
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
    layer.replaceChildren();
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

function updateUndoKeywordButtonState(): void {
    const undoBtn = document.getElementById('kt-btn-undo-kw-clean') as HTMLButtonElement | null;
    if (undoBtn) {
        undoBtn.disabled = lastKeywordInputSnapshot === null;
    }
}

function restoreKeywordInputValue(inputEl: HTMLTextAreaElement, value: string): void {
    inputEl.value = value;
    updateInputStats();
    highlightDuplicatesInInput();
    saveInputsToState();
    updateUndoKeywordButtonState();
}

function createElement<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    className?: string,
): HTMLElementTagNameMap[K] {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    return element;
}

function formatSnapshotDate(value: string): string {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return value;
    return date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function getSnapshotStatusLabel(status: KeywordHunterSnapshot['status']): string {
    const labels: Record<KeywordHunterSnapshot['status'], string> = {
        draft: '草稿',
        matched: '已匹配',
        reported: '有报告',
    };
    return labels[status];
}

function getSnapshotSourceLabel(): string {
    return '手动输入';
}

function getVisibleInputSnapshots(): KeywordHunterSnapshot[] {
    return inputSnapshots.slice(0, 6);
}

function createSnapshotActionButton(
    className: string,
    iconClass: string,
    label: string,
    onClick: () => void,
): HTMLButtonElement {
    const button = createElement('button', className);
    button.type = 'button';
    button.title = label;
    button.setAttribute('aria-label', label);
    const icon = createElement('i', iconClass);
    icon.setAttribute('aria-hidden', 'true');
    button.appendChild(icon);
    addEventListener(button, 'click', (event) => {
        event.stopPropagation();
        onClick();
    });
    return button;
}

function renderInputSnapshotItem(snapshot: KeywordHunterSnapshot): HTMLElement {
    const item = createElement('article', 'kh-input-snapshot-item');
    const currentSnapshotId = appStore.getState().keywordTracker.currentSnapshotId;
    const isCurrent = snapshot.id === currentSnapshotId;

    if (isCurrent) {
        item.classList.add('current');
    }

    item.tabIndex = 0;
    item.setAttribute('role', 'button');
    item.setAttribute('aria-label', `${isCurrent ? '当前快照，' : ''}恢复快照 ${snapshot.title}`);

    const header = createElement('div', 'kh-input-snapshot-item-head');
    const title = createElement('h4');
    title.textContent = snapshot.title;
    header.appendChild(title);

    const status = createElement('span', `kh-input-snapshot-status ${snapshot.status}`);
    status.textContent = getSnapshotStatusLabel(snapshot.status);
    header.appendChild(status);
    item.appendChild(header);

    const meta = createElement('div', 'kh-input-snapshot-meta');
    const source = createElement('span');
    source.textContent = getSnapshotSourceLabel();
    const time = createElement('span');
    time.textContent = formatSnapshotDate(snapshot.updatedAt);
    meta.appendChild(source);
    meta.appendChild(time);
    item.appendChild(meta);

    const stats = createElement('div', 'kh-input-snapshot-stats');
    stats.appendChild(createSnapshotStat('覆盖', `${snapshot.result.coverageRate}%`));
    stats.appendChild(createSnapshotStat('命中', String(snapshot.derived.matchedCount)));
    stats.appendChild(createSnapshotStat('未命中', String(snapshot.derived.unmatchedCount)));
    item.appendChild(stats);

    const actions = createElement('div', 'kh-input-snapshot-actions');
    actions.appendChild(createSnapshotActionButton(
        'kh-input-snapshot-action restore',
        'fas fa-arrow-rotate-left',
        '恢复到输入页',
        () => {
            void restoreInputSnapshot(snapshot);
        },
    ));
    actions.appendChild(createSnapshotActionButton(
        'kh-input-snapshot-action delete',
        'fas fa-times',
        '删除快照',
        () => {
            void deleteInputSnapshot(snapshot.id);
        },
    ));
    item.appendChild(actions);

    addEventListener(item, 'click', () => {
        void restoreInputSnapshot(snapshot);
    });
    addEventListener(item, 'keydown', (event) => {
        if (!(event instanceof KeyboardEvent)) return;
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        void restoreInputSnapshot(snapshot);
    });
    return item;
}

function createSnapshotStat(label: string, value: string): HTMLElement {
    const stat = createElement('span');
    const valueEl = createElement('strong');
    valueEl.textContent = value;
    const labelEl = createElement('em');
    labelEl.textContent = label;
    stat.appendChild(valueEl);
    stat.appendChild(labelEl);
    return stat;
}

function renderInputSnapshots(): void {
    const list = document.getElementById('kt-input-snapshot-list');
    const empty = document.getElementById('kt-input-snapshot-empty');
    const loading = document.getElementById('kt-input-snapshot-loading');
    const count = document.getElementById('kt-input-snapshot-count');
    if (!list || !empty || !count) return;

    const visible = getVisibleInputSnapshots();
    count.textContent = inputSnapshotsLoading ? '正在加载快照...' : `${inputSnapshots.length} 个快照`;
    list.replaceChildren();
    loading?.classList.toggle('hidden', !inputSnapshotsLoading);
    empty.classList.toggle('hidden', inputSnapshotsLoading || visible.length > 0);
    visible.forEach((snapshot) => {
        list.appendChild(renderInputSnapshotItem(snapshot));
    });
    updateSnapshotPanelState();
}

async function loadInputSnapshots(): Promise<void> {
    const loadSeq = ++inputSnapshotLoadSeq;
    inputSnapshotsLoading = true;
    renderInputSnapshots();

    try {
        const snapshots = await KeywordHunterSnapshotService.getAllAsync();
        if (loadSeq !== inputSnapshotLoadSeq) return;
        inputSnapshots = snapshots;
        renderInputSnapshots();
    } catch (error) {
        if (loadSeq !== inputSnapshotLoadSeq) return;
        console.error('[Input] 加载历史快照失败:', error);
        showToast(error instanceof Error ? error.message : '加载历史快照失败', { type: 'error' });
    } finally {
        if (loadSeq === inputSnapshotLoadSeq) {
            inputSnapshotsLoading = false;
            renderInputSnapshots();
        }
    }
}

async function confirmBeforeRestore(snapshot: KeywordHunterSnapshot): Promise<boolean> {
    saveInputsToState();

    const values = getCurrentInputValues();
    if (!hasInputValues(values) || !isInputDifferentFromSnapshot(snapshot, values)) {
        return true;
    }

    const currentSnapshot = getCurrentSnapshot();
    if (currentSnapshot && !isInputDifferentFromSnapshot(currentSnapshot, values)) {
        return true;
    }

    return window.confirm(
        '当前输入与目标快照不同。恢复后，页面中的关键词和 Listing 文案会被该快照覆盖。确定恢复快照吗？',
    );
}

async function restoreInputSnapshot(snapshot: KeywordHunterSnapshot): Promise<void> {
    const confirmed = await confirmBeforeRestore(snapshot);
    if (!confirmed) return;

    const restored = KeywordHunterSnapshotService.restore(snapshot);
    if (!restored) {
        showToast('快照不存在，无法恢复', { type: 'error' });
        return;
    }

    restoreInputsFromState();
    renderInputSnapshots();
    showToast('快照已载入输入页', { type: 'success' });
}

async function deleteInputSnapshot(id: string): Promise<void> {
    const confirmed = window.confirm(
        '确定删除这个 Keyword Hunter 快照吗？删除后无法从本地历史恢复该快照。',
    );
    if (!confirmed) {
        return;
    }

    try {
        await KeywordHunterSnapshotService.deleteByIdAsync(id);
        await loadInputSnapshots();
        showToast('快照已删除', { type: 'success' });
    } catch (error) {
        console.error('[Input] 删除快照失败:', error);
        showToast(error instanceof Error ? error.message : '删除快照失败', { type: 'error' });
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
        showToast("关键词列表为空", { type: 'warning' });
        return;
    }

    const originalText = inputEl.value;
    const originalKeywords = KeywordService.parseKeywords(originalText);

    // 先清理格式，再去重
    let cleanedText = KeywordService.cleanKeywordsText(originalText);
    cleanedText = KeywordService.deduplicateKeywordsText(cleanedText);

    if (cleanedText !== originalText) {
        lastKeywordInputSnapshot = originalText;
    }

    restoreKeywordInputValue(inputEl, cleanedText);

    const finalKeywords = KeywordService.parseKeywords(cleanedText);
    const removedCount = originalKeywords.length - finalKeywords.length;

    if (removedCount > 0) {
        showToast(`已清理格式并去重，移除 ${removedCount} 个重复项`, { type: 'success' });
    } else {
        showToast("已清理格式", { type: 'success' });
    }
}

/**
 * 去除重复关键词（已合并到 cleanKeywordsUI）
 */
function removeDuplicatesUI(): void {
    const inputEl = document.getElementById('kt-keywords-input') as HTMLTextAreaElement | null;
    if (!inputEl) return;
    const originalText = inputEl.value;
    const deduplicatedText = KeywordService.deduplicateKeywordsText(originalText);
    if (deduplicatedText !== originalText) {
        lastKeywordInputSnapshot = originalText;
    }
    restoreKeywordInputValue(inputEl, deduplicatedText);
    showToast("已去重");
}

function undoKeywordClean(): void {
    const inputEl = document.getElementById('kt-keywords-input') as HTMLTextAreaElement | null;
    if (!inputEl || lastKeywordInputSnapshot === null) {
        showToast("没有可撤回的关键词操作", { type: 'info' });
        return;
    }

    const snapshot = lastKeywordInputSnapshot;
    lastKeywordInputSnapshot = null;
    restoreKeywordInputValue(inputEl, snapshot);
    showToast("已撤回上一步", { type: 'success' });
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
        showToast("无法访问剪贴板", { type: 'error' });
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

async function saveCurrentSnapshot(status: 'draft' | 'matched' = 'draft'): Promise<void> {
    saveInputsToState();

    if (!hasInputValues()) {
        showToast("当前输入为空，无法保存快照", { type: 'warning' });
        return;
    }

    const wasUpdatingSnapshot = !!getCurrentSnapshot();
    snapshotSaveInProgress = true;
    updateSnapshotPanelState();

    try {
        await KeywordHunterSnapshotService.saveCurrentAsync({ status });
        await loadInputSnapshots();
        showToast(wasUpdatingSnapshot ? "快照已更新" : "快照已保存", { type: 'success' });
    } catch (error) {
        console.error('[Input] 保存快照失败:', error);
        showToast(error instanceof Error ? error.message : "保存快照失败", { type: 'error' });
    } finally {
        snapshotSaveInProgress = false;
        updateSnapshotPanelState();
    }
}

/**
 * 清理文案格式
 * 去除大模型生成的 Markdown 格式符号，如 *、`、** 等
 */
function cleanCopyFormat(): void {
    const copyInput = document.getElementById('kt-copy-input') as HTMLTextAreaElement | null;
    if (!copyInput || !copyInput.value.trim()) {
        showToast("文案为空，无需清理", { type: 'warning' });
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
        showToast(`已清理 ${cleanedCount} 个格式字符`, { type: 'success' });
    } else {
        showToast("未发现需要清理的格式", { type: 'info' });
    }
}

/**
 * 开始分析
 */
async function startAnalysis(): Promise<void> {
    const kwText = (document.getElementById('kt-keywords-input') as HTMLTextAreaElement | null)?.value;
    const copyText = (document.getElementById('kt-copy-input') as HTMLTextAreaElement | null)?.value;

    if (!kwText || !kwText.trim() || !copyText || !copyText.trim()) {
        showToast(`请先输入关键词和文案`, { type: 'warning' });
        return;
    }

    // 保存状态到 state
    saveInputsToState();

    // 更新全局状态
    appStore.getState().updateKeywordTracker({
        keywords: parseUniqueKeywords(kwText),
        processedCopy: copyText,
        translationMode: false,
        paragraphs: []
    });

    showProgress(true, 50);

    // 使用 Worker 进行分析（如果可用）
    // 注意：Worker 的初始化在核心模块中完成，这里我们使用主线程回退
    try {
        const tracker = appStore.getState().keywordTracker;
        const analysisResult = KeywordService.analyzeKeywordMatching(
            tracker.processedCopy,
            tracker.keywords,
            tracker.settings
        );
        appStore.getState().updateKeywordTracker({
            matchedKeywords: analysisResult.matched,
            unmatchedKeywords: analysisResult.unmatched,
            wordFrequency: KeywordService.calculateWordFrequency(tracker.processedCopy),
            isWindowMinimized: false
        });

        try {
            await KeywordHunterSnapshotService.saveCurrentAsync({ status: 'matched' });
        } catch (saveError) {
            console.warn('[Input] 自动保存关键词快照失败:', saveError);
        }

        showProgress(false);
        showToast("分析完成", { type: 'success' });

        // 切换到 process 模块
        await window.navigateTo('/app-center/keyword-hunter/process');
    } catch (error) {
        showProgress(false);
        showToast("分析失败: " + (error as Error).message, { type: 'error' });
        console.error('[Input] 分析失败:', error);
    }
}

// ========================================== 
// Event Listeners Setup
// ========================================== 

/**
 * 设置事件监听器
 */
function bindKeywordInputEvents(kwInput: HTMLTextAreaElement | null): void {
    debouncedInputHandler = debounce(() => {
        updateInputStats();
        highlightDuplicatesInInput();
        saveInputsToState();
    }, 300);

    if (!kwInput) return;

    addEventListener(kwInput, 'input', debouncedInputHandler);
    addEventListener(kwInput, 'input', () => {
        lastKeywordInputSnapshot = null;
        updateUndoKeywordButtonState();
        updateSnapshotPanelState();
    });
    addEventListener(kwInput, 'scroll', () => {
        const highlight = document.getElementById('kt-keyword-highlight-layer');
        if (highlight) highlight.scrollTop = kwInput.scrollTop;
    });
}

function bindCopyInputEvents(copyInput: HTMLTextAreaElement | null): void {
    if (!copyInput) return;

    addEventListener(copyInput, 'input', () => {
        updateCopyCharCount();
        saveInputsToState();
        updateSnapshotPanelState();
    });
}

function bindActionButtons(): void {
    const btnClean = document.getElementById('kt-btn-clean-kw');
    if (btnClean) addEventListener(btnClean, 'click', () => cleanKeywordsUI());

    const btnUndoClean = document.getElementById('kt-btn-undo-kw-clean');
    if (btnUndoClean) addEventListener(btnUndoClean, 'click', () => undoKeywordClean());

    const btnCleanCopy = document.getElementById('kt-btn-clean-copy');
    if (btnCleanCopy) addEventListener(btnCleanCopy, 'click', () => cleanCopyFormat());

    const btnClearCopy = document.getElementById('kt-btn-clear-copy');
    if (btnClearCopy) addEventListener(btnClearCopy, 'click', () => clearCopyInput());
}

function bindSnapshotButtons(): void {
    const btnPanelSaveSnapshot = document.getElementById('kt-input-snapshot-save');
    if (btnPanelSaveSnapshot) addEventListener(btnPanelSaveSnapshot, 'click', () => {
        void saveCurrentSnapshot('draft');
    });

    const btnPaste = document.getElementById('kt-btn-paste');
    if (btnPaste) addEventListener(btnPaste, 'click', async () => await pasteFromClipboard());

    const btnStartAnalysis = document.getElementById('kt-btn-start-analysis');
    if (btnStartAnalysis) addEventListener(btnStartAnalysis, 'click', async () => await startAnalysis());
}

function setupEventListeners(container: HTMLElement): void {
    if (!container) return;

    const kwInput = document.getElementById('kt-keywords-input') as HTMLTextAreaElement | null;
    const copyInput = document.getElementById('kt-copy-input') as HTMLTextAreaElement | null;

    bindKeywordInputEvents(kwInput);
    bindCopyInputEvents(copyInput);
    bindActionButtons();
    bindSnapshotButtons();
}

// ========================================== 
// Module Exports (统一架构接口)
// ========================================== 

/**
 * 挂载子模块
 * @param {HTMLElement} container - 容器元素
 */
export async function mount(container: HTMLElement): Promise<void> {
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
        // 添加淡入动画（在渲染前添加）
        container.classList.add('fade-in');
        renderer.renderTemplate(container, html);

        // 2. 注册全局操作（用于旧模板兼容）
        const actionNames = registerActionsWithLegacy({
            kt_cleanKeywords: () => cleanKeywordsUI(),
            kt_removeDuplicates: () => removeDuplicatesUI(),
            kt_undoKeywordClean: () => undoKeywordClean(),
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
        updateUndoKeywordButtonState();
        await loadInputSnapshots();
    } catch (error) {
        console.error('[Input] ❌ 子模块挂载失败:', error);
        throw error;
    }
}

/**
 * 卸载子模块
 */
export function unmount(): void {
    try {
        // 1. 保存状态到 state
        saveInputsToState();

        // 2. 清理事件监听器和定时器
        cleanup();
    } catch (error) {
        console.error('[Input] ❌ 子模块卸载失败:', error);
    }
}

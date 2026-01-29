// src/modules/keyword_tracker/trackerDisplay.js
import BaseModule from "../../../common/BaseModule.js";
import { showToast, showProgress } from "../../../common/utils/ui.js";
import * as KeywordService from "./trackerService.js";
import state from "../../../common/state.js";
import { ErrorService } from "../../../services/errorService.js";

// 1. 定义路由映射�?(Route ID -> Internal Module Name)
const ROUTE_MAP = {
    'kw_input': 'input',
    'kw_process': 'process',
    'kw_analysis': 'analysis'
};

class KeywordTrackerModule extends BaseModule {
    constructor() {
        super('keyword_tracker');
        this.floatWin = {
            isDragging: false,
            startX: 0, startY: 0, startLeft: 0, startTop: 0,
            offsetX: 0, offsetY: 0
        };
        // Debounced function reference for cleanup
        this._debouncedInputHandler = null;

        // Initialize Worker
        this.worker = null;
        try {
            this.worker = new Worker(new URL('../../../workers/keywordMatcher.worker.js', import.meta.url), { type: 'module' });
        } catch (e) {
            console.warn('[KeywordTracker] Web Worker initialization failed, falling back to main thread.', e);
        }
    }

    async render() {
        // HTML is likely preloaded by viewLoader, but we can ensure container content here if needed.
        // For now, we assume the HTML structure exists in #panel-keyword_tracker
    }

    async init() {
        console.log("🚀 Keyword Tracker Initialized (BaseModule)");

        // 1. Setup UI Events
        this.setupEventListeners();
        this.setupFloatingWindow();

        // 2. Bind Global Proxies (for HTML onclick compatibility)
        this.bindGlobalProxies();

        // 3. Restore State / Default View
        // If we have data in state, we might want to restore the view
        if (state.keywordTracker.processedCopy) {
            this.renderCopyDisplay();
        }

        // Initial check for internal tab
        // We don't force 'input' here because the router might have sent us to 'kw_analysis' directly
        const currentRoute = state.ui.currentTab;
        if (ROUTE_MAP[currentRoute]) {
            this.showModule(ROUTE_MAP[currentRoute]);
        } else {
            this.showModule('input');
        }
    }

    onUnmount() {
        console.log("💤 Keyword Tracker Unmounting...");
        this.unbindGlobalProxies();
        // BaseModule auto-removes event listeners added via this.addEventListener
    }

    // ================== Event Listeners ==================

    setupEventListeners() {
        const kwInput = document.getElementById('kt-keywords-input');
        const copyInput = document.getElementById('kt-copy-input');

        // Debounce Logic
        this._debouncedInputHandler = this.debounce(() => {
            this.updateInputStats();
            this.highlightDuplicatesInInput();
        }, 300);

        if (kwInput) {
            this.addEventListener(kwInput, 'input', this._debouncedInputHandler);
            this.addEventListener(kwInput, 'scroll', () => {
                const highlight = document.getElementById('kt-keyword-highlight-layer');
                if (highlight) highlight.scrollTop = kwInput.scrollTop;
            });
        }

        if (copyInput) {
            this.addEventListener(copyInput, 'input', () => {
                const counter = document.getElementById('copy-char-count');
                if (counter) counter.textContent = copyInput.value.length;
            });
        }

        const btnClean = document.getElementById('kt-btn-clean-kw');
        if (btnClean) this.addEventListener(btnClean, 'click', () => this.cleanKeywordsUI());

        const btnDedup = document.getElementById('kt-btn-dedup-kw');
        if (btnDedup) this.addEventListener(btnDedup, 'click', () => this.removeDuplicatesUI());

        const btnClearCopy = document.getElementById('kt-btn-clear-copy');
        if (btnClearCopy) this.addEventListener(btnClearCopy, 'click', () => {
            if (copyInput) {
                copyInput.value = '';
                const counter = document.getElementById('copy-char-count');
                if (counter) counter.textContent = '0';
            }
        });

        const btnPaste = document.getElementById('kt-btn-paste');
        if (btnPaste) this.addEventListener(btnPaste, 'click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (copyInput) {
                    copyInput.value = text;
                    const counter = document.getElementById('copy-char-count');
                    if (counter) counter.textContent = text.length;
                }
                showToast("已粘贴");
            } catch (e) {
                showToast("无法访问剪贴板", "error");
            }
        });

        const checkTrans = document.getElementById('kt-show-translation');
        if (checkTrans) this.addEventListener(checkTrans, 'change', () => this.renderCopyDisplay());

        // Listen for internal route changes (specific to this module)
        // Note: The global app:route-changed is handled by the initKeywordTracker wrapper to trigger mount/unmount
        // But once mounted, we might need to react to sub-tab switching if the module is already active.
        this.addEventListener(window, 'app:route-changed', (e) => {
            const { routeId, moduleId } = e.detail;
            if (moduleId === 'keyword_tracker' && this._isMounted) {
                this.handleInternalTabSwitch(routeId);
            }
        });
    }

    setupFloatingWindow() {
        const el = document.getElementById('kt-keywords-floating');
        if (!el) return;
        const header = el.querySelector('.floating-header');
        if (!header) return;

        this.addEventListener(header, 'mousedown', (e) => {
            this.floatWin.isDragging = true;
            this.floatWin.offsetX = e.clientX - el.getBoundingClientRect().left;
            this.floatWin.offsetY = e.clientY - el.getBoundingClientRect().top;

            el.style.opacity = '0.9';
            el.style.transition = 'none';
            e.preventDefault();
        });

        this.addEventListener(document, 'mousemove', (e) => {
            if (!this.floatWin.isDragging) return;

            let newX = e.clientX - this.floatWin.offsetX;
            let newY = e.clientY - this.floatWin.offsetY;

            const maxX = window.innerWidth - el.offsetWidth;
            const maxY = window.innerHeight - el.offsetHeight;

            newX = Math.max(0, Math.min(newX, maxX));
            newY = Math.max(0, Math.min(newY, maxY));

            el.style.left = newX + 'px';
            el.style.top = newY + 'px';
            el.style.right = 'auto';
        });

        this.addEventListener(document, 'mouseup', () => {
            if (!this.floatWin.isDragging) return;
            this.floatWin.isDragging = false;

            el.style.opacity = '1';
            el.style.transition = 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';

            const rect = el.getBoundingClientRect();
            const screenWidth = window.innerWidth;
            const threshold = 100;

            if (rect.left < threshold) {
                el.style.left = '20px';
            } else if (rect.right > screenWidth - threshold) {
                el.style.left = (screenWidth - rect.width - 20) + 'px';
            }
        });
    }

    // ================== Global Proxies ==================

    bindGlobalProxies() {
        window.kt_switchInternalTab = (id) => this.handleInternalTabSwitch(id);
        window.kt_showModule = (m) => this.showModule(m);
        window.kt_startAnalysis = () => this.startAnalysis();
        window.kt_syncToInput = () => this.syncToInput();
        window.kt_translateCopyImmersive = () => this.translateCopyImmersive();
        window.kt_runLLMAnalysis = () => this.runLLMAnalysis();
        window.kt_showKeywordTab = (t) => this.showKeywordTab(t);
        window.kt_locateKeyword = (k) => this.locateKeywordInCopy(k);
        window.kt_minimizeKeywordsWindow = () => this.minimizeKeywordsWindow();
        window.kt_restoreKeywordsWindow = () => this.restoreKeywordsWindow();
    }

    unbindGlobalProxies() {
        delete window.kt_switchInternalTab;
        delete window.kt_showModule;
        delete window.kt_startAnalysis;
        delete window.kt_syncToInput;
        delete window.kt_translateCopyImmersive;
        delete window.kt_runLLMAnalysis;
        delete window.kt_showKeywordTab;
        delete window.kt_locateKeyword;
        delete window.kt_minimizeKeywordsWindow;
        delete window.kt_restoreKeywordsWindow;
    }

    // ================== Logic Methods ==================

    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            // Use arrow function in settimeout to preserve 'this' if needed, 
            // though here we execute func directly. 
            // Since we bind debounce in constructor, 'this' inside func depends on how it's written.
            timeout = this.setTimeout(() => func.apply(this, args), wait);
        };
    }

    handleInternalTabSwitch(routeId) {
        const internalModule = ROUTE_MAP[routeId];
        if (internalModule) {
            this.showModule(internalModule);
        }
    }

    showModule(moduleName) {
        ['input', 'process', 'analysis'].forEach(m => {
            document.getElementById(`kt-module-${m}`)?.classList.add('hidden');
            const tab = document.getElementById(`kt-tab-${m}`);
            if (tab) {
                tab.classList.remove('kt-tab-active', 'bg-white', 'shadow-sm', 'text-blue-600');
                tab.classList.add('text-slate-600');
            }
        });

        const target = document.getElementById(`kt-module-${moduleName}`);
        if (target) target.classList.remove('hidden');

        // Floating window management
        const floatWin = document.getElementById('kt-keywords-floating');
        const minBtn = document.getElementById('kt-keywords-minimized');

        if (!floatWin || !minBtn) return;

        if (moduleName === 'process') {
            if (state.keywordTracker.isWindowMinimized) {
                floatWin.classList.add('hidden');
                minBtn.classList.remove('hidden');
            } else {
                floatWin.classList.remove('hidden');
                minBtn.classList.add('hidden');
            }
        } else {
            floatWin.classList.add('hidden');
            minBtn.classList.add('hidden');
        }
    }

    updateInputStats() {
        const inputEl = document.getElementById('kt-keywords-input');
        if (!inputEl) return;

        const text = inputEl.value;
        const keywords = KeywordService.parseKeywords(text);
        const countEl = document.getElementById('kt-keyword-count');
        if (countEl) countEl.textContent = keywords.length;

        const dups = KeywordService.findDuplicateKeywords(text);
        const badge = document.getElementById('kt-duplicate-badge');
        const dupCountEl = document.getElementById('kt-duplicate-count');

        if (badge && dupCountEl) {
            if (dups.size > 0) {
                badge.classList.remove('hidden');
                dupCountEl.textContent = dups.size;
            } else {
                badge.classList.add('hidden');
            }
        }
    }

    highlightDuplicatesInInput() {
        const input = document.getElementById('kt-keywords-input');
        const layer = document.getElementById('kt-keyword-highlight-layer');
        if (!input || !layer) return;

        const dups = KeywordService.findDuplicateKeywords(input.value);
        const lines = input.value.split('\n');
        let html = '';

        lines.forEach((line, i) => {
            const trimmed = line.trim().toLowerCase();
            if (trimmed && dups.has(trimmed)) {
                html += `<span class="duplicate">${this.escapeHtml(line)}</span>`;
            } else {
                html += this.escapeHtml(line);
            }
            if (i < lines.length - 1) html += '\n';
        });
        layer.innerHTML = html;
    }

    cleanKeywordsUI() {
        const inputEl = document.getElementById('kt-keywords-input');
        if (!inputEl) return;
        inputEl.value = KeywordService.cleanKeywordsText(inputEl.value);
        this.updateInputStats();
        this.highlightDuplicatesInInput();
    }

    removeDuplicatesUI() {
        const inputEl = document.getElementById('kt-keywords-input');
        if (!inputEl) return;
        inputEl.value = KeywordService.deduplicateKeywordsText(inputEl.value);
        this.updateInputStats();
        this.highlightDuplicatesInInput();
        showToast("已去重");
    }

    async startAnalysis() {
        const kwText = document.getElementById('kt-keywords-input').value;
        const copyText = document.getElementById('kt-copy-input').value;

        if (!kwText.trim() || !copyText.trim()) {
            showToast(`请先输入关键词和文案`, "warning");
            return;
        }

        // Update Global State
        state.keywordTracker.keywords = KeywordService.parseKeywords(kwText);
        state.keywordTracker.processedCopy = copyText;
        state.keywordTracker.translationMode = false;
        state.keywordTracker.paragraphs = [];

        showProgress(true, 50);

        // Use Worker for analysis if available
        if (this.worker) {
            this.worker.onmessage = (e) => {
                const { action, payload } = e.data;
                if (action === 'ANALYZE_KEYWORDS_RESULT') {
                    state.keywordTracker.matchedKeywords = payload.matched;
                    state.keywordTracker.unmatchedKeywords = payload.unmatched;

                    // Trigger second worker task
                    this.worker.postMessage({
                        action: 'CALCULATE_FREQUENCY',
                        payload: { text: state.keywordTracker.processedCopy }
                    });
                } else if (action === 'CALCULATE_FREQUENCY_RESULT') {
                    state.keywordTracker.wordFrequency = payload;
                    this.finalizeAnalysis();
                }
            };

            this.worker.postMessage({
                action: 'ANALYZE_KEYWORDS',
                payload: {
                    text: state.keywordTracker.processedCopy,
                    keywords: state.keywordTracker.keywords
                }
            });
        } else {
            // Fallback to main thread
            const analysisResult = KeywordService.analyzeKeywordMatching(
                state.keywordTracker.processedCopy,
                state.keywordTracker.keywords
            );
            state.keywordTracker.matchedKeywords = analysisResult.matched;
            state.keywordTracker.unmatchedKeywords = analysisResult.unmatched;
            state.keywordTracker.wordFrequency = KeywordService.calculateWordFrequency(state.keywordTracker.processedCopy);
            this.finalizeAnalysis();
        }
    }

    finalizeAnalysis() {
        state.keywordTracker.isWindowMinimized = false;
        this.updateMinimizedBadge();

        const reportContainer = document.getElementById('kt-llm-analysis-result');
        if (reportContainer) {
            reportContainer.innerHTML = `
                <div class="flex flex-col items-center justify-center py-10 text-slate-400 gap-3">
                    <i class="fas fa-sparkles text-3xl opacity-30"></i>
                    <p class="text-sm">点击上方按钮，让 AI 为您生成深度诊断报告</p>
                </div>`;
        }

        this.renderProcessModule();
        this.renderAnalysisModule();

        if (window.switchTab) {
            window.switchTab('kw_process');
        } else {
            this.showModule('process');
        }

        showProgress(false);
        showToast("分析完成", "success");
    }

    renderProcessModule() {
        const transBtn = document.getElementById('kt-translate-btn');
        const transBtnText = document.getElementById('kt-translate-btn-text');
        const transCheckbox = document.getElementById('kt-show-translation');

        const hasContent = state.keywordTracker.processedCopy && state.keywordTracker.processedCopy.trim().length > 0;
        const hasTranslationData = state.keywordTracker.paragraphs && state.keywordTracker.paragraphs.length > 0;

        // A. Translate Button
        if (transBtn) {
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

        // B. Checkbox
        if (transCheckbox) {
            if (hasTranslationData) {
                transCheckbox.disabled = false;
                if (state.keywordTracker.translationMode) transCheckbox.checked = true;
            } else {
                transCheckbox.disabled = true;
                transCheckbox.checked = false;
            }
        }

        this.renderCopyDisplay();
        this.renderFloatingKeywords();

        const matchedCount = document.getElementById('kt-tab-matched-count');
        if (matchedCount) matchedCount.textContent = state.keywordTracker.matchedKeywords.length;

        const unmatchedCount = document.getElementById('kt-tab-unmatched-count');
        if (unmatchedCount) unmatchedCount.textContent = state.keywordTracker.unmatchedKeywords.length;

        this.updateMinimizedBadge();
    }

    renderCopyDisplay() {
        const display = document.getElementById('kt-copy-display');
        if (!display) return;

        const showTrans = document.getElementById('kt-show-translation')?.checked;

        if (state.keywordTracker.translationMode && state.keywordTracker.paragraphs.length > 0) {
            let html = '';
            state.keywordTracker.paragraphs.forEach(p => {
                const highlightedOriginal = this.highlightText(p.original);
                html += `<div class="mb-4">`;
                html += `<div class="paragraph-original leading-relaxed">${highlightedOriginal}</div>`;
                if (showTrans && p.translation) {
                    html += `<div class="sentence-translation">${this.escapeHtml(p.translation)}</div>`;
                }
                html += `</div>`;
            });
            display.innerHTML = html;
            return;
        }

        display.innerHTML = this.highlightText(state.keywordTracker.processedCopy);
    }

    highlightText(text) {
        if (!text) return '';
        if (!state.keywordTracker.matchedKeywords || state.keywordTracker.matchedKeywords.length === 0) {
            return this.escapeHtml(text).replace(/\n/g, '<br>');
        }

        const sortedKw = [...state.keywordTracker.matchedKeywords].sort((a, b) => b.keyword.length - a.keyword.length);
        const pattern = sortedKw.map(item => this.escapeRegex(item.keyword)).join('|');
        const regex = new RegExp(`(${pattern})`, 'gi');
        const parts = text.split(regex);

        const htmlParts = parts.map((part, index) => {
            if (index % 2 === 1) {
                const lowerKw = part.toLowerCase();
                return `<span class="keyword-bold highlightable" data-kw="${this.escapeAttr(lowerKw)}">${this.escapeHtml(part)}</span>`;
            } else {
                return this.escapeHtml(part);
            }
        });

        return htmlParts.join('').replace(/\n/g, '<br>');
    }

    renderFloatingKeywords() {
        const matchedContainer = document.getElementById('kt-matched-keywords');
        const unmatchedContainer = document.getElementById('kt-unmatched-keywords');

        if (matchedContainer) {
            matchedContainer.innerHTML = state.keywordTracker.matchedKeywords.map(item => `
                <div class="bg-green-50 border border-green-200 rounded p-2 flex justify-between items-center cursor-pointer hover:bg-green-100 transition-colors"
                     onclick="window.kt_locateKeyword('${this.escapeAttr(item.keyword)}')">
                    <span class="text-sm text-green-800 font-medium">${this.escapeHtml(item.keyword)}</span>
                    <span class="text-xs bg-green-200 text-green-800 px-1.5 rounded-full">${item.count}</span>
                </div>
            `).join('');
        }

        if (unmatchedContainer) {
            unmatchedContainer.innerHTML = state.keywordTracker.unmatchedKeywords.map(kw => `
                <div class="bg-red-50 border border-red-200 rounded p-2 text-sm text-red-800">
                    ${this.escapeHtml(kw)}
                </div>
            `).join('');
        }
    }

    showKeywordTab(type) {
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

    locateKeywordInCopy(keyword) {
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

        if (!state.keywordTracker.keywordLocationIndex) state.keywordTracker.keywordLocationIndex = {};
        let idx = state.keywordTracker.keywordLocationIndex[targetKw] || 0;
        if (idx >= spans.length) idx = 0;

        container.querySelectorAll('.highlight-focus').forEach(el => el.classList.remove('highlight-focus'));

        const targetSpan = spans[idx];
        targetSpan.classList.add('highlight-focus');

        targetSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });

        state.keywordTracker.keywordLocationIndex[targetKw] = (idx + 1) % spans.length;

        showToast(`定位: ${keyword} (${idx + 1}/${spans.length})`);
    }

    renderAnalysisModule() {
        const total = state.keywordTracker.keywords.length;
        const matched = state.keywordTracker.matchedKeywords.length;
        const rate = total === 0 ? 0 : Math.round((matched / total) * 100);

        const rateEl = document.getElementById('kt-coverage-rate');
        if (rateEl) rateEl.textContent = rate + '%';

        const barEl = document.getElementById('kt-coverage-bar');
        if (barEl) barEl.style.width = rate + '%';

        document.getElementById('kt-stat-matched').textContent = matched;
        document.getElementById('kt-stat-unmatched').textContent = state.keywordTracker.unmatchedKeywords.length;
        document.getElementById('kt-stat-total').textContent = total;

        const freqList = document.getElementById('kt-word-frequency-list');
        if (freqList) {
            freqList.innerHTML = state.keywordTracker.wordFrequency.map(([w, c]) => `
                <span class="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md">
                    ${this.escapeHtml(w)} <span class="text-slate-400">(${c})</span>
                </span>
            `).join('');
        }

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

    async runLLMAnalysis() {
        const btn = document.getElementById('kt-analyze-btn');

        if (!state.keywordTracker.processedCopy || !state.keywordTracker.processedCopy.trim()) {
            throw new Error("文案内容为空，无法进行AI分析。请先在左侧输入框填入Listing文案。");
        }

        const resultDiv = document.getElementById('kt-llm-analysis-result');

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> 分析中...';
            btn.classList.add('opacity-75', 'cursor-wait');
        }

        if (resultDiv) resultDiv.innerHTML = '<div class="text-center py-10"><i class="fas fa-circle-notch fa-spin text-purple-500 text-2xl"></i><p class="mt-2 text-slate-500">AI 正在深度分析您的 Listing (可能需�?20�?...</p></div>';

        try {
            const response = await KeywordService.fetchListingAnalysis(
                state.keywordTracker.processedCopy,
                state.keywordTracker.keywords,
                state.keywordTracker.matchedKeywords,
                state.keywordTracker.unmatchedKeywords
            );

            if (resultDiv) {
                if (window.marked) {
                    resultDiv.innerHTML = window.marked.parse(response);
                } else {
                    resultDiv.textContent = response;
                }
            }

            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-check"></i> 报告已生成';
                btn.classList.remove('from-blue-500', 'to-purple-600', 'text-white', 'hover:from-blue-400', 'hover:to-purple-500', 'opacity-75', 'cursor-wait');
                btn.classList.add('text-gray-500', 'cursor-not-allowed');
            }
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

            if (resultDiv) {
                const colorClass = isValidationError ? "yellow" : "red";
                const icon = isValidationError ? "fa-exclamation-circle" : "fa-exclamation-triangle";
                const title = isValidationError ? "无法进行分析" : "分析失败";

                resultDiv.innerHTML = `
                    <div class="p-4 bg-${colorClass}-50 border border-${colorClass}-200 rounded-lg">
                        <div class="flex items-center gap-2 text-${colorClass}-700 font-bold mb-2">
                            <i class="fas ${icon}"></i> ${title}
                        </div>
                        <p class="text-sm text-${colorClass}-800">${errorMsg}</p>
                        <button onclick="window.kt_runLLMAnalysis()" class="mt-3 px-3 py-1 bg-white border border-${colorClass}-200 text-${colorClass}-700 text-xs rounded hover:bg-${colorClass}-50">重试</button>
                    </div>
                `;
            }

            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-magic"></i> 重试生成';
                btn.classList.remove('bg-gray-300', 'text-gray-500', 'cursor-not-allowed', 'opacity-75', 'cursor-wait');
                btn.classList.add('bg-purple-600', 'text-white', 'hover:bg-purple-700');
            }
        }
    }

    async translateCopyImmersive() {
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

            this.renderProcessModule();

            if (progress) progress.style.width = '100%';
            setTimeout(() => progress?.classList.add('hidden'), 500);

        } catch (e) {
            ErrorService.handle(e, { action: 'translateCopyImmersive', module: 'keywordTracker' });
            if (progress) progress.classList.add('hidden');
            if (btnText) btnText.textContent = "AI 沉浸翻译";
            if (btn) btn.disabled = false;
        }
    }

    syncToInput() {
        const display = document.getElementById('kt-copy-display');
        const input = document.getElementById('kt-copy-input');

        if (display && input) {
            const text = display.innerText;
            input.value = text;
            state.keywordTracker.processedCopy = text;
            const counter = document.getElementById('copy-char-count');
            if (counter) counter.textContent = text.length;
        }

        if (window.switchTab) {
            window.switchTab('kw_input');
        } else {
            this.showModule('input');
        }

        showToast("已同步");
    }

    updateMinimizedBadge() {
        const badge = document.getElementById('kt-minimized-badge');
        if (badge && state.keywordTracker.matchedKeywords) badge.textContent = state.keywordTracker.matchedKeywords.length;
    }

    minimizeKeywordsWindow() {
        const floatWinEl = document.getElementById('kt-keywords-floating');
        const minBtn = document.getElementById('kt-keywords-minimized');

        if (floatWinEl) {
            floatWinEl.classList.add('opacity-0', 'scale-95');
            setTimeout(() => {
                floatWinEl.classList.add('hidden');
                floatWinEl.classList.remove('opacity-0', 'scale-95');

                if (minBtn) {
                    minBtn.classList.remove('hidden');
                    state.keywordTracker.isWindowMinimized = true;
                }
            }, 200);
        }
    }

    restoreKeywordsWindow() {
        const floatWinEl = document.getElementById('kt-keywords-floating');
        const minBtn = document.getElementById('kt-keywords-minimized');

        if (minBtn) minBtn.classList.add('hidden');
        if (floatWinEl) {
            floatWinEl.classList.remove('hidden');
            floatWinEl.classList.add('opacity-0', 'scale-95');
            requestAnimationFrame(() => {
                floatWinEl.classList.remove('opacity-0', 'scale-95');
                floatWinEl.classList.add('transition-all', 'duration-200');
            });
        }

        state.keywordTracker.isWindowMinimized = false;
    }

    // ================== Utils ==================

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    escapeAttr(text) {
        if (!text) return '';
        return text.replace(/'/g, "\\'").replace(/"/g, '\\"');
    }
}

// ================== Export / Bootstrap ==================

const instance = new KeywordTrackerModule();

export function initKeywordTracker() {
    // 监听路由变化，实现自动挂载/卸载
    window.addEventListener('app:route-changed', (e) => {
        const { moduleId } = e.detail;
        const container = document.getElementById('panel-keyword_tracker');

        // 只要 moduleId 匹配，就挂载 (处理子路由变化)
        if (moduleId === 'keyword_tracker') {
            if (!instance._isMounted && container) instance.mount(container);
        } else {
            if (instance._isMounted) instance.unmount();
        }
    });
}

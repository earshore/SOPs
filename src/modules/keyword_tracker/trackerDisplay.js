// src/modules/keyword_tracker/trackerDisplay.js

console.log("📚 Keyword Tracker Module Loading...");

import { showToast } from "../../common/utils/ui.js";
import * as KeywordService from "./trackerService.js"; 
import state from "../../common/state.js";

// 1. 定义路由映射表 (Route ID -> Internal Module Name)
const ROUTE_MAP = {
    'kw_input': 'input',
    'kw_process': 'process',
    'kw_analysis': 'analysis'
};

// ===== Utils: Performance Helpers =====

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeAttr(text) {
    if (!text) return '';
    return text.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// ===== State Management =====

let floatWin = {
    isDragging: false,
    startX: 0, startY: 0, startLeft: 0, startTop: 0
};

// ===== Initialization =====

export function initKeywordTracker() {
    console.log("🚀 Keyword Tracker Initialized (Performance Mode)");

    setupEventListeners();
    setupFloatingWindow();

    // 暴露全局函数
    window.kt_switchInternalTab = handleInternalTabSwitch;
    window.kt_showModule = showModule;
    window.kt_startAnalysis = startAnalysis;
    window.kt_syncToInput = syncToInput;
    window.kt_translateCopyImmersive = translateCopyImmersive;
    window.kt_runLLMAnalysis = runLLMAnalysis;
    window.kt_showKeywordTab = showKeywordTab;
    window.kt_locateKeyword = locateKeywordInCopy;
    window.kt_minimizeKeywordsWindow = minimizeKeywordsWindow;
    window.kt_restoreKeywordsWindow = restoreKeywordsWindow;
    
    // 默认显示输入页
    showModule('input');

    // ============================================================
    // 🚀 核心修复：注册路由监听器
    // 只有加上这个，左侧边栏点击才有反应
    // ============================================================
    window.addEventListener('app:route-changed', (e) => {
        const { routeId, moduleId } = e.detail;
        // 只响应属于 keyword_tracker 模块的路由
        if (moduleId === 'keyword_tracker') {
            console.log(`📡 [Tracker] 收到路由切换指令: ${routeId}`);
            handleInternalTabSwitch(routeId);
        }
    });
}

function handleInternalTabSwitch(routeId) {
    const internalModule = ROUTE_MAP[routeId];
    if (internalModule) {
        showModule(internalModule);
    }
}

function setupEventListeners() {
    const kwInput = document.getElementById('kt-keywords-input');
    const copyInput = document.getElementById('kt-copy-input');
    
    // 防抖处理输入事件 (300ms)
    const debouncedKwInput = debounce(() => {
        updateInputStats();
        highlightDuplicatesInInput();
    }, 300);

    if (kwInput) {
        kwInput.addEventListener('input', debouncedKwInput);
        kwInput.addEventListener('scroll', () => {
            const highlight = document.getElementById('kt-keyword-highlight-layer');
            if (highlight) highlight.scrollTop = kwInput.scrollTop;
        });
    }

    if (copyInput) {
        copyInput.addEventListener('input', () => {
             // 🛠️ 修复报错：HTML ID 是 copy-char-count，不是 kt-copy-char-count
             const counter = document.getElementById('copy-char-count'); 
             if (counter) counter.textContent = copyInput.value.length;
        });
    }

    document.getElementById('kt-btn-clean-kw')?.addEventListener('click', cleanKeywordsUI);
    document.getElementById('kt-btn-dedup-kw')?.addEventListener('click', removeDuplicatesUI);
    
    document.getElementById('kt-btn-clear-copy')?.addEventListener('click', () => {
        if(copyInput) {
            copyInput.value = '';
            // 🛠️ 修复报错：同步修改这里
            const counter = document.getElementById('copy-char-count');
            if(counter) counter.textContent = '0';
        }
    });
    
    document.getElementById('kt-btn-paste')?.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            if(copyInput) {
                copyInput.value = text;
                const counter = document.getElementById('copy-char-count');
                if(counter) counter.textContent = text.length;
            }
            showToast("已粘贴");
        } catch(e) { showToast("无法访问剪贴板", "error"); }
    });
    
    document.getElementById('kt-show-translation')?.addEventListener('change', renderCopyDisplay);
}

// ===== Logic: Navigation & UI Control =====

function showModule(moduleName) {
    ['input', 'process', 'analysis'].forEach(m => {
        document.getElementById(`kt-module-${m}`)?.classList.add('hidden'); // 加个 ? 防止报错
        const tab = document.getElementById(`kt-tab-${m}`);
        if (tab) { 
            tab.classList.remove('kt-tab-active', 'bg-white', 'shadow-sm', 'text-blue-600');
            tab.classList.add('text-slate-600');
        }
    });

    const target = document.getElementById(`kt-module-${moduleName}`);
    if (target) target.classList.remove('hidden');

    // 悬浮窗管理
    const floatWin = document.getElementById('kt-keywords-floating');
    const minBtn = document.getElementById('kt-keywords-minimized');

    if (!floatWin || !minBtn) return; // 防御性检查

    if (moduleName === 'process') {
        if (state.isWindowMinimized) {
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

// ===== Logic: Input Handling =====

function updateInputStats() {
    const inputEl = document.getElementById('kt-keywords-input');
    if (!inputEl) return;

    const text = inputEl.value;
    const keywords = KeywordService.parseKeywords(text);
    const countEl = document.getElementById('kt-keyword-count');
    if(countEl) countEl.textContent = keywords.length;
    
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

function highlightDuplicatesInInput() {
    const input = document.getElementById('kt-keywords-input');
    const layer = document.getElementById('kt-keyword-highlight-layer');
    if (!input || !layer) return;

    const dups = KeywordService.findDuplicateKeywords(input.value);
    const lines = input.value.split('\n');
    let html = '';
    
    lines.forEach((line, i) => {
        const trimmed = line.trim().toLowerCase();
        if (trimmed && dups.has(trimmed)) {
            html += `<span class="duplicate">${escapeHtml(line)}</span>`;
        } else {
            html += escapeHtml(line);
        }
        if (i < lines.length - 1) html += '\n';
    });
    layer.innerHTML = html;
}

function cleanKeywordsUI() {
    const inputEl = document.getElementById('kt-keywords-input');
    if(!inputEl) return;
    inputEl.value = KeywordService.cleanKeywordsText(inputEl.value);
    updateInputStats();
    highlightDuplicatesInInput();
}

function removeDuplicatesUI() {
    const inputEl = document.getElementById('kt-keywords-input');
    if(!inputEl) return;
    inputEl.value = KeywordService.deduplicateKeywordsText(inputEl.value);
    updateInputStats();
    highlightDuplicatesInInput();
    showToast("已去重");
}

// ===== Logic: Analysis Execution =====
function startAnalysis() {
    const kwText = document.getElementById('kt-keywords-input').value;
    const copyText = document.getElementById('kt-copy-input').value;

    if (!kwText.trim() || !copyText.trim()) {
        showToast(`请先输入关键词和文案`, "warning");
        return;
    }

    state.keywords = KeywordService.parseKeywords(kwText);
    state.processedCopy = copyText;
    
    state.translationMode = false;
    state.paragraphs = []; 

    const analysisResult = KeywordService.analyzeKeywordMatching(state.processedCopy, state.keywords);
    state.matchedKeywords = analysisResult.matched;
    state.unmatchedKeywords = analysisResult.unmatched;

    state.wordFrequency = KeywordService.calculateWordFrequency(state.processedCopy);

    state.isWindowMinimized = false; 
    updateMinimizedBadge();

    const reportContainer = document.getElementById('kt-llm-analysis-result');
    if (reportContainer) {
        reportContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center py-10 text-slate-400 gap-3">
                <i class="fas fa-sparkles text-3xl opacity-30"></i>
                <p class="text-sm">点击上方按钮，让 AI 为您生成深度诊断报告</p>
            </div>`;
    }

    renderProcessModule();
    renderAnalysisModule();
    
    // 跳转逻辑：优先使用 switchTab 保持左侧同步
    if (window.switchTab) {
        window.switchTab('kw_process');
    } else {
        showModule('process');
    }
    
    showToast("分析完成", "success");
}

// ===== Logic: Rendering & View Helpers =====

function renderProcessModule() {
    const transBtn = document.getElementById('kt-translate-btn');
    const transBtnText = document.getElementById('kt-translate-btn-text');
    const transCheckbox = document.getElementById('kt-show-translation');

    const hasContent = state.processedCopy && state.processedCopy.trim().length > 0;
    const hasTranslationData = state.paragraphs && state.paragraphs.length > 0;

    // A. 翻译按钮逻辑
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

    // B. Checkbox 逻辑
    if (transCheckbox) {
        if (hasTranslationData) {
            transCheckbox.disabled = false;
            if (state.translationMode) transCheckbox.checked = true;
        } else {
            transCheckbox.disabled = true;
            transCheckbox.checked = false;
        }
    }

    renderCopyDisplay();
    renderFloatingKeywords();
    
    const matchedCount = document.getElementById('kt-tab-matched-count');
    if(matchedCount) matchedCount.textContent = state.matchedKeywords.length;
    
    const unmatchedCount = document.getElementById('kt-tab-unmatched-count');
    if(unmatchedCount) unmatchedCount.textContent = state.unmatchedKeywords.length;
    
    updateMinimizedBadge();
}

function renderCopyDisplay() {
    const display = document.getElementById('kt-copy-display');
    if (!display) return;

    const showTrans = document.getElementById('kt-show-translation')?.checked;
    
    if (state.translationMode && state.paragraphs.length > 0) {
        let html = '';
        state.paragraphs.forEach(p => {
             const highlightedOriginal = highlightText(p.original);
             html += `<div class="mb-4">`;
             html += `<div class="paragraph-original leading-relaxed">${highlightedOriginal}</div>`;
             if (showTrans && p.translation) {
                 html += `<div class="sentence-translation">${escapeHtml(p.translation)}</div>`;
             }
             html += `</div>`;
        });
        display.innerHTML = html;
        return;
    }

    display.innerHTML = highlightText(state.processedCopy);
}

function highlightText(text) {
    if (!text) return '';
    if (!state.matchedKeywords || state.matchedKeywords.length === 0) {
        return escapeHtml(text).replace(/\n/g, '<br>');
    }

    const sortedKw = [...state.matchedKeywords].sort((a, b) => b.keyword.length - a.keyword.length);
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

function renderFloatingKeywords() {
    const matchedContainer = document.getElementById('kt-matched-keywords');
    const unmatchedContainer = document.getElementById('kt-unmatched-keywords');
    
    if(matchedContainer) {
        matchedContainer.innerHTML = state.matchedKeywords.map(item => `
            <div class="bg-green-50 border border-green-200 rounded p-2 flex justify-between items-center cursor-pointer hover:bg-green-100 transition-colors"
                 onclick="window.kt_locateKeyword('${escapeAttr(item.keyword)}')">
                <span class="text-sm text-green-800 font-medium">${escapeHtml(item.keyword)}</span>
                <span class="text-xs bg-green-200 text-green-800 px-1.5 rounded-full">${item.count}</span>
            </div>
        `).join('');
    }

    if(unmatchedContainer) {
        unmatchedContainer.innerHTML = state.unmatchedKeywords.map(kw => `
            <div class="bg-red-50 border border-red-200 rounded p-2 text-sm text-red-800">
                ${escapeHtml(kw)}
            </div>
        `).join('');
    }
}

function showKeywordTab(type) {
    const mBtn = document.getElementById('kt-kw-tab-matched');
    const uBtn = document.getElementById('kt-kw-tab-unmatched');
    const mDiv = document.getElementById('kt-matched-keywords');
    const uDiv = document.getElementById('kt-unmatched-keywords');
    
    if(!mBtn || !uBtn) return;

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

function locateKeywordInCopy(keyword) {
    const container = document.getElementById('kt-copy-display');
    if(!container) return;
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

    // 初始化索引
    if (!state.keywordLocationIndex) state.keywordLocationIndex = {};
    let idx = state.keywordLocationIndex[targetKw] || 0;
    if (idx >= spans.length) idx = 0;

    container.querySelectorAll('.highlight-focus').forEach(el => el.classList.remove('highlight-focus'));
    
    const targetSpan = spans[idx];
    targetSpan.classList.add('highlight-focus');

    targetSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    state.keywordLocationIndex[targetKw] = (idx + 1) % spans.length;
    
    showToast(`定位: ${keyword} (${idx+1}/${spans.length})`);
}

function renderAnalysisModule() {
    const total = state.keywords.length;
    const matched = state.matchedKeywords.length;
    const rate = total === 0 ? 0 : Math.round((matched / total) * 100);

    const rateEl = document.getElementById('kt-coverage-rate');
    if(rateEl) rateEl.textContent = rate + '%';
    
    const barEl = document.getElementById('kt-coverage-bar');
    if(barEl) barEl.style.width = rate + '%';
    
    document.getElementById('kt-stat-matched').textContent = matched;
    document.getElementById('kt-stat-unmatched').textContent = state.unmatchedKeywords.length;
    document.getElementById('kt-stat-total').textContent = total;

    const freqList = document.getElementById('kt-word-frequency-list');
    if(freqList) {
        freqList.innerHTML = state.wordFrequency.map(([w, c]) => `
            <span class="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md">
                ${escapeHtml(w)} <span class="text-slate-400">(${c})</span>
            </span>
        `).join('');
    }

    const btn = document.getElementById('kt-analyze-btn');
    const hasContent = state.processedCopy && state.processedCopy.trim().length > 0;

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

// ===== Logic: AI Operations =====

async function runLLMAnalysis() {
    const btn = document.getElementById('kt-analyze-btn');
    
    // if (!state.processedCopy || !state.processedCopy.trim()) {
    //     showToast("请先在输入模块提交文案", "warning");
    //     return;
    // }

    // 🔥🔥🔥 新增校验：检查文案是否为空 🔥🔥🔥
    if (!state.processedCopy || !state.processedCopy.trim()) {
        throw new Error("文案内容为空，无法进行AI分析。请先在左侧输入框填入Listing文案。");
    }

    const resultDiv = document.getElementById('kt-llm-analysis-result');
    
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> 分析中...';
        btn.classList.add('opacity-75', 'cursor-wait');
    }
    
    if(resultDiv) resultDiv.innerHTML = '<div class="text-center py-10"><i class="fas fa-circle-notch fa-spin text-purple-500 text-2xl"></i><p class="mt-2 text-slate-500">AI 正在深度分析您的 Listing (可能需要 20秒)...</p></div>';

    try {
        const response = await KeywordService.fetchListingAnalysis(
            state.processedCopy, 
            state.keywords, 
            state.matchedKeywords, 
            state.unmatchedKeywords
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
        console.error("LLM Analysis Error:", e);
        let errorMsg = e.message;
        if (errorMsg.includes('503')) {
            errorMsg = "服务暂时不可用 (503)。可能是模型过载，请稍后重试。";
        }

        if(resultDiv) {
            resultDiv.innerHTML = `
                <div class="p-4 bg-red-50 border border-red-100 rounded-lg">
                    <div class="flex items-center gap-2 text-red-600 font-bold mb-2">
                        <i class="fas fa-exclamation-triangle"></i> 分析失败
                    </div>
                    <p class="text-sm text-red-800">${errorMsg}</p>
                    <button onclick="window.kt_runLLMAnalysis()" class="mt-3 px-3 py-1 bg-white border border-red-200 text-red-600 text-xs rounded hover:bg-red-50">重试</button>
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

async function translateCopyImmersive() {
    const btn = document.getElementById('kt-translate-btn');
    const progress = document.getElementById('kt-translate-progress');
    const btnText = document.getElementById('kt-translate-btn-text');

    if(btn) btn.disabled = true;
    if(progress) {
        progress.classList.remove('hidden');
        progress.style.width = '30%';
    }
    if(btnText) btnText.textContent = "正在翻译...";

    try {
        const response = await KeywordService.fetchImmersionTranslation(state.processedCopy);
        
        const transLines = response.split(/\n+/).filter(t=>t.trim());
        state.paragraphs = state.processedCopy.split(/\n+/).filter(t=>t.trim()).map((original, i) => ({
            original,
            translation: transLines[i] || "" 
        }));

        state.translationMode = true; 
        
        renderProcessModule(); 
        
        if(progress) progress.style.width = '100%';
        setTimeout(() => progress?.classList.add('hidden'), 500);
        
    } catch (e) {
        showToast("翻译失败: " + e.message, "error");
        if(progress) progress.classList.add('hidden');
        if(btnText) btnText.textContent = "AI 沉浸翻译"; 
        if(btn) btn.disabled = false;
    }
}


// ===== Floating Window & Utilities =====

function setupFloatingWindow() {
    const el = document.getElementById('kt-keywords-floating');
    if(!el) return;
    const header = el.querySelector('.floating-header');
    
    header.addEventListener('mousedown', (e) => {
        floatWin.isDragging = true;
        floatWin.offsetX = e.clientX - el.getBoundingClientRect().left;
        floatWin.offsetY = e.clientY - el.getBoundingClientRect().top;
        
        el.style.opacity = '0.9';
        el.style.transition = 'none'; 
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!floatWin.isDragging) return;
        
        let newX = e.clientX - floatWin.offsetX;
        let newY = e.clientY - floatWin.offsetY;

        const maxX = window.innerWidth - el.offsetWidth;
        const maxY = window.innerHeight - el.offsetHeight;

        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));

        el.style.left = newX + 'px';
        el.style.top = newY + 'px';
        el.style.right = 'auto'; 
    });
    
    document.addEventListener('mouseup', () => {
        if (!floatWin.isDragging) return;
        floatWin.isDragging = false;

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

function syncToInput() {
    const display = document.getElementById('kt-copy-display');
    const input = document.getElementById('kt-copy-input');
    
    if(display && input) {
        const text = display.innerText;
        input.value = text;
        state.processedCopy = text;
        // 修正输入框的计数
        const counter = document.getElementById('copy-char-count');
        if(counter) counter.textContent = text.length;
    }
    
    if (window.switchTab) {
        window.switchTab('kw_input');
    } else {
        showModule('input');
    }
    
    showToast("已同步");
}

function updateMinimizedBadge() {
    const badge = document.getElementById('kt-minimized-badge');
    if(badge && state.matchedKeywords) badge.textContent = state.matchedKeywords.length;
}

function minimizeKeywordsWindow() {
    const floatWinEl = document.getElementById('kt-keywords-floating');
    const minBtn = document.getElementById('kt-keywords-minimized');
    
    if(floatWinEl) {
        floatWinEl.classList.add('opacity-0', 'scale-95');
        setTimeout(() => {
            floatWinEl.classList.add('hidden');
            floatWinEl.classList.remove('opacity-0', 'scale-95'); 
            
            if(minBtn) {
                minBtn.classList.remove('hidden');
                state.isWindowMinimized = true;
            }
        }, 200);
    }
}

function restoreKeywordsWindow() {
    const floatWinEl = document.getElementById('kt-keywords-floating');
    const minBtn = document.getElementById('kt-keywords-minimized');
    
    if(minBtn) minBtn.classList.add('hidden');
    if(floatWinEl) {
        floatWinEl.classList.remove('hidden');
        floatWinEl.classList.add('opacity-0', 'scale-95');
        requestAnimationFrame(() => {
            floatWinEl.classList.remove('opacity-0', 'scale-95');
            floatWinEl.classList.add('transition-all', 'duration-200');
        });
    }
    
    state.isWindowMinimized = false;
}
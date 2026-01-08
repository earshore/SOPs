// src/modules/keyword_tracker/trackerDisplay.js
import { showToast } from "../../common/utils/ui.js";
import * as KeywordService from "./trackerService.js"; 
import state from "../../common/state.js";

// 1. 定义路由映射表 (Route ID -> Internal Module Name)
const ROUTE_MAP = {
    'kw_input': 'input',
    'kw_process': 'process',
    'kw_analysis': 'analysis'
};

// ===== Utils: Performance Helpers (新增性能工具) =====

/**
 * 防抖函数：防止高频输入导致卡顿
 */
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

/**
 * 正则转义：确保关键词中的 + * ? 等符号不破坏正则
 */
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
    
    showModule('input');
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
    
    // ✅ 优化 1：使用防抖处理输入事件 (300ms)
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
             document.getElementById('kt-copy-char-count').textContent = copyInput.value.length;
        });
    }

    document.getElementById('kt-btn-clean-kw')?.addEventListener('click', cleanKeywordsUI);
    document.getElementById('kt-btn-dedup-kw')?.addEventListener('click', removeDuplicatesUI);
    document.getElementById('kt-btn-clear-copy')?.addEventListener('click', () => {
        if(copyInput) {
            copyInput.value = '';
            document.getElementById('kt-copy-char-count').textContent = '0';
        }
    });
    
    document.getElementById('kt-btn-paste')?.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            if(copyInput) {
                copyInput.value = text;
                document.getElementById('kt-copy-char-count').textContent = text.length;
            }
            showToast("已粘贴");
        } catch(e) { showToast("无法访问剪贴板", "error"); }
    });
    
    document.getElementById('kt-show-translation')?.addEventListener('change', renderCopyDisplay);
}

// ===== Logic: Navigation & UI Control =====

function showModule(moduleName) {
    ['input', 'process', 'analysis'].forEach(m => {
        document.getElementById(`kt-module-${m}`).classList.add('hidden');
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
    const text = document.getElementById('kt-keywords-input').value;
    const keywords = KeywordService.parseKeywords(text);
    document.getElementById('kt-keyword-count').textContent = keywords.length;
    
    const dups = KeywordService.findDuplicateKeywords(text);
    const badge = document.getElementById('kt-duplicate-badge');
    const countEl = document.getElementById('kt-duplicate-count');
    
    if (dups.size > 0) {
        badge.classList.remove('hidden');
        countEl.textContent = dups.size;
    } else {
        badge.classList.add('hidden');
    }
}

function highlightDuplicatesInInput() {
    const input = document.getElementById('kt-keywords-input');
    const layer = document.getElementById('kt-keyword-highlight-layer');
    if (!input || !layer) return;

    const dups = KeywordService.findDuplicateKeywords(input.value);
    const lines = input.value.split('\n');
    let html = '';
    const renderedSeen = new Set();

    // 这里由于每一行都需要独立判断，保持遍历即可，暂不需要复杂优化
    lines.forEach((line, i) => {
        const trimmed = line.trim().toLowerCase();
        // 只有当它是重复词，且不是第一次渲染该词时，才标红？
        // 或者：只要在 dups 集合里，全部标红。通常需求是后者。
        // 但为了防止把所有 instance 都标红（包括第一个），我们需要看需求。
        // 这里保持原逻辑：只要在重复列表里，就标红。
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
    inputEl.value = KeywordService.cleanKeywordsText(inputEl.value);
    updateInputStats();
    highlightDuplicatesInInput();
}

function removeDuplicatesUI() {
    const inputEl = document.getElementById('kt-keywords-input');
    inputEl.value = KeywordService.deduplicateKeywordsText(inputEl.value);
    updateInputStats();
    highlightDuplicatesInInput();
    showToast("已去重");
}

// ===== Logic: Analysis Execution =====
// 1️⃣ 修改 startAnalysis：重置报告区域和按钮状态
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

    // ✅ 新增：重置 AI 报告显示区域
    const reportContainer = document.getElementById('kt-llm-analysis-result');
    if (reportContainer) {
        reportContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center py-10 text-slate-400 gap-3">
                <i class="fas fa-sparkles text-3xl opacity-30"></i>
                <p class="text-sm">点击上方按钮，让 AI 为您生成深度诊断报告</p>
            </div>`;
    }

    renderProcessModule();
    
    // ✅ 关键：调用 renderAnalysisModule 来重置按钮状态为“可点击”
    renderAnalysisModule();
    
    if (window.switchTab) {
        window.switchTab('kw_process');
    } else {
        showModule('process');
    }
    
    showToast("分析完成", "success");
}

// ===== Logic: Rendering & View Helpers =====

// 2️⃣ 修改 renderProcessModule：严格控制按钮和 Checkbox 的状态
function renderProcessModule() {
    // --- ⚡️ 核心调整：先处理 UI 控件状态 (Data -> UI Control) ---
    // 必须在 renderCopyDisplay 之前执行，否则 renderCopyDisplay 读取到的 checkbox 状态是旧的
    const hasContent = state.processedCopy && state.processedCopy.trim().length > 0;
    const hasTranslationData = state.paragraphs && state.paragraphs.length > 0;

    const transBtn = document.getElementById('kt-translate-btn');
    const transBtnText = document.getElementById('kt-translate-btn-text');
    const transCheckbox = document.getElementById('kt-show-translation');

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
            // 如果处于翻译模式，强制勾选，确保稍后的 renderCopyDisplay 能显示译文
            if (state.translationMode) transCheckbox.checked = true;
        } else {
            transCheckbox.disabled = true;
            transCheckbox.checked = false;
        }
    }

    // --- 2. 然后再渲染内容 (此时 DOM 上的 checkbox 状态已经是正确的了) ---
    renderCopyDisplay();
    renderFloatingKeywords();
    
    document.getElementById('kt-tab-matched-count').textContent = state.matchedKeywords.length;
    document.getElementById('kt-tab-unmatched-count').textContent = state.unmatchedKeywords.length;
    
    updateMinimizedBadge();
}

function renderCopyDisplay() {
    const display = document.getElementById('kt-copy-display');
    const showTrans = document.getElementById('kt-show-translation')?.checked;
    
    if (state.translationMode && state.paragraphs.length > 0) {
        let html = '';
        state.paragraphs.forEach(p => {
             // 即使在翻译模式下，原文部分也应该高亮关键词
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

/**
 * ✅ 优化 2：高性能文本高亮算法 (Split-Map-Join)
 * 复杂度：O(N)，只扫描一次文本
 */
function highlightText(text) {
    if (!text) return '';
    if (!state.matchedKeywords || state.matchedKeywords.length === 0) {
        return escapeHtml(text).replace(/\n/g, '<br>');
    }

    // 1. 预处理：构建单次扫描正则
    // 按照长度降序排列，确保 "Running Shoes" 优先于 "Running" 匹配
    const sortedKw = [...state.matchedKeywords].sort((a, b) => b.keyword.length - a.keyword.length);
    
    // 构造巨大的正则：(Running Shoes|Running|Shoe|...)
    // 注意：这对特殊字符进行了转义，忽略大小写
    const pattern = sortedKw.map(item => escapeRegex(item.keyword)).join('|');
    const regex = new RegExp(`(${pattern})`, 'gi');

    // 2. 核心算法：Split
    // 利用正则的捕获组 ()，split 会保留分隔符（即匹配到的关键词）
    // "Hello Running Shoes World" -> ["Hello ", "Running Shoes", " World"]
    const parts = text.split(regex);

    // 3. Map & Join
    // 偶数索引是普通文本，奇数索引是捕获到的关键词
    const htmlParts = parts.map((part, index) => {
        if (index % 2 === 1) { 
            // 这是一个关键词匹配
            const lowerKw = part.toLowerCase();
            // 添加 data-kw 用于后续点击定位
            return `<span class="keyword-bold highlightable" data-kw="${escapeAttr(lowerKw)}">${escapeHtml(part)}</span>`;
        } else {
            // 这是普通文本
            return escapeHtml(part);
        }
    });

    // 4. 处理换行符
    return htmlParts.join('').replace(/\n/g, '<br>');
}

function renderFloatingKeywords() {
    const matchedContainer = document.getElementById('kt-matched-keywords');
    const unmatchedContainer = document.getElementById('kt-unmatched-keywords');
    
    matchedContainer.innerHTML = state.matchedKeywords.map(item => `
        <div class="bg-green-50 border border-green-200 rounded p-2 flex justify-between items-center cursor-pointer hover:bg-green-100 transition-colors"
             onclick="window.kt_locateKeyword('${escapeAttr(item.keyword)}')">
            <span class="text-sm text-green-800 font-medium">${escapeHtml(item.keyword)}</span>
            <span class="text-xs bg-green-200 text-green-800 px-1.5 rounded-full">${item.count}</span>
        </div>
    `).join('');

    unmatchedContainer.innerHTML = state.unmatchedKeywords.map(kw => `
        <div class="bg-red-50 border border-red-200 rounded p-2 text-sm text-red-800">
            ${escapeHtml(kw)}
        </div>
    `).join('');
}

function showKeywordTab(type) {
    const mBtn = document.getElementById('kt-kw-tab-matched');
    const uBtn = document.getElementById('kt-kw-tab-unmatched');
    const mDiv = document.getElementById('kt-matched-keywords');
    const uDiv = document.getElementById('kt-unmatched-keywords');

    if (type === 'matched') {
        mBtn.className = "flex-1 py-2 text-sm font-medium bg-green-100 text-green-700 shadow-sm rounded-lg smooth-transition";
        uBtn.className = "flex-1 py-2 text-sm font-medium text-slate-500 hover:text-red-600 rounded-lg smooth-transition";
        mDiv.classList.remove('hidden');
        uDiv.classList.add('hidden');
    } else {
        uBtn.className = "flex-1 py-2 text-sm font-medium bg-red-100 text-red-700 shadow-sm rounded-lg smooth-transition";
        mBtn.className = "flex-1 py-2 text-sm font-medium text-slate-500 hover:text-green-600 rounded-lg smooth-transition";
        uDiv.classList.remove('hidden');
        mDiv.classList.add('hidden');
    }
}

/**
 * 📍 优化版：智能定位函数
 * 逻辑：可视区域内不滚动，可视区域外平滑滚动
 */
// 修改点 2：增强版定位函数
// 解决：1. 恢复强制滚动；2. 解决短词被长词覆盖无法定位的问题
function locateKeywordInCopy(keyword) {
    const container = document.getElementById('kt-copy-display');
    const targetKw = keyword.toLowerCase();
    
    // 1. 尝试精确匹配 (data-kw 等于 keyword)
    let spans = Array.from(container.querySelectorAll(`.highlightable`)).filter(el => 
        el.getAttribute('data-kw') === targetKw
    );

    // 2. ✅ 智能回退：如果精确匹配找不到，尝试“模糊匹配”
    // 即寻找 data-kw 中“包含”该关键词的元素
    // 例如：搜 "running"，文中只有 "running shoes"，则定位到 "running shoes"
    if (spans.length === 0) {
        spans = Array.from(container.querySelectorAll(`.highlightable`)).filter(el => {
            const elKw = el.getAttribute('data-kw');
            return elKw && elKw.includes(targetKw);
        });
        
        if (spans.length > 0) {
            // 可选：提示用户发生了智能匹配
            // showToast(`定位到包含 "${keyword}" 的长尾词`, 'info');
        }
    }

    if (spans.length === 0) {
        showToast(`未找到关键词: ${keyword}`, 'warning');
        return;
    }

    // 3. 索引循环逻辑
    let idx = state.keywordLocationIndex[targetKw] || 0;
    if (idx >= spans.length) idx = 0;

    // 4. UI 反馈
    container.querySelectorAll('.highlight-focus').forEach(el => el.classList.remove('highlight-focus'));
    
    const targetSpan = spans[idx];
    targetSpan.classList.add('highlight-focus');

    // 5. ✅ 恢复：强制滚动到中心
    // 满足运营人员逐个检查的需求，确保视线始终聚焦在当前项
    targetSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // 更新索引
    state.keywordLocationIndex[targetKw] = (idx + 1) % spans.length;
    
    showToast(`定位: ${keyword} (${idx+1}/${spans.length})`);
}
// 2️⃣ 修改 renderAnalysisModule：初始化按钮状态
function renderAnalysisModule() {
    const total = state.keywords.length;
    const matched = state.matchedKeywords.length;
    const rate = total === 0 ? 0 : Math.round((matched / total) * 100);

    document.getElementById('kt-coverage-rate').textContent = rate + '%';
    document.getElementById('kt-coverage-bar').style.width = rate + '%';
    document.getElementById('kt-stat-matched').textContent = matched;
    document.getElementById('kt-stat-unmatched').textContent = state.unmatchedKeywords.length;
    document.getElementById('kt-stat-total').textContent = total;

    document.getElementById('kt-word-frequency-list').innerHTML = state.wordFrequency.map(([w, c]) => `
        <span class="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md">
            ${escapeHtml(w)} <span class="text-slate-400">(${c})</span>
        </span>
    `).join('');

    // ✅ 新增：根据文案是否存在，控制按钮初始状态
    const btn = document.getElementById('kt-analyze-btn');
    const hasContent = state.processedCopy && state.processedCopy.trim().length > 0;

    if (btn) {
        // 注意：这里我们只负责“有文案就点亮”，具体的“生成后变灰”由 runLLMAnalysis 控制
        // 但为了防止 startAnalysis 后按钮还是灰的，这里必须重置为可用
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

// 3️⃣ 修改 runLLMAnalysis：生成后禁用按钮
async function runLLMAnalysis() {
    const btn = document.getElementById('kt-analyze-btn');
    
    // 双重检查：防止直接调用 JS 绕过
    if (!state.processedCopy || !state.processedCopy.trim()) {
        showToast("请先在输入模块提交文案", "warning");
        return;
    }

    const resultDiv = document.getElementById('kt-llm-analysis-result');
    
    // UI Loading 状态
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> 分析中...';
        btn.classList.add('opacity-75', 'cursor-wait');
    }
    
    resultDiv.innerHTML = '<div class="text-center py-10"><i class="fas fa-circle-notch fa-spin text-purple-500 text-2xl"></i><p class="mt-2 text-slate-500">AI 正在深度分析您的 Listing (可能需要 30秒)...</p></div>';

    try {
        const response = await KeywordService.fetchListingAnalysis(
            state.processedCopy, 
            state.keywords, 
            state.matchedKeywords, 
            state.unmatchedKeywords
        );
        
        if (window.marked) {
            resultDiv.innerHTML = window.marked.parse(response);
        } else {
            resultDiv.textContent = response;
        }

        // ✅ 成功后：保持禁用状态，并修改文案
        if (btn) {
            btn.disabled = true; // 保持禁用，节省 Token
            btn.innerHTML = '<i class="fas fa-check"></i> 报告已生成';
            // 样式改为灰色，明确告知不可点
            btn.classList.remove('bg-purple-600', 'text-white', 'hover:bg-purple-700', 'opacity-75', 'cursor-wait');
            btn.classList.add('bg-gray-300', 'text-gray-500', 'cursor-not-allowed');
        }
        showToast("报告生成成功", "success");

    } catch (e) {
        console.error("LLM Analysis Error:", e);
        let errorMsg = e.message;
        if (errorMsg.includes('503')) {
            errorMsg = "服务暂时不可用 (503)。可能是模型过载，请稍后重试。";
        }

        resultDiv.innerHTML = `
            <div class="p-4 bg-red-50 border border-red-100 rounded-lg">
                <div class="flex items-center gap-2 text-red-600 font-bold mb-2">
                    <i class="fas fa-exclamation-triangle"></i> 分析失败
                </div>
                <p class="text-sm text-red-800">${errorMsg}</p>
                <button onclick="window.kt_runLLMAnalysis()" class="mt-3 px-3 py-1 bg-white border border-red-200 text-red-600 text-xs rounded hover:bg-red-50">重试</button>
            </div>
        `;

        // ❌ 失败后：恢复按钮可用，允许重试
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-magic"></i> 重试生成';
            btn.classList.remove('bg-gray-300', 'text-gray-500', 'cursor-not-allowed', 'opacity-75', 'cursor-wait');
            btn.classList.add('bg-purple-600', 'text-white', 'hover:bg-purple-700');
        }
    }
}

// 3️⃣ 修改 translateCopyImmersive：翻译成功后刷新 UI 状态
async function translateCopyImmersive() {
    const btn = document.getElementById('kt-translate-btn');
    const progress = document.getElementById('kt-translate-progress');
    const btnText = document.getElementById('kt-translate-btn-text');

    btn.disabled = true;
    progress.classList.remove('hidden');
    progress.style.width = '30%';
    btnText.textContent = "正在翻译...";

    try {
        const response = await KeywordService.fetchImmersionTranslation(state.processedCopy);
        
        const transLines = response.split(/\n+/).filter(t=>t.trim());
        state.paragraphs = state.processedCopy.split(/\n+/).filter(t=>t.trim()).map((original, i) => ({
            original,
            translation: transLines[i] || "" 
        }));

        state.translationMode = true; // 标记进入翻译模式
        
        // ⚡️ 核心调整：只调用 renderProcessModule 即可
        // 因为我们在 renderProcessModule 里修复了顺序，它会正确处理 checkbox 并渲染内容
        renderProcessModule(); 
        
        progress.style.width = '100%';
        setTimeout(() => progress.classList.add('hidden'), 500);
        
    } catch (e) {
        showToast("翻译失败: " + e.message, "error");
        progress.classList.add('hidden');
        btnText.textContent = "AI 沉浸翻译"; 
        btn.disabled = false;
    }
}


// ===== Floating Window & Utilities =====

/**
 * 🧲 优化版：悬浮窗逻辑 (带磁性吸附)
 */
function setupFloatingWindow() {
    const el = document.getElementById('kt-keywords-floating');
    const header = el.querySelector('.floating-header');
    
    // 拖拽开始
    header.addEventListener('mousedown', (e) => {
        floatWin.isDragging = true;
        // 记录鼠标相对窗口左上角的偏移量
        floatWin.offsetX = e.clientX - el.getBoundingClientRect().left;
        floatWin.offsetY = e.clientY - el.getBoundingClientRect().top;
        
        // 拖拽时稍微降低透明度，提升性能感
        el.style.opacity = '0.9';
        el.style.transition = 'none'; // 拖拽时移除过渡，消除延迟感
        e.preventDefault();
    });
    
    // 拖拽过程 (绑定在 document 上防止甩脱)
    document.addEventListener('mousemove', (e) => {
        if (!floatWin.isDragging) return;
        
        let newX = e.clientX - floatWin.offsetX;
        let newY = e.clientY - floatWin.offsetY;

        // 边界检查：防止拖出屏幕
        const maxX = window.innerWidth - el.offsetWidth;
        const maxY = window.innerHeight - el.offsetHeight;

        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));

        el.style.left = newX + 'px';
        el.style.top = newY + 'px';
        el.style.right = 'auto'; 
    });
    
    // 拖拽结束：执行磁性吸附
    document.addEventListener('mouseup', () => {
        if (!floatWin.isDragging) return;
        floatWin.isDragging = false;

        el.style.opacity = '1';
        el.style.transition = 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)'; // 恢复回弹动画

        // 获取当前位置
        const rect = el.getBoundingClientRect();
        const screenWidth = window.innerWidth;
        const threshold = 100; // 吸附阈值

        // 逻辑：如果在左边 100px 内，吸附到左边；如果在右边 100px 内，吸附到右边
        if (rect.left < threshold) {
            el.style.left = '20px';
        } else if (rect.right > screenWidth - threshold) {
            el.style.left = (screenWidth - rect.width - 20) + 'px';
        }
    });
}

function syncToInput() {
    // 获取当前显示的纯文本（过滤掉 HTML 标签）
    const text = document.getElementById('kt-copy-display').innerText;
    document.getElementById('kt-copy-input').value = text;
    state.processedCopy = text;
    
    // ⚡️ 核心修复：使用全局路由跳转，确保左侧菜单高亮跟随变化
    if (window.switchTab) {
        window.switchTab('kw_input');
    } else {
        showModule('input');
    }
    
    showToast("已同步");
}

function updateMinimizedBadge() {
    const badge = document.getElementById('kt-minimized-badge');
    if(badge) badge.textContent = state.matchedKeywords.length;
}

function minimizeKeywordsWindow() {
    const floatWinEl = document.getElementById('kt-keywords-floating');
    const minBtn = document.getElementById('kt-keywords-minimized');
    
    floatWinEl.classList.add('opacity-0', 'scale-95');
    setTimeout(() => {
        floatWinEl.classList.add('hidden');
        floatWinEl.classList.remove('opacity-0', 'scale-95'); 
        
        minBtn.classList.remove('hidden');
        state.isWindowMinimized = true;
    }, 200);
}

function restoreKeywordsWindow() {
    const floatWinEl = document.getElementById('kt-keywords-floating');
    const minBtn = document.getElementById('kt-keywords-minimized');
    
    minBtn.classList.add('hidden');
    floatWinEl.classList.remove('hidden');
    
    floatWinEl.classList.add('opacity-0', 'scale-95');
    requestAnimationFrame(() => {
        floatWinEl.classList.remove('opacity-0', 'scale-95');
        floatWinEl.classList.add('transition-all', 'duration-200');
    });
    
    state.isWindowMinimized = false;
}
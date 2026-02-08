import { escapeHtml } from '@/common/utils/security';
import { loadTemplate } from "../../../../../common/utils/viewLoader.js";
import { 
    PROMPT_LIBRARY, 
    PROMPT_CATEGORIES, 
    getPromptsByCategory, 
    getPromptById,
    searchPrompts,
    getModelInfo 
} from "./constants/promptLibrary.js";
import { showToast } from "../../../../../common/utils/ui.js";
import './prompts_style.css';

let currentCategory = 'all';
let currentPrompt = null;
let currentLang = 'zh'; // 默认中文

// More - 提示词页面
export async function mount(container) {
    const html = await loadTemplate('src/modules/more/views/explore/prompts/template.html');
    // ✅ 安全: 静态HTML模板，无用户输入
    container.innerHTML = html;
    container.classList.add('fade-in');

    initEventListeners();
    renderCategories();
    renderPromptList();

    console.log("✅ 提示词模块已挂载");
}

export function unmount() {
    currentCategory = 'all';
    currentPrompt = null;
    console.log("❌ 提示词模块已卸载");
}

function initEventListeners() {
    // 搜索功能
    const searchInput = document.getElementById('prompt-search');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }

    // 分类切换
    document.addEventListener('click', (e) => {
        if (e.target.closest('.category-btn')) {
            const btn = e.target.closest('.category-btn');
            handleCategoryChange(btn.dataset.category);
        }
    });
}

function handleSearch(e) {
    const keyword = e.target.value.trim();
    if (keyword) {
        const results = searchPrompts(keyword);
        renderPromptList(results);
    } else {
        renderPromptList();
    }
}

function handleCategoryChange(category) {
    currentCategory = category;
    
    // 更新按钮状态
    document.querySelectorAll('.category-btn').forEach(btn => {
        if (btn.dataset.category === category) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    renderPromptList();
}

function renderCategories() {
    const container = document.getElementById('category-container');
    if (!container) return;

    const allBtn = `
        <button class="category-btn active" data-category="all">
            <i class="fas fa-th"></i>
            <span>全部</span>
        </button>
    `;

    const categoryBtns = Object.values(PROMPT_CATEGORIES).map(cat => `
        <button class="category-btn" data-category="${cat.id}">
            <i class="fas ${cat.icon}"></i>
            <span>${cat.name}</span>
        </button>
    `).join('');

    // ✅ 安全: 静态HTML模板，无用户输入
    container.innerHTML = allBtn + categoryBtns;
}

function renderPromptList(prompts = null) {
    const container = document.getElementById('prompt-list');
    if (!container) return;

    const promptsToRender = prompts || getPromptsByCategory(currentCategory);

    if (promptsToRender.length === 0) {
        // ✅ 安全: 静态HTML模板，无用户输入
        container.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i class="fas fa-search text-4xl text-slate-300 mb-4"></i>
                <p class="text-slate-500">未找到匹配的提示词</p>
            </div>
        `;
        return;
    }

    // ✅ 安全: 静态HTML模板，无用户输入
    container.innerHTML = promptsToRender.map(prompt => {
        // 通过 id 查找分类
        const category = Object.values(PROMPT_CATEGORIES).find(cat => cat.id === prompt.category);
        const model = getModelInfo(prompt.recommendedModel);
        
        return `
            <div class="prompt-card group" data-prompt-id="${prompt.id}">
                <div class="flex items-start justify-between mb-3">
                    <span class="category-badge ${category.color}">
                        <i class="fas ${category.icon}"></i>
                        ${category.name}
                    </span>
                    <span class="model-badge">
                        ${model.badge}
                    </span>
                </div>
                
                <h3 class="prompt-title">${prompt.title}</h3>
                <p class="prompt-description">${prompt.description}</p>
                
                <div class="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                    <div class="flex items-center gap-2 text-xs text-slate-500">
                        <i class="fas fa-robot"></i>
                        <span>${model.name}</span>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="window.viewPrompt('${prompt.id}')" 
                                class="btn-icon" title="查看详情">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="window.copyPrompt('${prompt.id}')" 
                                class="btn-icon" title="复制提示词">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 全局函数
window.viewPrompt = function(promptId) {
    const prompt = getPromptById(promptId);
    if (!prompt) return;

    currentPrompt = prompt;
    const modal = document.getElementById('prompt-detail-modal');
    if (!modal) return;

    // 通过 id 查找分类
    const category = Object.values(PROMPT_CATEGORIES).find(cat => cat.id === prompt.category);
    const model = getModelInfo(prompt.recommendedModel);

    document.getElementById('modal-prompt-title').textContent = prompt.title;
    document.getElementById('modal-prompt-category').innerHTML = `
        <i class="fas ${escapeHtml(category.icon)}"></i> ${escapeHtml(category.name)}
    `;
    document.getElementById('modal-prompt-model').textContent = model.name;
    document.getElementById('modal-prompt-description').textContent = prompt.description;
    
    // 显示当前语言的提示词
    updatePromptContent();
    
    // 更新语言切换按钮状态
    updateLangButtons();

    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

window.switchPromptLang = function(lang) {
    currentLang = lang;
    updatePromptContent();
    updateLangButtons();
};

function updatePromptContent() {
    if (!currentPrompt) return;
    
    const contentEl = document.getElementById('modal-prompt-content');
    const promptText = currentLang === 'zh' ? currentPrompt.prompt : (currentPrompt.promptEn || currentPrompt.prompt);
    
    if (contentEl) {
        contentEl.textContent = promptText;
    }
    
    // 如果没有英文版本,显示提示
    const enBtn = document.querySelector('[data-lang="en"]');
    if (enBtn) {
        if (!currentPrompt.promptEn) {
            enBtn.disabled = true;
            enBtn.title = '英文版本开发中';
        } else {
            enBtn.disabled = false;
            enBtn.title = 'English Version';
        }
    }
}

function updateLangButtons() {
    document.querySelectorAll('.lang-btn').forEach(btn => {
        if (btn.dataset.lang === currentLang) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

window.closePromptModal = function() {
    const modal = document.getElementById('prompt-detail-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};

window.copyPrompt = function(promptId) {
    const prompt = getPromptById(promptId);
    if (!prompt) return;

    navigator.clipboard.writeText(prompt.prompt).then(() => {
        showToast('提示词已复制到剪贴板', 'success');
    }).catch(() => {
        showToast('复制失败,请手动复制', 'error');
    });
};

window.copyModalPrompt = function() {
    if (!currentPrompt) return;
    
    // 复制当前显示语言的提示词
    const promptText = currentLang === 'zh' ? currentPrompt.prompt : (currentPrompt.promptEn || currentPrompt.prompt);
    
    navigator.clipboard.writeText(promptText).then(() => {
        const langName = currentLang === 'zh' ? '中文' : '英文';
        showToast(`${langName}提示词已复制到剪贴板`, 'success');
    }).catch(() => {
        showToast('复制失败,请手动复制', 'error');
    });
};

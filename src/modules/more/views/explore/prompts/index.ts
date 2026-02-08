/**
 * More 模块 - 提示词页面
 * 提示词库浏览、搜索和复制功能
 */

import BaseModule from '../../../../../common/BaseModule';
import { escapeHtml } from '../../../../../common/utils/security';
import { loadTemplate } from '../../../../../common/utils/viewLoader';
import {
    PROMPT_CATEGORIES,
    getPromptsByCategory,
    getPromptById,
    searchPrompts,
    getModelInfo,
} from './constants/promptLibrary';
import { showToast } from '../../../../../common/ui';
import './prompts_style.css';

// 类型定义
interface Prompt {
    id: string;
    title: string;
    description: string;
    category: string;
    prompt: string;
    promptEn?: string;
    recommendedModel: string;
}

interface PromptCategory {
    id: string;
    name: string;
    icon: string;
    color: string;
}

let currentCategory = 'all';
let currentPrompt: Prompt | null = null;
let currentLang: 'zh' | 'en' = 'zh'; // 默认中文

/**
 * 初始化事件监听
 */
function initEventListeners(): void {
    // 搜索功能
    const searchInput = document.getElementById('prompt-search') as HTMLInputElement;
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }

    // 分类切换
    document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('.category-btn')) {
            const btn = target.closest('.category-btn') as HTMLElement;
            const category = btn.dataset.category;
            if (category) {
                handleCategoryChange(category);
            }
        }
    });
}

/**
 * 处理搜索
 */
function handleSearch(e: Event): void {
    const target = e.target as HTMLInputElement;
    const keyword = target.value.trim();
    if (keyword) {
        const results = searchPrompts(keyword);
        renderPromptList(results);
    } else {
        renderPromptList();
    }
}

/**
 * 处理分类切换
 */
function handleCategoryChange(category: string): void {
    currentCategory = category;

    // 更新按钮状态
    document.querySelectorAll('.category-btn').forEach((btn) => {
        if ((btn as HTMLElement).dataset.category === category) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    renderPromptList();
}

/**
 * 渲染分类按钮
 */
function renderCategories(): void {
    const container = document.getElementById('category-container');
    if (!container) return;

    const allBtn = `
        <button class="category-btn active" data-category="all">
            <i class="fas fa-th"></i>
            <span>全部</span>
        </button>
    `;

    const categoryBtns = Object.values(PROMPT_CATEGORIES as Record<string, PromptCategory>)
        .map(
            (cat) => `
        <button class="category-btn" data-category="${cat.id}">
            <i class="fas ${cat.icon}"></i>
            <span>${cat.name}</span>
        </button>
    `
        )
        .join('');

    // ✅ 安全: 静态HTML模板，无用户输入
    container.innerHTML = allBtn + categoryBtns;
}

/**
 * 渲染提示词列表
 */
function renderPromptList(prompts: Prompt[] | null = null): void {
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
    container.innerHTML = promptsToRender
        .map((prompt) => {
            // 通过 id 查找分类
            const category = Object.values(PROMPT_CATEGORIES as Record<string, PromptCategory>).find(
                (cat) => cat.id === prompt.category
            );
            const model = getModelInfo(prompt.recommendedModel);

            if (!category) return '';

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
        })
        .join('');
}

/**
 * 更新提示词内容
 */
function updatePromptContent(): void {
    if (!currentPrompt) return;

    const contentEl = document.getElementById('modal-prompt-content');
    const promptText =
        currentLang === 'zh' ? currentPrompt.prompt : currentPrompt.promptEn || currentPrompt.prompt;

    if (contentEl) {
        contentEl.textContent = promptText;
    }

    // 如果没有英文版本,显示提示
    const enBtn = document.querySelector('[data-lang="en"]') as HTMLButtonElement;
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

/**
 * 更新语言按钮状态
 */
function updateLangButtons(): void {
    document.querySelectorAll('.lang-btn').forEach((btn) => {
        if ((btn as HTMLElement).dataset.lang === currentLang) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// 扩展Window接口
declare global {
    interface Window {
        viewPrompt?: (promptId: string) => void;
        switchPromptLang?: (lang: 'zh' | 'en') => void;
        closePromptModal?: () => void;
        copyPrompt?: (promptId: string) => void;
        copyModalPrompt?: () => void;
    }
}

// 全局函数 - 查看提示词详情
window.viewPrompt = function (promptId: string): void {
    const prompt = getPromptById(promptId);
    if (!prompt) return;

    currentPrompt = prompt as Prompt;
    const modal = document.getElementById('prompt-detail-modal');
    if (!modal) return;

    // 通过 id 查找分类
    const category = Object.values(PROMPT_CATEGORIES as Record<string, PromptCategory>).find(
        (cat) => cat.id === prompt.category
    );
    const model = getModelInfo(prompt.recommendedModel);

    if (!category) return;

    const titleEl = document.getElementById('modal-prompt-title');
    const categoryEl = document.getElementById('modal-prompt-category');
    const modelEl = document.getElementById('modal-prompt-model');
    const descEl = document.getElementById('modal-prompt-description');

    if (titleEl) titleEl.textContent = prompt.title;
    if (categoryEl) {
        categoryEl.innerHTML = `
            <i class="fas ${escapeHtml(category.icon)}"></i> ${escapeHtml(category.name)}
        `;
    }
    if (modelEl) modelEl.textContent = model.name;
    if (descEl) descEl.textContent = prompt.description;

    // 显示当前语言的提示词
    updatePromptContent();

    // 更新语言切换按钮状态
    updateLangButtons();

    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

// 全局函数 - 切换语言
window.switchPromptLang = function (lang: 'zh' | 'en'): void {
    currentLang = lang;
    updatePromptContent();
    updateLangButtons();
};

// 全局函数 - 关闭模态框
window.closePromptModal = function (): void {
    const modal = document.getElementById('prompt-detail-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};

// 全局函数 - 复制提示词
window.copyPrompt = function (promptId: string): void {
    const prompt = getPromptById(promptId);
    if (!prompt) return;

    navigator.clipboard
        .writeText(prompt.prompt)
        .then(() => {
            showToast('提示词已复制到剪贴板', 'success');
        })
        .catch(() => {
            showToast('复制失败,请手动复制', 'error');
        });
};

// 全局函数 - 复制模态框中的提示词
window.copyModalPrompt = function (): void {
    if (!currentPrompt) return;

    // 复制当前显示语言的提示词
    const promptText =
        currentLang === 'zh' ? currentPrompt.prompt : currentPrompt.promptEn || currentPrompt.prompt;

    navigator.clipboard
        .writeText(promptText)
        .then(() => {
            const langName = currentLang === 'zh' ? '中文' : '英文';
            showToast(`${langName}提示词已复制到剪贴板`, 'success');
        })
        .catch(() => {
            showToast('复制失败,请手动复制', 'error');
        });
};

// Module class
class PromptsModule extends BaseModule {
    /**
     * 挂载模块
     */
    async mount(container: HTMLElement): Promise<void> {
        const html = await loadTemplate('src/modules/more/views/explore/prompts/template.html');
        // ✅ 安全: 静态HTML模板，无用户输入
        container.innerHTML = html;
        container.classList.add('fade-in');

        initEventListeners();
        renderCategories();
        renderPromptList();

        console.log('✅ 提示词模块已挂载');
    }

    /**
     * 卸载模块
     */
    unmount(): void {
        currentCategory = 'all';
        currentPrompt = null;

        // 清理全局函数
        delete window.viewPrompt;
        delete window.switchPromptLang;
        delete window.closePromptModal;
        delete window.copyPrompt;
        delete window.copyModalPrompt;

        console.log('❌ 提示词模块已卸载');
    }
}

// 导出模块实例
const promptsModule = new PromptsModule('more_prompts');

export const mount = (container: HTMLElement) => promptsModule.mount(container);
export const unmount = () => promptsModule.unmount();

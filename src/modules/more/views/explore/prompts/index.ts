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
    type PromptItem,
    type PromptCategory,
    type PromptCategoryId,
} from './constants/promptLibrary';
import { showToast } from '../../../../../common/ui';
import { Logger } from '../../../../../services/loggerService';
import './prompts_style.css';

// 使用导入的类型别名
type Prompt = PromptItem;

let currentCategory: PromptCategoryId | 'all' = 'all';
let currentPrompt: Prompt | null = null;
let currentLang: 'zh' | 'en' = 'zh';
let currentKeyword = '';
let moduleRoot: HTMLElement | null = null;
let searchInputRef: HTMLInputElement | null = null;
let promptModalRef: HTMLElement | null = null;

function getPromptModal(): HTMLElement | null {
    return promptModalRef || (document.getElementById('prompt-detail-modal') as HTMLElement | null);
}

function mountPromptModal(root: HTMLElement): void {
    const modal = root.querySelector('#prompt-detail-modal') as HTMLElement | null;
    if (!modal) return;

    promptModalRef = modal;
    document.body.appendChild(modal);
}

function removePromptModal(): void {
    promptModalRef?.remove();
    promptModalRef = null;
}

function getCategoryById(categoryId: PromptCategoryId): PromptCategory | undefined {

    return Object.values(PROMPT_CATEGORIES as Record<string, PromptCategory>).find(
        (cat) => cat.id === categoryId
    );
}

function getVisiblePrompts(): readonly Prompt[] {
    if (currentKeyword) {
        return searchPrompts(currentKeyword, currentCategory);
    }

    return getPromptsByCategory(currentCategory);
}

function handleModuleClick(e: Event): void {
    const target = e.target as HTMLElement | null;
    if (!target || !moduleRoot) return;

    const actionBtn = target.closest('[data-action][data-prompt-id]') as HTMLElement | null;
    if (actionBtn && moduleRoot.contains(actionBtn)) {
        const promptId = actionBtn.dataset.promptId;
        const action = actionBtn.dataset.action;

        if (!promptId) return;

        if (action === 'view-prompt') {
            window.viewPrompt?.(promptId);
        } else if (action === 'copy-prompt') {
            window.copyPrompt?.(promptId);
        }
        return;
    }

    const categoryBtn = target.closest('.category-btn') as HTMLElement | null;
    if (categoryBtn && moduleRoot.contains(categoryBtn)) {
        const category = categoryBtn.dataset.category;
        if (category) {
            handleCategoryChange(category);
        }
        return;
    }


    const promptCard = target.closest('.prompt-card[data-prompt-id]') as HTMLElement | null;

    if (promptCard && moduleRoot.contains(promptCard)) {
        const promptId = promptCard.dataset.promptId;
        if (promptId) {
            window.viewPrompt?.(promptId);
        }
    }
}

function handleModalBackdropClick(e: Event): void {
    const modal = getPromptModal();
    if (!modal) return;

    const target = e.target as HTMLElement | null;
    if (target === modal) {
        window.closePromptModal?.();
    }
}

function handleDocumentKeydown(e: KeyboardEvent): void {
    if (e.key !== 'Escape') return;

    const modal = getPromptModal();
    if (modal && !modal.classList.contains('hidden')) {
        window.closePromptModal?.();
    }
}

/**
 * 初始化事件监听
 */
function initEventListeners(root: HTMLElement): void {
    moduleRoot = root;
    searchInputRef = root.querySelector('#prompt-search');

    searchInputRef?.addEventListener('input', handleSearch);
    root.addEventListener('click', handleModuleClick);
    getPromptModal()?.addEventListener('click', handleModalBackdropClick);
    document.addEventListener('keydown', handleDocumentKeydown);
}

function removeEventListeners(): void {
    searchInputRef?.removeEventListener('input', handleSearch);
    moduleRoot?.removeEventListener('click', handleModuleClick);
    getPromptModal()?.removeEventListener('click', handleModalBackdropClick);
    document.removeEventListener('keydown', handleDocumentKeydown);

    searchInputRef = null;
    moduleRoot = null;
}



/**
 * 处理搜索
 */
function handleSearch(e: Event): void {
    const target = e.target as HTMLInputElement;
    currentKeyword = target.value.trim();
    renderPromptList();
}


/**
 * 处理分类切换
 */
function handleCategoryChange(category: string): void {
    currentCategory = category as PromptCategoryId | 'all';

    moduleRoot?.querySelectorAll('.category-btn').forEach((btn) => {
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
    const container = moduleRoot?.querySelector('#category-container') as HTMLElement | null;

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
function renderPromptList(): void {
    const container = moduleRoot?.querySelector('#prompt-list') as HTMLElement | null;
    if (!container) return;

    const promptsToRender = getVisiblePrompts();

    if (promptsToRender.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i class="fas fa-search text-4xl text-slate-300 mb-4"></i>
                <p class="text-slate-500">未找到匹配的提示词</p>
            </div>
        `;
        return;
    }

    container.innerHTML = promptsToRender
        .map((prompt) => {
            const category = getCategoryById(prompt.category);
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
                        <button type="button" data-action="view-prompt" data-prompt-id="${prompt.id}"
                                class="btn-icon" title="查看详情">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button type="button" data-action="copy-prompt" data-prompt-id="${prompt.id}"
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

function registerWindowActions(): void {
    window.viewPrompt = (promptId: string): void => {
        const prompt = getPromptById(promptId);
        if (!prompt) return;

        currentPrompt = prompt as Prompt;
        currentLang = 'zh';

        const modal = getPromptModal();
        if (!modal) return;


        const category = getCategoryById(prompt.category);
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

        updatePromptContent();
        updateLangButtons();

        modal.classList.remove('hidden');
        modal.classList.add('flex');
    };

    window.switchPromptLang = (lang: 'zh' | 'en'): void => {
        currentLang = lang;
        updatePromptContent();
        updateLangButtons();
    };

    window.closePromptModal = (): void => {
        const modal = getPromptModal();
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    };


    window.copyPrompt = (promptId: string): void => {
        const prompt = getPromptById(promptId);
        if (!prompt) return;

        navigator.clipboard
            .writeText(prompt.prompt)
            .then(() => {
                showToast('提示词已复制到剪贴板', { type: 'success' });
            })
            .catch(() => {
                showToast('复制失败,请手动复制', { type: 'error' });
            });
    };

    window.copyModalPrompt = (): void => {
        if (!currentPrompt) return;

        const promptText =
            currentLang === 'zh' ? currentPrompt.prompt : currentPrompt.promptEn || currentPrompt.prompt;

        navigator.clipboard
            .writeText(promptText)
            .then(() => {
                const langName = currentLang === 'zh' ? '中文' : '英文';
                showToast(`${langName}提示词已复制到剪贴板`, { type: 'success' });
            })
            .catch(() => {
                showToast('复制失败,请手动复制', { type: 'error' });
            });
    };
}

function unregisterWindowActions(): void {
    delete window.viewPrompt;
    delete window.switchPromptLang;
    delete window.closePromptModal;
    delete window.copyPrompt;
    delete window.copyModalPrompt;
}


// Module class
class PromptsModule extends BaseModule {
    /**
     * 挂载模块
     */
    async mount(container: HTMLElement): Promise<void> {
        const html = await loadTemplate('src/modules/more/views/explore/prompts/template.html');

        currentCategory = 'all';
        currentPrompt = null;
        currentLang = 'zh';
        currentKeyword = '';
        removePromptModal();

        container.innerHTML = html;
        container.classList.add('fade-in');

        mountPromptModal(container);
        registerWindowActions();
        initEventListeners(container);
        renderCategories();
        renderPromptList();

        Logger.debug('✅ 提示词模块已挂载');
    }



    /**
     * 卸载模块
     */
    unmount(): void {
        window.closePromptModal?.();
        removeEventListeners();
        unregisterWindowActions();
        removePromptModal();

        currentCategory = 'all';
        currentPrompt = null;
        currentLang = 'zh';
        currentKeyword = '';

        Logger.debug('❌ 提示词模块已卸载');
    }


}

// 导出模块实例
const promptsModule = new PromptsModule('more_prompts');

export const mount = (container: HTMLElement) => promptsModule.mount(container);
export const unmount = () => promptsModule.unmount();

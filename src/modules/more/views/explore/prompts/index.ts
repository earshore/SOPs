/**
 * More 模块 - 提示词页面
 * 提示词库浏览、搜索和复制功能
 */

import BaseModule from '../../../../../common/BaseModule';
import { setSafeHtml } from '../../../../../common/utils/security';
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

function clearElement(element: Element): void {
    element.textContent = '';
}

function appendIcon(parent: Element, className: string): HTMLElement {
    const icon = document.createElement('i');
    icon.className = className;
    parent.appendChild(icon);
    return icon;
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
    const actionBtn = target?.closest<HTMLElement>('[data-prompt-modal-action]');
    if (actionBtn && modal.contains(actionBtn)) {
        const action = actionBtn.dataset.promptModalAction;
        if (action === 'close') {
            window.closePromptModal?.();
        } else if (action === 'copy') {
            window.copyModalPrompt?.();
        }
        return;
    }

    const langBtn = target?.closest<HTMLElement>('[data-prompt-lang]');
    if (langBtn && modal.contains(langBtn)) {
        const lang = langBtn.dataset.promptLang;
        if (lang === 'zh' || lang === 'en') {
            window.switchPromptLang?.(lang);
        }
        return;
    }

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

    clearElement(container);

    const createButton = (category: 'all' | PromptCategory): HTMLButtonElement => {
        const button = document.createElement('button');
        button.className = category === 'all' ? 'category-btn active' : 'category-btn';
        button.dataset.category = category === 'all' ? 'all' : category.id;

        appendIcon(button, category === 'all' ? 'fas fa-th' : `fas ${category.icon}`);

        const label = document.createElement('span');
        label.textContent = category === 'all' ? '全部' : category.name;
        button.appendChild(label);

        return button;
    };

    container.appendChild(createButton('all'));
    Object.values(PROMPT_CATEGORIES as Record<string, PromptCategory>).forEach((cat) => {
        container.appendChild(createButton(cat));
    });
}

/**
 * 渲染提示词列表
 */
function renderPromptList(): void {
    const container = moduleRoot?.querySelector('#prompt-list') as HTMLElement | null;
    if (!container) return;

    const promptsToRender = getVisiblePrompts();

    clearElement(container);

    if (promptsToRender.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'col-span-full text-center py-12';
        appendIcon(empty, 'fas fa-search text-4xl text-slate-300 mb-4');

        const text = document.createElement('p');
        text.className = 'text-slate-500';
        text.textContent = '未找到匹配的提示词';
        empty.appendChild(text);

        container.appendChild(empty);
        return;
    }

    promptsToRender.forEach((prompt) => {
        const category = getCategoryById(prompt.category);
        const model = getModelInfo(prompt.recommendedModel);

        if (!category) return;

        const card = document.createElement('div');
        card.className = 'prompt-card group';
        card.dataset.promptId = prompt.id;

        const header = document.createElement('div');
        header.className = 'flex items-start justify-between mb-3';

        const categoryBadge = document.createElement('span');
        categoryBadge.className = `category-badge ${category.color}`;
        appendIcon(categoryBadge, `fas ${category.icon}`);
        categoryBadge.appendChild(document.createTextNode(` ${category.name}`));

        const modelBadge = document.createElement('span');
        modelBadge.className = 'model-badge';
        modelBadge.textContent = model.badge;

        header.appendChild(categoryBadge);
        header.appendChild(modelBadge);

        const title = document.createElement('h3');
        title.className = 'prompt-title';
        title.textContent = prompt.title;

        const description = document.createElement('p');
        description.className = 'prompt-description';
        description.textContent = prompt.description;

        const footer = document.createElement('div');
        footer.className = 'flex items-center justify-between mt-4 pt-4 border-t border-slate-100';

        const modelInfo = document.createElement('div');
        modelInfo.className = 'flex items-center gap-2 text-xs text-slate-500';
        appendIcon(modelInfo, 'fas fa-robot');
        const modelName = document.createElement('span');
        modelName.textContent = model.name;
        modelInfo.appendChild(modelName);

        const actions = document.createElement('div');
        actions.className = 'flex gap-2';

        const viewBtn = document.createElement('button');
        viewBtn.type = 'button';
        viewBtn.dataset.action = 'view-prompt';
        viewBtn.dataset.promptId = prompt.id;
        viewBtn.className = 'btn-icon';
        viewBtn.title = '查看详情';
        appendIcon(viewBtn, 'fas fa-eye');

        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.dataset.action = 'copy-prompt';
        copyBtn.dataset.promptId = prompt.id;
        copyBtn.className = 'btn-icon';
        copyBtn.title = '复制提示词';
        appendIcon(copyBtn, 'fas fa-copy');

        actions.appendChild(viewBtn);
        actions.appendChild(copyBtn);
        footer.appendChild(modelInfo);
        footer.appendChild(actions);

        card.appendChild(header);
        card.appendChild(title);
        card.appendChild(description);
        card.appendChild(footer);
        container.appendChild(card);
    });
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
            clearElement(categoryEl);
            appendIcon(categoryEl, `fas ${category.icon}`);
            categoryEl.appendChild(document.createTextNode(` ${category.name}`));
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

        // ✅ 安全: html来自本地静态template.html，无用户输入
        setSafeHtml(container, html);
        container.classList.add('fade-in');

        mountPromptModal(container);
        registerWindowActions();
        initEventListeners(container);
        renderCategories();
        renderPromptList();

        console.log('✅ 提示词模块已挂载');
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

        console.log('❌ 提示词模块已卸载');
    }


}

// 导出模块实例
const promptsModule = new PromptsModule('more_prompts');

export const mount = (container: HTMLElement) => promptsModule.mount(container);
export const unmount = () => promptsModule.unmount();

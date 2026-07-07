/**
 * More 模块 - 提示词页面
 * 提示词库浏览、搜索和复制功能
 */

import BaseModule from '@/common/BaseModule';
import { SafeTemplateLoader } from '@/common/infrastructure/SafeModuleLoader';
import { setSafeHtml } from '@/common/utils/security';
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
import { showToast } from '@/common/ui';
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
    cat => cat.id === categoryId
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
  icon.setAttribute('aria-hidden', 'true');
  parent.appendChild(icon);
  return icon;
}

function findContainedTarget(
  target: HTMLElement,
  selector: string,
  container: HTMLElement
): HTMLElement | null {
  const element = target.closest<HTMLElement>(selector);
  return element && container.contains(element) ? element : null;
}

function handlePromptActionButton(target: HTMLElement): boolean {
  if (!moduleRoot) return false;

  const actionBtn = findContainedTarget(target, '[data-action][data-prompt-id]', moduleRoot);
  if (!actionBtn) return false;

  const promptId = actionBtn.dataset.promptId;
  const action = actionBtn.dataset.action;

  if (!promptId) return true;

  if (action === 'view-prompt') {
    window.viewPrompt?.(promptId);
  } else if (action === 'copy-prompt') {
    window.copyPrompt?.(promptId);
  }

  return true;
}

function handleCategoryButton(target: HTMLElement): boolean {
  if (!moduleRoot) return false;

  const categoryBtn = findContainedTarget(target, '.category-btn', moduleRoot);
  if (!categoryBtn) return false;

  const category = categoryBtn.dataset.category;
  if (category) {
    handleCategoryChange(category);
  }

  return true;
}

function handlePromptCard(target: HTMLElement): void {
  if (!moduleRoot) return;

  const promptCard = findContainedTarget(target, '.prompt-card[data-prompt-id]', moduleRoot);
  const promptId = promptCard?.dataset.promptId;

  if (promptId) {
    window.viewPrompt?.(promptId);
  }
}

function handleModuleClick(e: Event): void {
  const target = e.target as HTMLElement | null;
  if (!target || !moduleRoot) return;

  if (handlePromptActionButton(target)) return;
  if (handleCategoryButton(target)) return;

  handlePromptCard(target);
}

function handlePromptModalAction(target: HTMLElement, modal: HTMLElement): boolean {
  const actionBtn = findContainedTarget(target, '[data-prompt-modal-action]', modal);
  if (!actionBtn) return false;

  const action = actionBtn.dataset.promptModalAction;
  if (action === 'close') {
    window.closePromptModal?.();
  } else if (action === 'copy') {
    window.copyModalPrompt?.();
  }

  return true;
}

function handlePromptModalLang(target: HTMLElement, modal: HTMLElement): boolean {
  const langBtn = findContainedTarget(target, '[data-prompt-lang]', modal);
  if (!langBtn) return false;

  const lang = langBtn.dataset.promptLang;
  if (lang === 'zh' || lang === 'en') {
    window.switchPromptLang?.(lang);
  }

  return true;
}

function handleModalBackdropClick(e: Event): void {
  const modal = getPromptModal();
  const target = e.target as HTMLElement | null;
  if (!modal || !target) return;

  if (handlePromptModalAction(target, modal)) return;
  if (handlePromptModalLang(target, modal)) return;

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

  moduleRoot?.querySelectorAll('.category-btn').forEach(btn => {
    if ((btn as HTMLElement).dataset.category === category) {
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
    } else {
      btn.classList.remove('active');
      btn.setAttribute('aria-pressed', 'false');
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
    button.type = 'button';
    button.className = category === 'all' ? 'category-btn active' : 'category-btn';
    button.dataset.category = category === 'all' ? 'all' : category.id;
    button.setAttribute('aria-pressed', category === 'all' ? 'true' : 'false');

    appendIcon(button, category === 'all' ? 'fas fa-th' : `fas ${category.icon}`);

    const label = document.createElement('span');
    label.textContent = category === 'all' ? '全部' : category.name;
    button.appendChild(label);

    return button;
  };

  container.appendChild(createButton('all'));
  Object.values(PROMPT_CATEGORIES as Record<string, PromptCategory>).forEach(cat => {
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
    empty.className = 'col-span-full text-center py-12 px-6';
    empty.setAttribute('role', 'status');
    empty.setAttribute('aria-live', 'polite');
    appendIcon(empty, 'fas fa-search text-4xl text-slate-300 mb-4');

    const title = document.createElement('p');
    title.className = 'text-sm font-semibold text-slate-600';
    title.textContent = '未找到匹配的提示词';
    empty.appendChild(title);

    const reason = document.createElement('p');
    reason.className = 'mt-2 text-sm text-slate-500';
    reason.textContent = '当前搜索词或分类筛选没有命中已有模板。';
    empty.appendChild(reason);

    const action = document.createElement('p');
    action.className = 'mt-2 text-xs text-slate-500';
    action.textContent = '推荐操作：清空搜索、切回“全部”分类，或使用更短关键词重试。';
    empty.appendChild(action);

    const help = document.createElement('p');
    help.className = 'mt-1 text-xs text-slate-400';
    help.textContent = '示例关键词：Listing、Review、PPC、合规。';
    empty.appendChild(help);

    container.appendChild(empty);
    return;
  }

  promptsToRender.forEach(prompt => {
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
    viewBtn.setAttribute('aria-label', `查看${prompt.title}`);
    appendIcon(viewBtn, 'fas fa-eye');

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.dataset.action = 'copy-prompt';
    copyBtn.dataset.promptId = prompt.id;
    copyBtn.className = 'btn-icon';
    copyBtn.title = '复制提示词';
    copyBtn.setAttribute('aria-label', `复制${prompt.title}`);
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
  document.querySelectorAll('.lang-btn').forEach(btn => {
    if ((btn as HTMLElement).dataset.lang === currentLang) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function renderPromptCategory(categoryEl: HTMLElement, category: PromptCategory): void {
  clearElement(categoryEl);
  appendIcon(categoryEl, `fas ${category.icon}`);
  categoryEl.appendChild(document.createTextNode(` ${category.name}`));
}

function updatePromptModalHeader(prompt: Prompt, category: PromptCategory): void {
  const titleEl = document.getElementById('modal-prompt-title');
  const categoryEl = document.getElementById('modal-prompt-category');
  const modelEl = document.getElementById('modal-prompt-model');
  const descEl = document.getElementById('modal-prompt-description');
  const model = getModelInfo(prompt.recommendedModel);

  if (titleEl) titleEl.textContent = prompt.title;
  if (categoryEl) renderPromptCategory(categoryEl, category);
  if (modelEl) modelEl.textContent = model.name;
  if (descEl) descEl.textContent = prompt.description;
}

function showPromptModal(modal: HTMLElement): void {
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function handleViewPrompt(promptId: string): void {
  const prompt = getPromptById(promptId);
  if (!prompt) return;

  currentPrompt = prompt as Prompt;
  currentLang = 'zh';

  const modal = getPromptModal();
  if (!modal) return;

  const category = getCategoryById(prompt.category);
  if (!category) return;

  updatePromptModalHeader(prompt, category);
  updatePromptContent();
  updateLangButtons();
  showPromptModal(modal);
}

function handleSwitchPromptLang(lang: 'zh' | 'en'): void {
  currentLang = lang;
  updatePromptContent();
  updateLangButtons();
}

function handleClosePromptModal(): void {
  const modal = getPromptModal();
  if (!modal) return;

  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function copyTextToClipboard(text: string, successMessage: string): void {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      showToast(successMessage, { type: 'success' });
    })
    .catch(() => {
      showToast('复制失败,请手动复制', { type: 'error' });
    });
}

function handleCopyPrompt(promptId: string): void {
  const prompt = getPromptById(promptId);
  if (!prompt) return;

  copyTextToClipboard(prompt.prompt, '提示词已复制到剪贴板');
}

function getCurrentPromptText(): string | null {
  if (!currentPrompt) return null;
  return currentLang === 'zh'
    ? currentPrompt.prompt
    : currentPrompt.promptEn || currentPrompt.prompt;
}

function handleCopyModalPrompt(): void {
  const promptText = getCurrentPromptText();
  if (!promptText) return;

  const langName = currentLang === 'zh' ? '中文' : '英文';
  copyTextToClipboard(promptText, `${langName}提示词已复制到剪贴板`);
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
  window.viewPrompt = handleViewPrompt;
  window.switchPromptLang = handleSwitchPromptLang;
  window.closePromptModal = handleClosePromptModal;
  window.copyPrompt = handleCopyPrompt;
  window.copyModalPrompt = handleCopyModalPrompt;
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
    const html = await SafeTemplateLoader.getInstance().loadTemplate(
      'src/modules/more/views/explore/prompts/template.html'
    );

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
  }
}

// 导出模块实例
const promptsModule = new PromptsModule('more_prompts');

export const mount = (container: HTMLElement) => promptsModule.mount(container);
export const unmount = () => promptsModule.unmount();

/**
 * More 模块 - 技能页面
 * 运营目录：浏览 / 搜索 / 读方法 / 复制全文到 AI 对话
 * 不提供「复制 skillId」入口（工作台编程加载，用户不走 ID 调用）
 */

import BaseModule from '@/common/BaseModule';
import { SafeTemplateLoader } from '@/common/infrastructure/SafeModuleLoader';
import { setSafeHtml } from '@/common/utils/security';
import { copyTextToClipboard } from '@/common/utils/clipboard';
import { showToast } from '@/common/ui';
import { skillRegistry } from '@/services/skillRegistry';
import type { Skill, SkillCategoryId, SkillMeta } from '@/services/skillRegistry';
import '@/components/modal/AppModal';
import './skills_style.css';

type AppModalElement = HTMLElement & {
  open?: () => void;
  close?: () => void;
};

let moduleRoot: HTMLElement | null = null;
let searchInputRef: HTMLInputElement | null = null;
let skillModalRef: HTMLElement | null = null;
let currentCategory: SkillCategoryId | 'all' = 'all';
let currentKeyword = '';
let currentSkill: Skill | null = null;
let searchTimer: ReturnType<typeof setTimeout> | null = null;

function isDecorativeCodePoint(cp: number): boolean {
  if (cp === 0xfe0f || cp === 0x200d || cp === 0x20 || cp === 0xa0) return true;
  if (cp >= 0x1f300 && cp <= 0x1faff) return true;
  if (cp >= 0x2600 && cp <= 0x27bf) return true;
  return false;
}

/** 展示用标题：去掉上游 H1 自带 emoji，结构图标只用 FA */
function displayTitle(title: string): string {
  const chars = Array.from(title.trim());
  let i = 0;
  while (i < chars.length && isDecorativeCodePoint(chars[i].codePointAt(0) ?? 0)) {
    i += 1;
  }
  return chars.slice(i).join('').trim() || title.trim();
}

function statusLabel(status: SkillMeta['status']): string {
  if (status === 'available') return '可用';
  if (status === 'beta') return 'Beta';
  return '其他';
}

function statusClass(status: SkillMeta['status']): string {
  if (status === 'available') return 'skill-status-available';
  if (status === 'beta') return 'skill-status-beta';
  return 'skill-status-unknown';
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

function getSkillModal(): HTMLElement | null {
  return skillModalRef || (document.getElementById('skill-detail-modal') as HTMLElement | null);
}

function mountSkillModal(root: HTMLElement): void {
  const modal = root.querySelector('#skill-detail-modal') as HTMLElement | null;
  if (!modal) return;
  skillModalRef = modal;
  document.body.appendChild(modal);
}

function removeSkillModal(): void {
  skillModalRef?.remove();
  skillModalRef = null;
}

function renderMetrics(): void {
  if (!moduleRoot) return;
  const stats = skillRegistry.getStats();
  const scripts = skillRegistry.listSkills({ hasScripts: true }).length;
  const beta = skillRegistry.listSkills({ status: 'beta' }).length;
  const categories = skillRegistry.getCategories().length;

  const setText = (id: string, value: string | number) => {
    const el = moduleRoot?.querySelector(`#${id}`);
    if (el) el.textContent = String(value);
  };

  setText('metric-total', stats.total);
  setText('metric-category', categories);
  setText('metric-scripts', scripts);
  setText('metric-beta', beta);

  const banner = moduleRoot.querySelector('#skill-banner-total');
  if (banner) banner.textContent = `${stats.total} Skills`;
}

function renderCategories(): void {
  const container = moduleRoot?.querySelector('#skill-category-container');
  if (!container) return;
  clearElement(container);

  const makeBtn = (id: SkillCategoryId | 'all', label: string, active: boolean) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = active ? 'category-btn active' : 'category-btn';
    button.dataset.category = id;
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
    appendIcon(button, id === 'all' ? 'fas fa-th' : 'fas fa-folder');
    const span = document.createElement('span');
    span.textContent = label;
    button.appendChild(span);
    return button;
  };

  container.appendChild(makeBtn('all', '全部', currentCategory === 'all'));
  for (const cat of skillRegistry.getCategories()) {
    container.appendChild(
      makeBtn(cat.id, `${cat.label} (${cat.count})`, currentCategory === cat.id)
    );
  }
}

function createEmptyState(options: {
  role: string;
  iconClass: string;
  title: string;
  help: string;
  live?: boolean;
}): HTMLElement {
  const empty = document.createElement('div');
  empty.className = 'col-span-full text-center py-12 px-6';
  empty.setAttribute('role', options.role);
  if (options.live) empty.setAttribute('aria-live', 'polite');
  appendIcon(empty, options.iconClass);
  const title = document.createElement('p');
  title.className = 'text-sm font-semibold text-slate-700';
  title.textContent = options.title;
  empty.appendChild(title);
  const help = document.createElement('p');
  help.className = 'mt-2 text-sm text-slate-500';
  help.textContent = options.help;
  empty.appendChild(help);
  return empty;
}

function createActionButton(
  skillId: string,
  action: string,
  icon: string,
  label: string,
  skillTitle: string
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.dataset.action = action;
  btn.dataset.skillId = skillId;
  btn.className = 'btn-icon';
  btn.title = label;
  btn.setAttribute('aria-label', `${label}：${skillTitle}`);
  appendIcon(btn, icon);
  return btn;
}

function createSkillCard(skill: SkillMeta): HTMLElement {
  const card = document.createElement('div');
  card.className = 'skill-card group';
  card.dataset.skillId = skill.id;
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `查看技能：${displayTitle(skill.title)}`);

  const header = document.createElement('div');
  header.className = 'flex items-start justify-between gap-2 mb-3';

  const catBadge = document.createElement('span');
  catBadge.className =
    'text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-100 rounded-md px-2 py-1';
  catBadge.textContent = skill.categoryLabel;

  const st = document.createElement('span');
  st.className = statusClass(skill.status);
  st.textContent = statusLabel(skill.status);
  header.append(catBadge, st);

  const title = document.createElement('h3');
  title.className = 'skill-title';
  title.textContent = displayTitle(skill.title);

  const desc = document.createElement('p');
  desc.className = 'skill-description';
  desc.textContent = skill.description || '（无描述）';

  const footer = document.createElement('div');
  footer.className = 'flex items-center justify-between mt-4 pt-4 border-t border-slate-100';

  const left = document.createElement('div');
  left.className = 'text-xs text-slate-400';
  left.textContent = skill.hasScripts ? '含辅助脚本（本页不执行）' : '方法论文档';

  const actions = document.createElement('div');
  actions.className = 'flex gap-2';
  const titleText = displayTitle(skill.title);
  // 运营主路径：查看方法 + 复制全文。禁止「复制 skillId」。
  actions.append(
    createActionButton(skill.id, 'view-skill', 'fas fa-eye', '查看详情', titleText),
    createActionButton(skill.id, 'copy-skill-raw', 'fas fa-copy', '复制全文', titleText)
  );
  footer.append(left, actions);
  card.append(header, title, desc, footer);
  return card;
}

function renderList(): void {
  const container = moduleRoot?.querySelector('#skill-list');
  const countEl = moduleRoot?.querySelector('#skill-result-count');
  if (!container) return;

  const total = skillRegistry.getStats().total;
  const skills = skillRegistry.listSkills({
    keyword: currentKeyword || undefined,
    category: currentCategory,
  });

  if (countEl) countEl.textContent = `显示 ${skills.length} / 共 ${total} 个技能`;
  clearElement(container);

  if (total === 0) {
    container.appendChild(
      createEmptyState({
        role: 'alert',
        iconClass: 'fas fa-triangle-exclamation text-4xl text-amber-400 mb-4',
        title: '技能库为空',
        help: '请确认 vendor/amazon-skills 已接入，或执行：git submodule update --init --recursive',
      })
    );
    return;
  }

  if (skills.length === 0) {
    container.appendChild(
      createEmptyState({
        role: 'status',
        live: true,
        iconClass: 'fas fa-search text-4xl text-slate-300 mb-4',
        title: '未找到匹配的技能',
        help: '推荐：清空搜索、切回「全部」，或尝试关键词 PPC、Listing、FBA。',
      })
    );
    return;
  }

  for (const skill of skills) {
    container.appendChild(createSkillCard(skill));
  }
}

async function copyText(text: string, successMessage: string): Promise<void> {
  if (!(await copyTextToClipboard(text))) {
    showToast('复制失败，请手动选择文本复制', { type: 'error' });
    return;
  }
  showToast(successMessage, { type: 'success' });
}

function openDetail(skillId: string): void {
  const skill = skillRegistry.getSkill(skillId);
  if (!skill) return;
  currentSkill = skill;

  const modal = getSkillModal();
  if (!modal) return;

  const set = (id: string, text: string) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  set('modal-skill-title', displayTitle(skill.title));
  set('modal-skill-category', skill.categoryLabel);
  set('modal-skill-status', statusLabel(skill.status));
  set('modal-skill-description', skill.description || '');
  set('modal-skill-content', skill.raw);

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  (modal as AppModalElement).open?.();
}

function closeDetail(): void {
  const modal = getSkillModal();
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  (modal as AppModalElement).close?.();
  currentSkill = null;
}

function handleCategoryClick(categoryBtn: HTMLElement): void {
  const cat = categoryBtn.dataset.category as SkillCategoryId | 'all' | undefined;
  if (!cat) return;
  currentCategory = cat;
  renderCategories();
  renderList();
}

function handleSkillAction(skillId: string, action: string | undefined): void {
  if (action === 'view-skill') {
    openDetail(skillId);
    return;
  }
  if (action === 'copy-skill-raw') {
    const skill = skillRegistry.getSkill(skillId);
    if (skill) void copyText(skill.raw, '技能全文已复制，可粘贴到 AI 对话');
  }
}

function handleModuleClick(e: Event): void {
  const target = e.target as HTMLElement | null;
  if (!target || !moduleRoot) return;

  const categoryBtn = target.closest('.category-btn') as HTMLElement | null;
  if (categoryBtn && moduleRoot.contains(categoryBtn)) {
    handleCategoryClick(categoryBtn);
    return;
  }

  const actionBtn = target.closest('[data-action][data-skill-id]') as HTMLElement | null;
  if (actionBtn && moduleRoot.contains(actionBtn) && actionBtn.dataset.skillId) {
    e.stopPropagation();
    handleSkillAction(actionBtn.dataset.skillId, actionBtn.dataset.action);
    return;
  }

  const card = target.closest('.skill-card[data-skill-id]') as HTMLElement | null;
  if (card?.dataset.skillId && moduleRoot.contains(card)) {
    openDetail(card.dataset.skillId);
  }
}

function handleModuleKeydown(e: KeyboardEvent): void {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const target = e.target as HTMLElement | null;
  if (!target || !moduleRoot) return;
  const card = target.closest('.skill-card[data-skill-id]') as HTMLElement | null;
  if (!card?.dataset.skillId || !moduleRoot.contains(card)) return;
  if (target.closest('[data-action]')) return;
  e.preventDefault();
  openDetail(card.dataset.skillId);
}

function runModalAction(action: string | undefined): void {
  if (action === 'close') {
    closeDetail();
    return;
  }
  if (action === 'copy-raw' && currentSkill) {
    void copyText(currentSkill.raw, '技能全文已复制，可粘贴到 AI 对话');
  }
}

function handleModalClick(e: Event): void {
  const modal = getSkillModal();
  const target = e.target as HTMLElement | null;
  if (!modal || !target) return;

  const actionBtn = target.closest('[data-skill-modal-action]') as HTMLElement | null;
  if (actionBtn && modal.contains(actionBtn)) {
    runModalAction(actionBtn.dataset.skillModalAction);
    return;
  }

  if (target === modal) closeDetail();
}

function handleSearchInput(e: Event): void {
  const value = (e.target as HTMLInputElement).value;
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    currentKeyword = value.trim();
    renderList();
  }, 200);
}

function handleDocumentKeydown(e: KeyboardEvent): void {
  if (e.key !== 'Escape') return;
  const modal = getSkillModal();
  if (modal && !modal.classList.contains('hidden')) closeDetail();
}

function initEventListeners(root: HTMLElement): void {
  moduleRoot = root;
  searchInputRef = root.querySelector('#skill-search');
  searchInputRef?.addEventListener('input', handleSearchInput);
  root.addEventListener('click', handleModuleClick);
  root.addEventListener('keydown', handleModuleKeydown);
  getSkillModal()?.addEventListener('click', handleModalClick);
  document.addEventListener('keydown', handleDocumentKeydown);
}

function removeEventListeners(): void {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = null;
  searchInputRef?.removeEventListener('input', handleSearchInput);
  moduleRoot?.removeEventListener('click', handleModuleClick);
  moduleRoot?.removeEventListener('keydown', handleModuleKeydown);
  getSkillModal()?.removeEventListener('click', handleModalClick);
  document.removeEventListener('keydown', handleDocumentKeydown);
  searchInputRef = null;
  moduleRoot = null;
}

class SkillsModule extends BaseModule {
  async mount(container: HTMLElement): Promise<void> {
    const html = await SafeTemplateLoader.getInstance().loadTemplate(
      'src/modules/more/views/explore/skills/template.html'
    );

    currentCategory = 'all';
    currentKeyword = '';
    currentSkill = null;
    removeSkillModal();

    setSafeHtml(container, html);
    container.classList.add('fade-in');

    skillRegistry.ensureInitialized();
    mountSkillModal(container);
    initEventListeners(container);
    renderMetrics();
    renderCategories();
    renderList();
  }

  unmount(): void {
    closeDetail();
    removeEventListeners();
    removeSkillModal();
    currentCategory = 'all';
    currentKeyword = '';
    currentSkill = null;
  }
}

const skillsModule = new SkillsModule('more_skills');

export const mount = (container: HTMLElement) => skillsModule.mount(container);
export const unmount = () => skillsModule.unmount();

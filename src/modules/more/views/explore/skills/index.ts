/**
 * More 模块 - 技能页面
 * Amazon Skills 目录：浏览 / 搜索 / 详情 / 复制；数据来自 skillRegistry
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

function installCmd(id: string): string {
  return `npx skills add nexscope-ai/Amazon-Skills --skill ${id} -g`;
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

function renderList(): void {
  const container = moduleRoot?.querySelector('#skill-list');
  const countEl = moduleRoot?.querySelector('#skill-result-count');
  if (!container) return;

  const total = skillRegistry.getStats().total;
  const skills = skillRegistry.listSkills({
    keyword: currentKeyword || undefined,
    category: currentCategory,
  });

  if (countEl) {
    countEl.textContent = `显示 ${skills.length} / 共 ${total} 个技能`;
  }

  clearElement(container);

  if (total === 0) {
    const empty = document.createElement('div');
    empty.className = 'col-span-full text-center py-12 px-6';
    empty.setAttribute('role', 'alert');
    appendIcon(empty, 'fas fa-triangle-exclamation text-4xl text-amber-400 mb-4');
    const title = document.createElement('p');
    title.className = 'text-sm font-semibold text-slate-700';
    title.textContent = '技能库为空';
    empty.appendChild(title);
    const help = document.createElement('p');
    help.className = 'mt-2 text-sm text-slate-500';
    help.textContent =
      '请确认 vendor/amazon-skills 已接入，或执行：git submodule update --init --recursive';
    empty.appendChild(help);
    container.appendChild(empty);
    return;
  }

  if (skills.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'col-span-full text-center py-12 px-6';
    empty.setAttribute('role', 'status');
    empty.setAttribute('aria-live', 'polite');
    appendIcon(empty, 'fas fa-search text-4xl text-slate-300 mb-4');
    const title = document.createElement('p');
    title.className = 'text-sm font-semibold text-slate-600';
    title.textContent = '未找到匹配的技能';
    empty.appendChild(title);
    const help = document.createElement('p');
    help.className = 'mt-2 text-sm text-slate-500';
    help.textContent = '推荐：清空搜索、切回「全部」，或尝试关键词 ppc / listing / keyword。';
    empty.appendChild(help);
    container.appendChild(empty);
    return;
  }

  for (const skill of skills) {
    const card = document.createElement('div');
    card.className = 'skill-card group';
    card.dataset.skillId = skill.id;

    const header = document.createElement('div');
    header.className = 'flex items-start justify-between gap-2 mb-3';

    const catBadge = document.createElement('span');
    catBadge.className =
      'text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-100 rounded-md px-2 py-1';
    catBadge.textContent = skill.categoryLabel;

    const st = document.createElement('span');
    st.className = statusClass(skill.status);
    st.textContent = statusLabel(skill.status);

    header.appendChild(catBadge);
    header.appendChild(st);

    const title = document.createElement('h3');
    title.className = 'skill-title';
    title.textContent = skill.emoji ? `${skill.emoji} ${skill.title}` : skill.title;

    const idEl = document.createElement('div');
    idEl.className = 'skill-id';
    idEl.textContent = skill.id;

    const desc = document.createElement('p');
    desc.className = 'skill-description';
    desc.textContent = skill.description || '（无描述）';

    const footer = document.createElement('div');
    footer.className = 'flex items-center justify-between mt-4 pt-4 border-t border-slate-100';

    const left = document.createElement('div');
    left.className = 'text-xs text-slate-400';
    left.textContent = skill.hasScripts ? '含 scripts' : '纯文档';

    const actions = document.createElement('div');
    actions.className = 'flex gap-2';

    const makeAction = (action: string, icon: string, label: string) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.action = action;
      btn.dataset.skillId = skill.id;
      btn.className = 'btn-icon';
      btn.title = label;
      btn.setAttribute('aria-label', `${label}：${skill.id}`);
      appendIcon(btn, icon);
      return btn;
    };

    actions.appendChild(makeAction('view-skill', 'fas fa-eye', '查看详情'));
    actions.appendChild(makeAction('copy-skill-id', 'fas fa-fingerprint', '复制 skillId'));
    actions.appendChild(makeAction('copy-skill-raw', 'fas fa-copy', '复制正文'));

    footer.appendChild(left);
    footer.appendChild(actions);

    card.appendChild(header);
    card.appendChild(title);
    card.appendChild(idEl);
    card.appendChild(desc);
    card.appendChild(footer);
    container.appendChild(card);
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

  set('modal-skill-title', skill.emoji ? `${skill.emoji} ${skill.title}` : skill.title);
  set('modal-skill-id', skill.id);
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

function handleModuleClick(e: Event): void {
  const target = e.target as HTMLElement | null;
  if (!target || !moduleRoot) return;

  const categoryBtn = target.closest('.category-btn') as HTMLElement | null;
  if (categoryBtn && moduleRoot.contains(categoryBtn)) {
    const cat = categoryBtn.dataset.category as SkillCategoryId | 'all' | undefined;
    if (cat) {
      currentCategory = cat;
      renderCategories();
      renderList();
    }
    return;
  }

  const actionBtn = target.closest('[data-action][data-skill-id]') as HTMLElement | null;
  if (actionBtn && moduleRoot.contains(actionBtn)) {
    const skillId = actionBtn.dataset.skillId;
    const action = actionBtn.dataset.action;
    if (!skillId) return;
    if (action === 'view-skill') openDetail(skillId);
    else if (action === 'copy-skill-id') copyText(skillId, 'skillId 已复制');
    else if (action === 'copy-skill-raw') {
      const skill = skillRegistry.getSkill(skillId);
      if (skill) copyText(skill.raw, '技能正文已复制');
    }
    return;
  }

  const card = target.closest('.skill-card[data-skill-id]') as HTMLElement | null;
  if (card && moduleRoot.contains(card) && card.dataset.skillId) {
    openDetail(card.dataset.skillId);
  }
}

function handleModalClick(e: Event): void {
  const modal = getSkillModal();
  const target = e.target as HTMLElement | null;
  if (!modal || !target) return;

  const actionBtn = target.closest('[data-skill-modal-action]') as HTMLElement | null;
  if (actionBtn && modal.contains(actionBtn)) {
    const action = actionBtn.dataset.skillModalAction;
    if (action === 'close') closeDetail();
    else if (action === 'copy-id' && currentSkill) copyText(currentSkill.id, 'skillId 已复制');
    else if (action === 'copy-raw' && currentSkill) copyText(currentSkill.raw, '技能全文已复制');
    else if (action === 'copy-install' && currentSkill) {
      copyText(installCmd(currentSkill.id), '安装命令已复制');
    }
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
  getSkillModal()?.addEventListener('click', handleModalClick);
  document.addEventListener('keydown', handleDocumentKeydown);
}

function removeEventListeners(): void {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = null;
  searchInputRef?.removeEventListener('input', handleSearchInput);
  moduleRoot?.removeEventListener('click', handleModuleClick);
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

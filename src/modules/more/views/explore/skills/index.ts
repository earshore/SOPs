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
import { StorageService } from '@/services/storageService';
import {
  buildSkillDeepChatUserDraft,
  queueSkillForDeepChat,
} from '@/modules/app_center/skillDeepChatHandoff';
import eventBus from '@/common/EventBus';
import { APP_EVENTS } from '@/common/constants/eventConstants';
import { navigateToRouteId } from '@/common/router/initRouter';
import '@/components/modal/AppModal';
import './skills_style.css';

type AppModalElement = HTMLElement & {
  open?: () => void;
  close?: () => void;
};

type SkillsFilterState = {
  category?: SkillCategoryId | 'all';
  keyword?: string;
};

const SKILLS_FILTER_STORAGE_KEY = 'skills:filters:v1';
/** C4：技能试用链路统一图标（技能页 CTA / Deep Chat 徽标一致） */
const SKILL_TRIAL_ICON = 'fas fa-graduation-cap';

let moduleRoot: HTMLElement | null = null;
let searchInputRef: HTMLInputElement | null = null;
let skillModalRef: HTMLElement | null = null;
let currentCategory: SkillCategoryId | 'all' = 'all';
let currentKeyword = '';
let currentSkill: Skill | null = null;
let searchTimer: ReturnType<typeof setTimeout> | null = null;

/** F4：跨试用往返保留筛选（StorageService） */
function loadPersistedFilters(): void {
  const data = StorageService.get(SKILLS_FILTER_STORAGE_KEY, null) as SkillsFilterState | null;
  if (!data || typeof data !== 'object') return;
  if (data.category === 'all' || typeof data.category === 'string') {
    currentCategory = data.category || 'all';
  }
  if (typeof data.keyword === 'string') {
    currentKeyword = data.keyword;
  }
}

function persistFilters(): void {
  StorageService.set(SKILLS_FILTER_STORAGE_KEY, {
    category: currentCategory,
    keyword: currentKeyword,
  });
}

/** 标题首尾可剥除的装饰码点区间（emoji / 符号） */
const DECORATIVE_CODE_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x2300, 0x23ff],
  [0x2600, 0x27bf],
  [0x2b00, 0x2bff],
  [0x1f300, 0x1faff],
];

function isDecorativeCodePoint(cp: number): boolean {
  if (cp === 0xfe0f || cp === 0x200d || cp === 0x20 || cp === 0xa0) return true;
  return DECORATIVE_CODE_RANGES.some(([lo, hi]) => cp >= lo && cp <= hi);
}

/** 展示用标题：去掉上游 H1 首尾 emoji，结构图标只用 FA */
function displayTitle(title: string): string {
  const chars = Array.from(title.trim());
  let start = 0;
  let end = chars.length;
  while (start < end) {
    const ch = chars[start];
    if (!ch || !isDecorativeCodePoint(ch.codePointAt(0) ?? 0)) break;
    start += 1;
  }
  while (end > start) {
    const ch = chars[end - 1];
    if (!ch || !isDecorativeCodePoint(ch.codePointAt(0) ?? 0)) break;
    end -= 1;
  }
  // 去掉标题与尾部 emoji 之间的残留空白
  return chars.slice(start, end).join('').trim() || title.trim();
}

/** C2：状态标签中文统一；动作仍称「在 Deep Chat 试用」 */
function statusLabel(status: SkillMeta['status']): string {
  if (status === 'beta') return '试用版';
  if (status === 'available') return '正式';
  return '未标注';
}

function statusClass(status: SkillMeta['status']): string {
  if (status === 'beta') return 'skill-status-beta';
  if (status === 'available') return 'skill-status-available';
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

function setMetricText(id: string, value: string | number): void {
  const el = moduleRoot?.querySelector(`#${id}`);
  if (el) el.textContent = String(value);
}

/** FB4：空库时同步 Hero / 筛选 / 页脚指标引导 */
function syncEmptyLibraryChrome(empty: boolean, total: number): void {
  if (!moduleRoot) return;
  const banner = moduleRoot.querySelector('#skill-banner-total');
  if (banner) {
    // Welcome Banner 规范：动态数量写在 wb-tag 文案中
    banner.textContent = empty ? '技能库为空' : `${total} 个技能`;
  }
  moduleRoot.classList.toggle('skills-page--empty-library', empty);
  const sticky = moduleRoot.querySelector<HTMLElement>('.skills-catalog-sticky');
  if (sticky) sticky.hidden = empty;
  const emptyHint = moduleRoot.querySelector<HTMLElement>('#skills-library-empty-hint');
  if (emptyHint) emptyHint.hidden = !empty;
}

function renderMetrics(): void {
  if (!moduleRoot) return;
  const stats = skillRegistry.getStats();
  const empty = stats.total === 0;

  // FB4：库为空时用「—」避免 Hero/指标裸显示 0 造成「已接入但没数据」的错觉
  if (empty) {
    setMetricText('metric-total', '—');
    setMetricText('metric-category', '—');
    setMetricText('metric-scripts', '—');
    setMetricText('metric-beta', '—');
  } else {
    setMetricText('metric-total', stats.total);
    setMetricText('metric-category', skillRegistry.getCategories().length);
    setMetricText('metric-scripts', skillRegistry.listSkills({ hasScripts: true }).length);
    setMetricText('metric-beta', skillRegistry.listSkills({ status: 'beta' }).length);
  }
  syncEmptyLibraryChrome(empty, stats.total);
}

function renderCategories(): void {
  const container = moduleRoot?.querySelector('#skill-category-container');
  if (!container) return;
  clearElement(container);

  const makeBtn = (id: SkillCategoryId | 'all', label: string, active: boolean) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = active ? 'category-filter-btn active' : 'category-filter-btn';
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
  // 使用 data-skill-action，避免全局 ActionRegistry 拦截未注册的 data-action
  btn.dataset.skillAction = action;
  btn.dataset.skillId = skillId;
  btn.className = 'btn-icon';
  btn.title = label;
  btn.setAttribute('aria-label', `${label}：${skillTitle}`);
  appendIcon(btn, icon);
  return btn;
}

/** 主 CTA：带文字实心按钮「在 Deep Chat 试用」（F3/C1） */
function createTryDeepChatButton(skillId: string, skillTitle: string): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.dataset.skillAction = 'try-deep-chat';
  btn.dataset.skillId = skillId;
  btn.className = 'action-btn action-btn-primary';
  btn.setAttribute('aria-label', `在 Deep Chat 试用：${skillTitle}`);
  appendIcon(btn, SKILL_TRIAL_ICON);
  const text = document.createElement('span');
  text.textContent = '在 Deep Chat 试用';
  btn.appendChild(text);
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

  // 与上游仓库标注对齐：Available / Beta（可区分，非全员同文案噪音）
  const st = document.createElement('span');
  st.className = statusClass(skill.status);
  st.textContent = statusLabel(skill.status);
  st.title =
    skill.status === 'beta'
      ? '试用版：功能可用，持续改进中'
      : skill.status === 'available'
        ? '正式可用'
        : '未标注状态';
  header.append(catBadge, st);

  const title = document.createElement('h3');
  title.className = 'skill-title';
  // 技能名称保持原文（去装饰 emoji）
  title.textContent = displayTitle(skill.title);

  const desc = document.createElement('p');
  desc.className = 'skill-description';
  // 技能简介保持原文
  desc.textContent = skill.description || '暂无简介';

  const footer = document.createElement('div');
  footer.className =
    'flex flex-wrap items-center justify-between gap-2 mt-4 pt-4 border-t border-slate-100';

  const secondary = document.createElement('div');
  secondary.className = 'flex gap-1';
  const titleText = displayTitle(skill.title);
  secondary.append(
    createActionButton(skill.id, 'view-skill', 'fas fa-eye', '查看详情', titleText),
    createActionButton(skill.id, 'copy-skill-raw', 'fas fa-copy', '复制全文', titleText)
  );

  const primary = createTryDeepChatButton(skill.id, titleText);
  footer.append(secondary, primary);
  card.append(header, title, desc, footer);
  return card;
}

function setTryDeepChatLoading(skillId: string, loading: boolean): void {
  const selectors = [
    `[data-skill-action="try-deep-chat"][data-skill-id="${skillId}"]`,
    `[data-skill-modal-action="try-deep-chat"][data-skill-id="${skillId}"]`,
  ];
  const roots: Array<ParentNode | null> = [moduleRoot, getSkillModal()];
  for (const root of roots) {
    if (!root) continue;
    for (const selector of selectors) {
      root.querySelectorAll<HTMLButtonElement>(selector).forEach(btn => {
        btn.disabled = loading;
        btn.classList.toggle('is-loading', loading);
        btn.setAttribute('aria-busy', loading ? 'true' : 'false');
      });
    }
  }
}

function trySkillInDeepChat(skillId: string): void {
  const skill = skillRegistry.getSkill(skillId);
  if (!skill) {
    showToast('未找到该技能', { type: 'error' });
    return;
  }

  const skillTitle = displayTitle(skill.title);
  setTryDeepChatLoading(skillId, true);

  queueSkillForDeepChat({
    skillId: skill.id,
    skillTitle,
    skillRaw: skill.raw,
    userDraft: buildSkillDeepChatUserDraft(skillTitle, skill.raw),
  });
  // Deep Chat 已挂载时立即消费；否则 init / 路由重入时消费
  eventBus.emit(APP_EVENTS.SKILL_DEEP_CHAT_HANDOFF, {
    skillId: skill.id,
    skillTitle,
  });

  void navigateToRouteId('playground_deep_chat')
    .then(ok => {
      if (!ok) {
        setTryDeepChatLoading(skillId, false);
        showToast('无法打开 Deep Chat，请检查路由', { type: 'error' });
        return;
      }
      showToast('正在打开 Deep Chat 并载入技能…', { type: 'success' });
      // 页面即将切换；若仍停留在本页则稍后恢复按钮
      window.setTimeout(() => setTryDeepChatLoading(skillId, false), 2500);
    })
    .catch(() => {
      setTryDeepChatLoading(skillId, false);
      showToast('无法打开 Deep Chat，请稍后重试', { type: 'error' });
    });
}

function hasActiveSkillFilters(): boolean {
  return currentCategory !== 'all' || Boolean(currentKeyword);
}

/** FB4：筛选无结果时的空态 + 清空筛选 */
function createNoMatchEmptyState(): HTMLElement {
  const filtered = hasActiveSkillFilters();
  const empty = createEmptyState({
    role: 'status',
    live: true,
    iconClass: 'fas fa-search text-4xl text-slate-300 mb-4',
    title: '未找到匹配的技能',
    help: filtered
      ? '当前分类与搜索组合无结果。可清空筛选后重试，或尝试关键词 PPC、Listing、FBA。'
      : '推荐：清空搜索、切回「全部」，或尝试关键词 PPC、Listing、FBA。',
  });
  if (!filtered) {
    return empty;
  }
  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'action-btn action-btn-primary mt-4';
  clearBtn.textContent = '清空筛选';
  clearBtn.addEventListener('click', () => {
    currentCategory = 'all';
    currentKeyword = '';
    if (searchInputRef) searchInputRef.value = '';
    persistFilters();
    renderCategories();
    renderList();
  });
  empty.appendChild(clearBtn);
  return empty;
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
    // FB4：整页一致引导（Hero 文案 + 目录空态 + 指标「—」）
    container.appendChild(
      createEmptyState({
        role: 'alert',
        iconClass: 'fas fa-triangle-exclamation text-4xl text-amber-400 mb-4',
        title: '技能库尚未接入',
        help: '页头与下方统计也会显示为空。请确认 vendor/amazon-skills 已接入，或在仓库根目录执行：git submodule update --init --recursive',
      })
    );
    return;
  }

  if (skills.length === 0) {
    container.appendChild(createNoMatchEmptyState());
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

/** L4：从 Markdown 二级标题抽取结构化预览 */
function extractSkillSections(body: string): Array<{ title: string; content: string }> {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const sections: Array<{ title: string; content: string }> = [];
  let currentTitle = '';
  let currentLines: string[] = [];

  const flush = (): void => {
    const content = currentLines.join('\n').trim();
    if (currentTitle && content) {
      sections.push({ title: currentTitle, content });
    }
    currentTitle = '';
    currentLines = [];
  };

  for (const line of lines) {
    const match = /^(#{2,3})\s+(.+)$/.exec(line.trim());
    if (match?.[2]) {
      flush();
      currentTitle = match[2].replace(/[\u{1F300}-\u{1FAFF}]/gu, '').trim();
      continue;
    }
    if (currentTitle) {
      currentLines.push(line);
    }
  }
  flush();

  const preferred = [
    /能力|capability|capabilities/i,
    /输入|input/i,
    /输出|output/i,
    /用法|usage|how it works|工作方式/i,
  ];
  const picked: Array<{ title: string; content: string }> = [];
  for (const pattern of preferred) {
    const found = sections.find(
      section => pattern.test(section.title) && !picked.includes(section)
    );
    if (found) {
      picked.push(found);
    }
  }
  if (picked.length === 0) {
    return sections.slice(0, 3).map(section => ({
      title: section.title,
      content: section.content.slice(0, 480),
    }));
  }
  return picked.slice(0, 4).map(section => ({
    title: section.title,
    content: section.content.slice(0, 480),
  }));
}

function renderSkillStructuredPreview(skill: Skill): void {
  const host = document.getElementById('modal-skill-structured');
  const rawDetails = document.getElementById(
    'modal-skill-raw-details'
  ) as HTMLDetailsElement | null;
  if (!host) return;
  clearElement(host);

  const body = skill.body || skill.raw;
  const sections = extractSkillSections(body);
  if (sections.length === 0) {
    host.hidden = true;
    if (rawDetails) rawDetails.open = true;
    return;
  }

  host.hidden = false;
  if (rawDetails) rawDetails.open = false;

  for (const section of sections) {
    const card = document.createElement('article');
    card.className = 'rounded-xl border border-slate-200 bg-white p-4';
    const h = document.createElement('h4');
    h.className = 'text-sm font-bold text-slate-800 mb-2';
    h.textContent = section.title;
    const p = document.createElement('p');
    p.className = 'text-sm text-slate-600 leading-6 whitespace-pre-wrap';
    p.textContent = section.content;
    card.append(h, p);
    host.appendChild(card);
  }
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
  set('modal-skill-category', `${skill.categoryLabel} · ${statusLabel(skill.status)}`);
  set('modal-skill-description', skill.description || '');
  set('modal-skill-content', skill.raw);
  renderSkillStructuredPreview(skill);
  modal.setAttribute('title', displayTitle(skill.title));

  // L3：模态主 CTA 与卡片共用 skillId，便于 loading 态同步
  const tryBtn = modal.querySelector<HTMLButtonElement>(
    '[data-skill-modal-action="try-deep-chat"]'
  );
  if (tryBtn) {
    tryBtn.dataset.skillId = skill.id;
    tryBtn.setAttribute('aria-label', `在 Deep Chat 试用：${displayTitle(skill.title)}`);
  }

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

/** AppModal 浮动关闭 / 遮罩关闭后同步外层 class */
function syncSkillModalClosed(): void {
  const modal = getSkillModal();
  modal?.classList.add('hidden');
  modal?.classList.remove('flex');
  currentSkill = null;
}

function handleCategoryClick(categoryBtn: HTMLElement): void {
  const cat = categoryBtn.dataset.category as SkillCategoryId | 'all' | undefined;
  if (!cat) return;
  currentCategory = cat;
  persistFilters();
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
    return;
  }
  if (action === 'try-deep-chat') {
    trySkillInDeepChat(skillId);
  }
}

function handleModuleClick(e: Event): void {
  const target = e.target as HTMLElement | null;
  if (!target || !moduleRoot) return;

  const categoryBtn = target.closest('.category-filter-btn') as HTMLElement | null;
  if (categoryBtn && moduleRoot.contains(categoryBtn)) {
    handleCategoryClick(categoryBtn);
    return;
  }

  const actionBtn = target.closest('[data-skill-action][data-skill-id]') as HTMLElement | null;
  if (actionBtn && moduleRoot.contains(actionBtn) && actionBtn.dataset.skillId) {
    e.preventDefault();
    e.stopPropagation();
    handleSkillAction(actionBtn.dataset.skillId, actionBtn.dataset.skillAction);
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
  if (target.closest('[data-skill-action]')) return;
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
    return;
  }
  if (action === 'try-deep-chat' && currentSkill) {
    const skillId = currentSkill.id;
    closeDetail();
    trySkillInDeepChat(skillId);
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
    persistFilters();
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
  getSkillModal()?.addEventListener('close', syncSkillModalClosed);
  document.addEventListener('keydown', handleDocumentKeydown);
}

function removeEventListeners(): void {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = null;
  searchInputRef?.removeEventListener('input', handleSearchInput);
  moduleRoot?.removeEventListener('click', handleModuleClick);
  moduleRoot?.removeEventListener('keydown', handleModuleKeydown);
  getSkillModal()?.removeEventListener('click', handleModalClick);
  getSkillModal()?.removeEventListener('close', syncSkillModalClosed);
  document.removeEventListener('keydown', handleDocumentKeydown);
  searchInputRef = null;
  moduleRoot = null;
}

class SkillsModule extends BaseModule {
  async mount(container: HTMLElement): Promise<void> {
    const html = await SafeTemplateLoader.getInstance().loadTemplate(
      'src/modules/more/views/explore/skills/template.html'
    );

    loadPersistedFilters();
    currentSkill = null;
    removeSkillModal();

    setSafeHtml(container, html);
    container.classList.add('fade-in');

    skillRegistry.ensureInitialized();
    mountSkillModal(container);
    initEventListeners(container);
    if (searchInputRef && currentKeyword) {
      searchInputRef.value = currentKeyword;
    }
    renderMetrics();
    renderCategories();
    renderList();
  }

  unmount(): void {
    persistFilters();
    closeDetail();
    removeEventListeners();
    removeSkillModal();
    currentSkill = null;
    // 不重置 category/keyword：F4 下次 mount 从 sessionStorage 恢复
  }
}

const skillsModule = new SkillsModule('more_skills');

export const mount = (container: HTMLElement) => skillsModule.mount(container);
export const unmount = () => skillsModule.unmount();

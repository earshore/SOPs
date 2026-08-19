/**
 * Deep Chat 侧栏 Skill Library：弹窗浏览 / 搜索 / 快速挂载技能（不离开当前页）
 */
import { setSafeHtml } from '@/common/utils/security';
import { displaySkillTitle } from '@/modules/app_center/skillDeepChatHandoff';
import { skillRegistry } from '@/services/skillRegistry';

import { escapeHTML } from '../infra/utils';

import type { SkillCategoryId, SkillMeta } from '@/services/skillRegistry';

export type SkillLibraryApplyHandler = (skillId: string) => void | Promise<void>;

type SkillLibraryRefs = {
  modal: HTMLElement;
  openButton: HTMLButtonElement | null;
  input: HTMLInputElement;
  category: HTMLSelectElement;
  results: HTMLElement;
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function setupSkillLibrary(
  container: HTMLElement,
  onApply: SkillLibraryApplyHandler,
  registerCleanup: (fn: () => void) => void
): void {
  const refs = getSkillLibraryRefs(container);
  if (!refs) {
    return;
  }

  portalSkillLibraryModal(refs.modal, registerCleanup);
  populateSkillLibraryCategories(refs.category);

  const onOpen = (): void => {
    openSkillLibraryModal(container);
  };
  refs.openButton?.addEventListener('click', onOpen);
  registerCleanup(() => refs.openButton?.removeEventListener('click', onOpen));

  const onFilterChange = (): void => {
    renderSkillLibraryResults(container);
  };
  refs.input.addEventListener('input', onFilterChange);
  refs.category.addEventListener('change', onFilterChange);
  registerCleanup(() => refs.input.removeEventListener('input', onFilterChange));
  registerCleanup(() => refs.category.removeEventListener('change', onFilterChange));

  const onModalClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }

    if (
      target.closest('[data-skill-library-close]') ||
      !target.closest('.deep-chat-skill-library-dialog')
    ) {
      closeSkillLibraryModal(container);
      return;
    }

    const applyButton = target.closest<HTMLButtonElement>('[data-skill-library-apply]');
    const skillId = applyButton?.dataset.skillLibraryApply;
    if (skillId) {
      // 必须先关 Skill Library，再弹出「挂载技能」确认框，否则会被本层遮罩挡住无法点击
      closeSkillLibraryModal(container);
      void Promise.resolve(onApply(skillId));
    }
  };
  refs.modal.addEventListener('click', onModalClick);
  registerCleanup(() => refs.modal.removeEventListener('click', onModalClick));

  const onDocumentKeydown = (event: KeyboardEvent): void => {
    if (refs.modal.hidden) {
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      closeSkillLibraryModal(container);
      return;
    }
    if (event.key === 'Tab') {
      keepSkillLibraryFocus(refs.modal, event);
    }
  };
  document.addEventListener('keydown', onDocumentKeydown);
  registerCleanup(() => document.removeEventListener('keydown', onDocumentKeydown));
}

function getSkillLibraryRefs(container: HTMLElement): SkillLibraryRefs | null {
  const root = container.ownerDocument;
  const modal =
    container.querySelector<HTMLElement>('#deep-chat-skill-library-modal') ||
    root.getElementById('deep-chat-skill-library-modal');
  const input =
    modal?.querySelector<HTMLInputElement>('#deep-chat-skill-library-search') ||
    root.querySelector<HTMLInputElement>('#deep-chat-skill-library-search');
  const category =
    modal?.querySelector<HTMLSelectElement>('#deep-chat-skill-library-category') ||
    root.querySelector<HTMLSelectElement>('#deep-chat-skill-library-category');
  const results =
    modal?.querySelector<HTMLElement>('#deep-chat-skill-library-results') ||
    root.querySelector<HTMLElement>('#deep-chat-skill-library-results');
  const openButton = container.querySelector<HTMLButtonElement>('#deep-chat-skill-library');

  if (!modal || !input || !category || !results) {
    return null;
  }

  return { modal, openButton, input, category, results };
}

function portalSkillLibraryModal(
  modal: HTMLElement,
  registerCleanup: (fn: () => void) => void
): void {
  const body = modal.ownerDocument.body;
  if (modal.parentElement === body) {
    return;
  }
  body.append(modal);
  registerCleanup(() => modal.remove());
}

function populateSkillLibraryCategories(select: HTMLSelectElement): void {
  const categories = skillRegistry.getCategories();
  select.replaceChildren();

  const allOption = select.ownerDocument.createElement('option');
  allOption.value = 'all';
  allOption.textContent = '全部分类';
  select.append(allOption);

  for (const item of categories) {
    const option = select.ownerDocument.createElement('option');
    option.value = item.id;
    option.textContent = `${item.label} (${item.count})`;
    select.append(option);
  }

  select.value = 'all';
}

function openSkillLibraryModal(container: HTMLElement): void {
  const refs = getSkillLibraryRefs(container);
  if (!refs) {
    return;
  }

  // 关闭调试参数面板，避免叠层
  const tuningPanel = container.querySelector<HTMLDetailsElement>('.deep-chat-tuning-panel');
  if (tuningPanel) {
    tuningPanel.open = false;
  }

  positionSkillLibraryModal(container, refs.modal);
  renderSkillLibraryResults(container);
  refs.modal.hidden = false;
  refs.modal.classList.add('is-visible');
  refs.modal.setAttribute('aria-hidden', 'false');
  refs.openButton?.setAttribute('aria-expanded', 'true');

  window.setTimeout(() => {
    if (!refs.modal.hidden) {
      refs.input.focus();
      refs.input.select();
    }
  }, 0);
}

export function closeSkillLibraryModal(container: HTMLElement): void {
  const refs = getSkillLibraryRefs(container);
  if (!refs || refs.modal.hidden) {
    return;
  }

  refs.modal.hidden = true;
  refs.modal.classList.remove('is-visible');
  refs.modal.setAttribute('aria-hidden', 'true');
  refs.openButton?.setAttribute('aria-expanded', 'false');
  refs.openButton?.focus();
}

function positionSkillLibraryModal(container: HTMLElement, modal: HTMLElement): void {
  const main = container.querySelector<HTMLElement>('.deep-chat-main');
  const rect = main?.getBoundingClientRect();
  if (!rect || rect.width <= 0 || rect.height <= 0) {
    modal.style.removeProperty('--deep-chat-skill-library-left');
    modal.style.removeProperty('--deep-chat-skill-library-top');
    return;
  }

  modal.style.setProperty('--deep-chat-skill-library-left', `${rect.left + rect.width / 2}px`);
  modal.style.setProperty('--deep-chat-skill-library-top', `${rect.top + rect.height / 2}px`);
}

function listSkillLibrarySkills(
  keyword: string,
  category: 'all' | SkillCategoryId
): SkillMeta[] | null {
  try {
    skillRegistry.ensureInitialized();
    return skillRegistry.listSkills({
      keyword: keyword || undefined,
      category,
    });
  } catch {
    return null;
  }
}

function renderSkillLibraryEmpty(keyword: string, category: 'all' | SkillCategoryId): string {
  const message = keyword || category !== 'all' ? '未找到匹配技能' : '暂无可用技能';
  return `<div class="deep-chat-skill-library-empty">${message}</div>`;
}

function renderSkillLibraryResults(container: HTMLElement): void {
  const refs = getSkillLibraryRefs(container);
  if (!refs) {
    return;
  }

  const keyword = refs.input.value.trim();
  const categoryValue = refs.category.value || 'all';
  const category = categoryValue === 'all' ? 'all' : (categoryValue as SkillCategoryId);
  const skills = listSkillLibrarySkills(keyword, category);

  if (!skills) {
    setSafeHtml(
      refs.results,
      `<div class="deep-chat-skill-library-empty">技能库暂不可用，请稍后重试</div>`
    );
    return;
  }

  if (skills.length === 0) {
    setSafeHtml(refs.results, renderSkillLibraryEmpty(keyword, category));
    return;
  }

  const filtered = keyword || category !== 'all';
  const countLabel = filtered ? `匹配 ${skills.length} 个技能` : `共 ${skills.length} 个技能`;
  setSafeHtml(
    refs.results,
    `
      <div class="deep-chat-skill-library-count">${escapeHTML(countLabel)}</div>
      <ul class="deep-chat-skill-library-list" role="list">
        ${skills.map(renderSkillLibraryItem).join('')}
      </ul>
    `
  );
}

function renderSkillLibraryItem(skill: SkillMeta): string {
  const title = displaySkillTitle(skill.title);
  const description = (skill.description || '暂无描述').trim();
  const statusBadge =
    skill.status === 'beta'
      ? '<span class="deep-chat-skill-library-badge is-beta">Beta</span>'
      : '';

  return `
    <li class="deep-chat-skill-library-item" role="listitem">
      <div class="deep-chat-skill-library-item__body">
        <div class="deep-chat-skill-library-item__title-row">
          <span class="deep-chat-skill-library-item__icon" aria-hidden="true">
            <i class="fas fa-graduation-cap"></i>
          </span>
          <span class="deep-chat-skill-library-item__title">${escapeHTML(title)}</span>
          ${statusBadge}
        </div>
        <p class="deep-chat-skill-library-item__desc">${escapeHTML(truncateText(description, 120))}</p>
        <div class="deep-chat-skill-library-item__meta">
          <span class="deep-chat-skill-library-chip">${escapeHTML(skill.categoryLabel)}</span>
        </div>
      </div>
      <button
        class="deep-chat-skill-library-apply"
        type="button"
        data-skill-library-apply="${escapeHTML(skill.id)}"
        aria-label="去对话 ${escapeHTML(title)}"
        title="挂载到 Deep Chat"
      >
        <i class="fas fa-bolt" aria-hidden="true"></i>
        <span>去对话</span>
      </button>
    </li>
  `;
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function keepSkillLibraryFocus(modal: HTMLElement, event: KeyboardEvent): void {
  const focusable = Array.from(modal.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    element => !element.hasAttribute('disabled') && element.tabIndex !== -1 && !element.hidden
  );

  if (focusable.length === 0) {
    event.preventDefault();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = modal.ownerDocument.activeElement as HTMLElement | null;

  if (event.shiftKey && active === first) {
    event.preventDefault();
    last?.focus();
    return;
  }

  if (!event.shiftKey && active === last) {
    event.preventDefault();
    first?.focus();
  }
}

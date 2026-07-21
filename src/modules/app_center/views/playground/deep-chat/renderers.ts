import { setSafeHtml } from '@/common/utils/security';
import type { PromptHistoryItem } from '@/types/state';
import type { PendingDeepChatRequest } from './requestLifecycle';
import { getActivePromptPreviewId, hidePromptPreview, renderPromptPreview } from './promptPreview';
import { formatPromptDraftMeta, getPromptDrafts } from './promptDrafts';
import type { DeepChatThread, DeepChatThreadStore } from './types';
import { escapeHTML, formatThreadTime, truncateText } from './utils';

const PROMPT_EMPTY_CLASS = 'is-prompt-empty';

export interface ThreadMenuState {
  threadId: string;
  placement: 'above' | 'below';
}

export interface ThreadEditingState {
  id: string;
  value: string;
}

export function renderThreadList(
  container: HTMLElement,
  threadStore: DeepChatThreadStore,
  pendingRequests: Map<string, PendingDeepChatRequest>,
  threadMenuState: ThreadMenuState | null = null,
  editingState: ThreadEditingState | null = null
): void {
  const list = container.querySelector<HTMLElement>('#deep-chat-thread-list');
  if (!list) {
    return;
  }

  const sortedThreads = sortThreadsForHistory(threadStore.threads);
  setSafeHtml(
    list,
    sortedThreads
      .map(thread =>
        renderThreadItem(
          thread,
          threadStore.activeThreadId,
          pendingRequests,
          threadMenuState,
          editingState
        )
      )
      .join('')
  );
}

function sortThreadsForHistory(threads: DeepChatThread[]): DeepChatThread[] {
  return [...threads].sort((a, b) => {
    const pinnedDelta = (b.pinnedAt || 0) - (a.pinnedAt || 0);
    return pinnedDelta || b.updatedAt - a.updatedAt;
  });
}

function renderThreadItem(
  thread: DeepChatThread,
  activeThreadId: string,
  pendingRequests: Map<string, PendingDeepChatRequest>,
  threadMenuState: ThreadMenuState | null,
  editingState: ThreadEditingState | null = null
): string {
  if (editingState && thread.id === editingState.id) {
    return renderThreadEditItem(thread, editingState.value);
  }

  const isActive = thread.id === activeThreadId;
  const isPinned = Boolean(thread.pinnedAt);
  const isMenuOpen = thread.id === threadMenuState?.threadId;
  const hasUnread = Boolean(thread.hasUnread) && !isActive;
  const escapedThreadId = escapeHTML(thread.id);
  const escapedTitle = escapeHTML(thread.title);
  const skillBadge = renderThreadSkillBadge(thread);
  const unreadDot = hasUnread
    ? '<span class="deep-chat-thread-unread" aria-label="有新回复" title="有新回复"></span>'
    : '';

  return `
      <div class="${getThreadItemClassName(isActive, isPinned, isMenuOpen, hasUnread)}">
        <button class="deep-chat-thread-select" type="button" data-thread-id="${escapedThreadId}">
          <span class="deep-chat-thread-copy">
            <span class="deep-chat-thread-name">${skillBadge}${escapedTitle}</span>
            <span class="deep-chat-thread-meta">${escapeHTML(getThreadMeta(thread, pendingRequests.get(thread.id)))}</span>
          </span>
          ${unreadDot}
        </button>
        <button class="deep-chat-thread-menu-toggle" type="button" data-thread-menu-id="${escapedThreadId}" aria-label="打开会话 ${escapedTitle} 的更多操作" aria-haspopup="menu" aria-expanded="${String(isMenuOpen)}" aria-controls="deep-chat-thread-menu-${escapedThreadId}" title="更多操作">
          <i class="fas fa-ellipsis" aria-hidden="true"></i>
        </button>
        ${renderThreadMenu(thread, isPinned, isMenuOpen, threadMenuState)}
      </div>
    `;
}

function renderThreadSkillBadge(thread: DeepChatThread): string {
  const contexts = thread.skillContexts || [];
  if (contexts.length === 0) {
    return '';
  }
  const titles = contexts
    .map(context => context.skillTitle.trim())
    .filter(Boolean)
    .join('、');
  const titleAttr = escapeHTML(titles ? `已挂载技能：${titles}` : '已挂载技能');
  return `<span class="deep-chat-thread-skill-badge" title="${titleAttr}" aria-label="${titleAttr}"><i class="fas fa-graduation-cap" aria-hidden="true"></i></span>`;
}

function renderThreadEditItem(thread: DeepChatThread, value: string): string {
  const escapedThreadId = escapeHTML(thread.id);
  const escapedValue = escapeHTML(value);
  const escapedTitle = escapeHTML(thread.title);
  return `
      <div class="deep-chat-thread-item is-editing">
        <span class="deep-chat-thread-copy">
          <input class="deep-chat-thread-name deep-chat-thread-name-input" type="text" value="${escapedValue}" data-thread-edit-id="${escapedThreadId}" aria-label="重命名会话 ${escapedTitle}" maxlength="120" />
        </span>
      </div>`;
}
function getThreadItemClassName(
  isActive: boolean,
  isPinned: boolean,
  isMenuOpen: boolean,
  hasUnread = false
): string {
  return [
    'deep-chat-thread-item',
    isActive ? 'is-active' : '',
    isPinned ? 'is-pinned' : '',
    isMenuOpen ? 'is-menu-open' : '',
    hasUnread ? 'is-unread' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function getThreadMeta(
  thread: DeepChatThread,
  pendingRequest: PendingDeepChatRequest | undefined
): string {
  if (pendingRequest) {
    // 用 startedAt（稳定）而非 updatedAt，避免每个 stream token 改文案触发整表重绘后仍看起来在「跳」
    const stateLabel = pendingRequest.isSettled ? '输出中' : '生成中';
    return `${stateLabel} · ${formatThreadTime(pendingRequest.startedAt)}`;
  }

  if (thread.draftText?.trim()) {
    return `草稿 · ${formatThreadTime(thread.updatedAt)}`;
  }

  if (thread.messages.length > 0) {
    return `${thread.messages.length} 条 · ${formatThreadTime(thread.updatedAt)}`;
  }

  return `空会话 · ${formatThreadTime(thread.updatedAt)}`;
}

function renderThreadMenu(
  thread: DeepChatThread,
  isPinned: boolean,
  isMenuOpen: boolean,
  threadMenuState: ThreadMenuState | null
): string {
  if (!isMenuOpen || !threadMenuState) {
    return '';
  }

  const escapedThreadId = escapeHTML(thread.id);
  const pinLabel = isPinned ? '取消置顶' : '置顶聊天';
  const placementClass =
    threadMenuState.placement === 'above'
      ? ' deep-chat-thread-menu--above'
      : ' deep-chat-thread-menu--below';

  return `
        <div id="deep-chat-thread-menu-${escapedThreadId}" class="deep-chat-thread-menu${placementClass}" role="menu">
          <button class="deep-chat-thread-menu-action" type="button" role="menuitem" data-thread-menu-action="rename" data-thread-menu-thread-id="${escapedThreadId}">
            <i class="fas fa-pen" aria-hidden="true"></i>
            <span>重命名</span>
          </button>
          <button class="deep-chat-thread-menu-action" type="button" role="menuitem" data-thread-menu-action="pin" data-thread-menu-thread-id="${escapedThreadId}">
            <i class="fas fa-thumbtack" aria-hidden="true"></i>
            <span>${pinLabel}</span>
          </button>
          <button class="deep-chat-thread-menu-action is-danger" type="button" role="menuitem" data-thread-menu-action="delete" data-thread-menu-thread-id="${escapedThreadId}">
            <i class="fas fa-trash" aria-hidden="true"></i>
            <span>删除</span>
          </button>
        </div>`;
}

export function renderPromptDraftList(
  container: HTMLElement,
  selectedPromptDraftId?: string
): void {
  const list = container.querySelector<HTMLElement>('#deep-chat-prompt-list');
  if (!list) {
    return;
  }

  const prompts = getPromptDrafts();
  syncPromptEmptyState(container, prompts.length === 0);
  if (prompts.length === 0) {
    setSafeHtml(
      list,
      `
      <div class="deep-chat-prompt-empty">
        <div class="deep-chat-prompt-empty-title">暂无 Prompt</div>
        <p>从 Prompt 生成页创建后，可在这里一键带入新会话。</p>
        <button class="deep-chat-prompt-empty-action" type="button" data-open-promptlab>
          前往 Prompt 生成
        </button>
      </div>
    `
    );
    hidePromptPreview(container);
    return;
  }

  const activePromptPreviewId = getActivePromptPreviewId();
  setSafeHtml(
    list,
    prompts
      .map(prompt => renderPromptDraftItem(prompt, activePromptPreviewId, selectedPromptDraftId))
      .join('')
  );

  const activePrompt = activePromptPreviewId
    ? prompts.find(prompt => prompt.id === activePromptPreviewId)
    : null;
  if (activePrompt) {
    renderPromptPreview(container, activePrompt);
  } else if (activePromptPreviewId) {
    hidePromptPreview(container);
  }
}

function renderPromptDraftItem(
  prompt: PromptHistoryItem,
  activePromptPreviewId: string | null,
  selectedPromptDraftId: string | undefined
): string {
  const typeLabel = getPromptDraftTypeLabel(prompt);
  const isPreviewActive = prompt.id === activePromptPreviewId;
  const isSelected = prompt.id === selectedPromptDraftId;
  const promptId = escapeHTML(prompt.id);
  const actionLabel = isSelected
    ? `当前会话已使用 ${typeLabel} Prompt`
    : `使用 ${typeLabel} Prompt`;
  const snippet = truncateText(prompt.prompt.replace(/\s+/g, ' ').trim(), 70);

  return `
      <div class="${getPromptDraftItemClassName(typeLabel, isPreviewActive, isSelected)}"${isSelected ? ' aria-current="true"' : ''}>
        <button class="deep-chat-prompt-draft" type="button" data-preview-prompt-id="${promptId}" data-use-prompt-draft-id="${promptId}" aria-label="${escapeHTML(actionLabel)}" aria-pressed="${String(isSelected)}" aria-describedby="deep-chat-prompt-preview-popover">
          <span class="deep-chat-prompt-copy">
            <span class="deep-chat-prompt-row">
              <span class="deep-chat-prompt-badge">${typeLabel}</span>
              <span class="deep-chat-prompt-meta">${escapeHTML(formatPromptDraftMeta(prompt))}</span>
            </span>
            <span class="deep-chat-prompt-snippet">${escapeHTML(snippet)}</span>
          </span>
        </button>
        <button class="deep-chat-prompt-delete" type="button" data-delete-prompt-draft-id="${promptId}" aria-label="删除 ${typeLabel} Prompt" title="删除 Prompt">
          <i class="fas fa-trash" aria-hidden="true"></i>
        </button>
      </div>
    `;
}

function getPromptDraftTypeLabel(prompt: PromptHistoryItem): string {
  return prompt.promptType === 'visual' ? 'Visual' : 'Listing';
}

function getPromptDraftItemClassName(
  typeLabel: string,
  isPreviewActive: boolean,
  isSelected: boolean
): string {
  return [
    'deep-chat-prompt-item',
    `deep-chat-prompt-item--${typeLabel.toLowerCase()}`,
    isPreviewActive ? 'is-preview-active' : '',
    isSelected ? 'is-selected' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function syncPromptEmptyState(container: HTMLElement, isEmpty: boolean): void {
  container
    .querySelector<HTMLElement>('.deep-chat-page')
    ?.classList.toggle(PROMPT_EMPTY_CLASS, isEmpty);
}

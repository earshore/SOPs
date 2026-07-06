import { setSafeHtml } from '@/common/utils/security';
import type { PromptHistoryItem } from '@/types/state';
import type { PendingPlaygroundRequest } from './requestLifecycle';
import { getActivePromptPreviewId, hidePromptPreview, renderPromptPreview } from './promptPreview';
import { formatPromptDraftMeta, getPromptDrafts } from './promptDrafts';
import type { PlaygroundThread, PlaygroundThreadStore } from './types';
import { escapeHTML, formatThreadTime, truncateText } from './utils';

const PROMPT_EMPTY_CLASS = 'is-prompt-empty';

export interface ThreadMenuState {
  threadId: string;
  placement: 'above' | 'below';
}

export function renderThreadList(
  container: HTMLElement,
  threadStore: PlaygroundThreadStore,
  pendingRequests: Map<string, PendingPlaygroundRequest>,
  threadMenuState: ThreadMenuState | null = null
): void {
  const list = container.querySelector<HTMLElement>('#playground-thread-list');
  if (!list) {
    return;
  }

  const sortedThreads = sortThreadsForHistory(threadStore.threads);
  setSafeHtml(
    list,
    sortedThreads
      .map(thread =>
        renderThreadItem(thread, threadStore.activeThreadId, pendingRequests, threadMenuState)
      )
      .join('')
  );
}

function sortThreadsForHistory(threads: PlaygroundThread[]): PlaygroundThread[] {
  return [...threads].sort((a, b) => {
    const pinnedDelta = (b.pinnedAt || 0) - (a.pinnedAt || 0);
    return pinnedDelta || b.updatedAt - a.updatedAt;
  });
}

function renderThreadItem(
  thread: PlaygroundThread,
  activeThreadId: string,
  pendingRequests: Map<string, PendingPlaygroundRequest>,
  threadMenuState: ThreadMenuState | null
): string {
  const isActive = thread.id === activeThreadId;
  const isPinned = Boolean(thread.pinnedAt);
  const isMenuOpen = thread.id === threadMenuState?.threadId;
  const escapedThreadId = escapeHTML(thread.id);
  const escapedTitle = escapeHTML(thread.title);

  return `
      <div class="${getThreadItemClassName(isActive, isPinned, isMenuOpen)}">
        <button class="playground-thread-select" type="button" data-thread-id="${escapedThreadId}">
          <span class="playground-thread-copy">
            <span class="playground-thread-name">${escapedTitle}</span>
            <span class="playground-thread-meta">${escapeHTML(getThreadMeta(thread, pendingRequests.get(thread.id)))}</span>
          </span>
        </button>
        <button class="playground-thread-menu-toggle" type="button" data-thread-menu-id="${escapedThreadId}" aria-label="打开会话 ${escapedTitle} 的更多操作" aria-haspopup="menu" aria-expanded="${String(isMenuOpen)}" aria-controls="playground-thread-menu-${escapedThreadId}" title="更多操作">
          <i class="fas fa-ellipsis" aria-hidden="true"></i>
        </button>
        ${renderThreadMenu(thread, isPinned, isMenuOpen, threadMenuState)}
      </div>
    `;
}

function getThreadItemClassName(isActive: boolean, isPinned: boolean, isMenuOpen: boolean): string {
  return [
    'playground-thread-item',
    isActive ? 'is-active' : '',
    isPinned ? 'is-pinned' : '',
    isMenuOpen ? 'is-menu-open' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function getThreadMeta(
  thread: PlaygroundThread,
  pendingRequest: PendingPlaygroundRequest | undefined
): string {
  if (pendingRequest) {
    const stateLabel = pendingRequest.isSettled ? '输出中' : '生成中';
    return `${stateLabel} · ${formatThreadTime(pendingRequest.updatedAt)}`;
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
  thread: PlaygroundThread,
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
      ? ' playground-thread-menu--above'
      : ' playground-thread-menu--below';

  return `
        <div id="playground-thread-menu-${escapedThreadId}" class="playground-thread-menu${placementClass}" role="menu">
          <button class="playground-thread-menu-action" type="button" role="menuitem" data-thread-menu-action="rename" data-thread-menu-thread-id="${escapedThreadId}">
            <i class="fas fa-pen" aria-hidden="true"></i>
            <span>重命名</span>
          </button>
          <button class="playground-thread-menu-action" type="button" role="menuitem" data-thread-menu-action="pin" data-thread-menu-thread-id="${escapedThreadId}">
            <i class="fas fa-thumbtack" aria-hidden="true"></i>
            <span>${pinLabel}</span>
          </button>
          <button class="playground-thread-menu-action is-danger" type="button" role="menuitem" data-thread-menu-action="delete" data-thread-menu-thread-id="${escapedThreadId}">
            <i class="fas fa-trash" aria-hidden="true"></i>
            <span>删除</span>
          </button>
        </div>`;
}

export function renderPromptDraftList(
  container: HTMLElement,
  selectedPromptDraftId?: string
): void {
  const list = container.querySelector<HTMLElement>('#playground-prompt-list');
  if (!list) {
    return;
  }

  const prompts = getPromptDrafts();
  syncPromptEmptyState(container, prompts.length === 0);
  if (prompts.length === 0) {
    setSafeHtml(
      list,
      `
      <div class="playground-prompt-empty">
        <div class="playground-prompt-empty-title">暂无 Prompt</div>
        <p>从 Prompt 生成页创建后，可在这里一键带入新会话。</p>
        <button class="playground-prompt-empty-action" type="button" data-open-promptlab>
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
        <button class="playground-prompt-draft" type="button" data-preview-prompt-id="${promptId}" data-use-prompt-draft-id="${promptId}" aria-label="${escapeHTML(actionLabel)}" aria-pressed="${String(isSelected)}" aria-describedby="playground-prompt-preview-popover">
          <span class="playground-prompt-copy">
            <span class="playground-prompt-row">
              <span class="playground-prompt-badge">${typeLabel}</span>
              <span class="playground-prompt-meta">${escapeHTML(formatPromptDraftMeta(prompt))}</span>
            </span>
            <span class="playground-prompt-snippet">${escapeHTML(snippet)}</span>
          </span>
        </button>
        <button class="playground-prompt-delete" type="button" data-delete-prompt-draft-id="${promptId}" aria-label="删除 ${typeLabel} Prompt" title="删除 Prompt">
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
    'playground-prompt-item',
    `playground-prompt-item--${typeLabel.toLowerCase()}`,
    isPreviewActive ? 'is-preview-active' : '',
    isSelected ? 'is-selected' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function syncPromptEmptyState(container: HTMLElement, isEmpty: boolean): void {
  container
    .querySelector<HTMLElement>('.playground-page')
    ?.classList.toggle(PROMPT_EMPTY_CLASS, isEmpty);
}

import { setSafeHtml } from '@/common/utils/security';
import type { PendingPlaygroundRequest } from './requestLifecycle';
import { getActivePromptPreviewId, hidePromptPreview, renderPromptPreview } from './promptPreview';
import { formatPromptDraftMeta, getPromptDrafts } from './promptDrafts';
import type { PlaygroundThreadStore } from './types';
import { escapeHTML, formatThreadTime, truncateText } from './utils';

const PROMPT_EMPTY_CLASS = 'is-prompt-empty';

export function renderThreadList(
  container: HTMLElement,
  threadStore: PlaygroundThreadStore,
  pendingRequests: Map<string, PendingPlaygroundRequest>
): void {
  const list = container.querySelector<HTMLElement>('#playground-thread-list');
  if (!list) {
    return;
  }

  const sortedThreads = [...threadStore.threads].sort((a, b) => b.updatedAt - a.updatedAt);
  setSafeHtml(
    list,
    sortedThreads
      .map(thread => {
        const isActive = thread.id === threadStore.activeThreadId;
        const messageCount = thread.messages.length;
        const pendingRequest = pendingRequests.get(thread.id);
        const hasDraft = !!thread.draftText?.trim();
        const meta = pendingRequest
          ? `${pendingRequest.isSettled ? '输出中' : '生成中'} · ${formatThreadTime(pendingRequest.updatedAt)}`
          : hasDraft
            ? `草稿 · ${formatThreadTime(thread.updatedAt)}`
            : messageCount > 0
              ? `${messageCount} 条 · ${formatThreadTime(thread.updatedAt)}`
              : `空会话 · ${formatThreadTime(thread.updatedAt)}`;

        return `
      <div class="playground-thread-item${isActive ? ' is-active' : ''}">
        <button class="playground-thread-select" type="button" data-thread-id="${thread.id}">
          <span class="playground-thread-icon">
            <i class="far fa-message"></i>
          </span>
          <span class="playground-thread-copy">
            <span class="playground-thread-name">${escapeHTML(thread.title)}</span>
            <span class="playground-thread-meta">${escapeHTML(meta)}</span>
          </span>
        </button>
        <button class="playground-thread-delete" type="button" data-delete-thread-id="${thread.id}" aria-label="删除会话 ${escapeHTML(thread.title)}" title="删除会话">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
      })
      .join('')
  );
}

export function renderPromptDraftList(container: HTMLElement): void {
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
      .map(prompt => {
        const typeLabel = prompt.promptType === 'visual' ? 'Visual' : 'Listing';
        const iconClass = prompt.promptType === 'visual' ? 'fas fa-palette' : 'fas fa-pen-nib';
        const meta = formatPromptDraftMeta(prompt);
        const snippet = truncateText(prompt.prompt.replace(/\s+/g, ' ').trim(), 70);
        const previewAriaLabel = `预览 ${typeLabel} Prompt`;
        const useAriaLabel = `创建新会话并填入 ${typeLabel} Prompt`;
        const isPreviewActive = prompt.id === activePromptPreviewId;

        return `
      <div class="playground-prompt-item playground-prompt-item--${typeLabel.toLowerCase()}${isPreviewActive ? ' is-preview-active' : ''}">
        <button class="playground-prompt-draft" type="button" data-preview-prompt-id="${escapeHTML(prompt.id)}" aria-label="${escapeHTML(previewAriaLabel)}" aria-describedby="playground-prompt-preview-popover">
          <span class="playground-prompt-icon">
            <i class="${iconClass}" aria-hidden="true"></i>
          </span>
          <span class="playground-prompt-copy">
            <span class="playground-prompt-row">
              <span class="playground-prompt-badge">${typeLabel}</span>
              <span class="playground-prompt-meta">${escapeHTML(meta)}</span>
            </span>
            <span class="playground-prompt-snippet">${escapeHTML(snippet)}</span>
          </span>
        </button>
        <button class="playground-prompt-use" type="button" data-use-prompt-draft-id="${escapeHTML(prompt.id)}" aria-label="${escapeHTML(useAriaLabel)}" title="使用 Prompt">
          <i class="fas fa-arrow-right-to-bracket" aria-hidden="true"></i>
        </button>
        <button class="playground-prompt-delete" type="button" data-delete-prompt-draft-id="${escapeHTML(prompt.id)}" aria-label="删除 ${typeLabel} Prompt" title="删除 Prompt">
          <i class="fas fa-trash" aria-hidden="true"></i>
        </button>
      </div>
    `;
      })
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

function syncPromptEmptyState(container: HTMLElement, isEmpty: boolean): void {
  container
    .querySelector<HTMLElement>('.playground-page')
    ?.classList.toggle(PROMPT_EMPTY_CLASS, isEmpty);
}

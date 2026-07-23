import { setSafeHtml } from '@/common/utils/security';
import { updateRuntimeCssRule } from '@/common/utils/runtimeStyles';
import type { PromptHistoryItem } from '@/types/state';
import { formatPromptDraftPreviewMeta, getPromptDrafts } from './promptDrafts';
import type { PromptPreviewLeftOptions, PromptPreviewPointer } from './types';
import { escapeHTML } from './utils';

/** Hover must stay still this long before the Listing Prompt bubble appears. */
const PROMPT_PREVIEW_SHOW_DELAY_MS = 1000;

let activePromptPreviewId: string | null = null;
let promptPreviewHideTimer: number | null = null;
let promptPreviewShowTimer: number | null = null;
let pendingPromptPreviewId: string | null = null;
let isPromptPreviewHovered = false;

export function setupPromptPreview(
  container: HTMLElement,
  promptList: HTMLElement | null,
  addCleanup: (cleanup: () => void) => void
): void {
  const preview = container.querySelector<HTMLElement>('#deep-chat-prompt-preview-popover');
  if (!promptList || !preview) {
    return;
  }
  document.body.appendChild(preview);
  addCleanup(() => {
    clearPromptPreviewShowTimer();
    preview.remove();
  });

  const onPromptPointerOver = (event: PointerEvent): void => {
    const target = event.target as HTMLElement | null;
    const promptButton = target?.closest<HTMLButtonElement>('[data-preview-prompt-id]');
    const promptId = promptButton?.dataset.previewPromptId;
    const relatedTarget = event.relatedTarget as Node | null;
    if (promptButton && relatedTarget && promptButton.contains(relatedTarget)) {
      return;
    }

    if (!promptId || !promptButton) {
      return;
    }

    // Already showing this prompt — keep it; cancel any hide.
    if (activePromptPreviewId === promptId) {
      clearPromptPreviewHideTimer();
      return;
    }

    schedulePromptPreviewShow(container, promptId, promptButton, {
      clientX: event.clientX,
      clientY: event.clientY,
    });
  };

  const onPromptFocusIn = (event: FocusEvent): void => {
    const target = event.target as HTMLElement | null;
    const promptButton = target?.closest<HTMLButtonElement>('[data-preview-prompt-id]');
    const promptId = promptButton?.dataset.previewPromptId;
    if (promptId) {
      // Keyboard focus: show immediately (no hover dwell).
      clearPromptPreviewShowTimer();
      showPromptPreview(container, promptId, promptButton);
    }
  };

  const onPromptPointerLeave = (): void => {
    clearPromptPreviewShowTimer();
    schedulePromptPreviewHide(container);
  };

  const onPreviewPointerEnter = (): void => {
    isPromptPreviewHovered = true;
    clearPromptPreviewHideTimer();
    clearPromptPreviewShowTimer();
  };

  const onPreviewPointerLeave = (): void => {
    isPromptPreviewHovered = false;
    schedulePromptPreviewHide(container);
  };

  promptList.addEventListener('pointerover', onPromptPointerOver);
  promptList.addEventListener('focusin', onPromptFocusIn);
  promptList.addEventListener('pointerleave', onPromptPointerLeave);
  preview.addEventListener('pointerenter', onPreviewPointerEnter);
  preview.addEventListener('pointerleave', onPreviewPointerLeave);
  addCleanup(() => {
    clearPromptPreviewShowTimer();
    promptList.removeEventListener('pointerover', onPromptPointerOver);
    promptList.removeEventListener('focusin', onPromptFocusIn);
    promptList.removeEventListener('pointerleave', onPromptPointerLeave);
    preview.removeEventListener('pointerenter', onPreviewPointerEnter);
    preview.removeEventListener('pointerleave', onPreviewPointerLeave);
  });
}

function schedulePromptPreviewShow(
  container: HTMLElement,
  promptId: string,
  anchor: HTMLElement,
  pointer: PromptPreviewPointer
): void {
  // Same item already waiting to show — keep the original dwell timer.
  if (pendingPromptPreviewId === promptId && promptPreviewShowTimer !== null) {
    return;
  }

  clearPromptPreviewShowTimer();
  clearPromptPreviewHideTimer();
  pendingPromptPreviewId = promptId;

  promptPreviewShowTimer = window.setTimeout(() => {
    promptPreviewShowTimer = null;
    pendingPromptPreviewId = null;
    showPromptPreview(container, promptId, anchor, pointer);
  }, PROMPT_PREVIEW_SHOW_DELAY_MS);
}

function clearPromptPreviewShowTimer(): void {
  if (promptPreviewShowTimer !== null) {
    window.clearTimeout(promptPreviewShowTimer);
    promptPreviewShowTimer = null;
  }
  pendingPromptPreviewId = null;
}

export function showPromptPreview(
  container: HTMLElement,
  promptId: string,
  anchor?: HTMLElement,
  pointer?: PromptPreviewPointer
): void {
  const promptDraft = getPromptDrafts().find(item => item.id === promptId);
  if (!promptDraft) {
    hidePromptPreview(container);
    return;
  }

  clearPromptPreviewShowTimer();
  clearPromptPreviewHideTimer();
  activePromptPreviewId = promptId;
  renderPromptPreview(container, promptDraft, anchor, pointer);
  syncPromptPreviewHighlight(container);
}

export function renderPromptPreview(
  container: HTMLElement,
  promptDraft: PromptHistoryItem,
  anchor?: HTMLElement,
  pointer?: PromptPreviewPointer
): void {
  const preview = document.getElementById('deep-chat-prompt-preview-popover');
  const title = preview?.querySelector<HTMLElement>('.deep-chat-prompt-preview-title');
  const body = preview?.querySelector<HTMLElement>('.deep-chat-prompt-preview-body');
  if (!preview || !title || !body) {
    return;
  }

  const typeLabel = `${promptDraft.promptType === 'visual' ? 'Visual' : 'Listing'} Prompt`;
  const previewMeta = formatPromptDraftPreviewMeta(promptDraft);
  setSafeHtml(
    title,
    `
    <span class="deep-chat-prompt-preview-title-main">${escapeHTML(typeLabel)}</span>
    ${previewMeta ? `<span class="deep-chat-prompt-preview-title-meta">${escapeHTML(previewMeta)}</span>` : ''}
  `
  );
  body.textContent = promptDraft.prompt;
  body.scrollTop = 0;
  positionPromptPreview(container, preview, anchor, pointer);
  preview.classList.add('is-visible');
  preview.setAttribute('aria-hidden', 'false');
}

export function hidePromptPreview(container: HTMLElement): void {
  clearPromptPreviewShowTimer();
  clearPromptPreviewHideTimer();
  activePromptPreviewId = null;
  syncPromptPreviewHighlight(container);
  const preview = document.getElementById('deep-chat-prompt-preview-popover');
  if (!preview) {
    return;
  }

  preview.classList.remove('is-visible');
  preview.setAttribute('aria-hidden', 'true');
}

export function resetPromptPreviewState(): void {
  activePromptPreviewId = null;
  clearPromptPreviewShowTimer();
  clearPromptPreviewHideTimer();
  isPromptPreviewHovered = false;
}

export function getActivePromptPreviewId(): string | null {
  return activePromptPreviewId;
}

function positionPromptPreview(
  container: HTMLElement,
  preview: HTMLElement,
  anchor?: HTMLElement,
  pointer?: PromptPreviewPointer
): void {
  const promptRail = container.querySelector<HTMLElement>('#deep-chat-prompt-rail');
  const promptRailRect = promptRail?.getBoundingClientRect();
  const anchorRect = anchor?.getBoundingClientRect();
  const viewportPadding = 16;
  const gap = pointer ? 14 : 12;
  const previewWidth = Math.min(480, Math.max(280, window.innerWidth - viewportPadding * 2));
  const previewHeight = Math.min(520, Math.max(260, window.innerHeight - 160));
  const maxLeft = Math.max(viewportPadding, window.innerWidth - previewWidth - viewportPadding);
  const preferredLeft = resolvePromptPreviewLeft({
    pointer,
    anchorRect,
    promptRailRect,
    previewWidth,
    gap,
    viewportPadding,
  });
  const left = Math.round(clampNumber(preferredLeft, viewportPadding, maxLeft));
  const anchoredTop = anchorRect?.top ?? (promptRailRect ? promptRailRect.top + 56 : 118);
  const minTop = 72;
  const maxTop = Math.max(minTop, window.innerHeight - previewHeight - 24);
  const preferredTop = resolvePromptPreviewTop(
    pointer,
    anchoredTop,
    previewHeight,
    gap,
    viewportPadding
  );
  const top = Math.round(clampNumber(preferredTop, minTop, maxTop));
  const anchorY = pointer?.clientY;
  const arrowTop = resolvePromptPreviewArrowTop(anchorY, top, previewHeight);
  const anchorX = pointer?.clientX ?? anchorRect?.left ?? promptRailRect?.left;
  const isLeftOfAnchor = Number.isFinite(anchorX) && left + previewWidth <= Number(anchorX) - 2;

  preview.classList.add('deep-chat-prompt-preview-popover--positioned');
  updateRuntimeCssRule(
    'deep-chat-prompt-preview-position',
    '.deep-chat-prompt-preview-popover.deep-chat-prompt-preview-popover--positioned',
    {
      left: `${left}px`,
      top: `${top}px`,
      width: `${previewWidth}px`,
      'max-height': `${previewHeight}px`,
      '--deep-chat-prompt-preview-arrow-top': `${arrowTop}px`,
      '--deep-chat-prompt-preview-body-max-height': `${Math.max(180, previewHeight - 48)}px`,
    }
  );
  preview.classList.toggle('is-left-of-anchor', isLeftOfAnchor);
}

function resolvePromptPreviewLeft({
  pointer,
  anchorRect,
  promptRailRect,
  previewWidth,
  gap,
  viewportPadding,
}: PromptPreviewLeftOptions): number {
  const anchorLeft =
    pointer?.clientX ?? anchorRect?.left ?? promptRailRect?.left ?? viewportPadding;
  const anchorRight =
    pointer?.clientX ?? anchorRect?.right ?? promptRailRect?.right ?? viewportPadding;
  const leftSide = anchorLeft - previewWidth - gap;
  const rightSide = anchorRight + gap;
  const canShowLeft = leftSide >= viewportPadding;
  const canShowRight = rightSide + previewWidth <= window.innerWidth - viewportPadding;

  if (canShowLeft) {
    return leftSide;
  }

  if (canShowRight) {
    return rightSide;
  }

  return leftSide;
}

function resolvePromptPreviewTop(
  pointer: PromptPreviewPointer | undefined,
  anchoredTop: number,
  previewHeight: number,
  gap: number,
  viewportPadding: number
): number {
  if (!pointer) {
    return anchoredTop;
  }

  const pointerTop = pointer.clientY + gap;
  if (pointerTop + previewHeight > window.innerHeight - viewportPadding) {
    return pointer.clientY - previewHeight - gap;
  }

  return pointerTop;
}

function resolvePromptPreviewArrowTop(
  anchorY: number | undefined,
  top: number,
  previewHeight: number
): number {
  if (!Number.isFinite(anchorY)) {
    return 28;
  }

  return Math.round(clampNumber(Number(anchorY) - top - 6, 16, Math.max(16, previewHeight - 24)));
}

function schedulePromptPreviewHide(container: HTMLElement): void {
  clearPromptPreviewHideTimer();
  promptPreviewHideTimer = window.setTimeout(() => {
    if (!isPromptPreviewHovered) {
      hidePromptPreview(container);
    }
  }, 160);
}

function syncPromptPreviewHighlight(container: HTMLElement): void {
  container.querySelectorAll<HTMLElement>('.deep-chat-prompt-item').forEach(item => {
    const promptButton = item.querySelector<HTMLButtonElement>('[data-preview-prompt-id]');
    item.classList.toggle(
      'is-preview-active',
      promptButton?.dataset.previewPromptId === activePromptPreviewId
    );
  });
}

function clearPromptPreviewHideTimer(): void {
  if (promptPreviewHideTimer !== null) {
    window.clearTimeout(promptPreviewHideTimer);
    promptPreviewHideTimer = null;
  }
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

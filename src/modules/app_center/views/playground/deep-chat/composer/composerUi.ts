import { showToast } from '@/common/ui/notifications';
import {
  buildSystemPromptFromSkillContexts,
  normalizeSkillChipDraftText,
  prefixDraftWithSkillContexts,
  stripSkillMarkersFromDraft,
} from '@/modules/app_center/skillDeepChatHandoff';



import { refreshMessageToolbarStatuses } from './messageToolbar';
import {
  SKILL_CHIP_CLASS,
  createSkillContextChip,
  serializeChipContainingElement,
  setContentWithInlineSkillChips,
  textContainsSkillChipMarker,
} from './skillContextChip';
import { EMPTY_CHAT_WRAP_HEIGHT } from '../constants';
import { createTextInputEvent } from '../infra/utils';
import { getChat } from '../session/domHelpers';
import { stopPendingRequest } from '../session/pendingRuntime';
import {
  sessionState,
  SESSION_SKILL_CHIP_DOCK_ID,
  draftPersistController,
} from '../session/sessionState';
import {
  getActiveThread,
  isThreadVisibleInHistory,
  renderMountedThreadList,
  updateActiveThreadFields,
} from '../session/threadStore';
import { uiHooks, registerComposerUiHooks } from '../session/uiHooks';

import type { DeepChatElement, DeepChatSkillContext, DeepChatThread } from '../types';

export function setupDraftInputHeightSync(
  container: HTMLElement,
  chat: DeepChatElement,
  attempts = 8
): void {
  clearDraftInputHeightSync();
  const root = chat.shadowRoot;
  const inputContainer = root?.querySelector<HTMLElement>('#text-input-container');
  const input = root?.querySelector<HTMLElement>('#text-input');

  if (!root || !inputContainer || !input) {
    if (attempts > 0) {
      sessionState.draftInputResizeRetryTimer = window.setTimeout(
        () => setupDraftInputHeightSync(container, chat, attempts - 1),
        50
      );
    }
    return;
  }

  syncDraftInputHeight(container);

  if (typeof ResizeObserver === 'function') {
    sessionState.draftInputResizeObserver = new ResizeObserver(() => {
      syncDraftInputHeight(container);
    });
    sessionState.draftInputResizeObserver.observe(inputContainer);
  }

  restoreActiveThreadDraftInput(container);
  syncSessionSkillChipDock(container);
  bindInlineSkillChipControls(container, root);
  placeSkillComposerChrome(container);
  observeSkillComposerChrome(container, chat);

  const onDraftInput = (): void => {
    saveActiveThreadDraft(container);
    window.requestAnimationFrame(() => {
      syncDraftInputHeight(container);
      const chatEl = getChat(container);
      if (chatEl) {
        alignSubmitButtonLayerToTextInput(chatEl);
      }
    });
  };
  root.addEventListener('input', onDraftInput);
  sessionState.cleanupDraftInputHeightListener = () =>
    root.removeEventListener('input', onDraftInput);
}

export function syncDraftInputHeight(
  container: HTMLElement,
  options: { instant?: boolean } = {}
): void {
  const apply = (): void => {
    sessionState.draftHeightSyncRaf = null;
    const wrap = container.querySelector<HTMLElement>('.deep-chat-wrap');
    if (!wrap) {
      return;
    }

    const page = container.querySelector<HTMLElement>('.deep-chat-page');
    if (page?.classList.contains('is-chatting')) {
      wrap.classList.remove('is-draft-height-md', 'is-draft-height-lg', 'is-draft-height-xl');
      return;
    }

    const inputContainer =
      getChat(container)?.shadowRoot?.querySelector<HTMLElement>('#text-input-container');
    const inputHeight = Math.ceil(
      inputContainer?.getBoundingClientRect().height || EMPTY_CHAT_WRAP_HEIGHT
    );
    const draftHeight = Math.max(EMPTY_CHAT_WRAP_HEIGHT, inputHeight);
    const nextMd = draftHeight > EMPTY_CHAT_WRAP_HEIGHT;
    const nextLg = draftHeight > 240;
    const nextXl = draftHeight > 340;
    const changed =
      wrap.classList.contains('is-draft-height-md') !== nextMd ||
      wrap.classList.contains('is-draft-height-lg') !== nextLg ||
      wrap.classList.contains('is-draft-height-xl') !== nextXl;
    if (!changed) {
      return;
    }

    if (options.instant) {
      wrap.classList.add('is-height-instant');
    }
    wrap.classList.toggle('is-draft-height-md', nextMd);
    wrap.classList.toggle('is-draft-height-lg', nextLg);
    wrap.classList.toggle('is-draft-height-xl', nextXl);
    if (options.instant) {
      // 强制应用瞬时高度，再下一帧恢复 transition，避免试用进入时上下晃动
      void wrap.offsetHeight;
      window.requestAnimationFrame(() => {
        wrap.classList.remove('is-height-instant');
      });
    }
  };

  if (options.instant) {
    if (sessionState.draftHeightSyncRaf !== null) {
      window.cancelAnimationFrame(sessionState.draftHeightSyncRaf);
      sessionState.draftHeightSyncRaf = null;
    }
    apply();
    return;
  }

  if (sessionState.draftHeightSyncRaf !== null) {
    return;
  }
  sessionState.draftHeightSyncRaf = window.requestAnimationFrame(apply);
}

export function getDraftInput(container: HTMLElement): HTMLElement | null {
  return getChat(container)?.shadowRoot?.querySelector<HTMLElement>('#text-input') || null;
}

export function shouldShowSessionSkillChipDock(
  contexts: DeepChatSkillContext[],
  draftText: string
): boolean {
  if (contexts.length === 0) {
    return false;
  }
  return !textContainsSkillChipMarker(draftText, contexts);
}

export function ensureSessionSkillChipDock(
  root: ShadowRoot,
  inputContainer: HTMLElement,
  input: HTMLElement
): HTMLElement {
  const existingDock = root.querySelector<HTMLElement>(`#${SESSION_SKILL_CHIP_DOCK_ID}`);
  if (existingDock) {
    return existingDock;
  }

  const dock = document.createElement('div');
  dock.id = SESSION_SKILL_CHIP_DOCK_ID;
  dock.className = 'deep-chat-session-skill-chip-dock';
  dock.setAttribute('aria-label', '已挂载技能');
  inputContainer.insertBefore(dock, input);
  return dock;
}

export function renderSessionSkillChipDockChildren(
  dock: HTMLElement,
  contexts: DeepChatSkillContext[]
): void {
  const renderedSkillIds = Array.from(
    dock.querySelectorAll<HTMLElement>(`.${SKILL_CHIP_CLASS}`)
  ).map(chip => chip.dataset.skillId || '');
  const nextSkillIds = contexts.map(context => context.skillId);
  if (
    renderedSkillIds.length === nextSkillIds.length &&
    renderedSkillIds.every((skillId, index) => skillId === nextSkillIds[index])
  ) {
    return;
  }
  dock.replaceChildren(...contexts.map(context => createSkillContextChip(context, 'dismissible')));
}

/**
 * 展示用 skill 上下文：仍挂载时用会话 skillContexts；
 * 发送后已单次消费时，从用户消息中的「技能名」标记重建（不恢复系统提示词）。
 */

export function collectDisplaySkillContexts(thread: DeepChatThread): DeepChatSkillContext[] {
  const mounted = thread.skillContexts || [];
  if (mounted.length > 0) {
    return uiHooks.cloneSkillContexts(mounted);
  }
  return extractSkillContextsFromMessageMarkers(thread.messages || []);
}

/** 从用户消息正文的「技能名」标记提取轻量上下文（仅展示 / 编辑回填 Chip） */

export function extractSkillContextsFromMessageMarkers(
  messages: Array<{ role?: string; text?: string }>
): DeepChatSkillContext[] {
  const byTitle = new Map<string, DeepChatSkillContext>();
  for (const message of messages) {
    if (message.role !== 'user' || !message.text) {
      continue;
    }
    for (const match of message.text.matchAll(/「([^」\n]+)」/g)) {
      const skillTitle = match[1]?.trim();
      if (!skillTitle || byTitle.has(skillTitle)) {
        continue;
      }
      byTitle.set(skillTitle, {
        skillId: `history:${skillTitle}`,
        skillTitle,
        skillRaw: '',
      });
    }
  }
  return [...byTitle.values()];
}

/**
 * 单次执行：请求已用当前 skill 系统提示词组装后，立即卸掉会话挂载。
 * 历史消息里的技能标记仍可渲染 static Chip；再次调用需从 Skill Library 重新挂载。
 */

export function consumeMountedSkillsAfterSend(container: HTMLElement, threadId: string): void {
  if (sessionState.threadStore.activeThreadId !== threadId) {
    return;
  }
  const activeThread = getActiveThread();
  if (!activeThread.skillContexts?.length) {
    return;
  }

  updateActiveThreadFields(container, {
    skillContexts: undefined,
    // 技能派生的系统提示一并清掉，避免下一条消息继续带方法论
    systemPrompt: undefined,
  });
  uiHooks.applySkillContextsToSession(container);
  syncSessionSkillChipDock(container);

  const input = getDraftInput(container);
  if (input) {
    const draft = serializeDraftInput(input);
    setDraftInputWithInlineChips(input, draft, []);
    if (draft) {
      notifyDeepChatComposerInput(input, draft);
    }
  }
}

/**
 * 发送前：若仍有会话技能且草稿无内联 Chip 标记，用 dock 提供可移除入口。
 * 单次发送消费后 skillContexts 清空，dock 自动消失。
 * Dock 是 #text-input-container 的兄弟节点，绝不进入 contenteditable / 请求文本。
 */

export function syncSessionSkillChipDock(container: HTMLElement): void {
  const root = getChat(container)?.shadowRoot;
  const inputContainer = root?.querySelector<HTMLElement>('#text-input-container');
  const input = root?.querySelector<HTMLElement>('#text-input');
  if (!root || !inputContainer || !input) {
    return;
  }

  const activeThread = getActiveThread();
  const contexts = activeThread.skillContexts || [];
  const existingDock = root.querySelector<HTMLElement>(`#${SESSION_SKILL_CHIP_DOCK_ID}`);

  if (!shouldShowSessionSkillChipDock(contexts, activeThread.draftText || '')) {
    existingDock?.remove();
    inputContainer.classList.remove('has-session-skill-chip-dock');
    return;
  }

  const dock = ensureSessionSkillChipDock(root, inputContainer, input);
  renderSessionSkillChipDockChildren(dock, contexts);
  inputContainer.classList.add('has-session-skill-chip-dock');
}

export function getDraftInputText(container: HTMLElement): string {
  const input = getDraftInput(container);
  return input ? serializeDraftInput(input) : '';
}

export function saveActiveThreadDraft(container: HTMLElement): void {
  updateThreadDraft(sessionState.threadStore.activeThreadId, getDraftInputText(container));
}

export function updateThreadDraft(threadId: string, draftText: string): void {
  const thread = sessionState.threadStore.threads.find(item => item.id === threadId);
  if (!thread || thread.draftText === draftText) {
    return;
  }

  const wasVisibleInHistory = isThreadVisibleInHistory(thread);
  const updatedThread = { ...thread, draftText, updatedAt: Date.now() };
  sessionState.threadStore = {
    ...sessionState.threadStore,
    threads: sessionState.threadStore.threads.map(item =>
      item.id === threadId ? updatedThread : item
    ),
  };
  draftPersistController.schedule();
  if (wasVisibleInHistory !== isThreadVisibleInHistory(updatedThread)) {
    renderMountedThreadList();
  }
}

/** 会话技能是否已在输入框内水合为 Chip DOM（非纯文本「技能名」） */

export function composerHasSessionSkillChips(
  input: HTMLElement,
  contexts: DeepChatSkillContext[]
): boolean {
  if (contexts.length === 0) {
    return true;
  }
  return contexts.every(context =>
    Array.from(input.querySelectorAll<HTMLElement>(`.${SKILL_CHIP_CLASS}`)).some(
      chip => chip.dataset.skillId === context.skillId
    )
  );
}

export function resolveComposerDraftText(
  rawDraft: string,
  contexts: DeepChatSkillContext[]
): { draftText: string; hasMarkers: boolean } {
  const hasMarkers = contexts.length > 0 && textContainsSkillChipMarker(rawDraft || '', contexts);
  return {
    hasMarkers,
    draftText: hasMarkers ? normalizeSkillChipDraftText(rawDraft || '', contexts) : rawDraft || '',
  };
}

export function isDraftInputReady(
  input: HTMLElement,
  draftText: string,
  contexts: DeepChatSkillContext[]
): boolean {
  // 不因 skillContexts 强制要求输入框 Chip；仅当草稿已含标记时才校验 Chip DOM
  const { draftText: expected, hasMarkers } = resolveComposerDraftText(draftText, contexts);
  if (serializeDraftInput(input) !== expected) {
    return false;
  }
  return !hasMarkers || composerHasSessionSkillChips(input, contexts);
}

export function restoreActiveThreadDraftInput(container: HTMLElement, attempts = 8): void {
  const input = getDraftInput(container);
  if (!input) {
    if (attempts > 0) {
      window.setTimeout(() => restoreActiveThreadDraftInput(container, attempts - 1), 80);
    }
    return;
  }

  const activeThread = getActiveThread();
  const contexts = activeThread.skillContexts || [];
  // 空草稿/纯业务正文不强制回填 Chip。
  const { draftText, hasMarkers } = resolveComposerDraftText(
    activeThread.draftText || '',
    contexts
  );
  if (hasMarkers && draftText !== (activeThread.draftText || '')) {
    updateThreadDraft(activeThread.id, draftText);
  }

  if (!isDraftInputReady(input, draftText, contexts)) {
    setDraftInputWithInlineChips(input, draftText, contexts);
  }
  // 不派发 input：避免 deep-chat 用 innerText 回写脏草稿
  syncDraftInputHeight(container, { instant: true });
  syncSessionSkillChipDock(container);

  if (attempts > 0) {
    window.setTimeout(() => {
      const latest = getDraftInput(container);
      if (!latest || !isDraftInputReady(latest, draftText, contexts)) {
        restoreActiveThreadDraftInput(container, attempts - 1);
      }
    }, 80);
  }
}

export function clearDraftInputHeightSync(): void {
  sessionState.draftInputResizeObserver?.disconnect();
  sessionState.draftInputResizeObserver = null;
  sessionState.skillComposerChromeObserver?.disconnect();
  sessionState.skillComposerChromeObserver = null;
  sessionState.cleanupDraftInputHeightListener?.();
  sessionState.cleanupDraftInputHeightListener = null;
  sessionState.cleanupInlineSkillChipControls?.();
  sessionState.cleanupInlineSkillChipControls = null;
  if (sessionState.draftInputResizeRetryTimer !== null) {
    window.clearTimeout(sessionState.draftInputResizeRetryTimer);
    sessionState.draftInputResizeRetryTimer = null;
  }
  if (sessionState.draftHeightSyncRaf !== null) {
    window.cancelAnimationFrame(sessionState.draftHeightSyncRaf);
    sessionState.draftHeightSyncRaf = null;
  }
}

/**
 * deep-chat 把 inside-end 按钮容器挂在 #input 下（与 #text-input-container 同级）。
 * #input 可能包含短暂的载入提示；若按钮层 inset:0 铺满整列，单行会相对输入框偏下。
 * 策略：不依赖 reparent（deep-chat 可能改回），把按钮层几何对齐到输入框矩形。
 *
 * 仅认 submit/stop：排除 #upload-images-button（vision 上传与 send 同为 inside-end）。
 * Prefer a single selector — multi-branch lists break querySelector under jsdom ShadowRoot.
 */
const SUBMIT_INSIDE_END_SELECTOR = '.input-button.inside-end:not(#upload-images-button)';

function querySubmitInsideEndButton(
  root: ShadowRoot | Document | Element | null | undefined
): HTMLElement | null {
  return root?.querySelector<HTMLElement>(SUBMIT_INSIDE_END_SELECTOR) || null;
}

export function alignSubmitButtonLayerToTextInput(chat: DeepChatElement): boolean {
  const root = chat.shadowRoot;
  const inputArea = root?.querySelector<HTMLElement>('#input');
  const textContainer = root?.querySelector<HTMLElement>('#text-input-container');
  const buttonContainer = root?.querySelector<HTMLElement>(
    '.input-button-container.inner-button-container'
  );
  const button = querySubmitInsideEndButton(root);
  if (!inputArea || !textContainer || !buttonContainer || !button) {
    return false;
  }

  const inputRect = inputArea.getBoundingClientRect();
  const textRect = textContainer.getBoundingClientRect();
  if (inputRect.height <= 0 || textRect.height <= 0) {
    return false;
  }

  // 按钮层铺满 #input（实测按钮绝对定位的 containing block 常是 #input，而非按钮层本身）
  buttonContainer.style.setProperty('position', 'absolute', 'important');
  buttonContainer.style.setProperty('inset', '0px', 'important');
  buttonContainer.style.setProperty('top', '0', 'important');
  buttonContainer.style.setProperty('left', '0', 'important');
  buttonContainer.style.setProperty('right', '0', 'important');
  buttonContainer.style.setProperty('bottom', '0', 'important');
  buttonContainer.style.setProperty('width', '100%', 'important');
  buttonContainer.style.setProperty('height', '100%', 'important');
  buttonContainer.style.setProperty('margin', '0', 'important');
  buttonContainer.style.setProperty('transform', 'none', 'important');
  buttonContainer.style.setProperty('pointer-events', 'none', 'important');
  buttonContainer.style.setProperty('z-index', '2', 'important');

  // 用 #input 坐标系把钮锚定到输入框右下。横向沿用 CSS 的动态 inset-inline-end：
  // 它会按 text-input 的 768px 最大宽度在 rail 转场的每帧插值，不能写入静态像素 right。
  const buttonSize = 36;
  const edgePad = 11;
  const buttonBottom = Math.max(0, Math.round(inputRect.bottom - textRect.bottom + edgePad));
  button.style.setProperty('position', 'absolute', 'important');
  button.style.setProperty('top', 'auto', 'important');
  button.style.setProperty('bottom', `${buttonBottom}px`, 'important');
  button.style.setProperty('inset-block-start', 'auto', 'important');
  button.style.setProperty('inset-block-end', `${buttonBottom}px`, 'important');
  button.style.removeProperty('left');
  button.style.removeProperty('right');
  button.style.removeProperty('inset-inline-start');
  button.style.removeProperty('inset-inline-end');
  button.style.setProperty('width', `${buttonSize}px`, 'important');
  button.style.setProperty('height', `${buttonSize}px`, 'important');
  button.style.setProperty('margin', '0', 'important');
  button.style.setProperty('transform', 'none', 'important');
  button.style.setProperty('pointer-events', 'auto', 'important');

  return true;
}

export function observeSubmitButtonPin(container: HTMLElement, chat: DeepChatElement): void {
  sessionState.submitButtonPinObserver?.disconnect();
  sessionState.submitButtonPinObserver = null;

  const root = chat.shadowRoot;
  const inputArea = root?.querySelector('#input');
  const textContainer = root?.querySelector('#text-input-container');
  const stage = container.querySelector<HTMLElement>('.deep-chat-stage');
  if (!root || !inputArea || !textContainer) {
    return;
  }

  let aligning = false;
  const realign = (): void => {
    if (aligning) {
      return;
    }
    aligning = true;
    try {
      alignSubmitButtonLayerToTextInput(chat);
      observeSubmitButtonState(container, chat);
      // 仅刷新 aria / stop 标记，内部会再 align 但 aligning 期间由上层短路
      const pending = sessionState.pendingRequests.get(sessionState.threadStore.activeThreadId);
      const isStopActive = Boolean(pending && !pending.isSettled);
      const button = querySubmitInsideEndButton(chat.shadowRoot);
      if (button) {
        syncSubmitButtonMetadata(button, isStopActive);
      }
    } finally {
      aligning = false;
    }
  };

  // 只听结构变化，不听 style（我们自己写 style 会对齐触发死循环）
  sessionState.submitButtonPinObserver = new MutationObserver(() => {
    realign();
  });
  sessionState.submitButtonPinObserver.observe(inputArea, {
    childList: true,
    subtree: true,
  });

  let resizeAnimationFrame: number | null = null;
  const onWindowResize = (): void => {
    if (aligning || resizeAnimationFrame !== null) {
      return;
    }
    resizeAnimationFrame = window.requestAnimationFrame(() => {
      resizeAnimationFrame = window.requestAnimationFrame(() => {
        resizeAnimationFrame = null;
        if (!aligning) {
          alignSubmitButtonLayerToTextInput(chat);
        }
      });
    });
  };
  window.addEventListener('resize', onWindowResize);

  const onStageGeometryTransitionEnd = (event: TransitionEvent): void => {
    if (
      event.target === stage &&
      (event.propertyName === 'width' || event.propertyName.startsWith('padding')) &&
      !aligning
    ) {
      alignSubmitButtonLayerToTextInput(chat);
    }
  };
  stage?.addEventListener('transitionend', onStageGeometryTransitionEnd);

  let resizeObserver: ResizeObserver | null = null;
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      if (!aligning) {
        alignSubmitButtonLayerToTextInput(chat);
      }
    });
    resizeObserver.observe(textContainer);
    resizeObserver.observe(inputArea);
  }

  const previousDisconnect = sessionState.submitButtonPinObserver.disconnect.bind(
    sessionState.submitButtonPinObserver
  );
  sessionState.submitButtonPinObserver.disconnect = () => {
    window.removeEventListener('resize', onWindowResize);
    stage?.removeEventListener('transitionend', onStageGeometryTransitionEnd);
    if (resizeAnimationFrame !== null) {
      window.cancelAnimationFrame(resizeAnimationFrame);
      resizeAnimationFrame = null;
    }
    resizeObserver?.disconnect();
    previousDisconnect();
  };

  realign();
}

export function observeSubmitButtonState(container: HTMLElement, chat: DeepChatElement): void {
  sessionState.submitButtonStateObserver?.disconnect();
  sessionState.submitButtonStateObserver = null;

  const button = querySubmitInsideEndButton(chat.shadowRoot);
  if (!button) {
    return;
  }

  sessionState.submitButtonStateObserver = new MutationObserver(() => {
    syncSubmitStopButtonState(container);
  });
  sessionState.submitButtonStateObserver.observe(button, {
    attributes: true,
    attributeFilter: ['class', 'aria-label', 'aria-disabled', 'aria-busy', 'title'],
  });
}

export function setupSubmitStopButtonSync(
  container: HTMLElement,
  chat: DeepChatElement,
  attempts = 10
): void {
  clearSubmitStopButtonSync();
  const onSubmitButtonSpaceIntent = (event: Event): void => {
    if (!(event instanceof KeyboardEvent) || event.key !== ' ' || event.repeat) {
      return;
    }

    const button = getSubmitButtonFromEventPath(event, chat);
    if (!button) {
      return;
    }

    const isStopActive = button.hasAttribute('data-deep-chat-stop-active');
    const isUnavailableSubmit =
      !isStopActive &&
      (button.classList.contains('disabled-button') ||
        button.classList.contains('loading-button') ||
        button.getAttribute('aria-disabled') === 'true');
    if (isUnavailableSubmit) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    (button as HTMLElement).click();
  };

  const onSubmitButtonStopIntent = (event: Event): void => {
    const button = getSubmitButtonFromEventPath(event, chat);
    const threadId =
      button?.getAttribute('data-deep-chat-stop-thread-id') ||
      sessionState.threadStore.activeThreadId;
    const pending = sessionState.pendingRequests.get(threadId);
    // 仅「生成中」劫持为停止；已 settled 的流式展示阶段不拦截发送
    if (!button || !pending || pending.isSettled) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    stopPendingRequest(threadId, { replaceChat: true });
  };

  document.addEventListener('keydown', onSubmitButtonSpaceIntent, true);
  document.addEventListener('click', onSubmitButtonStopIntent, true);
  const root = chat.shadowRoot;
  const pinned = alignSubmitButtonLayerToTextInput(chat);
  if (root) {
    root.addEventListener('keydown', onSubmitButtonSpaceIntent, true);
    root.addEventListener('click', onSubmitButtonStopIntent, true);
  }
  if ((!root || !pinned) && attempts > 0) {
    sessionState.submitStopButtonSyncRetryTimer = window.setTimeout(
      () => setupSubmitStopButtonSync(container, chat, attempts - 1),
      80
    );
    // 仍挂上清理，避免失败重试前的监听泄漏；成功路径会 clear 后重建
  }

  sessionState.cleanupSubmitStopButtonListener = () => {
    document.removeEventListener('keydown', onSubmitButtonSpaceIntent, true);
    document.removeEventListener('click', onSubmitButtonStopIntent, true);
    root?.removeEventListener('keydown', onSubmitButtonSpaceIntent, true);
    root?.removeEventListener('click', onSubmitButtonStopIntent, true);
  };
  observeSubmitButtonPin(container, chat);
  observeSubmitButtonState(container, chat);
  syncSubmitStopButtonState(container);
  // deep-chat 初始化/校验会异步清掉 aria，短延迟再刷一次标签与位置
  window.setTimeout(() => {
    alignSubmitButtonLayerToTextInput(chat);
    syncSubmitStopButtonState(container);
  }, 120);
  window.setTimeout(() => {
    alignSubmitButtonLayerToTextInput(chat);
    syncSubmitStopButtonState(container);
  }, 400);
}

export function getSubmitButtonFromEventPath(event: Event, chat: DeepChatElement): Element | null {
  const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
  if (path.length > 0 && !path.includes(chat)) {
    return null;
  }

  const pathButton = path.find(
    (target): target is Element =>
      target instanceof Element &&
      target.classList.contains('input-button') &&
      target.classList.contains('inside-end') &&
      target.id !== 'upload-images-button'
  );
  if (pathButton) {
    return pathButton;
  }

  const coordinateButton = getSubmitButtonFromPointerEvent(event, chat);
  if (coordinateButton) {
    return coordinateButton;
  }

  const target = event.target instanceof Element ? event.target : null;
  const closest = target?.closest('.input-button.inside-end');
  if (closest?.id === 'upload-images-button') {
    return null;
  }
  return closest || null;
}

export function getSubmitButtonFromPointerEvent(
  event: Event,
  chat: DeepChatElement
): Element | null {
  if (!(event instanceof MouseEvent)) {
    return null;
  }

  const button = querySubmitInsideEndButton(chat.shadowRoot);
  if (!button) {
    return null;
  }

  const rect = button.getBoundingClientRect();
  const isInsideButton =
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom;
  return isInsideButton ? button : null;
}

export function clearSubmitStopButtonSync(): void {
  sessionState.cleanupSubmitStopButtonListener?.();
  sessionState.cleanupSubmitStopButtonListener = null;
  sessionState.submitButtonStateObserver?.disconnect();
  sessionState.submitButtonStateObserver = null;
  sessionState.submitButtonPinObserver?.disconnect();
  sessionState.submitButtonPinObserver = null;
  if (sessionState.submitStopButtonSyncRetryTimer !== null) {
    window.clearTimeout(sessionState.submitStopButtonSyncRetryTimer);
    sessionState.submitStopButtonSyncRetryTimer = null;
  }
}

export function getSubmitButtonLabel(button: HTMLElement, isStopActive: boolean): string {
  if (isStopActive) {
    return '停止生成';
  }
  return button.classList.contains('loading-button') ? '正在准备请求' : '发送消息';
}

export function syncSubmitButtonMetadata(button: HTMLElement, isStopActive: boolean): void {
  const label = getSubmitButtonLabel(button, isStopActive);
  const shouldRemoveFromTabOrder =
    !isStopActive &&
    (button.classList.contains('disabled-button') || button.classList.contains('loading-button'));
  const tabIndex = shouldRemoveFromTabOrder ? -1 : 0;
  button.toggleAttribute('data-deep-chat-stop-active', isStopActive);
  if (isStopActive) {
    button.setAttribute('data-deep-chat-stop-thread-id', sessionState.threadStore.activeThreadId);
  } else if (button.hasAttribute('data-deep-chat-stop-thread-id')) {
    button.removeAttribute('data-deep-chat-stop-thread-id');
  }
  // deep-chat 切 disabled/submit 时会清掉 aria；只在变更时写入，避免 MutationObserver 死循环
  if (button.getAttribute('aria-label') !== label) {
    button.setAttribute('aria-label', label);
  }
  if (button.title !== label) {
    button.title = label;
  }
  if (button.tabIndex !== tabIndex) {
    button.tabIndex = tabIndex;
  }
}

export function syncSubmitStopButtonState(container: HTMLElement): void {
  const chat = getChat(container);
  if (chat) {
    alignSubmitButtonLayerToTextInput(chat);
  }

  const pending = sessionState.pendingRequests.get(sessionState.threadStore.activeThreadId);
  // 仅「可中止的生成中」显示停止；LLM 已 settle、本地回放时恢复发送/禁用（与点击劫持逻辑一致）
  const isStopActive = Boolean(pending && !pending.isSettled);
  syncStopOverlayState(container, isStopActive);

  const button = querySubmitInsideEndButton(chat?.shadowRoot);
  if (!button) {
    return;
  }

  syncSubmitButtonMetadata(button, isStopActive);
}

export function syncStopOverlayState(container: HTMLElement, _isPending: boolean): void {
  const stopButton = container.querySelector<HTMLButtonElement>('#deep-chat-stop-generation');
  if (!stopButton) {
    return;
  }

  stopButton.hidden = true;
  stopButton.disabled = true;
  delete stopButton.dataset.threadId;
}

type SkillChromeElementId = import('../session/sessionState').SkillChromeElementId;

type SkillComposerDraftFillTarget = {
  threadId: string;
  draftText: string;
};

export function findSkillChromeElement(
  container: HTMLElement,
  id: SkillChromeElementId
): HTMLElement | null {
  const element =
    container.querySelector<HTMLElement>(`#${id}`) ||
    getChat(container)?.shadowRoot?.querySelector<HTMLElement>(`#${id}`) ||
    sessionState.skillChromeElements.get(container)?.get(id) ||
    null;
  if (!element) {
    return null;
  }

  let elements = sessionState.skillChromeElements.get(container);
  if (!elements) {
    elements = new Map();
    sessionState.skillChromeElements.set(container, elements);
  }
  elements.set(id, element);
  return element;
}

export function findSkillLoadBanner(container: HTMLElement): HTMLElement | null {
  return findSkillChromeElement(container, 'deep-chat-skill-load-banner');
}

/** 将技能载入提示挂入 deep-chat 输入列（#input），位于输入框正上方。 */

export function placeSkillChromeInComposer(container: HTMLElement, element: HTMLElement): void {
  const inputArea = getChat(container)?.shadowRoot?.querySelector<HTMLElement>('#input');
  if (!inputArea) {
    return;
  }

  const textContainer = inputArea.querySelector('#text-input-container');
  const anchor: Element | null = textContainer;

  if (element.parentElement === inputArea) {
    if (anchor && element.nextElementSibling !== anchor && element !== anchor) {
      inputArea.insertBefore(element, anchor);
    }
    return;
  }

  if (anchor) {
    inputArea.insertBefore(element, anchor);
  } else {
    inputArea.prepend(element);
  }
}

export function placeSkillLoadBannerAboveComposer(container: HTMLElement, attempts = 12): void {
  const banner = findSkillLoadBanner(container);
  const inputArea = getChat(container)?.shadowRoot?.querySelector<HTMLElement>('#input');
  if (!banner || !inputArea) {
    if (attempts > 0) {
      window.setTimeout(() => placeSkillLoadBannerAboveComposer(container, attempts - 1), 50);
    }
    return;
  }
  placeSkillChromeInComposer(container, banner);
}

export function placeSkillComposerChrome(container: HTMLElement): void {
  placeSkillLoadBannerAboveComposer(container);
}

export function observeSkillComposerChrome(container: HTMLElement, chat: DeepChatElement): void {
  sessionState.skillComposerChromeObserver?.disconnect();
  const root = chat.shadowRoot;
  if (!root) {
    return;
  }

  let observedInputArea = root.querySelector<HTMLElement>('#input');
  const recoverComposer = (shouldRestoreDraft: boolean): void => {
    if (getChat(container) !== chat || chat.shadowRoot !== root) {
      return;
    }
    if (shouldRestoreDraft) {
      restoreActiveThreadDraftInput(container);
    }
    syncSessionSkillChipDock(container);
    placeSkillComposerChrome(container);
    observeSubmitButtonPin(container, chat);
    syncSubmitStopButtonState(container);
  };

  sessionState.skillComposerChromeObserver = new MutationObserver(mutations => {
    const inputArea = root.querySelector<HTMLElement>('#input');
    const inputWasRebuilt = inputArea !== observedInputArea;
    if (inputWasRebuilt) {
      observedInputArea = inputArea;
    }
    const affectsComposer = mutations.some(mutation => {
      if (mutation.target === inputArea) {
        return true;
      }
      return Array.from([...mutation.addedNodes, ...mutation.removedNodes]).some(
        node =>
          node === inputArea ||
          (node instanceof Element &&
            (node.id === 'input' || Boolean(node.querySelector('#input'))))
      );
    });
    if (inputArea && (inputWasRebuilt || affectsComposer)) {
      // MutationObserver 在下一帧之前运行；必须同步恢复，不能再排一层 rAF，
      // 否则 Deep Chat 重建输入框时会留下一个未定位的可见帧。
      recoverComposer(inputWasRebuilt);
    }
  });
  sessionState.skillComposerChromeObserver.observe(root, {
    childList: true,
    subtree: true,
  });
}

/** 切换会话 / 重建 deep-chat 前，把载入提示挪回 light DOM，避免随 shadow 销毁。 */

export function rescueSkillLoadBannerToStage(container: HTMLElement): void {
  const stage = container.querySelector<HTMLElement>('.deep-chat-stage');
  if (!stage) {
    return;
  }
  const banner = findSkillLoadBanner(container);
  if (banner && banner.parentElement !== stage) {
    stage.appendChild(banner);
  }
}

/** 从会话移除技能挂载，并同步输入框 Chip。 */

export function dismissSessionSkillContext(container: HTMLElement, skillId: string): void {
  const activeThread = getActiveThread();
  const removed = (activeThread.skillContexts || []).find(context => context.skillId === skillId);
  if (!removed) {
    return;
  }

  const nextContexts = (activeThread.skillContexts || []).filter(
    context => context.skillId !== skillId
  );
  const input = getDraftInput(container);
  // serialize 会把 Chip 变成「技能名」；必须显式剥掉已移除技能，避免留下纯文本标题
  const rawDraft = input ? serializeDraftInput(input) : activeThread.draftText || '';
  // 不因剩余 skillContexts 强制回填输入框 Chip
  const nextDraft = stripSkillMarkersFromDraft(
    rawDraft,
    [removed.skillTitle],
    activeThread.skillContexts || []
  );
  // 同步系统提示词：剩余技能重建；全部移除则清空（避免残留技能全文）
  const nextSystemPrompt = buildSystemPromptFromSkillContexts(nextContexts);

  updateActiveThreadFields(container, {
    skillContexts: nextContexts.length > 0 ? nextContexts : undefined,
    draftText: nextDraft,
    systemPrompt: nextSystemPrompt || undefined,
  });
  uiHooks.applySkillContextsToSession(container);
  if (input) {
    setDraftInputWithInlineChips(input, nextDraft, nextContexts);
    notifyDeepChatComposerInput(input, nextDraft);
    syncDraftInputHeight(container, { instant: true });
  }
  syncSessionSkillChipDock(container);
}

/** 将 contenteditable 中的 Chip 与文本序列化为纯文本（Chip → 「技能名」） */

export function serializeDraftInput(input: HTMLElement): string {
  return serializeChipContainingElement(input, getActiveThread().skillContexts || []);
}

/**
 * 写入草稿：正文含「技能名」标记时水合为 Chip DOM。
 * 调用方负责是否 prefix；本函数不因 skillContexts 自动前缀（避免发送清空后回填）。
 */

export function setDraftInputWithInlineChips(
  input: HTMLElement,
  plainText: string,
  contexts: DeepChatSkillContext[]
): void {
  const normalized =
    contexts.length > 0 ? normalizeSkillChipDraftText(plainText, contexts) : plainText;
  if (contexts.length > 0 && textContainsSkillChipMarker(normalized, contexts)) {
    setContentWithInlineSkillChips(input, normalized, contexts, 'dismissible');
    return;
  }
  input.textContent = normalized;
}

/**
 * 程序化写入草稿后通知 deep-chat 内部 TextInput 状态。
 * 仅改 DOM 不派发 input 时，发送按钮可能无响应（需切会话重建才恢复）。
 */

export function notifyDeepChatComposerInput(input: HTMLElement, text: string): void {
  input.dispatchEvent(createTextInputEvent(text));
}

/** 编辑消息回填：若正文含技能名标记则保持 Chip，否则纯文本（不恢复会话挂载） */

export function refillComposerWithSkillChips(container: HTMLElement, plainText: string): void {
  const input = getDraftInput(container);
  if (!input) {
    return;
  }
  // 编辑回填用展示上下文（含历史标记），不重新挂载系统提示
  const contexts = collectDisplaySkillContexts({
    ...getActiveThread(),
    // 优先从待回填正文解析标记
    messages: [{ role: 'user', text: plainText, createdAt: 0 }],
  });
  const normalized = normalizeSkillChipDraftText(plainText, contexts);
  setDraftInputWithInlineChips(input, normalized, contexts);
  updateThreadDraft(sessionState.threadStore.activeThreadId, normalized);
  syncSessionSkillChipDock(container);
  // 必须通知 deep-chat，否则 submitFromInput 可能仍视为空/状态未刷新
  notifyDeepChatComposerInput(input, normalized);
  // deep-chat 可能用 innerText 回写并注入换行：再规范一次并同步草稿
  window.setTimeout(() => {
    const latestInput = getDraftInput(container);
    if (!latestInput) {
      return;
    }
    const after = serializeDraftInput(latestInput);
    const refillContexts = collectDisplaySkillContexts({
      ...getActiveThread(),
      messages: [{ role: 'user', text: after, createdAt: 0 }],
    });
    const cleaned = normalizeSkillChipDraftText(after, refillContexts);
    if (cleaned !== after) {
      setDraftInputWithInlineChips(latestInput, cleaned, refillContexts);
      updateThreadDraft(sessionState.threadStore.activeThreadId, cleaned);
    } else if (after !== normalized) {
      updateThreadDraft(sessionState.threadStore.activeThreadId, after);
    }
    syncDraftInputHeight(container, { instant: true });
  }, 0);
  syncDraftInputHeight(container, { instant: true });
  getChat(container)?.focusInput?.();
}

/**
 * 恢复草稿：仅当草稿文本本身含技能标记时才水合 Chip DOM。
 * 发送清空后 / 空草稿 + 仍有 skillContexts 时，不把 Chip 塞回输入框。
 */

export function shouldRewriteComposerDraft(
  input: HTMLElement,
  draftText: string,
  contexts: DeepChatSkillContext[],
  hasMarkers: boolean
): boolean {
  const serialized = serializeDraftInput(input);
  if (hasMarkers) {
    return serialized !== draftText || !composerHasSessionSkillChips(input, contexts);
  }
  return Boolean(input.querySelector(`.${SKILL_CHIP_CLASS}`)) || serialized !== draftText;
}

export function hydrateActiveThreadInlineSkillChips(container: HTMLElement, attempts = 12): void {
  const input = getDraftInput(container);
  if (!input) {
    if (attempts > 0) {
      window.setTimeout(() => hydrateActiveThreadInlineSkillChips(container, attempts - 1), 50);
    }
    return;
  }
  const activeThread = getActiveThread();
  const contexts = activeThread.skillContexts || [];
  const rawDraft = activeThread.draftText || serializeDraftInput(input) || '';
  const { draftText, hasMarkers } = resolveComposerDraftText(rawDraft, contexts);
  if (shouldRewriteComposerDraft(input, draftText, contexts, hasMarkers)) {
    setDraftInputWithInlineChips(input, draftText, contexts);
    if (draftText !== (activeThread.draftText || '')) {
      updateThreadDraft(activeThread.id, draftText);
    }
  }
  syncSessionSkillChipDock(container);
  syncDraftInputHeight(container, { instant: true });
}

export function bindInlineSkillChipControls(container: HTMLElement, root: ShadowRoot): void {
  sessionState.cleanupInlineSkillChipControls?.();
  const onClick = (event: Event): void => {
    const target = event.target as HTMLElement | null;
    const dismissBtn = target?.closest<HTMLElement>('[data-action="dismiss-skill-context"]');
    if (!dismissBtn?.dataset.skillId) return;
    const input = getDraftInput(container);
    const dock = root.querySelector<HTMLElement>(`#${SESSION_SKILL_CHIP_DOCK_ID}`);
    if (!input?.contains(dismissBtn) && !dock?.contains(dismissBtn)) return;
    event.preventDefault();
    event.stopPropagation();
    dismissSessionSkillContext(container, dismissBtn.dataset.skillId);
  };
  root.addEventListener('click', onClick);
  sessionState.cleanupInlineSkillChipControls = () => {
    root.removeEventListener('click', onClick);
  };
}

export function scheduleSkillComposerDraftFill(
  container: HTMLElement,
  businessDraft: string,
  target: SkillComposerDraftFillTarget
): void {
  for (const delay of [0, 80, 200]) {
    window.setTimeout(() => fillSkillComposerDraft(container, businessDraft, target), delay);
  }
}

export function retrySkillComposerDraftFill(
  container: HTMLElement,
  businessDraft: string,
  target: SkillComposerDraftFillTarget,
  attempts: number
): void {
  if (attempts <= 0) {
    return;
  }
  window.setTimeout(
    () => fillSkillComposerDraft(container, businessDraft, target, attempts - 1),
    50
  );
}

export function applySkillComposerDraft(
  container: HTMLElement,
  input: HTMLElement,
  businessDraft: string,
  skillContexts: DeepChatSkillContext[],
  threadId: string
): void {
  const normalizedPrompt =
    skillContexts.length > 0
      ? prefixDraftWithSkillContexts(businessDraft, skillContexts)
      : businessDraft;
  setDraftInputWithInlineChips(input, normalizedPrompt, skillContexts);
  updateThreadDraft(threadId, normalizedPrompt);
  syncSessionSkillChipDock(container);
  placeSkillComposerChrome(container);
  syncDraftInputHeight(container, { instant: true });
  notifyDeepChatComposerInput(input, normalizedPrompt);
}

export function fillSkillComposerDraft(
  container: HTMLElement,
  businessDraft: string,
  target: SkillComposerDraftFillTarget,
  attempts = 10
): void {
  const activeThread = getActiveThread();
  if (activeThread.id !== target.threadId || (activeThread.draftText || '') !== target.draftText) {
    return;
  }

  const chat = getChat(container);
  const input = chat?.shadowRoot?.querySelector<HTMLElement>('#text-input');
  const skillContexts = activeThread.skillContexts || [];

  if (!chat || !input) {
    retrySkillComposerDraftFill(container, businessDraft, target, attempts);
    return;
  }

  applySkillComposerDraft(container, input, businessDraft, skillContexts, activeThread.id);

  // 若 Chip DOM 仍未就绪，继续重试
  if (skillContexts.length > 0 && !composerHasSessionSkillChips(input, skillContexts)) {
    retrySkillComposerDraftFill(container, businessDraft, target, attempts);
  }
}

export function fillPromptDraftInput(container: HTMLElement, prompt: string, attempts = 8): void {
  const chat = getChat(container);
  const input = chat?.shadowRoot?.querySelector<HTMLElement>('#text-input');

  if (!chat || !input) {
    if (attempts > 0) {
      window.setTimeout(() => fillPromptDraftInput(container, prompt, attempts - 1), 50);
      return;
    }
    showToast('已创建新会话，但输入框尚未就绪，请稍后重试', {
      type: 'warning',
    });
    return;
  }

  const skillContexts = getActiveThread().skillContexts || [];
  // 普通 Prompt 填入：不强制 Chip；若草稿已含技能标记则保留 Chip 形态
  const normalizedPrompt =
    skillContexts.length > 0 && textContainsSkillChipMarker(prompt, skillContexts)
      ? normalizeSkillChipDraftText(prompt, skillContexts)
      : prompt;
  setDraftInputWithInlineChips(input, normalizedPrompt, skillContexts);
  updateThreadDraft(sessionState.threadStore.activeThreadId, normalizedPrompt);
  syncSessionSkillChipDock(container);
  syncDraftInputHeight(container, { instant: true });
  // 始终通知 deep-chat（否则附加到当前会话后发送可能无响应）
  notifyDeepChatComposerInput(input, normalizedPrompt);
  window.setTimeout(() => {
    settleFilledPromptDraft({
      container,
      chat,
      prompt,
      normalizedPrompt,
      skillContexts,
      attempts,
    });
  }, 80);
}

export function retryOrWarnPromptDraft(
  container: HTMLElement,
  prompt: string,
  attempts: number
): void {
  if (attempts > 0) {
    fillPromptDraftInput(container, prompt, attempts - 1);
    return;
  }
  showToast('已创建新会话，但输入框尚未就绪，请稍后重试', {
    type: 'warning',
  });
}

export function settleFilledPromptDraft(options: {
  container: HTMLElement;
  chat: DeepChatElement;
  prompt: string;
  normalizedPrompt: string;
  skillContexts: DeepChatSkillContext[];
  attempts: number;
}): void {
  const { container, chat, prompt, normalizedPrompt, skillContexts, attempts } = options;
  const latestInput = getChat(container)?.shadowRoot?.querySelector<HTMLElement>('#text-input');
  if (!latestInput) {
    retryOrWarnPromptDraft(container, prompt, attempts);
    return;
  }

  // 回写后可能注入换行：再规范一次
  const latestText = serializeDraftInput(latestInput);
  const cleaned = normalizeSkillChipDraftText(latestText, getActiveThread().skillContexts || []);
  if (cleaned !== latestText) {
    setDraftInputWithInlineChips(latestInput, cleaned, getActiveThread().skillContexts || []);
    updateThreadDraft(sessionState.threadStore.activeThreadId, cleaned);
  }

  const matched =
    cleaned === normalizedPrompt ||
    cleaned.includes(normalizedPrompt) ||
    latestText === normalizedPrompt;
  if (!matched) {
    retryOrWarnPromptDraft(container, prompt, attempts);
    return;
  }

  chat.focusInput?.();
  if (skillContexts.length === 0) {
    showToast('已创建新会话并填入 Prompt，确认后可手动发送', {
      type: 'success',
    });
  }
  syncDraftInputHeight(container, { instant: true });
}

export function setConversationActive(container: HTMLElement, isActive: boolean): void {
  container.querySelector('.deep-chat-page')?.classList.toggle('is-chatting', isActive);
  const chat = getChat(container);
  chat?.classList.toggle('is-chatting', isActive);
  chat?.classList.toggle('is-empty', !isActive);
  syncDraftInputHeight(container);
}

registerComposerUiHooks({
  syncSubmitStopButtonState,
  consumeMountedSkillsAfterSend,
  setConversationActive,
  fillPromptDraftInput,
  hydrateActiveThreadInlineSkillChips,
  saveActiveThreadDraft,
  syncSessionSkillChipDock,
  findSkillLoadBanner,
  placeSkillComposerChrome,
  placeSkillLoadBannerAboveComposer,
  scheduleSkillComposerDraftFill,
  refreshMessageToolbarStatuses,
});

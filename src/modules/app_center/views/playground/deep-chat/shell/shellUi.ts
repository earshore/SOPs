import {
  findConfigModelsEntry,
  parseReasoningEffortValue,
  registerShellUiHooks,
  type DeepChatReasoningSessionOverride,
} from '../session/uiHooks';
import {
  cancelThreadRename,
  closeThreadMenu,
  commitThreadRename,
  createThread,
  createThreadFromPromptDraft,
  getActiveListingPromptContext,
  getActiveThread,
  handleThreadMenuAction,
  isThreadVisibleInHistory,
  renderPromptDraftsForActiveThread,
  switchThread,
  toggleThreadMenu,
  updateActiveThreadFields,
} from '../session/threadStore';
import {
  getThreadDisplayMessages,
  schedulePendingAssistantDisplay,
  stopPendingRequest,
} from '../session/pendingRuntime';
import { handleDeepChatRequest } from '../request/handleRequest';
import {
  disconnectChromeMutationObserver,
  getActiveLiveGenerationStatusLabel,
  remountDeepThinkingChromeAfterChatReplace,
  stopReasoningTypewriter,
} from '../chrome/generationChrome';
import {
  collectDisplaySkillContexts,
  getDraftInputText,
  hydrateActiveThreadInlineSkillChips,
  placeSkillComposerChrome,
  refillComposerWithSkillChips,
  rescueSkillLoadBannerToStage,
  saveActiveThreadDraft,
  setConversationActive,
  setupDraftInputHeightSync,
  setupSubmitStopButtonSync,
  syncStopOverlayState,
  updateThreadDraft,
} from '../composer/composerUi';
import {
  applySkillContextsToSession,
  applyThreadTuningToSession,
  createThreadFromSkillContext,
  deletePromptDraft,
  sendAssistantCopyToKeywordHunter,
  syncDeepChatReasoningControlsFromThread,
} from '../integrations/handoffs';

import { resolveModelCapability, shouldShowReasoningControls } from '@/services/modelCapability';

import { createModelSelect, type ModelSelectController } from '@/components/modelSelect';

import { StorageService, STORAGE_KEYS } from '@/services/storageService';
import { resolveToolTargetModel } from '@/services/toolStrategyService';

import { appStore } from '@/stores/useAppStore';

import { buildSkillDeepChatUserDraft } from '@/modules/app_center/skillDeepChatHandoff';
import { skillRegistry } from '@/services/skillRegistry';

import { markPendingDeepChatAssistantTextDisplayed } from '../request/lifecycle';

import { THREAD_RAIL_COLLAPSED_CLASS } from '../constants';
import {
  applyDeepChatVisionUploadConfig,
  configureDeepChatBase,
  configureDeepChatConnection,
  configureDeepChatStyles,
} from '../infra/deepChatConfig';

import { refreshMessageToolbarStatuses, setupMessageToolbars } from '../composer/messageToolbar';
import { unmountVisionComposer } from '../composer/visionComposer';

import { setupPromptPreview } from './promptPreview';
import { renderPromptDraftList, renderThreadList } from './renderers';

import { setupSkillLibrary } from './skillLibrary';
import type { DeepChatElement, DeepChatThread, TuningControlRefs } from '../types';
import {
  escapeHTML,
  getFirstModel,
  getMessageText,
  getThreadTitle,
  normalizeTemperature,
  updateTemperatureTrack,
} from '../infra/utils';
import eventBus from '@/common/EventBus';
import { APP_EVENTS } from '@/common/constants/eventConstants';
import { navigateToRouteId } from '@/common/router/initRouter';
import { showToast } from '@/common/ui/notifications';

import { setSafeHtml } from '@/common/utils/security';
import {
  sessionState,
  CHAT_SEARCH_FOCUSABLE_SELECTOR,
  DEEP_CHAT_SYSTEM_FONT_STACK,
} from '../session/sessionState';

type ChatSearchRefs = {
  modal: HTMLElement;
  input: HTMLInputElement;
  results: HTMLElement;
  openButton: HTMLButtonElement | null;
};
type ChatSearchResult = {
  thread: import('../types').DeepChatThread;
};

export function bindControls(container: HTMLElement): void {
  const clearButton = container.querySelector<HTMLButtonElement>('#deep-chat-clear-chat');
  const railToggleButton = container.querySelector<HTMLButtonElement>('#deep-chat-toggle-rail');
  const stopButton = container.querySelector<HTMLButtonElement>('#deep-chat-stop-generation');
  const systemPromptInput = container.querySelector<HTMLTextAreaElement>(
    '#deep-chat-system-prompt'
  );
  const temperatureInput = container.querySelector<HTMLInputElement>('#deep-chat-temperature');
  const temperatureValue = container.querySelector<HTMLOutputElement>(
    '#deep-chat-temperature-value'
  );
  const resetTuningButton = container.querySelector<HTMLButtonElement>('#deep-chat-reset-tuning');
  const tuningPanel = container.querySelector<HTMLDetailsElement>('.deep-chat-tuning-panel');
  const threadList = container.querySelector<HTMLElement>('#deep-chat-thread-list');
  const promptList = container.querySelector<HTMLElement>('#deep-chat-prompt-list');
  const settingsButton = container.querySelector<HTMLButtonElement>('#deep-chat-open-settings');

  bindModelControls({
    container,
    clearButton,
    railToggleButton,
    settingsButton,
  });
  bindStopOverlayControl(container, stopButton);
  bindThreadControls(container, threadList, promptList);
  bindChatSearchControls(container);
  bindSkillLibraryControls(container);
  bindMobileDrawerControls(container);
  bindTuningControls(container, {
    systemPromptInput,
    temperatureInput,
    temperatureValue,
    resetTuningButton,
    tuningPanel,
  });
  applySkillContextsToSession(container);
  applyThreadTuningToSession(container);
  hydrateActiveThreadInlineSkillChips(container);
}

export function bindStopOverlayControl(
  container: HTMLElement,
  stopButton: HTMLButtonElement | null
): void {
  const onStop = (event: MouseEvent): void => {
    event.preventDefault();
    const threadId = stopButton?.dataset.threadId || sessionState.threadStore.activeThreadId;
    stopPendingRequest(threadId);
  };

  stopButton?.addEventListener('click', onStop);
  sessionState.cleanupCallbacks.push(() => stopButton?.removeEventListener('click', onStop));
  syncStopOverlayState(
    container,
    sessionState.pendingRequests.has(sessionState.threadStore.activeThreadId)
  );
}

interface ModelControlRefs {
  container: HTMLElement;
  clearButton: HTMLButtonElement | null;
  railToggleButton: HTMLButtonElement | null;
  settingsButton: HTMLButtonElement | null;
}

/** 每个挂载容器的 ModelSelect 组件实例（bindControls 可能跨容器/重挂载调用）。 */
const modelSelectControllers = new WeakMap<
  HTMLElement,
  { controller: ModelSelectController; provider: string }
>();

function resolveActiveModelProvider(): string {
  return (
    sessionState.currentConfig?.provider ||
    StorageService.get<string>(STORAGE_KEYS.LLM_ACTIVE_PROVIDER) ||
    ''
  );
}

/** 配置切换（如设置页改过 provider）后，把组件内部 provider 同步为当前配置。 */
function syncModelSelectProvider(container: HTMLElement): void {
  const tracked = modelSelectControllers.get(container);
  if (!tracked) return;
  const provider = resolveActiveModelProvider();
  if (tracked.provider === provider) return;
  tracked.provider = provider;
  void tracked.controller.setProvider(provider).catch(error => {
    console.warn('[deep-chat] 模型选择组件 provider 同步失败', error);
  });
}

export function bindModelControls(refs: ModelControlRefs): void {
  const { clearButton, container, railToggleButton, settingsButton } = refs;

  const onModelChange = (nextModel: string): void => {
    if (nextModel !== sessionState.selectedModel) {
      // Invalidate Responses multi-turn chain when model changes mid-thread.
      updateActiveThreadFields(container, {
        lastResponseId: undefined,
        lastResponseModel: undefined,
      });
    }
    const chat = getChat(container);
    sessionState.selectedModel = nextModel;
    // Capability-gated controls must re-evaluate when the model changes.
    // Vision composer shows modelSwitch toast when staged files + vision lost.
    syncDeepChatReasoningControlsFromThread(container);
    applyDeepChatVisionUploadConfig(chat);
  };

  // Image paste is handled by host visionComposer (stage when vision; toast when not).

  // 刷新成功（组件已真调 /models 并写盘）后：同步会话状态与能力控件。
  const onRefresh = async ({
    selectedModel,
  }: {
    models: unknown[];
    selectedModel: string;
  }): Promise<void> => {
    sessionState.selectedModel = selectedModel;
    // 重读含 key 的完整配置（组件写盘时密钥走 secure 存储），供后续请求使用。
    sessionState.currentConfig = await StorageService.getLLMConfigWithKey();
    renderLLMConfigState(container);
    syncDeepChatReasoningControlsFromThread(container);
    applyDeepChatVisionUploadConfig(getChat(container));
  };

  const tracked = {
    controller: createModelSelect(
      container,
      { targetId: 'playground-deep-chat', provider: resolveActiveModelProvider() },
      { onModelChange, onRefresh }
    ),
    provider: resolveActiveModelProvider(),
  };
  modelSelectControllers.set(container, tracked);
  sessionState.cleanupCallbacks.push(() => {
    modelSelectControllers.delete(container);
    tracked.controller.destroy();
  });

  syncThreadRailState(container);
  const onRailToggle = (): void => {
    toggleThreadRail(container);
  };
  railToggleButton?.addEventListener('click', onRailToggle);
  sessionState.cleanupCallbacks.push(() =>
    railToggleButton?.removeEventListener('click', onRailToggle)
  );

  const onClear = (): void => {
    createThread(container);
  };
  clearButton?.addEventListener('click', onClear);
  sessionState.cleanupCallbacks.push(() => clearButton?.removeEventListener('click', onClear));

  const onOpenSettings = (): void => {
    openModelSettings();
  };
  settingsButton?.addEventListener('click', onOpenSettings);
  sessionState.cleanupCallbacks.push(() =>
    settingsButton?.removeEventListener('click', onOpenSettings)
  );
}

export function bindThreadControls(
  container: HTMLElement,
  threadList: HTMLElement | null,
  promptList: HTMLElement | null
): void {
  const onThreadListClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement | null;
    const menuActionButton = target?.closest<HTMLButtonElement>('[data-thread-menu-action]');
    const menuAction = menuActionButton?.dataset.threadMenuAction;
    const menuActionThreadId = menuActionButton?.dataset.threadMenuThreadId;
    if (menuAction && menuActionThreadId) {
      handleThreadMenuAction(container, menuActionThreadId, menuAction);
      return;
    }

    const menuButton = target?.closest<HTMLButtonElement>('[data-thread-menu-id]');
    const menuThreadId = menuButton?.dataset.threadMenuId;
    if (menuThreadId && menuButton) {
      toggleThreadMenu(container, menuThreadId, menuButton);
      return;
    }

    const switchButton = target?.closest<HTMLButtonElement>('[data-thread-id]');
    const threadId = switchButton?.dataset.threadId;
    if (threadId) {
      closeThreadMenu(container);
      switchThread(container, threadId);
    }
  };
  threadList?.addEventListener('click', onThreadListClick);
  sessionState.cleanupCallbacks.push(() =>
    threadList?.removeEventListener('click', onThreadListClick)
  );

  bindThreadEditControls(container, threadList);

  const onDocumentClick = (event: MouseEvent): void => {
    if (!sessionState.openThreadMenu) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (target?.closest('.deep-chat-thread-menu, [data-thread-menu-id]')) {
      return;
    }

    closeThreadMenu(container);
  };
  document.addEventListener('click', onDocumentClick);
  sessionState.cleanupCallbacks.push(() => document.removeEventListener('click', onDocumentClick));

  const onDocumentKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && sessionState.openThreadMenu) {
      closeThreadMenu(container);
    }
  };
  document.addEventListener('keydown', onDocumentKeydown);
  sessionState.cleanupCallbacks.push(() =>
    document.removeEventListener('keydown', onDocumentKeydown)
  );

  const onPromptListClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement | null;
    if (target?.closest('[data-open-promptlab]')) {
      void openPromptlab();
      return;
    }

    const deleteButton = target?.closest<HTMLButtonElement>('[data-delete-prompt-draft-id]');
    const deletePromptId = deleteButton?.dataset.deletePromptDraftId;
    if (deletePromptId) {
      void deletePromptDraft(container, deletePromptId);
      return;
    }

    const useButton = target?.closest<HTMLButtonElement>('[data-use-prompt-draft-id]');
    const usePromptId = useButton?.dataset.usePromptDraftId;
    if (usePromptId) {
      createThreadFromPromptDraft(container, usePromptId);
      return;
    }
  };
  promptList?.addEventListener('click', onPromptListClick);
  sessionState.cleanupCallbacks.push(() =>
    promptList?.removeEventListener('click', onPromptListClick)
  );
  setupPromptPreview(container, promptList, cleanup => sessionState.cleanupCallbacks.push(cleanup));

  const unsubscribePromptDrafts = appStore.subscribe(() => {
    renderPromptDraftsForActiveThread(container);
  });
  sessionState.cleanupCallbacks.push(unsubscribePromptDrafts);
}

export function bindThreadEditControls(
  container: HTMLElement,
  threadList: HTMLElement | null
): void {
  const onThreadListInput = (event: Event): void => {
    const input = (event.target as HTMLElement | null)?.closest<HTMLInputElement>(
      '.deep-chat-thread-name-input'
    );
    if (!input || input.dataset.threadEditId !== sessionState.editingThreadId) {
      return;
    }
    sessionState.editingThreadValue = input.value;
  };
  threadList?.addEventListener('input', onThreadListInput);
  sessionState.cleanupCallbacks.push(() =>
    threadList?.removeEventListener('input', onThreadListInput)
  );

  const onThreadListKeydown = (event: KeyboardEvent): void => {
    const input = (event.target as HTMLElement | null)?.closest<HTMLInputElement>(
      '.deep-chat-thread-name-input'
    );
    if (!input) {
      return;
    }
    const editThreadId = input.dataset.threadEditId ?? '';
    if (event.key === 'Enter') {
      event.preventDefault();
      commitThreadRename(container, editThreadId, input.value);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelThreadRename();
    }
  };
  threadList?.addEventListener('keydown', onThreadListKeydown);
  sessionState.cleanupCallbacks.push(() =>
    threadList?.removeEventListener('keydown', onThreadListKeydown)
  );

  const onThreadListFocusOut = (event: FocusEvent): void => {
    const input = (event.target as HTMLElement | null)?.closest<HTMLInputElement>(
      '.deep-chat-thread-name-input'
    );
    if (!input || input.dataset.threadEditId !== sessionState.editingThreadId) {
      return;
    }
    commitThreadRename(container, input.dataset.threadEditId ?? '', input.value);
  };
  threadList?.addEventListener('focusout', onThreadListFocusOut);
  sessionState.cleanupCallbacks.push(() =>
    threadList?.removeEventListener('focusout', onThreadListFocusOut)
  );
}

export function openModelSettings(): void {
  eventBus.emit(APP_EVENTS.SETTINGS_OPEN);
}

export async function openPromptlab(): Promise<void> {
  try {
    const didNavigate = await navigateToRouteId('promptlab');
    if (!didNavigate) {
      showToast('无法打开 Prompt 生成页面，请稍后重试', { type: 'error' });
    }
  } catch (error) {
    console.error('[DeepChat] 打开 Prompt 生成页面失败:', error);
    showToast('无法打开 Prompt 生成页面，请稍后重试', { type: 'error' });
  }
}

export function bindSkillLibraryControls(container: HTMLElement): void {
  setupSkillLibrary(
    container,
    skillId => applySkillFromLibrary(container, skillId),
    cleanup => sessionState.cleanupCallbacks.push(cleanup)
  );
}

/** 从侧栏 Skill Library 挂载技能：不切路由，复用既有挂载流程 */

export async function applySkillFromLibrary(
  container: HTMLElement,
  skillId: string
): Promise<void> {
  let skill;
  try {
    skill = skillRegistry.getSkill(skillId);
  } catch {
    showToast('技能库暂不可用，请稍后重试', { type: 'error' });
    return;
  }

  if (!skill) {
    showToast('未找到该技能', { type: 'error' });
    return;
  }

  const skillTitle = skill.title.replace(/^[#\s]+/, '').trim() || skill.id;

  // Skill Library「去对话」：当前会话有内容时询问新建 / 附加
  await createThreadFromSkillContext(
    container,
    {
      skillId: skill.id,
      skillTitle,
      skillRaw: skill.raw,
      userDraft: buildSkillDeepChatUserDraft(skillTitle, skill.raw),
    },
    { allowAttachChoice: true }
  );
}

export function bindChatSearchControls(container: HTMLElement): void {
  const refs = getChatSearchRefs(container);
  if (!refs) {
    return;
  }

  portalChatSearchModal(refs.modal);
  const { modal, input, openButton } = refs;

  const onOpen = (): void => {
    openChatSearchModal(container);
  };
  openButton?.addEventListener('click', onOpen);
  sessionState.cleanupCallbacks.push(() => openButton?.removeEventListener('click', onOpen));

  const onInput = (): void => {
    renderChatSearchResults(container);
  };
  input.addEventListener('input', onInput);
  sessionState.cleanupCallbacks.push(() => input.removeEventListener('input', onInput));

  const onModalClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.deep-chat-search-dialog')) {
      closeChatSearchModal(container);
      return;
    }

    if (target.closest('[data-chat-search-close]')) {
      closeChatSearchModal(container);
      return;
    }

    const newChatButton = target.closest('[data-chat-search-new]');
    if (newChatButton) {
      createThread(container);
      closeChatSearchModal(container);
      return;
    }

    const resultButton = target.closest<HTMLButtonElement>('[data-chat-search-thread-id]');
    const threadId = resultButton?.dataset.chatSearchThreadId;
    if (threadId) {
      switchThread(container, threadId);
      closeChatSearchModal(container);
      return;
    }

    if (target.closest('.deep-chat-search-bar')) {
      return;
    }

    closeChatSearchModal(container);
  };
  modal.addEventListener('click', onModalClick);
  sessionState.cleanupCallbacks.push(() => modal.removeEventListener('click', onModalClick));

  const onDocumentKeydown = (event: KeyboardEvent): void => {
    if (modal.hidden) {
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      closeChatSearchModal(container);
      return;
    }
    if (event.key === 'Tab') {
      keepChatSearchFocus(modal, event);
    }
  };
  document.addEventListener('keydown', onDocumentKeydown);
  sessionState.cleanupCallbacks.push(() =>
    document.removeEventListener('keydown', onDocumentKeydown)
  );

  renderChatSearchResults(container);
}

export function portalChatSearchModal(modal: HTMLElement): void {
  const body = modal.ownerDocument.body;
  if (modal.parentElement === body) {
    return;
  }

  body.append(modal);
  sessionState.cleanupCallbacks.push(() => modal.remove());
}

export function openChatSearchModal(container: HTMLElement): void {
  const refs = getChatSearchRefs(container);
  if (!refs) {
    return;
  }

  saveActiveThreadDraft(container);
  positionChatSearchModal(container, refs.modal);
  refs.input.value = '';
  renderChatSearchResults(container);
  refs.modal.hidden = false;
  refs.modal.classList.add('is-visible');
  refs.modal.setAttribute('aria-hidden', 'false');
  window.setTimeout(() => {
    if (refs.modal.hidden) {
      return;
    }
    refs.input.focus();
    refs.input.select();
  }, 0);
}

export function positionChatSearchModal(container: HTMLElement, modal: HTMLElement): void {
  const main = container.querySelector<HTMLElement>('.deep-chat-main');
  const rect = main?.getBoundingClientRect();
  if (!rect || rect.width <= 0 || rect.height <= 0) {
    modal.style.removeProperty('--deep-chat-search-left');
    modal.style.removeProperty('--deep-chat-search-top');
    return;
  }

  modal.style.setProperty('--deep-chat-search-left', `${rect.left + rect.width / 2}px`);
  modal.style.setProperty('--deep-chat-search-top', `${rect.top + rect.height / 2}px`);
}

export function closeChatSearchModal(container: HTMLElement): void {
  const refs = getChatSearchRefs(container);
  if (!refs || refs.modal.hidden) {
    return;
  }

  refs.modal.hidden = true;
  refs.modal.classList.remove('is-visible');
  refs.modal.setAttribute('aria-hidden', 'true');
  refs.openButton?.focus();
}

export function renderChatSearchResults(container: HTMLElement): void {
  const refs = getChatSearchRefs(container);
  if (!refs) {
    return;
  }

  const query = refs.input.value.trim();
  const results = getChatSearchResults(query);
  if (results.length === 0) {
    setSafeHtml(
      refs.results,
      `
      <div class="deep-chat-search-empty">
        未找到匹配会话
      </div>
    `
    );
    return;
  }

  const groupLabel = query ? '搜索结果' : '今天';

  setSafeHtml(
    refs.results,
    `
    <div class="deep-chat-search-group">${escapeHTML(groupLabel)}</div>
    <div class="deep-chat-search-result-list">
      ${results
        .map(({ thread }) => {
          const isActive = thread.id === sessionState.threadStore.activeThreadId;
          const displayTitle =
            thread.customTitle ||
            getThreadTitle(thread.messages, 100) ||
            thread.title ||
            'New Thread';
          const title = escapeHTML(displayTitle);

          return `
        <button
          class="deep-chat-search-result${isActive ? ' is-active' : ''}"
          type="button"
          data-chat-search-thread-id="${escapeHTML(thread.id)}"
          aria-label="打开会话 ${title}"
        >
          <span class="deep-chat-search-result-icon" aria-hidden="true">
            <i class="far fa-message"></i>
          </span>
          <span class="deep-chat-search-result-copy">
            <span class="deep-chat-search-result-title">${title}</span>
          </span>
        </button>
      `;
        })
        .join('')}
    </div>
  `
  );
}

export function getChatSearchResults(query: string): ChatSearchResult[] {
  const normalizedQuery = normalizeChatSearchText(query);
  return [...sessionState.threadStore.threads]
    .filter(isThreadVisibleInHistory)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((thread): ChatSearchResult | null => {
      const matchedText = normalizedQuery
        ? getThreadMatchedSearchText(thread, normalizedQuery)
        : '';
      if (normalizedQuery && !matchedText) {
        return null;
      }

      return {
        thread,
      };
    })
    .filter((result): result is ChatSearchResult => result !== null);
}

export function getThreadMatchedSearchText(
  thread: DeepChatThread,
  normalizedQuery: string
): string {
  const searchableValues = [
    thread.title,
    thread.draftText || '',
    ...thread.messages.map(message => getMessageText(message)),
  ];

  return (
    searchableValues.find(value => normalizeChatSearchText(value).includes(normalizedQuery)) || ''
  );
}

export function normalizeChatSearchText(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

export function keepChatSearchFocus(modal: HTMLElement, event: KeyboardEvent): void {
  const focusableElements = Array.from(
    modal.querySelectorAll<HTMLElement>(CHAT_SEARCH_FOCUSABLE_SELECTOR)
  ).filter(element => {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });

  if (focusableElements.length === 0) {
    return;
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  if (event.shiftKey && document.activeElement === firstElement) {
    event.preventDefault();
    lastElement?.focus();
  } else if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault();
    firstElement?.focus();
  }
}

export function refreshChatSearchResultsIfOpen(container: HTMLElement): void {
  const refs = getChatSearchRefs(container);
  if (refs && !refs.modal.hidden) {
    renderChatSearchResults(container);
  }
}

export function getChatSearchRefs(container: HTMLElement): ChatSearchRefs | null {
  const root = container.ownerDocument;
  const modal =
    container.querySelector<HTMLElement>('#deep-chat-search-modal') ||
    root.querySelector<HTMLElement>('#deep-chat-search-modal');
  const input =
    container.querySelector<HTMLInputElement>('#deep-chat-search-input') ||
    root.querySelector<HTMLInputElement>('#deep-chat-search-input');
  const results =
    container.querySelector<HTMLElement>('#deep-chat-search-results') ||
    root.querySelector<HTMLElement>('#deep-chat-search-results');
  if (!modal || !input || !results) {
    return null;
  }

  return {
    modal,
    input,
    results,
    openButton: container.querySelector<HTMLButtonElement>('#deep-chat-search-chats'),
  };
}

export function readLiveReasoningOverrideFromDom(
  container: HTMLElement
): DeepChatReasoningSessionOverride | null {
  const root = container.querySelector<HTMLElement>('#deep-chat-reasoning-controls');
  const enabledEl = container.querySelector<HTMLInputElement>('#deep-chat-reasoning-enabled');
  const effortEl = container.querySelector<HTMLSelectElement>('#deep-chat-reasoning-effort');
  if (!root || root.hidden || !enabledEl) {
    return null;
  }
  return {
    enabled: Boolean(enabledEl.checked),
    effort: parseReasoningEffortValue(effortEl?.value),
  };
}

export function readStoredReasoningOverride(): DeepChatReasoningSessionOverride | undefined {
  const stored = getActiveThread().reasoning;
  if (!stored) {
    return undefined;
  }
  return {
    enabled: Boolean(stored.enabled),
    ...(stored.effort ? { effort: parseReasoningEffortValue(stored.effort) } : {}),
  };
}

/**
 * Session override for the next request.
 * When reasoning controls are visible, read live DOM (WYSIWYG) so enabling in the UI
 * always maps to request fields even if thread.reasoning lagged behind the checkbox state.
 * When controls are hidden, force enabled:false so no reasoning fields are sent.
 */

export function resolveDeepChatReasoningSessionOverride(
  container: HTMLElement | null
): DeepChatReasoningSessionOverride | undefined {
  const config = sessionState.currentConfig;
  const model = sessionState.selectedModel || config?.model || '';
  if (!config || !model) {
    return undefined;
  }

  const cap = resolveModelCapability({
    provider: config.provider,
    modelId: model,
    modelsEntry: findConfigModelsEntry(config, model),
  });
  if (!shouldShowReasoningControls(cap)) {
    return { enabled: false };
  }

  if (container) {
    const live = readLiveReasoningOverrideFromDom(container);
    if (live) {
      return live;
    }
  }

  return readStoredReasoningOverride();
}

export function bindReasoningTuningControls(container: HTMLElement): void {
  const reasoningEnabled = container.querySelector<HTMLInputElement>(
    '#deep-chat-reasoning-enabled'
  );
  const reasoningEffort = container.querySelector<HTMLSelectElement>('#deep-chat-reasoning-effort');

  const onReasoningEnabledChange = (): void => {
    const enabled = Boolean(reasoningEnabled?.checked);
    if (reasoningEffort) {
      reasoningEffort.disabled = !enabled;
    }
    const prev = getActiveThread().reasoning || {};
    updateActiveThreadFields(container, {
      reasoning: {
        ...prev,
        enabled,
        effort: parseReasoningEffortValue(reasoningEffort?.value ?? prev.effort),
      },
    });
  };
  const onReasoningEffortChange = (): void => {
    const effort = parseReasoningEffortValue(reasoningEffort?.value);
    const prev = getActiveThread().reasoning || {};
    const enabled =
      prev.enabled !== undefined ? Boolean(prev.enabled) : Boolean(reasoningEnabled?.checked);
    updateActiveThreadFields(container, {
      reasoning: { ...prev, enabled, effort },
    });
  };
  reasoningEnabled?.addEventListener('change', onReasoningEnabledChange);
  reasoningEffort?.addEventListener('change', onReasoningEffortChange);
  sessionState.cleanupCallbacks.push(() => {
    reasoningEnabled?.removeEventListener('change', onReasoningEnabledChange);
    reasoningEffort?.removeEventListener('change', onReasoningEffortChange);
  });
  syncDeepChatReasoningControlsFromThread(container);
}

export function bindTuningControls(container: HTMLElement, refs: TuningControlRefs): void {
  const { systemPromptInput, temperatureInput, temperatureValue, resetTuningButton, tuningPanel } =
    refs;

  const onSystemPromptInput = (): void => {
    sessionState.sessionSystemPrompt = systemPromptInput?.value.trim() || '';
    updateActiveThreadFields(container, {
      systemPrompt: sessionState.sessionSystemPrompt || undefined,
    });
  };
  systemPromptInput?.addEventListener('input', onSystemPromptInput);
  sessionState.cleanupCallbacks.push(() =>
    systemPromptInput?.removeEventListener('input', onSystemPromptInput)
  );

  const onTemperatureInput = (): void => {
    sessionState.sessionTemperature = normalizeTemperature(temperatureInput?.value);
    if (temperatureValue) {
      temperatureValue.value = sessionState.sessionTemperature.toFixed(1);
    }
    updateTemperatureTrack(temperatureInput);
    updateActiveThreadFields(container, { temperature: sessionState.sessionTemperature });
  };
  temperatureInput?.addEventListener('input', onTemperatureInput);
  sessionState.cleanupCallbacks.push(() =>
    temperatureInput?.removeEventListener('input', onTemperatureInput)
  );

  bindReasoningTuningControls(container);

  const onResetTuning = (): void => {
    sessionState.sessionSystemPrompt = '';
    sessionState.sessionTemperature = 0.3;
    if (systemPromptInput) {
      systemPromptInput.value = '';
    }
    if (temperatureInput) {
      temperatureInput.value = '0.3';
    }
    if (temperatureValue) {
      temperatureValue.value = '0.3';
    }
    updateTemperatureTrack(temperatureInput);
    updateActiveThreadFields(container, {
      systemPrompt: undefined,
      temperature: 0.3,
      reasoning: undefined,
    });
    syncDeepChatReasoningControlsFromThread(container);
    showToast('Deep Chat 调试参数已重置', { type: 'success' });
  };
  resetTuningButton?.addEventListener('click', onResetTuning);
  sessionState.cleanupCallbacks.push(() =>
    resetTuningButton?.removeEventListener('click', onResetTuning)
  );

  const onDocumentPointerDown = (event: PointerEvent): void => {
    if (!tuningPanel?.open) {
      return;
    }

    const target = event.target;
    if (target instanceof Node && tuningPanel.contains(target)) {
      return;
    }

    tuningPanel.open = false;
  };
  document.addEventListener('pointerdown', onDocumentPointerDown);
  sessionState.cleanupCallbacks.push(() =>
    document.removeEventListener('pointerdown', onDocumentPointerDown)
  );
}

export function toggleThreadRail(container: HTMLElement): void {
  const page = container.querySelector<HTMLElement>('.deep-chat-page');
  if (!page) {
    return;
  }

  const shouldCollapse = !page.classList.contains(THREAD_RAIL_COLLAPSED_CLASS);
  page.classList.toggle(THREAD_RAIL_COLLAPSED_CLASS, shouldCollapse);
  syncThreadRailState(container);
}

/** U4：窄屏会话 / Prompt 抽屉 */

export function bindMobileDrawerControls(container: HTMLElement): void {
  const page = container.querySelector<HTMLElement>('.deep-chat-page');
  const backdrop = container.querySelector<HTMLButtonElement>('#deep-chat-drawer-backdrop');
  if (!page) {
    return;
  }

  const closeDrawers = (): void => {
    page.classList.remove('is-thread-drawer-open', 'is-prompt-drawer-open');
    if (backdrop) {
      backdrop.hidden = true;
    }
  };

  const openDrawer = (kind: 'thread' | 'prompt'): void => {
    page.classList.toggle('is-thread-drawer-open', kind === 'thread');
    page.classList.toggle('is-prompt-drawer-open', kind === 'prompt');
    if (backdrop) {
      backdrop.hidden = false;
    }
  };

  const onBarClick = (event: Event): void => {
    const target = event.target as HTMLElement | null;
    const button = target?.closest<HTMLButtonElement>('[data-drawer]');
    const drawer = button?.dataset.drawer;
    if (drawer !== 'thread' && drawer !== 'prompt') {
      return;
    }
    event.preventDefault();
    openDrawer(drawer);
  };

  const bar = container.querySelector('.deep-chat-mobile-rail-bar');
  bar?.addEventListener('click', onBarClick);
  backdrop?.addEventListener('click', closeDrawers);
  sessionState.cleanupCallbacks.push(() => {
    bar?.removeEventListener('click', onBarClick);
    backdrop?.removeEventListener('click', closeDrawers);
    closeDrawers();
  });
}

export function syncThreadRailState(container: HTMLElement): void {
  const page = container.querySelector<HTMLElement>('.deep-chat-page');
  const rail = container.querySelector<HTMLElement>('#deep-chat-thread-rail');
  const toggle = container.querySelector<HTMLButtonElement>('#deep-chat-toggle-rail');
  const isCollapsed = page?.classList.contains(THREAD_RAIL_COLLAPSED_CLASS) || false;
  const expandedText = isCollapsed ? '展开最近会话' : '收起最近会话';

  if (rail) {
    rail.setAttribute('aria-hidden', String(isCollapsed));
    (rail as HTMLElement & { inert: boolean }).inert = isCollapsed;
  }

  if (toggle) {
    toggle.setAttribute('aria-expanded', String(!isCollapsed));
    toggle.setAttribute('aria-label', expandedText);
    toggle.title = expandedText;
  }
}

export async function refreshLLMConfig(
  container: HTMLElement,
  isCurrent: () => boolean = () => true
): Promise<void> {
  const config = await StorageService.getLLMConfigWithKey();
  if (!isCurrent()) return;

  sessionState.currentConfig = config;
  sessionState.selectedModel =
    resolveToolTargetModel('playground-deep-chat', sessionState.currentConfig) ||
    getFirstModel(sessionState.currentConfig) ||
    '';

  // select 的渲染由 ModelSelect 组件负责；这里同步组件内部 provider（配置切换后）。
  syncModelSelectProvider(container);

  renderLLMConfigState(container);
  syncDeepChatReasoningControlsFromThread(container);
  applyDeepChatVisionUploadConfig(getChat(container));
}

/**
 * 「配置模型」按钮显隐：有可用配置（key + 已选中模型）时隐藏，否则显示引导进设置。
 * select 的渲染已交由 ModelSelect 组件，不再操作 select。
 */
export function renderLLMConfigState(container: HTMLElement): void {
  const settingsButton = container.querySelector<HTMLButtonElement>('#deep-chat-open-settings');
  if (!settingsButton) return;
  const config = sessionState.currentConfig;
  const hasUsableConfig = !!config?.apiKey && !!sessionState.selectedModel;
  settingsButton.hidden = hasUsableConfig;
}

export function initDeepChat(container: HTMLElement): void {
  const chat = container.querySelector<DeepChatElement>('#deep-chat-view');
  if (!chat) {
    return;
  }

  const activeThread = getActiveThread();
  // 切会话/切回页面：已接收 stream 直接对齐到 displayed，避免 history 占位或长时间打字机追赶。
  // 深度思考同理对齐 cursor，后台攒下的 reasoning 立刻完整可见，新 chunk 才继续打字。
  sessionState.pendingRequests.forEach(request => {
    if (request.assistantText) {
      markPendingDeepChatAssistantTextDisplayed(request, request.assistantText);
    }
    if (request.reasoningText) {
      request.reasoningDisplayedLength = request.reasoningText.length;
    }
  });
  configureDeepChatBase(chat, activeThread, updateThreadDraft, getThreadDisplayMessages);
  // deep-chat 默认用 innerText 抽正文，会在 contenteditable=false 的 Chip 两侧插入换行；
  // 统一走 serialize，避免刷新后换行累积。
  chat.onInput = () => {
    updateThreadDraft(sessionState.threadStore.activeThreadId, getDraftInputText(container));
  };
  configureDeepChatStyles(chat);
  configureDeepChatConnection(chat, container, handleDeepChatRequest);
  chat.onRender?.();
  setupMessageToolbars(chat, () => getThreadDisplayMessages(getActiveThread()), {
    canSendToKeywordHunter: () => Boolean(getActiveListingPromptContext()),
    sendToKeywordHunter: (content, message) => sendAssistantCopyToKeywordHunter(content, message),
    // 气泡 Chip / 编辑回填：优先会话挂载；发送后已消费则从历史消息标记重建展示上下文
    getSkillContexts: () => collectDisplaySkillContexts(getActiveThread()),
    refillComposerWithText: text => refillComposerWithSkillChips(container, text),
    // 「正在生成回复 · 已收到 N 字」挂在 toolbar 末尾，不占气泡上方
    getLiveGenerationStatusLabel: () => getActiveLiveGenerationStatusLabel(),
    hasActivePendingGeneration: () => {
      const pending = sessionState.pendingRequests.get(sessionState.threadStore.activeThreadId);
      return Boolean(pending && !pending.isSettled);
    },
  });
  setConversationActive(
    container,
    activeThread.messages.length > 0 || sessionState.pendingRequests.has(activeThread.id)
  );
  // New deep-chat element every replaceChat — rebind observer and remount chrome hard
  remountDeepThinkingChromeAfterChatReplace(container);
  // Shadow hosts may appear a frame later; refresh so toolbar is not stuck empty after remount.
  refreshMessageToolbarStatuses(chat, () => getThreadDisplayMessages(getActiveThread()));
  for (const ms of [32, 80] as const) {
    window.setTimeout(() => {
      if (getChat(container) !== chat) return;
      refreshMessageToolbarStatuses(chat, () => getThreadDisplayMessages(getActiveThread()));
    }, ms);
  }
  setupDraftInputHeightSync(container, chat);
  setupSubmitStopButtonSync(container, chat);
  // Shadow #input / upload button may appear after configure; re-sync helper + aria.
  applyDeepChatVisionUploadConfig(chat);
  window.setTimeout(() => {
    if (getChat(container) === chat) {
      applyDeepChatVisionUploadConfig(chat);
    }
  }, 120);
  // 恢复所有在飞/待输出会话（切出页面再回来时「生成中」不丢）
  sessionState.pendingRequests.forEach((_request, threadId) => {
    schedulePendingAssistantDisplay(threadId);
  });
  if (!sessionState.pendingRequests.has(activeThread.id)) {
    schedulePendingAssistantDisplay(activeThread.id);
  }
}

export function replaceChat(container: HTMLElement): void {
  const chat = getChat(container);
  if (!chat) {
    return;
  }

  rescueSkillLoadBannerToStage(container);
  // Detached bubble DOM must not keep receiving typewriter ticks.
  stopReasoningTypewriter();
  disconnectChromeMutationObserver();
  // Turn-local staged images never cross thread remounts.
  unmountVisionComposer();

  if (typeof chat.clearMessages === 'function') {
    chat.clearMessages(true);
  }

  const nextChat = document.createElement('deep-chat') as DeepChatElement;
  nextChat.id = 'deep-chat-view';
  nextChat.className = 'deep-chat-view';
  nextChat.style.fontFamily = DEEP_CHAT_SYSTEM_FONT_STACK;
  chat.replaceWith(nextChat);
  initDeepChat(container);
  placeSkillComposerChrome(container);
}

export function getChat(container: HTMLElement): DeepChatElement | null {
  return container.querySelector<DeepChatElement>('#deep-chat-view');
}

export function createChevronIcon(doc: Document): HTMLElement {
  const wrap = doc.createElement('span');
  wrap.className = 'deep-chat-dt-chevron';
  wrap.setAttribute('aria-hidden', 'true');

  const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('width', '12');
  svg.setAttribute('height', '12');
  svg.setAttribute('focusable', 'false');

  const path = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
  // Chevron pointing right (>)
  path.setAttribute('d', 'M6 3.2 L11 8 L6 12.8');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.8');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(path);
  wrap.appendChild(svg);
  return wrap;
}

export function setToggleExpanded(toggle: HTMLElement, expanded: boolean): void {
  toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  toggle.classList.toggle('is-expanded', expanded);
}

export function formatCompletedDurationLabel(durationSec: number): string {
  return `已完成 ${Math.max(0, Math.round(durationSec))}s`;
}

registerShellUiHooks({
  getChat,
  replaceChat,
  refreshChatSearchResultsIfOpen,
  resolveDeepChatReasoningSessionOverride,
  createChevronIcon,
  setToggleExpanded,
  renderThreadList,
  renderPromptDraftList,
});

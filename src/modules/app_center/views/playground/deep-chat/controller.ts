import BaseModule from '@/common/BaseModule';
import { SafeTemplateLoader } from '@/common/infrastructure/SafeModuleLoader';
import { SafeRenderer } from '@/common/infrastructure/SafeRenderer';
import { consumeListingPromptForDeepChat } from '@/modules/app_center/listingWorkflowHandoff';


// Side-effect imports: register uiHooks before mount wires domains together.
import './session/pendingRuntime';
import './chrome/generationChrome';
import './composer/composerUi';
import './integrations/handoffs';
import './request/handleRequest';
import './shell/shellUi';

import { clearPendingChromeObserver } from './chrome/generationChrome';
import {
  clearDraftInputHeightSync,
  clearSubmitStopButtonSync,
  saveActiveThreadDraft,
} from './composer/composerUi';
import { cleanupMessageToolbars } from './composer/messageToolbar';
import { unmountVisionComposer } from './composer/visionComposer';
import { DEEP_CHAT_TEMPLATE_PATH } from './constants';
import { ensureDeepChatElementDefined } from './infra/deepChatElementLoader';
import {
  bindSkillHandoffListeners,
  consumePendingSkillHandoff,
  saveActiveThreadTuning,
} from './integrations/handoffs';
import {
  applyPendingRequestsToThreadStore,
  persistPendingPartialIfNeeded,
  schedulePendingAssistantDisplay,
} from './session/pendingRuntime';
import { clearDeepChatThreadStore } from './session/sessionLifecycle';
import {
  DEEP_CHAT_SYSTEM_FONT_STACK,
  bindPersistThreadStore,
  draftPersistController,
  sessionState,
  setCleanupCallbacks,
  setCurrentConfig,
  setEditingThreadId,
  setEditingThreadValue,
  setMountedContainer,
  setOpenThreadMenu,
  setSelectedModel,
  setSessionSystemPrompt,
  setSessionTemperature,
  setThreadStore,
} from './session/sessionState';
import {
  applyDeepChatThreadResume,
  clearThreadUnread,
  createThreadFromListingPromptContext,
  loadThreadStore,
  persistThreadStore,
  renderHistoryThreadList,
  renderPromptDraftsForActiveThread,
} from './session/threadStore';
import { resetPromptPreviewState } from './shell/promptPreview';
import { bindControls, initDeepChat, refreshLLMConfig } from './shell/shellUi';

bindPersistThreadStore(persistThreadStore);

class DeepChatModule extends BaseModule {
  constructor() {
    super('playground_deep_chat');
  }

  protected async render(): Promise<void> {
    const container = this.container;
    if (!container) return;
    const mountSignal = this.getAbortSignal();
    const html = await SafeTemplateLoader.getInstance().loadTemplate(DEEP_CHAT_TEMPLATE_PATH);
    if (!this.isCurrentMount(mountSignal)) return;
    setMountedContainer(container);
    SafeRenderer.getInstance().renderTemplate(container, html);
    const chatHost = container.querySelector<HTMLElement>('#deep-chat-view');
    if (chatHost) {
      chatHost.style.fontFamily = DEEP_CHAT_SYSTEM_FONT_STACK;
    }
  }

  protected async init(): Promise<void> {
    const container = this.container;
    if (!container) return;
    const mountSignal = this.getAbortSignal();
    const storedThreadStore = await loadThreadStore();
    if (!this.isCurrentMount(mountSignal)) return;
    setThreadStore(applyDeepChatThreadResume(applyPendingRequestsToThreadStore(storedThreadStore)));
    clearThreadUnread(sessionState.threadStore.activeThreadId);
    renderHistoryThreadList(container);
    renderPromptDraftsForActiveThread(container);
    await ensureDeepChatElementDefined();
    if (!this.isCurrentMount(mountSignal)) return;
    initDeepChat(container);
    await refreshLLMConfig(container, () => this.isCurrentMount(mountSignal));
    if (!this.isCurrentMount(mountSignal)) return;
    bindControls(container);
    bindSkillHandoffListeners(container);
    const promptContext = consumeListingPromptForDeepChat();
    if (promptContext) {
      createThreadFromListingPromptContext(container, promptContext);
    } else {
      consumePendingSkillHandoff(container);
    }
  }

  protected onUnmount(): void {
    const mounted = sessionState.mountedContainer;
    if (mounted && document.body.contains(mounted)) {
      saveActiveThreadDraft(mounted);
      saveActiveThreadTuning(mounted);
      draftPersistController.flush();
    }
    sessionState.cleanupCallbacks.forEach(cleanup => cleanup());
    setCleanupCallbacks([]);
    resetPromptPreviewState();
    clearDraftInputHeightSync();
    clearSubmitStopButtonSync();
    unmountVisionComposer();
    cleanupMessageToolbars();
    clearPendingChromeObserver();
    setOpenThreadMenu(null);
    setEditingThreadId(null);
    setEditingThreadValue('');
    setSessionSystemPrompt('');
    setSessionTemperature(0.3);
    setMountedContainer(null);
    setCurrentConfig(null);
    setSelectedModel('');
    sessionState.pendingRequests.forEach((request, threadId) => {
      persistPendingPartialIfNeeded(request, { force: true });
      schedulePendingAssistantDisplay(threadId);
    });
  }
}

const deepChatModule = new DeepChatModule();

export const mount = (container: HTMLElement): Promise<void> => deepChatModule.mount(container);

export function unmount(): void {
  deepChatModule.unmount();
}

export { clearDeepChatThreadStore };
export { consumePendingSkillHandoff };

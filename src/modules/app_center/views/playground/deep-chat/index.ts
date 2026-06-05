import 'deep-chat';
import '../styles.css';

import { loadTemplate } from '@/common/utils/viewLoader';
import { safeMount } from '@/common/utils/safeMount';
import { SafeRenderer } from '@/common/infrastructure/SafeRenderer';
import { showToast } from '@/common/ui/notifications';
import { callLLM, type ChatMessage } from '@/services/llmService';
import { StorageService } from '@/services/storageService';
import { LocalDataStore } from '@/services/localDataStore';
import type { LLMProviderConfig } from '@/types/state';
import { Logger } from '@/services/loggerService';
import {
  mergeThreadHistoryWithRequest,
  type DeepChatMessage,
  type DeepChatRole,
} from './conversationContext';

interface DeepChatRequestBody {
  messages?: DeepChatMessage[];
  text?: string;
}

interface DeepChatSignals {
  onOpen?: () => void;
  onResponse?: (response: { text?: string; error?: string }) => void | Promise<void>;
  onClose?: () => void;
  stopClicked?: {
    listener: () => void;
  };
}

interface DeepChatElement extends HTMLElement {
  history?: DeepChatMessage[];
  auxiliaryStyle?: string;
  connect?: {
    stream?: boolean;
    handler: (body: DeepChatRequestBody | DeepChatMessage[], signals: DeepChatSignals) => void;
  };
  stream?: boolean;
  chatStyle?: Record<string, string>;
  inputAreaStyle?: Record<string, string>;
  textInput?: Record<string, unknown>;
  submitButtonStyles?: Record<string, unknown>;
  messageStyles?: Record<string, unknown>;
  introMessage?: { text: string };
  focusInput?: () => void;
  avatars?: boolean;
  names?: boolean;
  displayLoadingBubble?: boolean;
  errorMessages?: Record<string, unknown>;
  submitUserMessage?: (content: { text: string }) => void;
  clearMessages?: (isReset?: boolean) => void;
  getMessages?: () => DeepChatMessage[];
  onRender?: () => void;
}

interface PlaygroundThread {
  id: string;
  title: string;
  messages: DeepChatMessage[];
  createdAt: number;
  updatedAt: number;
}

interface PlaygroundThreadStore {
  activeThreadId: string;
  threads: PlaygroundThread[];
}

const THREAD_STORAGE_KEY = 'playground_deep_chat_threads_v1';
const MAX_THREAD_COUNT = 30;
const MESSAGE_TOOLBAR_CLASS = 'playground-message-toolbar';
const DEEP_CHAT_AUXILIARY_STYLE = `
  #messages {
    padding: 22px 24px 18px;
  }

  :host(.is-empty) #messages {
    display: none !important;
  }

  :host(.is-empty) #chat-view {
    align-content: start !important;
    align-items: start !important;
    grid-template-rows: auto !important;
  }

  .outer-message-container {
    margin-bottom: 26px !important;
  }

  .inner-message-container {
    display: flex !important;
    flex-direction: column !important;
    min-width: 0 !important;
  }

  .deep-chat-outer-container-role-user {
    justify-content: flex-end !important;
  }

  .deep-chat-outer-container-role-user .inner-message-container {
    align-items: flex-end !important;
    max-width: min(78%, 560px) !important;
  }

  .deep-chat-outer-container-role-ai .inner-message-container {
    align-items: flex-start !important;
    width: 100% !important;
    max-width: 100% !important;
  }

  .message-bubble {
    box-sizing: border-box !important;
    overflow-wrap: anywhere !important;
  }

  .message-bubble.user-message {
    max-width: 100% !important;
    padding: 10px 14px !important;
    border: 0 !important;
    border-radius: 18px !important;
    background: #f4f4f5 !important;
    color: #1f2328 !important;
    box-shadow: none !important;
  }

  .message-bubble.ai-message {
    width: 100% !important;
    max-width: 100% !important;
    padding: 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    color: #24292f !important;
    box-shadow: none !important;
  }

  .message-bubble.user-message h1,
  .message-bubble.user-message h2,
  .message-bubble.user-message h3,
  .message-bubble.user-message p,
  .message-bubble.user-message ul,
  .message-bubble.user-message ol {
    margin: 0 0 8px !important;
    font-size: 14px !important;
    line-height: 1.55 !important;
  }

  .message-bubble.user-message > :last-child,
  .message-bubble.ai-message > :last-child {
    margin-bottom: 0 !important;
  }

  .message-bubble.ai-message p,
  .message-bubble.ai-message li {
    font-size: 14px !important;
    line-height: 1.75 !important;
  }

  .message-bubble.ai-message h1,
  .message-bubble.ai-message h2,
  .message-bubble.ai-message h3 {
    margin: 18px 0 8px !important;
    color: #111827 !important;
    font-size: 16px !important;
    line-height: 1.45 !important;
  }

  .message-bubble.ai-message ul,
  .message-bubble.ai-message ol {
    padding-inline-start: 20px !important;
  }

  .${MESSAGE_TOOLBAR_CLASS} {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 7px;
    color: #8a8f98;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 12px;
    line-height: 1;
    user-select: none;
  }

  .${MESSAGE_TOOLBAR_CLASS}[data-role="user"] {
    justify-content: flex-end;
    padding-inline-end: 4px;
  }

  .${MESSAGE_TOOLBAR_CLASS}[data-role="ai"] {
    justify-content: flex-start;
    margin-top: 12px;
  }

  .playground-message-time {
    color: #9aa0a6;
    font-variant-numeric: tabular-nums;
  }

  .playground-message-tool {
    width: 22px;
    height: 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: #8a8f98;
    cursor: pointer;
    transition: background 140ms ease, color 140ms ease;
  }

  .playground-message-tool:hover,
  .playground-message-tool:focus-visible {
    background: #f2f3f5;
    color: #4b5563;
    outline: none;
  }

  .playground-message-tool svg {
    width: 14px;
    height: 14px;
    stroke: currentColor;
    stroke-width: 1.8;
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  #input {
    box-sizing: border-box !important;
    position: relative !important;
    min-height: 0 !important;
    min-width: 0 !important;
    height: 100% !important;
    width: 100% !important;
    max-width: 100% !important;
    align-items: flex-end !important;
    justify-content: center !important;
    padding: 0 !important;
    background: transparent !important;
  }

  :host(.is-empty) #input {
    align-items: flex-start !important;
    height: auto !important;
  }

  #text-input-container {
    box-sizing: border-box !important;
    width: min(100%, 768px) !important;
    min-width: 0 !important;
    max-width: 100% !important;
    min-height: 58px !important;
    max-height: 150px !important;
    margin: 0 auto !important;
    border: 1px solid #dedede !important;
    border-radius: 29px !important;
    background: #ffffff !important;
    box-shadow: 0 16px 38px rgba(15, 23, 42, 0.08), 0 2px 8px rgba(15, 23, 42, 0.06) !important;
    overflow-y: auto !important;
  }

  #text-input {
    box-sizing: border-box !important;
    min-width: 0 !important;
    max-width: 100% !important;
    min-height: 24px !important;
    padding: 18px 62px 16px 22px !important;
    color: #111111 !important;
    font-size: 15px !important;
    line-height: 1.45 !important;
    overflow-wrap: anywhere !important;
    word-break: break-word !important;
    white-space: pre-wrap !important;
  }

  .input-button-container.inner-button-container {
    position: absolute !important;
    inset: 0 !important;
    width: 100% !important;
    height: 100% !important;
    pointer-events: none !important;
  }

  .input-button-container.inner-button-container .input-button {
    pointer-events: auto !important;
  }

  #text-input[contenteditable]:empty:before {
    color: #9a9a9a !important;
  }

  #microphone-button,
  #dropup-button,
  #upload-images-button,
  #upload-gifs-button,
  #upload-audio-button,
  #upload-mixed-files-button,
  #camera-button,
  #file-input,
  #dropup-menu {
    display: none !important;
  }

  .inside-end.input-button,
  .inside-end.submit-button,
  .inside-end.disabled-button,
  .inside-end.loading-button {
    width: 36px !important;
    height: 36px !important;
    inset-inline-end: max(11px, calc((100% - 768px) / 2 + 11px)) !important;
    inset-block-end: 11px !important;
    margin: 0 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    border-radius: 50% !important;
    background: #050505 !important;
    box-shadow: none !important;
  }

  .inside-end.input-button:hover,
  .inside-end.input-button:focus-visible,
  .inside-end.submit-button:hover,
  .inside-end.submit-button:focus-visible,
  .inside-end.loading-button:hover,
  .inside-end.loading-button:focus-visible,
  .inside-end.disabled-button:hover,
  .inside-end.disabled-button:focus-visible {
    background: #111111 !important;
  }

  .inside-end #submit-icon {
    width: 17px !important;
    height: 17px !important;
    filter: brightness(0) invert(1) !important;
  }

  .inside-end #stop-icon {
    position: absolute !important;
    inset: 0 !important;
    width: 36px !important;
    height: 36px !important;
    border-radius: 50% !important;
    background: #050505 !important;
    pointer-events: none !important;
  }

  .inside-end #stop-icon::after {
    content: "" !important;
    position: absolute !important;
    inset: 13px !important;
    border-radius: 2px !important;
    background: #ffffff !important;
  }

  @media (max-width: 640px) {
    #messages {
      padding: 18px 16px;
    }

    .deep-chat-outer-container-role-user .inner-message-container {
      max-width: 88% !important;
    }

    #text-input-container {
      width: 100% !important;
      min-height: 56px !important;
      border-radius: 28px !important;
    }

    #text-input {
      padding: 17px 60px 15px 18px !important;
      font-size: 14px !important;
    }

    .inside-end.input-button,
    .inside-end.submit-button,
    .inside-end.disabled-button,
    .inside-end.loading-button {
      inset-inline-end: 10px !important;
      inset-block-end: 10px !important;
    }
  }
`;

let cleanupCallbacks: Array<() => void> = [];
let currentConfig: LLMProviderConfig | null = null;
let selectedModel = '';
let sessionSystemPrompt = '';
let sessionTemperature = 0.3;
let threadStore: PlaygroundThreadStore = createDefaultThreadStore();
let messageToolbarObserver: MutationObserver | null = null;
let messageToolbarTimer: number | null = null;

const mountInternal = async (container: HTMLElement): Promise<void> => {
  const html = await loadTemplate('src/modules/app_center/views/playground/deep-chat/template.html');
  const renderer = SafeRenderer.getInstance();

  container.classList.add('fade-in');
  renderer.renderTemplate(container, html);
  threadStore = await loadThreadStore();
  renderThreadList(container);

  await customElements.whenDefined('deep-chat');
  initDeepChat(container);
  await refreshLLMConfig(container);
  bindControls(container);
};

export const mount = safeMount(mountInternal, { moduleName: 'Deep Chat' });

export function unmount(): void {
  cleanupCallbacks.forEach((cleanup) => cleanup());
  cleanupCallbacks = [];
  currentConfig = null;
  selectedModel = '';
  sessionSystemPrompt = '';
  sessionTemperature = 0.3;
  threadStore = createDefaultThreadStore();
  cleanupMessageToolbars();
  Logger.debug('[Deep Chat] 模块已卸载');
}

async function refreshLLMConfig(container: HTMLElement): Promise<void> {
  const statusEl = container.querySelector<HTMLElement>('#playground-provider-status');
  const modelSelect = container.querySelector<HTMLSelectElement>('#playground-model-select');

  currentConfig = await StorageService.getLLMConfigWithKey();
  selectedModel = currentConfig?.model || getFirstModel(currentConfig) || '';

  if (!statusEl || !modelSelect) {
    return;
  }

  modelSelect.innerHTML = '';

  if (!currentConfig || !currentConfig.apiKey || !selectedModel) {
    statusEl.textContent = '未配置模型，请先在系统设置中配置 LLM';
    modelSelect.disabled = true;
    modelSelect.appendChild(new Option('No model configured', ''));
    return;
  }

  const models = normalizeModels(currentConfig);
  const visibleModels = models.length > 0 ? models : [selectedModel];

  visibleModels.forEach((model) => {
    modelSelect.appendChild(new Option(model, model));
  });

  modelSelect.value = visibleModels.includes(selectedModel) ? selectedModel : visibleModels[0] || '';
  selectedModel = modelSelect.value;
  modelSelect.disabled = visibleModels.length <= 1;
  statusEl.textContent = `${currentConfig.provider} / ${selectedModel}`;
}

function initDeepChat(container: HTMLElement): void {
  const chat = container.querySelector<DeepChatElement>('#playground-chat');
  if (!chat) {
    return;
  }

  const activeThread = getActiveThread();
  chat.history = activeThread.messages;
  chat.stream = true;
  chat.auxiliaryStyle = DEEP_CHAT_AUXILIARY_STYLE;
  chat.avatars = false;
  chat.names = false;
  chat.displayLoadingBubble = true;
  chat.errorMessages = {
    displayServiceErrorMessages: true,
  };
  chat.chatStyle = {
    width: '100%',
    height: '100%',
    border: '0',
    borderRadius: '0',
    backgroundColor: 'transparent',
  };
  Object.assign(chat.style, chat.chatStyle);
  chat.inputAreaStyle = {
    backgroundColor: 'transparent',
    borderTop: '0',
    padding: '0',
    alignItems: 'flex-end',
  };
  chat.textInput = {
    placeholder: {
      text: '有问题，尽管问',
      style: { color: '#9a9a9a' },
    },
    styles: {
      container: {
        width: '100%',
        margin: '0',
        borderRadius: '29px',
        border: '1px solid #dedede',
        backgroundColor: '#ffffff',
        boxShadow: '0 16px 38px rgba(15, 23, 42, 0.08), 0 2px 8px rgba(15, 23, 42, 0.06)',
        minHeight: '58px',
        maxHeight: '150px',
      },
      text: {
        color: '#111111',
        fontSize: '15px',
        lineHeight: '1.45',
        padding: '18px 62px 16px 22px',
      },
    },
  };
  chat.submitButtonStyles = {
    submit: {
      container: {
        borderRadius: '999px',
        backgroundColor: '#8d8d8d',
        width: '34px',
        height: '34px',
      },
    },
  };
  chat.messageStyles = {
    default: {
      shared: {
        outerContainer: {
          width: '100%',
          marginBottom: '26px',
        },
        bubble: {
          fontSize: '14px',
          lineHeight: '1.7',
        },
      },
      user: {
        bubble: {
          backgroundColor: '#f4f4f5',
          color: '#1f2328',
          border: '0',
          borderRadius: '18px',
          padding: '10px 14px',
        },
      },
      ai: {
        innerContainer: {
          width: '100%',
          maxWidth: '100%',
        },
        bubble: {
          width: '100%',
          maxWidth: '100%',
          backgroundColor: 'transparent',
          color: '#24292f',
          border: '0',
          borderRadius: '0',
          padding: '0',
        },
      },
    },
  };
  chat.connect = {
    stream: true,
    handler: (body, signals) => {
      void handlePlaygroundRequest(container, body, signals);
    },
  };
  chat.onRender?.();
  setupMessageToolbars(chat);
  setConversationActive(container, activeThread.messages.length > 0);
}

function bindControls(container: HTMLElement): void {
  const modelSelect = container.querySelector<HTMLSelectElement>('#playground-model-select');
  const refreshButton = container.querySelector<HTMLButtonElement>('#playground-refresh-config');
  const clearButton = container.querySelector<HTMLButtonElement>('#playground-clear-chat');
  const systemPromptInput = container.querySelector<HTMLTextAreaElement>('#playground-system-prompt');
  const temperatureInput = container.querySelector<HTMLInputElement>('#playground-temperature');
  const temperatureValue = container.querySelector<HTMLOutputElement>('#playground-temperature-value');
  const resetTuningButton = container.querySelector<HTMLButtonElement>('#playground-reset-tuning');
  const threadList = container.querySelector<HTMLElement>('#playground-thread-list');

  const onModelChange = (): void => {
    selectedModel = modelSelect?.value || selectedModel;
    updateStatus(container);
  };
  modelSelect?.addEventListener('change', onModelChange);
  cleanupCallbacks.push(() => modelSelect?.removeEventListener('change', onModelChange));

  const onRefresh = async (): Promise<void> => {
    await refreshLLMConfig(container);
    showToast('Deep Chat 模型配置已刷新', { type: 'success' });
  };
  refreshButton?.addEventListener('click', onRefresh);
  cleanupCallbacks.push(() => refreshButton?.removeEventListener('click', onRefresh));

  const onClear = (): void => {
    createThread(container);
  };
  clearButton?.addEventListener('click', onClear);
  cleanupCallbacks.push(() => clearButton?.removeEventListener('click', onClear));

  const onThreadListClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement | null;
    const deleteButton = target?.closest<HTMLButtonElement>('[data-delete-thread-id]');
    const deleteThreadId = deleteButton?.dataset.deleteThreadId;
    if (deleteThreadId) {
      deleteThread(container, deleteThreadId);
      return;
    }

    const switchButton = target?.closest<HTMLButtonElement>('[data-thread-id]');
    const threadId = switchButton?.dataset.threadId;
    if (threadId) {
      switchThread(container, threadId);
    }
  };
  threadList?.addEventListener('click', onThreadListClick);
  cleanupCallbacks.push(() => threadList?.removeEventListener('click', onThreadListClick));

  const onSystemPromptInput = (): void => {
    sessionSystemPrompt = systemPromptInput?.value.trim() || '';
  };
  systemPromptInput?.addEventListener('input', onSystemPromptInput);
  cleanupCallbacks.push(() => systemPromptInput?.removeEventListener('input', onSystemPromptInput));

  const onTemperatureInput = (): void => {
    sessionTemperature = normalizeTemperature(temperatureInput?.value);
    if (temperatureValue) {
      temperatureValue.value = sessionTemperature.toFixed(1);
    }
    updateTemperatureTrack(temperatureInput);
  };
  updateTemperatureTrack(temperatureInput);
  temperatureInput?.addEventListener('input', onTemperatureInput);
  cleanupCallbacks.push(() => temperatureInput?.removeEventListener('input', onTemperatureInput));

  const onResetTuning = (): void => {
    sessionSystemPrompt = '';
    sessionTemperature = 0.3;
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
    showToast('Deep Chat 调试参数已重置', { type: 'success' });
  };
  resetTuningButton?.addEventListener('click', onResetTuning);
  cleanupCallbacks.push(() => resetTuningButton?.removeEventListener('click', onResetTuning));

}

async function handlePlaygroundRequest(
  container: HTMLElement,
  body: DeepChatRequestBody | DeepChatMessage[],
  signals: DeepChatSignals
): Promise<void> {
  let requestController: AbortController | null = null;

  try {
    const config = currentConfig || await StorageService.getLLMConfigWithKey();
    const model = selectedModel || config?.model || getFirstModel(config);

    if (!config || !config.apiKey || !model) {
      await signals.onResponse?.({ error: '请先在系统设置中配置可用的 LLM 模型。' });
      signals.onClose?.();
      return;
    }

    const requestMessages = normalizeChatMessages(body);
    const conversationMessages = mergeThreadHistoryWithRequest(
      getActiveThread().messages,
      requestMessages
    );
    const messages = withSessionSystemPrompt(conversationMessages);
    if (requestMessages.length === 0) {
      await signals.onResponse?.({ error: '请输入要发送的内容。' });
      signals.onClose?.();
      return;
    }

    setConversationActive(container, true);
    signals.onOpen?.();
    const controller = new AbortController();
    requestController = controller;
    if (signals.stopClicked) {
      signals.stopClicked.listener = () => controller.abort();
    }
    let streamedText = '';

    const finalText = await callLLM(
      messages,
      config.provider,
      config.endpoint,
      config.apiKey,
      model,
      {
        temperature: sessionTemperature,
        retries: 0,
        signal: controller.signal,
        stream: true,
        onStreamUpdate: (update) => {
          streamedText += update.delta;
          if (update.delta) {
            void signals.onResponse?.({ text: update.delta });
          }
        },
      }
    );

    if (!streamedText && finalText) {
      await signals.onResponse?.({ text: finalText });
    }

    saveThreadMessages(
      container,
      conversationMessages,
      (finalText || streamedText).trim()
    );
  } catch (error) {
    if (requestController?.signal.aborted) {
      Logger.debug('[Deep Chat] LLM 调用已取消');
      return;
    }
    const message = error instanceof Error ? error.message : '模型调用失败';
    Logger.error('[Deep Chat] LLM 调用失败:', error);
    await signals.onResponse?.({ error: message });
  } finally {
    signals.onClose?.();
  }
}

function getChat(container: HTMLElement): DeepChatElement | null {
  return container.querySelector<DeepChatElement>('#playground-chat');
}

function setupMessageToolbars(chat: DeepChatElement): void {
  cleanupMessageToolbars();

  const installToolbars = (): void => {
    const root = chat.shadowRoot;
    if (!root) {
      return;
    }

    renderMessageToolbars(chat);
    messageToolbarObserver = new MutationObserver(() => renderMessageToolbars(chat));
    messageToolbarObserver.observe(root, { childList: true, subtree: true });
  };

  messageToolbarTimer = window.setTimeout(installToolbars, 0);
}

function cleanupMessageToolbars(): void {
  messageToolbarObserver?.disconnect();
  messageToolbarObserver = null;

  if (messageToolbarTimer !== null) {
    window.clearTimeout(messageToolbarTimer);
    messageToolbarTimer = null;
  }
}

function renderMessageToolbars(chat: DeepChatElement): void {
  const root = chat.shadowRoot;
  if (!root) {
    return;
  }

  const messages = Array.from(root.querySelectorAll<HTMLElement>('.outer-message-container'));
  messages.forEach((message) => {
    if (message.querySelector(`.${MESSAGE_TOOLBAR_CLASS}`)) {
      return;
    }

    const bubble = message.querySelector<HTMLElement>('.message-bubble');
    const innerContainer = message.querySelector<HTMLElement>('.inner-message-container');
    const role = getMessageRole(message);
    if (!bubble || !innerContainer || !role || !getMessageContent(bubble)) {
      return;
    }

    innerContainer.appendChild(createMessageToolbar(chat, bubble, role));
  });
}

function getMessageRole(message: HTMLElement): 'user' | 'ai' | null {
  if (message.classList.contains('deep-chat-outer-container-role-user')) {
    return 'user';
  }

  if (message.classList.contains('deep-chat-outer-container-role-ai')) {
    return 'ai';
  }

  return null;
}

function createMessageToolbar(
  chat: DeepChatElement,
  bubble: HTMLElement,
  role: 'user' | 'ai'
): HTMLElement {
  const toolbar = document.createElement('div');
  toolbar.className = MESSAGE_TOOLBAR_CLASS;
  toolbar.dataset.role = role;

  const time = document.createElement('span');
  time.className = 'playground-message-time';
  time.textContent = formatToolbarTime(new Date());
  toolbar.appendChild(time);
  toolbar.appendChild(createToolbarButton('复制消息', getCopyIcon(), () => copyMessageContent(bubble)));

  if (role === 'user') {
    toolbar.appendChild(createToolbarButton('编辑消息', getEditIcon(), () => editMessageContent(chat, bubble)));
  }

  return toolbar;
}

function createToolbarButton(label: string, icon: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'playground-message-tool';
  button.title = label;
  button.setAttribute('aria-label', label);
  button.innerHTML = icon;
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });
  return button;
}

function copyMessageContent(bubble: HTMLElement): void {
  const content = getMessageContent(bubble);
  if (!content) {
    return;
  }

  void writeClipboardText(content)
    .then(() => showToast('消息已复制', { type: 'success' }))
    .catch((error) => {
      Logger.warn('[Deep Chat] 复制消息失败:', error);
      showToast('复制失败，请手动选择文本复制', { type: 'error' });
    });
}

async function writeClipboardText(content: string): Promise<void> {
  try {
    const clipboard = window.navigator?.clipboard;
    if (clipboard?.writeText) {
      await clipboard.writeText(content);
      return;
    }
  } catch (error) {
    Logger.warn('[Deep Chat] Clipboard API 不可用，尝试降级复制:', error);
  }

  copyTextWithSelectionFallback(content);
}

function copyTextWithSelectionFallback(content: string): void {
  const textarea = document.createElement('textarea');
  textarea.value = content;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '-9999px';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);

  const selection = document.getSelection();
  const selectedRanges = selection
    ? Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index))
    : [];

  textarea.select();
  const copied = document.execCommand('copy');
  document.body.removeChild(textarea);

  if (selection) {
    selection.removeAllRanges();
    selectedRanges.forEach((range) => selection.addRange(range));
  }

  if (!copied) {
    throw new Error('document.execCommand("copy") returned false');
  }
}

function editMessageContent(chat: DeepChatElement, bubble: HTMLElement): void {
  const content = getMessageContent(bubble);
  const input = chat.shadowRoot?.querySelector<HTMLElement>('#text-input');
  if (!content || !input) {
    return;
  }

  input.textContent = content;
  input.dispatchEvent(new InputEvent('input', {
    bubbles: true,
    inputType: 'insertText',
    data: content,
  }));
  chat.focusInput?.();
  showToast('已放回输入框，可修改后重新发送', { type: 'success' });
}

function getMessageContent(bubble: HTMLElement): string {
  return (bubble.innerText || bubble.textContent || '').trim();
}

function formatToolbarTime(date: Date): string {
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function getCopyIcon(): string {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="9" width="10" height="10" rx="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"></path>
    </svg>
  `;
}

function getEditIcon(): string {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 20h9"></path>
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"></path>
    </svg>
  `;
}

function createThread(container: HTMLElement): void {
  const nextThread = createEmptyThread();
  threadStore = {
    activeThreadId: nextThread.id,
    threads: [nextThread, ...threadStore.threads].slice(0, MAX_THREAD_COUNT),
  };
  persistThreadStore();
  renderThreadList(container);
  replaceChat(container);
  showToast('已创建新的 Deep Chat 会话', { type: 'success' });
}

function switchThread(container: HTMLElement, threadId: string): void {
  if (threadId === threadStore.activeThreadId) {
    return;
  }

  if (!threadStore.threads.some((thread) => thread.id === threadId)) {
    return;
  }

  threadStore = {
    ...threadStore,
    activeThreadId: threadId,
  };
  persistThreadStore();
  renderThreadList(container);
  replaceChat(container);
}

function deleteThread(container: HTMLElement, threadId: string): void {
  const thread = threadStore.threads.find((item) => item.id === threadId);
  if (!thread) {
    return;
  }

  const confirmed = window.confirm('删除后仅移除本地 Deep Chat 历史，无法恢复。确定删除这个会话吗？');
  if (!confirmed) {
    return;
  }

  const remainingThreads = threadStore.threads.filter((item) => item.id !== threadId);
  const nextStore = remainingThreads.length > 0
    ? {
        activeThreadId: threadId === threadStore.activeThreadId
          ? remainingThreads[0]!.id
          : threadStore.activeThreadId,
        threads: remainingThreads,
      }
    : createDefaultThreadStore();

  const shouldReplaceChat = threadId === threadStore.activeThreadId;
  threadStore = nextStore;
  persistThreadStore();
  renderThreadList(container);
  if (shouldReplaceChat) {
    replaceChat(container);
  }
  showToast(`已删除会话：${thread.title}`, { type: 'success' });
}

function replaceChat(container: HTMLElement): void {
  const chat = getChat(container);
  if (!chat) {
    return;
  }

  if (typeof chat.clearMessages === 'function') {
    chat.clearMessages(true);
  }

  const nextChat = document.createElement('deep-chat') as DeepChatElement;
  nextChat.id = 'playground-chat';
  nextChat.className = 'playground-chat';
  chat.replaceWith(nextChat);
  initDeepChat(container);
}

function renderThreadList(container: HTMLElement): void {
  const list = container.querySelector<HTMLElement>('#playground-thread-list');
  if (!list) {
    return;
  }

  const sortedThreads = [...threadStore.threads].sort((a, b) => b.updatedAt - a.updatedAt);
  list.innerHTML = sortedThreads.map((thread) => {
    const isActive = thread.id === threadStore.activeThreadId;
    const messageCount = thread.messages.length;
    const meta = messageCount > 0
      ? `${messageCount} messages · ${formatThreadTime(thread.updatedAt)}`
      : `Empty · ${formatThreadTime(thread.updatedAt)}`;

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
  }).join('');
}

function saveThreadMessages(
  container: HTMLElement,
  conversationMessages: ChatMessage[],
  assistantText: string
): void {
  const activeThread = getActiveThread();
  const storedMessages = conversationMessages
    .filter((message) => message.role !== 'system')
    .map(toDeepChatMessage);

  if (assistantText) {
    storedMessages.push({ role: 'ai', text: assistantText });
  }

  const now = Date.now();
  const nextThread: PlaygroundThread = {
    ...activeThread,
    title: getThreadTitle(storedMessages),
    messages: storedMessages,
    updatedAt: now,
  };

  threadStore = {
    activeThreadId: nextThread.id,
    threads: [
      nextThread,
      ...threadStore.threads.filter((thread) => thread.id !== nextThread.id),
    ].slice(0, MAX_THREAD_COUNT),
  };
  persistThreadStore();
  renderThreadList(container);
}

async function loadThreadStore(): Promise<PlaygroundThreadStore> {
  const indexedKey = `user:${THREAD_STORAGE_KEY}`;
  const stored = await LocalDataStore.migrateLocalStorageKey<PlaygroundThreadStore>(
    THREAD_STORAGE_KEY,
    indexedKey,
    'user-data'
  ) || await LocalDataStore.get<PlaygroundThreadStore>(indexedKey, null);
  if (!isValidThreadStore(stored)) {
    return createDefaultThreadStore();
  }

  const threads = stored.threads
    .map(sanitizeThread)
    .filter((thread): thread is PlaygroundThread => thread !== null)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_THREAD_COUNT);

  if (threads.length === 0) {
    return createDefaultThreadStore();
  }

  const activeThreadId = threads.some((thread) => thread.id === stored.activeThreadId)
    ? stored.activeThreadId
    : threads[0]?.id || createThreadId();

  return { activeThreadId, threads };
}

function persistThreadStore(): void {
  void LocalDataStore.set(`user:${THREAD_STORAGE_KEY}`, threadStore, 'user-data').then((saved) => {
    if (!saved) {
      showToast('Deep Chat 会话保存失败：空间不足，请导出备份后清理缓存', { type: 'error' });
    }
  });
}

function createDefaultThreadStore(): PlaygroundThreadStore {
  const thread = createEmptyThread();
  return {
    activeThreadId: thread.id,
    threads: [thread],
  };
}

function createEmptyThread(): PlaygroundThread {
  const now = Date.now();
  return {
    id: createThreadId(),
    title: 'New Thread',
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

function getActiveThread(): PlaygroundThread {
  const activeThread = threadStore.threads.find(
    (thread) => thread.id === threadStore.activeThreadId
  );

  if (activeThread) {
    return activeThread;
  }

  const fallbackThread = threadStore.threads[0] || createEmptyThread();
  threadStore = {
    activeThreadId: fallbackThread.id,
    threads: threadStore.threads.length > 0 ? threadStore.threads : [fallbackThread],
  };
  persistThreadStore();
  return fallbackThread;
}

function sanitizeThread(thread: PlaygroundThread): PlaygroundThread | null {
  if (!thread || typeof thread.id !== 'string') {
    return null;
  }

  const messages = Array.isArray(thread.messages)
    ? thread.messages.filter(isValidDeepChatMessage)
    : [];
  const createdAt = Number.isFinite(thread.createdAt) ? thread.createdAt : Date.now();
  const updatedAt = Number.isFinite(thread.updatedAt) ? thread.updatedAt : createdAt;

  return {
    id: thread.id,
    title: typeof thread.title === 'string' && thread.title.trim()
      ? thread.title.trim()
      : getThreadTitle(messages),
    messages,
    createdAt,
    updatedAt,
  };
}

function isValidThreadStore(value: PlaygroundThreadStore | null): value is PlaygroundThreadStore {
  return Boolean(
    value &&
    typeof value.activeThreadId === 'string' &&
    Array.isArray(value.threads)
  );
}

function isValidDeepChatMessage(message: DeepChatMessage): boolean {
  return Boolean(message && typeof getMessageText(message) === 'string' && getMessageText(message));
}

function toDeepChatMessage(message: ChatMessage): DeepChatMessage {
  return {
    role: message.role === 'user' ? 'user' : 'ai',
    text: message.content,
  };
}

function getThreadTitle(messages: DeepChatMessage[]): string {
  const firstUserMessage = messages.find((message) => message.role === 'user');
  const title = getMessageText((firstUserMessage || messages[0] || {}) as DeepChatMessage)
    .replace(/\s+/g, ' ');
  return title ? truncateText(title, 42) : 'New Thread';
}

function formatThreadTime(timestamp: number): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return 'Just now';
  }

  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function createThreadId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `thread-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function escapeHTML(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function truncateText(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function setConversationActive(container: HTMLElement, isActive: boolean): void {
  container.querySelector('.playground-page')?.classList.toggle('is-chatting', isActive);
  const chat = getChat(container);
  chat?.classList.toggle('is-chatting', isActive);
  chat?.classList.toggle('is-empty', !isActive);
}

function updateTemperatureTrack(input: HTMLInputElement | null): void {
  if (!input) {
    return;
  }

  const percent = normalizeTemperature(input.value) * 100;
  input.style.setProperty('--playground-temperature-percent', `${percent}%`);
}

function normalizeChatMessages(body: DeepChatRequestBody | DeepChatMessage[]): ChatMessage[] {
  const rawMessages = Array.isArray(body) ? body : body.messages || [];

  if (rawMessages.length === 0 && !Array.isArray(body) && body.text) {
    return [{ role: 'user', content: body.text }];
  }

  return rawMessages
    .map((message): ChatMessage | null => {
      const content = getMessageText(message);
      if (!content) {
        return null;
      }

      return {
        role: toChatRole(message.role),
        content,
      };
    })
    .filter((message): message is ChatMessage => message !== null);
}

function withSessionSystemPrompt(messages: ChatMessage[]): ChatMessage[] {
  if (!sessionSystemPrompt) {
    return messages;
  }

  const withoutEmptySystem = messages.filter(
    (message) => message.role !== 'system' || message.content.trim()
  );

  if (withoutEmptySystem[0]?.role === 'system') {
    return [
      { role: 'system', content: sessionSystemPrompt },
      ...withoutEmptySystem.slice(1),
    ];
  }

  return [
    { role: 'system', content: sessionSystemPrompt },
    ...withoutEmptySystem,
  ];
}

function getMessageText(message: DeepChatMessage): string {
  const content = message.text || message.content || message.html || '';
  return typeof content === 'string' ? content.trim() : '';
}

function toChatRole(role: DeepChatRole | undefined): ChatMessage['role'] {
  if (role === 'system') {
    return 'system';
  }

  if (role === 'user') {
    return 'user';
  }

  return 'assistant';
}

function normalizeModels(config: LLMProviderConfig | null): string[] {
  if (!config?.models) {
    return [];
  }

  return config.models
    .map((model) => typeof model === 'string' ? model : model.id)
    .filter((model): model is string => Boolean(model));
}

function getFirstModel(config: LLMProviderConfig | null): string {
  return normalizeModels(config)[0] || '';
}

function normalizeTemperature(value: string | undefined): number {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 0.3;
  }

  return Math.min(1, Math.max(0, Number(numericValue.toFixed(1))));
}

function updateStatus(container: HTMLElement): void {
  const statusEl = container.querySelector<HTMLElement>('#playground-provider-status');
  if (statusEl && currentConfig && selectedModel) {
    statusEl.textContent = `${currentConfig.provider} / ${selectedModel}`;
  }
}

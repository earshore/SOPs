import 'deep-chat';
import './styles.css';

import { loadTemplate } from '@/common/utils/viewLoader';
import { safeMount } from '@/common/utils/safeMount';
import { SafeRenderer } from '@/common/infrastructure/SafeRenderer';
import { showToast } from '@/common/ui/notifications';
import { callLLM, type ChatMessage } from '@/services/llmService';
import { StorageService } from '@/services/storageService';
import type { LLMProviderConfig } from '@/types/state';
import { Logger } from '@/services/loggerService';

type DeepChatRole = 'user' | 'ai' | 'assistant' | 'system';

interface DeepChatMessage {
  role?: DeepChatRole;
  text?: string;
  html?: string;
  content?: string;
}

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
  avatars?: boolean;
  names?: boolean;
  displayLoadingBubble?: boolean;
  errorMessages?: Record<string, unknown>;
  submitUserMessage?: (content: { text: string }) => void;
  clearMessages?: (isReset?: boolean) => void;
  onRender?: () => void;
}

let cleanupCallbacks: Array<() => void> = [];
let currentConfig: LLMProviderConfig | null = null;
let selectedModel = '';
let sessionSystemPrompt = '';
let sessionTemperature = 0.3;

const mountInternal = async (container: HTMLElement): Promise<void> => {
  const html = await loadTemplate('src/modules/app_center/views/playground/template.html');
  const renderer = SafeRenderer.getInstance();

  container.classList.add('fade-in');
  renderer.renderTemplate(container, html);

  await customElements.whenDefined('deep-chat');
  initDeepChat(container);
  await refreshLLMConfig(container);
  bindControls(container);
};

export const mount = safeMount(mountInternal, { moduleName: 'Playground' });

export function unmount(): void {
  cleanupCallbacks.forEach((cleanup) => cleanup());
  cleanupCallbacks = [];
  currentConfig = null;
  selectedModel = '';
  sessionSystemPrompt = '';
  sessionTemperature = 0.3;
  Logger.debug('[Playground] 模块已卸载');
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

  chat.stream = true;
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
    backgroundColor: '#ffffff',
    borderTop: '0',
    padding: '0',
    alignItems: 'stretch',
  };
  chat.textInput = {
    placeholder: { text: 'Send a message... (@ to mention, / for commands)' },
    styles: {
      container: {
        width: '100%',
        margin: '0',
        borderRadius: '0',
        border: '0',
        backgroundColor: '#ffffff',
        boxShadow: 'none',
        minHeight: '78px',
      },
      text: {
        color: '#111111',
        fontSize: '14px',
        padding: '18px',
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
        bubble: {
          borderRadius: '18px',
          fontSize: '14px',
          lineHeight: '1.65',
        },
      },
      user: {
        bubble: {
          backgroundColor: '#111111',
          color: '#ffffff',
        },
      },
      ai: {
        bubble: {
          backgroundColor: '#f7f7f7',
          color: '#111111',
          border: '1px solid #eeeeee',
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
}

function bindControls(container: HTMLElement): void {
  const modelSelect = container.querySelector<HTMLSelectElement>('#playground-model-select');
  const refreshButton = container.querySelector<HTMLButtonElement>('#playground-refresh-config');
  const clearButton = container.querySelector<HTMLButtonElement>('#playground-clear-chat');
  const systemPromptInput = container.querySelector<HTMLTextAreaElement>('#playground-system-prompt');
  const temperatureInput = container.querySelector<HTMLInputElement>('#playground-temperature');
  const temperatureValue = container.querySelector<HTMLOutputElement>('#playground-temperature-value');
  const resetTuningButton = container.querySelector<HTMLButtonElement>('#playground-reset-tuning');
  const promptButtons = Array.from(
    container.querySelectorAll<HTMLButtonElement>('[data-playground-prompt]')
  );

  const onModelChange = (): void => {
    selectedModel = modelSelect?.value || selectedModel;
    updateStatus(container);
  };
  modelSelect?.addEventListener('change', onModelChange);
  cleanupCallbacks.push(() => modelSelect?.removeEventListener('change', onModelChange));

  const onRefresh = async (): Promise<void> => {
    await refreshLLMConfig(container);
    showToast('Playground 模型配置已刷新', { type: 'success' });
  };
  refreshButton?.addEventListener('click', onRefresh);
  cleanupCallbacks.push(() => refreshButton?.removeEventListener('click', onRefresh));

  const onClear = (): void => {
    resetThread(container);
  };
  clearButton?.addEventListener('click', onClear);
  cleanupCallbacks.push(() => clearButton?.removeEventListener('click', onClear));

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
    showToast('Playground 调试参数已重置', { type: 'success' });
  };
  resetTuningButton?.addEventListener('click', onResetTuning);
  cleanupCallbacks.push(() => resetTuningButton?.removeEventListener('click', onResetTuning));

  promptButtons.forEach((button) => {
    const onPromptClick = (): void => {
      const prompt = button.dataset.playgroundPrompt;
      if (prompt) {
        submitPrompt(container, prompt);
      }
    };
    button.addEventListener('click', onPromptClick);
    cleanupCallbacks.push(() => button.removeEventListener('click', onPromptClick));
  });
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

    const messages = withSessionSystemPrompt(normalizeChatMessages(body));
    if (messages.length === 0) {
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
  } catch (error) {
    if (requestController?.signal.aborted) {
      Logger.debug('[Playground] LLM 调用已取消');
      return;
    }
    const message = error instanceof Error ? error.message : '模型调用失败';
    Logger.error('[Playground] LLM 调用失败:', error);
    await signals.onResponse?.({ error: message });
  } finally {
    signals.onClose?.();
  }
}

function getChat(container: HTMLElement): DeepChatElement | null {
  return container.querySelector<DeepChatElement>('#playground-chat');
}

function resetThread(container: HTMLElement): void {
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
  setConversationActive(container, false);
}

function submitPrompt(container: HTMLElement, prompt: string): void {
  const chat = getChat(container);
  if (!chat) {
    return;
  }

  setConversationActive(container, true);

  if (typeof chat.submitUserMessage === 'function') {
    chat.submitUserMessage({ text: prompt });
    return;
  }

  const textInput = chat.shadowRoot?.querySelector<HTMLElement>('#text-input');
  if (!textInput) {
    return;
  }

  textInput.focus();
  textInput.textContent = prompt;
  textInput.dispatchEvent(
    new InputEvent('input', { bubbles: true, inputType: 'insertText', data: prompt })
  );
  textInput.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true })
  );
}

function setConversationActive(container: HTMLElement, isActive: boolean): void {
  container.querySelector('.playground-page')?.classList.toggle('is-chatting', isActive);
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

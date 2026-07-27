import { DEEP_CHAT_AUXILIARY_STYLE } from './deepChatStyles';
import type {
  DeepChatElement,
  DeepChatRequestBody,
  DeepChatSignals,
  DeepChatThread,
} from '../types';
import type { DeepChatMessage } from '../session/conversationContext';
import { findConfigModelsEntry } from '../session/uiHooks';
import { sessionState } from '../session/sessionState';
import { normalizeApiPathId, resolveModelCapability } from '@/services/modelCapability';
import { StorageService } from '@/services/storageService';
import {
  DEEP_CHAT_VISION_COPY,
  resolveDeepChatImagesConfig,
} from '../request/visionAttachments';

type DraftUpdater = (threadId: string, draftText: string) => void;
type RequestHandler = (
  container: HTMLElement,
  body: DeepChatRequestBody | DeepChatMessage[],
  signals: DeepChatSignals
) => void;

export function configureDeepChatBase(
  chat: DeepChatElement,
  activeThread: DeepChatThread,
  updateThreadDraft: DraftUpdater,
  getThreadDisplayMessages: (thread: DeepChatThread) => DeepChatMessage[]
): void {
  chat.history = getThreadDisplayMessages(activeThread);
  chat.defaultInput = activeThread.draftText ? { text: activeThread.draftText } : undefined;
  chat.onInput = body => {
    updateThreadDraft(activeThread.id, body.content.text || '');
  };
  chat.stream = true;
  chat.auxiliaryStyle = DEEP_CHAT_AUXILIARY_STYLE;
  chat.avatars = false;
  chat.names = false;
  chat.displayLoadingBubble = true;
  chat.errorMessages = {
    displayServiceErrorMessages: true,
  };
  // 其余多媒体入口始终关闭；图片按模型 vision 能力单独门控。
  chat.gifs = false;
  chat.camera = false;
  chat.audio = false;
  chat.mixedFiles = false;
  chat.microphone = false;
  applyDeepChatVisionUploadConfig(chat);
}

/** 按当前模型 supportsVision 开关图片上传入口（fail-closed）。 */
export function applyDeepChatVisionUploadConfig(chat: DeepChatElement | null | undefined): void {
  if (!chat) return;
  const supportsVision = resolveCurrentModelSupportsVision();
  chat.images = resolveDeepChatImagesConfig(supportsVision);
  chat.classList.toggle('is-vision-enabled', supportsVision);
  syncDeepChatVisionHelper(chat, supportsVision);
  // Best-effort: deep-chat may recreate the button later; re-apply when config re-runs.
  const upload = chat.shadowRoot?.querySelector<HTMLElement>('#upload-images-button');
  if (upload && supportsVision) {
    upload.setAttribute('aria-label', DEEP_CHAT_VISION_COPY.uploadAria);
    upload.setAttribute('title', DEEP_CHAT_VISION_COPY.uploadTooltip);
  }
}

/**
 * Host chrome: microcopy outside #text-input-container (inside #input), vision only.
 * Exact Chinese string from DEEP_CHAT_VISION_COPY.helper.
 */
export function syncDeepChatVisionHelper(
  chat: DeepChatElement | null | undefined,
  supportsVision: boolean
): void {
  if (!chat?.shadowRoot) return;
  const input = chat.shadowRoot.querySelector('#input');
  if (!input) return;
  let helper = chat.shadowRoot.querySelector<HTMLElement>('.deep-chat-vision-helper');
  if (!supportsVision) {
    helper?.remove();
    return;
  }
  if (!helper) {
    helper = document.createElement('div');
    helper.className = 'deep-chat-vision-helper';
    helper.setAttribute('aria-hidden', 'true');
    helper.textContent = DEEP_CHAT_VISION_COPY.helper;
    // place after #text-input-container inside #input
    const card = input.querySelector('#text-input-container');
    if (card?.nextSibling) {
      input.insertBefore(helper, card.nextSibling);
    } else {
      input.appendChild(helper);
    }
  } else {
    helper.textContent = DEEP_CHAT_VISION_COPY.helper;
  }
}

function resolveCurrentModelSupportsVision(): boolean {
  const config = sessionState.currentConfig;
  const model = sessionState.selectedModel || config?.model || '';
  if (!config || !model) return false;
  const apiPath = normalizeApiPathId(
    (config as { apiPath?: unknown }).apiPath ??
      StorageService.getLLMConfig(config.provider)?.apiPath
  );
  const cap = resolveModelCapability({
    provider: config.provider,
    modelId: model,
    modelsEntry: findConfigModelsEntry(config, model),
    preferredSurface: apiPath,
  });
  return Boolean(cap.supportsVision);
}

export function configureDeepChatStyles(chat: DeepChatElement): void {
  configureDeepChatLayoutStyles(chat);
  configureDeepChatTextInputStyles(chat);
  configureDeepChatSubmitButtonStyles(chat);
  configureDeepChatMessageStyles(chat);
}

export function configureDeepChatConnection(
  chat: DeepChatElement,
  container: HTMLElement,
  handleRequest: RequestHandler
): void {
  chat.connect = {
    stream: true,
    handler: (body, signals) => {
      void handleRequest(container, body, signals);
    },
  };
}

function configureDeepChatLayoutStyles(chat: DeepChatElement): void {
  chat.chatStyle = {
    width: '100%',
    height: '100%',
    overflow: 'visible',
    border: '0',
    borderRadius: '0',
    backgroundColor: 'transparent',
  };
  chat.inputAreaStyle = {
    backgroundColor: 'transparent',
    borderTop: '0',
    padding: '0',
    alignItems: 'flex-end',
  };
}

function configureDeepChatTextInputStyles(chat: DeepChatElement): void {
  chat.textInput = {
    placeholder: {
      text: '有问题，尽管问',
      style: { color: 'var(--deep-chat-input-placeholder, #9a9a9a)' },
    },
    styles: {
      container: {
        width: '100%',
        margin: '0',
        borderRadius: '29px',
        border: '1px solid var(--deep-chat-field-border, #cbd5e1)',
        backgroundColor: 'var(--deep-chat-surface, #ffffff)',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
        minHeight: '58px',
        maxHeight: 'min(42vh, 420px)',
      },
      text: {
        color: 'var(--deep-chat-ink, #0f172a)',
        fontSize: '15px',
        lineHeight: '1.45',
        padding: '18px 108px 16px 22px',
        maxHeight: 'min(calc(42vh - 20px), 400px)',
        overflowY: 'auto',
      },
    },
  };
}

function configureDeepChatSubmitButtonStyles(chat: DeepChatElement): void {
  // 与 auxiliaryStyle 中 36px 圆钮一致，避免 deep-chat 内联 34px 与 CSS 打架闪一下
  const buttonSize = '36px';
  chat.submitButtonStyles = {
    position: 'inside-end',
    submit: {
      container: {
        borderRadius: '999px',
        backgroundColor: 'var(--deep-chat-accent, #a85f3f)',
        width: buttonSize,
        height: buttonSize,
      },
    },
    loading: {
      container: {
        borderRadius: '999px',
        backgroundColor: '#dc2626',
        width: buttonSize,
        height: buttonSize,
        cursor: 'pointer',
      },
    },
    stop: {
      container: {
        borderRadius: '999px',
        backgroundColor: '#dc2626',
        width: buttonSize,
        height: buttonSize,
        cursor: 'pointer',
      },
    },
    disabled: {
      container: {
        borderRadius: '999px',
        backgroundColor: 'var(--deep-chat-ink-faint, #94a3b8)',
        width: buttonSize,
        height: buttonSize,
      },
    },
  };
}

function configureDeepChatMessageStyles(chat: DeepChatElement): void {
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
          backgroundColor: 'var(--deep-chat-accent-soft, #faf3ee)',
          color: 'var(--deep-chat-ink, #0f172a)',
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
          color: 'var(--deep-chat-ink-strong, #1e293b)',
          border: '0',
          borderRadius: '0',
          padding: '0',
        },
      },
    },
  };
}

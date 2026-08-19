import { normalizeApiPathId, resolveModelCapability } from '@/services/modelCapability';
import { isDeepChatVisionFeatureEnabled } from '@/services/runtimeStrategyService';
import { StorageService } from '@/services/storageService';

import { DEEP_CHAT_AUXILIARY_STYLE } from './deepChatStyles';
import {
  hasStagedVisionAttachments,
  mountVisionComposer,
  syncVisionComposerCapability,
  unmountVisionComposer,
} from '../composer/visionComposer';
import { resolveDeepChatImagesConfig } from '../request/visionAttachments';
import { sessionState } from '../session/sessionState';
import { findConfigModelsEntry } from '../session/uiHooks';

import type { DeepChatMessage } from '../session/conversationContext';
import type {
  DeepChatElement,
  DeepChatRequestBody,
  DeepChatSignals,
  DeepChatThread,
} from '../types';



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
  // 库多媒体入口全部关闭；图片由 host visionComposer 接管。
  chat.gifs = false;
  chat.camera = false;
  chat.audio = false;
  chat.mixedFiles = false;
  chat.microphone = false;
  chat.images = false;
  applyDeepChatVisionUploadConfig(chat);
}

/**
 * Host vision composer：
 * - 产品开关 `deepChat.enableVision`（默认关）控制入口是否挂载；
 * - 开启后由模型 supportsVision 控制可点/灰态；
 * - 原生 deep-chat images 按钮始终关闭。
 */
export function applyDeepChatVisionUploadConfig(chat: DeepChatElement | null | undefined): void {
  if (!chat) return;
  // Force-off vendor upload UI (Approach B host surface).
  // 仅首次赋值：vendor 属性 setter 对「值未变的重复赋值」也会响应，并异步重建整个
  // chat-view（消息区随旧元素销毁且不重放 history）——反复切换模型不能每次都赋值。
  const withImagesFlag = chat as DeepChatElement & { __deepChatImagesForcedOff?: boolean };
  if (!withImagesFlag.__deepChatImagesForcedOff) {
    chat.images = resolveDeepChatImagesConfig(false);
    withImagesFlag.__deepChatImagesForcedOff = true;
  }

  const featureOn = isDeepChatVisionFeatureEnabled();
  if (!featureOn) {
    chat.classList.remove('is-vision-enabled');
    // Keep pipeline code; hide entry and drop any staged files while feature is off.
    unmountVisionComposer({ keepStaged: false });
    return;
  }

  const supportsVision = resolveCurrentModelSupportsVision();
  chat.classList.toggle('is-vision-enabled', supportsVision);
  const pending = sessionState.pendingRequests.has(sessionState.threadStore.activeThreadId);
  mountVisionComposer(chat, { supportsVision, pending });
  syncVisionComposerCapability({ supportsVision, pending });
}

/** Host staged attachments (memory only). */
export function deepChatHasStagedImageAttachments(
  _chat?: DeepChatElement | null | undefined
): boolean {
  return hasStagedVisionAttachments();
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

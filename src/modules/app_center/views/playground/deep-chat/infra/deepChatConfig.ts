import { DEEP_CHAT_AUXILIARY_STYLE } from './deepChatStyles';
import type {
  DeepChatElement,
  DeepChatRequestBody,
  DeepChatSignals,
  DeepChatThread,
} from '../types';
import type { DeepChatMessage } from '../session/conversationContext';

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
      style: { color: '#9a9a9a' },
    },
    styles: {
      container: {
        width: '100%',
        margin: '0',
        borderRadius: '29px',
        border: '1px solid #cbd5e1',
        backgroundColor: '#ffffff',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
        minHeight: '58px',
        maxHeight: 'min(42vh, 420px)',
      },
      text: {
        color: '#0f172a',
        fontSize: '15px',
        lineHeight: '1.45',
        padding: '18px 62px 16px 22px',
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
        backgroundColor: '#94a3b8',
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
          color: '#0f172a',
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
          color: '#1e293b',
          border: '0',
          borderRadius: '0',
          padding: '0',
        },
      },
    },
  };
}

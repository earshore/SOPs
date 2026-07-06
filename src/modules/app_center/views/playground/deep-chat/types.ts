import type { ChatMessage } from '@/services/llmService';
import type { LLMProviderConfig } from '@/types/state';
import type { DeepChatMessage, DeepChatMessageStatus, DeepChatRole } from './conversationContext';
import type { PendingPlaygroundRequest } from './requestLifecycle';

export interface DeepChatRequestBody {
  messages?: DeepChatMessage[];
  text?: string;
}

export interface DeepChatSignals {
  onOpen?: () => void;
  onResponse?: (response: { text?: string; error?: string }) => void | Promise<void>;
  onClose?: () => void;
  stopClicked?: {
    listener: () => void;
  };
}

export interface DeepChatElement extends HTMLElement {
  history?: DeepChatMessage[];
  defaultInput?: { text?: string; files?: File[] | FileList };
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
  addMessage?: (
    message: DeepChatMessage & { error?: string; overwrite?: boolean },
    isUpdate?: boolean
  ) => void;
  updateMessage?: (message: Pick<DeepChatMessage, 'text' | 'html'>, index: number) => void;
  clearMessages?: (isReset?: boolean) => void;
  getMessages?: () => DeepChatMessage[];
  onRender?: () => void;
  onInput?: (body: { content: { text?: string; files?: File[] }; isUser: boolean }) => void;
}

export interface PlaygroundThread {
  id: string;
  title: string;
  messages: DeepChatMessage[];
  draftText?: string;
  promptDraftId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface PlaygroundThreadStore {
  activeThreadId: string;
  threads: PlaygroundThread[];
}

export interface PlaygroundRequestModelConfig {
  config: LLMProviderConfig | null;
  model: string;
}

export interface PlaygroundRequestMessages {
  requestMessages: ChatMessage[];
  conversationMessages: ChatMessage[];
  messages: ChatMessage[];
  droppedMessageCount: number;
}

export interface PreparedPlaygroundRequest {
  config: LLMProviderConfig;
  model: string;
  activeThread: PlaygroundThread;
  conversationMessages: ChatMessage[];
  messages: ChatMessage[];
  droppedMessageCount: number;
}

export interface PlaygroundLLMCallContext {
  messages: ChatMessage[];
  config: LLMProviderConfig;
  model: string;
  signals: DeepChatSignals;
  sourceChat: DeepChatElement | null;
  controller: AbortController;
  pendingRequest: PendingPlaygroundRequest;
}

export interface TuningControlRefs {
  systemPromptInput: HTMLTextAreaElement | null;
  temperatureInput: HTMLInputElement | null;
  temperatureValue: HTMLOutputElement | null;
  resetTuningButton: HTMLButtonElement | null;
  tuningPanel: HTMLDetailsElement | null;
}

export interface PromptPreviewPointer {
  clientX: number;
  clientY: number;
}

export interface PromptPreviewLeftOptions {
  pointer: PromptPreviewPointer | undefined;
  anchorRect: DOMRect | undefined;
  promptRailRect: DOMRect | undefined;
  previewWidth: number;
  gap: number;
  viewportPadding: number;
}

export interface CreateThreadOptions {
  toastMessage?: string | null;
  promptDraftId?: string;
}

export interface SaveThreadMessagesOptions {
  threadId?: string;
  assistantCreatedAt?: number;
  assistantStatus?: DeepChatMessageStatus;
}

export type { DeepChatMessage, DeepChatMessageStatus, DeepChatRole };

import type { ChatMessage } from '@/services/llmService';
import type { LLMProviderConfig } from '@/types/state';
import type { DeepChatMessage, DeepChatMessageStatus, DeepChatRole } from './conversationContext';
import type { PendingDeepChatRequest } from './requestLifecycle';
import type { ListingPromptWorkflowContext } from '@/modules/app_center/listingWorkflowHandoff';
import type { SkillDeepChatContext } from '@/modules/app_center/skillDeepChatHandoff';

/** 会话上下文 Chip：持久化 skill 引用（系统提示词来源） */
export type DeepChatSkillContext = Pick<
  SkillDeepChatContext,
  'skillId' | 'skillTitle' | 'skillRaw'
>;

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

export interface DeepChatThread {
  id: string;
  title: string;
  messages: DeepChatMessage[];
  draftText?: string;
  promptDraftId?: string;
  listingPromptContext?: ListingPromptWorkflowContext;
  /**
   * 当前挂载的技能（系统提示词来源）。
   * 产品规则为单次执行：用户发送后即消费清空；历史消息标记仍可展示 Chip。
   */
  skillContexts?: DeepChatSkillContext[];
  /** 会话级系统提示词（技能挂载期间为技能全文；发送消费后清空技能派生提示） */
  systemPrompt?: string;
  /** 会话级 temperature，默认 0.3 */
  temperature?: number;
  /**
   * 会话级推理偏好覆盖（缺省字段继承系统设置全局默认）。
   * 仅当模型 capability 支持且有 mapRequest 时生效。
   */
  reasoning?: {
    enabled?: boolean;
    effort?: 'low' | 'medium' | 'high';
  };
  customTitle?: string;
  pinnedAt?: number;
  /** 后台完成回复后的未读标记（切回会话时清除） */
  hasUnread?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface DeepChatThreadStore {
  activeThreadId: string;
  threads: DeepChatThread[];
}

export interface DeepChatRequestModelConfig {
  config: LLMProviderConfig | null;
  model: string;
}

export interface DeepChatRequestMessages {
  requestMessages: ChatMessage[];
  conversationMessages: ChatMessage[];
  messages: ChatMessage[];
  droppedMessageCount: number;
}

export interface PreparedDeepChatRequest {
  config: LLMProviderConfig;
  model: string;
  activeThread: DeepChatThread;
  conversationMessages: ChatMessage[];
  messages: ChatMessage[];
  droppedMessageCount: number;
}

export interface DeepChatLLMCallContext {
  messages: ChatMessage[];
  config: LLMProviderConfig;
  model: string;
  signals: DeepChatSignals;
  sourceChat: DeepChatElement | null;
  controller: AbortController;
  pendingRequest: PendingDeepChatRequest;
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
  listingPromptContext?: ListingPromptWorkflowContext;
  skillContexts?: DeepChatSkillContext[];
  draftText?: string;
}

export interface SaveThreadMessagesOptions {
  threadId?: string;
  assistantCreatedAt?: number;
  assistantStatus?: DeepChatMessageStatus;
  /** Display-only reasoning channel for the assistant message */
  assistantReasoning?: string;
  /** Whole seconds for settled 「已完成 Xs」 */
  assistantReasoningDurationSec?: number;
  /** partial 落盘时跳过列表重绘，避免流式过程中 UI 抖动 */
  skipUiRefresh?: boolean;
}

export type { DeepChatMessage, DeepChatMessageStatus, DeepChatRole };

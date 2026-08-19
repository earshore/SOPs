/**
 * Late-bound UI / cross-domain hooks.
 * Lower layers call through this bag so static imports do not form cycles.
 * Higher layers register real implementations at module load (side-effect).
 */
import { isReasoningEffortLevel, type ReasoningEffortLevel } from '@/services/modelCapability';

import type { PendingDeepChatRequest, DeepChatPendingAbortReason } from '../request/lifecycle';
import type {
  DeepChatElement,
  DeepChatMessage,
  DeepChatSignals,
  DeepChatSkillContext,
  DeepChatThread,
  DeepChatThreadStore,
  ThreadEditingState,
  ThreadMenuState,
} from '../types';

export type DeepChatReasoningSessionOverride = {
  enabled: boolean;
  effort?: ReasoningEffortLevel;
};

type StreamHandler = (update: { delta: string; reasoningDelta?: string }) => void;

/** Registration-friendly loose function slot (concrete impls assigned via Object.assign). */
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- cycle-break registry slots
type HookFn = Function;

/**
 * Default no-ops keep import-time safe; register* functions overwrite with real impls.
 */
export const uiHooks = {
  getChat: (_container: HTMLElement): DeepChatElement | null => null,
  replaceChat: (_container: HTMLElement): void => undefined,
  refreshChatSearchResultsIfOpen: (_container: HTMLElement): void => undefined,
  syncPendingStatus: (_container: HTMLElement): void => undefined,
  syncSubmitStopButtonState: (_container: HTMLElement): void => undefined,
  resolveDeepChatReasoningSessionOverride: (
    _container: HTMLElement | null
  ): DeepChatReasoningSessionOverride | undefined => undefined,
  emitDeepChatResponse: async (
    _signals: DeepChatSignals,
    _response: { text?: string; error?: string }
  ): Promise<boolean | void> => undefined,
  isCurrentResponseTarget: (_threadId: string, _sourceChat: DeepChatElement | null): boolean =>
    true,
  consumeMountedSkillsAfterSend: (_container: HTMLElement, _threadId: string): void => undefined,
  setConversationActive: (_container: HTMLElement, _isActive: boolean): void => undefined,
  createChevronIcon: (_doc: Document): HTMLElement => document.createElement('span'),
  setToggleExpanded: (_el: HTMLElement, _expanded: boolean): void => undefined,
  ensureStreamingDeepThinkingBlock: (() => undefined) as HookFn,
  applySkillContextsToSession: (_container: HTMLElement): void => undefined,
  applyThreadTuningToSession: (_container: HTMLElement | null): void => undefined,
  /** 线程模型恢复到模型选择框（含 fallback 回落与 toast），由 shell 注册。 */
  syncThreadModelToSession: (_container: HTMLElement | null): void => undefined,
  cloneSkillContexts: (contexts: DeepChatSkillContext[]): DeepChatSkillContext[] =>
    contexts.map(c => ({ ...c })),
  remountDeepThinkingChromeAfterChatReplace: (() => undefined) as HookFn,
  fillPromptDraftInput: (() => undefined) as HookFn,
  hydrateActiveThreadInlineSkillChips: (() => undefined) as HookFn,
  saveActiveThreadDraft: (() => undefined) as HookFn,
  syncSessionSkillChipDock: (() => undefined) as HookFn,
  saveActiveThreadTuning: (() => undefined) as HookFn,
  isAssistantMessageRole: (role?: string): boolean => role === 'ai' || role === 'assistant',
  scheduleDeepThinkingChromeRetry: (() => undefined) as HookFn,
  syncAllDeepThinkingChrome: (() => undefined) as HookFn,
  paintOrResumeStreamingReasoning: (() => undefined) as HookFn,
  resumeStreamingReasoningTypewriter: (() => undefined) as HookFn,
  stopReasoningTypewriter: (() => undefined) as HookFn,
  findSkillLoadBanner: (_container: HTMLElement): HTMLElement | null => null,
  placeSkillComposerChrome: (() => undefined) as HookFn,
  placeSkillLoadBannerAboveComposer: (() => undefined) as HookFn,
  scheduleSkillComposerDraftFill: (() => undefined) as HookFn,
  schedulePendingAssistantDisplay: (_threadId: string): void => undefined,
  getThreadDisplayMessages: (thread: DeepChatThread): DeepChatMessage[] => thread.messages,
  abortPendingRequest: (_threadId: string, _reason: DeepChatPendingAbortReason): boolean => false,
  createDeepChatStreamHandler: null as
    | null
    | ((
        pendingRequest: PendingDeepChatRequest,
        signals: DeepChatSignals,
        sourceChat: DeepChatElement | null,
        state: { streamedText: string }
      ) => StreamHandler),
  /** Shell registers real list renderers so session never static-imports shell. */
  renderThreadList: (
    _container: HTMLElement,
    _threadStore: DeepChatThreadStore,
    _pendingRequests: Map<string, PendingDeepChatRequest>,
    _threadMenuState: ThreadMenuState | null,
    _editingState: ThreadEditingState | null
  ): void => undefined,
  renderPromptDraftList: (_container: HTMLElement, _selectedPromptDraftId?: string): void =>
    undefined,
  /** Composer registers toolbar refresh so session/request avoid composer static edge. */
  refreshMessageToolbarStatuses: (
    _chat: DeepChatElement | null,
    _getStoredMessages?: () => DeepChatMessage[]
  ): void => undefined,
};

export function registerShellUiHooks(hooks: Partial<typeof uiHooks>): void {
  Object.assign(uiHooks, hooks);
}

export function registerChromeUiHooks(hooks: Partial<typeof uiHooks>): void {
  Object.assign(uiHooks, hooks);
}

export function registerComposerUiHooks(hooks: Partial<typeof uiHooks>): void {
  Object.assign(uiHooks, hooks);
}

export function registerRequestUiHooks(hooks: Partial<typeof uiHooks>): void {
  Object.assign(uiHooks, hooks);
}

export function registerHandoffUiHooks(hooks: Partial<typeof uiHooks>): void {
  Object.assign(uiHooks, hooks);
}

/** Strip data-URL / long base64 blobs so logs never hold vision payloads. */
function redactString(value: string): string {
  if (/data:image\//i.test(value)) {
    return '[REDACTED_IMAGE_DATA]';
  }
  // long base64-ish blobs without data: prefix
  if (value.length > 512 && /^[A-Za-z0-9+/=\s]+$/.test(value.slice(0, 80))) {
    return '[REDACTED_BASE64]';
  }
  return value.replace(
    /data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+/gi,
    '[REDACTED_IMAGE_DATA]'
  );
}

/** Pure: no domain imports — safe for any layer. */
export function redactSensitiveError(error: unknown): unknown {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: redactString(error.message),
      stack: error.stack ? redactString(error.stack) : error.stack,
    };
  }
  if (typeof error === 'string') {
    return redactString(error);
  }
  if (!error || typeof error !== 'object') {
    return error;
  }
  try {
    return JSON.parse(
      JSON.stringify(error, (key, value) => {
        if (/api[_-]?key|authorization|password|secret|token|bearer/i.test(key)) {
          return '[REDACTED]';
        }
        if (typeof value === 'string') {
          return redactString(value);
        }
        return value;
      })
    );
  } catch {
    return redactString(String(error));
  }
}

/** Pure model list helper — no domain imports. */
export function findConfigModelsEntry(
  config: { models?: Array<{ id?: string } | string> | null },
  model: string
): { id: string } | string | undefined {
  const models = config.models;
  if (!models || !Array.isArray(models)) return undefined;
  const found = models.find(entry => {
    const id = typeof entry === 'string' ? entry : entry?.id;
    return id === model;
  });
  if (found === undefined) return undefined;
  if (typeof found === 'string') return found;
  return found?.id ? { id: found.id } : undefined;
}

export function parseReasoningEffortValue(value: string | undefined): ReasoningEffortLevel {
  return isReasoningEffortLevel(value) ? value : 'medium';
}

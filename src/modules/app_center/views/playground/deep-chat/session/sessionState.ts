/**
 * Shared mutable Deep Chat session state (object bag — assignable across modules).
 */
import { createDraftPersistController } from '../composer/draftPersistence';
import { DRAFT_PERSIST_DEBOUNCE_MS } from '../constants';
import { createThreadId } from '../infra/utils';

import type { PendingDeepChatRequest } from '../request/lifecycle';
import type { DeepChatElement, DeepChatThreadStore, ThreadMenuState } from '../types';
import type { LLMProviderConfig } from '@/types/state';

export const PENDING_GENERATING_PREFIX = '正在生成回复...';
export const WAITING_STATUS_LABELS = ['思考中...', '等待模型响应...', '正在连接模型...'] as const;
export const WAITING_STATUS_ROTATE_MS = 1600;
export const GENERATION_CHROME_CLASS = 'deep-chat-generation-chrome';
export const INLINE_PENDING_STATUS_ID = 'deep-chat-inline-pending-status';
export const PENDING_GENERATION_HOST_CLASS = 'is-pending-generation';
export const STREAMING_DT_KEY = 'pending';
export const PENDING_CHROME_MAX_RETRIES = 16;
export const REASONING_TYPEWRITER_INTERVAL_MS = 28;
export const REASONING_TYPEWRITER_CHARS = 3;
export const PENDING_DISPLAY_INTERVAL_MS = 32;
export const PENDING_DISPLAY_CHARS_PER_TICK = 6;
export const PENDING_PARTIAL_PERSIST_MIN_CHARS = 120;
export const PENDING_PARTIAL_PERSIST_MIN_MS = 2000;
export const THREAD_MENU_HEIGHT = 132;
export const THREAD_MENU_GAP = 6;
export const CHAT_SEARCH_FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
export const DEEP_CHAT_SYSTEM_FONT_STACK =
  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
export const SESSION_SKILL_CHIP_DOCK_ID = 'deep-chat-session-skill-chip-dock';
export type SkillChromeElementId = 'deep-chat-skill-load-banner';

export const nativeLoggerConsole = globalThis.console;

function createBootstrapThreadStore(): DeepChatThreadStore {
  const now = Date.now();
  const id = createThreadId();
  return {
    activeThreadId: id,
    threads: [
      {
        id,
        title: 'New Thread',
        messages: [],
        draftText: '',
        createdAt: now,
        updatedAt: now,
      },
    ],
  };
}

export const sessionState = {
  cleanupCallbacks: [] as Array<() => void>,
  currentConfig: null as LLMProviderConfig | null,
  selectedModel: '',
  sessionSystemPrompt: '',
  sessionTemperature: 0.3,
  threadStore: createBootstrapThreadStore() as DeepChatThreadStore,
  mountedContainer: null as HTMLElement | null,
  pendingRequests: new Map<string, PendingDeepChatRequest>(),
  /** Sync submit claim before any await in handleDeepChatRequest (double-send guard). */
  submittingThreadIds: new Set<string>(),
  pendingDisplayTimers: new Map<string, number>(),
  pendingChromeObserver: null as MutationObserver | null,
  pendingChromeObservedChat: null as DeepChatElement | null,
  pendingChromeRetryRaf: null as number | null,
  pendingChromeRetryTimeouts: [] as number[],
  reasoningTypewriterTimer: null as number | null,
  reasoningTypewriterTextEl: null as HTMLElement | null,
  /** Scopes the global typewriter timer to one pending request key. */
  reasoningTypewriterKey: null as string | null,
  waitingStatusRotateTimer: null as number | null,
  settledDeepThinkingUi: new Map<
    string,
    {
      doneOpen: boolean;
      /** @deprecated use activityOpen; kept for 深度思考 single-row compat */
      deepOpen: boolean;
      displayedLength: number;
      /** Which pre-reply activity rows are expanded under 已完成 */
      activityOpen: Record<string, boolean>;
    }
  >(),
  draftInputResizeObserver: null as ResizeObserver | null,
  draftInputResizeRetryTimer: null as number | null,
  draftHeightSyncRaf: null as number | null,
  cleanupDraftInputHeightListener: null as (() => void) | null,
  cleanupInlineSkillChipControls: null as (() => void) | null,
  cleanupSubmitStopButtonListener: null as (() => void) | null,
  submitStopButtonSyncRetryTimer: null as number | null,
  submitButtonStateObserver: null as MutationObserver | null,
  submitButtonPinObserver: null as MutationObserver | null,
  skillChromeElements: new WeakMap<HTMLElement, Map<SkillChromeElementId, HTMLElement>>(),
  skillComposerChromeObserver: null as MutationObserver | null,
  openThreadMenu: null as ThreadMenuState | null,
  editingThreadId: null as string | null,
  editingThreadValue: '',
  persistThreadStoreImpl: null as (() => void) | null,
};

export const draftPersistController = createDraftPersistController(() => {
  sessionState.persistThreadStoreImpl?.();
}, DRAFT_PERSIST_DEBOUNCE_MS);

export function bindPersistThreadStore(fn: () => void): void {
  sessionState.persistThreadStoreImpl = fn;
}

export const pendingRequests = sessionState.pendingRequests;
export const pendingDisplayTimers = sessionState.pendingDisplayTimers;
export const settledDeepThinkingUi = sessionState.settledDeepThinkingUi;
export const skillChromeElements = sessionState.skillChromeElements;

export function setCleanupCallbacks(next: Array<() => void>): void {
  sessionState.cleanupCallbacks = next;
}
export function setCurrentConfig(next: LLMProviderConfig | null): void {
  sessionState.currentConfig = next;
}
export function setSelectedModel(next: string): void {
  sessionState.selectedModel = next;
}
export function setSessionSystemPrompt(next: string): void {
  sessionState.sessionSystemPrompt = next;
}
export function setSessionTemperature(next: number): void {
  sessionState.sessionTemperature = next;
}
export function setThreadStore(next: DeepChatThreadStore): void {
  sessionState.threadStore = next;
}
export function setMountedContainer(next: HTMLElement | null): void {
  sessionState.mountedContainer = next;
}
export function setOpenThreadMenu(next: ThreadMenuState | null): void {
  sessionState.openThreadMenu = next;
}
export function setEditingThreadId(next: string | null): void {
  sessionState.editingThreadId = next;
}
export function setEditingThreadValue(next: string): void {
  sessionState.editingThreadValue = next;
}

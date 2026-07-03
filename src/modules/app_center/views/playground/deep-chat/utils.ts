import type { ChatMessage } from '@/services/llmService';
import type { LLMProviderConfig } from '@/types/state';
import { randomBase36 } from '@/common/utils/random';
import {
  getDeepChatMessageText,
  type DeepChatMessage,
  type DeepChatRole,
} from './conversationContext';
import type { DeepChatRequestBody } from './types';

export function createTextInputEvent(prompt: string): Event {
  if (typeof InputEvent === 'function') {
    return new InputEvent('input', {
      bubbles: true,
      inputType: 'insertText',
      data: prompt,
    });
  }

  return new Event('input', { bubbles: true });
}

export function escapeHTML(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function truncateText(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

export function formatThreadTime(timestamp: number): string {
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

export function createThreadId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `thread-${Date.now()}-${randomBase36(12)}`;
}

export function getThreadTitle(messages: DeepChatMessage[]): string {
  const firstUserMessage = messages.find(message => message.role === 'user');
  const title = getMessageText((firstUserMessage || messages[0] || {}) as DeepChatMessage).replace(
    /\s+/g,
    ' '
  );
  return title ? truncateText(title, 42) : 'New Thread';
}

export function normalizeChatMessages(
  body: DeepChatRequestBody | DeepChatMessage[]
): ChatMessage[] {
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

export function getMessageText(message: DeepChatMessage): string {
  return getDeepChatMessageText(message);
}

export function normalizeModels(config: LLMProviderConfig | null): string[] {
  if (!config?.models) {
    return [];
  }

  return config.models
    .map(model => (typeof model === 'string' ? model : model.id))
    .filter((model): model is string => Boolean(model));
}

export function getFirstModel(config: LLMProviderConfig | null): string {
  return normalizeModels(config)[0] || '';
}

export function normalizeTemperature(value: string | undefined): number {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 0.3;
  }

  return Math.min(1, Math.max(0, Number(numericValue.toFixed(1))));
}

export function updateTemperatureTrack(input: HTMLInputElement | null): void {
  if (!input) {
    return;
  }

  const percent = normalizeTemperature(input.value) * 100;
  input.style.setProperty('--playground-temperature-percent', `${percent}%`);
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

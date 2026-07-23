/**
 * Safe, read-only business tools for Deep Chat on Responses path.
 * No secrets, no writes, no network (except via model tools like web_search if added separately).
 */

import type { ResponsesToolExecutor } from '@/services/modelCapability';
import type { DeepChatThread } from './types';
import { getDeepChatMessageText } from './conversationContext';

export const DEEP_CHAT_BUSINESS_TOOLS: unknown[] = [
  {
    type: 'function',
    name: 'get_session_summary',
    description:
      'Read-only: return current Deep Chat session title, message count, and last user snippet. No secrets.',
    parameters: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_active_model',
    description:
      'Read-only: return the currently selected model id and provider for this session. Never returns API keys.',
    parameters: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'list_recent_user_questions',
    description:
      'Read-only: list up to N most recent user messages in this thread (default 5, max 12).',
    parameters: {
      type: 'object',
      properties: {
        limit: {
          type: 'integer',
          description: 'How many recent user messages to return (1-12)',
          minimum: 1,
          maximum: 12,
        },
      },
      additionalProperties: false,
    },
  },
];

export type DeepChatBusinessToolContext = {
  getThread: () => DeepChatThread;
  getModel: () => string;
  getProvider: () => string;
};

function clip(text: string, max = 240): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export function createDeepChatBusinessToolExecutor(
  ctx: DeepChatBusinessToolContext
): ResponsesToolExecutor {
  return async ({ name, arguments: argsJson }) => {
    if (name === 'get_session_summary') {
      const thread = ctx.getThread();
      const lastUser = [...thread.messages]
        .reverse()
        .find(m => m.role === 'user' || m.role === undefined);
      return JSON.stringify({
        threadId: thread.id,
        title: thread.title,
        messageCount: thread.messages.length,
        hasUnread: Boolean(thread.hasUnread),
        lastUserSnippet: lastUser ? clip(getDeepChatMessageText(lastUser)) : '',
      });
    }

    if (name === 'get_active_model') {
      return JSON.stringify({
        provider: ctx.getProvider(),
        model: ctx.getModel(),
      });
    }

    if (name === 'list_recent_user_questions') {
      let limit = 5;
      try {
        const parsed = JSON.parse(argsJson || '{}') as { limit?: unknown };
        if (typeof parsed.limit === 'number' && Number.isFinite(parsed.limit)) {
          limit = Math.min(12, Math.max(1, Math.round(parsed.limit)));
        }
      } catch {
        // ignore bad args
      }
      const thread = ctx.getThread();
      const users = thread.messages
        .filter(m => m.role === 'user')
        .map(m => clip(getDeepChatMessageText(m), 400))
        .filter(Boolean)
        .slice(-limit);
      return JSON.stringify({ count: users.length, questions: users });
    }

    return JSON.stringify({
      error: 'unknown_tool',
      message: `Tool not allowed: ${name}`,
    });
  };
}

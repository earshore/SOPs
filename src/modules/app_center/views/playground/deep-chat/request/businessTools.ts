/**
 * Safe business tools for Deep Chat on chat_completions + responses paths.
 * Includes read-only session tools and client-side web / X search.
 *
 * Product rule: controlled by runtime strategy `deepChat.enableBusinessTools`
 * (default **true**, toggle in 系统设置 → 工具策略 → Playground · Deep Chat).
 * When enabled, search-style questions can complete a tool loop instead of dumping
 * raw tool syntax as assistant text.
 */

import { getRuntimeStrategySettings } from '@/services/runtimeStrategyService';

import { parseToolArgsObject, runSearchX, runWebSearch } from './webSearch';
import { getDeepChatMessageText } from '../session/conversationContext';

import type { DeepChatThread } from '../types';
import type { ResponsesToolExecutor } from '@/services/modelCapability';

/** Default product: tools on so models use native tool_calls instead of text dumps. */
export const DEEP_CHAT_BUSINESS_TOOLS_DEFAULT_ENABLED = true;

/**
 * Whether Deep Chat may inject business tools.
 * Explicit prefs override runtime; missing prefs fall back to runtime (default true).
 */
export function isDeepChatBusinessToolsEnabled(
  prefs?: { enableBusinessTools?: boolean } | null
): boolean {
  if (prefs && Object.prototype.hasOwnProperty.call(prefs, 'enableBusinessTools')) {
    return prefs.enableBusinessTools === true;
  }
  return getRuntimeStrategySettings().deepChat.enableBusinessTools === true;
}

/** Flat Responses-style tools; chat path normalizes via normalizeToolsForChat. */
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
  {
    type: 'function',
    name: 'web_search',
    description:
      'Search the open web for recent information, news, or facts. Use for general web research. Returns text snippets; always synthesize a final user-facing answer after results.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query',
        },
        num_results: {
          type: 'integer',
          description: 'Hint for how many results to emphasize (1-15)',
          minimum: 1,
          maximum: 15,
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'search_x',
    description:
      'Search X (Twitter) discussions and news-like posts about a topic (AI, product launches, etc.). Prefer this when the user asks about X/Twitter. Returns text snippets via web-oriented X search; always synthesize a final answer after results. Do not print raw tool call markup to the user.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query / keywords',
        },
        limit: {
          type: 'integer',
          description: 'Approx how many posts/snippets to emphasize (1-20)',
          minimum: 1,
          maximum: 20,
        },
        mode: {
          type: 'string',
          description: 'Optional mode hint, e.g. Latest',
        },
        from_date: {
          type: 'string',
          description: 'Optional YYYY-MM-DD lower bound',
        },
      },
      required: ['query'],
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

async function executeSessionSummary(ctx: DeepChatBusinessToolContext): Promise<string> {
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

async function executeListRecentUserQuestions(
  ctx: DeepChatBusinessToolContext,
  argsJson: string
): Promise<string> {
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

async function executeSearchX(argsJson: string): Promise<string> {
  const args = parseToolArgsObject(argsJson);
  const query = typeof args.query === 'string' ? args.query : '';
  const limit =
    typeof args.limit === 'number' && Number.isFinite(args.limit)
      ? Math.min(20, Math.max(1, Math.round(args.limit)))
      : undefined;
  const mode = typeof args.mode === 'string' ? args.mode : undefined;
  const from_date = typeof args.from_date === 'string' ? args.from_date : undefined;
  return JSON.stringify(await runSearchX({ query, limit, mode, from_date }));
}

export function createDeepChatBusinessToolExecutor(
  ctx: DeepChatBusinessToolContext
): ResponsesToolExecutor {
  return async ({ name, arguments: argsJson }) => {
    if (name === 'get_session_summary') return executeSessionSummary(ctx);
    if (name === 'get_active_model') {
      return JSON.stringify({ provider: ctx.getProvider(), model: ctx.getModel() });
    }
    if (name === 'list_recent_user_questions') {
      return executeListRecentUserQuestions(ctx, argsJson);
    }
    if (name === 'web_search') {
      const args = parseToolArgsObject(argsJson);
      const query = typeof args.query === 'string' ? args.query : '';
      return JSON.stringify(await runWebSearch(query));
    }
    if (name === 'search_x') return executeSearchX(argsJson);
    return JSON.stringify({
      error: 'unknown_tool',
      message: `Tool not allowed: ${name}`,
    });
  };
}

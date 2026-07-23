import { describe, expect, it } from 'vitest';

import type { ChatMessage } from '@/services/llmService';
import {
  buildStoredThreadMessages,
  mergeThreadHistoryWithRequest,
  normalizeStoredThreadMessages,
  type DeepChatMessage,
} from './conversationContext';

describe('mergeThreadHistoryWithRequest', () => {
  it('prepends saved thread history when Deep Chat only sends the latest request', () => {
    const history: DeepChatMessage[] = [
      { role: 'user', text: '第一轮问题' },
      { role: 'ai', text: '第一轮回答' },
    ];
    const request: ChatMessage[] = [{ role: 'user', content: '第二轮问题' }];

    expect(mergeThreadHistoryWithRequest(history, request)).toEqual([
      { role: 'user', content: '第一轮问题' },
      { role: 'assistant', content: '第一轮回答' },
      { role: 'user', content: '第二轮问题' },
    ]);
  });

  it('does not duplicate history when the request already contains the thread prefix', () => {
    const history: DeepChatMessage[] = [
      { role: 'user', text: '第一轮问题' },
      { role: 'ai', text: '第一轮回答' },
    ];
    const request: ChatMessage[] = [
      { role: 'user', content: '第一轮问题' },
      { role: 'assistant', content: '第一轮回答' },
      { role: 'user', content: '第二轮问题' },
    ];

    expect(mergeThreadHistoryWithRequest(history, request)).toBe(request);
  });

  it('ignores empty and system-only saved messages', () => {
    const history: DeepChatMessage[] = [
      { role: 'system', text: '系统提示' },
      { role: 'user', text: '   ' },
    ];
    const request: ChatMessage[] = [{ role: 'user', content: '新的问题' }];

    expect(mergeThreadHistoryWithRequest(history, request)).toEqual(request);
  });

  it('returns an empty list when there is no request message to send', () => {
    expect(mergeThreadHistoryWithRequest([{ role: 'user', text: '已有历史' }], [])).toEqual([]);
  });
});

describe('buildStoredThreadMessages', () => {
  it('stores assistant reasoning as display-only metadata', () => {
    const stored = buildStoredThreadMessages([], [{ role: 'user', content: 'q' }], 'answer', {
      assistantReasoning: '  plan steps  ',
    });
    expect(stored).toEqual([
      expect.objectContaining({ role: 'user', text: 'q' }),
      expect.objectContaining({ role: 'ai', text: 'answer', reasoning: 'plan steps' }),
    ]);
    // History merge must use text only (no reasoning bleed into next turn).
    const history = mergeThreadHistoryWithRequest(stored, [{ role: 'user', content: 'next' }]);
    expect(history.map(m => m.content)).toEqual(['q', 'answer', 'next']);
  });

  it('preserves existing message timestamps and appends stopped assistant text', () => {
    const existing: DeepChatMessage[] = [
      { role: 'user', text: '第一轮问题', createdAt: 1000 },
      { role: 'ai', text: '第一轮回答', createdAt: 2000 },
    ];
    const conversation: ChatMessage[] = [
      { role: 'user', content: '第一轮问题' },
      { role: 'assistant', content: '第一轮回答' },
      { role: 'user', content: '第二轮问题' },
    ];

    expect(
      buildStoredThreadMessages(existing, conversation, '部分回复', {
        now: 3000,
        assistantCreatedAt: 4000,
        assistantStatus: 'stopped',
      })
    ).toEqual([
      { role: 'user', text: '第一轮问题', createdAt: 1000 },
      { role: 'ai', text: '第一轮回答', createdAt: 2000 },
      { role: 'user', text: '第二轮问题', createdAt: 3000 },
      { role: 'ai', text: '部分回复', createdAt: 4000, status: 'stopped' },
    ]);

    expect(
      buildStoredThreadMessages(existing, conversation, '半截回复', {
        now: 3000,
        assistantCreatedAt: 4000,
        assistantStatus: 'partial',
      })
    ).toEqual([
      { role: 'user', text: '第一轮问题', createdAt: 1000 },
      { role: 'ai', text: '第一轮回答', createdAt: 2000 },
      { role: 'user', text: '第二轮问题', createdAt: 3000 },
      { role: 'ai', text: '半截回复', createdAt: 4000, status: 'partial' },
    ]);
  });

  it('limits stored history to the newest messages', () => {
    const conversation: ChatMessage[] = [
      { role: 'user', content: '1' },
      { role: 'assistant', content: '2' },
      { role: 'user', content: '3' },
    ];

    expect(
      buildStoredThreadMessages([], conversation, '', {
        now: 1000,
        maxMessages: 2,
      })
    ).toEqual([
      { role: 'ai', text: '2', createdAt: 1000 },
      { role: 'user', text: '3', createdAt: 1000 },
    ]);
  });

  it('truncates oversized stored messages', () => {
    const stored = buildStoredThreadMessages([], [{ role: 'user', content: 'abcdef' }], '', {
      now: 1000,
      maxMessageChars: 3,
    });

    expect(stored).toHaveLength(1);
    expect(stored[0]?.text).toContain('abc');
    expect(stored[0]?.text).toContain('内容已截断');
  });

  it('preserves oversized stored messages when no explicit char limit is configured', () => {
    const longContent = 'x'.repeat(30000);
    const stored = buildStoredThreadMessages([], [{ role: 'user', content: longContent }], '', {
      now: 1000,
    });

    expect(stored).toEqual([{ role: 'user', text: longContent, createdAt: 1000 }]);
    expect(stored[0]?.text).not.toContain('内容已截断');
  });
});

describe('normalizeStoredThreadMessages', () => {
  it('drops invalid messages and fills missing timestamps', () => {
    expect(
      normalizeStoredThreadMessages(
        [
          { role: 'system', text: '系统' },
          { role: 'user', text: '   ' },
          { role: 'assistant', text: '保留' },
        ],
        {
          fallbackCreatedAt: 5000,
        }
      )
    ).toEqual([{ role: 'ai', text: '保留', createdAt: 5000 }]);
  });
});

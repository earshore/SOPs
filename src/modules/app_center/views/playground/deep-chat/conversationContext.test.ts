import { describe, expect, it } from 'vitest';

import type { ChatMessage } from '@/services/llmService';
import { mergeThreadHistoryWithRequest, type DeepChatMessage } from './conversationContext';

describe('mergeThreadHistoryWithRequest', () => {
  it('prepends saved thread history when Deep Chat only sends the latest request', () => {
    const history: DeepChatMessage[] = [
      { role: 'user', text: '第一轮问题' },
      { role: 'ai', text: '第一轮回答' },
    ];
    const request: ChatMessage[] = [
      { role: 'user', content: '第二轮问题' },
    ];

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
    const request: ChatMessage[] = [
      { role: 'user', content: '新的问题' },
    ];

    expect(mergeThreadHistoryWithRequest(history, request)).toEqual(request);
  });

  it('returns an empty list when there is no request message to send', () => {
    expect(mergeThreadHistoryWithRequest([
      { role: 'user', text: '已有历史' },
    ], [])).toEqual([]);
  });
});

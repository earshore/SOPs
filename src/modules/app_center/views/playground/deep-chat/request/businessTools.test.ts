import { describe, expect, it } from 'vitest';
import {
  createDeepChatBusinessToolExecutor,
  DEEP_CHAT_BUSINESS_TOOLS,
  DEEP_CHAT_BUSINESS_TOOLS_DEFAULT_ENABLED,
  isDeepChatBusinessToolsEnabled,
} from './businessTools';
import type { DeepChatThread } from '../types';

function sampleThread(): DeepChatThread {
  const now = Date.now();
  return {
    id: 't1',
    title: 'ASIN research',
    messages: [
      { role: 'user', text: 'First question about B0TEST' },
      { role: 'ai', text: 'Answer one' },
      { role: 'user', text: 'Second question' },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

describe('deepChatBusinessTools', () => {
  it('enables business tools by default (explicit false still disables)', () => {
    expect(DEEP_CHAT_BUSINESS_TOOLS_DEFAULT_ENABLED).toBe(true);
    expect(isDeepChatBusinessToolsEnabled({ enableBusinessTools: false })).toBe(false);
    expect(isDeepChatBusinessToolsEnabled({ enableBusinessTools: true })).toBe(true);
  });

  it('exposes session + search allowlisted tools', () => {
    const names = DEEP_CHAT_BUSINESS_TOOLS.map(t => (t as { name?: string }).name).filter(Boolean);
    expect(names).toEqual([
      'get_session_summary',
      'get_active_model',
      'list_recent_user_questions',
      'web_search',
      'search_x',
    ]);
  });

  it('executes read-only tools without secrets', async () => {
    const exec = createDeepChatBusinessToolExecutor({
      getThread: sampleThread,
      getModel: () => 'gpt-5.5',
      getProvider: () => 'new_api',
    });

    const summary = JSON.parse(
      await exec({ name: 'get_session_summary', arguments: '{}', callId: 'c1' })
    );
    expect(summary.title).toBe('ASIN research');
    expect(summary.messageCount).toBe(3);
    expect(JSON.stringify(summary)).not.toMatch(/sk-|apiKey|Bearer/i);

    const model = JSON.parse(
      await exec({ name: 'get_active_model', arguments: '{}', callId: 'c2' })
    );
    expect(model).toEqual({ provider: 'new_api', model: 'gpt-5.5' });

    const list = JSON.parse(
      await exec({
        name: 'list_recent_user_questions',
        arguments: '{"limit":1}',
        callId: 'c3',
      })
    );
    expect(list.count).toBe(1);
    expect(list.questions[0]).toContain('Second question');
  });

  it('rejects unknown tools', async () => {
    const exec = createDeepChatBusinessToolExecutor({
      getThread: sampleThread,
      getModel: () => 'm',
      getProvider: () => 'p',
    });
    const out = JSON.parse(await exec({ name: 'rm_rf', arguments: '{}', callId: 'c' }));
    expect(out.error).toBe('unknown_tool');
  });

  it('runs search_x / web_search via client search helper', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response('AI industry headlines snippet', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })) as typeof fetch;

    try {
      const exec = createDeepChatBusinessToolExecutor({
        getThread: sampleThread,
        getModel: () => 'm',
        getProvider: () => 'p',
      });
      const x = JSON.parse(
        await exec({
          name: 'search_x',
          arguments: JSON.stringify({ query: 'AI news', limit: 5, mode: 'Latest' }),
          callId: 'c-x',
        })
      );
      expect(x.query).toBe('AI news');
      expect(x.resultsText).toMatch(/AI industry|headlines|snippet|Search/i);

      const web = JSON.parse(
        await exec({
          name: 'web_search',
          arguments: JSON.stringify({ query: 'AI news today' }),
          callId: 'c-w',
        })
      );
      expect(web.query).toBe('AI news today');
      expect(typeof web.resultsText).toBe('string');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

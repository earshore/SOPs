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
  it('fail-closes business tools injection by default (opt-in only)', () => {
    expect(DEEP_CHAT_BUSINESS_TOOLS_DEFAULT_ENABLED).toBe(false);
    expect(isDeepChatBusinessToolsEnabled({ enableBusinessTools: false })).toBe(false);
    expect(isDeepChatBusinessToolsEnabled({ enableBusinessTools: true })).toBe(true);
    expect(isDeepChatBusinessToolsEnabled({})).toBe(false);
  });

  it('exposes only allowlisted tools', () => {
    const names = DEEP_CHAT_BUSINESS_TOOLS.map(t => (t as { name?: string }).name).filter(Boolean);
    expect(names).toEqual([
      'get_session_summary',
      'get_active_model',
      'list_recent_user_questions',
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
});

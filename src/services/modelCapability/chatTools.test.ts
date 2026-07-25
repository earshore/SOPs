import { describe, expect, it } from 'vitest';
import {
  appendChatToolRoundMessages,
  extractChatToolCallsFromCompletion,
  mergeChatStreamToolCallDeltas,
  normalizeToolsForChat,
} from './chatTools';

describe('chatTools', () => {
  it('extracts tool_calls from completion message', () => {
    const calls = extractChatToolCallsFromCompletion({
      choices: [
        {
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [
              {
                id: 'call_1',
                type: 'function',
                function: { name: 'lookup', arguments: '{"q":1}' },
              },
            ],
          },
          finish_reason: 'tool_calls',
        },
      ],
    });
    expect(calls).toEqual([
      {
        id: 'call_1',
        type: 'function',
        function: { name: 'lookup', arguments: '{"q":1}' },
      },
    ]);
  });

  it('merges stream tool_call argument deltas by index', () => {
    const merged = mergeChatStreamToolCallDeltas(undefined, [
      { index: 0, id: 'call_x', function: { name: 'add', arguments: '{"a":' } },
      { index: 0, function: { arguments: '1}' } },
    ]);
    expect(merged).toEqual([
      {
        id: 'call_x',
        type: 'function',
        function: { name: 'add', arguments: '{"a":1}' },
      },
    ]);
  });

  it('appends assistant tool_calls and tool result messages', () => {
    const next = appendChatToolRoundMessages(
      [{ role: 'user', content: 'hi' }],
      [
        {
          id: 'call_1',
          type: 'function',
          function: { name: 'lookup', arguments: '{}' },
        },
      ],
      [{ callId: 'call_1', output: 'ok' }]
    );
    expect(next).toHaveLength(3);
    expect(next[1]).toMatchObject({
      role: 'assistant',
      content: null,
      tool_calls: [{ id: 'call_1' }],
    });
    expect(next[2]).toEqual({
      role: 'tool',
      tool_call_id: 'call_1',
      content: 'ok',
    });
  });

  it('normalizes flat Responses tools to chat function shape', () => {
    const tools = normalizeToolsForChat([
      {
        type: 'function',
        name: 'search_x',
        description: 'Search X',
        parameters: { type: 'object', properties: { query: { type: 'string' } } },
      },
      {
        type: 'function',
        function: { name: 'already', parameters: {} },
      },
      { type: 'web_search' },
      'skip-me',
      { type: 'function' },
    ]);
    expect(tools?.[0]).toEqual({
      type: 'function',
      function: {
        name: 'search_x',
        description: 'Search X',
        parameters: { type: 'object', properties: { query: { type: 'string' } } },
      },
    });
    expect(tools?.[1]).toEqual({
      type: 'function',
      function: { name: 'already', parameters: {} },
    });
    expect(tools?.[2]).toEqual({ type: 'web_search' });
    expect(tools?.[3]).toBe('skip-me');
    expect(tools?.[4]).toEqual({ type: 'function' });
    expect(normalizeToolsForChat(undefined)).toBeUndefined();
    expect(normalizeToolsForChat([])).toEqual([]);
  });
});

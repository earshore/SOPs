import { describe, expect, it } from 'vitest';
import {
  buildFunctionCallOutputItems,
  buildToolFollowUpInputItems,
  extractResponsesFunctionCalls,
  normalizeToolsForResponses,
} from './responsesTools';
import { processResponsesToolRound } from './responsesToolLoop';

describe('normalizeToolsForResponses', () => {
  it('flattens chat-completions function tools', () => {
    const out = normalizeToolsForResponses([
      {
        type: 'function',
        function: {
          name: 'lookup',
          description: 'd',
          parameters: { type: 'object' },
        },
      },
    ]);
    expect(out?.[0]).toMatchObject({
      type: 'function',
      name: 'lookup',
      description: 'd',
      parameters: { type: 'object' },
    });
  });

  it('passes through built-in tool types', () => {
    const out = normalizeToolsForResponses([
      { type: 'web_search' },
      { type: 'file_search', vector_store_ids: ['vs_1'] },
    ]);
    expect(out).toEqual([
      { type: 'web_search' },
      { type: 'file_search', vector_store_ids: ['vs_1'] },
    ]);
  });
});

describe('extractResponsesFunctionCalls', () => {
  it('reads function_call items', () => {
    const calls = extractResponsesFunctionCalls({
      id: 'resp_1',
      output: [
        {
          type: 'function_call',
          id: 'fc_1',
          call_id: 'call_abc',
          name: 'get_weather',
          arguments: '{"city":"SF"}',
        },
        {
          type: 'message',
          content: [{ type: 'output_text', text: 'hold' }],
        },
      ],
    });
    expect(calls).toEqual([
      {
        callId: 'call_abc',
        name: 'get_weather',
        arguments: '{"city":"SF"}',
        itemId: 'fc_1',
      },
    ]);
  });
});

describe('processResponsesToolRound', () => {
  it('returns done when no tool calls', async () => {
    const result = await processResponsesToolRound({
      responseData: {
        id: 'resp_x',
        output_text: 'final',
      },
      executeTool: async () => 'unused',
    });
    expect(result.done).toBe(true);
    expect(result.text).toBe('final');
    expect(result.responseId).toBe('resp_x');
  });

  it('executes tools and builds stateless replay items by default', async () => {
    const result = await processResponsesToolRound({
      responseData: {
        id: 'resp_2',
        output: [
          {
            type: 'function_call',
            call_id: 'call_1',
            name: 'add',
            arguments: '{"a":1,"b":2}',
          },
        ],
      },
      executeTool: async ({ name, arguments: args }) => {
        expect(name).toBe('add');
        const parsed = JSON.parse(args) as { a: number; b: number };
        return String(parsed.a + parsed.b);
      },
    });
    expect(result.done).toBe(false);
    expect(result.nextInputItems).toEqual(
      buildToolFollowUpInputItems({
        functionCalls: [{ callId: 'call_1', name: 'add', arguments: '{"a":1,"b":2}' }],
        results: [{ callId: 'call_1', output: '3' }],
        mode: 'stateless',
      })
    );
  });

  it('builds stateful function_call_output only when requested', async () => {
    const result = await processResponsesToolRound({
      responseData: {
        id: 'resp_2',
        output: [
          {
            type: 'function_call',
            call_id: 'call_1',
            name: 'add',
            arguments: '{"a":1,"b":2}',
          },
        ],
      },
      useStatefulFollowUp: true,
      executeTool: async () => '3',
    });
    expect(result.nextInputItems).toEqual(
      buildFunctionCallOutputItems([{ callId: 'call_1', output: '3' }])
    );
  });
});

import { describe, expect, it } from 'vitest';
import {
  describeResponsesEmptyBody,
  extractResponsesId,
  extractResponsesOutputText,
  extractResponsesReasoningSummary,
  extractResponsesRefusal,
  getResponsesFailureFromEvent,
  getResponsesFailureFromPayload,
  getResponsesReasoningStreamDelta,
  getResponsesRefusalDelta,
  getResponsesStreamTextDelta,
  getResponsesStreamTextDeltaDeduped,
  harvestResponsesReasoningIncrement,
  isResponsesTerminalEvent,
} from './responsesParse';

describe('responsesParse', () => {
  it('extracts output_text shortcut and message items', () => {
    expect(extractResponsesOutputText({ output_text: 'hi' })).toBe('hi');
    expect(
      extractResponsesOutputText({
        output: [
          {
            type: 'message',
            content: [
              { type: 'output_text', text: 'a' },
              { type: 'output_text', text: 'b' },
            ],
          },
        ],
      })
    ).toBe('ab');
  });

  it('extracts refusal when no text', () => {
    expect(extractResponsesRefusal({ refusal: 'nope' })).toBe('nope');
    expect(
      extractResponsesOutputText({
        output: [{ type: 'message', refusal: 'blocked' }],
      })
    ).toBe('blocked');
  });

  it('parses stream text and reasoning summary deltas', () => {
    expect(
      getResponsesStreamTextDelta({
        type: 'response.output_text.delta',
        delta: 'hello',
      })
    ).toBe('hello');
    expect(
      getResponsesReasoningStreamDelta({
        type: 'response.reasoning_summary_text.delta',
        delta: 'think',
      })
    ).toBe('think');
  });

  it('extracts whole-answer text from content_part.done (gateways without text deltas)', () => {
    expect(
      getResponsesStreamTextDelta({
        type: 'response.content_part.done',
        item_id: 'msg_1',
        output_index: 0,
        content_index: 0,
        part: { type: 'output_text', annotations: [], text: '我很好，谢谢！' },
      })
    ).toBe('我很好，谢谢！');
    // reasoning items are never treated as visible text
    expect(
      getResponsesStreamTextDelta({
        type: 'response.content_part.done',
        part: { type: 'summary_text', text: 'think' },
      })
    ).toBe('');
  });

  it('extracts whole-answer text from output_item.done message items', () => {
    expect(
      getResponsesStreamTextDelta({
        type: 'response.output_item.done',
        output_index: 0,
        item: {
          id: 'msg_1',
          type: 'message',
          content: [{ type: 'output_text', annotations: [], text: 'complete answer' }],
        },
      })
    ).toBe('complete answer');
    // reasoning item on output_item.done stays invisible
    expect(
      getResponsesStreamTextDelta({
        type: 'response.output_item.done',
        item: { type: 'reasoning', summary: [{ type: 'summary_text', text: 'think' }] },
      })
    ).toBe('');
  });

  it('detects terminal events and response id', () => {
    expect(isResponsesTerminalEvent({ type: 'response.completed' })).toBe(true);
    expect(extractResponsesId({ id: 'resp_abc' })).toBe('resp_abc');
  });

  it('extracts reasoning summary from completed output items', () => {
    expect(
      extractResponsesReasoningSummary({
        output: [
          {
            type: 'reasoning',
            summary: [
              { type: 'summary_text', text: 'step one. ' },
              { type: 'summary_text', text: 'step two.' },
            ],
          },
          {
            type: 'message',
            content: [{ type: 'output_text', text: 'answer' }],
          },
        ],
      })
    ).toBe('step one. step two.');
  });

  it('harvests incremental reasoning from completed stream events', () => {
    const completed = {
      type: 'response.completed',
      response: {
        output: [
          {
            type: 'reasoning',
            summary: [{ type: 'summary_text', text: 'plan A then B' }],
          },
        ],
      },
    };
    expect(harvestResponsesReasoningIncrement(completed, '')).toBe('plan A then B');
    expect(harvestResponsesReasoningIncrement(completed, 'plan A then B')).toBe('');
    expect(harvestResponsesReasoningIncrement(completed, 'plan A')).toBe(' then B');
  });

  it('describes incomplete and reasoning-only empty bodies specifically', () => {
    expect(
      describeResponsesEmptyBody({
        status: 'incomplete',
        incomplete_details: { reason: 'max_output_tokens' },
      })
    ).toMatch(/max_output_tokens/);

    expect(
      describeResponsesEmptyBody({
        status: 'completed',
        output: [
          {
            type: 'reasoning',
            summary: [{ type: 'summary_text', text: 'only thinking' }],
          },
        ],
      })
    ).toMatch(/推理但未返回可见正文/);

    expect(
      describeResponsesEmptyBody({
        output_text: 'ok',
        status: 'completed',
      })
    ).toBeNull();
  });
});

describe('responses failure parsing', () => {
  it('parses response.failed event with code and message', () => {
    const failure = getResponsesFailureFromEvent('response.failed', {
      type: 'response.failed',
      response: {
        status: 'failed',
        error: { code: 'server_error', message: 'boom' },
      },
    });
    expect(failure?.kind).toBe('failed');
    expect(failure?.code).toBe('server_error');
    expect(failure?.message).toContain('boom');
  });

  it('parses response.incomplete event with reason', () => {
    const failure = getResponsesFailureFromEvent('response.incomplete', {
      type: 'response.incomplete',
      response: {
        status: 'incomplete',
        incomplete_details: { reason: 'max_output_tokens' },
      },
    });
    expect(failure?.kind).toBe('incomplete');
    expect(failure?.code).toBe('max_output_tokens');
    expect(failure?.message).toContain('max_output_tokens');
  });

  it('returns null for unrelated events', () => {
    expect(getResponsesFailureFromEvent('response.completed', { response: {} })).toBeNull();
    expect(getResponsesFailureFromEvent('response.output_text.delta', {})).toBeNull();
  });

  it('handles missing error details gracefully', () => {
    const failure = getResponsesFailureFromEvent('response.failed', { type: 'response.failed' });
    expect(failure?.kind).toBe('failed');
    expect(failure?.message).toContain('未知错误');
  });

  it('parses non-stream payload status variants', () => {
    expect(
      getResponsesFailureFromPayload({
        status: 'failed',
        error: { code: 'rate_limit_exceeded', message: 'slow down' },
      })?.message
    ).toContain('slow down');
    expect(
      getResponsesFailureFromPayload({
        status: 'incomplete',
        incomplete_details: { reason: 'content_filter' },
      })?.message
    ).toContain('安全策略');
    expect(getResponsesFailureFromPayload({ status: 'completed' })).toBeNull();
    expect(getResponsesFailureFromPayload(null)).toBeNull();
  });
});

describe('responses refusal deltas', () => {
  it('reads refusal.delta and refusal.done fields', () => {
    expect(getResponsesRefusalDelta('response.refusal.delta', { delta: 'I can' })).toBe('I can');
    expect(getResponsesRefusalDelta('response.refusal.done', { refusal: 'refused' })).toBe(
      'refused'
    );
  });

  it('returns null for other events or malformed payloads', () => {
    expect(getResponsesRefusalDelta('response.output_text.delta', { delta: 'x' })).toBeNull();
    expect(getResponsesRefusalDelta('response.refusal.delta', { delta: 5 })).toBeNull();
    expect(getResponsesRefusalDelta('response.refusal.done', null)).toBeNull();
  });
});

describe('getResponsesStreamTextDeltaDeduped', () => {
  const itemId = 'msg_1';

  it('追加 delta 并标记 item；done 事件携带完整文本时视为重复忽略', () => {
    const seen = new Set<string>();
    expect(
      getResponsesStreamTextDeltaDeduped(
        { type: 'response.output_text.delta', item_id: itemId, delta: '{"a":' },
        seen
      )
    ).toBe('{"a":');
    expect(seen.has(itemId)).toBe(true);
    // 已收到过 delta 的 item：done 的完整文本重复，忽略
    expect(
      getResponsesStreamTextDeltaDeduped(
        {
          type: 'response.content_part.done',
          item_id: itemId,
          part: { type: 'output_text', text: '{"a":1}' },
        },
        seen
      )
    ).toBe('');
    expect(
      getResponsesStreamTextDeltaDeduped(
        {
          type: 'response.output_item.done',
          item_id: itemId,
          item: { type: 'message', content: [{ type: 'output_text', text: '{"a":1}' }] },
        },
        seen
      )
    ).toBe('');
  });

  it('纯 done 网关（无 delta）时用 done 完整文本兜底，且同 item 不重复', () => {
    const seen = new Set<string>();
    expect(
      getResponsesStreamTextDeltaDeduped(
        {
          type: 'response.content_part.done',
          item_id: itemId,
          part: { type: 'output_text', text: '{"b":2}' },
        },
        seen
      )
    ).toBe('{"b":2}');
    // 第二次 done：同一 item 已输出过，忽略
    expect(
      getResponsesStreamTextDeltaDeduped(
        {
          type: 'response.output_item.done',
          item_id: itemId,
          item: { type: 'message', content: [{ type: 'output_text', text: '{"b":2}' }] },
        },
        seen
      )
    ).toBe('');
    // output_item.done 无顶层 item_id 时，从 item.id 解析（实测网关形态）
    expect(
      getResponsesStreamTextDeltaDeduped(
        {
          type: 'response.output_item.done',
          item: {
            id: 'msg_9',
            type: 'message',
            content: [{ type: 'output_text', text: '{"d":4}' }],
          },
        },
        seen
      )
    ).toBe('{"d":4}');
  });

  it('不同 item 的 done 互不影响；seen 为空时按原行为返回', () => {
    const seen = new Set<string>(['msg_1']);
    expect(
      getResponsesStreamTextDeltaDeduped(
        {
          type: 'response.content_part.done',
          item_id: 'msg_2',
          part: { type: 'output_text', text: '{"c":3}' },
        },
        seen
      )
    ).toBe('{"c":3}');
    expect(
      getResponsesStreamTextDeltaDeduped(
        { type: 'response.output_text.delta', item_id: 'msg_2', delta: 'x' },
        undefined
      )
    ).toBe('x');
  });
});

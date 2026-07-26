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

import { describe, expect, it } from 'vitest';
import {
  buildPreReplyActivityTimeline,
  formatToolActivityLabel,
  formatToolResultDetail,
  normalizePreReplyActivitySteps,
  upsertPreReplyActivityStep,
} from './preReplyActivity';

describe('preReplyActivity', () => {
  it('labels known tools in Chinese', () => {
    expect(formatToolActivityLabel('search_x')).toBe('搜索 X');
    expect(formatToolActivityLabel('web_search')).toBe('网页搜索');
  });

  it('upserts tool steps in place', () => {
    let steps = upsertPreReplyActivityStep([], {
      id: 'c1',
      kind: 'tool',
      label: '搜索 X',
      detail: '{"query":"AI"}',
      status: 'running',
      order: 0,
    });
    steps = upsertPreReplyActivityStep(steps, {
      id: 'c1',
      kind: 'tool',
      label: '搜索 X',
      detail: 'OpenAI news…',
      status: 'done',
      order: 0,
    });
    expect(steps).toHaveLength(1);
    expect(steps[0]?.status).toBe('done');
    expect(steps[0]?.detail).toContain('OpenAI');
  });

  it('builds timeline with reasoning first then tools', () => {
    const timeline = buildPreReplyActivityTimeline({
      reasoningText: 'plan A',
      steps: [
        {
          id: 'c1',
          kind: 'tool',
          label: '搜索 X',
          detail: 'results',
          status: 'done',
          order: 0,
        },
      ],
    });
    expect(timeline.map(s => s.kind)).toEqual(['reasoning', 'tool']);
    expect(timeline[0]?.label).toBe('深度思考');
    expect(timeline[1]?.label).toBe('搜索 X');
  });

  it('normalizes stored steps safely', () => {
    const steps = normalizePreReplyActivitySteps([
      { id: 'c1', kind: 'tool', label: '搜索 X', status: 'done', detail: 'ok', order: 1 },
      { junk: true },
      { kind: 'status', label: '  准备中  ', status: 'running' },
      null,
      'skip',
    ]);
    expect(steps).toHaveLength(2);
    expect(steps?.[0]?.id).toBe('c1');
    expect(steps?.[1]?.label).toBe('准备中');
    expect(steps?.[1]?.status).toBe('running');
    expect(normalizePreReplyActivitySteps([])).toBeUndefined();
    expect(normalizePreReplyActivitySteps(null)).toBeUndefined();
  });

  it('formats tool result details for UI', () => {
    expect(formatToolResultDetail('')).toContain('无返回');
    expect(formatToolResultDetail(JSON.stringify({ resultsText: '  hit A  ' }))).toBe('hit A');
    expect(
      formatToolResultDetail(JSON.stringify({ error: 'timeout', message: 'gateway' }))
    ).toContain('timeout');
    expect(formatToolResultDetail(JSON.stringify({ count: 2 }))).toContain('"count"');
    expect(formatToolResultDetail('plain text result')).toBe('plain text result');
  });
});

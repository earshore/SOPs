import { describe, expect, it } from 'vitest';
import { parseLlmJson, parseLlmJsonObject } from '@/common/utils/parseLlmJson';

describe('parseLlmJson', () => {
  it('parses plain JSON', () => {
    const result = parseLlmJson('{"a":1}');
    expect(result).toEqual({ value: { a: 1 }, wasRepaired: false });
  });

  it('strips markdown fences', () => {
    const result = parseLlmJson('```json\n{"a":2}\n```');
    expect(result.value).toEqual({ a: 2 });
  });

  it('extracts object from surrounding prose', () => {
    const result = parseLlmJson('Here is the result: {"ok":true} thanks');
    expect(result.value).toEqual({ ok: true });
    expect(result.wasRepaired).toBe(true);
  });

  it('repairs lightly broken JSON', () => {
    const result = parseLlmJson('{a:1,}');
    expect(result.value).toEqual({ a: 1 });
    expect(result.wasRepaired).toBe(true);
  });

  it('parseLlmJsonObject rejects non-objects', () => {
    expect(() => parseLlmJsonObject('[1,2]')).toThrow();
  });
});

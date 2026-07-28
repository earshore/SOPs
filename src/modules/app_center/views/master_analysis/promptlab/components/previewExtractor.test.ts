import { describe, expect, it } from 'vitest';
import { findFirstStringValue } from './previewExtractor';

describe('findFirstStringValue', () => {
  it('returns null for a whitespace-only string', () => {
    expect(findFirstStringValue('   ')).toBeNull();
  });

  it('returns null for an empty array', () => {
    expect(findFirstStringValue([])).toBeNull();
  });

  it('skips internal diagnostics while preserving the first visible value', () => {
    expect(
      findFirstStringValue({
        _pipeline: 'hidden pipeline value',
        pipeline: 'hidden pipeline alias',
        _runtime: 'hidden runtime value',
        visible: '  first visible value  ',
        later: 'later value',
      })
    ).toBe('first visible value');
  });
});

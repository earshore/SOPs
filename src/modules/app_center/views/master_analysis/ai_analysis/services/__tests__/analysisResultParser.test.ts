import { describe, expect, it } from 'vitest';
import {
  parseAnalysisResponse,
  validateAnalysisResult,
} from '../analysisResultParser';

describe('analysisResultParser', () => {
  it('unwraps nested task results and validates the expected schema', () => {
    const parsed = parseAnalysisResponse('title-keywords', JSON.stringify({
      'title-keywords': {
        primary_keywords: [{ keyword: 'dog coat', weight: 'high' }],
        secondary_keywords: [{ keyword: 'waterproof', type: 'feature' }],
      },
    }));

    expect(parsed.wasRepaired).toBe(false);
    expect(parsed.data.primary_keywords).toEqual([{ keyword: 'dog coat', weight: 'high' }]);
  });

  it('repairs common malformed JSON before validation', () => {
    const parsed = parseAnalysisResponse('fatal-flaws', `{
      "critical_issues": [{"issue": "leaks"}],
      "return_triggers": ["leaks"],
    }`);

    expect(parsed.wasRepaired).toBe(true);
    expect(parsed.data.return_triggers).toEqual(['leaks']);
  });

  it('extracts JSON objects from fenced or prefixed model output', () => {
    const parsed = parseAnalysisResponse('wow-moments', [
      'Here is the JSON:',
      '```json',
      '{"moments":[],"emotional_triggers":[]}',
      '```',
    ].join('\n'));

    expect(parsed.data).toEqual({ moments: [], emotional_triggers: [] });
  });

  it('rejects schema drift for known task ids', () => {
    expect(() => parseAnalysisResponse('vocab-gap', JSON.stringify({
      seller_terms: ['premium'],
      buyer_terms: ['sturdy'],
      term_translations: [],
    }))).toThrow('schema mismatch');
  });

  it('exposes validation for existing service callers', () => {
    expect(validateAnalysisResult('buyer-profile', {
      demographics: {},
      buyer_types: [],
      usage_scenes: [],
    })).toBe(true);

    expect(validateAnalysisResult('buyer-profile', {
      demographics: {},
    })).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { parseAnalysisResponse, validateAnalysisResult } from '../analysisResultParser';

describe('analysisResultParser', () => {
  it('unwraps nested task results and validates the expected schema', () => {
    const parsed = parseAnalysisResponse(
      'title-keywords',
      JSON.stringify({
        'title-keywords': {
          primary_keywords: [{ keyword: 'dog coat', weight: 'high' }],
          secondary_keywords: [{ keyword: 'waterproof', type: 'feature' }],
        },
      })
    );

    expect(parsed.wasRepaired).toBe(false);
    expect(parsed.data.primary_keywords).toEqual([{ keyword: 'dog coat', weight: 'high' }]);
  });

  it('repairs common malformed JSON before validation', () => {
    const parsed = parseAnalysisResponse(
      'fatal-flaws',
      `{
      "critical_issues": [{"issue": "leaks"}],
      "return_triggers": ["leaks"],
    }`
    );

    expect(parsed.wasRepaired).toBe(true);
    expect(parsed.data.return_triggers).toEqual(['leaks']);
  });

  it('extracts JSON objects from fenced or prefixed model output', () => {
    const parsed = parseAnalysisResponse(
      'wow-moments',
      ['Here is the JSON:', '```json', '{"moments":[],"emotional_triggers":[]}', '```'].join('\n')
    );

    expect(parsed.data).toEqual({ moments: [], emotional_triggers: [] });
  });

  it('rejects schema drift for known task ids', () => {
    expect(() =>
      parseAnalysisResponse(
        'vocab-gap',
        JSON.stringify({
          seller_terms: ['premium'],
          buyer_terms: ['sturdy'],
          term_translations: [],
        })
      )
    ).toThrow('schema mismatch');
  });

  it('rejects incomplete selling-points on full phase but accepts map phase bullets-only', () => {
    const bulletsOnly = {
      bullet_analysis: [
        {
          bullet_index: 1,
          original_text_summary: 'portable 50ml',
          functions: ['portable'],
          scenes: ['travel'],
          pain_points_addressed: ['hard to carry'],
          differentiation_angle: 'portability',
          credibility_score: 'high',
        },
      ],
    };

    // Full oneshot path still requires strategy objects (contract for small listings).
    expect(() => parseAnalysisResponse('selling-points', JSON.stringify(bulletsOnly))).toThrow(
      /selling-points.*overall_strategy.*function_scene_matrix/
    );

    // Map phase for multi-ASIN pipeline allows bullets without strategy.
    const mapped = parseAnalysisResponse('selling-points', JSON.stringify(bulletsOnly), {
      phase: 'map',
    });
    expect(mapped.data.bullet_analysis).toHaveLength(1);
    expect(validateAnalysisResult('selling-points', bulletsOnly, 'map')).toBe(true);
    expect(validateAnalysisResult('selling-points', bulletsOnly, 'full')).toBe(false);

    expect(
      validateAnalysisResult('selling-points', {
        bullet_analysis: [],
        overall_strategy: {},
        function_scene_matrix: {},
      })
    ).toBe(true);
  });

  it('accepts fatal-flaws map shards without return_triggers', () => {
    const mapped = parseAnalysisResponse(
      'fatal-flaws',
      JSON.stringify({
        critical_issues: [{ issue: 'leak', severity: 'major' }],
      }),
      { phase: 'map' }
    );
    expect(mapped.data.critical_issues).toHaveLength(1);
    expect(
      validateAnalysisResult('fatal-flaws', { critical_issues: [{ issue: 'leak' }] }, 'map')
    ).toBe(true);
    expect(
      validateAnalysisResult('fatal-flaws', { critical_issues: [{ issue: 'leak' }] }, 'full')
    ).toBe(false);
  });

  it.each([
    ['wow-moments', { moments: [] }],
    ['hesitation-points', { hesitations: [] }],
    ['buyer-profile', { buyer_types: [] }],
    ['vocab-gap', { seller_terms: [] }],
    ['promise-reality', { gaps: [] }],
  ])('accepts partial %s map shards', (targetId, shard) => {
    expect(validateAnalysisResult(targetId, shard, 'map')).toBe(true);
  });

  it('keeps the full schema for title-keywords map shards', () => {
    expect(
      validateAnalysisResult(
        'title-keywords',
        { primary_keywords: [], secondary_keywords: [] },
        'map'
      )
    ).toBe(true);
    expect(validateAnalysisResult('title-keywords', { primary_keywords: [] }, 'map')).toBe(false);
  });

  it('exposes validation for existing service callers', () => {
    expect(
      validateAnalysisResult('buyer-profile', {
        demographics: {},
        buyer_types: [],
        usage_scenes: [],
      })
    ).toBe(true);

    expect(
      validateAnalysisResult('buyer-profile', {
        demographics: {},
      })
    ).toBe(false);
  });
});

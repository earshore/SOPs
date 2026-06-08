import { describe, expect, it, vi } from 'vitest';

vi.mock('@common/di/Container', () => ({
  container: {
    resolve: vi.fn(() => ({
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      info: vi.fn()
    }))
  }
}));

import { validateAnalysisResult } from '../aiAnalysisService';

describe('aiAnalysisService', () => {
  it('rejects non-object analysis results', () => {
    expect(validateAnalysisResult('title-keywords', null)).toBe(false);
    expect(validateAnalysisResult('title-keywords', 'invalid')).toBe(false);
  });

  it('validates required fields for known targets', () => {
    expect(validateAnalysisResult('title-keywords', {
      primary_keywords: [],
      secondary_keywords: []
    })).toBe(true);

    expect(validateAnalysisResult('title-keywords', {
      primary_keywords: []
    })).toBe(false);

    expect(validateAnalysisResult('selling-points', {
      bullet_analysis: [],
      overall_strategy: {},
      function_scene_matrix: {}
    })).toBe(true);
  });

  it('keeps unknown targets permissive', () => {
    expect(validateAnalysisResult('custom-target', {})).toBe(true);
  });
});

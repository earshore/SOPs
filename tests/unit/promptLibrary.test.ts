import { describe, expect, it } from 'vitest';
import {
  PROMPT_LIBRARY,
  searchPrompts,
} from '@/modules/more/views/explore/prompts/constants/promptLibrary';

describe('prompt library quality metadata', () => {
  it('requires every preset prompt to declare production-quality metadata', () => {
    expect(PROMPT_LIBRARY.length).toBeGreaterThan(0);

    PROMPT_LIBRARY.forEach((prompt) => {
      expect(prompt.requiredData.length).toBeGreaterThan(0);
      expect(prompt.doNotGuess.length).toBeGreaterThan(0);
      expect(prompt.outputContract.length).toBeGreaterThan(20);
      expect(['low', 'medium', 'high']).toContain(prompt.riskLevel);
    });
  });

  it('indexes quality metadata in prompt search', () => {
    const results = searchPrompts('认证', 'all');
    const ids = results.map((prompt) => prompt.id);

    expect(ids).toContain('listing_keyword_to_copy');
    expect(ids).toContain('compliance_claim_audit');
  });
});

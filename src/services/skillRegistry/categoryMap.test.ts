import { describe, expect, it } from 'vitest';
import { CATEGORY_LABELS, resolveSkillCategory } from './categoryMap';

describe('categoryMap', () => {
  it('maps known advertising skill', () => {
    const r = resolveSkillCategory('amazon-ppc-campaign');
    expect(r.category).toBe('advertising');
    expect(r.categoryLabel).toBe(CATEGORY_LABELS.advertising);
    expect(r.status).toBe('available');
  });

  it('maps beta growth skills', () => {
    expect(resolveSkillCategory('amazon-global-selling').status).toBe('beta');
    expect(resolveSkillCategory('amazon-fba-prep').status).toBe('beta');
  });

  it('falls back to other/unknown for unmapped ids', () => {
    const r = resolveSkillCategory('totally-unknown-skill');
    expect(r.category).toBe('other');
    expect(r.status).toBe('unknown');
    expect(r.categoryLabel).toBe(CATEGORY_LABELS.other);
  });
});

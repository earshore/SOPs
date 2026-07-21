import { describe, expect, it } from 'vitest';
import { SystemError, ValidationError } from '@/common/errors';
import { createSkillRegistry } from './skillRegistryService';

const KW = `---
name: amazon-keyword-research
description: "Keyword research skill"
metadata: {"nexscope":{"emoji":"🔍"}}
---

# Amazon Keyword Research

Do research.
`;

const PPC = `---
name: amazon-ppc-campaign
description: "PPC campaign skill"
---

# Amazon PPC Campaign

Build campaigns.
`;

function createTestRegistry() {
  return createSkillRegistry({
    skillModules: {
      '/virtual/amazon-keyword-research/SKILL.md': KW,
      '/virtual/amazon-ppc-campaign/SKILL.md': PPC,
      '/virtual/broken/SKILL.md': '',
    },
    scriptModules: {
      '/virtual/amazon-keyword-research/scripts/research.sh': '/url/research.sh',
    },
  });
}

describe('skillRegistry', () => {
  it('indexes skills and marks hasScripts', () => {
    const reg = createTestRegistry();
    reg.ensureInitialized();
    expect(reg.getStats().total).toBe(2);
    expect(reg.getStats().parseFailures).toBe(1);
    expect(reg.getSkill('amazon-keyword-research')?.hasScripts).toBe(true);
    expect(reg.getSkill('amazon-ppc-campaign')?.hasScripts).toBe(false);
  });

  it('searches by keyword case-insensitively', () => {
    const reg = createTestRegistry();
    const hits = reg.listSkills({ keyword: 'PPC' });
    expect(hits.map(s => s.id)).toEqual(['amazon-ppc-campaign']);
  });

  it('loadSkillContext returns raw by default', () => {
    const reg = createTestRegistry();
    const ctx = reg.loadSkillContext('amazon-keyword-research');
    expect(ctx).toContain('name: amazon-keyword-research');
    expect(ctx).toContain('# Amazon Keyword Research');
  });

  it('loadSkillContext throws SKILL_REG_001 for missing id', () => {
    const reg = createTestRegistry();
    try {
      reg.loadSkillContext('nope');
      expect.fail('should throw');
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).code).toBe('SKILL_REG_001');
    }
  });

  it('loadSkillContext throws SKILL_REG_002 when empty', () => {
    const reg = createSkillRegistry({ skillModules: {}, scriptModules: {} });
    try {
      reg.loadSkillContext('any');
      expect.fail('should throw');
    } catch (e) {
      expect(e).toBeInstanceOf(SystemError);
      expect((e as SystemError).code).toBe('SKILL_REG_002');
    }
  });

  it('loadSkillsContext respects strict flag', () => {
    const reg = createTestRegistry();
    const loose = reg.loadSkillsContext(['amazon-ppc-campaign', 'missing'], { strict: false });
    expect(loose).toContain('amazon-ppc-campaign');
    expect(() =>
      reg.loadSkillsContext(['amazon-ppc-campaign', 'missing'], { strict: true })
    ).toThrow(ValidationError);
  });

  it('keeps first skill on id conflict', () => {
    const reg = createSkillRegistry({
      skillModules: {
        '/a/amazon-ppc-campaign/SKILL.md': PPC,
        '/b/amazon-ppc-campaign/SKILL.md': PPC.replace('Build campaigns', 'SECOND'),
      },
      scriptModules: {},
    });
    reg.ensureInitialized();
    expect(reg.getSkill('amazon-ppc-campaign')!.body).toContain('Build campaigns');
    expect(reg.getSkill('amazon-ppc-campaign')!.body).not.toContain('SECOND');
  });
});

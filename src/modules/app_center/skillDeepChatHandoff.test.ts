import { describe, expect, it } from 'vitest';
import {
  buildSkillDeepChatUserDraft,
  buildSystemPromptFromSkillContexts,
  consumeSkillForDeepChat,
  queueSkillForDeepChat,
} from './skillDeepChatHandoff';

describe('skillDeepChatHandoff', () => {
  it('queues and consumes skill context once', () => {
    queueSkillForDeepChat({
      skillId: 'amazon-ppc-campaign',
      skillTitle: 'Amazon PPC Campaign',
      skillRaw: '---\nname: amazon-ppc-campaign\n---\n# PPC',
      userDraft: buildSkillDeepChatUserDraft('Amazon PPC Campaign'),
    });

    const first = consumeSkillForDeepChat();
    expect(first?.skillId).toBe('amazon-ppc-campaign');
    expect(first?.userDraft).toContain('业务数据');
    expect(first?.userDraft).not.toContain('Amazon PPC Campaign');
    expect(consumeSkillForDeepChat()).toBeNull();
  });

  it('builds system prompt from remaining skill contexts', () => {
    const prompt = buildSystemPromptFromSkillContexts([
      { skillRaw: 'SKILL A' },
      { skillRaw: 'SKILL B' },
    ]);
    expect(prompt).toBe('SKILL A\n\n---\n\nSKILL B');
    expect(buildSystemPromptFromSkillContexts([])).toBe('');
  });
});
